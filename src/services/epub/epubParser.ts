import JSZip from 'jszip';
import {
  EpubBook,
  EpubMetadata,
  EpubManifestItem,
  EpubSpineItem,
  EpubTocItem,
  EpubChapter,
  EpubAsset,
} from '../../types/epub';
import { normalizePath, getDirectory, resolvePath } from './pathUtils';
import { calculateWordCount, extractChapterTitle, injectAssetUrls } from './htmlUtils';

/**
 * Parses an EPUB file (ArrayBuffer or File or Uint8Array) into an editable EpubBook data structure.
 */
export async function parseEpub(data: ArrayBuffer | Uint8Array, fileName: string = 'book.epub'): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(data);
  const rawFiles = new Map<string, Uint8Array>();

  // Extract all files into rawFiles map
  const filePromises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      filePromises.push(
        zipEntry.async('uint8array').then(bytes => {
          rawFiles.set(normalizePath(relativePath), bytes);
        })
      );
    }
  });
  await Promise.all(filePromises);

  // 1. Locate container.xml
  const containerBytes = rawFiles.get('META-INF/container.xml') || rawFiles.get('meta-inf/container.xml');
  if (!containerBytes) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found.');
  }

  const containerXml = new TextDecoder('utf-8').decode(containerBytes);
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Invalid EPUB: No rootfile full-path found in container.xml.');
  }

  const normalizedOpfPath = normalizePath(opfPath);
  const opfDir = getDirectory(normalizedOpfPath);

  // 2. Read OPF package document
  const opfBytes = rawFiles.get(normalizedOpfPath);
  if (!opfBytes) {
    throw new Error(`OPF package file not found at ${normalizedOpfPath}`);
  }

  const opfXml = new TextDecoder('utf-8').decode(opfBytes);
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Parse Version
  const packageEl = opfDoc.querySelector('package');
  const version = packageEl?.getAttribute('version') || '3.0';

  // 3. Parse Metadata
  const metadataEl = opfDoc.querySelector('metadata');
  const metadata: EpubMetadata = {
    title: getTagText(metadataEl, 'title') || 'Untitled Book',
    creator: getTagText(metadataEl, 'creator') || 'Unknown Author',
    language: getTagText(metadataEl, 'language') || 'en',
    identifier: getTagText(metadataEl, 'identifier') || generateUuid(),
    publisher: getTagText(metadataEl, 'publisher') || '',
    pubdate: getTagText(metadataEl, 'date') || '',
    rights: getTagText(metadataEl, 'rights') || '',
    description: getTagText(metadataEl, 'description') || '',
    subjects: getAllTagText(metadataEl, 'subject'),
    series: getMetaProperty(metadataEl, 'belongs-to-collection') || getMetaName(metadataEl, 'calibre:series') || '',
    seriesIndex: getMetaProperty(metadataEl, 'group-position') || getMetaName(metadataEl, 'calibre:series_index') || '',
    modified: getMetaProperty(metadataEl, 'dcterms:modified') || new Date().toISOString(),
  };

  // 4. Parse Manifest
  const manifestEl = opfDoc.querySelector('manifest');
  const manifest: Record<string, EpubManifestItem> = {};
  let coverManifestId: string | undefined;
  let navPath: string | undefined;
  let tocPath: string | undefined;

  if (manifestEl) {
    const items = manifestEl.querySelectorAll('item');
    items.forEach(item => {
      const id = item.getAttribute('id') || '';
      const href = item.getAttribute('href') || '';
      const mediaType = item.getAttribute('media-type') || '';
      const properties = item.getAttribute('properties') || undefined;
      const fullPath = resolvePath(opfDir, href);

      manifest[id] = {
        id,
        href,
        fullPath,
        mediaType,
        properties,
      };

      if (properties?.includes('cover-image')) {
        coverManifestId = id;
      }
      if (properties?.includes('nav')) {
        navPath = fullPath;
      }
      if (mediaType === 'application/x-dtbncx+xml') {
        tocPath = fullPath;
      }
    });
  }

  // Cover image fallback detection
  if (!coverManifestId) {
    // Check <meta name="cover" content="id">
    const coverMeta = metadataEl?.querySelector('meta[name="cover"]');
    const metaCoverId = coverMeta?.getAttribute('content');
    if (metaCoverId && manifest[metaCoverId]) {
      coverManifestId = metaCoverId;
    }
  }
  if (!coverManifestId) {
    // Check guide
    const guideEl = opfDoc.querySelector('guide');
    const coverRef = guideEl?.querySelector('reference[type="cover"]');
    const coverHref = coverRef?.getAttribute('href');
    if (coverHref) {
      const full = resolvePath(opfDir, coverHref);
      const found = Object.values(manifest).find(m => m.fullPath === full);
      if (found) coverManifestId = found.id;
    }
  }
  if (!coverManifestId) {
    // Check item with id containing 'cover' and image media-type
    const found = Object.values(manifest).find(
      m => m.mediaType.startsWith('image/') && (m.id.toLowerCase().includes('cover') || m.href.toLowerCase().includes('cover'))
    );
    if (found) coverManifestId = found.id;
  }

  // 5. Parse Spine
  const spineEl = opfDoc.querySelector('spine');
  const spine: EpubSpineItem[] = [];
  const spineTocId = spineEl?.getAttribute('toc');
  if (spineTocId && manifest[spineTocId]) {
    tocPath = manifest[spineTocId].fullPath;
  }

  if (spineEl) {
    const itemrefs = spineEl.querySelectorAll('itemref');
    itemrefs.forEach(ref => {
      const idref = ref.getAttribute('idref');
      const linear = ref.getAttribute('linear') || undefined;
      if (idref && manifest[idref]) {
        spine.push({ idref, linear });
      }
    });
  }

  // 6. Build Assets & Blob URLs
  const assets: EpubAsset[] = [];
  let coverImageUrl: string | undefined;
  let coverMediaType: string | undefined;

  for (const item of Object.values(manifest)) {
    const bytes = rawFiles.get(item.fullPath);
    if (bytes) {
      let blobUrl: string | undefined;
      if (item.mediaType.startsWith('image/') || item.mediaType.startsWith('font/') || item.mediaType.includes('css')) {
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: item.mediaType });
        blobUrl = URL.createObjectURL(blob);
      }

      const asset: EpubAsset = {
        id: item.id,
        href: item.href,
        fullPath: item.fullPath,
        mediaType: item.mediaType,
        size: bytes.length,
        blobUrl,
        data: bytes,
      };
      assets.push(asset);

      if (item.id === coverManifestId && blobUrl) {
        coverImageUrl = blobUrl;
        coverMediaType = item.mediaType;
      }
    }
  }

  // 7. Parse Table of Contents (TOC)
  let toc: EpubTocItem[] = [];

  // Try EPUB 3 nav document first
  if (navPath && rawFiles.has(navPath)) {
    try {
      const navBytes = rawFiles.get(navPath)!;
      const navHtml = new TextDecoder('utf-8').decode(navBytes);
      toc = parseNavDocument(navHtml, navPath, manifest);
    } catch (err) {
      console.warn('Failed to parse EPUB3 nav document, falling back to NCX or spine:', err);
    }
  }

  // Try EPUB 2 NCX document if TOC is empty
  if (toc.length === 0 && tocPath && rawFiles.has(tocPath)) {
    try {
      const ncxBytes = rawFiles.get(tocPath)!;
      const ncxXml = new TextDecoder('utf-8').decode(ncxBytes);
      toc = parseNcxDocument(ncxXml, tocPath, manifest);
    } catch (err) {
      console.warn('Failed to parse NCX document:', err);
    }
  }

  // 8. Extract Chapters in Spine Order
  const chapters: EpubChapter[] = [];
  let order = 0;

  for (const spineItem of spine) {
    const manifestItem = manifest[spineItem.idref];
    if (!manifestItem) continue;

    const bytes = rawFiles.get(manifestItem.fullPath);
    if (!bytes) continue;

    const rawXhtml = new TextDecoder('utf-8').decode(bytes);
    
    // Find matching TOC item title or extract from content
    let title = findTitleInToc(toc, manifestItem.href) || extractChapterTitle(rawXhtml, `Chapter ${order + 1}`);

    // If it's the cover page
    if (manifestItem.id.toLowerCase().includes('cover') && !title.toLowerCase().includes('cover')) {
      title = 'Cover';
    }

    const editableContent = injectAssetUrls(rawXhtml, manifestItem.fullPath, assets);
    const wordCount = calculateWordCount(editableContent);

    chapters.push({
      id: manifestItem.id,
      href: manifestItem.href,
      fullPath: manifestItem.fullPath,
      title,
      content: editableContent,
      originalXhtml: rawXhtml,
      order: order++,
      wordCount,
    });
  }

  // If TOC was completely empty, generate from chapters
  if (toc.length === 0) {
    toc = chapters.map((ch, idx) => ({
      id: `toc-${idx + 1}`,
      title: ch.title,
      href: ch.href,
      chapterId: ch.id,
      level: 1,
    }));
  }

  return {
    version,
    opfPath: normalizedOpfPath,
    opfDir,
    metadata,
    manifest,
    spine,
    chapters,
    toc,
    tocPath,
    navPath,
    coverManifestId,
    coverImageUrl,
    coverMediaType,
    assets,
    rawFiles,
    originalFileName: fileName,
  };
}

