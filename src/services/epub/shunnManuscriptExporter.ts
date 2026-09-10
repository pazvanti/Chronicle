import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  PageNumber,
  convertInchesToTwip,
  PageBreak,
  TabStopType,
} from 'docx';
import { EpubBook } from '../../types/epub';

export interface ShunnExportOptions {
  // Submitter / Author Contact
  legalName?: string; // Submitting author's legal name
  penName?: string; // Byline name
  authorAddress?: string; // Legacy / single address field
  authorAddressLine1?: string; // Mailing address line 1 (Street, P.O. Box)
  authorAddressLine2?: string; // Mailing address line 2 (City, State, ZIP, Country)
  authorPhone?: string; // Phone number
  authorEmail?: string; // Email address
  authorWebsite?: string; // Website / Socials

  // Structural & Chapter options
  chapterPageBreak?: boolean; // true = start on new page, false = continue with blank line
  includeChapterTitles?: boolean; // true = include chapter title, false = omit chapter title

  // Typography
  fontFamily?: 'Times New Roman' | 'Courier New';
  fontSize?: number; // 12
}

/**
 * Strips HTML and extracts clean paragraphs for manuscript processing
 */
function extractParagraphsFromHtml(html: string): Array<{ text: string; isHeading?: boolean; isSceneBreak?: boolean }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return [];

  const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, hr');
  const items: Array<{ text: string; isHeading?: boolean; isSceneBreak?: boolean }> = [];

  elements.forEach(el => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';

    if (tag === 'hr' || text === '* * *' || text === '***' || text === '###' || text === '#') {
      items.push({ text: '#', isSceneBreak: true });
    } else if (tag.startsWith('h')) {
      if (text) items.push({ text, isHeading: true });
    } else if (text) {
      items.push({ text });
    }
  });

  return items;
}

/**
 * Rounds word count according to standard manuscript conventions with formatted commas
 */
function getShunnWordCount(totalWords: number): string {
  let rounded: number;
  if (totalWords < 1000) {
    rounded = Math.round(totalWords / 50) * 50;
  } else if (totalWords < 10000) {
    rounded = Math.round(totalWords / 100) * 100;
  } else {
    rounded = Math.round(totalWords / 500) * 500;
  }
  return `about ${rounded.toLocaleString()} words`;
}

/**
 * Extracts author surname for the running header (e.g. "Lewis Carroll" -> "Carroll", "Mary Shelley" -> "Shelley")
 */
function getAuthorSurname(authorName: string): string {
  const clean = authorName.trim();
  if (!clean) return 'Author';
  const parts = clean.split(/\s+/);
  return parts[parts.length - 1];
}

/**
 * Extracts a 1-3 word keyword title for the running header
 */
function getKeywordTitle(title: string): string {
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 3).join(' ');
  return words || 'Manuscript';
}

/**
 * Generates standard Shunn Modern Manuscript .docx file
 */
