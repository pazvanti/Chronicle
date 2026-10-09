import React, { useState, useRef, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useTranslation } from '../../i18n/I18nContext';
import {
  ChevronDown,
  Check,
  X,
  Cloud,
  HardDrive,
  FileText,
  Edit2,
  Library,
} from 'lucide-react';

interface DocumentSwitcherDropdownProps {
  onOpenRenameModal: () => void;
  minimalist?: boolean;
}

export const DocumentSwitcherDropdown: React.FC<DocumentSwitcherDropdownProps> = ({
  onOpenRenameModal,
  minimalist = false,
}) => {
  const {
    book,
    isDirty,
    openFiles,
    activeFileId,
    switchOpenFile,
    closeOpenFile,
    setIsLibraryOpen,
  } = useEpub();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSwitchSession = (sessionId: string) => {
    if (sessionId !== activeFileId) {
      switchOpenFile(sessionId);
    }
    setIsOpen(false);
  };

  const handleCloseSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    closeOpenFile(sessionId);
  };

  const formatFilePath = (path?: string) => {
    if (!path) return '';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  if (!book) return null;

  const currentTitle = book.metadata.title || t('header.newManuscript');
  const openCount = openFiles.length;

  return (
    <div className="document-switcher-container" ref={containerRef}>
      {/* Split Pill: Main Title (Click to Edit) + Attached Arrow (Click to Switch) */}
      <div
        className={`document-title-pill document-switcher-split ${isOpen ? 'active-pill' : ''}`}
        style={minimalist ? { maxWidth: '300px' } : undefined}
      >
        {/* Main Clickable Title Action */}
        <div
          className="document-title-main-btn"
          onClick={onOpenRenameModal}
          role="button"
          tabIndex={0}
          title={t('headerActions.renameTitleAuthor')}
          onKeyDown={e => e.key === 'Enter' && onOpenRenameModal()}
        >
          <span
            className={`document-status-dot ${isDirty ? 'dot-dirty' : 'dot-clean'}`}
            title={isDirty ? t('header.unsavedChanges') : t('header.allChangesSaved')}
          />

          <div className="document-title-content">
            <span className="document-title-text" style={minimalist ? { fontSize: '0.82rem' } : undefined}>
              {currentTitle}
            </span>
            {!minimalist && book.metadata.creator && (
              <span className="document-author-subtext">
                {t('headerActions.byAuthor')} {book.metadata.creator}
              </span>
            )}
          </div>

          <Edit2 size={11} className="title-edit-hint" />
        </div>

        {/* Attached Down Arrow for Dropdown */}
        <button
          type="button"
          className={`document-title-arrow-btn ${isOpen ? 'arrow-active' : ''}`}
          onClick={e => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={t('header.switchManuscript')}
        >
          {openCount > 1 && (
            <span className="open-files-count-badge" title={`${openCount} manuscripts open`}>
              {openCount}
            </span>
          )}
          <ChevronDown
            size={13}
            className={`switcher-chevron ${isOpen ? 'switcher-chevron-open' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="header-dropdown-menu document-switcher-dropdown"
          role="listbox"
          aria-label={t('header.openManuscripts')}
        >
          {/* Header Bar */}
          <div className="document-switcher-header">
            <span className="document-switcher-header-title">
              {t('header.openManuscripts')} ({openCount})
            </span>
            <span className="document-switcher-header-status">
              {isDirty ? t('statusBar.unsavedChanges') : t('header.allChangesSaved')}
            </span>
          </div>

          {/* List of Open Files */}
          <div
            className="document-switcher-list custom-scrollbar"
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {openFiles.map(session => {
              const isActive = session.id === activeFileId;
              const title = session.book.metadata.title || t('header.newManuscript');
              const chapterCount = session.book.chapters.length;
              const hasUnsaved = session.isDirty;

              let storageIcon = <FileText size={14} style={{ color: 'var(--text-muted)' }} />;
              let subtitle = `${chapterCount} ${chapterCount === 1 ? t('statusBar.chapterCountSingle') : t('statusBar.chapterCountPlural')}`;

              if (session.storageTarget === 'local' && session.localFilePath) {
                storageIcon = <HardDrive size={14} style={{ color: 'var(--accent-success, #10b981)' }} />;
                subtitle = formatFilePath(session.localFilePath);
              } else if (session.storageTarget === 'cloud' && session.cloudFileName) {
                storageIcon = <Cloud size={14} style={{ color: 'var(--accent-cyan, #3b82f6)' }} />;
                subtitle = `Cloud: ${session.cloudFileName}`;
              } else if (session.book.metadata.creator) {
                subtitle = `${session.book.metadata.creator} • ${subtitle}`;
              }

              return (
                <div
                  key={session.id}
                  className={`doc-switcher-item ${isActive ? 'doc-switcher-item-active' : ''}`}
                  onClick={() => handleSwitchSession(session.id)}
                  role="option"
                  aria-selected={isActive}
                >
                  {/* Status Dot */}
                  <span
                    className={`document-status-dot ${hasUnsaved ? 'dot-dirty' : 'dot-clean'}`}
                    style={{ flexShrink: 0 }}
                    title={hasUnsaved ? t('header.unsavedChanges') : t('header.allChangesSaved')}
                  />

                  {/* Storage Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {storageIcon}
                  </div>

                  {/* Document Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="doc-switcher-item-title">
                        {title}
                      </span>
                      {isActive && (
                        <Check size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      )}
                    </div>
                    <span className="doc-switcher-item-subtitle">
                      {subtitle}
                    </span>
                  </div>

                  {/* Close Session Button */}
                  <button
                    type="button"
                    className="doc-switcher-close-btn"
                    onClick={e => handleCloseSession(e, session.id)}
                    title={t('header.closeManuscript')}
                    style={{ opacity: openCount > 1 ? 0.8 : 0.4 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer: Open Library Bookshelf */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.4rem 0.5rem',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                gap: '0.55rem',
                fontSize: '0.78rem',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
              }}
              onClick={() => {
                setIsOpen(false);
                setIsLibraryOpen(true);
              }}
            >
              <Library size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('header.libraryTooltip')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
