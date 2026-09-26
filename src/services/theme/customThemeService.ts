import { StarterThemeId, CustomTheme, CustomThemePalette, UiTheme } from '../../types/theme';

/**
 * The 6 foundational Starter Themes in Chronicle
 */
export const STARTER_THEMES: StarterThemeId[] = [
  'classic-dark',
  'classic-light',
  'modernx-dark',
  'modernx-light',
  'glass-dark',
  'glass-light',
];

/**
 * Canonical default palettes for each of the 6 starters
 */
export const STARTER_DEFAULT_PALETTES: Record<StarterThemeId, CustomThemePalette> = {
  'classic-dark': {
    accentPrimary: '#e6be75',
    accentPrimaryHover: '#fae19c',
    accentPrimaryGlow: 'rgba(230, 190, 117, 0.25)',
    accentSecondary: '#d89b45',
    bgApp: '#080a10',
    bgSidebar: '#0e101a',
    bgSurface: '#131625',
    bgSurfaceElevated: '#1a1e30',
    bgInput: '#0a0d16',
    textPrimary: '#f7f4ec',
    textSecondary: '#b4b6c9',
    textMuted: '#797c94',
    borderSubtle: 'rgba(230, 190, 117, 0.14)',
    borderMedium: 'rgba(230, 190, 117, 0.26)',
  },
  'classic-light': {
    accentPrimary: '#925b18',
    accentPrimaryHover: '#7a4b12',
    accentPrimaryGlow: 'rgba(146, 91, 24, 0.20)',
    accentSecondary: '#b45309',
    bgApp: '#f8f8f7',
    bgSidebar: '#f0f0ee',
    bgSurface: '#ffffff',
    bgSurfaceElevated: '#ffffff',
    bgInput: '#ffffff',
    textPrimary: '#18181b',
    textSecondary: '#52525b',
    textMuted: '#71717a',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderMedium: '#d1d1cd',
  },
  'modernx-dark': {
    accentPrimary: '#8b5cf6',
    accentPrimaryHover: '#7c3aed',
    accentPrimaryGlow: 'rgba(139, 92, 246, 0.25)',
    accentSecondary: '#c084fc',
    bgApp: '#09090b',
    bgSidebar: '#0f0f12',
    bgSurface: '#141418',
    bgSurfaceElevated: '#1a1a22',
    bgInput: '#121216',
    textPrimary: '#f4f4f6',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderMedium: 'rgba(255, 255, 255, 0.14)',
  },
  'modernx-light': {
    accentPrimary: '#7c3aed',
    accentPrimaryHover: '#6d28d9',
    accentPrimaryGlow: 'rgba(124, 58, 237, 0.22)',
    accentSecondary: '#a855f7',
    bgApp: '#f4f4f7',
    bgSidebar: '#e8e8ed',
    bgSurface: '#ffffff',
    bgSurfaceElevated: '#ffffff',
    bgInput: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderMedium: 'rgba(0, 0, 0, 0.14)',
  },
  'glass-dark': {
    accentPrimary: '#06b6d4',
    accentPrimaryHover: '#0891b2',
    accentPrimaryGlow: 'rgba(6, 182, 212, 0.35)',
    accentSecondary: '#38bdf8',
    bgApp: '#050811',
    bgSidebar: 'rgba(6, 12, 22, 0.50)',
    bgSurface: 'rgba(12, 22, 36, 0.48)',
    bgSurfaceElevated: 'rgba(16, 28, 46, 0.65)',
    bgInput: 'rgba(4, 9, 18, 0.55)',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    borderSubtle: 'rgba(255, 255, 255, 0.10)',
    borderMedium: 'rgba(56, 189, 248, 0.25)',
  },
  'glass-light': {
    accentPrimary: '#0284c7',
    accentPrimaryHover: '#0369a1',
    accentPrimaryGlow: 'rgba(2, 132, 199, 0.25)',
    accentSecondary: '#38bdf8',
    bgApp: '#f0f7ff',
    bgSidebar: 'rgba(240, 247, 255, 0.70)',
    bgSurface: 'rgba(255, 255, 255, 0.75)',
    bgSurfaceElevated: 'rgba(255, 255, 255, 0.88)',
    bgInput: 'rgba(255, 255, 255, 0.85)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    borderSubtle: 'rgba(14, 165, 233, 0.16)',
    borderMedium: 'rgba(14, 165, 233, 0.35)',
  },
};