export async function exportToShunnManuscriptDocx(
  book: EpubBook,
  options: ShunnExportOptions = {}
): Promise<Blob> {
  const meta = book.metadata;
  const legalName = options.legalName || meta.creator || 'Author Name';
  const penName = options.penName || meta.creator || legalName;
  const authorEmail = options.authorEmail || meta.rights || 'author@example.com';
  const authorPhone = options.authorPhone || '';
  const authorWebsite = options.authorWebsite || '';
  const bookTitle = meta.title || 'Untitled Manuscript';
  const font = options.fontFamily || 'Times New Roman';
  const halfPoints = (options.fontSize || 12) * 2; // 24 = 12pt
  const chapterPageBreak = options.chapterPageBreak !== false; // default true
  const includeChapterTitles = options.includeChapterTitles !== false; // default true

  const totalWords = book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const wordCountStr = getShunnWordCount(totalWords);
  const surname = getAuthorSurname(legalName);
  const keywordTitle = getKeywordTitle(bookTitle);

  const docChildren: Paragraph[] = [];

  // ==========================================
  // PAGE 1: Shunn Contact Header & Word Count
  // Line 1: Author Name (Left) & Word Count (Exact Right Margin)
  // ==========================================
  docChildren.push(
    new Paragraph({
      tabStops: [
        {
          type: TabStopType.RIGHT,
          position: convertInchesToTwip(6.5), // Exactly 6.5 in from left (8.5 in page - 2.0 in margins)
        },
      ],
      children: [
        new TextRun({
          text: legalName,
          font,
          size: halfPoints,
        }),
        new TextRun({
          text: `\t${wordCountStr}`,
          font,
          size: halfPoints,
        }),
      ],
      spacing: { line: 240, after: 0, before: 0 }, // Single spaced contact block
    })
  );

  // Address Lines (Supports 2 lines)
  const addressLine1 = options.authorAddressLine1?.trim() || '';
  const addressLine2 = options.authorAddressLine2?.trim() || '';
  const legacyAddress = options.authorAddress?.trim() || '';

  if (addressLine1) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: addressLine1, font, size: halfPoints })],
        spacing: { line: 240, after: 0, before: 0 },
      })
    );
  }
  if (addressLine2) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: addressLine2, font, size: halfPoints })],
        spacing: { line: 240, after: 0, before: 0 },
      })
    );
  } else if (!addressLine1 && legacyAddress) {
    // Handle multiline legacy address
    legacyAddress.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed, font, size: halfPoints })],
            spacing: { line: 240, after: 0, before: 0 },
          })
        );
      }
    });
  }

  // Line 3: Phone Number
  if (authorPhone) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: authorPhone, font, size: halfPoints })],
        spacing: { line: 240, after: 0, before: 0 },
      })
    );
  }

  // Line 4: Email Address
  if (authorEmail) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: authorEmail, font, size: halfPoints })],
        spacing: { line: 240, after: 0, before: 0 },
      })
    );
  }

  // Line 5: Website / Social (Optional)
  if (authorWebsite) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: authorWebsite, font, size: halfPoints })],
        spacing: { line: 240, after: 0, before: 0 },
      })
    );
  }

  // Vertical space to center of page 1 (approx. 5 double-spaced blank lines)
  for (let i = 0; i < 5; i++) {
    docChildren.push(
      new Paragraph({
        text: '',
        spacing: { line: 480, after: 0, before: 0 }, // Double-spaced (480 twips = 2.0)
      })
    );
  }

  // Title (Centered, All Caps)
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: bookTitle.toUpperCase(),
          font,
          size: halfPoints,
          bold: true,
        }),
      ],
      spacing: { line: 480, after: 240, before: 0 },
    })
  );

  // "by"
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'by',
          font,
          size: halfPoints,
        }),
      ],
      spacing: { line: 480, after: 240, before: 0 },
    })
  );

  // Byline / Author Pen Name
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: penName,
          font,
          size: halfPoints,
        }),
      ],
      spacing: { line: 480, after: 480, before: 0 },
    })
  );

  // Blank line before story / chapter 1 text
  docChildren.push(
    new Paragraph({
      text: '',
      spacing: { line: 480, after: 0, before: 0 },
    })
  );

  // ==========================================
  // CHAPTERS & BODY TEXT
  // ==========================================
  book.chapters.forEach((chapter, chapterIndex) => {
    // If not first chapter, handle chapter separation
    if (chapterIndex > 0) {
      if (chapterPageBreak) {
        // Option 1: Start each chapter on a New Page
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      } else {
        // Option 2: Continuous flow with double blank lines
        docChildren.push(
          new Paragraph({
            text: '',
            spacing: { line: 480, before: 480, after: 0 },
          })
        );
      }
    }

    // Chapter Title (Centered, Optional)
    if (includeChapterTitles) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: (chapter.title || `Chapter ${chapterIndex + 1}`).toUpperCase(),
              font,
              size: halfPoints,
              bold: true,
            }),
          ],
          spacing: { line: 480, after: 480, before: chapterIndex === 0 ? 0 : 240 },
        })
      );
    }

    // Chapter Paragraphs
    const items = extractParagraphsFromHtml(chapter.content);
    items.forEach(item => {
      if (item.isSceneBreak) {
        // Scene break: Centered # with double spacing
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '#',
                font,
                size: halfPoints,
              }),
            ],
            spacing: { line: 480, before: 240, after: 240 },
          })
        );
      } else if (item.isHeading) {
        if (includeChapterTitles) {
          // Subheading: Centered
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: item.text,
                  font,
                  size: halfPoints,
                  italics: true,
                }),
              ],
              spacing: { line: 480, before: 240, after: 240 },
            })
          );
        }
      } else {
        // Standard Manuscript Paragraph: 0.5-inch first-line indent, double-spaced (480 twips), 0pt after
        docChildren.push(
          new Paragraph({
            indent: {
              firstLine: convertInchesToTwip(0.5), // 0.5 in indent
            },
            spacing: {
              line: 480, // Double spacing (24pt / 2.0 lines)
              after: 0,
              before: 0,
            },
            children: [
              new TextRun({
                text: item.text,
                font,
                size: halfPoints,
              }),
            ],
          })
        );
      }
    });
  });

  // ==========================================
  // END OF MANUSCRIPT
  // ==========================================
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '# # #',
          font,
          size: halfPoints,
          bold: true,
        }),
      ],
      spacing: { line: 480, before: 480, after: 480 },
    })
  );

  // Build Document with "Different First Page" (no running header on page 1)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1), // 1.0 inch
              bottom: convertInchesToTwip(1), // 1.0 inch
              left: convertInchesToTwip(1), // 1.0 inch
              right: convertInchesToTwip(1), // 1.0 inch
            },
          },
          titlePage: true, // Tells Microsoft Word to use a different first page header
        },
        headers: {
          first: new Header({
            children: [], // No running header on page 1 (Shunn specification)
          }),
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${surname} / ${keywordTitle} / `,
                    font,
                    size: halfPoints,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font,
                    size: halfPoints,
                  }),
                ],
                spacing: { line: 240, after: 0, before: 0 },
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
