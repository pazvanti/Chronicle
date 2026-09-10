export interface TypographyOptions {
  smartQuotes: boolean; // "..." and '...' to “...” and ‘...’
  emDashes: boolean; // -- or --- to —
  ellipses: boolean; // ... to …
  removeBlankParagraphs: boolean; // remove <p>&nbsp;</p>, <p></p>, <p><br/></p>
  cleanSpaces: boolean; // multiple spaces to single space
  cleanPunctuationSpacing: boolean; // fix "word , word" -> "word, word"
  addDropCaps: boolean; // add dropcap class to first paragraph
}

export interface CleanupStats {
  smartQuotesFixed: number;
  emDashesFixed: number;
  ellipsesFixed: number;
  blankParagraphsRemoved: number;
  spacesFixed: number;
  chaptersAffected: number;
}

export const DEFAULT_TYPOGRAPHY_OPTIONS: TypographyOptions = {
  smartQuotes: true,
  emDashes: true,
  ellipses: true,
  removeBlankParagraphs: true,
  cleanSpaces: true,
  cleanPunctuationSpacing: true,
  addDropCaps: false,
};

/**
 * Converts straight quotes to smart curly quotes while ignoring HTML tags and attributes
 */
export function convertToSmartQuotes(text: string): { result: string; count: number } {
  let count = 0;
  
  // Convert double quotes
  let openDouble = true;
  const doublePass = text.replace(/(<[^>]*>)|(")/g, (match, tag, quote) => {
    if (tag) return tag;
    if (quote) {
      count++;
      const replacement = openDouble ? '“' : '”';
      openDouble = !openDouble;
      return replacement;
    }
    return match;
  });

  // Convert single quotes / apostrophes
  // Pattern: letter'letter -> letter’letter (apostrophe)
  // 'Word' -> ‘Word’
  const singlePass = doublePass.replace(/(<[^>]*>)|(\b'|'\b|'(?=\w)|(?<=\w)')/g, (match, tag, single) => {
    if (tag) return tag;
    if (single) {
      count++;
      return '’';
    }
    return match;
  });

  // Open single quotes at beginning of words
  const finalPass = singlePass.replace(/(<[^>]*>)|(\s)'(\w)/g, (match, tag, space, word) => {
    if (tag) return tag;
    if (space && word) {
      count++;
      return `${space}‘${word}`;
    }
    return match;
  });

  return { result: finalPass, count };
}

/**
 * Converts double/triple hyphens to em-dashes
 */
export function convertToEmDashes(text: string): { result: string; count: number } {
  let count = 0;
  const result = text.replace(/(<[^>]*>)|(---|--)/g, (match, tag, dash) => {
    if (tag) return tag;
    if (dash) {
      count++;
      return '—';
    }
    return match;
  });
  return { result, count };
}

/**
 * Converts three dots to typographic ellipsis
 */
export function convertToEllipses(text: string): { result: string; count: number } {
  let count = 0;
  const result = text.replace(/(<[^>]*>)|(\.{3})/g, (match, tag, dots) => {
    if (tag) return tag;
    if (dots) {
      count++;
      return '…';
    }
    return match;
  });
  return { result, count };
}

/**
 * Removes empty paragraphs and empty tags
 */
export function removeEmptyParagraphs(html: string): { result: string; count: number } {
  let count = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return { result: html, count: 0 };

  const paragraphs = container.querySelectorAll('p, div');
  paragraphs.forEach(p => {
    const text = p.textContent?.replace(/\u00a0/g, ' ').trim() || '';
    const hasImages = p.querySelector('img, svg, video, audio, hr, table') !== null;
    if (!text && !hasImages) {
      p.remove();
      count++;
    }
  });

  return { result: container.innerHTML, count };
}

/**
 * Cleans excessive spaces and misplaced punctuation spaces
 */
export function cleanSpacings(text: string): { result: string; count: number } {
  let count = 0;
  let res = text.replace(/(<[^>]*>)|([ \t]{2,})/g, (match, tag, spaces) => {
    if (tag) return tag;
    if (spaces) {
      count++;
      return ' ';
    }
    return match;
  });

  // Fix space before comma, period, semicolon, colon
  res = res.replace(/(<[^>]*>)|(\s+([,.;:!?]))/g, (match, tag, full, punct) => {
    if (tag) return tag;
    if (full && punct) {
      count++;
      return punct;
    }
    return match;
  });

  return { result: res, count };
}

/**
 * Injects drop cap class to first paragraph of the chapter
 */
export function injectDropCap(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return html;

  const firstP = container.querySelector('p');
  if (firstP && !firstP.classList.contains('dropcap')) {
    firstP.classList.add('dropcap');
  }
  return container.innerHTML;
}

/**
 * Runs cleanup pipeline on HTML content with given options
 */
export function cleanChapterContent(
  content: string,
  options: TypographyOptions
): { cleaned: string; stats: Partial<CleanupStats> } {
  let current = content;
  const stats: Partial<CleanupStats> = {
    smartQuotesFixed: 0,
    emDashesFixed: 0,
    ellipsesFixed: 0,
    blankParagraphsRemoved: 0,
    spacesFixed: 0,
  };

  if (options.removeBlankParagraphs) {
    const r = removeEmptyParagraphs(current);
    current = r.result;
    stats.blankParagraphsRemoved = r.count;
  }

  if (options.cleanSpaces || options.cleanPunctuationSpacing) {
    const r = cleanSpacings(current);
    current = r.result;
    stats.spacesFixed = r.count;
  }

  if (options.smartQuotes) {
    const r = convertToSmartQuotes(current);
    current = r.result;
    stats.smartQuotesFixed = r.count;
  }

  if (options.emDashes) {
    const r = convertToEmDashes(current);
    current = r.result;
    stats.emDashesFixed = r.count;
  }

  if (options.ellipses) {
    const r = convertToEllipses(current);
    current = r.result;
    stats.ellipsesFixed = r.count;
  }

  if (options.addDropCaps) {
    current = injectDropCap(current);
  }

  return { cleaned: current, stats };
}
