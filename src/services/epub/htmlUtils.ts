import { resolvePath, getRelativePath } from './pathUtils';
import { EpubAsset } from '../../types/epub';

/**
 * Calculates word count from HTML or plain text string
 */
export function calculateWordCount(htmlOrText: string): number {
  if (!htmlOrText) return 0;
  const temp = document.createElement('div');
  temp.innerHTML = htmlOrText;
  const text = temp.textContent || temp.innerText || '';
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Extracts a sensible title from XHTML/HTML content (e.g. <title>, <h1>, <h2>, or first sentence)
 */
export function extractChapterTitle(html: string, fallback: string = 'Untitled Chapter'): string {
  if (!html) return fallback;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check <title>
    const titleTag = doc.querySelector('title');
    if (titleTag && titleTag.textContent?.trim()) {
      return titleTag.textContent.trim();
    }
    
    // Check headings <h1>, <h2>, <h3>
    const heading = doc.querySelector('h1, h2, h3, h4');
    if (heading && heading.textContent?.trim()) {
      return heading.textContent.trim();
    }
    
    // Check first paragraph
    const p = doc.querySelector('p');
    if (p && p.textContent?.trim()) {
      const pText = p.textContent.trim();
      return pText.length > 40 ? pText.substring(0, 37) + '...' : pText;
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Extracts all headings from a chapter to assist with chapter splitting or TOC generation
 */
export function extractHeadings(html: string): Array<{ tag: string; text: string; id?: string; index: number }> {
  if (!html) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headings.map((h, i) => ({
      tag: h.tagName.toLowerCase(),
      text: h.textContent?.trim() || `Heading ${i + 1}`,
      id: h.id || undefined,
      index: i,
    }));
  } catch {
    return [];
  }
}

/**
 * Injects asset blob URLs into HTML content for live rendering in the editor & reader
 */
export function injectAssetUrls(
  htmlContent: string,
  chapterFullPath: string,
  assets: EpubAsset[]
): string {
  if (!htmlContent) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Build map of fullPath -> blobUrl and original href -> blobUrl
    const assetMap = new Map<string, string>();
    for (const asset of assets) {
      if (asset.blobUrl) {
        assetMap.set(asset.fullPath, asset.blobUrl);
      }
    }

    // Replace <img> src
    const images = doc.querySelectorAll('img, image');
    images.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('xlink:href') || img.getAttribute('href');
      if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('blob:')) {
        const resolved = resolvePath(chapterFullPath, src);
        const blobUrl = assetMap.get(resolved);
        if (blobUrl) {
          img.setAttribute('src', blobUrl);
          img.setAttribute('data-original-src', src);
        }
      }
    });

    // Normalize hardcoded black/dark colors on elements so they don't cause black-on-dark unreadability
    const coloredElements = doc.querySelectorAll('[style*="color"], font[color]');
    coloredElements.forEach(el => {
      // Clean <font color="...">
      if (el.tagName.toLowerCase() === 'font') {
        const fontColor = el.getAttribute('color')?.toLowerCase();
        if (fontColor === 'black' || fontColor === '#000' || fontColor === '#000000' || fontColor === '#111' || fontColor === '#222') {
          el.removeAttribute('color');
        }
      }
      // Clean style="... color: black / #000 ..."
      const style = el.getAttribute('style');
      if (style) {
        const cleanedStyle = style
          .replace(/color\s*:\s*(#000000|#000|#111111|#111|#222222|#222|black|rgb\(0,\s*0,\s*0\)|rgba\(0,\s*0,\s*0,\s*1\))\s*;?/gi, '')
          .replace(/background-color\s*:\s*(#ffffff|#fff|white|rgb\(255,\s*255,\s*255\))\s*;?/gi, '')
          .trim();
        if (cleanedStyle) {
          el.setAttribute('style', cleanedStyle);
        } else {
          el.removeAttribute('style');
        }
      }
    });

    // Extract body content or full HTML if needed
    return doc.body.innerHTML;
  } catch (err) {
    console.error('Failed to inject asset URLs:', err);
    return htmlContent;
  }
}

/**
 * Restores original relative paths from blob URLs or data-original-src attributes
 */
export function restoreAssetUrls(
  bodyHtml: string,
  chapterFullPath: string,
  assets: EpubAsset[]
): string {
  if (!bodyHtml) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(bodyHtml, 'text/html');
    
    const blobToAsset = new Map<string, EpubAsset>();
    for (const asset of assets) {
      if (asset.blobUrl) {
        blobToAsset.set(asset.blobUrl, asset);
      }
    }

    const images = doc.querySelectorAll('img, image');
    images.forEach(img => {
      const orig = img.getAttribute('data-original-src');
      if (orig) {
        img.setAttribute('src', orig);
        img.removeAttribute('data-original-src');
      } else {
        const src = img.getAttribute('src');
        if (src && blobToAsset.has(src)) {
          const asset = blobToAsset.get(src)!;
          const relative = getRelativePath(chapterFullPath, asset.fullPath);
          img.setAttribute('src', relative);
        }
      }
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.error('Failed to restore asset URLs:', err);
    return bodyHtml;
  }
}

/**
 * Wraps body HTML in a standard, compliant EPUB 3 / XHTML 1.1 document structure
 */
export function wrapInXhtml(bodyContent: string, title: string = 'Chapter', cssHrefs: string[] = []): string {
  const cssLinks = cssHrefs
    .map(href => `    <link rel="stylesheet" type="text/css" href="${href}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(title)}</title>
${cssLinks ? cssLinks + '\n' : ''}  </head>
  <body>
${bodyContent}
  </body>
</html>`;
}

/**
 * Helper to escape XML special characters
 */
export function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
