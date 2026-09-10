export interface WebDavConfig {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string; // Remote root directory
  connected?: boolean;
  lastChecked?: string; // ISO string
}

export interface WebDavFileItem {
  name: string;
  href: string;
  path: string;
  size: number;
  lastModified: string | null;
  isDirectory: boolean;
  isManuscript: boolean; // .chronicle or .epub
  type: 'chronicle' | 'epub' | 'other' | 'directory';
  subPath?: string; // Relative parent directory from config.remotePath
  relativePath?: string; // Full relative path from config.remotePath
}

export type StorageTarget = 'local' | 'cloud';
