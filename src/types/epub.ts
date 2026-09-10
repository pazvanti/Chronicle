export interface EpubMetadata {
  title: string;
  creator: string; // Author
  language: string;
  identifier: string; // ISBN or UUID
  publisher: string;
  pubdate: string;
  rights: string;
  description: string;
  subjects: string[];
  series?: string;
  seriesIndex?: string;
  modified?: string;
}

export interface EpubManifestItem {
  id: string;
  href: string; // relative to OPF
  fullPath: string; // full path inside zip
  mediaType: string;
  properties?: string;
  fallback?: string;
  mediaOverlay?: string;
}

export interface EpubSpineItem {
  idref: string;
  linear?: string; // 'yes' | 'no'
}

export interface EpubTocItem {
  id: string;
  title: string;
  href: string;
  chapterId?: string; // matching manifest item ID
  level: number;
  children?: EpubTocItem[];
}

export interface EpubChapter {
  id: string; // Manifest ID
  href: string;
  fullPath: string;
  title: string;
  content: string; // Cleaned/editable XHTML/HTML string
  originalXhtml: string;
  order: number;
  wordCount: number;
}

export interface EpubAsset {
  id: string;
  href: string;
  fullPath: string;
  mediaType: string;
  size: number;
  blobUrl?: string;
  data?: Uint8Array;
}

export interface CharacterTraitItem {
  id: string;
  text: string;
  completed?: boolean;
  category?: 'personality' | 'physical' | 'flaw' | 'goal' | 'custom' | string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Deuteragonist' | 'Mentor' | 'Foil' | 'Love Interest' | 'Minor' | string;
  archetype?: string;
  age?: string;
  aliases?: string;
  occupation?: string;
  oneLineSummary?: string;
  traits: CharacterTraitItem[];
  appearance?: string;
  personality?: string;
  motivation?: string;
  backstory?: string;
  notes?: string;
  color?: string;
  avatarUrl?: string;
}

export interface WorldbuildingNote {
  id: string;
  title: string;
  category: string;
  content: string;
  tags?: string[];
}

export interface LocationFeatureItem {
  id: string;
  name: string;
  description?: string;
  explored?: boolean;
  category?: 'landmark' | 'secret' | 'hazard' | 'resource' | 'clue' | 'custom' | string;
}

export interface LocationCodexEntry {
  id: string;
  name: string;
  type: 'Interior' | 'Exterior' | 'City / Settlement' | 'Wilderness' | 'Landmark' | 'Realm' | 'Room / Chamber' | string;
  scale?: 'Chamber / Room' | 'Building / Structure' | 'Settlement / Town' | 'District' | 'Region / Wilderness' | 'Realm / World' | string;
  aliases?: string;
  region?: string;
  oneLineSummary?: string;
  // Sensory & Atmospheric Palette
  atmosphere?: string;
  sight?: string;
  sound?: string;
  smell?: string;
  touchWeather?: string;
  // Interactive Checklist of Points of Interest & Key Features
  features: LocationFeatureItem[];
  // Lore & Mechanics
  history?: string;
  lore?: string;
  rulesHazards?: string;
  significance?: string;
  // Narrative Connections
  connectedCharacters?: string[]; // IDs of linked character profiles
  connectedLocations?: string[];  // IDs of adjoining or sub-locations
  notes?: string;
  color?: string;
  imageUrl?: string;
}

export type TimelineTimescale = 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  start: number;       // Start position in time units
  duration: number;    // Duration in time units
  color: string;       // Color hex code
  lane?: number;       // Sub-track lane index (0 = top lane, 1 = stacked below for overlapping events)
  characters?: string[]; // IDs of linked characters
  notes?: string;
}

export interface TimelineSegment {
  id: string;
  name: string;
  events: TimelineEvent[];
  startOffset?: number; // Relative time marker offset
  zeroHour?: number;    // Zero-hour marker
}

export interface StoryTimeline {
  id: string;
  title: string;
  description?: string;
  timescale: TimelineTimescale;
  segments: TimelineSegment[];
  color?: string;
  totalUnitsPerSegment?: number; // Default 24 for hours, 7 for weeks, 12 for months
  unitStep?: number;
}

export interface AuthorComment {
  id: string;
  chapterId: string;
  selectedText: string;
  comment: string;
  color: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface WriterProjectData {
  characters?: CharacterProfile[];
  locations?: LocationCodexEntry[];
  worldbuilding?: WorldbuildingNote[];
  timelines?: StoryTimeline[];
  comments?: AuthorComment[];
  synopsis?: string;
  dailyWordGoal?: number;
  customNotes?: string;
}

export interface EpubBook {
  version: string; // '2.0' | '3.0' | string
  opfPath: string;
  opfDir: string;
  metadata: EpubMetadata;
  manifest: Record<string, EpubManifestItem>;
  spine: EpubSpineItem[];
  chapters: EpubChapter[];
  toc: EpubTocItem[];
  tocPath?: string; // NCX path
  navPath?: string; // EPUB3 Nav path
  coverManifestId?: string;
  coverImageUrl?: string;
  coverMediaType?: string;
  assets: EpubAsset[];
  rawFiles: Map<string, Uint8Array>;
  originalFileName: string;
  writerData?: WriterProjectData;
}

export type AppViewMode = 'reader' | 'editor' | 'toc' | 'metadata' | 'cover' | 'styles' | 'assets' | 'inspector' | 'timeline';
export type EditorSubMode = 'visual' | 'code' | 'split';
export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'obsidian';
export type ReaderFont = 'serif' | 'sans' | 'literata' | 'opendyslexic' | 'mono';
