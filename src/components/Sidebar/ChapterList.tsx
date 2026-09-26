import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEpub } from '../../context/EpubContext';
import {
  FileText,
  Plus,
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
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
} from 'lucide-react';
import { useTts } from '../../context/TtsContext';
import { useTranslation } from '../../i18n/I18nContext';
import {
  buildBinderTree,
  getFolderStats,
  isDescendantFolder,
  BinderItemNode,
} from '../../services/epub/binderTree';

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
    createFolder,
    updateFolder,
    deleteFolder,
    toggleFolderExpanded,
    reorderBinderItem,
    moveItemToRootEnd,
  } = useEpub();

  const { isAudioActive, isPlaying } = useTts();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'folder' | 'chapter' } | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  // Context Menu state
  const [menuItem, setMenuItem] = useState<{ id: string; type: 'folder' | 'chapter'; name: string } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'folder' | 'chapter' } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; type: 'folder' | 'chapter' } | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const activeItemRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Smoothly scroll active chapter into view when chapter changes or on restore
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeChapterId]);

  // Close context menu on click outside, scroll, or Escape key
  useEffect(() => {
    if (!menuItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuItem(null);
        setMenuPosition(null);
      }
    };

    const handleClickOutside = () => {
      setMenuItem(null);
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
  }, [menuItem]);

  const resetDragState = () => {
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    setDraggedItem(null);
    setDropTarget(null);
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

  // Build the hierarchical Binder tree
  const binderTree = useMemo(() => {
    if (!book) return [];
    return buildBinderTree(book.folders || [], book.chapters);
  }, [book]);

  // Filtered Binder Tree for search queries
  const filteredTree = useMemo(() => {
    if (!binderTree) return [];
    if (!searchQuery.trim()) return binderTree;

    const q = searchQuery.toLowerCase();

    function filterNodes(nodes: BinderItemNode[]): BinderItemNode[] {
      const results: BinderItemNode[] = [];
      for (const node of nodes) {
        if (node.type === 'chapter') {
          if (
            node.chapter.title.toLowerCase().includes(q) ||
            node.chapter.content.toLowerCase().includes(q)
          ) {
            results.push(node);
          }
        } else if (node.type === 'folder') {
          const folderMatches = node.name.toLowerCase().includes(q);
          const childMatches = filterNodes(node.children);
          if (folderMatches) {
            results.push({
              ...node,
              isExpanded: true,
            });
          } else if (childMatches.length > 0) {
            results.push({
              ...node,
              isExpanded: true,
              children: childMatches,
            });
          }
        }
      }
      return results;
    }

    return filterNodes(binderTree);
  }, [binderTree, searchQuery]);

  if (!book || sidebarCollapsed) {
    return null;
  }

  const isReorderingAllowed = !editingItem && !searchQuery.trim();

  const closeMenu = () => {
    setMenuItem(null);
    setMenuPosition(null);
  };

  const openContextMenu = (
    id: string,
    type: 'folder' | 'chapter',
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const menuWidth = 175;
    const menuHeight = type === 'folder' ? 190 : 150;
    let left = e.clientX;
    let top = e.clientY;

    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    if (top + menuHeight > window.innerHeight - 10) {
      top = window.innerHeight - menuHeight - 10;
    }

    setMenuPosition({ top, left });
    setMenuItem({ id, type, name });
  };

  const openMenuForButton = (
    id: string,
    type: 'folder' | 'chapter',
    name: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (menuItem?.id === id) {
      closeMenu();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 175;
    const menuHeight = type === 'folder' ? 190 : 150;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 4;

    if (left < 10) left = rect.left;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
    if (top + menuHeight > window.innerHeight - 10) {
      top = rect.top - menuHeight - 4;
    }

    setMenuPosition({ top, left });
    setMenuItem({ id, type, name });
  };

  const startRenaming = (id: string, type: 'folder' | 'chapter', currentTitle: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem({ id, type });
    setEditTitle(currentTitle);
    closeMenu();
  };

  const saveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    const clean = editTitle.trim();
    if (clean) {
      if (editingItem.type === 'chapter') {
        updateChapterTitle(editingItem.id, clean);
      } else {
        updateFolder(editingItem.id, { name: clean });
      }
    }
    setEditingItem(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(null);
  };

  const handleDeleteChapter = (chapterId: string, title: string) => {
    if (window.confirm(t('sidebar.confirmDelete').replace('{title}', title))) {
      deleteChapter(chapterId);
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    const stats = getFolderStats(folderId, book.folders || [], book.chapters);
    let msg = t('sidebar.confirmDeleteFolder').replace('{title}', folderName);
    if (stats.chapterCount === 0) {
      msg = `Are you sure you want to delete folder "${folderName}"?`;
    }
    if (window.confirm(msg)) {
      deleteFolder(folderId, false);
    }
  };

  const handleAddFolder = (parentId?: string | null) => {
    const newId = createFolder(t('sidebar.newFolder'), parentId || null);
    if (newId) {
      setEditingItem({ id: newId, type: 'folder' });
      setEditTitle(t('sidebar.newFolder'));
    }
  };

  const handleAddSubFolder = (parentFolderId: string) => {
    const newId = createFolder(t('sidebar.newSubFolder'), parentFolderId);
    if (newId) {
      setEditingItem({ id: newId, type: 'folder' });
      setEditTitle(t('sidebar.newSubFolder'));
    }
  };

  const handleAddChapterInsideFolder = (folderId: string) => {
    const chapterName = `${t('statusBar.activeChapter')} ${book.chapters.length + 1}`;
    addBlankChapter(chapterName, undefined, folderId);
  };

  // Drag-and-drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    type: 'folder' | 'chapter'
  ) => {
    if (!isReorderingAllowed) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/x-chronicle-binder-item', JSON.stringify({ id, type }));
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';

    requestAnimationFrame(() => {
      setDraggedItem({ id, type });
    });
  };

  const handleDragOverItem = (
    e: React.DragEvent,
    targetId: string,
    targetType: 'folder' | 'chapter',
    isFolderCollapsed?: boolean
  ) => {
    if (!draggedItem) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem.id === targetId) {
      if (dropTarget !== null) {
        setDropTarget(null);
        setDropPosition(null);
      }
      return;
    }

    // Prevent folder from moving into itself or its own descendants
    if (draggedItem.type === 'folder') {
      if (targetType === 'folder' && isDescendantFolder(book.folders || [], targetId, draggedItem.id)) {
        if (dropTarget !== null) {
          setDropTarget(null);
          setDropPosition(null);
        }
        return;
      }
      if (targetType === 'chapter') {
        const targetCh = book.chapters.find(c => c.id === targetId);
        if (targetCh?.folderId && isDescendantFolder(book.folders || [], targetCh.folderId, draggedItem.id)) {
          if (dropTarget !== null) {
            setDropTarget(null);
            setDropPosition(null);
          }
          return;
        }
      }
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'after' | 'inside';

    if (targetType === 'folder') {
      // 3-way split for folders: Top 25% = before, Middle 50% = inside, Bottom 25% = after
      if (relativeY < height * 0.25) {
        position = 'before';
      } else if (relativeY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }

      // Auto-expand closed folder if hovering inside for > 500ms
      if (isFolderCollapsed && position === 'inside') {
        if (!autoExpandTimerRef.current) {
          autoExpandTimerRef.current = setTimeout(() => {
            toggleFolderExpanded(targetId);
            autoExpandTimerRef.current = null;
          }, 500);
        }
      } else if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    } else {
      // 2-way split for chapters: before or after
      position = relativeY < height / 2 ? 'before' : 'after';
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    }

    if (dropTarget?.id !== targetId || dropPosition !== position) {
      setDropTarget({ id: targetId, type: targetType });
      setDropPosition(position);
    }
  };

  const handleDropOnItem = (
    e: React.DragEvent,
    targetId: string,
    targetType: 'folder' | 'chapter'
  ) => {
    if (!draggedItem || draggedItem.id === targetId) {
      resetDragState();
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const pos = dropPosition || (targetType === 'folder' ? 'inside' : 'after');
    reorderBinderItem(draggedItem.id, draggedItem.type, targetId, targetType, pos);
    resetDragState();
  };

  const handleEmptyFolderDrop = (e: React.DragEvent, folderId: string) => {
    if (!draggedItem) return;
    e.preventDefault();
    e.stopPropagation();

    reorderBinderItem(draggedItem.id, draggedItem.type, folderId, 'folder', 'inside');
    resetDragState();
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    if (!draggedItem) return;
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
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    if (!draggedItem) return;
    e.preventDefault();
    e.stopPropagation();

    moveItemToRootEnd(draggedItem.id, draggedItem.type);
    resetDragState();
  };

  // Recursive Renderer for Binder Tree Nodes
  const renderBinderNode = (node: BinderItemNode, level: number = 0): React.ReactNode => {
    const isDragging = draggedItem?.id === node.id;
    const isTarget = dropTarget?.id === node.id;
    const isMenuOpen = menuItem?.id === node.id;
    const isEditing = editingItem?.id === node.id;
    const indentPx = level * 16 + 8;

    if (node.type === 'folder') {
      const isExpanded = node.isExpanded;
      const stats = getFolderStats(node.id, book.folders || [], book.chapters);
      const isDropInside = isTarget && dropPosition === 'inside';

      return (
        <React.Fragment key={node.id}>
          <div
            className={`binder-folder-item ${isMenuOpen ? 'menu-open' : ''} ${isDragging ? 'is-dragging' : ''} ${isDropInside ? 'drop-inside' : ''}`}
            style={{ paddingLeft: `${indentPx}px` }}
            draggable={isReorderingAllowed}
            onDragStart={e => handleDragStart(e, node.id, 'folder')}
            onDragOver={e => handleDragOverItem(e, node.id, 'folder', !isExpanded)}
            onDrop={e => handleDropOnItem(e, node.id, 'folder')}
            onDragEnd={resetDragState}
            onClick={() => toggleFolderExpanded(node.id)}
            onDoubleClick={e => !isEditing && startRenaming(node.id, 'folder', node.name, e)}
            onContextMenu={e => !isEditing && openContextMenu(node.id, 'folder', node.name, e)}
          >
            {isTarget && dropPosition && dropPosition !== 'inside' && (
              <div
                className={`chapter-drop-indicator ${dropPosition}`}
                aria-hidden="true"
              />
            )}

            <div className="binder-folder-left">
              <span
                className={`binder-folder-chevron ${isExpanded ? 'expanded' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  toggleFolderExpanded(node.id);
                }}
                aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              >
                <ChevronRight size={14} />
              </span>

              <span className="binder-folder-icon">
                {isExpanded ? (
                  <FolderOpen size={16} />
                ) : (
                  <Folder size={16} />
                )}
              </span>

              {isEditing ? (
                <form
                  onSubmit={saveRename}
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
                <span className="binder-folder-title" title={node.name}>
                  {node.name}
                </span>
              )}
            </div>

            {!isEditing && (
              <div className="binder-folder-right">
                <span
                  className="binder-folder-badge"
                  title={`${stats.chapterCount} chapters · ${stats.wordCount.toLocaleString()} words`}
                >
                  {stats.wordCount.toLocaleString()} w
                </span>
                <button
                  className={`btn-icon btn-sm chapter-more-btn ${isMenuOpen ? 'active' : ''}`}
                  onClick={e => openMenuForButton(node.id, 'folder', node.name, e)}
                  onMouseDown={e => e.stopPropagation()}
                  draggable={false}
                  title={t('sidebar.folderActions')}
                  aria-label={t('sidebar.folderActions')}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Render Children if expanded */}
          {isExpanded && (
            <div className="binder-folder-children">
              {node.children.length === 0 ? (
                <div
                  className={`binder-folder-empty ${isTarget && dropPosition === 'inside' ? 'drop-target' : ''}`}
                  style={{ marginLeft: `${indentPx + 16}px` }}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTarget({ id: node.id, type: 'folder' });
                    setDropPosition('inside');
                  }}
                  onDrop={e => handleEmptyFolderDrop(e, node.id)}
                >
                  {t('sidebar.emptyFolder')}
                </div>
              ) : (
                node.children.map(child => renderBinderNode(child, level + 1))
              )}
            </div>
          )}
        </React.Fragment>
      );
    }

    // Chapter Node
    const chapter = node.chapter;
    const isActive = chapter.id === activeChapterId;
    const originalIndex = book.chapters.findIndex(c => c.id === chapter.id);
    const displayIndex = String(originalIndex + 1).padStart(2, '0');

    return (
      <div
        key={chapter.id}
        ref={isActive ? activeItemRef : undefined}
        className={`chapter-item ${isActive ? 'active' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isDragging ? 'is-dragging' : ''} ${isReorderingAllowed ? 'reorderable' : ''}`}
        style={{ paddingLeft: `${indentPx}px` }}
        draggable={isReorderingAllowed}
        onDragStart={e => handleDragStart(e, chapter.id, 'chapter')}
        onDragOver={e => handleDragOverItem(e, chapter.id, 'chapter')}
        onDrop={e => handleDropOnItem(e, chapter.id, 'chapter')}
        onDragEnd={resetDragState}
        onClick={() => setActiveChapterId(chapter.id)}
        onDoubleClick={e => !isEditing && startRenaming(chapter.id, 'chapter', chapter.title, e)}
        onContextMenu={e => !isEditing && openContextMenu(chapter.id, 'chapter', chapter.title, e)}
      >
        {isTarget && dropPosition && (
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
              onSubmit={saveRename}
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
              onClick={e => openMenuForButton(chapter.id, 'chapter', chapter.title, e)}
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
  };

  // Context Menu Item details for position/actions
  const isMenuFolder = menuItem?.type === 'folder';
  const menuChapterIndex = menuItem && !isMenuFolder
    ? book.chapters.findIndex(c => c.id === menuItem.id)
    : -1;

  return (
    <aside className="app-sidebar" aria-label="Manuscript Binder">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-title-group">
          <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
          <span className="sidebar-title">{t('sidebar.chapters')}</span>
          <span className="sidebar-count-badge">{book.chapters.length}</span>
        </div>

        <div className="sidebar-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-icon btn-sm"
            onClick={() => handleAddFolder(null)}
            title={t('sidebar.addFolderTitle')}
            aria-label={t('sidebar.addFolderTitle')}
          >
            <FolderPlus size={14} />
          </button>

          <button
            className="btn-icon btn-sm"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? t('header.showSidebar') : t('header.hideSidebar')}
          >
            <Sidebar size={14} />
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
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

      {/* Binder Tree Scrollable Container */}
      <div
        ref={listScrollRef}
        className="chapter-list-scroll"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        {filteredTree.length === 0 ? (
          <div className="sidebar-empty-search">
            <p>{searchQuery ? `"${searchQuery}"` : t('sidebar.noChapters')}</p>
            {searchQuery && (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                onClick={() => setSearchQuery('')}
              >
                {t('sidebar.clearSearch')}
              </button>
            )}
          </div>
        ) : (
          filteredTree.map(node => renderBinderNode(node, 0))
        )}
      </div>

      {/* Floating Context Menu via React Portal */}
      {menuItem && menuPosition && createPortal(
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
          {isMenuFolder ? (
            <>
              <button
                className="chapter-menu-item"
                onClick={() => {
                  closeMenu();
                  handleAddChapterInsideFolder(menuItem.id);
                }}
              >
                <Plus size={13} />
                <span>{t('sidebar.addChapterInside')}</span>
              </button>
              <button
                className="chapter-menu-item"
                onClick={() => {
                  closeMenu();
                  handleAddSubFolder(menuItem.id);
                }}
              >
                <FolderPlus size={13} />
                <span>{t('sidebar.addSubFolder')}</span>
              </button>
              <div className="chapter-menu-divider" />
              <button
                className="chapter-menu-item"
                onClick={e => {
                  closeMenu();
                  startRenaming(menuItem.id, 'folder', menuItem.name, e);
                }}
              >
                <Edit2 size={13} />
                <span>{t('sidebar.renameFolder')}</span>
              </button>
              <div className="chapter-menu-divider" />
              <button
                className="chapter-menu-item danger"
                onClick={() => {
                  closeMenu();
                  handleDeleteFolder(menuItem.id, menuItem.name);
                }}
              >
                <Trash2 size={13} />
                <span>{t('sidebar.deleteFolder')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="chapter-menu-item"
                onClick={() => {
                  if (menuChapterIndex > 0) {
                    reorderChapters(menuChapterIndex, menuChapterIndex - 1);
                  }
                  closeMenu();
                }}
                disabled={menuChapterIndex <= 0}
              >
                <ChevronUp size={13} />
                <span>{t('sidebar.moveUp')}</span>
              </button>
              <button
                className="chapter-menu-item"
                onClick={() => {
                  if (menuChapterIndex < book.chapters.length - 1) {
                    reorderChapters(menuChapterIndex, menuChapterIndex + 1);
                  }
                  closeMenu();
                }}
                disabled={menuChapterIndex === -1 || menuChapterIndex >= book.chapters.length - 1}
              >
                <ChevronDown size={13} />
                <span>{t('sidebar.moveDown')}</span>
              </button>
              <button
                className="chapter-menu-item"
                onClick={e => {
                  closeMenu();
                  startRenaming(menuItem.id, 'chapter', menuItem.name, e);
                }}
              >
                <Edit2 size={13} />
                <span>{t('sidebar.renameChapter')}</span>
              </button>
              <div className="chapter-menu-divider" />
              <button
                className="chapter-menu-item danger"
                onClick={() => {
                  closeMenu();
                  handleDeleteChapter(menuItem.id, menuItem.name);
                }}
              >
                <Trash2 size={13} />
                <span>{t('sidebar.deleteChapter')}</span>
              </button>
            </>
          )}
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
          className="btn btn-outline btn-sm sidebar-add-folder-btn"
          onClick={() => handleAddFolder(null)}
          title={t('sidebar.addFolderTitle')}
        >
          <FolderPlus size={13} />
          <span>{t('sidebar.addFolder')}</span>
        </button>
      </div>
    </aside>
  );
};
