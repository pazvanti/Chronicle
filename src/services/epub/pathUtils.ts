/**
 * Normalizes a file path by replacing backslashes with slashes and resolving . and ..
 */
export function normalizePath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const stack: string[] = [];
  
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  
  return stack.join('/');
}

/**
 * Returns the directory part of a path (with trailing slash, or empty string)
 */
export function getDirectory(path: string): string {
  const norm = path.replace(/\\/g, '/');
  const lastSlash = norm.lastIndexOf('/');
  return lastSlash === -1 ? '' : norm.substring(0, lastSlash + 1);
}

/**
 * Resolves a relative path against a base directory or file path
 */
export function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return normalizePath(relativePath.substring(1));
  }
  const baseDir = basePath.endsWith('/') ? basePath : getDirectory(basePath);
  return normalizePath(baseDir + relativePath);
}

/**
 * Calculates relative path from base to target
 */
export function getRelativePath(fromPath: string, toPath: string): string {
  const fromDir = fromPath.endsWith('/') ? fromPath : getDirectory(fromPath);
  const fromParts = fromDir ? normalizePath(fromDir).split('/').filter(Boolean) : [];
  const toParts = normalizePath(toPath).split('/').filter(Boolean);

  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const upSegments = Array(upCount).fill('..');
  const downSegments = toParts.slice(commonLength);

  const result = [...upSegments, ...downSegments].join('/');
  return result || './';
}

/**
 * Formats a byte size number into human-readable B, KB, or MB string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

