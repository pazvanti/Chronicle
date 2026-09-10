import JSZip from 'jszip';
import { EpubBook, EpubTocItem } from '../../types/epub';
import { escapeXml, restoreAssetUrls, wrapInXhtml } from './htmlUtils';
import { resolvePath, getRelativePath, getDirectory } from './pathUtils';
import { stripCommentsFromHtml } from './commentHighlightService';

/**
 * Builds and packages a fully compliant EPUB 3 / EPUB 2 file and returns a Blob for download.
 */
export async function exportEpub(book: EpubBook): Promise<Blob> {
  const zip = new JSZip();

  // 1. First Entry: mimetype (MUST BE UNCOMPRESSED / STORE)
  zip.file('mimetype', 'application/epub+zip', {
    compression: 'STORE',
  });

  // 2. META-INF/container.xml
  const opfFullPath = book.opfPath || 'OEBPS/content.opf';
  const opfDir = getDirectory(opfFullPath);

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${opfFullPath}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  zip.folder('META-INF')?.file('container.xml', containerXml);

  // 3. Ensure TOC files (nav.xhtml and toc.ncx) are registered in manifest
  const navHref = book.navPath ? getRelativePath(opfFullPath, book.navPath) : 'nav.xhtml';
  const navFullPath = resolvePath(opfDir, navHref);
  
  const ncxHref = book.tocPath ? getRelativePath(opfFullPath, book.tocPath) : 'toc.ncx';
  const ncxFullPath = resolvePath(opfDir, ncxHref);

  const manifest = { ...book.manifest };

  // Register Nav item
  const navId = Object.keys(manifest).find(k => manifest[k].properties?.includes('nav')) || 'nav';
  manifest[navId] = {
    id: navId,
    href: navHref,
    fullPath: navFullPath,
    mediaType: 'application/xhtml+xml',
    properties: 'nav',
  };

  // Register NCX item
  const ncxId = Object.keys(manifest).find(k => manifest[k].mediaType === 'application/x-dtbncx+xml') || 'ncx';
  manifest[ncxId] = {
    id: ncxId,
    href: ncxHref,
    fullPath: ncxFullPath,
    mediaType: 'application/x-dtbncx+xml',
  };

  // 4. Ensure Cover Image is in manifest with properties="cover-image"
  if (book.coverManifestId && manifest[book.coverManifestId]) {
    manifest[book.coverManifestId] = {
      ...manifest[book.coverManifestId],
      properties: manifest[book.coverManifestId].properties
        ? Array.from(new Set([...manifest[book.coverManifestId].properties!.split(' '), 'cover-image'])).join(' ')
        : 'cover-image',
    };
  }

  // 5. Generate and add Nav Document (nav.xhtml - EPUB3)
  const navHtml = generateNavXhtml(book.metadata.title, book.toc, navFullPath, book);
  zip.file(navFullPath, navHtml);

  // 6. Generate and add NCX Document (toc.ncx - EPUB2)
  const ncxXml = generateTocNcx(book.metadata.title, book.metadata.identifier, book.toc, ncxFullPath, book);
  zip.file(ncxFullPath, ncxXml);

  // 7. Write all Chapter XHTML files
  const chapterMap = new Map(book.chapters.map(c => [c.id, c]));
  for (const spineItem of book.spine) {
    const chapter = chapterMap.get(spineItem.idref);
    if (chapter) {
      // Restore asset URLs & strip internal author comment highlights
      const strippedContent = stripCommentsFromHtml(chapter.content);
      const cleanedBody = restoreAssetUrls(strippedContent, chapter.fullPath, book.assets);
      const fullXhtml = wrapInXhtml(cleanedBody, chapter.title);
      zip.file(chapter.fullPath, fullXhtml);
    }
  }

  // 8. Write all Assets (Images, CSS, Fonts, Cover, etc.)
  for (const asset of book.assets) {
    // If it's a chapter or nav or ncx, handled separately
    if (chapterMap.has(asset.id) || asset.id === navId || asset.id === ncxId) {
      continue;
    }

    if (asset.data) {
      zip.file(asset.fullPath, asset.data);
    } else if (book.rawFiles.has(asset.fullPath)) {
      zip.file(asset.fullPath, book.rawFiles.get(asset.fullPath)!);
    }
  }

  // 9. Generate and add OPF Package Document (content.opf)
  const opfXml = generateOpfXml(book, manifest, ncxId);
  zip.file(opfFullPath, opfXml);

  // 10. Generate EPUB Zip Blob
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Generates OPF XML Document
 */
function generateOpfXml(
  book: EpubBook,
  manifest: Record<string, any>,
  ncxId: string
): string {
  const meta = book.metadata;
  const nowIso = new Date().toISOString();

  const manifestEntries = Object.values(manifest)
    .map(item => {
      const propsAttr = item.properties ? ` properties="${escapeXml(item.properties)}"` : '';
      return `    <item id="${escapeXml(item.id)}" href="${escapeXml(item.href)}" media-type="${escapeXml(item.mediaType)}"${propsAttr}/>`;
    })
    .join('\n');

  const spineEntries = book.spine
    .map(item => {
      const linearAttr = item.linear ? ` linear="${escapeXml(item.linear)}"` : '';
      return `    <itemref idref="${escapeXml(item.idref)}"${linearAttr}/>`;
    })
    .join('\n');

  const subjectsXml = meta.subjects
    ? meta.subjects.map(s => `    <dc:subject>${escapeXml(s)}</dc:subject>`).join('\n')
    : '';

  const coverMetaXml = book.coverManifestId
    ? `    <meta name="cover" content="${escapeXml(book.coverManifestId)}"/>`
    : '';

  const seriesXml = meta.series
    ? `    <meta property="belongs-to-collection" id="series">${escapeXml(meta.series)}</meta>\n    <meta refines="#series" property="collection-type">series</meta>${
        meta.seriesIndex ? `\n    <meta refines="#series" property="group-position">${escapeXml(meta.seriesIndex)}</meta>` : ''
      }`
    : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf" xml:lang="${escapeXml(meta.language || 'en')}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${escapeXml(meta.identifier || 'urn:uuid:default')}</dc:identifier>
    <dc:title>${escapeXml(meta.title || 'Untitled')}</dc:title>
    <dc:creator id="creator">${escapeXml(meta.creator || 'Unknown')}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
    <dc:language>${escapeXml(meta.language || 'en')}</dc:language>
    <dc:publisher>${escapeXml(meta.publisher || '')}</dc:publisher>
    <dc:date>${escapeXml(meta.pubdate || nowIso.substring(0, 10))}</dc:date>
    <dc:rights>${escapeXml(meta.rights || 'Public Domain')}</dc:rights>
    <dc:description>${escapeXml(meta.description || '')}</dc:description>
${subjectsXml ? subjectsXml + '\n' : ''}${coverMetaXml ? coverMetaXml + '\n' : ''}${seriesXml ? seriesXml + '\n' : ''}    <meta property="dcterms:modified">${nowIso}</meta>
  </metadata>
  <manifest>
${manifestEntries}
  </manifest>
  <spine toc="${escapeXml(ncxId)}">
${spineEntries}
  </spine>
  <guide>
${
  book.coverManifestId && manifest[book.coverManifestId]
    ? `    <reference type="cover" title="Cover" href="${escapeXml(manifest[book.coverManifestId].href)}"/>\n`
    : ''
}    <reference type="toc" title="Table of Contents" href="${escapeXml(manifest[ncxId]?.href || 'toc.ncx')}"/>
  </guide>
</package>`;
}

/**
 * Generates EPUB 3 nav.xhtml document
 */
function generateNavXhtml(
  title: string,
  toc: EpubTocItem[],
  navFullPath: string,
  book: EpubBook
): string {
  const navDir = getDirectory(navFullPath);

  function renderTocList(items: EpubTocItem[]): string {
    return `<ol>
${items
  .map(item => {
    // Find chapter fullPath to compute relative link
    let targetHref = item.href;
    const matchingChapter = book.chapters.find(c => c.id === item.chapterId);
    if (matchingChapter) {
      targetHref = getRelativePath(navDir, matchingChapter.fullPath);
    }
    const childrenHtml = item.children && item.children.length > 0 ? '\n' + renderTocList(item.children) : '';
    return `        <li><a href="${escapeXml(targetHref)}">${escapeXml(item.title)}</a>${childrenHtml}</li>`;
  })
  .join('\n')}
      </ol>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(title)} - Table of Contents</title>
    <style>
      nav ol { list-style-type: none; padding-left: 1.5rem; }
      nav li { margin: 0.5rem 0; }
      nav a { text-decoration: none; color: inherit; }
    </style>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Table of Contents</h1>
      ${renderTocList(toc)}
    </nav>
  </body>
</html>`;
}

/**
 * Generates EPUB 2 toc.ncx document
 */
function generateTocNcx(
  title: string,
  identifier: string,
  toc: EpubTocItem[],
  ncxFullPath: string,
  book: EpubBook
): string {
  const ncxDir = getDirectory(ncxFullPath);
  let playOrder = 1;

  function renderNavPoints(items: EpubTocItem[]): string {
    return items
      .map(item => {
        let targetHref = item.href;
        const matchingChapter = book.chapters.find(c => c.id === item.chapterId);
        if (matchingChapter) {
          targetHref = getRelativePath(ncxDir, matchingChapter.fullPath);
        }
        const currentOrder = playOrder++;
        const childrenXml = item.children && item.children.length > 0 ? '\n' + renderNavPoints(item.children) : '';

        return `    <navPoint id="navPoint-${currentOrder}" playOrder="${currentOrder}">
      <navLabel>
        <text>${escapeXml(item.title)}</text>
      </navLabel>
      <content src="${escapeXml(targetHref)}"/>${childrenXml}
    </navPoint>`;
      })
      .join('\n');
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(identifier || 'urn:uuid:default')}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title || 'Untitled')}</text>
  </docTitle>
  <navMap>
${renderNavPoints(toc)}
  </navMap>
</ncx>`;
}
