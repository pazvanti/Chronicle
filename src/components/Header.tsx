import React, { useRef, useState } from 'react';
import { useEpub } from '../context/EpubContext';
import { useTts } from '../context/TtsContext';
import {
  BookOpen,
  Edit3,
  Compass,
  FolderArchive,
  Upload,
  Download,
  Wand2,
  Save,
  Sidebar,
  PlusCircle,
  Edit2,
  Cloud,
  ChevronDown,
  FolderTree,
  Settings,
  Sparkles,
  Loader2,
  MoreHorizontal,
  Feather,
  Layout,
  Sun,
  Moon,
  ArrowUpCircle,
  Camera,
} from 'lucide-react';
import { PrimaryAppMode } from '../types/project';
import { TypographyModal } from './Typography/TypographyModal';
import { ExportModal } from './Export/ExportModal';
import { TitleRenameModal } from './Header/TitleRenameModal';
import { ChronicleLogo } from './Common/ChronicleLogo';
import { isTauri } from '../services/cloud/webdavClient';
import { CURRENT_VERSION } from '../services/update/updateChecker';
import { useTranslation } from '../i18n/I18nContext';

export const Header: React.FC = () => {
  const {
    book,
    loadAnyFile,
    openLocalDocument,
    createNewBook,
    isLoading,
    isSaving,
    isDirty,
    saveProject,
    sidebarCollapsed,
    toggleSidebar,
    storageTarget,
    localFilePath,
    isWebDavConnected,
    setIsCloudBrowserOpen,
    setIsSaveAsOpen,
    setIsSaveDestinationOpen,
    setIsWelcomeModalOpen,
    setIsCloudDesktopNoticeOpen,
    openSettings,
    minimalistMode,
    setMinimalistMode,
    isZenMode,
    activeChapter,
    readerTheme,
    setReaderTheme,
    primaryMode,
    setPrimaryMode,
    isExportModalOpen,
    setIsExportModalOpen,
    isUpdateAvailable,
    latestRelease,
    snapshots,
    setIsSnapshotsModalOpen,
  } = useEpub();
  const { stopAudio } = useTts();
  const { t } = useTranslation();

  const [isTypographyOpen, setIsTypographyOpen] = useState<boolean>(false);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [isCloudMenuOpen, setIsCloudMenuOpen] = useState<boolean>(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopAudio();
      loadAnyFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleOpenClick = () => {
    if (isTauri()) {
      openLocalDocument();
    } else {
      fileInputRef.current?.click();
    }
  };

  const primaryModes: { id: PrimaryAppMode; label: string; icon: React.ReactNode; tooltip: string }[] = [
    { id: 'write', label: t('header.writeMode'), icon: <Edit3 size={14} />, tooltip: t('header.writeTooltip') },
    { id: 'knowledge-base', label: t('header.knowledgeBaseMode'), icon: <Compass size={14} />, tooltip: t('header.knowledgeBaseTooltip') },
    { id: 'publish', label: t('header.publishMode'), icon: <BookOpen size={14} />, tooltip: t('header.publishTooltip') },
  ];

  if (isZenMode) {
    return null;
  }

  return (
    <>
      {minimalistMode ? (
        <header className="app-header minimalist-header" role="banner">
          <div className="header-left-section" style={{ maxWidth: '65%' }}>
            <button
              className={`btn-icon btn-sm sidebar-toggle-btn ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Show Chapters Sidebar (Ctrl+\\)' : 'Hide Chapters Sidebar (Ctrl+\\)'}
            >
              <Sidebar size={15} />
            </button>

            <div
              className="brand-badge brand-badge-clickable"
              title="Chronicle Minimalist Mode • Distraction-free authoring"
              style={{ cursor: 'default' }}
            >
              <Feather size={16} style={{ color: 'var(--accent-primary)' }} />
              <span className="brand-text" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Minimalist</span>
            </div>

            {book && (
              <>
                <div className="header-divider" />
                <div
                  className="document-title-pill"
                  onClick={() => setIsRenameOpen(true)}
                  title="Click to edit manuscript title"
                  style={{ maxWidth: '280px' }}
                >
                  <span
                    className={`document-status-dot ${isDirty ? 'dot-dirty' : 'dot-clean'}`}
                    title={isDirty ? t('header.unsavedChanges') : t('header.allChangesSaved')}
                  />
                  <div className="document-title-content">
                    <span className="document-title-text" style={{ fontSize: '0.82rem' }}>
                      {book.metadata.title || t('header.newManuscript')}
                    </span>
                  </div>
                </div>

                {activeChapter && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '220px',
                    }}
                    title={`${t('statusBar.activeChapter')}: ${activeChapter.title}`}
                  >
                    / {activeChapter.title}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="header-right-section" style={{ gap: '0.5rem' }}>
            {/* Save Button */}
            <button
              className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => saveProject()}
              disabled={isSaving}
              title={isDirty ? t('header.saveTooltip') : t('header.allChangesSaved')}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', gap: '0.4rem' }}
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{isSaving ? t('common.saving') : isDirty ? t('common.save') : t('common.saved')}</span>
            </button>

            {/* Reading paper tone cycle */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const themes: ('light' | 'sepia' | 'dark' | 'obsidian')[] = ['light', 'sepia', 'dark', 'obsidian'];
                const nextIdx = (themes.indexOf(readerTheme) + 1) % themes.length;
                setReaderTheme(themes[nextIdx]);
              }}
              title={`${t('statusBar.cycleTheme')}: ${readerTheme}`}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', textTransform: 'capitalize' }}
            >
              {readerTheme === 'light' ? (
                <Sun size={13} style={{ color: '#f59e0b' }} />
              ) : readerTheme === 'sepia' ? (
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706' }}>SEP</span>
              ) : (
                <Moon size={13} style={{ color: '#818cf8' }} />
              )}
            </button>

            {/* Settings button */}
            <button
              className="btn-icon btn-sm"
              onClick={() => openSettings('appearance')}
              title={t('header.settingsTooltip')}
            >
              <Settings size={15} />
            </button>

            {/* Exit Minimalist Mode button */}
            <button
              className="btn btn-sm btn-outline exit-minimalist-btn"
              onClick={() => setMinimalistMode(false)}
              title={t('headerActions.exitMinimalist')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Layout size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('headerActions.exitMinimalist')}</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="app-header" role="banner">
          {/* Left Section: App Logo, Sidebar Toggle & Document Title Pill */}
          <div className="header-left-section">
            <button
              className={`btn-icon btn-sm sidebar-toggle-btn ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}
              onClick={toggleSidebar}
              title={sidebarCollapsed ? t('header.showSidebar') : t('header.hideSidebar')}
            >
              <Sidebar size={15} />
            </button>

            <div
              className="brand-badge brand-badge-clickable"
              title={t('headerActions.brandSubtitle')}
              onClick={() => setIsWelcomeModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setIsWelcomeModalOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <ChronicleLogo size={22} glow />
              <span className="brand-text">Chronicle</span>
            </div>

            {book && (
              <>
                <div className="header-divider" />
                <div
                  className="document-title-pill"
                  onClick={() => setIsRenameOpen(true)}
                  title={t('headerActions.renameTitleAuthor')}
                >
                  <span
                    className={`document-status-dot ${isDirty ? 'dot-dirty' : 'dot-clean'}`}
                    title={isDirty ? t('header.unsavedChanges') : t('header.allChangesSaved')}
                  />
                  <div className="document-title-content">
                    <span className="document-title-text">
                      {book.metadata.title || 'Untitled Manuscript'}
                    </span>
                    {book.metadata.creator && (
                      <span className="document-author-subtext">
                        {t('headerActions.byAuthor')} {book.metadata.creator}
                      </span>
                    )}
                  </div>
                  <Edit2 size={11} className="title-edit-hint" />
                </div>
              </>
            )}
          </div>

          {/* Center Section: 3 Core Workspaces (Write, Knowledge Base, Publish) */}
          <div className="header-center-section">
            <nav className="segmented-nav-control primary-workspace-nav" aria-label="Core Workspaces">
              {primaryModes.map(item => {
                const isActive = primaryMode === item.id;
                return (
                  <button
                    key={item.id}
                    className={`segmented-pill primary-mode-pill ${isActive ? 'active' : ''}`}
                    onClick={() => setPrimaryMode(item.id)}
                    title={item.tooltip}
                  >
                    {item.icon}
                    <span className="primary-mode-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Section: File Actions & Save / Export Hub */}
          <div className="header-right-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".chronicle,.epub,.md,.markdown,.mdown,.mkd"
              style={{ display: 'none' }}
            />

            <button
              className="btn btn-ghost btn-sm header-btn-collapsible"
              onClick={() => createNewBook()}
              title={t('header.newManuscript')}
              disabled={isLoading}
            >
              <PlusCircle size={14} />
              <span>{t('headerActions.newBook')}</span>
            </button>

            <button
              className="btn btn-ghost btn-sm header-btn-collapsible"
              onClick={handleOpenClick}
              title={t('header.openManuscript')}
              disabled={isLoading}
            >
              <Upload size={14} />
              <span>{t('headerActions.openBook')}</span>
            </button>

            {/* WebDAV Cloud Storage Hub */}
            {!isTauri() ? (
              <button
                className="btn btn-ghost btn-sm header-btn-collapsible"
                onClick={() => setIsCloudDesktopNoticeOpen(true)}
                title="Cloud Storage (Available on Desktop App)"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Cloud size={14} />
                <span>{t('headerActions.cloud')}</span>
              </button>
            ) : (
              <div className="header-btn-collapsible" style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsCloudMenuOpen(!isCloudMenuOpen)}
                  title="Cloud Storage (WebDAV: Nextcloud, ownCloud, etc.)"
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Cloud size={14} style={{ color: isWebDavConnected ? '#3b82f6' : 'inherit' }} />
                  <span>{t('headerActions.cloud')}</span>
                  {isWebDavConnected && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
                        position: 'absolute',
                        top: 5,
                        right: 3,
                      }}
                      title="WebDAV Connected"
                    />
                  )}
                  <ChevronDown size={11} style={{ opacity: 0.6 }} />
                </button>

                {isCloudMenuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                      onClick={() => setIsCloudMenuOpen(false)}
                    />
                    <div
                      className="header-dropdown-menu"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        zIndex: 101,
                        minWidth: '220px',
                        backgroundColor: '#1a1a22',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsCloudMenuOpen(false);
                          setIsCloudBrowserOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <FolderTree size={14} color="#3b82f6" />
                        <span>{t('headerActions.openFromCloud')}</span>
                      </button>

                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsCloudMenuOpen(false);
                          setIsSaveAsOpen(true);
                        }}
                        disabled={!book}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: book ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: book ? 'pointer' : 'not-allowed',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Cloud size={14} color="var(--accent-primary)" />
                        <span>{t('headerActions.saveAsCloud')}</span>
                      </button>

                      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '3px 0' }} />

                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsCloudMenuOpen(false);
                          openSettings('cloud');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Settings size={14} />
                        <span>{t('headerActions.webdavSettings')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Smart Typography Cleanup */}
            <button
              className="btn btn-ghost btn-sm header-btn-collapsible"
              onClick={() => setIsTypographyOpen(true)}
              title={t('header.typographyTooltip')}
              disabled={isLoading || !book}
              style={{ color: 'var(--accent-secondary)' }}
            >
              <Wand2 size={14} />
              <span>{t('headerActions.typography')}</span>
            </button>

            {/* Story Snapshots (Time Machine) */}
            <button
              className="btn btn-ghost btn-sm header-btn-collapsible header-snapshots-btn"
              onClick={() => setIsSnapshotsModalOpen(true)}
              title="Story Snapshots (Manuscript Time Machine) — Capture milestones & history (Alt+S)"
              disabled={isLoading || !book}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Camera size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Snapshots</span>
              {snapshots.length > 0 && (
                <span className="header-snapshots-counter-badge">
                  {snapshots.length}
                </span>
              )}
            </button>

            {/* Split Save Button Group (Save + Dropdown Arrow for Save As) */}
            <div className="btn-split-group" style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}>
              <button
                className="btn btn-primary btn-sm header-save-btn btn-split-main"
                onClick={() => saveProject()}
                title={
                  isSaving
                    ? t('common.saving')
                    : storageTarget === 'cloud'
                      ? t('header.saveCloudTooltip')
                      : storageTarget === 'local'
                        ? localFilePath
                          ? `${t('header.saveLocalTooltip')} (${localFilePath.split(/[\\/]/).pop()})`
                          : t('header.saveLocalTooltip')
                        : t('header.saveTooltip')
                }
                disabled={isSaving || !book}
                style={{
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  paddingRight: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : storageTarget === 'cloud' ? (
                  <Cloud size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>
                  {isSaving
                    ? storageTarget === 'cloud'
                      ? t('statusBar.uploadingCloud')
                      : t('common.saving')
                    : storageTarget === 'cloud'
                      ? t('headerActions.quickSaveCloud')
                      : t('common.save')}
                </span>
              </button>

              <button
                className="btn btn-primary btn-sm btn-split-arrow"
                onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                title={t('headerActions.saveAs')}
                disabled={isSaving || !book}
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '0 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronDown size={12} />
              </button>

              {isSaveMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                    onClick={() => setIsSaveMenuOpen(false)}
                  />
                  <div
                    className="header-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      zIndex: 101,
                      minWidth: '240px',
                      backgroundColor: '#1a1a22',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        saveProject();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      {storageTarget === 'cloud' ? <Cloud size={14} color="#3b82f6" /> : <Save size={14} color="var(--accent-primary)" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{storageTarget === 'cloud' ? t('headerActions.quickSaveCloud') : t('headerActions.quickSave')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {storageTarget === 'cloud' ? t('header.saveCloudTooltip') : t('header.saveTooltip')}
                        </div>
                      </div>
                      <kbd className="kbd-shortcut" style={{ fontSize: '9px', padding: '1px 4px' }}>Ctrl+S</kbd>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        setIsSnapshotsModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Camera size={14} color="var(--accent-primary)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Story Snapshots...</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {snapshots.length > 0 ? `${snapshots.length} saved in project` : 'Capture manuscript milestones'}
                        </div>
                      </div>
                      <kbd className="kbd-shortcut" style={{ fontSize: '9px', padding: '1px 4px' }}>Alt+S</kbd>
                    </button>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '3px 0' }} />

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        setIsSaveAsOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <FolderArchive size={14} color="var(--accent-secondary)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('headerActions.saveAs')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {t('headerActions.saveAsDesc')}
                        </div>
                      </div>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        setIsSaveDestinationOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Settings size={14} />
                      <span>{t('headerActions.chooseDestination')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Studio Settings & Preferences */}
            <button
              className="btn btn-ghost btn-sm header-btn-collapsible"
              onClick={() => openSettings('appearance')}
              title={isUpdateAvailable ? `${t('settings.updateAvailable')}: ${latestRelease?.latestVersion || ''}` : t('header.settingsTooltip')}
              style={{ position: 'relative' }}
            >
              <Settings size={14} />
              <span>{t('headerActions.settingsPreferences')}</span>
              {isUpdateAvailable && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#e6be75',
                    boxShadow: '0 0 6px rgba(230, 190, 117, 0.9)',
                    position: 'absolute',
                    top: 4,
                    right: 4,
                  }}
                />
              )}
            </button>

            {/* Responsive Overflow "More" Menu for Narrow/Standard Screens */}
            <div className="header-more-btn-container" style={{ position: 'relative' }}>
              <button
                className={`btn btn-ghost btn-sm header-more-btn ${isMoreMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                title={t('headerActions.moreActions')}
                aria-expanded={isMoreMenuOpen}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <MoreHorizontal size={15} />
                <span>{t('headerActions.moreActions')}</span>
                <ChevronDown
                  size={11}
                  style={{
                    opacity: 0.7,
                    transform: isMoreMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div
                    className="header-dropdown-menu header-more-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      zIndex: 101,
                      minWidth: '240px',
                      borderRadius: '8px',
                      padding: '5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div className="dropdown-section-title">{t('headerActions.manuscriptAndFile')}</div>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        createNewBook();
                      }}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <PlusCircle size={15} color="var(--accent-primary)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('header.newManuscript')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('welcome.startNewDesc')}</div>
                      </div>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleOpenClick();
                      }}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Upload size={15} color="#3b82f6" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('header.openManuscript')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('welcome.openDesc')}</div>
                      </div>
                      <kbd className="kbd-shortcut">Ctrl+O</kbd>
                    </button>

                    {!isTauri() ? (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsCloudDesktopNoticeOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Cloud size={15} color="#60a5fa" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{t('headerActions.cloud')}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Desktop App only</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setIsCloudBrowserOpen(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Cloud size={15} color={isWebDavConnected ? '#10b981' : '#60a5fa'} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{t('headerActions.cloud')}</span>
                            {isWebDavConnected && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: '#10b981',
                                  display: 'inline-block',
                                }}
                                title="WebDAV Connected"
                              />
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('headerActions.openFromCloud')}</div>
                        </div>
                      </button>
                    )}

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '3px 0' }} />
                    <div className="dropdown-section-title">{t('headerActions.toolsAndGuides')}</div>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsTypographyOpen(true);
                      }}
                      disabled={isLoading || !book}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: book ? 'pointer' : 'not-allowed',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Wand2 size={15} color="var(--accent-secondary)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('headerActions.smartTypography')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('headerActions.smartTypographyDesc')}</div>
                      </div>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsWelcomeModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Sparkles size={15} color="#c084fc" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('headerActions.welcomeGuide')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('headerActions.welcomeGuideDesc')}</div>
                      </div>
                    </button>

                    <button
                      className="dropdown-item header-more-export-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsExportModalOpen(true);
                      }}
                      disabled={isLoading || !book}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: book ? 'pointer' : 'not-allowed',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Download size={15} color="#10b981" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('headerActions.exportHub')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('headerActions.exportHubDesc')}</div>
                      </div>
                    </button>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '3px 0' }} />

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        openSettings('appearance');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Settings size={15} color="var(--text-secondary)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{t('headerActions.settingsPreferences')}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('headerActions.settingsPreferencesDesc')}</div>
                      </div>
                      <kbd className="kbd-shortcut">Ctrl+,</kbd>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        openSettings('updates');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: isUpdateAvailable ? 'rgba(230, 190, 117, 0.12)' : 'none',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <ArrowUpCircle size={15} color={isUpdateAvailable ? 'var(--gold-primary)' : 'var(--accent-primary)'} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: isUpdateAvailable ? 'var(--gold-primary)' : 'inherit' }}>
                          {isUpdateAvailable ? `Update Available (${latestRelease?.latestVersion || 'New'})` : 'Check for Updates...'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          v{CURRENT_VERSION}
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Popups & Modals */}
      {isRenameOpen && (
        <TitleRenameModal onClose={() => setIsRenameOpen(false)} />
      )}

      {isTypographyOpen && (
        <TypographyModal onClose={() => setIsTypographyOpen(false)} />
      )}

      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}
    </>
  );
};
