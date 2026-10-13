/**
 * Platform detection and keyboard shortcut formatting utilities.
 * Adapts modifier keys and shortcut labels dynamically for macOS vs Windows/Linux.
 */

export const isMac = (() => {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    '';
  return /Mac|iPhone|iPod|iPad/i.test(platform);
})();

/**
 * Primary modifier key name for the current platform:
 * 'Cmd' on macOS, 'Ctrl' on Windows/Linux.
 */
export const MOD_KEY = isMac ? 'Cmd' : 'Ctrl';

/**
 * Primary modifier key symbol for the current platform:
 * '⌘' on macOS, 'Ctrl' on Windows/Linux.
 */
export const MOD_SYMBOL = isMac ? '⌘' : 'Ctrl';

/**
 * Alternate modifier key name for the current platform:
 * 'Option' on macOS, 'Alt' on Windows/Linux.
 */
export const ALT_KEY = isMac ? 'Option' : 'Alt';

/**
 * Formats a shortcut string (e.g. 'Ctrl+S', 'Ctrl+Shift+Z', 'Alt+Z')
 * for the current platform.
 */
export function formatShortcut(shortcut: string): string {
  if (!isMac || !shortcut) return shortcut;

  return shortcut
    .replace(/Ctrl\+/gi, 'Cmd+')
    .replace(/Alt\+/gi, 'Option+')
    .replace(/\bCtrl\b/gi, 'Cmd')
    .replace(/\bAlt\b/gi, 'Option');
}

/**
 * Replaces any occurrences of 'Ctrl+' / 'Alt+' / 'Ctrl' in UI text
 * with their macOS equivalents when running on a Mac.
 */
export function localizeShortcuts(text: string): string {
  if (!isMac || !text) return text;

  return text
    .replace(/\bCtrl\+/gi, 'Cmd+')
    .replace(/\bAlt\+/gi, 'Option+')
    .replace(/\bCtrl\b/g, 'Cmd')
    .replace(/\bCTRL\b/g, 'CMD')
    .replace(/\bAlt\b/g, 'Option')
    .replace(/\bALT\b/g, 'OPTION');
}

/**
 * Helper to test if a KeyboardEvent matches a shortcut regardless of OS:
 * - Checks both ctrlKey and metaKey for 'Ctrl' / 'Cmd'
 * - Checks key and code to handle Mac Option special characters (e.g. Option+Z producing 'Ω', Option+M producing 'µ', Option+S producing 'ß')
 * - Checks QWERTZ / AZERTY layout differences via code
 */
export function isModifierPressed(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}

export function isKeyMatch(
  e: KeyboardEvent | React.KeyboardEvent,
  targetKey: string,
  targetCode?: string
): boolean {
  const k = e.key.toLowerCase();
  const target = targetKey.toLowerCase();

  if (k === target) return true;
  if (targetCode && e.code === targetCode) return true;

  // macOS Option key special character mappings
  if (e.altKey) {
    if (target === 'z' && (k === 'ω' || k === 'Ω' || e.code === 'KeyZ')) return true;
    if (target === 'm' && (k === 'µ' || k === 'μ' || e.code === 'KeyM')) return true;
    if (target === 's' && (k === 'ß' || e.code === 'KeyS')) return true;
  }

  return false;
}
