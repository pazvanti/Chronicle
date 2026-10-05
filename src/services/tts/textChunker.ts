export interface SpeechChunk {
  id: string;
  text: string;
  index: number;
  wordCount: number;
  charStart: number;
  charEnd: number;
  isDialogue: boolean;
}

export interface ChunkedChapter {
  chunks: SpeechChunk[];
  totalWords: number;
  totalChars: number;
  fullPlainText: string;
}

/**
 * Strips HTML tags and normalizes whitespace while preserving sentence boundaries and paragraphs.
 */
export function htmlToPlainText(html: string): string {
  // Replace block elements with double newlines
  const withLineBreaks = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n');

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(withLineBreaks, 'text/html');
    const rawText = doc.body.textContent || '';
    return rawText
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  // Environment fallback (strip remaining tags)
  const rawText = withLineBreaks.replace(/<[^>]*>/g, '');
  return rawText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

interface BlockUnit {
  tag: string;
  text: string;
}

function collectDomBlocks(root: Node): BlockUnit[] {
  const blocks: BlockUnit[] = [];
  const blockTagNames = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'li', 'pre', 'tr', 'dt', 'dd', 'article', 'section', 'div',
  ]);

  function hasChildBlocks(el: Element): boolean {
    return Array.from(el.children).some(child => {
      const tag = child.tagName.toLowerCase();
      return blockTagNames.has(tag) || tag === 'hr';
    });
  }

  function addBlock(tag: string, rawText: string) {
    const subParagraphs = rawText
      .split(/\n\s*\n+/)
      .map(p => p.replace(/[ \t\r\n]+/g, ' ').trim())
      .filter(Boolean);

    for (const p of subParagraphs) {
      blocks.push({
        tag: /^h[1-6]$/.test(tag) ? tag : (tag === 'blockquote' ? 'blockquote' : 'p'),
        text: p,
      });
    }
  }

  function traverse(node: Node) {
    if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'noscript') {
        return;
      }

      if (tag === 'hr') {
        return;
      }

      // Standalone blocks: headings, blockquotes, pre, li, tr
      if (/^h[1-6]$/.test(tag) || tag === 'blockquote' || tag === 'pre' || tag === 'li' || tag === 'tr') {
        const text = (el.textContent || '').replace(/[ \t\r\n]+/g, ' ').trim();
        if (text) {
          blocks.push({ tag, text });
        }
        return;
      }

      // Paragraphs, divs, or section containers without nested block children
      if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
        if (!hasChildBlocks(el)) {
          addBlock(tag, el.textContent || '');
          return;
        }
      }

      // Process children for container elements (accumulate inline/text nodes)
      let inlineAccumulator = '';
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === 3 /* Node.TEXT_NODE */) {
          inlineAccumulator += (child.textContent || ' ');
        } else if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
          const childEl = child as Element;
          const childTag = childEl.tagName.toLowerCase();

          if (childTag === 'hr' || blockTagNames.has(childTag)) {
            // Flush any accumulated inline text before this boundary
            if (inlineAccumulator.trim()) {
              addBlock('p', inlineAccumulator);
            }
            inlineAccumulator = '';

            // If it's a block (and not just an <hr> divider), traverse it
            if (childTag !== 'hr') {
              traverse(childEl);
            }
          } else {
            // Inline tags (b, i, em, strong, span, a, etc.)
            inlineAccumulator += (childEl.textContent || ' ');
          }
        }
      }

      // Flush any trailing inline text
      if (inlineAccumulator.trim()) {
        addBlock('p', inlineAccumulator);
      }
    }
  }

  traverse(root);
  return blocks;
}

