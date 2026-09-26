import {
  EpubBook,
  EpubChapter,
  EpubManifestItem,
  EpubSpineItem,
  EpubTocItem,
  EpubAsset,
} from '../../types/project';
import { calculateWordCount, escapeXml, wrapInXhtml } from './htmlUtils';

export interface MarkdownMetadata {
  title?: string;
  author?: string;
  creator?: string;
  language?: string;
  description?: string;
  pubdate?: string;
  date?: string;
  publisher?: string;
  rights?: string;
  series?: string;
  seriesIndex?: string;
  tags?: string[];
  subjects?: string[];
  [key: string]: any;
}

export interface MarkdownChapterSection {
  title: string;
  markdown: string;
  html: string;
}

/**
 * Checks whether a given file name or file matches supported Markdown formats (.md, .markdown, .mdown, .mkd).
 */
export function isMarkdownFile(fileOrName: File | string): boolean {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.mdown') ||
    lower.endsWith('.mkd')
  );
}

/**
 * Parses optional YAML frontmatter at the top of a Markdown document.
 */
export function extractFrontmatter(rawText: string): {
  metadata: MarkdownMetadata;
  body: string;
} {
  const trimmedStart = rawText.replace(/^\uFEFF/, '').trimStart();
  if (!trimmedStart.startsWith('---')) {
    return { metadata: {}, body: rawText };
  }

  const match = trimmedStart.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    return { metadata: {}, body: rawText };
  }

  const frontmatterStr = match[1];
  const body = trimmedStart.substring(match[0].length);
  const metadata: MarkdownMetadata = {};

  const lines = frontmatterStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      let value = line.substring(colonIdx + 1).trim();

      // Unquote value if wrapped in quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      if (key) {
        if (key === 'tags' || key === 'subjects') {
          metadata[key] = value
            .split(',')
            .map(t => t.trim().replace(/^['"[]+|['"\]]+$/g, ''))
            .filter(Boolean);
        } else {
          metadata[key] = value;
        }
      }
    }
  }

  return { metadata, body };
}

/**
 * Strips Markdown formatting marks (bold, italic, code, links) to produce clean plain text for titles.
 */
export function cleanMarkdownFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // images -> alt text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links -> label text
    .replace(/(\*\*\*|___)(.*?)\1/g, '$2') // bold italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // inline code
    .replace(/<[^>]*>/g, '') // html tags
    .trim();
}

/**
 * Escapes characters for safe HTML output.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses inline Markdown markers (bold, italic, code, links, images, strikethrough, breaks).
 */
export function parseInlineMarkdown(text: string): string {
  if (!text) return '';

  // 1. Protect inline code spans with safe PUA Unicode delimiters
  const codeSpans: string[] = [];
  let processed = text.replace(/`([^`]+)`/g, (_match, code) => {
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\uE000MDCODE${codeSpans.length - 1}\uE001`;
  });

  // 2. Images: ![alt](url "title") or ![alt](url)
  processed = processed.replace(
    /!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/g,
    (_match, alt, url, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(url.trim())}" alt="${escapeHtml(alt)}"${titleAttr} />`;
    }
  );

  // 3. Links: [text](url "title") or [text](url)
  processed = processed.replace(
    /\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/g,
    (_match, linkText, url, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(url.trim())}"${titleAttr}>${parseInlineMarkdown(linkText)}</a>`;
    }
  );

  // 4. Bold + Italic: ***text*** or ___text___
  processed = processed.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // 5. Bold: **text** or __text__
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 6. Italic: *text* or _text_
  processed = processed.replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');
  processed = processed.replace(/\b_([^_\s][^_]*?)_\b/g, '<em>$1</em>');

  // 7. Strikethrough: ~~text~~
  processed = processed.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // 8. Hard line breaks: 2+ trailing spaces or trailing backslash
  processed = processed.replace(/(?: {2,}|\\)$/gm, '<br />');

  // 9. Restore code spans safely
  processed = processed.replace(/\uE000MDCODE(\d+)\uE001/g, (_match, idx) => {
    return codeSpans[parseInt(idx, 10)] || '';
  });

  return processed;
}

