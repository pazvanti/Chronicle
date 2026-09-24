import React, { useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { isTauri } from '../../services/cloud/webdavClient';
import { useTranslation } from '../../i18n/I18nContext';
import { ChronicleLogo } from '../Common/ChronicleLogo';
import {
  PlusCircle,
  Upload,
  Sparkles,
  Keyboard,
  FileText,
  Palette,
  ArrowRight,
} from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const { loadAnyFile, openLocalDocument, loadSampleBook, createNewBook } = useEpub();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = () => {
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
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
        loadAnyFile(file);
      }
    }
  };

  return (
    <div
      className="welcome-screen-container"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".chronicle,.epub,.md,.markdown,.mdown,.mkd"
        style={{ display: 'none' }}
      />

      <div className="welcome-hero">
        <div
          className="welcome-logo-badge"
          style={{
            padding: '0',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChronicleLogo size={68} mode="raster" glow />
        </div>
        <h1 className="welcome-title">{t('welcome.title')}</h1>
        <p className="welcome-subtitle">
          {t('welcome.subtitle')}
        </p>
      </div>

      {/* Primary Action Cards */}
      <div className="welcome-actions-grid">
        {/* Action 1: Create Blank Book */}
        <div
          className="welcome-card welcome-card-primary"
          onClick={() => createNewBook()}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon-bubble primary">
            <PlusCircle size={24} />
          </div>
          <div className="card-body">
            <h3>{t('welcome.startNewTitle')}</h3>
            <p>{t('welcome.startNewDesc')}</p>
          </div>
          <div className="card-action-hint">
            <span>{t('welcome.startNewAction')}</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Action 2: Open Chronicle, EPUB, or Markdown */}
        <div
          className="welcome-card welcome-card-secondary"
          onClick={handleOpenClick}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon-bubble accent">
            <Upload size={24} />
          </div>
          <div className="card-body">
            <h3>{t('welcome.openTitle')}</h3>
            <p>{t('welcome.openDesc')}</p>
          </div>
          <div className="card-action-hint">
            <span>{t('welcome.openAction')}</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Action 3: Load Sample Book */}
        <div
          className="welcome-card welcome-card-tertiary"
          onClick={() => loadSampleBook()}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon-bubble sample">
            <Sparkles size={24} />
          </div>
          <div className="card-body">
            <h3>{t('welcome.sampleTitle')}</h3>
            <p>{t('welcome.sampleDesc')}</p>
          </div>
          <div className="card-action-hint">
            <span>{t('welcome.sampleAction')}</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Quick Feature Highlights & Keyboard Shortcuts */}
      <div className="welcome-footer-features">
        <div className="feature-item">
          <FileText size={15} color="var(--accent-primary)" />
          <span>{t('welcome.featureSplit')}</span>
        </div>
        <div className="feature-item">
          <Palette size={15} color="#c084fc" />
          <span>{t('welcome.featureCover')}</span>
        </div>
        <div className="feature-item">
          <Keyboard size={15} color="#34d399" />
          <span>{t('welcome.featureShortcuts')}</span>
        </div>
      </div>
    </div>
  );
};
