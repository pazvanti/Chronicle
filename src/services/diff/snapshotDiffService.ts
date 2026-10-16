/**
 * Semantic Paragraph & Block Diff Engine for Story Chapters
 * Provides Git-like side-by-side comparison, intra-paragraph word diffing,
 * and 1-click cherry-picking / merging from snapshots into the active manuscript.
 */

export interface ChapterContentBlock {
  id: string;
  tag: string;
  html: string;
  text: string;
  index: number;
}

export interface WordDiffChunk {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

export interface IntraParagraphChange {
  id: string;
  type: 'replacement' | 'added' | 'removed';
  removedText: string;
  addedText: string;
  displayText: string;
}

export interface ParagraphSegment {
  isChange: boolean;
  equalText?: string;
  removedText?: string;
  addedText?: string;
  change?: IntraParagraphChange;
}

export interface DiffRow {
  id: string;
  type: 'equal' | 'modified' | 'added' | 'removed';
  leftBlock?: ChapterContentBlock;   // Current working version block (if present)
  rightBlock?: ChapterContentBlock;  // Snapshot version block (if present)
  leftIndex?: number;                // 1-based paragraph/line number
  rightIndex?: number;               // 1-based paragraph/line number
  wordDiff?: WordDiffChunk[];        // Word-level diff when modified
}

export interface ChapterDiffSummary {
  chapterId: string;
  title: string;
  status: 'identical' | 'modified' | 'added_in_snapshot' | 'deleted_in_snapshot';
  diffRows: DiffRow[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  currentWordCount: number;
  snapshotWordCount: number;
  wordCountDelta: number;
}

/**
 * Parses chapter HTML into an array of semantic blocks (<p>, <h1>-<h6>, <blockquote>, etc.)
 */
export function extractChapterBlocks(html: string): ChapterContentBlock[] {
  if (!html || !html.trim()) return [];

  if (typeof document !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const root = doc.body;

    // Direct children
    const elements = Array.from(root.children);
    if (elements.length > 0) {
      return elements.map((el, index) => {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent?.trim() || '';
        return {
          id: `block-${index}-${Math.abs(hashString(text))}`,
          tag,
          html: el.outerHTML,
          text,
          index,
        };
      });
    }

    // If loose text without block tags, wrap by paragraphs
    const paragraphs = root.innerHTML
      .split(/\n\s*\n|<br\s*\/?>\s*<br\s*\/?>/i)
      .map(p => p.trim())
      .filter(Boolean);

    return paragraphs.map((p, index) => {
      const temp = document.createElement('div');
      temp.innerHTML = p;
      const text = temp.textContent?.trim() || '';
      const wrappedHtml = p.startsWith('<') ? p : `<p>${p}</p>`;
      return {
        id: `block-${index}-${Math.abs(hashString(text))}`,
        tag: 'p',
        html: wrappedHtml,
        text,
        index,
      };
    });
  }

  // Fallback regex parser
  const blockRegex = /<(p|h[1-6]|blockquote|div|li)[^>]*>(.*?)<\/\1>/gis;
  const blocks: ChapterContentBlock[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const rawHtml = match[0];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    blocks.push({
      id: `block-${index}-${Math.abs(hashString(text))}`,
      tag,
      html: rawHtml,
      text,
      index,
    });
    index++;
  }

  if (blocks.length === 0) {
    const clean = html.replace(/<[^>]*>/g, ' ').trim();
    if (clean) {
      blocks.push({
        id: `block-0-${Math.abs(hashString(clean))}`,
        tag: 'p',
        html: `<p>${clean}</p>`,
        text: clean,
        index: 0,
      });
    }
  }

  return blocks;
}

/**
 * Reconstructs chapter HTML from an array of blocks
 */
export function reconstructChapterHtml(blocks: ChapterContentBlock[]): string {
  return blocks.map(b => b.html).join('\n');
}

/**
 * Fast hash for string identity
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Calculates similarity coefficient between two strings (0.0 to 1.0)
 */
export function calculateTextSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wordsB = b.toLowerCase().split(/\s+/).filter(Boolean);
  if (wordsA.length === 0 && wordsB.length === 0) return 1.0;
  if (wordsA.length === 0 || wordsB.length === 0) return 0.0;

  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of wordsA) {
    if (setB.has(w)) intersection++;
  }