/**
 * Converts a block of Markdown text into semantic HTML.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split(/\r?\n/);
  const htmlBlocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line -> skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced code block (``` or ~~~)
    const codeFenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (codeFenceMatch) {
      const fenceMarker = codeFenceMatch[1][0];
      const fenceLength = codeFenceMatch[1].length;
      const lang = codeFenceMatch[2].trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length) {
        const curLine = lines[i];
        const closeMatch = curLine.trim().match(/^(`{3,}|~{3,})$/);
        if (
          closeMatch &&
          closeMatch[1][0] === fenceMarker &&
          closeMatch[1].length >= fenceLength
        ) {
          i++;
          break;
        }
        codeLines.push(curLine);
        i++;
      }

      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      htmlBlocks.push(
        `<pre><code${langClass}>${codeLines.map(l => escapeHtml(l)).join('\n')}</code></pre>`
      );
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      htmlBlocks.push('<hr />');
      i++;
      continue;
    }

    // 3. ATX Headings (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = parseInlineMarkdown(headingMatch[2].trim());
      htmlBlocks.push(`<h${level}>${headingText}</h${level}>`);
      i++;
      continue;
    }

    // 4. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('>') || (lines[i].trim() && quoteLines.length > 0 && !lines[i].trim().match(/^(?:#{1,6}\s|-{3,}|\*{3,}|`{3,})/)))) {
        const qLine = lines[i].trim();
        if (qLine.startsWith('>')) {
          quoteLines.push(qLine.replace(/^>\s?/, ''));
        } else if (qLine) {
          quoteLines.push(qLine);
        } else {
          break;
        }
        i++;
      }
      const quoteHtml = markdownToHtml(quoteLines.join('\n'));
      htmlBlocks.push(`<blockquote>${quoteHtml}</blockquote>`);
      continue;
    }

    // 5. GFM Tables (| Col 1 | Col 2 | ...)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(nextTrimmed)) {
        // We have a table header and separator
        const headerCells = trimmed
          .slice(1, -1)
          .split('|')
          .map(c => parseInlineMarkdown(c.trim()));
        i += 2;

        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          const cells = lines[i]
            .trim()
            .slice(1, -1)
            .split('|')
            .map(c => parseInlineMarkdown(c.trim()));
          bodyRows.push(cells);
          i++;
        }

        let tableHtml = '<table>\n<thead>\n<tr>\n';
        headerCells.forEach(h => {
          tableHtml += `  <th>${h}</th>\n`;
        });
        tableHtml += '</tr>\n</thead>\n';

        if (bodyRows.length > 0) {
          tableHtml += '<tbody>\n';
          bodyRows.forEach(row => {
            tableHtml += '<tr>\n';
            row.forEach(cell => {
              tableHtml += `  <td>${cell}</td>\n`;
            });
            tableHtml += '</tr>\n';
          });
          tableHtml += '</tbody>\n';
        }
        tableHtml += '</table>';
        htmlBlocks.push(tableHtml);
        continue;
      }
    }

    // 6. Unordered or Ordered Lists
    const isUnordered = /^\s*[-*+]\s+(.+)$/.test(line);
    const isOrdered = /^\s*\d+\.\s+(.+)$/.test(line);

    if (isUnordered || isOrdered) {
      const listTag = isOrdered ? 'ol' : 'ul';
      const items: string[] = [];

      while (i < lines.length) {
        const curLine = lines[i];
        const curTrim = curLine.trim();
        if (!curTrim) {
          // Look ahead to see if the next non-empty line continues list
          let nextIdx = i + 1;
          while (nextIdx < lines.length && !lines[nextIdx].trim()) {
            nextIdx++;
          }
          if (
            nextIdx < lines.length &&
            (/^\s*[-*+]\s+/.test(lines[nextIdx]) || /^\s*\d+\.\s+/.test(lines[nextIdx]))
          ) {
            i++;
            continue;
          }
          break;
        }

        const match = isOrdered
          ? curLine.match(/^\s*\d+\.\s+(.+)$/)
          : curLine.match(/^\s*[-*+]\s+(.+)$/);

        if (match) {
          const itemText = match[1].trim();

          // Check for task list checkboxes: [ ] or [x]
          if (/^\[\s\]\s+(.*)$/.test(itemText)) {
            const taskContent = itemText.replace(/^\[\s\]\s+/, '');
            items.push(
              `<li class="task-list-item"><input type="checkbox" disabled /> ${parseInlineMarkdown(taskContent)}</li>`
            );
          } else if (/^\[[xX]\]\s+(.*)$/.test(itemText)) {
            const taskContent = itemText.replace(/^\[[xX]\]\s+/, '');
            items.push(
              `<li class="task-list-item"><input type="checkbox" checked disabled /> ${parseInlineMarkdown(taskContent)}</li>`
            );
          } else {
            items.push(`<li>${parseInlineMarkdown(itemText)}</li>`);
          }
          i++;
        } else if (curLine.startsWith('    ') || curLine.startsWith('\t')) {
          // Continuation of previous item
          if (items.length > 0) {
            const last = items[items.length - 1].replace(/<\/li>$/, '');
            items[items.length - 1] = `${last} ${parseInlineMarkdown(curTrim)}</li>`;
          }
          i++;
        } else {
          break;
        }
      }

      htmlBlocks.push(`<${listTag}>\n${items.join('\n')}\n</${listTag}>`);
      continue;
    }

    // 7. Regular Paragraph (gather lines until blank line or next block element)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const curLine = lines[i];
      const curTrim = curLine.trim();
      if (!curTrim) break;

      // Check if next line is start of another block structure
      if (
        curTrim.match(/^(`{3,}|~{3,})/) ||
        curTrim.match(/^(#{1,6})\s+/) ||
        curTrim.match(/^(?:-{3,}|\*{3,}|_{3,})$/) ||
        curTrim.startsWith('>') ||
        /^\s*[-*+]\s+/.test(curLine) ||
        /^\s*\d+\.\s+/.test(curLine)
      ) {
        if (paraLines.length > 0) break;
      }

      paraLines.push(curTrim);
      i++;
    }

    if (paraLines.length > 0) {
      const paraText = parseInlineMarkdown(paraLines.join(' '));
      htmlBlocks.push(`<p>${paraText}</p>`);
    }
  }

  return htmlBlocks.join('\n\n');
}

/**
 * Automatically splits a Markdown document into chapters based on top-level H1 (`# `) tags.
 * Safely ignores `#` characters located inside fenced code blocks.
 */
