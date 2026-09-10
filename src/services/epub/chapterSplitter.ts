import { EpubBook, EpubChapter, EpubManifestItem, EpubSpineItem, EpubTocItem } from '../../types/epub';
import { calculateWordCount, wrapInXhtml, restoreAssetUrls } from './htmlUtils';
import { getDirectory } from './pathUtils';

export interface SplitResult {
  updatedBook: EpubBook;
  originalChapterId: string;
  newChapterId: string;
}

/**
 * Splits a chapter at a given HTML position, DOM element, or text marker into two separate chapters.
 */
export function splitChapter(
  book: EpubBook,
  chapterId: string,
  splitContentPart1: string,
  splitContentPart2: string,
  newChapterTitle: string = 'New Chapter'
): SplitResult {
  const chapterIndex = book.chapters.findIndex(c => c.id === chapterId);
  if (chapterIndex === -1) {
    throw new Error(`Chapter with ID ${chapterId} not found`);
  }

  const currentChapter = book.chapters[chapterIndex];
  const dir = getDirectory(currentChapter.href);
  const baseName = currentChapter.href.substring(dir.length).replace(/\.[^/.]+$/, '');
  const ext = currentChapter.href.endsWith('.html') ? '.html' : '.xhtml';

  // Generate unique ID and file name
  const timestamp = Date.now().toString(36);
  const newId = `ch_${baseName}_${timestamp}`;
  const newHref = `${dir}${baseName}_part2_${timestamp}${ext}`;
  const newFullPath = `${getDirectory(currentChapter.fullPath)}${baseName}_part2_${timestamp}${ext}`;

  // Update Part 1 (Current Chapter)
  const part1WordCount = calculateWordCount(splitContentPart1);
  const updatedCurrentChapter: EpubChapter = {
    ...currentChapter,
    content: splitContentPart1,
    originalXhtml: wrapInXhtml(
      restoreAssetUrls(splitContentPart1, currentChapter.fullPath, book.assets),
      currentChapter.title
    ),
    wordCount: part1WordCount,
  };

  // Create Part 2 (New Chapter)
  const part2WordCount = calculateWordCount(splitContentPart2);
  const newChapter: EpubChapter = {
    id: newId,
    href: newHref,
    fullPath: newFullPath,
    title: newChapterTitle,
    content: splitContentPart2,
    originalXhtml: wrapInXhtml(
      restoreAssetUrls(splitContentPart2, newFullPath, book.assets),
      newChapterTitle
    ),
    order: currentChapter.order + 1,
    wordCount: part2WordCount,
  };

  // 1. Update Chapters array
  const updatedChapters = [...book.chapters];
  updatedChapters[chapterIndex] = updatedCurrentChapter;
  updatedChapters.splice(chapterIndex + 1, 0, newChapter);

  // Re-index order
  updatedChapters.forEach((ch, idx) => {
    ch.order = idx;
  });

  // 2. Update Manifest
  const newManifestItem: EpubManifestItem = {
    id: newId,
    href: newHref,
    fullPath: newFullPath,
    mediaType: 'application/xhtml+xml',
  };
  const updatedManifest = {
    ...book.manifest,
    [newId]: newManifestItem,
  };

  // 3. Update Spine
  const spineIndex = book.spine.findIndex(s => s.idref === chapterId);
  const updatedSpine: EpubSpineItem[] = [...book.spine];
  const newSpineItem: EpubSpineItem = { idref: newId };
  if (spineIndex !== -1) {
    updatedSpine.splice(spineIndex + 1, 0, newSpineItem);
  } else {
    updatedSpine.push(newSpineItem);
  }

  // 4. Update TOC
  const newTocItem: EpubTocItem = {
    id: `toc-${newId}`,
    title: newChapterTitle,
    href: newHref,
    chapterId: newId,
    level: 1,
  };
  const updatedToc = insertIntoToc(book.toc, chapterId, newTocItem);

  return {
    updatedBook: {
      ...book,
      chapters: updatedChapters,
      manifest: updatedManifest,
      spine: updatedSpine,
      toc: updatedToc,
    },
    originalChapterId: chapterId,
    newChapterId: newId,
  };
}

/**
 * Splits chapter DOM right before a chosen heading or element index
 */
export function splitChapterAtHeadingIndex(
  book: EpubBook,
  chapterId: string,
  headingIndex: number,
  newChapterTitle?: string
): SplitResult {
  const chapter = book.chapters.find(c => c.id === chapterId);
  if (!chapter) throw new Error('Chapter not found');

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${chapter.content}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) throw new Error('Could not parse chapter body');

  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  if (headingIndex < 0 || headingIndex >= headings.length) {
    throw new Error('Invalid heading index');
  }

  const targetHeading = headings[headingIndex];
  const detectedTitle = newChapterTitle || targetHeading.textContent?.trim() || 'New Chapter';

  // Find all top-level elements and split at the element containing the heading
  let splitPointEl: Node | null = targetHeading;
  while (splitPointEl && splitPointEl.parentNode && splitPointEl.parentNode !== container) {
    splitPointEl = splitPointEl.parentNode;
  }

  if (!splitPointEl) {
    throw new Error('Could not locate split element in container');
  }

  const part1Container = document.createElement('div');
  const part2Container = document.createElement('div');
  let reachedSplit = false;

  Array.from(container.childNodes).forEach(child => {
    if (child === splitPointEl) {
      reachedSplit = true;
    }
    if (!reachedSplit) {
      part1Container.appendChild(child.cloneNode(true));
    } else {
      part2Container.appendChild(child.cloneNode(true));
    }
  });

  return splitChapter(
    book,
    chapterId,
    part1Container.innerHTML,
    part2Container.innerHTML,
    detectedTitle
  );
}

/**
 * Splits chapter at a specific text selection or search snippet
 */
export function splitChapterAtText(
  book: EpubBook,
  chapterId: string,
  splitText: string,
  newChapterTitle: string = 'New Chapter'
): SplitResult {
  const chapter = book.chapters.find(c => c.id === chapterId);
  if (!chapter) throw new Error('Chapter not found');

  const idx = chapter.content.indexOf(splitText);
  if (idx === -1) {
    throw new Error('Split marker text not found in chapter content');
  }

  const part1 = chapter.content.substring(0, idx);
  const part2 = chapter.content.substring(idx);

  return splitChapter(book, chapterId, part1, part2, newChapterTitle);
}

/**
 * Helper to insert a new TOC item right after the item corresponding to currentChapterId
 */
function insertIntoToc(tocList: EpubTocItem[], currentChapterId: string, newItem: EpubTocItem): EpubTocItem[] {
  const result: EpubTocItem[] = [];
  let inserted = false;

  for (const item of tocList) {
    result.push(item);
    if (!inserted && (item.chapterId === currentChapterId || item.id === currentChapterId)) {
      result.push(newItem);
      inserted = true;
    }
    if (item.children) {
      item.children = insertIntoToc(item.children, currentChapterId, newItem);
    }
  }

  if (!inserted) {
    result.push(newItem);
  }

  return result;
}