  return (2 * intersection) / (wordsA.length + wordsB.length);
}

/**
 * Word-level Myers / LCS diffing within modified paragraphs with prefix/suffix trimming
 */
export function computeWordDiff(oldText: string, newText: string): WordDiffChunk[] {
  if (oldText === newText) {
    return oldText ? [{ type: 'equal', text: oldText }] : [];
  }
  if (!oldText) {
    return newText ? [{ type: 'added', text: newText }] : [];
  }
  if (!newText) {
    return oldText ? [{ type: 'removed', text: oldText }] : [];
  }

  // Tokenize words and punctuation
  const tokenize = (str: string) => str.match(/\w+|[^\w\s]+|\s+/g) || [];
  const words1 = tokenize(oldText);
  const words2 = tokenize(newText);

  const n = words1.length;
  const m = words2.length;

  // 1. Prefix trimming
  let start = 0;
  while (start < n && start < m && words1[start] === words2[start]) {
    start++;
  }

  // 2. Suffix trimming
  let end1 = n - 1;
  let end2 = m - 1;
  while (end1 >= start && end2 >= start && words1[end1] === words2[end2]) {
    end1--;
    end2--;
  }

  const rawChunks: WordDiffChunk[] = [];

  // Prefix equal chunks
  for (let k = 0; k < start; k++) {
    rawChunks.push({ type: 'equal', text: words1[k] });
  }

  // Middle diff
  const mid1 = words1.slice(start, end1 + 1);
  const mid2 = words2.slice(start, end2 + 1);
  const midN = mid1.length;
  const midM = mid2.length;

  if (midN > 0 || midM > 0) {
    if (midN === 0) {
      for (const w of mid2) rawChunks.push({ type: 'added', text: w });
    } else if (midM === 0) {
      for (const w of mid1) rawChunks.push({ type: 'removed', text: w });
    } else {
      // LCS Matrix on trimmed middle
      const dp: number[][] = Array.from({ length: midN + 1 }, () => new Array(midM + 1).fill(0));
      for (let i = 1; i <= midN; i++) {
        for (let j = 1; j <= midM; j++) {
          if (mid1[i - 1] === mid2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      // Backtrack
      let i = midN;
      let j = midM;
      const midChunks: WordDiffChunk[] = [];

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && mid1[i - 1] === mid2[j - 1]) {
          midChunks.push({ type: 'equal', text: mid1[i - 1] });
          i--;
          j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          midChunks.push({ type: 'added', text: mid2[j - 1] });
          j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
          midChunks.push({ type: 'removed', text: mid1[i - 1] });
          i--;
        }
      }

      midChunks.reverse();
      for (const chunk of midChunks) {
        rawChunks.push(chunk);
      }
    }
  }

  // Suffix equal chunks
  const suffixLen = n - 1 - end1;
  for (let k = 0; k < suffixLen; k++) {
    rawChunks.push({ type: 'equal', text: words1[end1 + 1 + k] });
  }

  // Consolidate adjacent chunks of identical type
  const consolidated: WordDiffChunk[] = [];
  for (const chunk of rawChunks) {
    if (consolidated.length > 0 && consolidated[consolidated.length - 1].type === chunk.type) {
      consolidated[consolidated.length - 1].text += chunk.text;
    } else {
      consolidated.push({ ...chunk });
    }
  }

  return consolidated;
}

/**
 * Computes block-level diff rows between current manuscript blocks and snapshot blocks with prefix/suffix trimming
 */
export function computeBlockDiffRows(
  currentBlocks: ChapterContentBlock[],
  snapshotBlocks: ChapterContentBlock[]
): DiffRow[] {
  const n = currentBlocks.length;
  const m = snapshotBlocks.length;

  if (n === 0 && m === 0) return [];

  // 1. Prefix trimming
  let start = 0;
  while (start < n && start < m && currentBlocks[start].text === snapshotBlocks[start].text) {
    start++;
  }

  // 2. Suffix trimming
  let endCur = n - 1;
  let endSnap = m - 1;
  while (endCur >= start && endSnap >= start && currentBlocks[endCur].text === snapshotBlocks[endSnap].text) {
    endCur--;
    endSnap--;
  }

  const rows: DiffRow[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;
  let rowIdx = 0;

  // Add prefix equal rows
  for (let k = 0; k < start; k++) {
    rows.push({
      id: `diff-row-${rowIdx++}`,
      type: 'equal',
      leftBlock: currentBlocks[k],
      rightBlock: snapshotBlocks[k],
      leftIndex: leftLineNum++,
      rightIndex: rightLineNum++,
    });
  }

  // Middle trimmed sub-arrays
  const midCur = currentBlocks.slice(start, endCur + 1);
  const midSnap = snapshotBlocks.slice(start, endSnap + 1);
  const midN = midCur.length;
  const midM = midSnap.length;

  if (midN > 0 || midM > 0) {
    if (midN === 0) {
      for (const b of midSnap) {
        rows.push({
          id: `diff-row-${rowIdx++}`,
          type: 'added',
          rightBlock: b,
          rightIndex: rightLineNum++,
        });
      }
    } else if (midM === 0) {
      for (const b of midCur) {
        rows.push({
          id: `diff-row-${rowIdx++}`,
          type: 'removed',
          leftBlock: b,
          leftIndex: leftLineNum++,
        });
      }
    } else {
      // DP table scoring block matches on middle slice only
      const scoreMatrix: number[][] = Array.from({ length: midN + 1 }, () => new Array(midM + 1).fill(0));

      for (let i = 1; i <= midN; i++) {
        for (let j = 1; j <= midM; j++) {
          const b1 = midCur[i - 1];
          const b2 = midSnap[j - 1];

          if (b1.text === b2.text) {
            scoreMatrix[i][j] = scoreMatrix[i - 1][j - 1] + 3;
          } else {
            const sim = calculateTextSimilarity(b1.text, b2.text);
            if (sim >= 0.45) {
              scoreMatrix[i][j] = scoreMatrix[i - 1][j - 1] + 2;
            } else {
              scoreMatrix[i][j] = Math.max(scoreMatrix[i - 1][j], scoreMatrix[i][j - 1]);
            }
          }
        }
      }

      // Backtrack to construct aligned pairs
      let i = midN;
      let j = midM;
      const rawPairs: Array<{ left?: ChapterContentBlock; right?: ChapterContentBlock }> = [];

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
          const b1 = midCur[i - 1];
          const b2 = midSnap[j - 1];
          const sim = calculateTextSimilarity(b1.text, b2.text);

          if (b1.text === b2.text || sim >= 0.45) {
            rawPairs.push({ left: b1, right: b2 });
            i--;
            j--;
            continue;
          }
        }

        if (j > 0 && (i === 0 || scoreMatrix[i][j - 1] >= scoreMatrix[i - 1][j])) {
          rawPairs.push({ right: midSnap[j - 1] });
          j--;
        } else if (i > 0 && (j === 0 || scoreMatrix[i][j - 1] < scoreMatrix[i - 1][j])) {
          rawPairs.push({ left: midCur[i - 1] });
          i--;
        }
      }

      rawPairs.reverse();

      for (let idx = 0; idx < rawPairs.length; idx++) {
        const pair = rawPairs[idx];
        const rowId = `diff-row-${rowIdx++}`;

        if (pair.left && pair.right) {
          if (pair.left.text === pair.right.text) {
            rows.push({
              id: rowId,
              type: 'equal',
              leftBlock: pair.left,
              rightBlock: pair.right,
              leftIndex: leftLineNum++,
              rightIndex: rightLineNum++,
            });
          } else {
            const wordDiff = computeWordDiff(pair.left.text, pair.right.text);
            rows.push({
              id: rowId,
              type: 'modified',
              leftBlock: pair.left,
              rightBlock: pair.right,
              leftIndex: leftLineNum++,
              rightIndex: rightLineNum++,
              wordDiff,
            });
          }
        } else if (pair.left && !pair.right) {
          rows.push({
            id: rowId,
            type: 'removed',
            leftBlock: pair.left,
            leftIndex: leftLineNum++,
          });
        } else if (!pair.left && pair.right) {
          rows.push({
            id: rowId,
            type: 'added',
            rightBlock: pair.right,
            rightIndex: rightLineNum++,
          });
        }
      }
    }
  }

  // Add suffix equal rows
  const suffixLen = n - 1 - endCur;
  for (let k = 0; k < suffixLen; k++) {
    const curIdx = endCur + 1 + k;
    const snapIdx = endSnap + 1 + k;
    rows.push({
      id: `diff-row-${rowIdx++}`,
      type: 'equal',
      leftBlock: currentBlocks[curIdx],
      rightBlock: snapshotBlocks[snapIdx],
      leftIndex: leftLineNum++,
      rightIndex: rightLineNum++,
    });
  }

  return rows;
}

