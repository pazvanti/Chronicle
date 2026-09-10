import jsPDF from 'jspdf';
import { EpubBook } from '../../types/epub';

export interface PdfBookOptions {
  trimSize?: '6x9' | '5.5x8.5' | 'a4' | 'letter';
  fontFamily?: 'times' | 'helvetica';
  fontSize?: number;        // default 10.5 pt
  lineHeightRatio?: number; // default 1.48
  firstLineIndent?: boolean; // default true (18pt)
  runningHeaders?: boolean;  // default true
  pageNumbers?: boolean;     // default true
  includeCover?: boolean;    // default true
}

type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'p'
  | 'blockquote'
  | 'scene_break'
  | 'list_item';

interface TextBlock {
  type: BlockType;
  text: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

interface PageDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentWidth: number;
  contentHeight: number;
}

/**
 * Returns page dimensions in points (72 pt per inch)
 */
function getPageDimensions(trimSize: '6x9' | '5.5x8.5' | 'a4' | 'letter' = '6x9'): PageDimensions {
  let width: number;
  let height: number;
  let marginTop: number;
  let marginBottom: number;
  let marginLeft: number;
  let marginRight: number;

  switch (trimSize) {
    case '6x9': // Standard Amazon KDP Trade Paperback (6 in x 9 in)
      width = 432;
      height = 648;
      marginTop = 50;
      marginBottom = 50;
      marginLeft = 46;
      marginRight = 46;
      break;
    case '5.5x8.5': // Digest Paperback (5.5 in x 8.5 in)
      width = 396;
      height = 612;
      marginTop = 48;
      marginBottom = 48;
      marginLeft = 44;
      marginRight = 44;
      break;
    case 'letter': // US Letter (8.5 in x 11 in)
      width = 612;
      height = 792;
      marginTop = 58;
      marginBottom = 58;
      marginLeft = 54;
      marginRight = 54;
      break;
    case 'a4': // Standard A4 (210mm x 297mm)
    default:
      width = 595.28;
      height = 841.89;
      marginTop = 58;
      marginBottom = 58;
      marginLeft = 54;
      marginRight = 54;
      break;
  }

  return {
    width,
    height,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    contentWidth: width - (marginLeft + marginRight),
    contentHeight: height - (marginTop + marginBottom),
  };
}

/**
 * Parses chapter HTML content into clean structural text blocks
 */
function extractBlocksFromHtml(html: string): TextBlock[] {
  if (!html || !html.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return [];

  const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, hr, li');
  const blocks: TextBlock[] = [];

  if (elements.length === 0) {
    const rawText = container.textContent || '';
    const rawParagraphs = rawText.split(/\n\s*\n/);
    for (const p of rawParagraphs) {
      const clean = p.replace(/\s+/g, ' ').trim();
      if (clean) blocks.push({ type: 'p', text: clean });
    }
    return blocks;
  }

  elements.forEach(el => {
    // Avoid double-processing children of blockquotes or lists
    if (el.parentElement && (el.parentElement.tagName.toLowerCase() === 'blockquote' || el.parentElement.tagName.toLowerCase() === 'li')) {
      return;
    }

    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();

    if (tag === 'hr' || text === '* * *' || text === '***' || text === '###' || text === '---') {
      blocks.push({ type: 'scene_break', text: '*   *   *' });
      return;
    }

    if (!text) return;

    const htmlEl = el as HTMLElement;
    const rawAlign = (htmlEl.style?.textAlign || htmlEl.getAttribute('align') || '').toLowerCase();
    let align: 'left' | 'center' | 'right' | 'justify' | undefined;
    if (rawAlign === 'center' || rawAlign === 'right' || rawAlign === 'justify') {
      align = rawAlign as 'center' | 'right' | 'justify';
    }

    if (tag === 'h1') {
      blocks.push({ type: 'h1', text, align });
    } else if (tag === 'h2') {
      blocks.push({ type: 'h2', text, align });
    } else if (tag.startsWith('h')) {
      blocks.push({ type: 'h3', text, align });
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'blockquote', text, align });
    } else if (tag === 'li') {
      blocks.push({ type: 'list_item', text, align });
    } else {
      blocks.push({ type: 'p', text, align });
    }
  });

  return blocks;
}

