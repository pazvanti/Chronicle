import { WebDavConfig, WebDavFileItem } from '../../types/cloud';

interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
}

/**
 * Detects if running within the Tauri desktop application environment.
 */
export function isTauri(): boolean {
  const win = typeof window !== 'undefined' ? (window as unknown as TauriWindow) : undefined;
  return Boolean(win?.__TAURI_INTERNALS__ || win?.__TAURI__);
}

/**
 * Universal fetch adapter:
 * When running inside Tauri, uses Tauri's native Rust HTTP client (@tauri-apps/plugin-http),
 * which bypasses all browser CORS restrictions and allows connecting to any WebDAV host.
 * When running in standard web browsers, falls back gracefully to window.fetch.
 */
async function nativeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      return (await tauriFetch(input as string | URL, init as RequestInit)) as unknown as Response;
    } catch (err) {
      console.warn('Tauri HTTP plugin unavailable, falling back to window.fetch:', err);
    }
  }
  return window.fetch(input, init);
}

/**
 * Normalizes URL and remote path, avoiding double slashes. Optionally appends subPath.
 */
export function getFolderUrl(config: WebDavConfig, subPath?: string): string {
  const base = config.serverUrl.trim().replace(/\/+$/, '');
  let path = config.remotePath.trim();
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  let fullPath = path.replace(/\/+$/, '');
  if (subPath) {
    const cleanSub = subPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanSub) {
      const encodedSegments = cleanSub.split('/').map(seg => encodeURIComponent(seg)).join('/');
      fullPath += '/' + encodedSegments;
    }
  }
  return `${base}${fullPath}`.replace(/\/+$/, '');
}

/**
 * Gets the absolute URL for a file in the remote path (or subPath).
 */
export function getFileUrl(config: WebDavConfig, filenameOrRelativePath: string, subPath?: string): string {
  const folderUrl = getFolderUrl(config, subPath);
  // Only encode filename segments, preserving directory slashes
  const cleanPath = filenameOrRelativePath.replace(/^\/+/, '');
  const encodedPath = cleanPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
  return `${folderUrl}/${encodedPath}`;
}

/**
 * Creates UTF-8 safe HTTP Basic Authorization header.
 */
function getAuthHeaders(config: WebDavConfig): Record<string, string> {
  const credentials = `${config.username}:${config.password}`;
  const encoded = btoa(unescape(encodeURIComponent(credentials)));
  return {
    'Authorization': `Basic ${encoded}`,
  };
}

/**
 * Helper to find XML child element regardless of XML namespace prefix.
 */
function findXmlChild(parent: Element, tagName: string): Element | null {
  const lowerTag = tagName.toLowerCase();
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const name = child.localName || child.nodeName.split(':').pop() || '';
    if (name.toLowerCase() === lowerTag) {
      return child;
    }
    const found = findXmlChild(child, tagName);
    if (found) return found;
  }
  return null;
}

/**
 * Helper to find XML text content across namespaces.
 */
function findXmlText(parent: Element, tagName: string): string | null {
  const el = findXmlChild(parent, tagName);
  return el ? (el.textContent || '').trim() : null;
}

/**
 * Ensures the target remote folder exists (including any optional subPath). If not, attempts MKCOL recursively.
 */
