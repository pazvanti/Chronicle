import React, { useState, useEffect, useRef } from 'react';
import { useEpub, EpubProvider } from './context/EpubContext';
import { TtsProvider, useTts } from './context/TtsContext';
import { I18nProvider } from './i18n/I18nContext';
import { Header } from './components/Header';
import { SubNavHeader } from './components/Navigation/SubNavHeader';
import { ChapterList } from './components/Sidebar/ChapterList';
import { EditorContainer } from './components/Editor/EditorContainer';
import { ReaderView } from './components/Reader/ReaderView';
import { Upload, Loader2 } from 'lucide-react';

// Code-split heavy studios and modals to accelerate initial startup
const TocManager = React.lazy(() => import('./components/Toc/TocManager').then(m => ({ default: m.TocManager })));
const MetadataEditor = React.lazy(() => import('./components/Metadata/MetadataEditor').then(m => ({ default: m.MetadataEditor })));
const CoverStudio = React.lazy(() => import('./components/Cover/CoverStudio').then(m => ({ default: m.CoverStudio })));
const StyleStudio = React.lazy(() => import('./components/StyleStudio/StyleStudio').then(m => ({ default: m.StyleStudio })));
const AssetManager = React.lazy(() => import('./components/Assets/AssetManager').then(m => ({ default: m.AssetManager })));
const EpubInspector = React.lazy(() => import('./components/Inspector/EpubInspector').then(m => ({ default: m.EpubInspector })));
const CastPresenceGrid = React.lazy(() => import('./components/CastPresence/CastPresenceGrid').then(m => ({ default: m.CastPresenceGrid })));
const TimelineStudio = React.lazy(() => import('./components/Timeline/TimelineStudio').then(m => ({ default: m.TimelineStudio })));
const CharacterStudio = React.lazy(() => import('./components/Characters/CharacterStudio').then(m => ({ default: m.CharacterStudio })));
const LocationStudio = React.lazy(() => import('./components/Locations/LocationStudio').then(m => ({ default: m.LocationStudio })));

