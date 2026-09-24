import { isTauri } from '../cloud/webdavClient';

export const CURRENT_VERSION = '1.5.0';
export const GUMROAD_DOWNLOAD_URL = 'https://pazvanti.gumroad.com/l/Chronicle';
export const GITHUB_API_LATEST_RELEASE_URL = 'https://api.github.com/repos/pazvanti/Chronicle/releases/latest';


export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTag: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  gumroadUrl: string;
  assets: ReleaseAsset[];
  checkedAt: string;
  error?: string;
}

/**
 * Parses semantic version string into major, minor, patch numbers.
 * Supported patterns: v1.2.0, 1.2.0, v2.0.1, etc.
 */
export function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  if (!version) return null;
  const cleaned = version.trim().replace(/^[vV]/, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Returns true if remoteTag is strictly greater than currentVer.
 */
export function isNewerVersion(remoteTag: string, currentVer: string = CURRENT_VERSION): boolean {
  const remote = parseSemver(remoteTag);
  const current = parseSemver(currentVer);

  if (!remote || !current) return false;

  if (remote.major > current.major) return true;
  if (remote.major < current.major) return false;

  if (remote.minor > current.minor) return true;
  if (remote.minor < current.minor) return false;

  return remote.patch > current.patch;
}

/**
 * Universal fetch helper supporting both Tauri native HTTP and browser fetch.
 */
async function fetchReleaseData(url: string): Promise<any> {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': `Chronicle-App/${CURRENT_VERSION}`,
  };

  if (isTauri()) {
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const res = await tauriFetch(url, { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`GitHub API returned status ${res.status}: ${res.statusText || 'Error'}`);
      }
      return await res.json();
    } catch (err) {
      console.warn('Tauri HTTP fetch failed, attempting window.fetch fallback:', err);
    }
  }

  const res = await window.fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (res.status === 404) {
      throw new Error('No published releases found on GitHub repository.');
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

const CACHE_KEY = 'chronicle_update_check_cache';
const CACHE_EXPIRY_MS = 1000 * 60 * 60 * 2; // 2 hours

/**
 * Retrieves cached update information if not expired.
 */
export function getCachedUpdate(): UpdateCheckResult | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: UpdateCheckResult = JSON.parse(cached);
    if (parsed.checkedAt) {
      const elapsed = Date.now() - new Date(parsed.checkedAt).getTime();
      if (elapsed < CACHE_EXPIRY_MS) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted cache
  }
  return null;
}

/**
 * Checks GitHub Releases for new updates.
 */
export async function checkForUpdates(forceRefresh = false): Promise<UpdateCheckResult> {
  if (!forceRefresh) {
    const cached = getCachedUpdate();
    if (cached) {
      return cached;
    }
  }

  const now = new Date().toISOString();
  try {
    const data = await fetchReleaseData(GITHUB_API_LATEST_RELEASE_URL);
    const remoteTag = data.tag_name || '';
    const hasUpdate = isNewerVersion(remoteTag, CURRENT_VERSION);

    const result: UpdateCheckResult = {
      hasUpdate,
      currentVersion: `v${CURRENT_VERSION}`,
      latestVersion: remoteTag.startsWith('v') ? remoteTag : `v${remoteTag}`,
      releaseTag: remoteTag,
      releaseName: data.name || remoteTag,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
      gumroadUrl: GUMROAD_DOWNLOAD_URL,
      assets: Array.isArray(data.assets)
        ? data.assets.map((a: any) => ({
          name: a.name,
          browser_download_url: a.browser_download_url,
          size: a.size,
          content_type: a.content_type,
        }))
        : [],
      checkedAt: now,
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      // ignore
    }

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to check for updates';
    const errorResult: UpdateCheckResult = {
      hasUpdate: false,
      currentVersion: `v${CURRENT_VERSION}`,
      latestVersion: `v${CURRENT_VERSION}`,
      releaseTag: `v${CURRENT_VERSION}`,
      releaseName: 'Current Version',
      releaseNotes: '',
      publishedAt: '',
      gumroadUrl: GUMROAD_DOWNLOAD_URL,
      assets: [],
      checkedAt: now,
      error: errorMsg,
    };
    return errorResult;
  }
}