export async function ensureRemoteFolder(config: WebDavConfig, subPath?: string): Promise<boolean> {
  const base = config.serverUrl.trim().replace(/\/+$/, '');
  let fullPath = config.remotePath.trim();
  if (subPath) {
    const cleanSub = subPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanSub) {
      fullPath = `${fullPath.replace(/\/+$/, '')}/${cleanSub}`;
    }
  }

  const segments = fullPath
    .split('/')
    .filter(seg => seg.length > 0);

  if (segments.length === 0) {
    return true; // Root folder
  }

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${encodeURIComponent(segment)}`;
    const targetUrl = `${base}${currentPath}`;

    try {
      // Check if folder exists with PROPFIND Depth: 0
      const checkRes = await nativeFetch(targetUrl, {
        method: 'PROPFIND',
        headers: {
          ...getAuthHeaders(config),
          'Depth': '0',
        },
      });

      if (checkRes.status === 404) {
        // Create collection
        const mkcolRes = await nativeFetch(targetUrl, {
          method: 'MKCOL',
          headers: getAuthHeaders(config),
        });
        if (!mkcolRes.ok && mkcolRes.status !== 405) {
          // 405 Method Not Allowed can mean it already exists
          return false;
        }
      } else if (!checkRes.ok && checkRes.status !== 405 && checkRes.status !== 301) {
        return false;
      }
    } catch (err) {
      console.error(`Failed to ensure folder ${targetUrl}:`, err);
      return false;
    }
  }

  return true;
}

/**
 * Creates a new subfolder under parentSubPath (or under config.remotePath if parentSubPath is empty).
 */
export async function createFolder(
  config: WebDavConfig,
  folderName: string,
  parentSubPath?: string
): Promise<boolean> {
  const cleanName = folderName.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanName) return false;
  const targetSubPath = parentSubPath
    ? `${parentSubPath.trim().replace(/\/+$/, '')}/${cleanName}`
    : cleanName;
  return await ensureRemoteFolder(config, targetSubPath);
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  statusCode?: number;
}

/**
 * Tests WebDAV server connection and remote directory accessibility.
 */
export async function testConnection(config: WebDavConfig): Promise<ConnectionTestResult> {
  if (!config.serverUrl) {
    return { success: false, message: 'Server URL is required' };
  }
  if (!config.username) {
    return { success: false, message: 'Username is required' };
  }

  const folderUrl = getFolderUrl(config);

  try {
    const res = await nativeFetch(folderUrl, {
      method: 'PROPFIND',
      headers: {
        ...getAuthHeaders(config),
        'Depth': '0',
      },
    });

    if (res.status === 401) {
      return { success: false, message: 'Authentication failed. Please check username and password/token.', statusCode: 401 };
    }
    if (res.status === 403) {
      return { success: false, message: 'Access forbidden. Your account does not have permission for this folder.', statusCode: 403 };
    }
    if (res.status === 404) {
      // Folder doesn't exist, try creating it
      const created = await ensureRemoteFolder(config);
      if (created) {
        return { success: true, message: `Connected successfully! Created remote folder "${config.remotePath}".` };
      } else {
        return { success: false, message: `Remote folder "${config.remotePath}" not found and could not be automatically created.`, statusCode: 404 };
      }
    }

    if (res.ok || res.status === 207 || res.status === 200 || res.status === 301) {
      return { success: true, message: 'Connected successfully to WebDAV server!' };
    }

    return {
      success: false,
      message: `Server returned HTTP ${res.status}: ${res.statusText}`,
      statusCode: res.status,
    };
  } catch (err: unknown) {
    console.error('WebDAV test connection error:', err);
    let extra = '';
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      if (!isTauri()) {
        extra = ' (Browser CORS policy blocked this request. In the Tauri desktop app, CORS is completely bypassed).';
      }
    }
    return {
      success: false,
      message: `Connection failed: ${error.message || 'Unknown network error'}${extra}`,
    };
  }
}

/**
 * Lists files and directories in the configured WebDAV remote path (or subPath).
 */
export async function listFiles(config: WebDavConfig, subPath: string = ''): Promise<WebDavFileItem[]> {
  const folderUrl = getFolderUrl(config, subPath);
  const targetFolderClean = folderUrl.replace(/\/+$/, '');
  const cleanSubPath = subPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');

  const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getlastmodified/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`;

  const res = await nativeFetch(folderUrl, {
    method: 'PROPFIND',
    headers: {
      ...getAuthHeaders(config),
      'Depth': '1',
      'Content-Type': 'application/xml; charset=utf-8',
    },
    body: propfindXml,
  });

  if (!res.ok && res.status !== 207) {
    throw new Error(`Failed to list files (HTTP ${res.status}: ${res.statusText})`);
  }

  const xmlText = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  // Find all response elements
  const allElements = xmlDoc.getElementsByTagName('*');
  const responseElements: Element[] = [];
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const name = el.localName || el.nodeName.split(':').pop() || '';
    if (name.toLowerCase() === 'response') {
      responseElements.push(el);
    }
  }

  const items: WebDavFileItem[] = [];

  for (const resp of responseElements) {
    const rawHref = findXmlText(resp, 'href') || '';
    if (!rawHref) continue;

    // Decode href
    const decodedHref = decodeURIComponent(rawHref);

    // Check resource type
    const resourceTypeEl = findXmlChild(resp, 'resourcetype');
    let isDirectory = false;
    if (resourceTypeEl) {
      for (let j = 0; j < resourceTypeEl.children.length; j++) {
        const child = resourceTypeEl.children[j];
        const name = child.localName || child.nodeName.split(':').pop() || '';
        if (name.toLowerCase() === 'collection') {
          isDirectory = true;
          break;
        }
      }
    }
    if (rawHref.endsWith('/')) {
      isDirectory = true;
    }

    // Name
    let displayName = findXmlText(resp, 'displayname') || '';
    if (!displayName) {
      const cleanPath = decodedHref.replace(/\/+$/, '');
      displayName = cleanPath.split('/').pop() || '';
    }

    // Filter out the requested directory itself
    const normalizedItemHref = new URL(rawHref, config.serverUrl).href.replace(/\/+$/, '');
    if (normalizedItemHref === targetFolderClean || displayName === '' || displayName === '.' || displayName === '..') {
      continue;
    }

    // Content length & last modified
    const lengthStr = findXmlText(resp, 'getcontentlength');
    const size = lengthStr ? parseInt(lengthStr, 10) || 0 : 0;
    const lastModified = findXmlText(resp, 'getlastmodified');

    // Manuscript classification
    const lowerName = displayName.toLowerCase();
    const isChronicle = lowerName.endsWith('.chronicle');
    const isEpub = lowerName.endsWith('.epub');
    const isManuscript = isChronicle || isEpub;

    let type: WebDavFileItem['type'] = 'other';
    if (isDirectory) {
      type = 'directory';
    } else if (isChronicle) {
      type = 'chronicle';
    } else if (isEpub) {
      type = 'epub';
    }

    const itemRelativePath = cleanSubPath ? `${cleanSubPath}/${displayName}` : displayName;

    items.push({
      name: displayName,
      href: rawHref,
      path: decodedHref,
      size,
      lastModified,
      isDirectory,
      isManuscript,
      type,
      subPath: cleanSubPath,
      relativePath: itemRelativePath,
    });
  }

  // Sort: directories first, then manuscripts (.chronicle, .epub), then others, alphabetically
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    if (a.isManuscript && !b.isManuscript) return -1;
    if (!a.isManuscript && b.isManuscript) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/**
 * Uploads (and replaces) a file to WebDAV remote path via HTTP PUT.
 * Supports relative path or optional subPath.
 */
