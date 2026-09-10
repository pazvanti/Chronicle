import React, { useState, useEffect, useRef } from 'react';
import { useEpub, EpubProvider } from './context/EpubContext';
import { TtsProvider, useTts } from './context/TtsContext';
import { Header } from './components/Header';
import { ChapterList } from './components/Sidebar/ChapterList';
import { EditorContainer } from './components/Editor/EditorContainer';
import { ReaderView } from './components/Reader/ReaderView';
import { TocManager } from './components/Toc/TocManager';
import { MetadataEditor } from './components/Metadata/MetadataEditor';
import { CoverStudio } from './components/Cover/CoverStudio';
import { StyleStudio } from './components/StyleStudio/StyleStudio';
import { AssetManager } from './components/Assets/AssetManager';
import { EpubInspector } from './components/Inspector/EpubInspector';
import { TimelineStudio } from './components/Timeline/TimelineStudio';
import { StatusBar } from './components/StatusBar/StatusBar';
import { WelcomeScreen } from './components/Welcome/WelcomeScreen';
import { NotificationToast } from './components/NotificationToast';
import { WebDavConfigModal } from './components/Cloud/WebDavConfigModal';
import { SaveDestinationModal } from './components/Cloud/SaveDestinationModal';
import { SaveAsModal } from './components/Cloud/SaveAsModal';
import { CloudFileBrowserModal } from './components/Cloud/CloudFileBrowserModal';
import { CloudDesktopNoticeModal } from './components/Cloud/CloudDesktopNoticeModal';
import { WelcomeModal } from './components/Welcome/WelcomeModal';
import { UnsavedChangesModal } from './components/Common/UnsavedChangesModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { Upload, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    book,
    viewMode,
    isLoading,
    isSaving,
    loadAnyFile,
    saveProject,
    toggleSidebar,
    sidebarCollapsed,
    showNotification,
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
  } = useEpub();
  const { stopAudio } = useTts();

  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Global Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+S / Cmd+S: Quick Save Studio Project
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
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
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
        return;
      }

      // 3. Ctrl+O or Cmd+O: Open EPUB or Project File
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        e.stopPropagation();
        globalFileInputRef.current?.click();
        return;
      }

      // 4. Ctrl+, or Cmd+,: Open Settings & Preferences
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        e.stopPropagation();
        openSettings();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [book, saveProject, isSaving, showNotification, toggleSidebar, openSettings]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const lower = file.name.toLowerCase();
      if (
        lower.endsWith('.chronicle') ||
        lower.endsWith('.epub') ||
        lower.endsWith('.epubstudio') ||
        lower.endsWith('.eproj')
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
        accept=".chronicle,.epub,.epubstudio,.eproj"
        style={{ display: 'none' }}
      />

      <Header />

      <main className="app-main">
        {/* Sidebar Chapter List shown in Reader and Editor modes when book is loaded */}
        {book && !sidebarCollapsed && (viewMode === 'editor' || viewMode === 'reader') && (
          <ChapterList />
        )}

        <div className="app-content-workspace">
          {isLoading && (
            <div className="workspace-loading-overlay">
              <Loader2 size={38} color="var(--accent-primary)" className="animate-spin" />
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading Manuscript...</div>
            </div>
          )}

          {!book ? (
            <WelcomeScreen />
          ) : (
            <>
              {viewMode === 'reader' && <ReaderView />}
              {viewMode === 'editor' && <EditorContainer />}
              {viewMode === 'timeline' && <TimelineStudio />}
              {viewMode === 'toc' && <TocManager />}
              {viewMode === 'metadata' && <MetadataEditor />}
              {viewMode === 'cover' && <CoverStudio />}
              {viewMode === 'styles' && <StyleStudio />}
              {viewMode === 'assets' && <AssetManager />}
              {viewMode === 'inspector' && <EpubInspector />}
            </>
          )}
        </div>
      </main>

      {/* Docked Desktop Bottom Status Bar */}
      <StatusBar />

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

      {/* Cloud & Save Modals */}
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

      {/* Unsaved Changes Confirmation Modal */}
      {pendingUnsavedAction && <UnsavedChangesModal />}
    </div>
  );
};

export default function App() {
  return (
    <EpubProvider>
      <TtsProvider>
        <AppContent />
      </TtsProvider>
    </EpubProvider>
  );
}
