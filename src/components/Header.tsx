import React, { useRef, useState } from 'react';
import { useEpub } from '../context/EpubContext';
import { useTts } from '../context/TtsContext';
import {
  BookOpen,
  Edit3,
  ListOrdered,
  Tag,
  Image as ImageIcon,
  Palette,
  FolderArchive,
  Terminal,
  Upload,
  Download,
  Wand2,
  Save,
  Sidebar,
  PlusCircle,
  Edit2,
  Clock,
  Cloud,
  ChevronDown,
  FolderTree,
  Settings,
  Sparkles,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { AppViewMode } from '../types/epub';
import { TypographyModal } from './Typography/TypographyModal';
import { ExportModal } from './Export/ExportModal';
import { TitleRenameModal } from './Header/TitleRenameModal';
import { ChronicleLogo } from './Common/ChronicleLogo';
import { isTauri } from '../services/cloud/webdavClient';

export const Header: React.FC = () => {
  const {
    book,
    viewMode,
    setViewMode,
    loadAnyFile,
    createNewBook,
    isLoading,
    isSaving,
    isDirty,
    saveProject,
    sidebarCollapsed,
    toggleSidebar,
    storageTarget,
    cloudFileName,
    isWebDavConnected,
    setIsCloudBrowserOpen,
    setIsSaveAsOpen,
    setIsSaveDestinationOpen,
    setIsWelcomeModalOpen,
    setIsCloudDesktopNoticeOpen,
    openSettings,
  } = useEpub();
  const { stopAudio } = useTts();

  const [isTypographyOpen, setIsTypographyOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
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

  const navItems: { id: AppViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Write', icon: <Edit3 size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
    { id: 'reader', label: 'Read', icon: <BookOpen size={14} /> },
    { id: 'toc', label: 'TOC', icon: <ListOrdered size={14} /> },
    { id: 'metadata', label: 'Metadata', icon: <Tag size={14} /> },
    { id: 'cover', label: 'Cover', icon: <ImageIcon size={14} /> },
    { id: 'styles', label: 'Styles', icon: <Palette size={14} /> },
    { id: 'assets', label: 'Assets', icon: <FolderArchive size={14} /> },
    { id: 'inspector', label: 'Inspect', icon: <Terminal size={14} /> },
  ];

  return (
    <>
      <header className="app-header" role="banner">
        {/* Left Section: App Logo, Sidebar Toggle & Document Title Pill */}
        <div className="header-left-section">
          <button
            className={`btn-icon btn-sm sidebar-toggle-btn ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Show Sidebar (Ctrl+\\)' : 'Hide Sidebar (Ctrl+\\)'}
          >
            <Sidebar size={15} />
          </button>

          <div
            className="brand-badge brand-badge-clickable"
            title="Chronicle • Authoring Suite (Click to open Welcome Guide)"
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
                title="Click to rename title and author"
              >
                <span
                  className={`document-status-dot ${isDirty ? 'dot-dirty' : 'dot-clean'}`}
                  title={isDirty ? 'Unsaved changes (Press Ctrl+S)' : 'All changes saved'}
                />
                <div className="document-title-content">
                  <span className="document-title-text">
                    {book.metadata.title || 'Untitled Manuscript'}
                  </span>
                  {book.metadata.creator && (
                    <span className="document-author-subtext">
                      by {book.metadata.creator}
                    </span>
                  )}
                </div>
                <Edit2 size={11} className="title-edit-hint" />
              </div>
            </>
          )}
        </div>

        {/* Center Section: Linear-style Segmented Mode Switcher */}
        <div className="header-center-section">
          <nav className="segmented-nav-control" aria-label="Workspaces">
            {navItems.map(item => {
              const isActive = viewMode === item.id;
              return (
                <button
                  key={item.id}
                  className={`segmented-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setViewMode(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
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
            accept=".chronicle,.epub,.epubstudio,.eproj"
            style={{ display: 'none' }}
          />

          <button
            className="btn btn-ghost btn-sm header-btn-collapsible"
            onClick={() => setIsWelcomeModalOpen(true)}
            title="Welcome & Quick Start Guide"
          >
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <span>Guide</span>
          </button>

          <button
            className="btn btn-ghost btn-sm header-btn-collapsible"
            onClick={() => createNewBook('New Manuscript', 'Author')}
            title="Create a new blank book"
            disabled={isLoading}
          >
            <PlusCircle size={14} />
            <span>New</span>
          </button>

          <button
            className="btn btn-ghost btn-sm header-btn-collapsible"
            onClick={() => fileInputRef.current?.click()}
            title="Open Chronicle or EPUB from computer (Ctrl+O)"
            disabled={isLoading}
          >
            <Upload size={14} />
            <span>Open</span>
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
              <span>Cloud</span>
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
                <span>Cloud</span>
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
                      <span>Open from Cloud...</span>
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
                      <span>Save As to Cloud...</span>
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
                      <span>WebDAV Settings...</span>
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
            title="Smart typography & punctuation cleanup"
            disabled={isLoading || !book}
            style={{ color: 'var(--accent-secondary)' }}
          >
            <Wand2 size={14} />
            <span>Typography</span>
          </button>

          {/* Split Save Button Group (Save + Dropdown Arrow for Save As) */}
          <div className="btn-split-group" style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}>
            <button
              className="btn btn-primary btn-sm header-save-btn btn-split-main"
              onClick={() => saveProject()}
              title={
                isSaving
                  ? 'Saving in progress...'
                  : storageTarget === 'cloud'
                  ? `Save and replace in WebDAV cloud (${cloudFileName || 'document'}) (Ctrl+S)`
                  : storageTarget === 'local'
                  ? 'Save project locally (.chronicle) (Ctrl+S)'
                  : 'Save project (Ctrl+S)'
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
                    ? 'Uploading...'
                    : 'Saving...'
                  : storageTarget === 'cloud'
                  ? 'Save (Cloud)'
                  : 'Save'}
              </span>
            </button>

            <button
              className="btn btn-primary btn-sm btn-split-arrow"
              onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
              title="Save options (Save As...)"
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
                    minWidth: '230px',
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
                      <div style={{ fontWeight: 600 }}>{storageTarget === 'cloud' ? 'Quick Save (Cloud)' : 'Quick Save'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {storageTarget === 'cloud' ? 'Uploads and updates remote file' : 'Saves current manuscript'}
                      </div>
                    </div>
                    <kbd className="kbd-shortcut" style={{ fontSize: '9px', padding: '1px 4px' }}>Ctrl+S</kbd>
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
                      <div style={{ fontWeight: 600 }}>Save As...</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Save as local file or to WebDAV cloud
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
                    <span>Choose Save Destination...</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Multi-Format Export Hub */}
          <button
            className="btn btn-secondary btn-sm header-export-btn"
            onClick={() => setIsExportOpen(true)}
            title="Export manuscript to Word (Shunn DOCX), PDF, Markdown, and more"
            disabled={isLoading || !book}
          >
            <Download size={14} />
            <span>Export Hub</span>
          </button>

          {/* Studio Settings & Preferences */}
          <button
            className="btn btn-ghost btn-sm header-btn-collapsible"
            onClick={() => openSettings('appearance')}
            title="Settings & Preferences (Ctrl+,)"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>

          {/* Responsive Overflow "More" Menu for Narrow/Standard Screens */}
          <div className="header-more-btn-container" style={{ position: 'relative' }}>
            <button
              className={`btn btn-ghost btn-sm header-more-btn ${isMoreMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              title="More actions & tools"
              aria-expanded={isMoreMenuOpen}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <MoreHorizontal size={15} />
              <span>More</span>
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
                  <div className="dropdown-section-title">Manuscript & File</div>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      createNewBook('New Manuscript', 'Author');
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
                      <div style={{ fontWeight: 600 }}>New Manuscript</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Create fresh empty book</div>
                    </div>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      fileInputRef.current?.click();
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
                      <div style={{ fontWeight: 600 }}>Open File...</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EPUB or Chronicle project</div>
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
                        <div style={{ fontWeight: 600 }}>WebDAV Cloud</div>
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
                          <span>WebDAV Cloud</span>
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
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Browse or sync remote files</div>
                      </div>
                    </button>
                  )}

                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '3px 0' }} />
                  <div className="dropdown-section-title">Tools & Guides</div>

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
                      <div style={{ fontWeight: 600 }}>Smart Typography</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Punctuation & quotes cleanup</div>
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
                      <div style={{ fontWeight: 600 }}>Welcome Guide</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tour and quick start</div>
                    </div>
                  </button>

                  <button
                    className="dropdown-item header-more-export-item"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsExportOpen(true);
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
                      <div style={{ fontWeight: 600 }}>Export Hub...</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Word, PDF, EPUB, Markdown</div>
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
                      <div style={{ fontWeight: 600 }}>Settings & Preferences</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Themes, display & behavior</div>
                    </div>
                    <kbd className="kbd-shortcut">Ctrl+,</kbd>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Popups & Modals */}
      {isRenameOpen && (
        <TitleRenameModal onClose={() => setIsRenameOpen(false)} />
      )}

      {isTypographyOpen && (
        <TypographyModal onClose={() => setIsTypographyOpen(false)} />
      )}

      {isExportOpen && (
        <ExportModal onClose={() => setIsExportOpen(false)} />
      )}
    </>
  );
};
