import React, { useState, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ChronicleLogo } from '../Common/ChronicleLogo';
import { isTauri } from '../../services/cloud/webdavClient';
import {
  Sparkles,
  ArrowRight,
  X,
  PlusCircle,
  FolderOpen,
  Cloud,
  Clock,
  Users,
  MapPin,
  Volume2,
  Printer,
  Keyboard,
  Rocket,
  Compass,
  Check,
  Edit3,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCloud?: () => void;
}

type TabType = 'quickstart' | 'features' | 'shortcuts';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenCloud,
}) => {
  const {
    loadAnyFile,
    loadSampleBook,
    createNewBook,
    setIsCloudDesktopNoticeOpen,
  } = useEpub();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('quickstart');

  const [showOnStartup, setShowOnStartup] = useState<boolean>(() => {
    const saved = localStorage.getItem('chronicle_show_welcome_on_startup');
    return saved === null ? true : saved === 'true';
  });

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleStartupToggle = (checked: boolean) => {
    setShowOnStartup(checked);
    localStorage.setItem('chronicle_show_welcome_on_startup', String(checked));
  };

  const handleCreateNew = () => {
    createNewBook('Untitled Novel', 'Author Name');
    onClose();
  };

  const handleLoadSample = () => {
    loadSampleBook();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAnyFile(file);
      onClose();
    }
  };

  const handleCloudClick = () => {
    onClose();
    if (!isTauri()) {
      setIsCloudDesktopNoticeOpen(true);
      return;
    }
    if (onOpenCloud) {
      onOpenCloud();
    }
  };

  return (
    <div className="modal-overlay intro-modal-overlay" onClick={onClose}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".chronicle,.epub,.epubstudio,.eproj"
        style={{ display: 'none' }}
      />

      <div
        className="modal-card intro-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-modal-title"
      >
        {/* Close Button */}
        <button
          className="btn-icon btn-sm intro-modal-close"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        {/* Hero Header */}
        <div className="intro-modal-hero">
          <div className="intro-hero-ambient-glow" />
          <div className="intro-hero-badge">
            <ChronicleLogo size={52} mode="vector" glow />
          </div>
          <div className="intro-hero-content">
            <h1 id="intro-modal-title" className="intro-title">
              Welcome to <span className="intro-title-gradient">Chronicle</span>
            </h1>
            <p className="intro-subtitle">
              The unified authoring, worldbuilding, and multi-format book publishing suite designed for novelists and storytellers.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="intro-tabs-bar">
          <button
            className={`intro-tab-btn ${activeTab === 'quickstart' ? 'active' : ''}`}
            onClick={() => setActiveTab('quickstart')}
          >
            <Rocket size={15} />
            <span>Quick Start</span>
          </button>
          <button
            className={`intro-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <Compass size={15} />
            <span>Suite Features</span>
          </button>
          <button
            className={`intro-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={15} />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="intro-modal-body">
          {/* TAB 1: QUICK START */}
          {activeTab === 'quickstart' && (
            <div className="intro-quickstart-grid">
              {/* Card 1: Start Blank Book */}
              <div
                className="intro-action-card primary"
                onClick={handleCreateNew}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleCreateNew()}
              >
                <div className="intro-card-icon-bubble bubble-emerald">
                  <PlusCircle size={22} />
                </div>
                <div className="intro-card-text">
                  <h3>Start Blank Manuscript</h3>
                  <p>
                    Create a fresh novel with Chapter 1, typography rules, and table of contents ready for writing.
                  </p>
                </div>
                <div className="intro-card-action">
                  <span>Create New</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Card 2: Explore Sample Book */}
              <div
                className="intro-action-card accent"
                onClick={handleLoadSample}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleLoadSample()}
              >
                <div className="intro-card-icon-bubble bubble-purple">
                  <Sparkles size={22} />
                </div>
                <div className="intro-card-text">
                  <h3>Explore Alice in Wonderland</h3>
                  <p>
                    Tour the interactive narrative timeline, character profiles, location codex, and custom styles.
                  </p>
                </div>
                <div className="intro-card-action">
                  <span>Load Sample</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Card 3: Open Project or EPUB */}
              <div
                className="intro-action-card tertiary"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <div className="intro-card-icon-bubble bubble-cyan">
                  <FolderOpen size={22} />
                </div>
                <div className="intro-card-text">
                  <h3>Open Local Manuscript</h3>
                  <p>
                    Browse any <kbd>.chronicle</kbd> project archive, <kbd>.epub</kbd> book, or manuscript file from your drive.
                  </p>
                </div>
                <div className="intro-card-action">
                  <span>Browse (Ctrl+O)</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Card 4: WebDAV Cloud Storage */}
              <div
                className="intro-action-card quaternary"
                onClick={handleCloudClick}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleCloudClick()}
              >
                <div className="intro-card-icon-bubble bubble-blue">
                  <Cloud size={22} />
                </div>
                <div className="intro-card-text">
                  <h3>Connect Cloud Storage</h3>
                  <p>
                    Sync with Nextcloud, ownCloud, Synology, or WebDAV servers with seamless auto-save and zero CORS limits.
                  </p>
                </div>
                <div className="intro-card-action">
                  <span>Cloud Hub</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUITE FEATURES */}
          {activeTab === 'features' && (
            <div className="intro-features-grid">
              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-emerald">
                    <Edit3 size={18} />
                  </div>
                  <h4>Focus Writing & Typography</h4>
                </div>
                <p>
                  Distraction-free WYSIWYG editor with live paragraph alignment (<kbd>Ctrl+L/E/R/J</kbd>), smart em-dashes, and chapter splitting.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-purple">
                    <Clock size={18} />
                  </div>
                  <h4>Narrative Timeline Studio</h4>
                </div>
                <p>
                  Multi-track story chronology with 24-hour & multi-day timescales, drag-to-resize blocks, and automatic lane collision stacking.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-cyan">
                    <Users size={18} />
                  </div>
                  <h4>Character Arc Sheets</h4>
                </div>
                <p>
                  Flesh out motivations, fatal flaws, character arcs, physical traits, secrets, and scene connections across your story.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-amber">
                    <MapPin size={18} />
                  </div>
                  <h4>Locations & Setting Codex</h4>
                </div>
                <p>
                  Immersive worldbuilding sensory palettes (sights, sounds, smells, climate), points of interest checklist, and lore rules.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-blue">
                    <Volume2 size={18} />
                  </div>
                  <h4>Neural AI Voice Audition</h4>
                </div>
                <p>
                  Audition chapters with local Kokoro & Qwen neural speech synthesis, featuring instant real-time volume and pace controls.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-rose">
                    <Printer size={18} />
                  </div>
                  <h4>Publication & Export Center</h4>
                </div>
                <p>
                  Export print-ready 300+ DPI vector PDFs (KDP Trade Paperbacks), official Shunn submission manuscripts, EPUB3, and Word DOCX.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="intro-shortcuts-wrapper">
              <div className="intro-shortcuts-section">
                <h4>Writing & Formatting</h4>
                <div className="intro-shortcut-row">
                  <span>Align Left / Center / Right / Justify</span>
                  <div className="intro-kbd-group">
                    <kbd>Ctrl+L</kbd>
                    <kbd>Ctrl+E</kbd>
                    <kbd>Ctrl+R</kbd>
                    <kbd>Ctrl+J</kbd>
                  </div>
                </div>
                <div className="intro-shortcut-row">
                  <span>Bold / Italic / Underline</span>
                  <div className="intro-kbd-group">
                    <kbd>Ctrl+B</kbd>
                    <kbd>Ctrl+I</kbd>
                    <kbd>Ctrl+U</kbd>
                  </div>
                </div>
              </div>

              <div className="intro-shortcuts-section">
                <h4>Project & Navigation</h4>
                <div className="intro-shortcut-row">
                  <span>Save Manuscript (Local / Cloud)</span>
                  <kbd>Ctrl+S</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>Open Chronicle or EPUB</span>
                  <kbd>Ctrl+O</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>Toggle Chapter Sidebar</span>
                  <kbd>Ctrl+\</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>Dismiss Any Modal / Dialog</span>
                  <kbd>Esc</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="intro-modal-footer">
          <label className="intro-startup-toggle">
            <input
              type="checkbox"
              checked={showOnStartup}
              onChange={e => handleStartupToggle(e.target.checked)}
            />
            <span className="intro-checkbox-custom">
              {showOnStartup && <Check size={12} strokeWidth={3} />}
            </span>
            <span className="intro-toggle-label">Show this welcome guide on startup</span>
          </label>

          <div className="intro-footer-actions">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Dismiss
            </button>
            <button className="btn btn-primary intro-start-btn" onClick={onClose}>
              <Sparkles size={15} />
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