/**
 * Creative seed inspirations to help authors jumpstart a theme
 */
export interface ThemeSeed {
  name: string;
  starterId: StarterThemeId;
  accent: string;
  bgApp?: string;
  bgSidebar?: string;
  description: string;
}

export const INSPIRATIONAL_THEME_SEEDS: ThemeSeed[] = [
  {
    name: 'Emerald Sanctuary',
    starterId: 'glass-dark',
    accent: '#10b981',
    bgApp: '#04120e',
    bgSidebar: 'rgba(5, 22, 16, 0.55)',
    description: 'Deep rainforest foliage with luminous emerald edge glow.',
  },
  {
    name: 'Crimson Velvet',
    starterId: 'classic-dark',
    accent: '#f43f5e',
    bgApp: '#14080d',
    bgSidebar: '#1a0b12',
    description: 'Literary burgundy and dark velvet wine with ruby highlights.',
  },
  {
    name: 'Cyberpunk Neon',
    starterId: 'modernx-dark',
    accent: '#00f0ff',
    bgApp: '#030508',
    bgSidebar: '#070a12',
    description: 'Pitch obsidian with high-voltage cyan glow and razor contrast.',
  },
  {
    name: 'Amber Autumn',
    starterId: 'classic-dark',
    accent: '#f59e0b',
    bgApp: '#120d06',
    bgSidebar: '#1a1309',
    description: 'Roasted walnut wood and harvest gold candlelight.',
  },
  {
    name: 'Rose Gold Manuscript',
    starterId: 'classic-light',
    accent: '#e11d48',
    bgApp: '#faf5f5',
    bgSidebar: '#f3ecec',
    description: 'Warm ivory parchment accented with delicate rose gold ink.',
  },
  {
    name: 'Nordic Arctic Slate',
    starterId: 'modernx-light',
    accent: '#0284c7',
    bgApp: '#f0f5fa',
    bgSidebar: '#e4ecf5',
    description: 'Glacial crisp slate and cool iceberg blue highlights.',
  },
  {
    name: 'Amethyst Twilight',
    starterId: 'glass-dark',
    accent: '#a855f7',
    bgApp: '#0c0716',
    bgSidebar: 'rgba(16, 9, 30, 0.55)',
    description: 'Deep astral violet with ethereal purple glass reflections.',
  },
];

// ============================================================================
// Color Math & Auto-Harmonization Utilities
// ============================================================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(124, 58, 237, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function adjustHexBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function isDarkStarter(starterId: StarterThemeId): boolean {
  return starterId.includes('dark');
}

/**
 * Derives a harmonious secondary accent tint based on the starter archetype and primary accent
 */
export function deriveAccentSecondary(starterId: StarterThemeId, accentPrimary: string): string {
  const isDark = isDarkStarter(starterId);
  return isDark
    ? adjustHexBrightness(accentPrimary, 22)
    : adjustHexBrightness(accentPrimary, -18);
}

/**
 * Ensures palette.accentSecondary matches the theme's custom accent hue, automatically
 * migrating any orphaned starter defaults (e.g. #d89b45 from classic-dark).
 */
export function resolvePaletteSecondary(starterId: StarterThemeId, palette: CustomThemePalette): string {
  const defaults = STARTER_DEFAULT_PALETTES[starterId];
  const knownStarterDefaults = new Set([
    '#d89b45',
    '#b45309',
    '#b07222',
    '#c084fc',
    '#9333ea',
    '#a855f7',
    '#38bdf8',
    '#0ea5e9',
    defaults?.accentSecondary,
  ].filter(Boolean));

  if (
    !palette.accentSecondary ||
    (palette.accentPrimary !== defaults?.accentPrimary && knownStarterDefaults.has(palette.accentSecondary))
  ) {
    return deriveAccentSecondary(starterId, palette.accentPrimary);
  }

  return palette.accentSecondary;
}

/**
 * Automatically harmonizes hover, glow, borders, and contrast based on user accent and background
 */
