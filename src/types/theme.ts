export type StarterThemeId = 'classic-dark' | 'classic-light' | 'modernx-dark' | 'modernx-light' | 'glass-dark' | 'glass-light';

export type UiTheme = StarterThemeId | string;

export interface CustomThemePalette {
  accentPrimary: string;
  accentPrimaryHover?: string;
  accentPrimaryGlow?: string;
  accentSecondary?: string;
  bgApp: string;
  bgSidebar: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgInput?: string;
  textPrimary: string;
  textSecondary: string;
  textMuted?: string;
  borderSubtle?: string;
  borderMedium?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  starterId: StarterThemeId;
  palette: CustomThemePalette;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeOption {
  id: StarterThemeId;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  bgPreview: string;
  surfacePreview: string;
  textColor: string;
  borderPreview: string;
}

export const UI_THEMES: ThemeOption[] = [
  {
    id: 'classic-dark',
    name: 'Classic - Dark',
    tagline: 'Nocturnal Sanctuary & Warm Gold (Default)',
    description: 'Literary dark aesthetic inspired by the Chronicle showcase, featuring candlelight gold accents, restrained architectural corners, and warm tactile surfaces.',
    accent: '#e6be75',
    bgPreview: '#080a10',
    surfacePreview: '#131625',
    textColor: '#f7f4ec',
    borderPreview: 'rgba(230, 190, 117, 0.28)',
  },
  {
    id: 'classic-light',
    name: 'Classic - Light',
    tagline: 'Literary Alabaster & Cognac Gold',
    description: 'Crisp alabaster paper and clean manuscript aesthetic with rich cognac gold accents, crisp architectural corners, and high-contrast book ink.',
    accent: '#925b18',
    bgPreview: '#f8f8f7',
    surfacePreview: '#ffffff',
    textColor: '#18181b',
    borderPreview: '#d1d1cd',
  },
  {
    id: 'modernx-dark',
    name: 'ModernX - Dark',
    tagline: 'Obsidian & Graphite',
    description: 'Deep obsidian and neutral graphite dark palette with neon violet glow, high-contrast typography, and dark glassmorphism.',
    accent: '#8b5cf6',
    bgPreview: '#09090b',
    surfacePreview: '#141418',
    textColor: '#f4f4f6',
    borderPreview: 'rgba(255, 255, 255, 0.12)',
  },
  {
    id: 'modernx-light',
    name: 'ModernX - Light',
    tagline: 'Porcelain & Clean Slate',
    description: 'Crisp porcelain and slate light palette with vibrant violet accents, refined elevation shadows, and frosted glass.',
    accent: '#7c3aed',
    bgPreview: '#f4f4f7',
    surfacePreview: '#ffffff',
    textColor: '#0f172a',
    borderPreview: 'rgba(0, 0, 0, 0.12)',
  },
  {
    id: 'glass-dark',
    name: 'Glass - Dark',
    tagline: 'Deep Frosted Glass & Cyan Glow',
    description: 'Cinematic glassmorphism with translucent dark panels, heavy backdrop blur, specular edge highlights, and luminous cyan accents.',
    accent: '#06b6d4',
    bgPreview: '#080d14',
    surfacePreview: 'rgba(13, 22, 35, 0.72)',
    textColor: '#f1f5f9',
    borderPreview: 'rgba(56, 189, 248, 0.3)',
  },
  {
    id: 'glass-light',
    name: 'Glass - Light',
    tagline: 'Luminous Frosted Glass & Azure',
    description: 'Crisp, translucent light glassmorphism with pearlescent panels, multi-layered backdrop blur, specular edge highlights, and luminous azure accents.',
    accent: '#0284c7',
    bgPreview: '#f0f7ff',
    surfacePreview: 'rgba(255, 255, 255, 0.75)',
    textColor: '#0f172a',
    borderPreview: 'rgba(14, 165, 233, 0.35)',
  },
];