export async function uploadFile(
  config: WebDavConfig,
  filenameOrRelativePath: string,
  blob: Blob,
  subPath?: string
): Promise<{ success: boolean; url: string }> {
  let fullRelativePath = filenameOrRelativePath.replace(/^\/+/, '');
  if (subPath) {
    const cleanSub = subPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanSub && !fullRelativePath.startsWith(`${cleanSub}/`)) {
      fullRelativePath = `${cleanSub}/${fullRelativePath}`;
    }
  }

  // Ensure remote directory and all parent subdirectories exist
  const lastSlash = fullRelativePath.lastIndexOf('/');
  if (lastSlash > 0) {
    const dirPart = fullRelativePath.substring(0, lastSlash);
    await ensureRemoteFolder(config, dirPart);
  } else {
    await ensureRemoteFolder(config);
  }

  const fileUrl = getFileUrl(config, fullRelativePath);

  const res = await nativeFetch(fileUrl, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(config),
      'Content-Type': fullRelativePath.endsWith('.epub') ? 'application/epub+zip' : 'application/zip',
    },
    body: blob,
  });

  if (!res.ok && res.status !== 201 && res.status !== 204 && res.status !== 200) {
    throw new Error(`Failed to upload file to WebDAV (HTTP ${res.status}: ${res.statusText})`);
  }

  return {
    success: true,
    url: fileUrl,
  };
}

/**
 * Downloads a file from WebDAV server by href or filename.
 */
export async function downloadFile(config: WebDavConfig, hrefOrFilename: string): Promise<Blob> {
  let targetUrl: string;
  if (hrefOrFilename.startsWith('http://') || hrefOrFilename.startsWith('https://')) {
    targetUrl = hrefOrFilename;
  } else if (hrefOrFilename.startsWith('/')) {
    targetUrl = new URL(hrefOrFilename, config.serverUrl).href;
  } else {
    targetUrl = getFileUrl(config, hrefOrFilename);
  }

  const res = await nativeFetch(targetUrl, {
    method: 'GET',
    headers: getAuthHeaders(config),
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from WebDAV (HTTP ${res.status}: ${res.statusText})`);
  }

  return await res.blob();
}

/**
 * Deletes a file from WebDAV server.
 */
export async function deleteFile(config: WebDavConfig, hrefOrFilename: string): Promise<void> {
  let targetUrl: string;
  if (hrefOrFilename.startsWith('http://') || hrefOrFilename.startsWith('https://')) {
    targetUrl = hrefOrFilename;
  } else if (hrefOrFilename.startsWith('/')) {
    targetUrl = new URL(hrefOrFilename, config.serverUrl).href;
  } else {
    targetUrl = getFileUrl(config, hrefOrFilename);
  }

  const res = await nativeFetch(targetUrl, {
    method: 'DELETE',
    headers: getAuthHeaders(config),
  });

  if (!res.ok && res.status !== 204 && res.status !== 200 && res.status !== 404) {
    throw new Error(`Failed to delete file from WebDAV (HTTP ${res.status}: ${res.statusText})`);
  }
}