export function harmonizePalette(
  starterId: StarterThemeId,
  accentHex: string,
  existingPalette?: Partial<CustomThemePalette>
): CustomThemePalette {
  const defaults = STARTER_DEFAULT_PALETTES[starterId];
  const isDark = isDarkStarter(starterId);

  // Generate hover, glow, secondary accent, and borders
  const accentPrimaryHover = isDark
    ? adjustHexBrightness(accentHex, 18)
    : adjustHexBrightness(accentHex, -15);
  const accentPrimaryGlow = rgba(accentHex, isDark ? 0.30 : 0.22);
  const accentSecondary = deriveAccentSecondary(starterId, accentHex);
  const borderSubtle = rgba(accentHex, isDark ? 0.12 : 0.10);
  const borderMedium = rgba(accentHex, isDark ? 0.28 : 0.24);

  return {
    ...defaults,
    ...existingPalette,
    accentPrimary: accentHex,
    accentSecondary,
    accentPrimaryHover,
    accentPrimaryGlow,
    borderSubtle,
    borderMedium,
  };
}

// ============================================================================
// DOM Injection & Application Engine
// ============================================================================

const STYLE_TAG_ID = 'chronicle-custom-theme-vars';

/**
 * Applies a custom theme to the browser DOM by injecting high-priority CSS variables
 */
export function injectCustomTheme(theme: CustomTheme): void {
  if (typeof document === 'undefined') return;

  const { starterId, palette } = theme;
  const effectiveSecondary = resolvePaletteSecondary(starterId, palette);

  // 1. Set the structural data-theme attribute to the chosen starter
  document.documentElement.setAttribute('data-theme', starterId);
  document.documentElement.setAttribute('data-custom-theme', 'true');

  // 2. Build the CSS custom property override block
  const css = `
    :root, [data-theme] {
      --accent-primary: ${palette.accentPrimary} !important;
      --accent-primary-hover: ${palette.accentPrimaryHover || palette.accentPrimary} !important;
      --accent-primary-glow: ${palette.accentPrimaryGlow || rgba(palette.accentPrimary, 0.28)} !important;
      --accent-secondary: ${effectiveSecondary} !important;
      --bg-app: ${palette.bgApp} !important;
      --bg-sidebar: ${palette.bgSidebar} !important;
      --bg-surface: ${palette.bgSurface} !important;
      --bg-surface-elevated: ${palette.bgSurfaceElevated} !important;
      ${palette.bgInput ? `--bg-input: ${palette.bgInput} !important;` : ''}
      --text-primary: ${palette.textPrimary} !important;
      --text-secondary: ${palette.textSecondary} !important;
      ${palette.textMuted ? `--text-muted: ${palette.textMuted} !important;` : ''}
      ${palette.borderSubtle ? `--border-subtle: ${palette.borderSubtle} !important;` : ''}
      ${palette.borderMedium ? `--border-medium: ${palette.borderMedium} !important;` : ''}
      --border-focus: ${palette.accentPrimary} !important;
    }

    [data-custom-theme="true"] body,
    [data-custom-theme="true"] #root,
    [data-custom-theme="true"] .app-container {
      background-color: ${palette.bgApp} !important;
    }

    /* Primary Interactive Accents Override (Save button, Add Chapter, Mode Pills, Status) */
    [data-custom-theme="true"] .btn-primary,
    [data-custom-theme="true"] .header-save-btn,
    [data-custom-theme="true"] .btn-split-main,
    [data-custom-theme="true"] .btn-split-arrow,
    [data-custom-theme="true"] .sidebar-add-btn,
    [data-custom-theme="true"] .sub-nav-export-btn,
    [data-custom-theme="true"] .primary-mode-pill.active,
    [data-custom-theme="true"] .segmented-pill.active,
    [data-custom-theme="true"] .view-tab-btn.active,
    [data-custom-theme="true"] .theme-segment-btn.active,
    [data-custom-theme="true"] .sub-nav-badge.badge-active {
      background: ${palette.accentPrimary} !important;
      color: var(--text-inverse, #ffffff) !important;
      border-color: ${palette.accentPrimaryHover || palette.accentPrimary} !important;
      box-shadow: 0 2px 10px ${palette.accentPrimaryGlow || rgba(palette.accentPrimary, 0.28)} !important;
    }

    [data-custom-theme="true"] .btn-primary:hover,
    [data-custom-theme="true"] .header-save-btn:hover,
    [data-custom-theme="true"] .sidebar-add-btn:hover,
    [data-custom-theme="true"] .sub-nav-export-btn:hover,
    [data-custom-theme="true"] .btn-split-group:hover .btn-split-main,
    [data-custom-theme="true"] .btn-split-group:hover .btn-split-arrow {
      background: ${palette.accentPrimaryHover || palette.accentPrimary} !important;
      color: var(--text-inverse, #ffffff) !important;
      border-color: ${palette.accentPrimary} !important;
      box-shadow: 0 4px 14px ${palette.accentPrimaryGlow || rgba(palette.accentPrimary, 0.35)} !important;
    }

    /* Smart Typography Header and Dropdown Buttons */
    [data-custom-theme="true"] .header-typography-btn {
      color: ${effectiveSecondary} !important;
    }
    [data-custom-theme="true"] .header-typography-btn svg {
      color: ${palette.accentPrimary} !important;
    }
    [data-custom-theme="true"] .header-typography-btn:hover:not(:disabled) {
      background: ${palette.accentPrimaryGlow || rgba(palette.accentPrimary, 0.15)} !important;
      color: ${palette.accentPrimaryHover || palette.accentPrimary} !important;
    }

    [data-custom-theme="true"] .chapter-item.active {
      border-left: 3px solid ${palette.accentPrimary} !important;
      color: ${palette.accentPrimaryHover || palette.accentPrimary} !important;
    }

    [data-custom-theme="true"] .status-btn.active,
    [data-custom-theme="true"] .sub-nav-pill.active {
      color: ${palette.accentPrimary} !important;
      border-color: ${palette.borderMedium || rgba(palette.accentPrimary, 0.35)} !important;
    }

    [data-custom-theme="true"] .document-status-dot.dot-clean,
    [data-custom-theme="true"] .status-dot.dot-ready {
      background: ${palette.accentPrimary} !important;
      box-shadow: 0 0 6px ${palette.accentPrimaryGlow || rgba(palette.accentPrimary, 0.6)} !important;
    }
  `;

  // 3. Update or create the <style> element in head
  let styleEl = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_TAG_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

/**
 * Clears custom theme overrides and reverts to standard starter CSS
 */
export function clearCustomTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.removeAttribute('data-custom-theme');
  const styleEl = document.getElementById(STYLE_TAG_ID);
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
}