export function extractSemanticBlocks(htmlOrText: string): BlockUnit[] {
  if (typeof DOMParser !== 'undefined' && htmlOrText.includes('<')) {
    try {
      const doc = new DOMParser().parseFromString(htmlOrText, 'text/html');

      // Replace all <br> elements with a newline text node to avoid merging adjacent words
      doc.body.querySelectorAll('br').forEach(br => {
        br.replaceWith(doc.createTextNode('\n'));
      });

      const blocks = collectDomBlocks(doc.body);
      if (blocks.length > 0) {
        return blocks;
      }
    } catch {
      // Fall through to regex if DOMParser encounters an issue
    }
  }

  // Regex fallback for non-DOM environments
  if (htmlOrText.includes('<')) {
    const normalized = htmlOrText
      .replace(/<hr\s*\/?>/gi, '\n\n<hr_marker>\n\n')
      .replace(/<br\s*\/?>/gi, '\n');

    const blockRegex = /<(h[1-6]|p|div|blockquote|li|tr|section|article)[^>]*>([\s\S]*?)<\/\1>/gi;
    const blocks: BlockUnit[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = blockRegex.exec(normalized)) !== null) {
      const precedingText = normalized.substring(lastIndex, match.index);
      const cleanPreceding = precedingText
        .replace(/<hr_marker>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/[ \t\r\n]+/g, ' ')
        .trim();
      if (cleanPreceding) {
        blocks.push({ tag: 'p', text: cleanPreceding });
      }

      const tag = match[1].toLowerCase();
      const rawContent = match[2];

      if (/<(h[1-6]|p|div|blockquote|li|tr|section|article|hr_marker)[^>]*>/i.test(rawContent)) {
        const nestedBlocks = extractSemanticBlocks(rawContent);
        blocks.push(...nestedBlocks);
      } else {
        const cleanContent = rawContent.replace(/<[^>]*>/g, '').trim();
        const paragraphs = cleanContent
          .split(/\n\s*\n+/)
          .map(p => p.replace(/[ \t\r\n]+/g, ' ').trim())
          .filter(Boolean);

        for (const p of paragraphs) {
          blocks.push({
            tag: /^h[1-6]$/.test(tag) ? tag : (tag === 'blockquote' ? 'blockquote' : 'p'),
            text: p,
          });
        }
      }

      lastIndex = blockRegex.lastIndex;
    }

    const trailingText = normalized.substring(lastIndex);
    const cleanTrailing = trailingText
      .replace(/<hr_marker>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[ \t\r\n]+/g, ' ')
      .trim();
    if (cleanTrailing) {
      blocks.push({ tag: 'p', text: cleanTrailing });
    }

    if (blocks.length > 0) {
      return blocks;
    }
  }

  // Fallback for plain text: split by double newlines into paragraphs
  const paragraphs = htmlOrText
    .replace(/<[^>]*>/g, '')
    .split(/\n\s*\n+/)
    .map(p => p.replace(/[ \t\r\n]+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs.map(text => ({ tag: 'p', text }));
  }

  const clean = htmlOrText.trim();
  return clean ? [{ tag: 'p', text: clean }] : [];
}

/**
 * Intelligently chunks prose into speech-friendly segments (120-280 chars)
 * aligned with natural speech pauses, while STRICTLY preserving semantic block
 * boundaries (headings, paragraphs, blockquotes never bleed into each other).
 */
