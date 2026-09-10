/**
 * Author Comments & Text Highlighting Service
 * Handles wrapping DOM ranges with semantic mark tags, color changes,
 * unwrapping highlights when deleted, and stripping comment markers for export.
 */

export interface CommentColorOption {
  id: string;
  name: string;
  hex: string;
  borderColor: string;
  darkHex: string;
}

export const COMMENT_HIGHLIGHT_COLORS: CommentColorOption[] = [
  {
    id: 'yellow',
    name: 'Canary Yellow',
    hex: '#fef08a',
    borderColor: '#eab308',
    darkHex: 'rgba(254, 240, 138, 0.45)',
  },
  {
    id: 'green',
    name: 'Mint Green',
    hex: '#bbf7d0',
    borderColor: '#22c55e',
    darkHex: 'rgba(187, 247, 208, 0.45)',
  },
  {
    id: 'blue',
    name: 'Sky Blue',
    hex: '#bfdbfe',
    borderColor: '#3b82f6',
    darkHex: 'rgba(191, 219, 254, 0.45)',
  },
  {
    id: 'pink',
    name: 'Rose Pink',
    hex: '#fbcfe8',
    borderColor: '#ec4899',
    darkHex: 'rgba(251, 207, 232, 0.45)',
  },
  {
    id: 'orange',
    name: 'Peach Orange',
    hex: '#fed7aa',
    borderColor: '#f97316',
    darkHex: 'rgba(254, 215, 170, 0.45)',
  },
  {
    id: 'purple',
    name: 'Lavender Purple',
    hex: '#e9d5ff',
    borderColor: '#a855f7',
    darkHex: 'rgba(233, 213, 255, 0.45)',
  },
];

export const DEFAULT_HIGHLIGHT_COLOR = COMMENT_HIGHLIGHT_COLORS[0].hex;

/**
 * Wraps an active DOM selection range in a <mark> element with comment ID and highlight color
 */
export function wrapSelectionWithComment(
  range: Range,
  commentId: string,
  color: string = DEFAULT_HIGHLIGHT_COLOR
): HTMLElement | null {
  if (range.collapsed) return null;

  const mark = document.createElement('mark');
  mark.setAttribute('data-comment-id', commentId);
  mark.className = 'author-comment-highlight';
  mark.style.backgroundColor = color;
  mark.style.borderBottom = `2px solid ${getColorBorder(color)}`;
  mark.style.borderRadius = '3px';
  mark.style.padding = '0.08em 0.25em';

  try {
    range.surroundContents(mark);
    return mark;
  } catch {
    // If range spans across complex container nodes, extract contents and insert mark
    try {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
      return mark;
    } catch (err) {
      console.error('Failed to wrap selection with comment mark:', err);
      return null;
    }
  }
}

/**
 * Finds border color corresponding to highlight hex
 */
export function getColorBorder(hexColor: string): string {
  const match = COMMENT_HIGHLIGHT_COLORS.find(
    c => c.hex.toLowerCase() === hexColor.toLowerCase()
  );
  return match ? match.borderColor : 'rgba(139, 92, 246, 0.6)';
}

/**
 * Unwraps a comment highlight in a live DOM container, preserving all inner text and markup
 */
export function unwrapCommentHighlight(container: HTMLElement | Document, commentId: string): boolean {
  const marks = container.querySelectorAll<HTMLElement>(`mark[data-comment-id="${commentId}"]`);
  if (!marks.length) return false;

  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });

  return true;
}

/**
 * Unwraps a comment highlight from an HTML string (useful for offline/context updates)
 */
export function unwrapCommentHighlightInHtml(html: string, commentId: string): string {
  if (!html.includes(commentId)) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const unwrapped = unwrapCommentHighlight(doc.body, commentId);
  return unwrapped ? doc.body.innerHTML : html;
}

/**
 * Updates the highlight background and border color in a live DOM container
 */
export function updateCommentHighlightColor(
  container: HTMLElement | Document,
  commentId: string,
  newColor: string
): boolean {
  const marks = container.querySelectorAll<HTMLElement>(`mark[data-comment-id="${commentId}"]`);
  if (!marks.length) return false;

  const borderColor = getColorBorder(newColor);
  marks.forEach(mark => {
    mark.style.backgroundColor = newColor;
    mark.style.borderBottom = `2px solid ${borderColor}`;
  });

  return true;
}

/**
 * Updates the highlight background color in an HTML string
 */
export function updateCommentHighlightColorInHtml(
  html: string,
  commentId: string,
  newColor: string
): string {
  if (!html.includes(commentId)) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const updated = updateCommentHighlightColor(doc.body, commentId, newColor);
  return updated ? doc.body.innerHTML : html;
}

/**
 * Strips all author comment <mark> tags from an HTML string for clean publication exports.
 * Preserves the inner content completely.
 */
export function stripCommentsFromHtml(html: string): string {
  if (!html || !html.includes('author-comment-highlight')) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const marks = doc.body.querySelectorAll<HTMLElement>('mark.author-comment-highlight, mark[data-comment-id]');

  marks.forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  });

  return doc.body.innerHTML;
}

/**
 * Smoothly scrolls to a highlighted mark element and triggers the pulse glow animation.
 */
export function pulseAndScrollToHighlight(
  container: HTMLElement | null,
  commentId: string
): HTMLElement | null {
  if (!container) return null;
  const mark = container.querySelector<HTMLElement>(`mark[data-comment-id="${commentId}"]`);
  if (mark) {
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mark.classList.remove('comment-highlight-pulse');
    void mark.offsetWidth;
    mark.classList.add('comment-highlight-pulse');
    setTimeout(() => mark.classList.remove('comment-highlight-pulse'), 1800);
    return mark;
  }
  return null;
}

/**
 * Inspects the current window selection inside a given container.
 * Returns the selected text, cloned range, and center-top coordinate for floating pills.
 */
export function getSelectionFloatingPosition(
  container: HTMLElement | null
): { text: string; range: Range; position: { x: number; y: number } } | null {
  if (!container || typeof window === 'undefined') return null;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.anchorNode || !container.contains(sel.anchorNode)) {
    return null;
  }

  const text = sel.toString().trim();
  if (!text) return null;

  try {
    const range = sel.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();
    return {
      text,
      range,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    };
  } catch {
    return null;
  }
}

