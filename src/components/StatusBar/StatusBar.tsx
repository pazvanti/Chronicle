import React from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Loader2,
  Clock,
  BookOpen,
  FileText,
  Sidebar,
  Sun,
  Moon,
  Keyboard,
  Cloud,
  HardDrive,
  FileQuestion,
} from 'lucide-react';

export const StatusBar: React.FC = () => {
  const {
    book,
    isLoading,
    isSaving,
    isDirty,
    activeChapter,
    readerTheme,
    setReaderTheme,
    sidebarCollapsed,
    toggleSidebar,
    totalWordCount,
    totalReadingTimeMinutes,
    storageTarget,
    cloudFileName,
    setIsCloudBrowserOpen,
    setIsSaveAsOpen,
    setIsSaveDestinationOpen,
  } = useEpub();

  const formatReadingTime = (mins: number) => {
    if (mins < 60) return `${mins} min read`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m read` : `${hrs}h read`;
  };

  const cycleTheme = () => {
    const themes: ('light' | 'sepia' | 'dark' | 'obsidian')[] = ['light', 'sepia', 'dark', 'obsidian'];
    const nextIdx = (themes.indexOf(readerTheme) + 1) % themes.length;
    setReaderTheme(themes[nextIdx]);
  };

  return (
    <footer className="app-status-bar" role="status" aria-label="Application Status">
      {/* Left: System Status, Storage Target & Shortcuts Hint */}
      <div className="status-group status-left">
        <div className="status-item">
          {isLoading ? (
            <span className="status-badge status-loading">
              <Loader2 size={12} className="animate-spin" />
              <span>Processing...</span>
            </span>
          ) : isSaving ? (
            <span
              className="status-badge status-loading"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.14)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
              title="Saving changes in background..."
            >
              <Loader2 size={12} className="animate-spin" />
              <span>{storageTarget === 'cloud' ? 'Uploading to cloud...' : 'Saving...'}</span>
            </span>
          ) : isDirty ? (
            <span className="status-badge status-dirty" title="You have unsaved changes. Press Ctrl+S to save project.">
              <span className="status-dot dot-dirty" />
              <span>Unsaved changes</span>
            </span>
          ) : book ? (
            <span className="status-badge status-ready">
              <span className="status-dot dot-ready" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="status-badge status-idle">
              <span className="status-dot dot-idle" />
              <span>No manuscript</span>
            </span>
          )}
        </div>

        {/* Storage Location Badge */}
        {book && (
          <>
            <div className="status-separator" />
            <div className="status-item">
              {storageTarget === 'cloud' ? (
                <span
                  className="status-badge status-ready"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setIsCloudBrowserOpen(true)}
                  title={`Stored in WebDAV Cloud: ${cloudFileName || 'document'}. Click to browse cloud manuscripts.`}
                >
                  <Cloud size={11} style={{ color: '#3b82f6' }} />
                  <span>Cloud: {cloudFileName || 'WebDAV'}</span>
                </span>
              ) : storageTarget === 'local' ? (
                <span
                  className="status-badge status-ready"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setIsSaveAsOpen(true)}
                  title="Local file. Click to Save As."
                >
                  <HardDrive size={11} style={{ opacity: 0.8 }} />
                  <span>Local File</span>
                </span>
              ) : (
                <span
                  className="status-badge status-idle"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setIsSaveDestinationOpen(true)}
                  title="New manuscript (unsaved location). Click to select destination."
                >
                  <FileQuestion size={11} style={{ opacity: 0.8 }} />
                  <span>Unsaved Target</span>
                </span>
              )}
            </div>
          </>
        )}

        <div className="status-separator" />

        <div className="status-item shortcut-hints" title="Global keyboard shortcuts">
          <Keyboard size={12} style={{ opacity: 0.6 }} />
          <span>Ctrl+S Save</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Ctrl+\ Sidebar</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Ctrl+O Open</span>
        </div>
      </div>

      {/* Center: Book Metrics */}
      <div className="status-group status-center">
        {book ? (
          <>
            <div className="status-item" title="Total manuscript word count">
              <FileText size={12} style={{ color: 'var(--accent-primary)' }} />
              <span>{totalWordCount.toLocaleString()} words</span>
            </div>

            <span className="status-separator" />

            <div className="status-item" title="Estimated standard reading time (at 220 wpm)">
              <Clock size={12} style={{ color: '#fbbf24' }} />
              <span>{formatReadingTime(totalReadingTimeMinutes)}</span>
            </div>

            <span className="status-separator" />

            <div className="status-item" title="Total chapter count">
              <BookOpen size={12} style={{ color: '#34d399' }} />
              <span>{book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'}</span>
            </div>
          </>
        ) : (
          <div className="status-item" style={{ opacity: 0.7 }}>
            <span>Chronicle Authoring Suite</span>
          </div>
        )}
      </div>

      {/* Right: Active Chapter & Workspace Controls */}
      <div className="status-group status-right">
        {book && activeChapter && (
          <>
            <div className="status-item active-chapter-pill" title={`Active: ${activeChapter.title}`}>
              <span style={{ opacity: 0.65 }}>Chapter:</span>
              <strong style={{ fontWeight: 600 }}>{activeChapter.wordCount.toLocaleString()} w</strong>
            </div>

            <div className="status-separator" />
          </>
        )}

        <button
          className="status-btn"
          onClick={cycleTheme}
          title={`Active theme: ${readerTheme}. Click to cycle.`}
        >
          {readerTheme === 'light' ? (
            <Sun size={12} style={{ color: '#f59e0b' }} />
          ) : readerTheme === 'sepia' ? (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706' }}>SEP</span>
          ) : (
            <Moon size={12} style={{ color: '#818cf8' }} />
          )}
          <span style={{ textTransform: 'capitalize' }}>{readerTheme}</span>
        </button>

        <button
          className={`status-btn ${sidebarCollapsed ? 'active' : ''}`}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Show Sidebar (Ctrl+\\)' : 'Hide Sidebar (Ctrl+\\)'}
        >
          <Sidebar size={12} />
          <span>{sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
        </button>
      </div>
    </footer>
  );
};
