import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEpub } from '../../context/EpubContext';
import {
  FileText,
  Plus,
  Scissors,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sidebar,
  BookOpen,
  Music2,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';
import { SplitChapterModal } from '../Editor/SplitChapterModal';
import { useTts } from '../../context/TtsContext';
import { useTranslation } from '../../i18n/I18nContext';

export const ChapterList: React.FC = () => {
  const {
    book,
    activeChapterId,
    setActiveChapterId,
    updateChapterTitle,
    reorderChapters,
    deleteChapter,
    addBlankChapter,
    sidebarCollapsed,
    toggleSidebar,
  } = useEpub();

  const { isAudioActive, isPlaying } = useTts();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [menuChapterId, setMenuChapterId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  // Drag and Drop reordering state
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Smoothly scroll active chapter into view when chapter changes or on restore
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeChapterId]);

  // Close context menu on click outside, scroll, or Escape key
  useEffect(() => {
    if (!menuChapterId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuChapterId(null);
        setMenuPosition(null);
      }
    };

    const handleClickOutside = () => {
      setMenuChapterId(null);
      setMenuPosition(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('contextmenu', handleClickOutside);
    window.addEventListener('scroll', handleClickOutside, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
      window.removeEventListener('scroll', handleClickOutside, true);
    };
  }, [menuChapterId]);

  // Filtered chapters by search query
  const filteredChapters = useMemo(() => {
    if (!book) return [];
    if (!searchQuery.trim()) return book.chapters;
    const q = searchQuery.toLowerCase();
    return book.chapters.filter(
      ch => ch.title.toLowerCase().includes(q) || ch.content.toLowerCase().includes(q)
    );
  }, [book, searchQuery]);

  const resetDragState = () => {
    setDraggedChapterId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  // Window dragend fallback to ensure drag state always resets even if dropped outside
  useEffect(() => {
    const handleWindowDragEnd = () => {
      resetDragState();
    };
    window.addEventListener('dragend', handleWindowDragEnd);
    return () => {
      window.removeEventListener('dragend', handleWindowDragEnd);
    };
  }, []);

  if (!book) {
    return null;
  }

  if (sidebarCollapsed) {
    return null;
  }

  const closeMenu = () => {
    setMenuChapterId(null);
    setMenuPosition(null);
  };

  const openMenuForButton = (chapterId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (menuChapterId === chapterId) {
      closeMenu();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 145;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 4;

    if (left < 10) left = rect.left;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
    if (top + menuHeight > window.innerHeight - 10) {
      top = rect.top - menuHeight - 4;
    }

    setMenuPosition({ top, left });
    setMenuChapterId(chapterId);
  };

  const handleContextMenu = (chapterId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 160;
    const menuHeight = 145;
    let left = e.clientX;
    let top = e.clientY;

    if (left + menuWidth > window.innerWidth - 10) {
      left = e.clientX - menuWidth;
    }
    if (top + menuHeight > window.innerHeight - 10) {
      top = e.clientY - menuHeight;
    }

    setMenuPosition({ top, left });
    setMenuChapterId(chapterId);
  };

  const startRenaming = (chapterId: string, currentTitle: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingChapterId(chapterId);
    setEditTitle(currentTitle);
  };

  const saveRename = (chapterId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      updateChapterTitle(chapterId, editTitle.trim());
    }
    setEditingChapterId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChapterId(null);
  };

  const handleDelete = (chapterId: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(t('sidebar.confirmDelete').replace('{title}', title))) {
      deleteChapter(chapterId);
    }
  };

  const handleMoveUp = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index > 0) {
      reorderChapters(index, index - 1);
    }
  };

  const handleMoveDown = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index < book.chapters.length - 1) {
      reorderChapters(index, index + 1);
    }
  };

  const isReorderingAllowed = !editingChapterId && !searchQuery.trim() && book.chapters.length > 1;


  const handleDragStart = (chapterId: string, e: React.DragEvent) => {
    if (!isReorderingAllowed) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/x-chronicle-chapter', chapterId);
    e.dataTransfer.setData('text/plain', chapterId);
    e.dataTransfer.effectAllowed = 'move';

    // Apply dragging state asynchronously so native drag preview isn't captured as dimmed
    requestAnimationFrame(() => {
      setDraggedChapterId(chapterId);
    });
  };

  const handleDragOverItem = (chapterId: string, index: number, e: React.DragEvent) => {
    if (!draggedChapterId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedChapterId === chapterId) {
      if (dropTargetId !== null) {
        setDropTargetId(null);
        setDropPosition(null);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';

    // Prevent showing drop indicator for no-op moves (e.g. moving directly before next item or after prev item)
    const fromIndex = book.chapters.findIndex(c => c.id === draggedChapterId);
    if (fromIndex !== -1) {
      if (fromIndex < index && index === fromIndex + 1 && position === 'before') {
        if (dropTargetId !== null) {
          setDropTargetId(null);
          setDropPosition(null);
        }
        return;
      }
      if (fromIndex > index && index === fromIndex - 1 && position === 'after') {
        if (dropTargetId !== null) {
          setDropTargetId(null);
          setDropPosition(null);
        }
        return;
      }
    }

    if (dropTargetId !== chapterId || dropPosition !== position) {
      setDropTargetId(chapterId);
      setDropPosition(position);
    }
  };

  const handleDropOnItem = (targetChapterId: string, targetIndex: number, e: React.DragEvent) => {
    if (!draggedChapterId || draggedChapterId === targetChapterId) {
      resetDragState();
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const fromIndex = book.chapters.findIndex(c => c.id === draggedChapterId);
    if (fromIndex === -1) {
      resetDragState();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = dropPosition || (e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');

    let insertAt: number;
    if (pos === 'before') {
      insertAt = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
    } else {
      insertAt = fromIndex < targetIndex ? targetIndex : targetIndex + 1;
    }

    if (insertAt !== fromIndex && insertAt >= 0 && insertAt < book.chapters.length) {
      reorderChapters(fromIndex, insertAt);
    }

    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    if (!draggedChapterId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Edge auto-scrolling
    if (listScrollRef.current) {
      const rect = listScrollRef.current.getBoundingClientRect();
      const threshold = 40;
      const maxScroll = 12;

      if (e.clientY < rect.top + threshold) {
        const ratio = 1 - Math.max(0, e.clientY - rect.top) / threshold;
        listScrollRef.current.scrollTop -= Math.max(2, Math.round(ratio * maxScroll));
      } else if (e.clientY > rect.bottom - threshold) {
        const ratio = 1 - Math.max(0, rect.bottom - e.clientY) / threshold;
        listScrollRef.current.scrollTop += Math.max(2, Math.round(ratio * maxScroll));
      }
    }

    // If hovering below the last item in the list
    if (listScrollRef.current && book.chapters.length > 0) {
      const lastItem = listScrollRef.current.querySelector('.chapter-item:last-of-type');
      if (lastItem) {
        const lastRect = lastItem.getBoundingClientRect();
        if (e.clientY > lastRect.bottom) {
          const lastChapter = book.chapters[book.chapters.length - 1];
          if (lastChapter.id !== draggedChapterId) {
            if (dropTargetId !== lastChapter.id || dropPosition !== 'after') {
              setDropTargetId(lastChapter.id);
              setDropPosition('after');
            }
          }
        }
      }
    }
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (listScrollRef.current && !listScrollRef.current.contains(e.relatedTarget as Node)) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    if (!draggedChapterId) return;
    e.preventDefault();
    e.stopPropagation();

    if (listScrollRef.current && book.chapters.length > 0) {
      const lastItem = listScrollRef.current.querySelector('.chapter-item:last-of-type');
      if (lastItem) {
        const lastRect = lastItem.getBoundingClientRect();
        if (e.clientY > lastRect.bottom) {
          const fromIndex = book.chapters.findIndex(c => c.id === draggedChapterId);
          const lastIndex = book.chapters.length - 1;
          if (fromIndex !== -1 && fromIndex !== lastIndex) {
            reorderChapters(fromIndex, lastIndex);
          }
        }
      }
    }

    resetDragState();
  };

  const menuChapter = menuChapterId ? book.chapters.find(c => c.id === menuChapterId) : null;
  const menuIndex = menuChapterId ? book.chapters.findIndex(c => c.id === menuChapterId) : -1;

  return (
    <aside className="app-sidebar" aria-label="Manuscript Chapters">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-title-group">
          <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
          <span className="sidebar-title">{t('sidebar.chapters')}</span>
          <span className="sidebar-count-badge">{book.chapters.length}</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            className="btn-icon btn-sm"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? t('header.showSidebar') : t('header.hideSidebar')}
          >
            <Sidebar size={14} />
          </button>
        </div>
      </div>

      {/* Chapter Search Filter Bar */}
      <div className="sidebar-search-container">
        <div className="sidebar-search-input-wrapper">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title={t('sidebar.clearSearch')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Chapter List Scrollable Binder */}
      <div
        ref={listScrollRef}
        className="chapter-list-scroll"
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        {filteredChapters.length === 0 ? (
          <div className="sidebar-empty-search">
            <p>{searchQuery ? `"${searchQuery}"` : t('sidebar.noChapters')}</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
              onClick={() => setSearchQuery('')}
            >
              {t('sidebar.clearSearch')}
            </button>
          </div>
        ) : (
          filteredChapters.map(chapter => {
            const originalIndex = book.chapters.findIndex(c => c.id === chapter.id);
            const isActive = chapter.id === activeChapterId;
            const isEditing = editingChapterId === chapter.id;
            const isMenuOpen = menuChapterId === chapter.id;
            const isDragging = draggedChapterId === chapter.id;
            const isDropTarget = dropTargetId === chapter.id;

            // Formatted 2-digit index (01, 02, etc.)
            const displayIndex = String(originalIndex + 1).padStart(2, '0');

            return (
              <div
                key={chapter.id}
                ref={isActive ? activeItemRef : undefined}
                className={`chapter-item ${isActive ? 'active' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isDragging ? 'is-dragging' : ''} ${isReorderingAllowed ? 'reorderable' : ''}`}
                draggable={isReorderingAllowed}
                onDragStart={e => handleDragStart(chapter.id, e)}
                onDragOver={e => handleDragOverItem(chapter.id, originalIndex, e)}
                onDrop={e => handleDropOnItem(chapter.id, originalIndex, e)}
                onDragEnd={handleDragEnd}
                onClick={() => setActiveChapterId(chapter.id)}
                onDoubleClick={e => !isEditing && startRenaming(chapter.id, chapter.title, e)}
                onContextMenu={e => !isEditing && handleContextMenu(chapter.id, e)}
              >
                {isDropTarget && dropPosition && (
                  <div
                    className={`chapter-drop-indicator ${dropPosition}`}
                    aria-hidden="true"
                  />
                )}

                <div className="chapter-item-left">
                  <div
                    className="chapter-num-slot"
                    title={isReorderingAllowed ? t('sidebar.reorder') : undefined}
                  >
                    <span className="chapter-num">{displayIndex}</span>
                    {isReorderingAllowed && (
                      <span
                        className="chapter-drag-handle"
                        aria-label={t('sidebar.reorder')}
                      >
                        <GripVertical size={13} />
                      </span>
                    )}
                  </div>
                  {isActive && isAudioActive && isPlaying ? (
                    <Music2
                      size={14}
                      color="var(--accent-cyan)"
                      style={{ flexShrink: 0 }}
                      className="animate-pulse"
                    />
                  ) : (
                    <FileText
                      size={14}
                      color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                      style={{ flexShrink: 0 }}
                    />
                  )}

                  {isEditing ? (
                    <form
                      onSubmit={e => saveRename(chapter.id, e)}
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                        autoFocus
                        className="form-input"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: '26px' }}
                      />
                      <button
                        type="submit"
                        className="btn-icon"
                        style={{ padding: '2px', color: 'var(--accent-success)' }}
                        title={t('common.save')}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={cancelRename}
                        style={{ padding: '2px', color: 'var(--accent-danger)' }}
                        title={t('common.cancel')}
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <span className="chapter-title-text" title={chapter.title}>
                      {chapter.title || `${t('statusBar.activeChapter')} ${originalIndex + 1}`}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <div className="chapter-item-right">
                    <span className="chapter-badge">
                      {chapter.wordCount.toLocaleString()} w
                    </span>
                    <button
                      className={`btn-icon btn-sm chapter-more-btn ${isMenuOpen ? 'active' : ''}`}
                      onClick={e => openMenuForButton(chapter.id, e)}
                      onMouseDown={e => e.stopPropagation()}
                      draggable={false}
                      title={t('sidebar.chapterActions')}
                      aria-label={t('sidebar.chapterActions')}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Chapter Context Menu via Portal */}
      {menuChapter && menuPosition && createPortal(
        <div
          className="chapter-context-menu"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            position: 'fixed',
            zIndex: 9999,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="chapter-menu-item"
            onClick={e => {
              handleMoveUp(menuIndex, e);
              closeMenu();
            }}
            disabled={menuIndex === 0}
          >
            <ChevronUp size={13} />
            <span>{t('sidebar.moveUp')}</span>
          </button>
          <button
            className="chapter-menu-item"
            onClick={e => {
              handleMoveDown(menuIndex, e);
              closeMenu();
            }}
            disabled={menuIndex === book.chapters.length - 1}
          >
            <ChevronDown size={13} />
            <span>{t('sidebar.moveDown')}</span>
          </button>
          <button
            className="chapter-menu-item"
            onClick={e => {
              closeMenu();
              startRenaming(menuChapter.id, menuChapter.title, e);
            }}
          >
            <Edit2 size={13} />
            <span>{t('sidebar.renameChapter')}</span>
          </button>
          <div className="chapter-menu-divider" />
          <button
            className="chapter-menu-item danger"
            onClick={e => {
              closeMenu();
              handleDelete(menuChapter.id, menuChapter.title, e);
            }}
          >
            <Trash2 size={13} />
            <span>{t('sidebar.deleteChapter')}</span>
          </button>
        </div>,
        document.body
      )}

      {/* Sidebar Footer Actions */}
      <div className="sidebar-footer">
        <button
          className="btn btn-primary btn-sm sidebar-add-btn"
          onClick={() => addBlankChapter(`${t('statusBar.activeChapter')} ${book.chapters.length + 1}`)}
          title={t('sidebar.addChapterTitle')}
        >
          <Plus size={14} />
          <span>{t('sidebar.addChapter')}</span>
        </button>

        <button
          className="btn btn-outline btn-sm sidebar-split-btn"
          onClick={() => setIsSplitModalOpen(true)}
          title={t('sidebar.splitChapterTitle')}
        >
          <Scissors size={13} />
          <span>{t('sidebar.split')}</span>
        </button>
      </div>

      {isSplitModalOpen && (
        <SplitChapterModal onClose={() => setIsSplitModalOpen(false)} />
      )}
    </aside>
  );
};