/**
 * Loads image from data URL or blob URL safely
 */
async function loadImageDataUrl(
  url: string
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG'; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const isPng = url.startsWith('data:image/png') || url.toLowerCase().endsWith('.png');
    const format = isPng ? 'PNG' : 'JPEG';
    const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.95);
    return { dataUrl, format, width: w, height: h };
  } catch (err) {
    console.warn('PDF Cover Image loading failed:', err);
    return null;
  }
}

/**
 * Wraps text considering first line indent
 */
function wrapParagraphLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  indent: number
): Array<{ line: string; xOffset: number }> {
  if (indent <= 0) {
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    return lines.map((line: string) => ({ line, xOffset: 0 }));
  }

  const words = text.split(' ');
  const firstLineWords: string[] = [];
  let remainingWords: string[] = [];
  let testStr = '';

  for (let i = 0; i < words.length; i++) {
    const nextTest = testStr ? `${testStr} ${words[i]}` : words[i];
    if (doc.getTextWidth(nextTest) <= maxWidth - indent) {
      testStr = nextTest;
      firstLineWords.push(words[i]);
    } else {
      remainingWords = words.slice(i);
      break;
    }
  }

  if (firstLineWords.length === 0 && words.length > 0) {
    firstLineWords.push(words[0]);
    remainingWords = words.slice(1);
  }

  const result: Array<{ line: string; xOffset: number }> = [
    { line: firstLineWords.join(' '), xOffset: indent },
  ];

  if (remainingWords.length > 0) {
    const restText = remainingWords.join(' ');
    const restLines = doc.splitTextToSize(restText, maxWidth) as string[];
    for (const l of restLines) {
      result.push({ line: l, xOffset: 0 });
    }
  }

  return result;
}

/**
 * Formats clean keyword title for running headers
 */
function getHeaderTitle(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  return words || 'Book';
}

/**
 * Core Book Typesetting Engine
 * Generates a publication-grade vector text PDF using direct jsPDF text operators.
 */