/**
 * Calculates complete diff summary for a chapter
 */
export function computeChapterDiffSummary(
  chapterId: string,
  title: string,
  currentHtml: string | undefined,
  snapshotHtml: string | undefined
): ChapterDiffSummary {
  const hasCurrent = currentHtml !== undefined;
  const hasSnapshot = snapshotHtml !== undefined;

  // 1. Fast-path: Both missing
  if (!hasCurrent && !hasSnapshot) {
    return {
      chapterId,
      title,
      status: 'identical',
      diffRows: [],
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      currentWordCount: 0,
      snapshotWordCount: 0,
      wordCountDelta: 0,
    };
  }

  // 2. Fast-path: Identical HTML content
  if (hasCurrent && hasSnapshot && currentHtml === snapshotHtml) {
    const blocks = extractChapterBlocks(currentHtml!);
    const words = blocks.reduce((acc, b) => acc + countWords(b.text), 0);
    const diffRows: DiffRow[] = blocks.map((b, idx) => ({
      id: `diff-row-${idx}`,
      type: 'equal',
      leftBlock: b,
      rightBlock: b,
      leftIndex: idx + 1,
      rightIndex: idx + 1,
    }));
    return {
      chapterId,
      title,
      status: 'identical',
      diffRows,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      currentWordCount: words,
      snapshotWordCount: words,
      wordCountDelta: 0,
    };
  }

  const currentBlocks = hasCurrent ? extractChapterBlocks(currentHtml!) : [];
  const snapshotBlocks = hasSnapshot ? extractChapterBlocks(snapshotHtml!) : [];

  const currentWords = currentBlocks.reduce((acc, b) => acc + countWords(b.text), 0);
  const snapshotWords = snapshotBlocks.reduce((acc, b) => acc + countWords(b.text), 0);

  if (!hasCurrent && hasSnapshot) {
    const diffRows: DiffRow[] = snapshotBlocks.map((b, idx) => ({
      id: `diff-added-${idx}`,
      type: 'added',
      rightBlock: b,
      rightIndex: idx + 1,
    }));
    return {
      chapterId,
      title,
      status: 'added_in_snapshot',
      diffRows,
      addedCount: snapshotBlocks.length,
      removedCount: 0,
      modifiedCount: 0,
      currentWordCount: 0,
      snapshotWordCount: snapshotWords,
      wordCountDelta: snapshotWords,
    };
  }

  if (hasCurrent && !hasSnapshot) {
    const diffRows: DiffRow[] = currentBlocks.map((b, idx) => ({
      id: `diff-removed-${idx}`,
      type: 'removed',
      leftBlock: b,
      leftIndex: idx + 1,
    }));
    return {
      chapterId,
      title,
      status: 'deleted_in_snapshot',
      diffRows,
      addedCount: 0,
      removedCount: currentBlocks.length,
      modifiedCount: 0,
      currentWordCount: currentWords,
      snapshotWordCount: 0,
      wordCountDelta: -currentWords,
    };
  }

  const diffRows = computeBlockDiffRows(currentBlocks, snapshotBlocks);
  const addedCount = diffRows.filter(r => r.type === 'added').length;
  const removedCount = diffRows.filter(r => r.type === 'removed').length;
  const modifiedCount = diffRows.filter(r => r.type === 'modified').length;

  const status =
    addedCount === 0 && removedCount === 0 && modifiedCount === 0
      ? 'identical'
      : 'modified';

  return {
    chapterId,
    title,
    status,
    diffRows,
    addedCount,
    removedCount,
    modifiedCount,
    currentWordCount: currentWords,
    snapshotWordCount: snapshotWords,
    wordCountDelta: snapshotWords - currentWords,
  };
}

