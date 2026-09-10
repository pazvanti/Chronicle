export type UiTheme = 'modernx-dark' | 'modernx-light' | 'glass-dark' | 'glass-light';

export interface ThemeOption {
  id: UiTheme;
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
    id: 'modernx-dark',
    name: 'ModernX - Dark',
    tagline: 'Obsidian & Graphite (Default)',
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
