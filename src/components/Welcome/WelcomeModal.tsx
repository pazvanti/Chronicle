import React, { useState, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ChronicleLogo } from '../Common/ChronicleLogo';
import { isTauri } from '../../services/cloud/webdavClient';
import { useTranslation } from '../../i18n/I18nContext';
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
    openLocalDocument,
    loadSampleBook,
    createNewBook,
    setIsCloudDesktopNoticeOpen,
    showWelcomeOnStartup,
    setShowWelcomeOnStartup,
  } = useEpub();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('quickstart');

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleStartupToggle = (checked: boolean) => {
    setShowWelcomeOnStartup(checked);
  };

  const handleCreateNew = () => {
    createNewBook();
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

  const handleOpenClick = () => {
    onClose();
    if (isTauri()) {
      openLocalDocument();
    } else {
      fileInputRef.current?.click();
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
        accept=".chronicle,.epub,.md,.markdown,.mdown,.mkd"
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
              {t('welcomeModal.title')}
            </h1>
            <p className="intro-subtitle">
              {t('welcomeModal.subtitle')}
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
            <span>{t('welcomeModal.tabQuickStart')}</span>
          </button>
          <button
            className={`intro-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <Compass size={15} />
            <span>{t('welcomeModal.tabFeatures')}</span>
          </button>
          <button
            className={`intro-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={15} />
            <span>{t('welcomeModal.tabShortcuts')}</span>
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
                  <h3>{t('welcomeModal.blankTitle')}</h3>
                  <p>{t('welcomeModal.blankDesc')}</p>
                </div>
                <div className="intro-card-action">
                  <span>{t('welcomeModal.blankAction')}</span>
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
                  <h3>{t('welcomeModal.sampleTitle')}</h3>
                  <p>{t('welcomeModal.sampleDesc')}</p>
                </div>
                <div className="intro-card-action">
                  <span>{t('welcomeModal.sampleAction')}</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Card 3: Open Project or EPUB */}
              <div
                className="intro-action-card tertiary"
                onClick={handleOpenClick}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleOpenClick()}
              >
                <div className="intro-card-icon-bubble bubble-cyan">
                  <FolderOpen size={22} />
                </div>
                <div className="intro-card-text">
                  <h3>{t('welcomeModal.openFileTitle')}</h3>
                  <p>{t('welcomeModal.openFileDesc')}</p>
                </div>
                <div className="intro-card-action">
                  <span>{t('welcomeModal.openFileAction')}</span>
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
                  <h3>{t('welcomeModal.cloudTitle')}</h3>
                  <p>{t('welcomeModal.cloudDesc')}</p>
                </div>
                <div className="intro-card-action">
                  <span>{t('welcomeModal.cloudAction')}</span>
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
                  <h4>{t('welcomeModal.featWritingTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featWritingDesc')}</p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-purple">
                    <Clock size={18} />
                  </div>
                  <h4>{t('welcomeModal.featTimelineTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featTimelineDesc')}</p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-cyan">
                    <Users size={18} />
                  </div>
                  <h4>{t('welcomeModal.featCharactersTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featCharactersDesc')}</p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-amber">
                    <MapPin size={18} />
                  </div>
                  <h4>{t('welcomeModal.featLocationsTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featLocationsDesc')}</p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-blue">
                    <Volume2 size={18} />
                  </div>
                  <h4>{t('welcomeModal.featVoiceTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featVoiceDesc')}</p>
              </div>

              <div className="intro-feature-card">
                <div className="intro-feat-header">
                  <div className="intro-feat-icon bubble-rose">
                    <Printer size={18} />
                  </div>
                  <h4>{t('welcomeModal.featExportTitle')}</h4>
                </div>
                <p>{t('welcomeModal.featExportDesc')}</p>
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="intro-shortcuts-wrapper">
              <div className="intro-shortcuts-section">
                <h4>{t('welcomeModal.shortWritingSection')}</h4>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortAlign')}</span>
                  <div className="intro-kbd-group">
                    <kbd>Ctrl+L</kbd>
                    <kbd>Ctrl+E</kbd>
                    <kbd>Ctrl+R</kbd>
                    <kbd>Ctrl+J</kbd>
                  </div>
                </div>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortStyle')}</span>
                  <div className="intro-kbd-group">
                    <kbd>Ctrl+B</kbd>
                    <kbd>Ctrl+I</kbd>
                    <kbd>Ctrl+U</kbd>
                  </div>
                </div>
              </div>

              <div className="intro-shortcuts-section">
                <h4>{t('welcomeModal.shortNavSection')}</h4>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortSave')}</span>
                  <kbd>Ctrl+S</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortOpen')}</span>
                  <kbd>Ctrl+O</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortSidebar')}</span>
                  <kbd>Ctrl+\</kbd>
                </div>
                <div className="intro-shortcut-row">
                  <span>{t('welcomeModal.shortDismiss')}</span>
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
              checked={showWelcomeOnStartup}
              onChange={e => handleStartupToggle(e.target.checked)}
            />
            <span className="intro-checkbox-custom">
              {showWelcomeOnStartup && <Check size={12} strokeWidth={3} />}
            </span>
            <span className="intro-toggle-label">{t('welcomeModal.showOnStartup')}</span>
          </label>

          <div className="intro-footer-actions">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              {t('welcomeModal.dismiss')}
            </button>
            <button className="btn btn-primary intro-start-btn" onClick={onClose}>
              <Sparkles size={15} />
              <span>{t('welcomeModal.getStarted')}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
