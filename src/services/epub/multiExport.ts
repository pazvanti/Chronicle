import { EpubBook } from '../../types/epub';

/**
 * Downloads a text/blob file in browser
 */
function triggerDownload(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a publication-ready vector-text PDF directly to the user's computer.
 * Uses native PDF vector operators for crisp, 100% searchable text at 300+ DPI.
 */
export async function exportToPdfDirect(
  book: EpubBook,
  options?: import('./pdfBookTypesetter').PdfBookOptions
): Promise<void> {
  const { exportBookToVectorPdf } = await import('./pdfBookTypesetter');
  await exportBookToVectorPdf(book, options);
}

/**
 * Converts HTML string to clean Markdown
 */
function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) return '';

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const childrenText = Array.from(el.childNodes).map(processNode).join('');

    switch (tag) {
      case 'h1':
        return `\n# ${childrenText.trim()}\n\n`;
      case 'h2':
        return `\n## ${childrenText.trim()}\n\n`;
      case 'h3':
        return `\n### ${childrenText.trim()}\n\n`;
      case 'h4':
        return `\n#### ${childrenText.trim()}\n\n`;
      case 'p':
        return `${childrenText.trim()}\n\n`;
      case 'blockquote':
        return `\n> ${childrenText.trim().replace(/\n/g, '\n> ')}\n\n`;
      case 'strong':
      case 'b':
        return `**${childrenText}**`;
      case 'em':
      case 'i':
        return `*${childrenText}*`;
      case 'code':
        return `\`${childrenText}\``;
      case 'ul':
        return `\n${childrenText}\n`;
      case 'ol':
        return `\n${childrenText}\n`;
      case 'li':
        return `- ${childrenText.trim()}\n`;
      case 'hr':
        return `\n---\n\n`;
      case 'br':
        return `\n`;
      default:
        return childrenText;
    }
  }

  return processNode(container).trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Exports book as Markdown document (.md)
 */
export function exportToMarkdown(book: EpubBook) {
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');

  let md = `---
title: "${meta.title || 'Untitled'}"
author: "${meta.creator || 'Unknown'}"
language: "${meta.language || 'en'}"
publisher: "${meta.publisher || ''}"
date: "${meta.pubdate || ''}"
rights: "${meta.rights || ''}"
description: "${(meta.description || '').replace(/"/g, '\\"')}"
---

# ${meta.title || 'Untitled Book'}
*by ${meta.creator || 'Unknown'}*

`;

  book.chapters.forEach((chapter, index) => {
    md += `\n---\n\n## ${chapter.title || `Chapter ${index + 1}`}\n\n`;
    md += htmlToMarkdown(chapter.content);
    md += '\n\n';
  });

  triggerDownload(md, `${cleanTitle}.md`, 'text/markdown;charset=utf-8');
}

/**
 * Exports book as Plain Text (.txt)
 */
export function exportToPlainText(book: EpubBook) {
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');

  let txt = `========================================================================\n`;
  txt += `${(meta.title || 'UNTITLED').toUpperCase()}\n`;
  txt += `By ${meta.creator || 'Unknown'}\n`;
  if (meta.publisher) txt += `Publisher: ${meta.publisher}\n`;
  if (meta.pubdate) txt += `Date: ${meta.pubdate}\n`;
  txt += `========================================================================\n\n`;

  book.chapters.forEach((chapter, index) => {
    txt += `\n\n------------------------------------------------------------------------\n`;
    txt += `${(chapter.title || `CHAPTER ${index + 1}`).toUpperCase()}\n`;
    txt += `------------------------------------------------------------------------\n\n`;

    const temp = document.createElement('div');
    temp.innerHTML = chapter.content;
    const plain = temp.textContent || temp.innerText || '';
    txt += plain.trim().replace(/\n{3,}/g, '\n\n') + '\n\n';
  });

  triggerDownload(txt, `${cleanTitle}.txt`, 'text/plain;charset=utf-8');
}

/**
 * Exports book as Single Standalone HTML Document (.html)
 */
