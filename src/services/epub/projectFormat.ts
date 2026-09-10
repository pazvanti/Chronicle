import JSZip from 'jszip';
import {
  EpubBook,
  EpubChapter,
  EpubMetadata,
  EpubTocItem,
  EpubManifestItem,
  EpubSpineItem,
  EpubAsset,
  WriterProjectData,
  CharacterProfile,
  CharacterTraitItem,
  StoryTimeline,
  TimelineSegment,
  TimelineEvent,
  LocationCodexEntry,
  LocationFeatureItem,
  AuthorComment,
} from '../../types/epub';

export const CHRONICLE_PROJECT_EXTENSION = '.chronicle';
export const CHRONICLE_PROJECT_MIME = 'application/x-chronicle+zip';

// Backward compatibility alias
export const STUDIO_PROJECT_EXTENSION = CHRONICLE_PROJECT_EXTENSION;
export const STUDIO_PROJECT_MIME = CHRONICLE_PROJECT_MIME;

export interface ChronicleProjectManifest {
  format: 'chronicle' | 'epubstudio';
  formatVersion: '1.0.0';
  app: string;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  author: string;
  originalFileName: string;
  epubVersion: string;
  opfPath: string;
  opfDir: string;
  coverManifestId?: string;
  coverMediaType?: string;
  navPath?: string;
  tocPath?: string;
}

export type StudioProjectManifest = ChronicleProjectManifest;

/**
 * Checks whether a given file name or file matches the .chronicle (or legacy .epubstudio) project format.
 */
export function isChronicleProjectFile(fileOrName: File | string): boolean {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.chronicle') ||
    lower.endsWith('.epubstudio') ||
    lower.endsWith('.eproj')
  );
}

export const isStudioProjectFile = isChronicleProjectFile;

/**
 * Serializes an active EpubBook and its writer data into a high-performance .chronicle zip package.
 */