/**
 * 1-Click Cherry-Pick / Move Operation:
 * Applies a specific DiffRow from the snapshot into the current chapter HTML.
 * - If modified: replaces current block with snapshot block.
 * - If added (in snapshot): inserts snapshot block at corresponding position in current.
 * - If removed (absent in snapshot): removes current block from current.
 */
export function applyDiffRowToCurrentHtml(
  currentHtml: string,
  diffRows: DiffRow[],
  targetRowId: string
): string {
  const targetRow = diffRows.find(r => r.id === targetRowId);
  if (!targetRow) return currentHtml;

  const currentBlocks = extractChapterBlocks(currentHtml);

  if (targetRow.type === 'modified' && targetRow.leftBlock && targetRow.rightBlock) {
    const updated = currentBlocks.map(b =>
      b.id === targetRow.leftBlock!.id || b.text === targetRow.leftBlock!.text
        ? { ...targetRow.rightBlock!, id: b.id }
        : b
    );
    return reconstructChapterHtml(updated);
  }

  if (targetRow.type === 'added' && targetRow.rightBlock) {
    // Determine insertion position based on neighboring rows
    const rowIndex = diffRows.findIndex(r => r.id === targetRowId);
    let insertAfterBlockId: string | null = null;

    // Search backwards for the nearest row that has a leftBlock
    for (let k = rowIndex - 1; k >= 0; k--) {
      if (diffRows[k].leftBlock) {
        insertAfterBlockId = diffRows[k].leftBlock!.id;
        break;
      }
    }

    if (insertAfterBlockId) {
      const insertIndex = currentBlocks.findIndex(b => b.id === insertAfterBlockId);
      if (insertIndex !== -1) {
        const next = [...currentBlocks];
        next.splice(insertIndex + 1, 0, targetRow.rightBlock);
        return reconstructChapterHtml(next);
      }
    }

    // Otherwise append or prepend
    return reconstructChapterHtml([targetRow.rightBlock, ...currentBlocks]);
  }

  if (targetRow.type === 'removed' && targetRow.leftBlock) {
    const updated = currentBlocks.filter(
      b => b.id !== targetRow.leftBlock!.id && b.text !== targetRow.leftBlock!.text
    );
    return reconstructChapterHtml(updated);
  }

  return currentHtml;
}

