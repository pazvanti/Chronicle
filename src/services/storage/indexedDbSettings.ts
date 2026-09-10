import { UiTheme } from '../../types/theme';
import { WebDavConfig } from '../../types/cloud';
import { AppViewMode, EditorSubMode, ReaderTheme, ReaderFont } from '../../types/epub';
import { loadWebDavConfig as loadLegacyWebDavConfig } from '../cloud/webdavStorage';

export interface ChronicleSettings {
  uiTheme: UiTheme;
  webdavConfig: WebDavConfig | null;
  showWelcomeOnStartup: boolean;
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

export const DEFAULT_CHRONICLE_SETTINGS: ChronicleSettings = {
  uiTheme: 'modernx-dark',
  webdavConfig: null,
  showWelcomeOnStartup: true,
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

const DB_NAME = 'chronicle_app_settings_db';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const SETTINGS_KEY = 'global_settings';

/**
 * Open or initialize Chronicle App Settings IndexedDB
 */
function openSettingsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Migrate legacy settings from localStorage and old webdav DB if needed
 */
async function migrateLegacySettings(): Promise<Partial<ChronicleSettings>> {
  const legacy: Partial<ChronicleSettings> = {};

  try {
    // 1. Welcome guide preference from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedWelcome = localStorage.getItem('chronicle_show_welcome_on_startup');
      if (savedWelcome !== null) {
        legacy.showWelcomeOnStartup = savedWelcome === 'true';
      }

      // 2. Editor & Reader settings from localStorage
      const savedAppSettings = localStorage.getItem('epub_editor_app_settings_v1');
      if (savedAppSettings) {
        try {
          const parsed = JSON.parse(savedAppSettings);
          Object.assign(legacy, parsed);
        } catch {
          // ignore parsing error
        }
      }
    }

    // 3. WebDAV config from old IndexedDB
    const oldWebDav = await loadLegacyWebDavConfig();
    if (oldWebDav) {
      legacy.webdavConfig = oldWebDav;
    }
  } catch (err) {
    console.warn('Error migrating legacy settings:', err);
  }

  return legacy;
}

/**
 * Loads all settings from IndexedDB on startup
 */
export async function loadAllSettings(): Promise<ChronicleSettings> {
  try {
    const db = await openSettingsDatabase();

    const stored = await new Promise<ChronicleSettings | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SETTINGS_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    if (stored) {
      return { ...DEFAULT_CHRONICLE_SETTINGS, ...stored };
    }

    // If no settings exist yet, migrate from legacy sources and persist
    const legacy = await migrateLegacySettings();
    const initialSettings: ChronicleSettings = {
      ...DEFAULT_CHRONICLE_SETTINGS,
      ...legacy,
    };

    await saveSettings(initialSettings);
    return initialSettings;
  } catch (err) {
    console.error('Failed to load settings from IndexedDB, using defaults:', err);
    return DEFAULT_CHRONICLE_SETTINGS;
  }
}

/**
 * Saves multiple settings fields atomically into IndexedDB
 */
export async function saveSettings(updates: Partial<ChronicleSettings>): Promise<ChronicleSettings> {
  try {
    const db = await openSettingsDatabase();

    // Read current first to merge
    const current = await new Promise<ChronicleSettings>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SETTINGS_KEY);

      request.onsuccess = () => {
        resolve(request.result ? { ...DEFAULT_CHRONICLE_SETTINGS, ...request.result } : DEFAULT_CHRONICLE_SETTINGS);
      };

      request.onerror = () => {
        resolve(DEFAULT_CHRONICLE_SETTINGS);
      };
    });

    const merged: ChronicleSettings = {
      ...current,
      ...updates,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(merged, SETTINGS_KEY);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    // Also mirror to legacy localStorage for instant synchronous fallback if needed
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (updates.showWelcomeOnStartup !== undefined) {
          localStorage.setItem('chronicle_show_welcome_on_startup', String(updates.showWelcomeOnStartup));
        }
        localStorage.setItem('epub_editor_app_settings_v1', JSON.stringify(merged));
      }
    } catch {
      // ignore
    }

    return merged;
  } catch (err) {
    console.error('Failed to save settings into IndexedDB:', err);
    return { ...DEFAULT_CHRONICLE_SETTINGS, ...updates };
  }
}

/**
 * Saves a single setting field into IndexedDB
 */
export async function saveSetting<K extends keyof ChronicleSettings>(
  key: K,
  value: ChronicleSettings[K]
): Promise<void> {
  await saveSettings({ [key]: value } as Partial<ChronicleSettings>);
}
