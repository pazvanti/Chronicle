import React, { useState, useEffect } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Palette, Check, Code, Sliders } from 'lucide-react';
import { CSS_PRESETS, StylePreset } from '../../services/epub/cssPresets';

export const StyleStudio: React.FC = () => {
  const { book, customCss, applyCustomCssToBook } = useEpub();

  const [activeTab, setActiveTab] = useState<'presets' | 'customizer' | 'css'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('classic-literature');
  const [currentCss, setCurrentCss] = useState<string>(customCss || CSS_PRESETS[0].css);

  // Quick Customizer State
  const [fontChoice, setFontChoice] = useState<string>('serif');
  const [paragraphStyle, setParagraphStyle] = useState<'indent' | 'block'>('indent');
  const [textAlign, setTextAlign] = useState<'justify' | 'left'>('justify');
  const [lineHeight, setLineHeight] = useState<number>(1.75);
  const [enableDropCaps, setEnableDropCaps] = useState<boolean>(true);

  useEffect(() => {
    if (customCss) {
      setCurrentCss(customCss);
    }
  }, [customCss]);

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  const handleSelectPreset = (preset: StylePreset) => {
    setSelectedPresetId(preset.id);
    setCurrentCss(preset.css);
    applyCustomCssToBook(preset.css);
  };

  const handleGenerateCustomizerCss = () => {
    const fontVal =
      fontChoice === 'serif'
        ? "'Merriweather', 'Georgia', serif"
        : fontChoice === 'sans'
        ? "'Inter', -apple-system, sans-serif"
        : fontChoice === 'book'
        ? "'Literata', 'Georgia', serif"
        : "'Fira Code', monospace";

    const customCssGenerated = `/* Custom Styled EPUB Stylesheet */
body {
  font-family: ${fontVal};
  line-height: ${lineHeight};
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 44rem;
  text-align: ${textAlign};
}

h1, h2, h3 {
  font-family: 'Outfit', sans-serif;
  color: #111827;
}

h1 {
  font-size: 2.2rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.4rem;
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
}

p {
  margin: ${paragraphStyle === 'block' ? '1.1rem 0' : '0'};
  ${paragraphStyle === 'indent' ? 'text-indent: 1.5em;' : ''}
}

${paragraphStyle === 'indent' ? 'h1 + p, h2 + p, h3 + p, hr + p { text-indent: 0; }' : ''}

${
  enableDropCaps
    ? `p.dropcap:first-letter, .dropcap::first-letter {
  float: left;
  font-size: 3.2rem;
  line-height: 0.8;
  padding: 4px 8px 2px 0;
  font-weight: bold;
  color: #4338ca;
}`
    : ''
}

blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 1.2rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #4b5563;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.8rem auto;
  border-radius: 4px;
}
`;
    setCurrentCss(customCssGenerated);
    applyCustomCssToBook(customCssGenerated);
  };

  const handleSaveCssToBook = () => {
    applyCustomCssToBook(currentCss);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            CSS & Style Studio
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Design typography presets, paragraph formatting, and manage the EPUB stylesheet
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="view-tabs" style={{ background: 'var(--bg-surface)' }}>
            <button
              className={`view-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Palette size={14} />
              <span>Presets</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'customizer' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('customizer');
                handleGenerateCustomizerCss();
              }}
            >
              <Sliders size={14} />
              <span>Customizer</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'css' ? 'active' : ''}`}
              onClick={() => setActiveTab('css')}
            >
              <Code size={14} />
              <span>Raw CSS</span>
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleSaveCssToBook}>
            <Check size={15} />
            <span>Apply to Book</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTab === 'presets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Choose a Publishing Preset:
              </div>

              {CSS_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {preset.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {preset.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'customizer' && (
            <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Font Choice */}
              <div className="form-group">
                <label className="form-label">Body Font Family</label>
                <select
                  className="form-select"
                  value={fontChoice}
                  onChange={e => {
                    setFontChoice(e.target.value);
                    setTimeout(handleGenerateCustomizerCss, 10);
                  }}
                >
                  <option value="serif">Merriweather (Classic Editorial Serif)</option>
                  <option value="book">Literata (Google Books Serif)</option>
                  <option value="sans">Inter (Modern Clean Sans)</option>
                  <option value="mono">Fira Mono (Code / Typewriter)</option>
                </select>
              </div>

              {/* Paragraph Style */}
              <div className="form-group">
                <label className="form-label">Paragraph Layout</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${paragraphStyle === 'indent' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setParagraphStyle('indent');
                      setTimeout(handleGenerateCustomizerCss, 10);
                    }}
                  >
                    Indented First Line (Novels)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${paragraphStyle === 'block' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setParagraphStyle('block');
                      setTimeout(handleGenerateCustomizerCss, 10);
                    }}
                  >
                    Block Paragraphs (Non-Fiction)
                  </button>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="form-group">
                <label className="form-label">Text Alignment</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${textAlign === 'justify' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setTextAlign('justify');
                      setTimeout(handleGenerateCustomizerCss, 10);
                    }}
                  >
                    Justified
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${textAlign === 'left' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setTextAlign('left');
                      setTimeout(handleGenerateCustomizerCss, 10);
                    }}
                  >
                    Left Aligned
                  </button>
                </div>
              </div>

              {/* Line Height */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Line Height</span>
                  <span>{lineHeight}</span>
                </label>
                <input
                  type="range"
                  min="1.4"
                  max="2.2"
                  step="0.05"
                  value={lineHeight}
                  onChange={e => {
                    setLineHeight(parseFloat(e.target.value));
                    setTimeout(handleGenerateCustomizerCss, 10);
                  }}
                  style={{ accentColor: 'var(--accent-primary)', width: '100%' }}
                />
              </div>

              {/* Drop Caps */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableDropCaps}
                  onChange={e => {
                    setEnableDropCaps(e.target.checked);
                    setTimeout(handleGenerateCustomizerCss, 10);
                  }}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Enable Chapter Initial Drop Caps</span>
              </label>
            </div>
          )}

          {activeTab === 'css' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '420px', background: '#090d16', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <textarea
                value={currentCss}
                onChange={e => setCurrentCss(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#93c5fd',
                  fontFamily: 'var(--font-reader-mono)',
                  fontSize: '0.85rem',
                  padding: '1rem',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>
          )}
        </div>

        {/* Right Panel: Live Styled Sample Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Live Typography Preview
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              height: '480px',
            }}
          >
            <iframe
              title="Style Preview"
              srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${currentCss}
  </style>
</head>
<body>
  <h1>Chapter One</h1>
  <h2>Into the Great Unknown</h2>
  <p class="dropcap">
    The crisp morning air carried a scent of pine and distant rain. In the quiet hours before dawn,
    the cobblestone streets were devoid of travelers, save for a solitary figure wrapped in a woolen mantle.
  </p>
  <p>
    He consulted the brass timepiece once more, noting the rhythmic swing of the pendulum.
    Every decision made that autumn would echo far beyond the boundaries of the forgotten valley.
  </p>
  <blockquote>
    "Some journeys begin with a single stride; others with a quiet realization."
  </blockquote>
  <p>
    By mid-afternoon, the sun had crested the granite peaks, illuminating the sprawling woodland below.
  </p>
</body>
</html>`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