/**
 * Applies whatever theme is active (either built-in starter or custom)
 */
export function applyActiveTheme(
  themeId: UiTheme,
  customThemes: CustomTheme[] = []
): void {
  if (typeof document === 'undefined') return;

  const custom = customThemes.find(t => t.id === themeId);
  if (custom) {
    const effectiveSecondary = resolvePaletteSecondary(custom.starterId, custom.palette);
    if (custom.palette.accentSecondary !== effectiveSecondary) {
      custom.palette.accentSecondary = effectiveSecondary;
    }
    injectCustomTheme(custom);
  } else {
    clearCustomTheme();
    // Default fallback to classic-dark if invalid
    const validStarter = STARTER_THEMES.includes(themeId as StarterThemeId)
      ? (themeId as StarterThemeId)
      : 'classic-dark';
    document.documentElement.setAttribute('data-theme', validStarter);
  }
}

// ============================================================================
// JSON Import & Export
// ============================================================================

export function exportCustomThemeToJson(theme: CustomTheme): string {
  return JSON.stringify(
    {
      format: 'chronicle-custom-theme',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      theme,
    },
    null,
    2
  );
}

export function parseCustomThemeFromJson(jsonStr: string): CustomTheme | null {
  try {
    const data = JSON.parse(jsonStr);
    const candidate = data.theme || data;
    if (
      candidate &&
      typeof candidate.name === 'string' &&
      STARTER_THEMES.includes(candidate.starterId) &&
      candidate.palette &&
      typeof candidate.palette.accentPrimary === 'string' &&
      typeof candidate.palette.bgApp === 'string'
    ) {
      return {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: candidate.name.trim() || 'Custom Theme',
        starterId: candidate.starterId,
        palette: {
          ...STARTER_DEFAULT_PALETTES[candidate.starterId as StarterThemeId],
          ...candidate.palette,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Failed to parse custom theme JSON:', err);
  }
  return null;
}