export function splitMarkdownIntoChapters(
  markdown: string,
  defaultBookTitle: string = 'Untitled'
): MarkdownChapterSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: MarkdownChapterSection[] = [];

  let inCodeBlock = false;
  let codeFenceMarker = '';

  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for fenced code block toggle (``` or ~~~)
    const codeFenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (codeFenceMatch) {
      const fence = codeFenceMatch[1];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFenceMarker = fence[0];
      } else if (fence.startsWith(codeFenceMarker)) {
        inCodeBlock = false;
        codeFenceMarker = '';
      }
      currentLines.push(line);
      continue;
    }

    // If inside code block, never treat # as a chapter heading
    if (inCodeBlock) {
      currentLines.push(line);
      continue;
    }

    // Check for top-level H1: starts with '#' followed by one or more spaces (and not '##')
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      // If we have accumulated previous lines, finalize that chapter
      if (currentTitle !== null || currentLines.some(l => l.trim().length > 0)) {
        const chapterMd = currentLines.join('\n').trim();
        if (chapterMd.length > 0 || currentTitle !== null) {
          const sectionTitle =
            currentTitle || (sections.length === 0 ? 'Introduction' : `Chapter ${sections.length + 1}`);
          sections.push({
            title: sectionTitle,
            markdown: currentLines.join('\n'),
            html: markdownToHtml(currentLines.join('\n')),
          });
        }
      }

      // Start new chapter from this H1 tag
      const rawTitle = h1Match[1].trim();
      const cleanTitle = cleanMarkdownFormatting(rawTitle);
      currentTitle = cleanTitle || `Chapter ${sections.length + 1}`;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Push the final chapter
  if (currentTitle !== null || currentLines.some(l => l.trim().length > 0)) {
    const chapterMd = currentLines.join('\n').trim();
    if (chapterMd.length > 0 || currentTitle !== null) {
      const sectionTitle =
        currentTitle ||
        (sections.length === 0 ? defaultBookTitle : `Chapter ${sections.length + 1}`);
      sections.push({
        title: sectionTitle,
        markdown: currentLines.join('\n'),
        html: markdownToHtml(currentLines.join('\n')),
      });
    }
  }

  // If no content / no chapters at all, create an initial default chapter
  if (sections.length === 0) {
    const fallbackMd = `# ${defaultBookTitle}\n\nBegin writing here...`;
    sections.push({
      title: defaultBookTitle,
      markdown: fallbackMd,
      html: markdownToHtml(fallbackMd),
    });
  }

  return sections;
}