export async function saveChronicleProject(book: EpubBook): Promise<Blob> {
  const zip = new JSZip();

  // 1. Master project manifest
  const projectManifest: ChronicleProjectManifest = {
    format: 'chronicle',
    formatVersion: '1.0.0',
    app: 'Chronicle',
    appVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: book.metadata?.title || 'Untitled Manuscript',
    author: book.metadata?.creator || 'Unknown Author',
    originalFileName: book.originalFileName,
    epubVersion: book.version || '3.0',
    opfPath: book.opfPath || 'OEBPS/content.opf',
    opfDir: book.opfDir || 'OEBPS/',
    coverManifestId: book.coverManifestId,
    coverMediaType: book.coverMediaType,
    navPath: book.navPath || undefined,
    tocPath: book.tocPath || undefined,
  };

  zip.file('project.json', JSON.stringify(projectManifest, null, 2));

  // 2. Core Book Metadata
  zip.file('metadata.json', JSON.stringify(book.metadata, null, 2));

  // 3. Table of Contents Structure
  zip.file('toc.json', JSON.stringify(book.toc, null, 2));

  // 4. Manifest & Spine
  zip.file('manifest.json', JSON.stringify(book.manifest, null, 2));
  zip.file('spine.json', JSON.stringify(book.spine, null, 2));

  // 5. Chapters (content, original xhtml, word count, and ordering)
  const chaptersFolder = zip.folder('chapters');
  book.chapters.forEach(chapter => {
    chaptersFolder?.file(
      `${chapter.id}.json`,
      JSON.stringify(
        {
          id: chapter.id,
          href: chapter.href,
          fullPath: chapter.fullPath,
          title: chapter.title,
          order: chapter.order,
          wordCount: chapter.wordCount,
          content: chapter.content,
          originalXhtml: chapter.originalXhtml,
        },
        null,
        2
      )
    );
  });

  // 6. Assets (Binary media, cover, fonts, images)
  const assetsFolder = zip.folder('assets');
  book.assets.forEach(asset => {
    let data = asset.data;
    if (!data && book.rawFiles.has(asset.fullPath)) {
      data = book.rawFiles.get(asset.fullPath);
    }
    if (data) {
      assetsFolder?.file(asset.id, data);
    }
  });

  // 7. Writer Data (Characters, Worldbuilding, Story Notes)
  const writerFolder = zip.folder('writer');
  const writerData = book.writerData || {};
  writerFolder?.file('characters.json', JSON.stringify(writerData.characters || [], null, 2));
  writerFolder?.file('locations.json', JSON.stringify(writerData.locations || [], null, 2));
  writerFolder?.file('worldbuilding.json', JSON.stringify(writerData.worldbuilding || [], null, 2));
  writerFolder?.file('timelines.json', JSON.stringify(writerData.timelines || [], null, 2));
  writerFolder?.file('comments.json', JSON.stringify(writerData.comments || [], null, 2));
  writerFolder?.file(
    'notes.json',
    JSON.stringify(
      {
        synopsis: writerData.synopsis || '',
        dailyWordGoal: writerData.dailyWordGoal || 0,
        customNotes: writerData.customNotes || '',
      },
      null,
      2
    )
  );

  // 8. Raw EPUB support files (container.xml, OPF, etc.)
  const rawFolder = zip.folder('raw_files');
  book.rawFiles.forEach((bytes, path) => {
    // Only store structural files that aren't chapters/assets to save space
    if (
      path.endsWith('.xml') ||
      path.endsWith('.opf') ||
      path.endsWith('.ncx') ||
      path.endsWith('mimetype')
    ) {
      rawFolder?.file(encodeURIComponent(path), bytes);
    }
  });

  return await zip.generateAsync({
    type: 'blob',
    mimeType: CHRONICLE_PROJECT_MIME,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export const saveStudioProject = saveChronicleProject;

/**
 * Parses and reconstructs an EpubBook and its writer data from a .chronicle (or legacy .epubstudio) file.
 */
export async function parseChronicleProject(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string
): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Read project manifest
  const projectFile = zip.file('project.json');
  if (!projectFile) {
    throw new Error('Not a valid Chronicle project file (missing project.json)');
  }

  const manifestStr = await projectFile.async('string');
  const project: ChronicleProjectManifest = JSON.parse(manifestStr);

  // 2. Read metadata
  const metadataFile = zip.file('metadata.json');
  const metadata: EpubMetadata = metadataFile
    ? JSON.parse(await metadataFile.async('string'))
    : {
        title: project.title,
        creator: project.author,
        language: 'en',
        identifier: 'urn:uuid:project',
        publisher: '',
        pubdate: new Date().toISOString(),
        rights: '',
        description: '',
        subjects: [],
      };

  // 3. Read TOC, Manifest, and Spine
  const tocFile = zip.file('toc.json');
  const toc: EpubTocItem[] = tocFile ? JSON.parse(await tocFile.async('string')) : [];

  const manifestFile = zip.file('manifest.json');
  const manifest: Record<string, EpubManifestItem> = manifestFile
    ? JSON.parse(await manifestFile.async('string'))
    : {};

  const spineFile = zip.file('spine.json');
  const spine: EpubSpineItem[] = spineFile ? JSON.parse(await spineFile.async('string')) : [];

  // 4. Read Chapters
  const chapters: EpubChapter[] = [];
  const chaptersFolder = zip.folder('chapters');
  if (chaptersFolder) {
    const chapterFiles = Object.keys(zip.files).filter(
      path => path.startsWith('chapters/') && path.endsWith('.json')
    );

    for (const chPath of chapterFiles) {
      const file = zip.file(chPath);
      if (file) {
        const chStr = await file.async('string');
        const chData = JSON.parse(chStr);
        chapters.push(chData);
      }
    }
    chapters.sort((a, b) => a.order - b.order);
  }

  // 5. Read Assets and reconstruct Blob URLs
  const assets: EpubAsset[] = [];
  const rawFiles = new Map<string, Uint8Array>();
  let coverImageUrl: string | null = null;

  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const [manifestId, item] of Object.entries(manifest)) {
      const assetFile = zip.file(`assets/${manifestId}`);
      if (assetFile) {
        const bytes = await assetFile.async('uint8array');
        const blob = new Blob([bytes as unknown as BlobPart], { type: item.mediaType });
        const blobUrl = URL.createObjectURL(blob);

        const asset: EpubAsset = {
          id: manifestId,
          href: item.href,
          fullPath: item.fullPath,
          mediaType: item.mediaType,
          size: bytes.length,
          blobUrl,
          data: bytes,
        };

        assets.push(asset);
        rawFiles.set(item.fullPath, bytes);

        // Check if cover image
        if (
          item.properties?.includes('cover-image') ||
          item.id === project.coverManifestId ||
          manifestId === 'cover-image'
        ) {
          coverImageUrl = blobUrl;
        }
      }
    }
  }

  // 6. Read Raw EPUB support files
  const rawFilesFolder = zip.folder('raw_files');
  if (rawFilesFolder) {
    const rawPaths = Object.keys(zip.files).filter(
      p => p.startsWith('raw_files/') && !zip.files[p].dir
    );
    for (const rPath of rawPaths) {
      const encodedName = rPath.replace('raw_files/', '');
      const actualPath = decodeURIComponent(encodedName);
      const bytes = await zip.file(rPath)?.async('uint8array');
      if (bytes) {
        rawFiles.set(actualPath, bytes);
      }
    }
  }

  // Populate raw files for chapters too
  chapters.forEach(ch => {
    const enc = new TextEncoder();
    rawFiles.set(ch.fullPath, enc.encode(ch.originalXhtml || ch.content));
  });

  // 7. Read Writer Data
  let writerData: WriterProjectData | undefined = undefined;
  const charsFile = zip.file('writer/characters.json');
  const worldFile = zip.file('writer/worldbuilding.json');
  const notesFile = zip.file('writer/notes.json');
  const commentsFile = zip.file('writer/comments.json');

  if (charsFile || worldFile || notesFile || commentsFile || zip.file('writer/timelines.json') || zip.file('writer/locations.json')) {
    let normalizedChars: CharacterProfile[] = [];
    if (charsFile) {
      try {
        const rawChars: any[] = JSON.parse(await charsFile.async('string'));
        if (Array.isArray(rawChars)) {
          normalizedChars = rawChars.map((char: any, charIdx: number) => {
            let normalizedTraits: CharacterTraitItem[] = [];
            if (Array.isArray(char.traits)) {
              normalizedTraits = char.traits.map((t: any, tIdx: number) => {
                if (typeof t === 'string') {
                  return {
                    id: `trait-${char.id || charIdx}-${tIdx}`,
                    text: t,
                    completed: false,
                  };
                }
                return {
                  id: t.id || `trait-${char.id || charIdx}-${tIdx}`,
                  text: t.text || '',
                  completed: Boolean(t.completed),
                  category: t.category,
                };
              });
            }

            return {
              id: char.id || `char-${Date.now()}-${charIdx}`,
              name: char.name || 'Unnamed Character',
              role: char.role || 'Supporting',
              archetype: char.archetype || '',
              age: char.age || '',
              aliases: char.aliases || '',
              occupation: char.occupation || '',
              oneLineSummary: char.oneLineSummary || '',
              traits: normalizedTraits,
              appearance: char.appearance || char.description || '',
              personality: char.personality || '',
              motivation: char.motivation || '',
              backstory: char.backstory || '',
              notes: char.notes || '',
              color: char.color || undefined,
              avatarUrl: char.avatarUrl || undefined,
            };
          });
        }
      } catch (err) {
        console.warn('Failed to parse writer characters:', err);
      }
    }

    const timelinesFile = zip.file('writer/timelines.json');
    let normalizedTimelines: StoryTimeline[] = [];
    if (timelinesFile) {
      try {
        const rawTimelines = JSON.parse(await timelinesFile.async('string'));
        if (Array.isArray(rawTimelines)) {
          normalizedTimelines = rawTimelines.map((tl: any, tlIdx: number) => ({
            id: tl.id || `timeline-${Date.now()}-${tlIdx}`,
            title: tl.title || 'Main Timeline',
            description: tl.description || '',
            timescale: tl.timescale || 'hours',
            color: tl.color || '#3b82f6',
            totalUnitsPerSegment: tl.totalUnitsPerSegment || 24,
            unitStep: tl.unitStep || 2,
            segments: Array.isArray(tl.segments)
              ? tl.segments.map((seg: any, segIdx: number): TimelineSegment => ({
                  id: seg.id || `seg-${tlIdx}-${segIdx}`,
                  name: seg.name || `Day ${segIdx + 1}`,
                  startOffset: typeof seg.startOffset === 'number' ? seg.startOffset : undefined,
                  zeroHour: typeof seg.zeroHour === 'number' ? seg.zeroHour : undefined,
                  events: Array.isArray(seg.events)
                    ? seg.events.map((ev: any, evIdx: number): TimelineEvent => ({
                        id: ev.id || `ev-${segIdx}-${evIdx}`,
                        title: ev.title || 'Event',
                        description: ev.description || '',
                        start: typeof ev.start === 'number' ? ev.start : 0,
                        duration: typeof ev.duration === 'number' && ev.duration > 0 ? ev.duration : 1,
                        color: ev.color || '#2563eb',
                        lane: typeof ev.lane === 'number' ? ev.lane : 0,
                        characters: Array.isArray(ev.characters) ? ev.characters : [],
                        notes: ev.notes || '',
                      }))
                    : [],
                }))
              : [],
          }));
        }
      } catch (err) {
        console.warn('Failed to parse writer timelines:', err);
      }
    }

    const locationsFile = zip.file('writer/locations.json');
    let normalizedLocations: LocationCodexEntry[] = [];
    if (locationsFile) {
      try {
        const rawLocations = JSON.parse(await locationsFile.async('string'));
        if (Array.isArray(rawLocations)) {
          normalizedLocations = rawLocations.map((loc: any, locIdx: number): LocationCodexEntry => {
            const normalizedFeatures: LocationFeatureItem[] = Array.isArray(loc.features)
              ? loc.features.map((f: any, fIdx: number): LocationFeatureItem => ({
                  id: f.id || `feat-${Date.now()}-${fIdx}`,
                  name: f.name || f.text || 'Unnamed Feature',
                  description: f.description || '',
                  explored: typeof f.explored === 'boolean' ? f.explored : !!f.completed,
                  category: f.category || 'landmark',
                }))
              : [];

            return {
              id: loc.id || `loc-${Date.now()}-${locIdx}`,
              name: loc.name || 'Unnamed Location',
              type: loc.type || 'Interior',
              scale: loc.scale || 'Building / Structure',
              aliases: loc.aliases || '',
              region: loc.region || '',
              oneLineSummary: loc.oneLineSummary || '',
              atmosphere: loc.atmosphere || '',
              sight: loc.sight || '',
              sound: loc.sound || '',
              smell: loc.smell || '',
              touchWeather: loc.touchWeather || '',
              features: normalizedFeatures,
              history: loc.history || '',
              lore: loc.lore || '',
              rulesHazards: loc.rulesHazards || '',
              significance: loc.significance || '',
              connectedCharacters: Array.isArray(loc.connectedCharacters) ? loc.connectedCharacters : [],
              connectedLocations: Array.isArray(loc.connectedLocations) ? loc.connectedLocations : [],
              notes: loc.notes || '',
              color: loc.color || '#3b82f6',
              imageUrl: loc.imageUrl || undefined,
            };
          });
        }
      } catch (err) {
        console.warn('Failed to parse writer locations:', err);
      }
    }

    let normalizedComments: AuthorComment[] = [];
    if (commentsFile) {
      try {
        const rawComments = JSON.parse(await commentsFile.async('string'));
        if (Array.isArray(rawComments)) {
          normalizedComments = rawComments.map((c: any, cIdx: number): AuthorComment => ({
            id: c.id || `comment-${Date.now()}-${cIdx}`,
            chapterId: c.chapterId || '',
            selectedText: c.selectedText || '',
            comment: c.comment || '',
            color: c.color || '#fef08a',
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || undefined,
          }));
        }
      } catch (err) {
        console.warn('Failed to parse writer comments:', err);
      }
    }

    writerData = {
      characters: normalizedChars,
      locations: normalizedLocations,
      worldbuilding: worldFile ? JSON.parse(await worldFile.async('string')) : [],
      timelines: normalizedTimelines,
      comments: normalizedComments,
    };
    if (notesFile) {
      const parsedNotes = JSON.parse(await notesFile.async('string'));
      writerData.synopsis = parsedNotes.synopsis;
      writerData.dailyWordGoal = parsedNotes.dailyWordGoal;
      writerData.customNotes = parsedNotes.customNotes;
    }
  }

  return {
    version: project.epubVersion,
    opfPath: project.opfPath,
    opfDir: project.opfDir,
    metadata,
    manifest,
    spine,
    chapters,
    toc,
    tocPath: project.tocPath,
    navPath: project.navPath,
    coverManifestId: project.coverManifestId,
    coverImageUrl: coverImageUrl || undefined,
    coverMediaType: project.coverMediaType,
    assets,
    rawFiles,
    originalFileName: fileName.replace(/\.(chronicle|epubstudio)$/i, '.epub'),
    writerData,
  };
}

export const parseStudioProject = parseChronicleProject;