export function chunkTextForSpeech(htmlOrText: string, maxChunkLength = 220): ChunkedChapter {
  const blocks = extractSemanticBlocks(htmlOrText);

  if (blocks.length === 0) {
    return { chunks: [], totalWords: 0, totalChars: 0, fullPlainText: '' };
  }

  const speechChunks: SpeechChunk[] = [];
  let chunkIndex = 0;
  let charCursor = 0;

  const sentenceRegex = /[^.!?\n]+(?:[.!?]+(?:["'”’»]+)?|\n+|$)/g;

  for (const block of blocks) {
    const isHeader = block.tag.startsWith('h');
    const isQuote = block.tag === 'blockquote';

    // Headers are always standalone individual chunks
    if (isHeader) {
      const words = block.text.split(/\s+/).filter(Boolean).length;
      speechChunks.push({
        id: `chunk-${chunkIndex}`,
        text: block.text,
        index: chunkIndex,
        wordCount: words,
        charStart: charCursor,
        charEnd: charCursor + block.text.length,
        isDialogue: false,
      });
      charCursor += block.text.length + 1;
      chunkIndex++;
      continue;
    }

    // Process block sentences
    const rawMatches = block.text.match(sentenceRegex) || [block.text];
    let currentAccumulator = '';

    for (let i = 0; i < rawMatches.length; i++) {
      const rawSentence = rawMatches[i].trim();
      if (!rawSentence) continue;

      if (
        currentAccumulator.length > 0 &&
        currentAccumulator.length + rawSentence.length + 1 <= maxChunkLength
      ) {
        currentAccumulator += ' ' + rawSentence;
      } else {
        if (currentAccumulator.length > 0) {
          const words = currentAccumulator.split(/\s+/).filter(Boolean).length;
          speechChunks.push({
            id: `chunk-${chunkIndex}`,
            text: currentAccumulator,
            index: chunkIndex,
            wordCount: words,
            charStart: charCursor,
            charEnd: charCursor + currentAccumulator.length,
            isDialogue: isQuote || /^["'“‘]/.test(currentAccumulator),
          });
          charCursor += currentAccumulator.length + 1;
          chunkIndex++;
          currentAccumulator = '';
        }

        // Split long sentence by clauses
        if (rawSentence.length > maxChunkLength * 1.5) {
          const clauseRegex = /[^,;:—–-]+(?:[,;:—–-]+|$)/g;
          const clauses = rawSentence.match(clauseRegex) || [rawSentence];
          let subAcc = '';

          for (const clause of clauses) {
            const trimmedClause = clause.trim();
            if (!trimmedClause) continue;

            if (subAcc.length > 0 && subAcc.length + trimmedClause.length + 1 <= maxChunkLength) {
              subAcc += ' ' + trimmedClause;
            } else {
              if (subAcc.length > 0) {
                const words = subAcc.split(/\s+/).filter(Boolean).length;
                speechChunks.push({
                  id: `chunk-${chunkIndex}`,
                  text: subAcc,
                  index: chunkIndex,
                  wordCount: words,
                  charStart: charCursor,
                  charEnd: charCursor + subAcc.length,
                  isDialogue: isQuote || /^["'“‘]/.test(subAcc),
                });
                charCursor += subAcc.length + 1;
                chunkIndex++;
                subAcc = '';
              }
              subAcc = trimmedClause;
            }
          }

          if (subAcc.length > 0) {
            const words = subAcc.split(/\s+/).filter(Boolean).length;
            speechChunks.push({
              id: `chunk-${chunkIndex}`,
              text: subAcc,
              index: chunkIndex,
              wordCount: words,
              charStart: charCursor,
              charEnd: charCursor + subAcc.length,
              isDialogue: isQuote || /^["'“‘]/.test(subAcc),
            });
            charCursor += subAcc.length + 1;
            chunkIndex++;
          }
        } else {
          currentAccumulator = rawSentence;
        }
      }
    }

    // Flush any remaining accumulated text within this block
    if (currentAccumulator.length > 0) {
      const words = currentAccumulator.split(/\s+/).filter(Boolean).length;
      speechChunks.push({
        id: `chunk-${chunkIndex}`,
        text: currentAccumulator,
        index: chunkIndex,
        wordCount: words,
        charStart: charCursor,
        charEnd: charCursor + currentAccumulator.length,
        isDialogue: isQuote || /^["'“‘]/.test(currentAccumulator),
      });
      charCursor += currentAccumulator.length + 1;
      chunkIndex++;
      currentAccumulator = '';
    }
  }

  const fullPlainText = blocks.map(b => b.text).join('\n\n');
  const totalWords = speechChunks.reduce((acc, c) => acc + c.wordCount, 0);

  return {
    chunks: speechChunks,
    totalWords,
    totalChars: fullPlainText.length,
    fullPlainText,
  };
}