/**
 * Creates a default CSS stylesheet for newly imported Markdown manuscripts.
 */
export function getDefaultMarkdownStyles(): string {
  return `body {
  font-family: 'Merriweather', Georgia, serif;
  line-height: 1.75;
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 44rem;
}
h1, h2, h3, h4, h5, h6 {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: inherit;
  font-weight: 700;
  line-height: 1.3;
  text-align: left;
}
h1 {
  font-size: 2.2rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  text-align: left;
}
h2 {
  font-size: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 0.8rem;
  text-align: left;
}
h3 {
  font-size: 1.25rem;
  margin-top: 1.5rem;
  margin-bottom: 0.6rem;
  text-align: left;
}
p {
  margin-top: 0;
  margin-bottom: 1.25rem;
  text-align: justify;
}
blockquote {
  border-left: 4px solid #8b5cf6;
  margin: 1.5rem 0;
  padding: 0.5rem 0 0.5rem 1.25rem;
  color: #555;
  font-style: italic;
}
pre {
  background: rgba(128, 128, 128, 0.08);
  color: inherit;
  border: 1px solid rgba(128, 128, 128, 0.2);
  padding: 1rem 1.25rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.55;
  margin: 1.25rem 0;
}
code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  background: rgba(128, 128, 128, 0.14);
  color: inherit;
  padding: 0.15em 0.35em;
  border-radius: 4px;
}
pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
  padding: 0;
}
hr {
  border: 0;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
  margin: 2rem 0;
}
ul, ol {
  margin: 1rem 0 1.25rem 1.5rem;
  padding: 0;
}
li {
  margin-bottom: 0.4rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}
th, td {
  border: 1px solid rgba(128, 128, 128, 0.25);
  padding: 0.6rem 0.8rem;
  text-align: left;
}
th {
  background: rgba(128, 128, 128, 0.08);
  font-weight: 600;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5rem auto;
}
`;
}

/**
 * Converts a raw Markdown string into an active EpubBook manuscript ready for WYSIWYG editing and saving as .chronicle.
 */