/**
 * Helper to count words
 */
function countWords(str: string): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Groups raw word diff chunks into coherent change hunks / segments for UI display and cherry-picking
 */
export function buildParagraphSegments(wordDiff: WordDiffChunk[], rowId: string): ParagraphSegment[] {
  const segments: ParagraphSegment[] = [];
  let changeCounter = 0;
  let idx = 0;

  while (idx < wordDiff.length) {
    const current = wordDiff[idx];

    if (current.type === 'equal') {
      segments.push({
        isChange: false,
        equalText: current.text,
      });
      idx++;
      continue;
    }

    // It's a non-equal chunk (added or removed)
    let removedText = '';
    let addedText = '';

    if (current.type === 'removed') {
      removedText = current.text;
      idx++;
      if (idx < wordDiff.length && wordDiff[idx].type === 'added') {
        addedText = wordDiff[idx].text;
        idx++;
      }
    } else if (current.type === 'added') {
      addedText = current.text;
      idx++;
      if (idx < wordDiff.length && wordDiff[idx].type === 'removed') {
        removedText = wordDiff[idx].text;
        idx++;
      }
    }

    const changeId = `${rowId}-change-${changeCounter++}`;
    let changeType: 'replacement' | 'added' | 'removed' = 'replacement';
    if (removedText && !addedText) changeType = 'removed';
    else if (!removedText && addedText) changeType = 'added';

    const rawDisplay = (addedText || removedText).trim();
    const displayText = rawDisplay.length > 25 ? rawDisplay.slice(0, 22) + '...' : rawDisplay;

    segments.push({
      isChange: true,
      removedText,
      addedText,
      change: {
        id: changeId,
        type: changeType,
        removedText,
        addedText,
        displayText,
      },
    });
  }

  return segments;
}

