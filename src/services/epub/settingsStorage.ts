import { AppViewMode, EditorSubMode, ReaderTheme, ReaderFont } from '../../types/epub';

export interface AppSettings {
  readerTheme: ReaderTheme;
  readerFont: ReaderFont;
  readerFontSize: number;
  readerLineHeight: number;
  readerMarginWidth: number;
  viewMode: AppViewMode;
  editorSubMode: EditorSubMode;
  editorLayout: 'page' | 'widescreen';
  editorWidth: number;

  // Shunn manuscript author preferences
  shunnLegalName?: string;
  shunnPenName?: string;
  shunnAuthorEmail?: string;
  shunnAuthorPhone?: string;
  shunnAddressLine1?: string;
  shunnAddressLine2?: string;
  shunnChapterPageBreak?: boolean;
  shunnIncludeChapterTitles?: boolean;
  shunnFontFamily?: 'Times New Roman' | 'Courier New';
}

const DEFAULT_SETTINGS: AppSettings = {
  readerTheme: 'light',
  readerFont: 'serif',
  readerFontSize: 18,
  readerLineHeight: 1.75,
  readerMarginWidth: 760,
  viewMode: 'editor',
  editorSubMode: 'visual',
  editorLayout: 'page',
  editorWidth: 820,
  shunnChapterPageBreak: true,
  shunnIncludeChapterTitles: true,
  shunnFontFamily: 'Times New Roman',
};

const STORAGE_KEY = 'epub_editor_app_settings_v1';

/**
 * Loads saved user settings with fallback defaults
 */
export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Could not parse stored settings from localStorage', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persists updated setting fields into localStorage
 */
export function updateStoredSettings(updates: Partial<AppSettings>): AppSettings {
  try {
    const current = getStoredSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Could not save settings to localStorage', err);
    return DEFAULT_SETTINGS;
  }
}