export async function parseMarkdownToBook(
  rawMarkdown: string,
  fileName: string = 'manuscript.md'
): Promise<EpubBook> {
  // 1. Extract optional YAML frontmatter
  const { metadata: frontmatter, body } = extractFrontmatter(rawMarkdown);

  // 2. Determine book title and author
  const baseFileName = fileName.replace(/\.(md|markdown|mdown|mkd)$/i, '');
  const cleanBaseTitle = baseFileName
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();

  // Split into chapters based on H1 tags
  const chapterSections = splitMarkdownIntoChapters(body, cleanBaseTitle || 'Untitled Manuscript');

  const title =
    frontmatter.title ||
    (chapterSections.length > 0 ? chapterSections[0].title : cleanBaseTitle) ||
    'Untitled Manuscript';
  const author = frontmatter.author || frontmatter.creator || 'Unknown Author';
  const language = frontmatter.language || 'en';
  const pubdate = frontmatter.pubdate || frontmatter.date || new Date().toISOString().split('T')[0];
  const identifier = `urn:uuid:${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

  // 3. Prepare default stylesheet and support files
  const cssContent = getDefaultMarkdownStyles();
  const rawFiles = new Map<string, Uint8Array>();
  const encoder = new TextEncoder();
  const cssBytes = encoder.encode(cssContent);

  rawFiles.set('OEBPS/Styles/style.css', cssBytes);

  const assets: EpubAsset[] = [
    {
      id: 'style',
      href: 'Styles/style.css',
      fullPath: 'OEBPS/Styles/style.css',
      mediaType: 'text/css',
      size: cssBytes.length,
      data: cssBytes,
    },
  ];

  const manifest: Record<string, EpubManifestItem> = {
    style: {
      id: 'style',
      href: 'Styles/style.css',
      fullPath: 'OEBPS/Styles/style.css',
      mediaType: 'text/css',
    },
    nav: {
      id: 'nav',
      href: 'nav.xhtml',
      fullPath: 'OEBPS/nav.xhtml',
      mediaType: 'application/xhtml+xml',
      properties: 'nav',
    },
    ncx: {
      id: 'ncx',
      href: 'toc.ncx',
      fullPath: 'OEBPS/toc.ncx',
      mediaType: 'application/x-dtbncx+xml',
    },
  };

  const spine: EpubSpineItem[] = [];
  const chapters: EpubChapter[] = [];
  const toc: EpubTocItem[] = [];

  // 4. Build EpubChapter and TOC items for each split section
  chapterSections.forEach((section, index) => {
    const chapterNum = index + 1;
    const chapterId = `chapter-${chapterNum}`;
    const href = `Text/chapter${chapterNum}.xhtml`;
    const fullPath = `OEBPS/Text/chapter${chapterNum}.xhtml`;
    const chapterTitle = section.title;
    const content = section.html;
    const originalXhtml = wrapInXhtml(content, chapterTitle, ['../Styles/style.css']);
    const wordCount = calculateWordCount(content);

    manifest[chapterId] = {
      id: chapterId,
      href,
      fullPath,
      mediaType: 'application/xhtml+xml',
    };

    spine.push({ idref: chapterId });

    chapters.push({
      id: chapterId,
      href,
      fullPath,
      title: chapterTitle,
      content,
      originalXhtml,
      order: index,
      wordCount,
    });

    toc.push({
      id: `toc-${chapterId}`,
      title: chapterTitle,
      href,
      chapterId,
      level: 1,
    });

    rawFiles.set(fullPath, encoder.encode(originalXhtml));
  });

  // 5. Build Container, OPF, Nav, and NCX files
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  rawFiles.set('META-INF/container.xml', encoder.encode(containerXml));

  const navXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${chapters.map(c => `<li><a href="${c.href}">${escapeXml(c.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
  rawFiles.set('OEBPS/nav.xhtml', encoder.encode(navXml));

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    ${chapters
      .map(
        (c, idx) => `
    <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="${c.href}"/>
    </navPoint>`
      )
      .join('')}
  </navMap>
</ncx>`;
  rawFiles.set('OEBPS/toc.ncx', encoder.encode(tocNcx));

  const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${identifier}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator id="creator">${escapeXml(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:date>${pubdate}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    ${Object.values(manifest)
      .map(
        m =>
          `<item id="${m.id}" href="${m.href}" media-type="${m.mediaType}"${
            m.properties ? ` properties="${m.properties}"` : ''
          }/>`
      )
      .join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spine.map(s => `<itemref idref="${s.idref}"/>`).join('\n    ')}
  </spine>
</package>`;
  rawFiles.set('OEBPS/content.opf', encoder.encode(opfXml));

  const chronicleTargetName = `${baseFileName || 'manuscript'}.chronicle`;

  return {
    version: '3.0',
    opfPath: 'OEBPS/content.opf',
    opfDir: 'OEBPS/',
    metadata: {
      title,
      creator: author,
      language,
      identifier,
      publisher: frontmatter.publisher || '',
      pubdate,
      rights: frontmatter.rights || '',
      description: frontmatter.description || '',
      subjects: frontmatter.tags || frontmatter.subjects || [],
      series: frontmatter.series || undefined,
      seriesIndex: frontmatter.seriesIndex || undefined,
    },
    manifest,
    spine,
    chapters,
    folders: [],
    toc,
    tocPath: 'OEBPS/toc.ncx',
    navPath: 'OEBPS/nav.xhtml',
    assets,
    rawFiles,
    originalFileName: chronicleTargetName,
    writerData: {
      characters: [],
      locations: [],
      worldbuilding: [],
      timelines: [],
      comments: [],
      synopsis: frontmatter.description || '',
      dailyWordGoal: 0,
      customNotes: '',
    },
  };
}