/**
 * Updates a block's inner text while preserving its tag and attributes.
 */
export function updateBlockText(blockHtml: string, newText: string, tag: string): string {
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = blockHtml;
    const el = temp.firstElementChild;
    if (el) {
      el.textContent = newText;
      return el.outerHTML;
    }
  }

  const openTagMatch = blockHtml.match(/^<([a-z0-9]+)[^>]*>/i);
  if (openTagMatch) {
    const openTag = openTagMatch[0];
    const tagName = openTagMatch[1];
    return `${openTag}${escapeHtml(newText)}</${tagName}>`;
  }
  return `<${tag}>${escapeHtml(newText)}</${tag}>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 1-Click Move for a single intra-paragraph change (word or group of words):
 * Applies only this specific change hunk from the snapshot into the current block HTML.
 */
export function applyIntraParagraphChangeToCurrentHtml(
  currentHtml: string,
  diffRows: DiffRow[],
  targetRowId: string,
  targetChangeId: string
): string {
  const targetRow = diffRows.find(r => r.id === targetRowId);
  if (!targetRow || !targetRow.leftBlock || !targetRow.rightBlock || !targetRow.wordDiff) {
    return currentHtml;
  }

  const segments = buildParagraphSegments(targetRow.wordDiff, targetRow.id);
  const targetSegment = segments.find(s => s.isChange && s.change?.id === targetChangeId);
  if (!targetSegment || !targetSegment.change) return currentHtml;

  const updatedParagraphText = segments
    .map(seg => {
      if (!seg.isChange) {
        return seg.equalText || '';
      }
      if (seg.change?.id === targetChangeId) {
        // Apply snapshot version of this change hunk
        return seg.change.addedText || '';
      }
      // Keep current version for all other segments
      return seg.change?.removedText || '';
    })
    .join('');

  const currentBlocks = extractChapterBlocks(currentHtml);
  const updatedBlocks = currentBlocks.map(b => {
    if (b.id === targetRow.leftBlock!.id || b.text === targetRow.leftBlock!.text) {
      const updatedHtml = updateBlockText(b.html, updatedParagraphText, b.tag);
      return {
        ...b,
        text: updatedParagraphText,
        html: updatedHtml,
      };
    }
    return b;
  });

  return reconstructChapterHtml(updatedBlocks);
}