/**
 * Helper to get text content of first tag matching localName
 */
function getTagText(parent: Element | null, tagName: string): string {
  if (!parent) return '';
  const elements = parent.querySelectorAll(tagName);
  for (let i = 0; i < elements.length; i++) {
    const text = elements[i].textContent?.trim();
    if (text) return text;
  }
  // Try with dc: prefix or generic
  const all = parent.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === tagName) {
      return all[i].textContent?.trim() || '';
    }
  }
  return '';
}

/**
 * Helper to get text content of all tags matching localName
 */
function getAllTagText(parent: Element | null, tagName: string): string[] {
  if (!parent) return [];
  const results: string[] = [];
  const all = parent.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === tagName) {
      const text = all[i].textContent?.trim();
      if (text) results.push(text);
    }
  }
  return results;
}

function getMetaProperty(parent: Element | null, property: string): string {
  if (!parent) return '';
  const meta = parent.querySelector(`meta[property="${property}"]`);
  return meta?.textContent?.trim() || '';
}

function getMetaName(parent: Element | null, name: string): string {
  if (!parent) return '';
  const meta = parent.querySelector(`meta[name="${name}"]`);
  return meta?.getAttribute('content')?.trim() || '';
}

function generateUuid(): string {
  return 'urn:uuid:' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseNavDocument(
  navHtml: string,
  navFullPath: string,
  manifest: Record<string, EpubManifestItem>
): EpubTocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(navHtml, 'text/html');
  const navEl = doc.querySelector('nav[*|type="toc"], nav#toc, nav.toc, nav');
  if (!navEl) return [];

  const ol = navEl.querySelector('ol');
  if (!ol) return [];

  const navDir = getDirectory(navFullPath);
  let idCounter = 1;

  function parseOl(element: Element, level: number): EpubTocItem[] {
    const items: EpubTocItem[] = [];
    const directLis = Array.from(element.children).filter(el => el.tagName.toLowerCase() === 'li');

    for (const li of directLis) {
      const a = li.querySelector(':scope > a, :scope > span');
      if (!a) continue;

      const title = a.textContent?.trim() || 'Untitled';
      const rawHref = a.getAttribute('href') || '';
      const fullTarget = rawHref ? resolvePath(navDir, rawHref.split('#')[0]) : '';
      
      // Match with manifest item ID
      const matchingItem = Object.values(manifest).find(m => m.fullPath === fullTarget);

      const subOl = li.querySelector(':scope > ol');
      const children = subOl ? parseOl(subOl, level + 1) : undefined;

      items.push({
        id: `toc-${idCounter++}`,
        title,
        href: rawHref,
        chapterId: matchingItem?.id,
        level,
        children: children && children.length > 0 ? children : undefined,
      });
    }
    return items;
  }

  return parseOl(ol, 1);
}

