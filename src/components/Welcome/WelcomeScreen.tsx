import React, { useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
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
  const { loadAnyFile, loadSampleBook, createNewBook } = useEpub();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        lower.endsWith('.epubstudio') ||
        lower.endsWith('.eproj')
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
        accept=".chronicle,.epub,.epubstudio,.eproj"
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
        <h1 className="welcome-title">Chronicle</h1>
        <p className="welcome-subtitle">
          The complete authoring, worldbuilding, and multi-format book publishing suite for writers
        </p>
      </div>

      {/* Primary Action Cards */}
      <div className="welcome-actions-grid">
        {/* Action 1: Create Blank Book */}
        <div
          className="welcome-card welcome-card-primary"
          onClick={() => createNewBook('My Novel', 'Author Name')}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon-bubble primary">
            <PlusCircle size={24} />
          </div>
          <div className="card-body">
            <h3>Start New Chronicle</h3>
            <p>Create a fresh manuscript with Chapter 1, typography styles, and TOC ready to write.</p>
          </div>
          <div className="card-action-hint">
            <span>New Chronicle</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Action 2: Open Chronicle or EPUB */}
        <div
          className="welcome-card welcome-card-secondary"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="card-icon-bubble accent">
            <Upload size={24} />
          </div>
          <div className="card-body">
            <h3>Open Chronicle or EPUB</h3>
            <p>Drag and drop any .chronicle project or .epub book file here, or click to browse.</p>
          </div>
          <div className="card-action-hint">
            <span>Browse (Ctrl+O)</span>
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
            <h3>Explore Sample Book</h3>
            <p>Open <em>Alice's Adventures in Wonderland</em> with custom styles, cover art, and chapters.</p>
          </div>
          <div className="card-action-hint">
            <span>Load Demo</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Quick Feature Highlights & Keyboard Shortcuts */}
      <div className="welcome-footer-features">
        <div className="feature-item">
          <FileText size={15} color="var(--accent-primary)" />
          <span>WYSIWYG & XHTML split-chapter editing</span>
        </div>
        <div className="feature-item">
          <Palette size={15} color="#c084fc" />
          <span>Cover Studio & Typographic CSS presets</span>
        </div>
        <div className="feature-item">
          <Keyboard size={15} color="#34d399" />
          <span>Keyboard shortcuts: Ctrl+S Save • Ctrl+O Open • Ctrl+\ Sidebar</span>
        </div>
      </div>
    </div>
  );
};
