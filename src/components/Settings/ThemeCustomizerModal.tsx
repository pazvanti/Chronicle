import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Wand2,
  Download,
  Eye,
  Check,
  Moon,
  Sun,
  Folder,
} from 'lucide-react';
import { useEpub } from '../../context/EpubContext';
import { useI18n } from '../../i18n/I18nContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  StarterThemeId,
  CustomTheme,
  CustomThemePalette,
  UI_THEMES,
} from '../../types/theme';
import {
  STARTER_THEMES,
  STARTER_DEFAULT_PALETTES,
  INSPIRATIONAL_THEME_SEEDS,
  harmonizePalette,
  injectCustomTheme,
  clearCustomTheme,
  exportCustomThemeToJson,
  adjustHexBrightness,
  rgba,
  deriveAccentSecondary,
} from '../../services/theme/customThemeService';

interface ThemeCustomizerModalProps {
  initialStarterId?: StarterThemeId;
  editingTheme?: CustomTheme | null;
  onClose: () => void;
}

const POETIC_THEME_NAMES = [
  'Emerald Sanctuary',
  'Crimson Velvet',
  'Cyberpunk Neon',
  'Amber Sanctum',
  'Rose Gold Manuscript',
  'Nordic Slate',
  'Amethyst Twilight',
  'Solaris Gold',
  'Obsidian Frost',
  'Dracula Wine',
  'Moonlit Alabaster',
  'Midnight Tide',
  'Velvet Forest',
  'Elysian Azure',
  'Terra Cotta',
];

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  initialStarterId = 'modernx-dark',
  editingTheme = null,
  onClose,
}) => {
  const { uiTheme, customThemes, saveCustomTheme, applyCustomTheme } = useEpub();
  const { t } = useI18n();

  useEscapeKey(() => handleCancel());

  // Editing state
  const isEditing = Boolean(editingTheme);
  const [themeId] = useState<string>(() => editingTheme?.id || `custom-${Date.now()}`);
  const [name, setName] = useState<string>(() => editingTheme?.name || 'My Custom Theme');
  const [starterId, setStarterId] = useState<StarterThemeId>(
    () => editingTheme?.starterId || initialStarterId
  );
  const [palette, setPalette] = useState<CustomThemePalette>(() => {
    if (editingTheme?.palette) {
      return { ...STARTER_DEFAULT_PALETTES[editingTheme.starterId], ...editingTheme.palette };
    }
    return { ...STARTER_DEFAULT_PALETTES[initialStarterId] };
  });

  // Live in-app preview toggle
  const [isPreviewLive, setIsPreviewLive] = useState<boolean>(false);
  const originalThemeRef = useRef(uiTheme);

  // Construct draft theme object
  const currentDraftTheme: CustomTheme = {
    id: themeId,
    name: name.trim() || 'Untitled Theme',
    starterId,
    palette,
    createdAt: editingTheme?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Sync live in-app preview when toggle is active or palette/starter changes
  useEffect(() => {
    if (isPreviewLive) {
      injectCustomTheme(currentDraftTheme);
    }
  }, [isPreviewLive, starterId, palette]);

  // Cleanup on unmount or cancellation
  const handleCancel = () => {
    if (isPreviewLive) {
      const activeCustom = customThemes.find(t => t.id === originalThemeRef.current);
      if (activeCustom) {
        injectCustomTheme(activeCustom);
      } else {
        clearCustomTheme();
        const starter = STARTER_THEMES.includes(originalThemeRef.current as StarterThemeId)
          ? (originalThemeRef.current as StarterThemeId)
          : 'classic-dark';
        document.documentElement.setAttribute('data-theme', starter);
      }
    }
    onClose();
  };

  // Switch starter archetype: preserve custom accent if set, but blend default backgrounds
  const handleStarterChange = (newStarterId: StarterThemeId) => {
    setStarterId(newStarterId);
    const newDefaults = STARTER_DEFAULT_PALETTES[newStarterId];
    setPalette(prev =>
      harmonizePalette(newStarterId, prev.accentPrimary || newDefaults.accentPrimary, {
        ...newDefaults,
        accentPrimary: prev.accentPrimary || newDefaults.accentPrimary,
      })
    );
  };

  // Apply inspiration seed
  const handleApplySeed = (seed: typeof INSPIRATIONAL_THEME_SEEDS[0]) => {
    setName(seed.name);
    setStarterId(seed.starterId);
    const defaults = STARTER_DEFAULT_PALETTES[seed.starterId];
    const harmonized = harmonizePalette(seed.starterId, seed.accent, {
      ...defaults,
      accentPrimary: seed.accent,
      bgApp: seed.bgApp || defaults.bgApp,
      bgSidebar: seed.bgSidebar || defaults.bgSidebar,
    });
    setPalette(harmonized);
  };

  // Auto-harmonize palette with smart calculations
  const handleAutoHarmonize = () => {
    const harmonized = harmonizePalette(starterId, palette.accentPrimary, palette);
    setPalette(harmonized);
  };

  // Randomize theme name
  const handleRandomizeName = () => {
    const unusedNames = POETIC_THEME_NAMES.filter(n => n !== name);
    const pick = unusedNames[Math.floor(Math.random() * unusedNames.length)];
    setName(pick);
  };

  // Update specific palette property
  const handleColorChange = (key: keyof CustomThemePalette, value: string) => {
    setPalette(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'accentPrimary') {
        const isDark = starterId.includes('dark');
        next.accentPrimaryHover = isDark
          ? adjustHexBrightness(value, 18)
          : adjustHexBrightness(value, -15);
        next.accentPrimaryGlow = rgba(value, isDark ? 0.30 : 0.22);
        next.accentSecondary = deriveAccentSecondary(starterId, value);
        next.borderSubtle = rgba(value, isDark ? 0.14 : 0.10);
        next.borderMedium = rgba(value, isDark ? 0.30 : 0.24);
      }
      return next;
    });
  };

  // Save actions
  const handleSave = (andApply: boolean = false) => {
    if (andApply) {
      applyCustomTheme(currentDraftTheme);
    } else {
      saveCustomTheme(currentDraftTheme);
    }
    onClose();
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportCustomThemeToJson(currentDraftTheme);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDraftTheme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={handleCancel} style={{ zIndex: 120 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '80vw',
          height: '80vh',
          maxWidth: '80vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border-medium)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${palette.accentPrimary}, ${palette.accentPrimaryHover || palette.accentPrimary})`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${palette.accentPrimaryGlow || 'rgba(0,0,0,0.2)'}`,
              }}
            >
              <Palette size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isEditing ? t('settings.editThemeBtn') : t('settings.themeStudioTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {t('settings.themeStudioDesc')}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="btn-ghost"
            style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split 2 Columns */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(420px, 1.15fr) minmax(360px, 1fr)',
            overflow: 'hidden',
          }}
        >
          {/* Left Column: Form Controls */}
          <div
            style={{
              padding: '1.5rem 1.75rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.4rem',
              borderRight: '1px solid var(--border-subtle)',
            }}
          >
            {/* Theme Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                {t('settings.themeNameLabel')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Emerald Sanctuary"
                  style={{ flex: 1, fontWeight: 600 }}
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  className="btn btn-secondary"
                  title="Randomize creative name"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0 12px' }}
                >
                  <Wand2 size={14} />
                </button>
              </div>
            </div>

            {/* Starter Archetype Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {t('settings.starterArchetypeLabel')}
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {STARTER_THEMES.map(id => {
                  const isSelected = starterId === id;
                  const starterOpt = UI_THEMES.find(t => t.id === id);
                  const isDark = id.includes('dark');

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleStarterChange(id)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '9px',
                        border: isSelected
                          ? `2px solid ${palette.accentPrimary}`
                          : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {isDark ? <Moon size={13} color={palette.accentPrimary} /> : <Sun size={13} color={palette.accentPrimary} />}
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {starterOpt?.name.replace(' - ', ' ') || id}
                          </span>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: palette.accentPrimary,
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                        {id.startsWith('classic') ? 'Tactile Literary' : id.startsWith('glass') ? 'Frosted Blur' : 'Clean Obsidian'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Inspiration Seeds */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {t('settings.quickSeedsLabel')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {INSPIRATIONAL_THEME_SEEDS.map(seed => (
                  <button
                    key={seed.name}
                    type="button"
                    onClick={() => handleApplySeed(seed)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = seed.accent)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: seed.accent,
                        boxShadow: `0 0 6px ${seed.accent}`,
                      }}
                    />
                    {seed.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Palette Color Pickers */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Color Customization
                </span>
                <button
                  type="button"
                  onClick={handleAutoHarmonize}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} />
                  {t('settings.autoHarmonizeBtn')}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {/* Primary Accent */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.accentColorLabel')} (Brand & Focus)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.accentPrimary}
                      onChange={e => handleColorChange('accentPrimary', e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.accentPrimary}
                      onChange={e => handleColorChange('accentPrimary', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Workspace Background */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.appBackgroundLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.bgApp.startsWith('#') ? palette.bgApp : '#09090b'}
                      onChange={e => handleColorChange('bgApp', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.bgApp}
                      onChange={e => handleColorChange('bgApp', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Sidebar Background */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.sidebarBackgroundLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.bgSidebar.startsWith('#') ? palette.bgSidebar : '#0f0f12'}
                      onChange={e => handleColorChange('bgSidebar', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.bgSidebar}
                      onChange={e => handleColorChange('bgSidebar', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Card Surface */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.surfaceBackgroundLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.bgSurface.startsWith('#') ? palette.bgSurface : '#141418'}
                      onChange={e => handleColorChange('bgSurface', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.bgSurface}
                      onChange={e => handleColorChange('bgSurface', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Elevated Surface */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.elevatedBackgroundLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.bgSurfaceElevated.startsWith('#') ? palette.bgSurfaceElevated : '#1a1a22'}
                      onChange={e => handleColorChange('bgSurfaceElevated', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.bgSurfaceElevated}
                      onChange={e => handleColorChange('bgSurfaceElevated', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Text Primary */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.textPrimaryLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.textPrimary.startsWith('#') ? palette.textPrimary : '#f4f4f6'}
                      onChange={e => handleColorChange('textPrimary', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.textPrimary}
                      onChange={e => handleColorChange('textPrimary', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Text Secondary */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                    {t('settings.textSecondaryLabel')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={palette.textSecondary.startsWith('#') ? palette.textSecondary : '#a1a1aa'}
                      onChange={e => handleColorChange('textSecondary', e.target.value)}
                      style={{ width: 32, height: 32, border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={palette.textSecondary}
                      onChange={e => handleColorChange('textSecondary', e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Miniature Mockup Canvas */}
          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: 'var(--bg-app)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Mockup Preview
              </span>

              {/* Preview Live in App Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: isPreviewLive ? palette.accentPrimary : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isPreviewLive}
                  onChange={e => setIsPreviewLive(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <Eye size={13} />
                {t('settings.previewLiveToggle')}
              </label>
            </div>

            {/* The Scaled Miniature App Window */}
            <div
              style={{
                flex: 1,
                minHeight: '340px',
                borderRadius: starterId.startsWith('classic') ? '6px' : '12px',
                backgroundColor: palette.bgApp,
                border: `1px solid ${palette.borderMedium || 'rgba(255,255,255,0.1)'}`,
                boxShadow: starterId.includes('glass')
                  ? `0 12px 36px rgba(0,0,0,0.5), 0 0 20px ${palette.accentPrimaryGlow || 'transparent'}`
                  : '0 8px 24px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Mini App Header */}
              <div
                style={{
                  height: '38px',
                  backgroundColor: palette.bgSidebar,
                  borderBottom: `1px solid ${palette.borderSubtle || 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                }}
              >
                {/* Brand Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: starterId.startsWith('classic') ? '3px' : '6px',
                      backgroundColor: palette.accentPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 900,
                    }}
                  >
                    C
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: palette.textPrimary }}>
                    Chronicle
                  </span>
                </div>

                {/* View Pills */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div
                    style={{
                      padding: '2px 8px',
                      borderRadius: starterId.startsWith('classic') ? '3px' : '9999px',
                      backgroundColor: palette.accentPrimary,
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  >
                    Editor
                  </div>
                  <div
                    style={{
                      padding: '2px 8px',
                      borderRadius: starterId.startsWith('classic') ? '3px' : '9999px',
                      backgroundColor: 'transparent',
                      color: palette.textSecondary,
                      fontSize: '0.65rem',
                    }}
                  >
                    Reader
                  </div>
                </div>
              </div>

              {/* Mini Workspace Body */}
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Mini Sidebar */}
                <div
                  style={{
                    width: '130px',
                    backgroundColor: palette.bgSidebar,
                    borderRight: `1px solid ${palette.borderSubtle || 'rgba(255,255,255,0.08)'}`,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <div
                    style={{
                      height: '18px',
                      borderRadius: '4px',
                      backgroundColor: palette.bgSurface,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      fontSize: '0.62rem',
                      color: palette.textSecondary,
                    }}
                  >
                    Search...
                  </div>

                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div
                      style={{
                        padding: '4px 6px',
                        borderRadius: starterId.startsWith('classic') ? '3px' : '6px',
                        backgroundColor: palette.bgSurfaceElevated,
                        borderLeft: `3px solid ${palette.accentPrimary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: palette.textPrimary }}>
                        Chapter 1
                      </span>
                      <span style={{ fontSize: '0.58rem', color: palette.accentPrimary, fontWeight: 700 }}>
                        Active
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '4px 6px',
                        borderRadius: starterId.startsWith('classic') ? '3px' : '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', color: palette.textSecondary }}>
                        Chapter 2
                      </span>
                      <span style={{ fontSize: '0.58rem', color: palette.textSecondary }}>
                        1.2k
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '4px 6px',
                        borderRadius: starterId.startsWith('classic') ? '3px' : '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: palette.textSecondary,
                        fontSize: '0.65rem',
                      }}
                    >
                      <Folder size={11} color={palette.accentPrimary} />
                      <span>Act II: The Descent</span>
                    </div>
                  </div>
                </div>

                {/* Mini Writing Canvas */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: palette.bgApp,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                  }}
                >
                  {/* Floating Mini Card / Sheet */}
                  <div
                    style={{
                      flex: 1,
                      borderRadius: starterId.startsWith('classic') ? '4px' : '8px',
                      backgroundColor: palette.bgSurface,
                      border: `1px solid ${palette.borderSubtle || 'rgba(255,255,255,0.08)'}`,
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: palette.textPrimary }}>
                        The Observatory Sanctuary
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          color: palette.accentPrimary,
                          backgroundColor: rgba(palette.accentPrimary, 0.12),
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        Draft
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                      <div style={{ width: '95%', height: 4, borderRadius: 2, backgroundColor: palette.textPrimary, opacity: 0.85 }} />
                      <div style={{ width: '90%', height: 4, borderRadius: 2, backgroundColor: palette.textSecondary, opacity: 0.65 }} />
                      <div style={{ width: '85%', height: 4, borderRadius: 2, backgroundColor: palette.textSecondary, opacity: 0.65 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        <div style={{ width: '55%', height: 4, borderRadius: 2, backgroundColor: palette.textSecondary, opacity: 0.65 }} />
                        {/* Cursor */}
                        <div
                          style={{
                            width: 2,
                            height: 10,
                            backgroundColor: palette.accentPrimary,
                            borderRadius: 1,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Status Bar */}
              <div
                style={{
                  height: '22px',
                  backgroundColor: palette.bgSidebar,
                  borderTop: `1px solid ${palette.borderSubtle || 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  fontSize: '0.62rem',
                  color: palette.textSecondary,
                }}
              >
                <span>3,420 words total</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: palette.accentPrimary }} />
                  {starterId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={handleExportJson}
            className="btn btn-secondary"
          >
            <Download size={14} />
            <span>{t('settings.exportThemeBtn')}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="btn btn-secondary"
            >
              {t('settings.saveThemeBtn')}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="btn btn-primary"
            >
              <Check size={14} />
              <span>{t('settings.saveAndApplyBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