const WebDavConfigModal = React.lazy(() => import('./components/Cloud/WebDavConfigModal').then(m => ({ default: m.WebDavConfigModal })));
const SaveDestinationModal = React.lazy(() => import('./components/Cloud/SaveDestinationModal').then(m => ({ default: m.SaveDestinationModal })));
const SaveAsModal = React.lazy(() => import('./components/Cloud/SaveAsModal').then(m => ({ default: m.SaveAsModal })));
const CloudFileBrowserModal = React.lazy(() => import('./components/Cloud/CloudFileBrowserModal').then(m => ({ default: m.CloudFileBrowserModal })));
const CloudDesktopNoticeModal = React.lazy(() => import('./components/Cloud/CloudDesktopNoticeModal').then(m => ({ default: m.CloudDesktopNoticeModal })));
const SettingsModal = React.lazy(() => import('./components/Settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SnapshotsModal = React.lazy(() => import('./components/Snapshots/SnapshotsModal').then(m => ({ default: m.SnapshotsModal })));
const MobileNoticeModal = React.lazy(() => import('./components/Mobile/MobileNoticeModal').then(m => ({ default: m.MobileNoticeModal })));

import { StatusBar } from './components/StatusBar/StatusBar';
import { GhostHud } from './components/Zen/GhostHud';
import { ZenLeftChapterMenu } from './components/Zen/ZenLeftChapterMenu';
import { WelcomeScreen } from './components/Welcome/WelcomeScreen';
import { NotificationToast } from './components/NotificationToast';
import { WelcomeModal } from './components/Welcome/WelcomeModal';
import { isKeyMatch } from './utils/platform';
import { UnsavedChangesModal } from './components/Common/UnsavedChangesModal';
import { LibraryView } from './components/Library/LibraryView';
import { useSmallScreenDetector } from './hooks/useSmallScreenDetector';
import { isTauri } from './services/cloud/webdavClient';

const AppContent: React.FC = () => {
  const {
    book,
    viewMode,
    isLoading,
    isSaving,
    loadAnyFile,
    openLocalDocument,
    saveProject,
    toggleSidebar,
    sidebarCollapsed,
    showNotification,
    isLibraryOpen,
    isWebDavConfigOpen,
    setIsWebDavConfigOpen,
    isSaveDestinationOpen,
    setIsSaveDestinationOpen,
    isSaveAsOpen,
    setIsSaveAsOpen,
    isCloudBrowserOpen,
    setIsCloudBrowserOpen,
    isCloudDesktopNoticeOpen,
    setIsCloudDesktopNoticeOpen,
    isWelcomeModalOpen,
    setIsWelcomeModalOpen,
    isSettingsOpen,
    closeSettings,
    settingsInitialTab,
    openSettings,
    pendingUnsavedAction,
    isZenMode,
    setIsSnapshotsModalOpen,
  } = useEpub();
  const { stopAudio } = useTts();
  const { showNotice: showMobileNotice, dismiss: dismissMobileNotice } = useSmallScreenDetector();

  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Global Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+S / Cmd+S: Quick Save Studio Project
      if ((e.ctrlKey || e.metaKey) && isKeyMatch(e, 's', 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();

        if (!book) {
          showNotification('info', 'No manuscript is currently loaded to save.');
          return;
        }
        if (isSaving) return;
        saveProject();
        return;
      }

      // 2. Ctrl+\ or Cmd+\: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
        return;
      }

      // 3. Ctrl+O or Cmd+O: Open EPUB or Project File
      if ((e.ctrlKey || e.metaKey) && isKeyMatch(e, 'o', 'KeyO')) {
        e.preventDefault();
        e.stopPropagation();
        if (isTauri()) {
          openLocalDocument();
        } else {
          globalFileInputRef.current?.click();
        }
        return;
      }

      // 4. Ctrl+, or Cmd+,: Open Settings & Preferences
      if ((e.ctrlKey || e.metaKey) && (e.key === ',' || e.code === 'Comma')) {
        e.preventDefault();
        e.stopPropagation();
        openSettings();
        return;
      }

      // 5. Alt+S or Ctrl+Shift+S / Cmd+Shift+S: Open Story Snapshots (Time Machine)
      if (
        (e.altKey && isKeyMatch(e, 's', 'KeyS')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && isKeyMatch(e, 's', 'KeyS'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsSnapshotsModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [book, saveProject, isSaving, showNotification, toggleSidebar, openSettings, setIsSnapshotsModalOpen, openLocalDocument]);

  const isExternalFileDrag = (e: React.DragEvent) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    const typeList = Array.from(types);
    return typeList.includes('Files') && !typeList.includes('application/x-chronicle-chapter');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!isExternalFileDrag(e)) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const lower = file.name.toLowerCase();
      if (
        lower.endsWith('.chronicle') ||
        lower.endsWith('.epub') ||
        lower.endsWith('.md') ||
        lower.endsWith('.markdown') ||
        lower.endsWith('.mdown') ||
        lower.endsWith('.mkd')
      ) {
        stopAudio();
        loadAnyFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopAudio();
      loadAnyFile(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div
      className="app-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={globalFileInputRef}
        onChange={handleFileSelect}
        accept=".chronicle,.epub,.md,.markdown,.mdown,.mkd"
        style={{ display: 'none' }}
      />

      {!isZenMode && <Header />}

      <main className="app-main">
        {/* Sidebar Chapter List shown in Reader and Editor modes when book is loaded, library is closed, and not in Zen mode */}
        {!isZenMode && !isLibraryOpen && book && !sidebarCollapsed && (viewMode === 'editor' || viewMode === 'reader') && (
          <ChapterList />
        )}

        <div className="app-content-workspace">
          {isLoading && (
            <div className="workspace-loading-overlay">
              <Loader2 size={38} color="var(--accent-primary)" className="animate-spin" />
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading Manuscript...</div>
            </div>
          )}

          {isLibraryOpen ? (
            <LibraryView />
          ) : !book ? (
            <WelcomeScreen />
          ) : (
            <>
              {!isZenMode && <SubNavHeader />}
              {viewMode === 'reader' && <ReaderView />}
              {viewMode === 'editor' && <EditorContainer />}
              <React.Suspense fallback={
                <div className="workspace-loading-overlay">
                  <Loader2 size={38} color="var(--accent-primary)" className="animate-spin" />
                </div>
              }>
                {viewMode === 'characters' && <CharacterStudio />}
                {viewMode === 'locations' && <LocationStudio />}
                {viewMode === 'cast-grid' && <CastPresenceGrid />}
                {viewMode === 'timeline' && <TimelineStudio />}
                {viewMode === 'toc' && <TocManager />}
                {viewMode === 'metadata' && <MetadataEditor />}
                {viewMode === 'cover' && <CoverStudio />}
                {viewMode === 'styles' && <StyleStudio />}
                {viewMode === 'assets' && <AssetManager />}
                {viewMode === 'inspector' && <EpubInspector />}
              </React.Suspense>
            </>
          )}
        </div>
      </main>

      {/* Docked Desktop Bottom Status Bar */}
      {!isZenMode && <StatusBar />}

      {/* Zen Mode Floating Ghost HUD & Left Chapter Menu */}
      <GhostHud />
      <ZenLeftChapterMenu />

      {/* Global Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="global-drag-overlay">
          <Upload size={64} color="#ffffff" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ffffff' }}>
            Drop Chronicle project or EPUB file here to open
          </h2>
        </div>
      )}

      <NotificationToast />

      {/* Cloud & Save Modals (Suspended) */}
      <React.Suspense fallback={null}>
        {isWebDavConfigOpen && (
          <WebDavConfigModal onClose={() => setIsWebDavConfigOpen(false)} />
        )}
        {isSaveDestinationOpen && (
          <SaveDestinationModal onClose={() => setIsSaveDestinationOpen(false)} />
        )}
        {isSaveAsOpen && (
          <SaveAsModal onClose={() => setIsSaveAsOpen(false)} />
        )}
        {isCloudBrowserOpen && (
          <CloudFileBrowserModal onClose={() => setIsCloudBrowserOpen(false)} />
        )}
        {isCloudDesktopNoticeOpen && (
          <CloudDesktopNoticeModal onClose={() => setIsCloudDesktopNoticeOpen(false)} />
        )}

        {/* Introductory Welcome & Quick Start Modal */}
        <WelcomeModal
          isOpen={isWelcomeModalOpen}
          onClose={() => setIsWelcomeModalOpen(false)}
          onOpenCloud={() => setIsCloudBrowserOpen(true)}
        />

        {/* Studio Settings & Preferences Modal */}
        {isSettingsOpen && (
          <SettingsModal
            initialTab={settingsInitialTab}
            onClose={closeSettings}
          />
        )}

        {/* Story Snapshots (Time Machine) Modal */}
        <SnapshotsModal />

        {/* Small Screen / Mobile Device Handheld Notice Modal */}
        {showMobileNotice && (
          <MobileNoticeModal onDismiss={dismissMobileNotice} />
        )}
      </React.Suspense>

      {/* Unsaved Changes Confirmation Modal */}
      {pendingUnsavedAction && <UnsavedChangesModal />}
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <EpubProvider>
        <TtsProvider>
          <AppContent />
        </TtsProvider>
      </EpubProvider>
    </I18nProvider>
  );
}