function parseNcxDocument(
  ncxXml: string,
  ncxFullPath: string,
  manifest: Record<string, EpubManifestItem>
): EpubTocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(ncxXml, 'application/xml');
  const navMap = doc.querySelector('navMap');
  if (!navMap) return [];

  const ncxDir = getDirectory(ncxFullPath);
  let idCounter = 1;

  function parseNavPoints(parent: Element, level: number): EpubTocItem[] {
    const items: EpubTocItem[] = [];
    const navPoints = Array.from(parent.children).filter(el => el.localName === 'navPoint');

    for (const np of navPoints) {
      const textEl = np.querySelector('navLabel > text');
      const title = textEl?.textContent?.trim() || 'Untitled';
      const contentEl = np.querySelector('content');
      const rawSrc = contentEl?.getAttribute('src') || '';
      const fullTarget = rawSrc ? resolvePath(ncxDir, rawSrc.split('#')[0]) : '';

      const matchingItem = Object.values(manifest).find(m => m.fullPath === fullTarget);
      const children = parseNavPoints(np, level + 1);

      items.push({
        id: np.getAttribute('id') || `ncx-${idCounter++}`,
        title,
        href: rawSrc,
        chapterId: matchingItem?.id,
        level,
        children: children.length > 0 ? children : undefined,
      });
    }
    return items;
  }

  return parseNavPoints(navMap, 1);
}

function findTitleInToc(tocList: EpubTocItem[], href: string): string | null {
  const cleanHref = href.split('#')[0];
  for (const item of tocList) {
    if (item.href.split('#')[0] === cleanHref) {
      return item.title;
    }
    if (item.children) {
      const sub = findTitleInToc(item.children, href);
      if (sub) return sub;
    }
  }
  return null;
}
