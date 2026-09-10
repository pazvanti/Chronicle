import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { SplitChapterModal } from '../Editor/SplitChapterModal';
import { useTts } from '../../context/TtsContext';

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

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [menuChapterId, setMenuChapterId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

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
    if (window.confirm(`Are you sure you want to delete chapter "${title}"?`)) {
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

  const menuChapter = menuChapterId ? book.chapters.find(c => c.id === menuChapterId) : null;
  const menuIndex = menuChapterId ? book.chapters.findIndex(c => c.id === menuChapterId) : -1;

  return (
    <aside className="app-sidebar" aria-label="Manuscript Chapters">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-title-group">
          <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
          <span className="sidebar-title">Chapters</span>
          <span className="sidebar-count-badge">{book.chapters.length}</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            className="btn-icon btn-sm"
            onClick={toggleSidebar}
            title="Collapse Sidebar (Ctrl+\)"
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
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Chapter List Scrollable Binder */}
      <div className="chapter-list-scroll">
        {filteredChapters.length === 0 ? (
          <div className="sidebar-empty-search">
            <p>No chapters match "{searchQuery}"</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredChapters.map(chapter => {
            const originalIndex = book.chapters.findIndex(c => c.id === chapter.id);
            const isActive = chapter.id === activeChapterId;
            const isEditing = editingChapterId === chapter.id;
            const isMenuOpen = menuChapterId === chapter.id;

            // Formatted 2-digit index (01, 02, etc.)
            const displayIndex = String(originalIndex + 1).padStart(2, '0');

            return (
              <div
                key={chapter.id}
                className={`chapter-item ${isActive ? 'active' : ''} ${isMenuOpen ? 'menu-open' : ''}`}
                onClick={() => setActiveChapterId(chapter.id)}
                onDoubleClick={e => !isEditing && startRenaming(chapter.id, chapter.title, e)}
                onContextMenu={e => !isEditing && handleContextMenu(chapter.id, e)}
              >
                <div className="chapter-item-left">
                  <span className="chapter-num">{displayIndex}</span>
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
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                        className="form-input"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', height: '26px' }}
                      />
                      <button
                        type="submit"
                        className="btn-icon"
                        style={{ padding: '2px', color: 'var(--accent-success)' }}
                        title="Save title"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={cancelRename}
                        style={{ padding: '2px', color: 'var(--accent-danger)' }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <span className="chapter-title-text" title={chapter.title}>
                      {chapter.title || `Chapter ${originalIndex + 1}`}
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
                      title="Chapter actions"
                      aria-label="Chapter actions"
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
            <span>Move Up</span>
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
            <span>Move Down</span>
          </button>
          <button
            className="chapter-menu-item"
            onClick={e => {
              closeMenu();
              startRenaming(menuChapter.id, menuChapter.title, e);
            }}
          >
            <Edit2 size={13} />
            <span>Rename Chapter</span>
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
            <span>Delete Chapter</span>
          </button>
        </div>,
        document.body
      )}

      {/* Sidebar Footer Actions */}
      <div className="sidebar-footer">
        <button
          className="btn btn-primary btn-sm sidebar-add-btn"
          onClick={() => addBlankChapter(`Chapter ${book.chapters.length + 1}`)}
          title="Add a new blank chapter to the book"
        >
          <Plus size={14} />
          <span>New Chapter</span>
        </button>

        <button
          className="btn btn-outline btn-sm sidebar-split-btn"
          onClick={() => setIsSplitModalOpen(true)}
          title="Split current chapter at heading or cursor"
        >
          <Scissors size={13} />
          <span>Split</span>
        </button>
      </div>

      {isSplitModalOpen && (
        <SplitChapterModal onClose={() => setIsSplitModalOpen(false)} />
      )}
    </aside>
  );
};
