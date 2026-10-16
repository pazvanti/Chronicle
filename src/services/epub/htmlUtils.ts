import { resolvePath, getRelativePath } from './pathUtils';
import { EpubAsset } from '../../types/project';

/**
 * Calculates word count from HTML or plain text string.
 * Optimized for performance: strips HTML tags and entities via fast regex to avoid
 * costly DOM element creation, DOM parsing, and large array allocations.
 */
export function calculateWordCount(htmlOrText: string): number {
  if (!htmlOrText) return 0;
  let text = htmlOrText;
  if (text.includes('<')) {
    text = text
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }
  if (text.includes('&')) {
    text = text.replace(/&[a-zA-Z0-9#]+;/g, ' ');
  }
  const match = text.match(/\S+/g);
  return match ? match.length : 0;
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
 * Named HTML entities to decimal XML character references map.
 * Strict XML parsers only recognize &amp;, &lt;, &gt;, &quot;, and &apos;.
 * Any other named HTML entities (such as &nbsp;, &mdash;, &copy;) must be converted
 * to numerical character references (e.g. &#160;) to be valid in standalone XHTML.
 */
export const HTML_ENTITY_MAP: Record<string, string> = {
  nbsp: '&#160;',
  iexcl: '&#161;',
  cent: '&#162;',
  pound: '&#163;',
  curren: '&#164;',
  yen: '&#165;',
  brvbar: '&#166;',
  sect: '&#167;',
  uml: '&#168;',
  copy: '&#169;',
  ordf: '&#170;',
  laquo: '&#171;',
  not: '&#172;',
  shy: '&#173;',
  reg: '&#174;',
  macr: '&#175;',
  deg: '&#176;',
  plusmn: '&#177;',
  sup2: '&#178;',
  sup3: '&#179;',
  acute: '&#180;',
  micro: '&#181;',
  para: '&#182;',
  middot: '&#183;',
  cedil: '&#184;',
  sup1: '&#185;',
  ordm: '&#186;',
  raquo: '&#187;',
  frac14: '&#188;',
  frac12: '&#189;',
  frac34: '&#190;',
  iquest: '&#191;',
  times: '&#215;',
  divide: '&#247;',
  OElig: '&#338;',
  oelig: '&#339;',
  Scaron: '&#352;',
  scaron: '&#353;',
  Yuml: '&#376;',
  fnof: '&#402;',
  circ: '&#710;',
  tilde: '&#732;',
  Alpha: '&#913;',
  Beta: '&#914;',
  Gamma: '&#915;',
  Delta: '&#916;',
  Epsilon: '&#917;',
  Zeta: '&#918;',
  Eta: '&#919;',
  Theta: '&#920;',
  Iota: '&#921;',
  Kappa: '&#922;',
  Lambda: '&#923;',
  Mu: '&#924;',
  Nu: '&#925;',
  Xi: '&#926;',
  Omicron: '&#927;',
  Pi: '&#928;',
  Rho: '&#929;',
  Sigma: '&#931;',
  Tau: '&#932;',
  Upsilon: '&#933;',
  Phi: '&#934;',
  Chi: '&#935;',
  Psi: '&#936;',
  Omega: '&#937;',
  alpha: '&#945;',
  beta: '&#946;',
  gamma: '&#947;',
  delta: '&#948;',
  epsilon: '&#949;',
  zeta: '&#950;',
  eta: '&#951;',
  theta: '&#952;',
  iota: '&#953;',
  kappa: '&#954;',
  lambda: '&#955;',
  mu: '&#956;',
  nu: '&#957;',
  xi: '&#958;',
  omicron: '&#959;',
  pi: '&#960;',
  rho: '&#961;',
  sigmaf: '&#962;',
  sigma: '&#963;',
  tau: '&#964;',
  upsilon: '&#965;',
  phi: '&#966;',
  chi: '&#967;',
  psi: '&#968;',
  omega: '&#969;',
  thetasym: '&#977;',
  upsih: '&#978;',
  piv: '&#982;',
  ensp: '&#8194;',
  emsp: '&#8195;',
  thinsp: '&#8201;',
  zwnj: '&#8204;',
  zwj: '&#8205;',
  lrm: '&#8206;',
  rlm: '&#8207;',
  ndash: '&#8211;',
  mdash: '&#8212;',
  lsquo: '&#8216;',
  rsquo: '&#8217;',
  sbquo: '&#8218;',
  ldquo: '&#8220;',
  rdquo: '&#8221;',
  bdquo: '&#8222;',
  dagger: '&#8224;',
  Dagger: '&#8225;',
  bull: '&#8226;',
  hellip: '&#8230;',
  permil: '&#8240;',
  prime: '&#8242;',
  Prime: '&#8243;',
  lsaquo: '&#8249;',
  rsaquo: '&#8250;',
  oline: '&#8254;',
  frasl: '&#8260;',
  euro: '&#8364;',
  trade: '&#8482;',
  larr: '&#8592;',
  uarr: '&#8593;',
  rarr: '&#8594;',
  darr: '&#8595;',
  harr: '&#8596;',
  crarr: '&#8629;',
  lceil: '&#8968;',
  rceil: '&#8969;',
  lfloor: '&#8970;',
  rfloor: '&#8971;',
  loz: '&#9674;',
  spades: '&#9824;',
  clubs: '&#9827;',
  hearts: '&#9829;',
  diams: '&#9830;',
};

/**
 * Replaces non-XML named entities with decimal numeric character references.
 */
export function sanitizeXmlEntities(html: string): string {
  if (!html) return '';
  return html.replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
    if (['amp', 'lt', 'gt', 'quot', 'apos'].includes(entity)) {
      return match;
    }
    return HTML_ENTITY_MAP[entity] || match;
  });
}

/**
 * Ensures all HTML void elements are self-closing (<img ... />, <br />, <hr />, etc.)
 */
export function selfCloseVoidElements(html: string): string {
  if (!html) return '';
  return html.replace(
    /<(img|br|hr|input|col|area|base|embed|source|track|wbr|link|meta)(\b[^>]*?)(?<!\/)>/gi,
    '<$1$2 />'
  );
}

/**
 * Wraps body HTML in a standard, fully compliant EPUB 3 / XHTML 1.1 document structure.
 * Guarantees well-formed XML: self-closing void elements (img, br, hr), valid entities,
 * and matched tags, preventing "Unexpected closing tag" XML parser errors in e-readers.
 */
export function wrapInXhtml(bodyContent: string, title: string = 'Chapter', cssHrefs: string[] = []): string {
  const safeTitle = escapeXml(title || 'Chapter');
  const safeContent = bodyContent || '<p>&#160;</p>';

  if (typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined') {
    try {
      const parser = new DOMParser();
      // Parse content into HTML DOM so HTML5 parser normalizes unclosed/mismatched tags and entities
      const doc = parser.parseFromString(
        `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
  </head>
  <body>${safeContent}</body>
</html>`,
        'text/html'
      );

      // Append CSS link tags to <head>
      const head = doc.head;
      for (const href of cssHrefs) {
        if (href) {
          const link = doc.createElement('link');
          link.setAttribute('rel', 'stylesheet');
          link.setAttribute('type', 'text/css');
          link.setAttribute('href', href);
          head.appendChild(link);
        }
      }

      // Configure root <html> element with required XHTML and EPUB namespaces
      const root = doc.documentElement;
      root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      root.setAttribute('xmlns:epub', 'http://www.idpf.org/2007/ops');
      if (!root.getAttribute('xml:lang')) {
        root.setAttribute('xml:lang', 'en');
      }
      if (!root.getAttribute('lang')) {
        root.setAttribute('lang', 'en');
      }

      // Clean up any stray editor markup or non-standard attributes if present
      const cleanElements = doc.body.querySelectorAll('[contenteditable], [data-gramm], [spellcheck]');
      cleanElements.forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-gramm');
        el.removeAttribute('spellcheck');
      });

      // Serialize DOM tree to XML (which outputs self-closing <img />, <br />, <hr />, and escaped text)
      const serializer = new XMLSerializer();
      let serialized = serializer.serializeToString(doc);

      // Normalize XML declaration and DOCTYPE
      serialized = serialized.replace(/^<\?xml[^>]*\?>\s*/i, '');
      serialized = serialized.replace(/^<!DOCTYPE\s+html[^>]*>\s*/i, '');

      // Replace any residual named entities with XML-compatible numeric character references
      serialized = sanitizeXmlEntities(serialized);

      const finalXhtml = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n` + serialized;

      // Validate well-formedness with XML parser
      const testDoc = parser.parseFromString(finalXhtml, 'application/xhtml+xml');
      const parserError = testDoc.querySelector('parsererror');
      if (!parserError) {
        return finalXhtml;
      }
      console.warn('XHTML XML validation encountered an issue, applying fallback self-closing fixes:', parserError.textContent);
    } catch (err) {
      console.warn('Error during DOM-based XHTML serialization, falling back to regex sanitizer:', err);
    }
  }

  // Fallback regex-based serialization for non-DOM environments or unexpected parser failures
  const cssLinks = cssHrefs
    .map(href => `    <link rel="stylesheet" type="text/css" href="${href}" />`)
    .join('\n');

  let sanitizedBody = sanitizeXmlEntities(safeContent);
  sanitizedBody = selfCloseVoidElements(sanitizedBody);

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
${cssLinks ? cssLinks + '\n' : ''}  </head>
  <body>
${sanitizedBody}
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

