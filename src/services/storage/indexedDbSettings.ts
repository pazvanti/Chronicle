import { UiTheme } from '../../types/theme';
import { WebDavConfig } from '../../types/cloud';
import { AppViewMode, EditorSubMode, ReaderTheme, ReaderFont, CustomPaperTone, DEFAULT_CUSTOM_PAPER_TONE } from '../../types/project';
import { loadWebDavConfig as loadLegacyWebDavConfig } from '../cloud/webdavStorage';

export interface ChronicleSettings {
  uiTheme: UiTheme;
  webdavConfig: WebDavConfig | null;
  showWelcomeOnStartup: boolean;
  readerTheme: ReaderTheme;
  customPaperTone?: CustomPaperTone;
  readerFont: ReaderFont;
  readerFontSize: number;
  readerLineHeight: number;
  readerMarginWidth: number;
  viewMode: AppViewMode;
  editorSubMode: EditorSubMode;
  editorLayout: 'page' | 'widescreen';
  editorWidth: number;
  minimalistMode: boolean;
  zenSettings: ZenModeSettings;
  todayWordsDate?: string;
  todayWordsCount?: number;

  // Auto-save preferences
  autoSaveEnabled: boolean;
  autoSaveInterval: number;

  // Language / i18n
  language: 'en' | 'pt-BR' | 'ro';

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
  checkUpdatesOnStartup?: boolean;
}

export interface ZenModeSettings {
  autoSwitchOnTyping: boolean;
  typewriterScrolling: boolean;
  focusDimming: boolean;
  focusDimOpacity: number;
  ghostHud: boolean;
  hideComments: boolean;
}

export const DEFAULT_ZEN_SETTINGS: ZenModeSettings = {
  autoSwitchOnTyping: true,
  typewriterScrolling: true,
  focusDimming: true,
  focusDimOpacity: 35,
  ghostHud: true,
  hideComments: true,
};

export const DEFAULT_CHRONICLE_SETTINGS: ChronicleSettings = {
  uiTheme: 'classic-dark',
  webdavConfig: null,
  showWelcomeOnStartup: true,
  checkUpdatesOnStartup: true,
  readerTheme: 'light',
  customPaperTone: DEFAULT_CUSTOM_PAPER_TONE,
  readerFont: 'serif',
  readerFontSize: 18,
  readerLineHeight: 1.75,
  readerMarginWidth: 760,
  viewMode: 'editor',
  editorSubMode: 'visual',
  editorLayout: 'page',
  editorWidth: 820,
  minimalistMode: false,
  zenSettings: DEFAULT_ZEN_SETTINGS,
  todayWordsCount: 0,
  autoSaveEnabled: typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__),
  autoSaveInterval: 60,
  language:
    typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt')
      ? 'pt-BR'
      : typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ro')
        ? 'ro'
        : 'en',
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