export async function generateVectorPdf(
  book: EpubBook,
  options: PdfBookOptions = {}
): Promise<jsPDF> {
  const meta = book.metadata;
  const trimSize = options.trimSize || '6x9';
  const fontFamily = options.fontFamily || 'times';
  const fontSize = options.fontSize || (trimSize === 'a4' || trimSize === 'letter' ? 11 : 10.5);
  const lineHeightRatio = options.lineHeightRatio || 1.48;
  const bodyLineHeight = fontSize * lineHeightRatio;
  const useIndent = options.firstLineIndent !== false;
  const indentSize = useIndent ? 18 : 0;
  const includeRunningHeaders = options.runningHeaders !== false;
  const includePageNumbers = options.pageNumbers !== false;
  const includeCover = options.includeCover !== false;

  const dims = getPageDimensions(trimSize);

  // Initialize jsPDF document with exact page dimensions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [dims.width, dims.height],
  });

  const bookTitle = meta.title || 'Untitled Book';
  const authorName = meta.creator || 'Unknown Author';
  const shortBookTitle = getHeaderTitle(bookTitle);

  // Track pages that are chapter openings or title/cover pages where running headers should be omitted
  const headerSuppressedPages = new Set<number>();
  // Track chapter titles for running headers on odd pages
  const pageChapterMap = new Map<number, string>();

  let currentPage = 1;

  // -------------------------------------------------------------
  // 1. FRONT COVER PAGE (Optional)
  // -------------------------------------------------------------
  if (includeCover && book.coverImageUrl) {
    const coverData = await loadImageDataUrl(book.coverImageUrl);
    if (coverData) {
      headerSuppressedPages.add(currentPage);

      const maxCoverWidth = dims.contentWidth * 0.92;
      const maxCoverHeight = dims.contentHeight * 0.85;

      const imgAspect = coverData.width / coverData.height;
      let drawW = maxCoverWidth;
      let drawH = drawW / imgAspect;

      if (drawH > maxCoverHeight) {
        drawH = maxCoverHeight;
        drawW = drawH * imgAspect;
      }

      const drawX = (dims.width - drawW) / 2;
      const drawY = (dims.height - drawH) / 2;

      doc.addImage(coverData.dataUrl, coverData.format, drawX, drawY, drawW, drawH);

      doc.addPage([dims.width, dims.height]);
      currentPage++;
    }
  }

  // -------------------------------------------------------------
  // 2. TITLE PAGE (Half-Title / Full Title)
  // -------------------------------------------------------------
  headerSuppressedPages.add(currentPage);

  const titlePageY = dims.height * 0.32;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(20, 24, 33);

  // Split title if long
  const titleLines = doc.splitTextToSize(bookTitle, dims.contentWidth - 40);
  doc.text(titleLines, dims.width / 2, titlePageY, { align: 'center' });

  const authorY = titlePageY + titleLines.length * 28 + 24;
  doc.setFont(fontFamily, 'italic');
  doc.setFontSize(13);
  doc.setTextColor(70, 80, 95);
  doc.text(`by ${authorName}`, dims.width / 2, authorY, { align: 'center' });

  // Optional decorative rule
  const ruleY = authorY + 28;
  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.75);
  doc.line(dims.width / 2 - 35, ruleY, dims.width / 2 + 35, ruleY);

  // Publisher / date near bottom
  if (meta.publisher || meta.pubdate) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 150, 165);
    const pubText = [meta.publisher, meta.pubdate].filter(Boolean).join(' • ');
    doc.text(pubText.toUpperCase(), dims.width / 2, dims.height - dims.marginBottom - 20, {
      align: 'center',
    });
  }

  // -------------------------------------------------------------
  // 3. CHAPTERS TYPESETTING
  // -------------------------------------------------------------
  const chapters = book.chapters || [];

  for (let chIndex = 0; chIndex < chapters.length; chIndex++) {
    const chapter = chapters[chIndex];
    const chapterTitle = chapter.title || `Chapter ${chIndex + 1}`;
    const shortChTitle = getHeaderTitle(chapterTitle);

    // Each chapter begins on a fresh new page
    doc.addPage([dims.width, dims.height]);
    currentPage++;
    headerSuppressedPages.add(currentPage);
    pageChapterMap.set(currentPage, shortChTitle);

    // Chapter Header with traditional book top-drop (~90pt from top margin)
    let currentY = dims.marginTop + 65;

    // Chapter Title
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);

    const chTitleLines = doc.splitTextToSize(chapterTitle, dims.contentWidth);
    doc.text(chTitleLines, dims.width / 2, currentY, { align: 'center' });
    currentY += chTitleLines.length * 22 + 18;

    // Small decorative ornament below chapter title
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 160, 175);
    doc.text('~ • ~', dims.width / 2, currentY, { align: 'center' });
    currentY += 28;

    // Extract blocks for this chapter
    const blocks = extractBlocksFromHtml(chapter.content);

    // State to track first paragraph after heading or break (no indent convention)
    let isFirstParaAfterBreak = true;

    for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
      const block = blocks[bIndex];

      switch (block.type) {
        case 'h1':
        case 'h2': {
          // Subheading orphan protection: requires room for heading + 2 lines of text
          const headingFontSize = block.type === 'h1' ? 14 : 12.5;
          const headingLeading = headingFontSize * 1.4;
          const spaceBefore = 22;
          const spaceAfter = 10;
          const requiredHeight = spaceBefore + headingLeading + spaceAfter + bodyLineHeight * 2;

          if (currentY + requiredHeight > dims.height - dims.marginBottom) {
            doc.addPage([dims.width, dims.height]);
            currentPage++;
            pageChapterMap.set(currentPage, shortChTitle);
            currentY = dims.marginTop + 20;
          } else {
            currentY += spaceBefore;
          }

          doc.setFont(fontFamily, 'bold');
          doc.setFontSize(headingFontSize);
          doc.setTextColor(20, 25, 35);

          const hLines = doc.splitTextToSize(block.text, dims.contentWidth);
          if (block.align === 'center') {
            doc.text(hLines, dims.marginLeft + dims.contentWidth / 2, currentY, { align: 'center' });
          } else if (block.align === 'right') {
            doc.text(hLines, dims.marginLeft + dims.contentWidth, currentY, { align: 'right' });
          } else {
            doc.text(hLines, dims.marginLeft, currentY);
          }
          currentY += hLines.length * headingLeading + spaceAfter;

          isFirstParaAfterBreak = true;
          break;
        }

        case 'h3': {
          const headingFontSize = 11;
          const headingLeading = 15;
          const spaceBefore = 16;
          const spaceAfter = 8;
          const requiredHeight = spaceBefore + headingLeading + spaceAfter + bodyLineHeight * 2;

          if (currentY + requiredHeight > dims.height - dims.marginBottom) {
            doc.addPage([dims.width, dims.height]);
            currentPage++;
            pageChapterMap.set(currentPage, shortChTitle);
            currentY = dims.marginTop + 20;
          } else {
            currentY += spaceBefore;
          }

          doc.setFont(fontFamily, 'bolditalic');
          doc.setFontSize(headingFontSize);
          doc.setTextColor(30, 41, 59);

          const hLines = doc.splitTextToSize(block.text, dims.contentWidth);
          if (block.align === 'center') {
            doc.text(hLines, dims.marginLeft + dims.contentWidth / 2, currentY, { align: 'center' });
          } else if (block.align === 'right') {
            doc.text(hLines, dims.marginLeft + dims.contentWidth, currentY, { align: 'right' });
          } else {
            doc.text(hLines, dims.marginLeft, currentY);
          }
          currentY += hLines.length * headingLeading + spaceAfter;

          isFirstParaAfterBreak = true;
          break;
        }

        case 'scene_break': {
          currentY += 14;
          if (currentY + 28 > dims.height - dims.marginBottom) {
            doc.addPage([dims.width, dims.height]);
            currentPage++;
            pageChapterMap.set(currentPage, shortChTitle);
            currentY = dims.marginTop + 20;
          }

          doc.setFont(fontFamily, 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 115, 130);
          doc.text('*   *   *', dims.width / 2, currentY, { align: 'center' });
          currentY += 20;

          isFirstParaAfterBreak = true;
          break;
        }

        case 'blockquote': {
          currentY += 8;
          const bqFontSize = fontSize - 0.5;
          const bqLeading = bqFontSize * 1.45;
          const bqIndentLeft = 20;
          const bqIndentRight = 16;
          const bqWidth = dims.contentWidth - (bqIndentLeft + bqIndentRight);

          doc.setFont(fontFamily, 'italic');
          doc.setFontSize(bqFontSize);
          doc.setTextColor(51, 65, 85);

          const bqLines = doc.splitTextToSize(block.text, bqWidth);

          for (const line of bqLines) {
            if (currentY + bqLeading > dims.height - dims.marginBottom) {
              doc.addPage([dims.width, dims.height]);
              currentPage++;
              pageChapterMap.set(currentPage, shortChTitle);
              currentY = dims.marginTop + 20;
            }
            doc.text(line, dims.marginLeft + bqIndentLeft, currentY);
            currentY += bqLeading;
          }

          currentY += 8;
          isFirstParaAfterBreak = false;
          break;
        }

        case 'list_item': {
          doc.setFont(fontFamily, 'normal');
          doc.setFontSize(fontSize);
          doc.setTextColor(30, 41, 59);

          const bulletIndent = 16;
          const itemWidth = dims.contentWidth - bulletIndent;
          const itemLines = doc.splitTextToSize(block.text, itemWidth);

          for (let i = 0; i < itemLines.length; i++) {
            if (currentY + bodyLineHeight > dims.height - dims.marginBottom) {
              doc.addPage([dims.width, dims.height]);
              currentPage++;
              pageChapterMap.set(currentPage, shortChTitle);
              currentY = dims.marginTop + 20;
            }

            if (i === 0) {
              doc.text('•', dims.marginLeft + 4, currentY);
            }
            doc.text(itemLines[i], dims.marginLeft + bulletIndent, currentY);
            currentY += bodyLineHeight;
          }

          currentY += 4;
          isFirstParaAfterBreak = false;
          break;
        }

        case 'p':
        default: {
          doc.setFont(fontFamily, 'normal');
          doc.setFontSize(fontSize);
          doc.setTextColor(24, 30, 42);

          const isCentered = block.align === 'center';
          const isRight = block.align === 'right';
          const indent = (isFirstParaAfterBreak || isCentered || isRight) ? 0 : indentSize;
          const lines = wrapParagraphLines(doc, block.text, dims.contentWidth, indent);

          for (const item of lines) {
            if (currentY + bodyLineHeight > dims.height - dims.marginBottom) {
              doc.addPage([dims.width, dims.height]);
              currentPage++;
              pageChapterMap.set(currentPage, shortChTitle);
              currentY = dims.marginTop + 20;
            }

            if (isCentered) {
              doc.text(item.line, dims.marginLeft + dims.contentWidth / 2, currentY, { align: 'center' });
            } else if (isRight) {
              doc.text(item.line, dims.marginLeft + dims.contentWidth, currentY, { align: 'right' });
            } else {
              doc.text(item.line, dims.marginLeft + item.xOffset, currentY);
            }
            currentY += bodyLineHeight;
          }

          // If not indented, add slight paragraph spacing
          if (!useIndent || isCentered || isRight) {
            currentY += bodyLineHeight * 0.45;
          }

          isFirstParaAfterBreak = false;
          break;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. RUNNING HEADERS & PAGE NUMBERS POST-PASS
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();

  // Find the first chapter page to determine page 1 of book content
  let bookStartPage = 1;
  while (bookStartPage <= totalPages && headerSuppressedPages.has(bookStartPage) && !pageChapterMap.has(bookStartPage)) {
    bookStartPage++;
  }

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    const isSuppressed = headerSuppressedPages.has(p);
    const isOdd = p % 2 !== 0;

    // Running Header (suppressed on cover, title page, and chapter opening pages)
    if (includeRunningHeaders && !isSuppressed && p >= bookStartPage) {
      doc.setFont(fontFamily, 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(110, 120, 135);

      const headerY = dims.marginTop - 18;

      if (isOdd) {
        // Right-hand page: Chapter Title
        const chTitle = pageChapterMap.get(p) || shortBookTitle;
        doc.text(chTitle, dims.width - dims.marginRight, headerY, { align: 'right' });
      } else {
        // Left-hand page: Book Title
        doc.text(shortBookTitle, dims.marginLeft, headerY, { align: 'left' });
      }

      // Subtle hairline below running header
      doc.setDrawColor(225, 230, 238);
      doc.setLineWidth(0.4);
      doc.line(dims.marginLeft, headerY + 6, dims.width - dims.marginRight, headerY + 6);
    }

    // Running Footer / Page Number
    if (includePageNumbers && p >= bookStartPage) {
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 110, 125);

      const footerY = dims.height - dims.marginBottom + 26;
      const pageNumText = `${p - bookStartPage + 1}`;

      doc.text(pageNumText, dims.width / 2, footerY, { align: 'center' });
    }
  }

  return doc;
}

/**
 * Convenience method to generate and trigger download of publication-ready vector PDF
 */
export async function exportBookToVectorPdf(
  book: EpubBook,
  options: PdfBookOptions = {}
): Promise<void> {
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');
  const doc = await generateVectorPdf(book, options);
  doc.save(`${cleanTitle}.pdf`);
}