export function exportToSingleHtml(book: EpubBook) {
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');

  let chaptersHtml = '';
  book.chapters.forEach(chapter => {
    chaptersHtml += `<section class="epub-chapter">
      <div class="chapter-content">
        ${chapter.content}
      </div>
    </section>\n`;
  });

  const html = `<!DOCTYPE html>
<html lang="${meta.language || 'en'}">
<head>
  <meta charset="utf-8">
  <title>${meta.title || 'Book'}</title>
  <meta name="author" content="${meta.creator || ''}">
  <meta name="description" content="${meta.description || ''}">
  <style>
    body {
      font-family: 'Georgia', 'Merriweather', serif;
      line-height: 1.8;
      color: #1a1a1a;
      background: #fafaf9;
      margin: 0;
      padding: 3rem 1.5rem;
    }
    .book-container {
      max-width: 46rem;
      margin: 0 auto;
      background: #ffffff;
      padding: 4rem 3.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border-radius: 8px;
    }
    .book-header {
      text-align: center;
      margin-bottom: 4rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .book-title {
      font-size: 2.5rem;
      margin: 0 0 0.5rem;
      color: #111827;
    }
    .book-author {
      font-size: 1.25rem;
      color: #4b5563;
      margin: 0;
      font-style: italic;
    }
    .epub-chapter {
      margin-bottom: 4rem;
      padding-bottom: 3rem;
      border-bottom: 1px solid #f3f4f6;
    }
    h1, h2, h3 {
      font-family: sans-serif;
      color: #111827;
    }
    p { margin: 1.1rem 0; text-align: justify; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1.2rem; margin: 1.5rem 0; font-style: italic; }
    img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="book-container">
    <header class="book-header">
      <h1 class="book-title">${meta.title || 'Untitled'}</h1>
      <p class="book-author">by ${meta.creator || 'Unknown'}</p>
    </header>
    <main>
      ${chaptersHtml}
    </main>
  </div>
</body>
</html>`;

  triggerDownload(html, `${cleanTitle}.html`, 'text/html;charset=utf-8');
}

/**
 * Exports book as JSON archive (.json)
 */
export function exportToJson(book: EpubBook) {
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');

  const jsonBundle = {
    version: book.version,
    exportedAt: new Date().toISOString(),
    metadata: book.metadata,
    chapters: book.chapters.map(c => ({
      id: c.id,
      title: c.title,
      href: c.href,
      order: c.order,
      wordCount: c.wordCount,
      content: c.content,
    })),
    toc: book.toc,
    manifest: book.manifest,
    spine: book.spine,
  };

  const jsonStr = JSON.stringify(jsonBundle, null, 2);
  triggerDownload(jsonStr, `${cleanTitle}_backup.json`, 'application/json;charset=utf-8');
}

/**
 * Opens formatted Printable / PDF view in a new window and triggers window.print()
 */
export function openPrintPdfView(book: EpubBook) {
  const meta = book.metadata;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let chaptersHtml = '';
  book.chapters.forEach((chapter, i) => {
    chaptersHtml += `<div class="print-chapter">
      <h2 class="print-chapter-title">${chapter.title || `Chapter ${i + 1}`}</h2>
      <div class="print-chapter-body">
        ${chapter.content}
      </div>
    </div>\n`;
  });

  const printDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${meta.title || 'Print Book'}</title>
  <style>
    @page {
      size: 6in 9in;
      margin: 0.8in 0.7in 0.8in 0.7in;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .print-cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 90vh;
      text-align: center;
    }
    .print-book-title {
      font-size: 28pt;
      font-weight: bold;
      margin-bottom: 12pt;
    }
    .print-book-author {
      font-size: 14pt;
      font-style: italic;
    }
    .print-chapter {
      page-break-before: always;
    }
    .print-chapter-title {
      font-size: 18pt;
      text-align: center;
      margin-top: 40pt;
      margin-bottom: 24pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      margin: 0;
      text-indent: 1.5em;
      text-align: justify;
    }
    .print-chapter-title + p, h1 + p, h2 + p, h3 + p {
      text-indent: 0;
    }
    blockquote {
      margin: 14pt 20pt;
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 15pt auto;
    }
    @media screen {
      body { background: #f0f0f0; padding: 20px; }
      .print-cover, .print-chapter { background: #fff; max-width: 6in; margin: 20px auto; padding: 40px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
  <div class="print-cover">
    <div class="print-book-title">${meta.title || 'Untitled'}</div>
    <div class="print-book-author">by ${meta.creator || 'Unknown'}</div>
  </div>
  ${chaptersHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(printDoc);
  printWindow.document.close();
}

/**
 * Exports book as Shunn Modern Manuscript in standard DOCX format
 */
export async function exportToShunnDocx(
  book: EpubBook,
  options?: import('./shunnManuscriptExporter').ShunnExportOptions
): Promise<void> {
  const { exportToShunnManuscriptDocx } = await import('./shunnManuscriptExporter');
  const meta = book.metadata;
  const cleanTitle = (meta.title || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = await exportToShunnManuscriptDocx(book, options);
  triggerDownload(
    blob,
    `${cleanTitle}_Shunn_Manuscript.docx`,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}