let memorySettings: ChronicleSettings | null = null;
let saveQueue: Promise<ChronicleSettings> = Promise.resolve(DEFAULT_CHRONICLE_SETTINGS);

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

    let localFallback: Partial<ChronicleSettings> = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('epub_editor_app_settings_v1');
        if (raw) {
          localFallback = JSON.parse(raw);
        }
      }
    } catch {
      // ignore
    }

    if (stored) {
      let welcomePref = stored.showWelcomeOnStartup;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedWelcome = localStorage.getItem('chronicle_show_welcome_on_startup');
          if (savedWelcome !== null) {
            welcomePref = savedWelcome === 'true';
          }
        }
      } catch {
        /* ignore */
      }

      const merged: ChronicleSettings = {
        ...DEFAULT_CHRONICLE_SETTINGS,
        ...localFallback,
        ...stored,
        showWelcomeOnStartup: welcomePref,
        zenSettings: {
          ...DEFAULT_ZEN_SETTINGS,
          ...(stored.zenSettings || {}),
        },
      };

      // Ensure custom canvas width is respected from stored or local fallback
      if (typeof stored.editorWidth === 'number' && stored.editorWidth >= 600) {
        merged.editorWidth = stored.editorWidth;
      } else if (typeof (localFallback as any).editorWidth === 'number' && (localFallback as any).editorWidth >= 600) {
        merged.editorWidth = (localFallback as any).editorWidth;
      }

      if (stored.editorLayout) {
        merged.editorLayout = stored.editorLayout;
      } else if ((localFallback as any).editorLayout) {
        merged.editorLayout = (localFallback as any).editorLayout;
      }

      memorySettings = merged;
      return merged;
    }

    // If no settings exist yet, migrate from legacy sources and persist
    const legacy = await migrateLegacySettings();
    const initialSettings: ChronicleSettings = {
      ...DEFAULT_CHRONICLE_SETTINGS,
      ...localFallback,
      ...legacy,
    };
    if (typeof (localFallback as any).editorWidth === 'number' && (localFallback as any).editorWidth >= 600) {
      initialSettings.editorWidth = (localFallback as any).editorWidth;
    }
    if ((localFallback as any).editorLayout) {
      initialSettings.editorLayout = (localFallback as any).editorLayout;
    }

    memorySettings = initialSettings;
    await saveSettings(initialSettings);
    return initialSettings;
  } catch (err) {
    console.error('Failed to load settings from IndexedDB, using defaults:', err);
    let fallbackWelcome = DEFAULT_CHRONICLE_SETTINGS.showWelcomeOnStartup;
    let fallbackWidth = DEFAULT_CHRONICLE_SETTINGS.editorWidth;
    let fallbackLayout = DEFAULT_CHRONICLE_SETTINGS.editorLayout;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedWelcome = localStorage.getItem('chronicle_show_welcome_on_startup');
        if (savedWelcome !== null) {
          fallbackWelcome = savedWelcome === 'true';
        }
        const raw = localStorage.getItem('epub_editor_app_settings_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.editorWidth === 'number' && parsed.editorWidth >= 600) {
            fallbackWidth = parsed.editorWidth;
          }
          if (parsed.editorLayout === 'page' || parsed.editorLayout === 'widescreen') {
            fallbackLayout = parsed.editorLayout;
          }
        }
      }
    } catch {
      /* ignore */
    }
    const fallbackSettings: ChronicleSettings = {
      ...DEFAULT_CHRONICLE_SETTINGS,
      showWelcomeOnStartup: fallbackWelcome,
      editorWidth: fallbackWidth,
      editorLayout: fallbackLayout,
    };
    memorySettings = fallbackSettings;
    return fallbackSettings;
  }
}

/**
 * Saves multiple settings fields atomically into IndexedDB
 */
export async function saveSettings(updates: Partial<ChronicleSettings>): Promise<ChronicleSettings> {
  // 1. Maintain in-memory cache synchronously so rapid/concurrent calls never trample each other
  if (!memorySettings) {
    let localFallback: Partial<ChronicleSettings> = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('epub_editor_app_settings_v1');
        if (raw) localFallback = JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    memorySettings = { ...DEFAULT_CHRONICLE_SETTINGS, ...localFallback };
  }
  memorySettings = {
    ...memorySettings,
    ...updates,
  };
  const snapshotToSave = { ...memorySettings };

  // 2. Synchronously write to localStorage immediately (so page refresh right after drag is 100% persistent)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (updates.showWelcomeOnStartup !== undefined) {
        localStorage.setItem('chronicle_show_welcome_on_startup', String(updates.showWelcomeOnStartup));
      }
      localStorage.setItem('epub_editor_app_settings_v1', JSON.stringify(snapshotToSave));
    }
  } catch {
    // ignore
  }

  // 3. Queue IndexedDB persist sequentially without racing
  saveQueue = saveQueue.then(async () => {
    try {
      const db = await openSettingsDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(snapshotToSave, SETTINGS_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to save settings into IndexedDB:', err);
    }
    return snapshotToSave;
  });

  return snapshotToSave;
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
