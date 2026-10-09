import React, { useState, useMemo, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useTranslation } from '../../i18n/I18nContext';
import { LibraryBookItem, getOrGenerateSpineColor } from '../../services/library/libraryStorage';
import { isTauri } from '../../services/cloud/webdavClient';
import {
  Library,
  Cloud,
  HardDrive,
  PlusCircle,
  Upload,
  X,
  Search,
  ArrowLeft,
  Sparkles,
  Feather,
  BookMarked,
  Loader2,
} from 'lucide-react';
import './LibraryView.css';

export const LibraryView: React.FC = () => {
  const {
    book,
    libraryItems,
    removeLibraryBook,
    createNewBook,
    loadSampleBook,
    openLocalDocument,
    loadFromCloud,
    setIsLibraryOpen,
    loadAnyFile,
    showNotification,
    openFiles,
    switchOpenFile,
  } = useEpub();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'cloud'>('all');
  const [openingItemId, setOpeningItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and search manuscripts
  const filteredItems = useMemo(() => {
    let list = libraryItems;

    if (filterSource !== 'all') {
      list = list.filter(item => item.source === filterSource);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          (item.author && item.author.toLowerCase().includes(q)) ||
          (item.filePath && item.filePath.toLowerCase().includes(q)) ||
          (item.cloudFileName && item.cloudFileName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [libraryItems, filterSource, searchQuery]);

  // Group filtered items into shelves (4 to 6 items per shelf)
  const shelfRows = useMemo(() => {
    const rows: LibraryBookItem[][] = [];
    const itemsPerRow = 5;
    for (let i = 0; i < filteredItems.length; i += itemsPerRow) {
      rows.push(filteredItems.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [filteredItems]);

  const handleOpenBook = async (item: LibraryBookItem) => {
    if (openingItemId) return;
    setOpeningItemId(item.id);

    try {
      // 1. If this file is already in openFiles, switch to it immediately
      if (item.source === 'local' && item.filePath) {
        const existingSession = openFiles.find(s => s.localFilePath === item.filePath);
        if (existingSession) {
          switchOpenFile(existingSession.id);
          setIsLibraryOpen(false);
          setOpeningItemId(null);
          return;
        }
      } else if (item.source === 'cloud') {
        const cloudKey = item.cloudHref || item.cloudFileName;
        const existingSession = openFiles.find(
          s => s.storageTarget === 'cloud' && (s.cloudHref === cloudKey || s.cloudFileName === cloudKey)
        );
        if (existingSession) {
          switchOpenFile(existingSession.id);
          setIsLibraryOpen(false);
          setOpeningItemId(null);
          return;
        }
      }

      // 2. Load from disk or cloud
      if (item.source === 'cloud') {
        const href = item.cloudHref || item.cloudFileName!;
        const filename = item.cloudFileName || item.cloudHref!.split('/').pop() || 'manuscript.chronicle';
        await loadFromCloud(href, filename, false, item.cloudFileName || undefined);
        setIsLibraryOpen(false);
      } else if (item.source === 'local') {
        if (item.filePath) {
          await openLocalDocument(item.filePath);
          setIsLibraryOpen(false);
        } else {
          showNotification('info', 'Please select this file to open it on the web.');
          fileInputRef.current?.click();
        }
      }
    } catch (err: any) {
      showNotification('error', `Could not open manuscript: ${err?.message || 'Error'}`);
    } finally {
      setOpeningItemId(null);
    }
  };

  const handleRemove = async (e: React.MouseEvent, item: LibraryBookItem) => {
    e.stopPropagation();
    await removeLibraryBook(item.id);
    showNotification('info', `${t('library.removedNotification')}: "${item.title}"`);
  };

  const handleOpenFileClick = () => {
    if (isTauri()) {
      openLocalDocument();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAnyFile(file);
      setIsLibraryOpen(false);
    }
    if (e.target) e.target.value = '';
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return t('library.openedJustNow');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 14) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="library-view-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".chronicle,.epub,.md,.markdown,.mdown,.mkd"
        style={{ display: 'none' }}
      />

      {/* Header Toolbar */}
      <header className="library-header">
        <div className="library-header-left">
          <div className="library-icon-badge">
            <Library size={22} />
          </div>
          <div className="library-titles">
            <h1>
              <span>{t('library.title')}</span>
              <span className="library-count-pill">
                {libraryItems.length} {libraryItems.length === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <p>{t('library.subtitle')}</p>
          </div>
        </div>

        {/* Center: Search & Filter Tabs */}
        <div className="library-header-center">
          <div className="library-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="library-search-input"
              placeholder={t('library.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="library-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="library-filter-chips">
            <button
              className={`library-filter-chip ${filterSource === 'all' ? 'active' : ''}`}
              onClick={() => setFilterSource('all')}
            >
              {t('library.all')}
            </button>
            <button
              className={`library-filter-chip ${filterSource === 'local' ? 'active' : ''}`}
              onClick={() => setFilterSource('local')}
            >
              <HardDrive size={13} />
              {t('library.local')}
            </button>
            <button
              className={`library-filter-chip ${filterSource === 'cloud' ? 'active' : ''}`}
              onClick={() => setFilterSource('cloud')}
            >
              <Cloud size={13} />
              {t('library.cloud')}
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="library-header-right">
          {book && (
            <button
              className="library-btn btn-back"
              onClick={() => setIsLibraryOpen(false)}
              title={t('library.backToEditor')}
            >
              <ArrowLeft size={15} />
              <span>{t('library.backToEditor')}</span>
            </button>
          )}

          <button
            className="library-btn btn-outline"
            onClick={handleOpenFileClick}
            title={t('library.openFile')}
          >
            <Upload size={15} />
            <span>{t('library.openFile')}</span>
          </button>

          <button
            className="library-btn btn-primary"
            onClick={() => {
              createNewBook();
              setIsLibraryOpen(false);
            }}
            title={t('library.newManuscript')}
          >
            <PlusCircle size={15} />
            <span>{t('library.newManuscript')}</span>
          </button>
        </div>
      </header>

      {/* Bookshelf Stage */}
      <main className="bookshelf-stage">
        {filteredItems.length === 0 ? (
          <div className="library-empty-state">
            <div className="empty-bookshelf-graphic">
              <BookMarked size={42} strokeWidth={1.75} />
            </div>
            <h2>{searchQuery ? 'No Matching Manuscripts Found' : t('library.emptyTitle')}</h2>
            <p>
              {searchQuery
                ? `No books match "${searchQuery}". Try a different search term or clear the filter.`
                : t('library.emptyDesc')}
            </p>

            <div className="library-empty-actions">
              {searchQuery ? (
                <button
                  className="library-btn btn-outline"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              ) : (
                <>
                  <button
                    className="library-btn btn-primary"
                    onClick={() => {
                      createNewBook();
                      setIsLibraryOpen(false);
                    }}
                  >
                    <PlusCircle size={15} />
                    <span>Create Blank Manuscript</span>
                  </button>

                  <button
                    className="library-btn btn-outline"
                    onClick={handleOpenFileClick}
                  >
                    <Upload size={15} />
                    <span>Open from Disk</span>
                  </button>

                  <button
                    className="library-btn btn-outline"
                    onClick={() => {
                      loadSampleBook();
                      setIsLibraryOpen(false);
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Load Sample Book</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          shelfRows.map((row, rowIndex) => (
            <div className="bookshelf-unit" key={`shelf-row-${rowIndex}`}>
              <div className="bookshelf-row">
                {row.map(item => {
                  const isOpening = openingItemId === item.id;
                  const isCurrentActive =
                    book &&
                    ((item.source === 'local' && item.filePath && item.filePath === book.metadata.identifier) ||
                      (item.title && item.title === book.metadata.title));

                  return (
                    <div
                      key={item.id}
                      className={`shelf-book-item ${isCurrentActive ? 'is-active-manuscript' : ''}`}
                      onClick={() => handleOpenBook(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleOpenBook(item)}
                      title={`Open "${item.title}"`}
                    >
                      {/* 3D Book Cover Wrap */}
                      <div className="shelf-book-cover-wrap">
                        {/* On-Hover Remove Icon (Top Right Corner) */}
                        <button
                          className="book-remove-btn"
                          onClick={e => handleRemove(e, item)}
                          title={t('library.removeFromLibrary')}
                          aria-label={t('library.removeFromLibrary')}
                        >
                          <X size={13} strokeWidth={2.4} />
                        </button>

                        {/* Icon in the Lower-Right Corner Indicating Cloud Storage */}
                        {item.source === 'cloud' && (
                          <div
                            className="book-corner-badge cloud"
                            title={t('library.cloudStorage')}
                          >
                            <Cloud size={13} strokeWidth={2.4} />
                          </div>
                        )}

                        {/* Opening Spinner Overlay */}
                        {isOpening && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.65)',
                              backdropFilter: 'blur(4px)',
                              zIndex: 15,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              gap: '0.4rem',
                            }}
                          >
                            <Loader2 size={24} className="animate-spin" />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Opening...</span>
                          </div>
                        )}

                        {/* Real Cover Image OR Generative Hardbound Cover */}
                        {item.coverDataUrl ? (
                          <img
                            src={item.coverDataUrl}
                            alt={item.title}
                            className="book-cover-img"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="generative-hardbound-cover"
                            style={{
                              background: item.spineColor || getOrGenerateSpineColor(item.title),
                            }}
                          >
                            <div className="generative-cover-frame" />
                            <div className="generative-cover-top">
                              <div className="generative-cover-title">{item.title}</div>
                            </div>

                            <div className="generative-cover-center">
                              <Feather size={20} strokeWidth={1.8} />
                            </div>

                            <div className="generative-cover-bottom">
                              {item.author && (
                                <div className="generative-cover-author">{item.author}</div>
                              )}
                              <span className="generative-cover-badge">
                                {item.fileType.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Drop shadow cast on the shelf */}
                      <div className="shelf-book-shadow" />

                      {/* Title & Metadata Below the Book Cover */}
                      <div className="shelf-book-info">
                        <div className="shelf-book-title" title={item.title}>
                          {item.title}
                        </div>
                        <div className="shelf-book-meta">
                          {item.author ? (
                            <span className="shelf-book-author" title={item.author}>
                              {item.author}
                            </span>
                          ) : (
                            <span>{item.fileType.toUpperCase()}</span>
                          )}
                          <span className="shelf-meta-dot">•</span>
                          <span>{formatRelativeTime(item.lastOpened)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* The Physical 3D Shelf Plank */}
              <div className="shelf-plank" />
            </div>
          ))
        )}
      </main>
    </div>
  );
};
