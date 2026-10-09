/**
 * Chronicle Library Storage Service
 *
 * Persists opened and saved manuscripts in IndexedDB so users can easily
 * access their personal bookshelf of previous works across app restarts.
 */

export interface LibraryBookItem {
  id: string; // e.g. "local:C:/path/to/novel.chronicle" or "cloud:remote/path.chronicle"
  title: string;
  author?: string;
  source: 'local' | 'cloud';
  filePath?: string; // For local files
  cloudHref?: string; // For cloud files
  cloudFileName?: string; // For cloud files
  fileType: 'chronicle' | 'epub' | 'markdown';
  coverDataUrl?: string; // High-quality compact thumbnail for instant display
  lastOpened: number; // Timestamp (Date.now())
  chapterCount?: number;
  wordCount?: number;
  spineColor?: string; // Generated or custom accent color for the book cover
}

const DB_NAME = 'chronicle_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'books';
const LOCAL_STORAGE_CACHE_KEY = 'chronicle_library_books_cache_v1';

// Preset literary book cover themes for manuscripts without cover images
export const HARDBOUND_COVER_PALETTES = [
  { name: 'Royal Crimson', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', text: '#fef3c7', foil: '#fbbf24' },
  { name: 'Midnight Sapphire', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', text: '#e0f2fe', foil: '#93c5fd' },
  { name: 'Emerald Forest', gradient: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', text: '#d1fae5', foil: '#6ee7b7' },
  { name: 'Obsidian Velvet', gradient: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)', text: '#f4f4f5', foil: '#e4e4e7' },
  { name: 'Imperial Amethyst', gradient: 'linear-gradient(135deg, #581c87 0%, #2e1065 100%)', text: '#f3e8ff', foil: '#d8b4fe' },
  { name: 'Warm Cognac', gradient: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', text: '#fef3c7', foil: '#fcd34d' },
  { name: 'Deep Terracotta', gradient: 'linear-gradient(135deg, #831843 0%, #500724 100%)', text: '#fce7f3', foil: '#f472b6' },
  { name: 'Abyssal Teal', gradient: 'linear-gradient(135deg, #134e4a 0%, #042f2e 100%)', text: '#ccfbf1', foil: '#5eead4' },
];

/**
 * Returns a stable, deterministic literary palette for a title.
 */
export function getOrGenerateSpineColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % HARDBOUND_COVER_PALETTES.length;
  return HARDBOUND_COVER_PALETTES[index].gradient;
}

/**
 * Opens or initializes the IndexedDB database.
 */
function openLibraryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastOpened', 'lastOpened', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates a compact canvas thumbnail from a Blob or URL.
 */
export async function createCoverThumbnail(
  imageSource: string | Blob,
  maxWidth = 260,
  maxHeight = 390
): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      let objectUrl: string | null = null;

      if (imageSource instanceof Blob) {
        objectUrl = URL.createObjectURL(imageSource);
        img.src = objectUrl;
      } else {
        img.src = imageSource;
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width || maxWidth;
          let height = img.naturalHeight || img.height || maxHeight;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.88);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(thumbUrl);
            return;
          }
        } catch {
          // Canvas conversion error
        }
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(typeof imageSource === 'string' && imageSource.startsWith('data:') ? imageSource : undefined);
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Retrieves all items in the library, sorted by most recently opened first.
 */
export async function getLibraryItems(): Promise<LibraryBookItem[]> {
  try {
    const db = await openLibraryDatabase();
    const items = await new Promise<LibraryBookItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // Sort descending by lastOpened
    items.sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

    // Cache to localStorage for ultra-fast startup preview (without cover image to keep it small)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const lean = items.slice(0, 30).map(({ coverDataUrl: _, ...rest }) => rest);
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(lean));
      }
    } catch {
      /* ignore */
    }

    return items;
  } catch (err) {
    console.warn('[LibraryStorage] Failed to read from IndexedDB, reading cache:', err);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      /* ignore */
    }
    return [];
  }
}

/**
 * Adds or updates an item in the library.
 */
export async function saveLibraryItem(item: LibraryBookItem): Promise<void> {
  try {
    const db = await openLibraryDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[LibraryStorage] Failed to save item to IndexedDB:', err);
  }
}

/**
 * Removes an item from the library by its ID.
 */
export async function removeLibraryItem(id: string): Promise<void> {
  try {
    const db = await openLibraryDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[LibraryStorage] Failed to remove item from IndexedDB:', err);
  }
}

/**
 * Clears all books from the library.
 */
export async function clearLibrary(): Promise<void> {
  try {
    const db = await openLibraryDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
    }
  } catch (err) {
    console.warn('[LibraryStorage] Failed to clear library:', err);
  }
}
