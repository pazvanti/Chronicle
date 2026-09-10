import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  EpubBook,
  EpubChapter,
  EpubMetadata,
  AppViewMode,
  EditorSubMode,
  ReaderTheme,
  ReaderFont,
  EpubTocItem,
  EpubManifestItem,
  CharacterProfile,
  CharacterTraitItem,
  StoryTimeline,
  TimelineSegment,
  TimelineEvent,
  LocationCodexEntry,
  LocationFeatureItem,
  AuthorComment,
} from '../types/epub';
import {
  unwrapCommentHighlightInHtml,
  updateCommentHighlightColorInHtml,
  DEFAULT_HIGHLIGHT_COLOR,
} from '../services/epub/commentHighlightService';
import { parseEpub } from '../services/epub/epubParser';
import { exportEpub } from '../services/epub/epubExporter';
import { createSampleEpubBook, createNewBlankEpubBook } from '../services/epub/sampleEpub';
import { splitChapter, splitChapterAtHeadingIndex, splitChapterAtText } from '../services/epub/chapterSplitter';
import { calculateWordCount, wrapInXhtml, restoreAssetUrls } from '../services/epub/htmlUtils';
import { getDirectory } from '../services/epub/pathUtils';
import { CSS_PRESETS } from '../services/epub/cssPresets';
import { getStoredSettings, updateStoredSettings } from '../services/epub/settingsStorage';
import {
  saveChronicleProject,
  parseChronicleProject,
  isChronicleProjectFile,
} from '../services/epub/projectFormat';
import { WebDavConfig, StorageTarget } from '../types/cloud';
import { UiTheme } from '../types/theme';
import { saveWebDavConfig, deleteWebDavConfig } from '../services/cloud/webdavStorage';
import {
  loadAllSettings,
  saveSetting,
} from '../services/storage/indexedDbSettings';
import { uploadFile, downloadFile, isTauri } from '../services/cloud/webdavClient';

export interface PendingUnsavedAction {
  actionType: 'new' | 'open' | 'sample' | 'cloud';
  title: string;
  description: string;
  targetName?: string;
  onProceed: () => void | Promise<void>;
}

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface EpubContextType {
  book: EpubBook | null;
  isLoading: boolean;
  isSaving: boolean;
  activeChapterId: string | null;
  activeChapter: EpubChapter | null;
  viewMode: AppViewMode;
  editorSubMode: EditorSubMode;
  readerTheme: ReaderTheme;
  readerFont: ReaderFont;
  readerFontSize: number;
  readerLineHeight: number;
  readerMarginWidth: number;
  isDirty: boolean;
  notification: NotificationState | null;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;

  totalWordCount: number;
  totalReadingTimeMinutes: number;

  customCss: string;
  setCustomCss: (css: string) => void;
  applyCustomCssToBook: (css: string) => void;

  setViewMode: (mode: AppViewMode) => void;
  setEditorSubMode: (mode: EditorSubMode) => void;
  setReaderTheme: (theme: ReaderTheme) => void;
  setReaderFont: (font: ReaderFont) => void;
  setReaderFontSize: (size: number) => void;
  setReaderLineHeight: (lh: number) => void;
  setReaderMarginWidth: (width: number) => void;
  setActiveChapterId: (id: string) => void;

  loadEpubFile: (file: File, force?: boolean) => Promise<void>;
  loadAnyFile: (file: File, force?: boolean) => Promise<void>;
  loadSampleBook: (force?: boolean) => Promise<void>;
  createNewBook: (title?: string, author?: string, force?: boolean) => Promise<void>;
  saveProject: (overrideTarget?: StorageTarget, customFilename?: string, targetSubPath?: string) => Promise<void>;
  saveAs: (target: StorageTarget, filename?: string, targetSubPath?: string) => Promise<void>;
  loadFromCloud: (href: string, filename: string, force?: boolean, relativePath?: string) => Promise<void>;
  updateChapterContent: (chapterId: string, newContent: string) => void;
  updateChapterTitle: (chapterId: string, newTitle: string) => void;
  reorderChapters: (fromIndex: number, toIndex: number) => void;
  deleteChapter: (chapterId: string) => void;
  addBlankChapter: (title?: string, insertAfterChapterId?: string) => void;
  splitCurrentChapter: (part1: string, part2: string, newTitle: string) => void;
  splitAtHeading: (chapterId: string, headingIndex: number, newTitle?: string) => void;
  splitAtTextMarker: (chapterId: string, textMarker: string, newTitle?: string) => void;
  updateMetadata: (updates: Partial<EpubMetadata>, suppressNotification?: boolean) => void;
  updateToc: (newToc: EpubTocItem[]) => void;
  updateCoverImage: (file: File | Blob, mediaType?: string) => Promise<void>;
  generateCustomCover: (svgString: string) => Promise<void>;
  exportAndDownload: () => Promise<void>;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;

  storageTarget: StorageTarget | null;
  setStorageTarget: (target: StorageTarget | null) => void;
  cloudFileName: string | null;
  setCloudFileName: (name: string | null) => void;
  webdavConfig: WebDavConfig | null;
  isWebDavConnected: boolean;
  updateWebDavConfig: (config: WebDavConfig | null) => Promise<void>;

  isWebDavConfigOpen: boolean;
  setIsWebDavConfigOpen: (open: boolean) => void;
  isSaveDestinationOpen: boolean;
  setIsSaveDestinationOpen: (open: boolean) => void;
  isSaveAsOpen: boolean;
  setIsSaveAsOpen: (open: boolean) => void;
  isCloudBrowserOpen: boolean;
  setIsCloudBrowserOpen: (open: boolean) => void;
  isCloudDesktopNoticeOpen: boolean;
  setIsCloudDesktopNoticeOpen: (open: boolean) => void;

  isWelcomeModalOpen: boolean;
  setIsWelcomeModalOpen: (open: boolean) => void;

  uiTheme: UiTheme;
  setUiTheme: (theme: UiTheme) => void;

  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsInitialTab: 'appearance' | 'cloud' | 'editor' | 'general';
  openSettings: (tab?: 'appearance' | 'cloud' | 'editor' | 'general') => void;
  closeSettings: () => void;

  pendingUnsavedAction: PendingUnsavedAction | null;
  setPendingUnsavedAction: (action: PendingUnsavedAction | null) => void;

  characters: CharacterProfile[];
  addCharacter: (char?: Partial<CharacterProfile>) => string;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  toggleCharacterTrait: (characterId: string, traitId: string) => void;
  addCharacterTrait: (characterId: string, traitText: string, category?: string) => void;
  removeCharacterTrait: (characterId: string, traitId: string) => void;

  locations: LocationCodexEntry[];
  addLocation: (loc?: Partial<LocationCodexEntry>) => string;
  updateLocation: (id: string, updates: Partial<LocationCodexEntry>) => void;
  deleteLocation: (id: string) => void;
  toggleLocationFeature: (locationId: string, featureId: string) => void;
  addLocationFeature: (locationId: string, name: string, category?: string) => void;
  removeLocationFeature: (locationId: string, featureId: string) => void;

  timelines: StoryTimeline[];
  activeTimelineId: string | null;
  setActiveTimelineId: (id: string | null) => void;
  createTimeline: (tl?: Partial<StoryTimeline>) => string;
  updateTimeline: (id: string, updates: Partial<StoryTimeline>) => void;
  deleteTimeline: (id: string) => void;
  addTimelineSegment: (timelineId: string, name?: string) => void;
  updateTimelineSegment: (timelineId: string, segmentId: string, updates: Partial<TimelineSegment>) => void;
  deleteTimelineSegment: (timelineId: string, segmentId: string) => void;
  addTimelineEvent: (timelineId: string, segmentId: string, event: Partial<TimelineEvent>) => void;
  updateTimelineEvent: (timelineId: string, segmentId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (timelineId: string, segmentId: string, eventId: string) => void;

  comments: AuthorComment[];
  chapterComments: AuthorComment[];
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  isCommentsSidebarOpen: boolean;
  setIsCommentsSidebarOpen: (open: boolean) => void;
  showCommentHighlights: boolean;
  setShowCommentHighlights: (show: boolean) => void;
  toggleCommentHighlights: () => void;
  addComment: (
    chapterId: string,
    selectedText: string,
    commentText: string,
    color?: string,
    customId?: string,
    newChapterContent?: string
  ) => AuthorComment;
  updateComment: (commentId: string, updates: { comment?: string; color?: string }) => void;
  deleteComment: (commentId: string) => void;
}

const EpubContext = createContext<EpubContextType | undefined>(undefined);

export const EpubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialSettings = getStoredSettings();
  const [book, setBook] = useState<EpubBook | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<AppViewMode>(initialSettings.viewMode);
  const [editorSubMode, setEditorSubModeState] = useState<EditorSubMode>(initialSettings.editorSubMode);
  const [readerTheme, setReaderThemeState] = useState<ReaderTheme>(initialSettings.readerTheme);
  const [readerFont, setReaderFontState] = useState<ReaderFont>(initialSettings.readerFont);
  const [readerFontSize, setReaderFontSizeState] = useState<number>(initialSettings.readerFontSize);
  const [readerLineHeight, setReaderLineHeightState] = useState<number>(initialSettings.readerLineHeight);
  const [readerMarginWidth, setReaderMarginWidthState] = useState<number>(initialSettings.readerMarginWidth);
  const [customCss, setCustomCss] = useState<string>('');
  const [isDirty, setIsDirtyState] = useState<boolean>(false);
  const isSavingRef = useRef<boolean>(false);
  const bookRef = useRef<EpubBook | null>(null);

  const [storageTarget, setStorageTarget] = useState<StorageTarget | null>(null);
  const [cloudFileName, setCloudFileName] = useState<string | null>(null);
  const [webdavConfig, setWebdavConfig] = useState<WebDavConfig | null>(null);
  const [isWebDavConnected, setIsWebDavConnected] = useState<boolean>(false);

  const [isWebDavConfigOpen, setIsWebDavConfigOpen] = useState<boolean>(false);
  const [isSaveDestinationOpen, setIsSaveDestinationOpen] = useState<boolean>(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState<boolean>(false);
  const [isCloudBrowserOpen, setIsCloudBrowserOpen] = useState<boolean>(false);
  const [isCloudDesktopNoticeOpen, setIsCloudDesktopNoticeOpen] = useState<boolean>(false);

  const [uiTheme, setUiThemeState] = useState<UiTheme>('modernx-dark');

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'cloud' | 'editor' | 'general'>('appearance');

  const openSettings = useCallback((tab: 'appearance' | 'cloud' | 'editor' | 'general' = 'appearance') => {
    const effectiveTab = (!isTauri() && tab === 'cloud') ? 'appearance' : tab;
    setSettingsInitialTab(effectiveTab);
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const setUiTheme = useCallback((theme: UiTheme) => {
    setUiThemeState(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    saveSetting('uiTheme', theme);
  }, []);

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(true);

  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<PendingUnsavedAction | null>(null);
  const isDirtyRef = useRef<boolean>(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Window beforeunload protection: prompt before leaving/reloading if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load all application settings from IndexedDB on startup
  useEffect(() => {
    async function initSettings() {
      try {
        const settings = await loadAllSettings();

        setUiThemeState(settings.uiTheme);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', settings.uiTheme);
        }

        if (settings.webdavConfig) {
          setWebdavConfig(settings.webdavConfig);
          setIsWebDavConnected(settings.webdavConfig.connected ?? true);
        }

        setIsWelcomeModalOpen(settings.showWelcomeOnStartup);

        setReaderThemeState(settings.readerTheme);
        setReaderFontState(settings.readerFont);
        setReaderFontSizeState(settings.readerFontSize);
        setReaderLineHeightState(settings.readerLineHeight);
        setReaderMarginWidthState(settings.readerMarginWidth);
        setViewModeState(settings.viewMode);
        setEditorSubModeState(settings.editorSubMode);

        try {
          if (typeof window !== 'undefined' && window.location && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            const validViews: AppViewMode[] = ['reader', 'editor', 'toc', 'metadata', 'cover', 'styles', 'assets', 'inspector', 'timeline'];
            if (viewParam && validViews.includes(viewParam as AppViewMode)) {
              setViewModeState(viewParam as AppViewMode);
            }
            if (params.get('welcome') === 'false') {
              setIsWelcomeModalOpen(false);
            }
          }
        } catch {
          /* Ignore query param parsing error */
        }
      } catch (err) {
        console.error('Failed to load settings from IndexedDB on startup:', err);
      }
    }
    initSettings();
  }, []);

  const updateWebDavConfig = useCallback(async (newConfig: WebDavConfig | null) => {
    if (newConfig) {
      await saveWebDavConfig(newConfig);
      await saveSetting('webdavConfig', newConfig);
      setWebdavConfig(newConfig);
      setIsWebDavConnected(true);
    } else {
      await deleteWebDavConfig();
      await saveSetting('webdavConfig', null);
      setWebdavConfig(null);
      setIsWebDavConnected(false);
    }
  }, []);

  // Keep bookRef synchronously up-to-date with book state
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  // Guarded setIsDirty: ignores dirty triggers occurring during save or download cooldown
  const setIsDirty = useCallback((dirty: boolean) => {
    if (dirty && isSavingRef.current) {
      return;
    }
    setIsDirtyState(dirty);
  }, []);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const totalWordCount = useMemo(() => {
    if (!book) return 0;
    return book.chapters.reduce((acc, ch) => acc + (ch.wordCount || 0), 0);
  }, [book]);

  const totalReadingTimeMinutes = useMemo(() => {
    return Math.max(1, Math.round(totalWordCount / 220));
  }, [totalWordCount]);

  const setViewMode = useCallback((mode: AppViewMode) => {
    setViewModeState(mode);
    updateStoredSettings({ viewMode: mode });
    saveSetting('viewMode', mode);
  }, []);

  const setEditorSubMode = useCallback((sub: EditorSubMode) => {
    setEditorSubModeState(sub);
    updateStoredSettings({ editorSubMode: sub });
    saveSetting('editorSubMode', sub);
  }, []);

  const setReaderTheme = useCallback((theme: ReaderTheme) => {
    setReaderThemeState(theme);
    updateStoredSettings({ readerTheme: theme });
    saveSetting('readerTheme', theme);
  }, []);

  const setReaderFont = useCallback((font: ReaderFont) => {
    setReaderFontState(font);
    updateStoredSettings({ readerFont: font });
    saveSetting('readerFont', font);
  }, []);

  const setReaderFontSize = useCallback((size: number) => {
    setReaderFontSizeState(size);
    updateStoredSettings({ readerFontSize: size });
    saveSetting('readerFontSize', size);
  }, []);

  const setReaderLineHeight = useCallback((lh: number) => {
    setReaderLineHeightState(lh);
    updateStoredSettings({ readerLineHeight: lh });
    saveSetting('readerLineHeight', lh);
  }, []);

  const setReaderMarginWidth = useCallback((w: number) => {
    setReaderMarginWidthState(w);
    updateStoredSettings({ readerMarginWidth: w });
    saveSetting('readerMarginWidth', w);
  }, []);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Helper to extract CSS from loaded book
  const extractCssFromBook = (loadedBook: EpubBook) => {
    const cssAsset = loadedBook.assets.find(a => a.mediaType.includes('css'));
    if (cssAsset && cssAsset.data) {
      const decoded = new TextDecoder('utf-8').decode(cssAsset.data);
      setCustomCss(decoded);
    } else {
      setCustomCss(CSS_PRESETS[0].css);
    }
  };

  // Load sample book on initial startup
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const sample = await createSampleEpubBook();
        setBook(sample);
        extractCssFromBook(sample);
        if (sample.chapters.length > 0) {
          setActiveChapterId(sample.chapters[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial demo book:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const loadSampleBook = useCallback(async (force: boolean = false) => {
    if (isDirtyRef.current && !force) {
      setPendingUnsavedAction({
        actionType: 'sample',
        title: 'Load Sample Manuscript',
        description: 'Loading Alice’s Adventures in Wonderland will replace your current workspace. Any unsaved edits in your current manuscript will be permanently lost.',
        targetName: 'Alice’s Adventures in Wonderland',
        onProceed: () => loadSampleBook(true),
      });
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('epub-file-opening'));
    }
    try {
      setIsLoading(true);
      const sample = await createSampleEpubBook();
      bookRef.current = sample;
      setBook(sample);
      extractCssFromBook(sample);
      if (sample.chapters.length > 0) {
        setActiveChapterId(sample.chapters[0].id);
      }
      setStorageTarget(null);
      setCloudFileName(null);
      setIsDirty(false);
      showNotification('success', 'Loaded sample book: Alice’s Adventures in Wonderland');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to load sample book');
    } finally {
      setIsLoading(false);
    }
  }, [setIsDirty, showNotification]);

  const createNewBook = useCallback(
    async (title: string = 'Untitled Manuscript', author: string = 'Author Name', force: boolean = false) => {
      if (isDirtyRef.current && !force) {
        setPendingUnsavedAction({
          actionType: 'new',
          title: 'Create New Manuscript',
          description: `Creating "${title}" will replace your current workspace. Any unsaved edits in your current manuscript will be permanently lost.`,
          targetName: title,
          onProceed: () => createNewBook(title, author, true),
        });
        return;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('epub-file-opening'));
      }
      try {
        setIsLoading(true);
        const newBook = await createNewBlankEpubBook(title, author);
        bookRef.current = newBook;
        setBook(newBook);
        extractCssFromBook(newBook);
        if (newBook.chapters.length > 0) {
          setActiveChapterId(newBook.chapters[0].id);
        }
        setStorageTarget(null);
        setCloudFileName(null);
        setIsDirty(true);
        setViewModeState('editor');
        showNotification('success', `Created new blank manuscript: "${title}"`);
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Failed to create new manuscript: ${err?.message || 'Error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsDirty, showNotification]
  );

  const loadAnyFile = useCallback(
    async (file: File, force: boolean = false) => {
      if (isDirtyRef.current && !force) {
        setPendingUnsavedAction({
          actionType: 'open',
          title: 'Open Manuscript',
          description: `Opening "${file.name}" will replace your current workspace. Any unsaved edits in your current manuscript will be permanently lost.`,
          targetName: file.name,
          onProceed: () => loadAnyFile(file, true),
        });
        return;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('epub-file-opening'));
      }
      try {
        setIsLoading(true);
        const buffer = await file.arrayBuffer();

        if (isChronicleProjectFile(file)) {
          const projectBook = await parseChronicleProject(buffer, file.name);
          bookRef.current = projectBook;
          setBook(projectBook);
          extractCssFromBook(projectBook);
          if (projectBook.chapters.length > 0) {
            setActiveChapterId(projectBook.chapters[0].id);
          }
          setStorageTarget('local');
          setCloudFileName(null);
          setIsDirty(false);
          showNotification('success', `Opened Chronicle "${projectBook.metadata.title}" successfully!`);
        } else {
          const parsed = await parseEpub(buffer, file.name);
          bookRef.current = parsed;
          setBook(parsed);
          extractCssFromBook(parsed);
          if (parsed.chapters.length > 0) {
            setActiveChapterId(parsed.chapters[0].id);
          }
          setStorageTarget('local');
          setCloudFileName(null);
          setIsDirty(false);
          showNotification('success', `Imported EPUB "${parsed.metadata.title}" successfully!`);
        }
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Failed to open file: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [setIsDirty, showNotification]
  );

  const loadEpubFile = loadAnyFile;

  const activeChapter = book?.chapters.find(c => c.id === activeChapterId) || book?.chapters[0] || null;

  const updateChapterContent = useCallback(
    (chapterId: string, newContent: string) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const targetChapter = currentBook.chapters.find(c => c.id === chapterId);
      if (!targetChapter) return;

      // Strict equality check: if content is identical, do not mark dirty or trigger re-render
      if (targetChapter.content === newContent) {
        return;
      }

      const updatedOriginalXhtml = wrapInXhtml(
        restoreAssetUrls(newContent, targetChapter.fullPath, currentBook.assets),
        targetChapter.title
      );

      const updatedChapters = currentBook.chapters.map(c =>
        c.id === chapterId
          ? {
              ...c,
              content: newContent,
              originalXhtml: updatedOriginalXhtml,
              wordCount: calculateWordCount(newContent),
            }
          : c
      );

      const updatedBook = {
        ...currentBook,
        chapters: updatedChapters,
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const updateChapterTitle = useCallback(
    (chapterId: string, newTitle: string) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;
      const cleanTitle = newTitle.trim() || 'Untitled Chapter';

      const currentChapter = currentBook.chapters.find(c => c.id === chapterId);
      if (currentChapter && currentChapter.title === cleanTitle) {
        return;
      }

      function updateTocItemTitle(items: EpubTocItem[]): EpubTocItem[] {
        return items.map(item => ({
          ...item,
          title: item.chapterId === chapterId || item.id === chapterId ? cleanTitle : item.title,
          children: item.children ? updateTocItemTitle(item.children) : undefined,
        }));
      }

      const updatedChapters = currentBook.chapters.map(c =>
        c.id === chapterId ? { ...c, title: cleanTitle } : c
      );
      const updatedToc = updateTocItemTitle(currentBook.toc);

      const updatedBook = {
        ...currentBook,
        chapters: updatedChapters,
        toc: updatedToc,
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
      showNotification('success', `Renamed chapter to "${cleanTitle}"`);
    },
    [setIsDirty, showNotification]
  );

  const reorderChapters = useCallback(
    (fromIndex: number, toIndex: number) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= currentBook.chapters.length || toIndex < 0 || toIndex >= currentBook.chapters.length) return;

      const newChapters = [...currentBook.chapters];
      const [moved] = newChapters.splice(fromIndex, 1);
      newChapters.splice(toIndex, 0, moved);
      newChapters.forEach((ch, idx) => {
        ch.order = idx;
      });

      // Update spine according to new chapter order
      const newSpine = newChapters.map(c => ({ idref: c.id }));

      const updatedBook = {
        ...currentBook,
        chapters: newChapters,
        spine: newSpine,
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const deleteChapter = useCallback(
    (chapterId: string) => {
      if (!book) return;
      if (book.chapters.length <= 1) {
        showNotification('error', 'Cannot delete the only chapter in the book.');
        return;
      }

      const deletedChapter = book.chapters.find(c => c.id === chapterId);
      const newChapters = book.chapters.filter(c => c.id !== chapterId);
      newChapters.forEach((ch, idx) => {
        ch.order = idx;
      });

      const newSpine = book.spine.filter(s => s.idref !== chapterId);
      const newManifest = { ...book.manifest };
      delete newManifest[chapterId];

      function removeTocItem(items: EpubTocItem[]): EpubTocItem[] {
        return items
          .filter(i => i.chapterId !== chapterId && i.id !== chapterId)
          .map(i => ({
            ...i,
            children: i.children ? removeTocItem(i.children) : undefined,
          }));
      }
      const newToc = removeTocItem(book.toc);

      setBook(prev =>
        prev
          ? {
              ...prev,
              chapters: newChapters,
              spine: newSpine,
              manifest: newManifest,
              toc: newToc,
            }
          : null
      );

      if (activeChapterId === chapterId) {
        setActiveChapterId(newChapters[0]?.id || null);
      }

      setIsDirty(true);
      showNotification('info', `Deleted chapter "${deletedChapter?.title || 'Chapter'}"`);
    },
    [book, activeChapterId, setIsDirty, showNotification]
  );

  const addBlankChapter = useCallback(
    (title: string = 'New Chapter', insertAfterChapterId?: string) => {
      if (!book) return;
      const timestamp = Date.now().toString(36);
      const newId = `chapter_${timestamp}`;
      const baseDir = book.chapters[0] ? getDirectory(book.chapters[0].href) : 'Text/';
      const ext = book.chapters[0]?.href.endsWith('.html') ? '.html' : '.xhtml';
      const newHref = `${baseDir}chapter_${timestamp}${ext}`;
      const newFullPath = book.chapters[0]
        ? `${getDirectory(book.chapters[0].fullPath)}chapter_${timestamp}${ext}`
        : `OEBPS/${newHref}`;

      const initialContent = `<h1>${title}</h1>\n<p>Write or paste your chapter text here...</p>`;
      const fullXhtml = wrapInXhtml(initialContent, title);

      const newChapter: EpubChapter = {
        id: newId,
        href: newHref,
        fullPath: newFullPath,
        title,
        content: initialContent,
        originalXhtml: fullXhtml,
        order: book.chapters.length,
        wordCount: calculateWordCount(initialContent),
      };

      const newManifestItem: EpubManifestItem = {
        id: newId,
        href: newHref,
        fullPath: newFullPath,
        mediaType: 'application/xhtml+xml',
      };

      let insertIdx = book.chapters.length;
      if (insertAfterChapterId) {
        const foundIdx = book.chapters.findIndex(c => c.id === insertAfterChapterId);
        if (foundIdx !== -1) insertIdx = foundIdx + 1;
      }

      const updatedChapters = [...book.chapters];
      updatedChapters.splice(insertIdx, 0, newChapter);
      updatedChapters.forEach((c, i) => {
        c.order = i;
      });

      const updatedSpine = [...book.spine];
      updatedSpine.splice(insertIdx, 0, { idref: newId });

      const newTocItem: EpubTocItem = {
        id: `toc-${newId}`,
        title,
        href: newHref,
        chapterId: newId,
        level: 1,
      };

      setBook(prev =>
        prev
          ? {
              ...prev,
              chapters: updatedChapters,
              spine: updatedSpine,
              manifest: { ...prev.manifest, [newId]: newManifestItem },
              toc: [...prev.toc, newTocItem],
            }
          : null
      );

      setActiveChapterId(newId);
      setIsDirty(true);
      showNotification('success', `Created new chapter "${title}"`);
    },
    [book, setIsDirty, showNotification]
  );

  const splitCurrentChapter = useCallback(
    (part1: string, part2: string, newTitle: string) => {
      if (!book || !activeChapterId) return;
      try {
        const result = splitChapter(book, activeChapterId, part1, part2, newTitle);
        setBook(result.updatedBook);
        setActiveChapterId(result.newChapterId);
        setIsDirty(true);
        showNotification('success', `Split into new chapter "${newTitle}"!`);
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Could not split chapter: ${err?.message || 'Error'}`);
      }
    },
    [book, activeChapterId, setIsDirty, showNotification]
  );

  const splitAtHeading = useCallback(
    (chapterId: string, headingIndex: number, newTitle?: string) => {
      if (!book) return;
      try {
        const result = splitChapterAtHeadingIndex(book, chapterId, headingIndex, newTitle);
        setBook(result.updatedBook);
        setActiveChapterId(result.newChapterId);
        setIsDirty(true);
        showNotification('success', `Created new chapter at heading!`);
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Could not split at heading: ${err?.message || 'Error'}`);
      }
    },
    [book, setIsDirty, showNotification]
  );

  const splitAtTextMarker = useCallback(
    (chapterId: string, textMarker: string, newTitle?: string) => {
      if (!book) return;
      try {
        const result = splitChapterAtText(book, chapterId, textMarker, newTitle || 'New Chapter');
        setBook(result.updatedBook);
        setActiveChapterId(result.newChapterId);
        setIsDirty(true);
        showNotification('success', `Split chapter at selected text!`);
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Could not split at selection: ${err?.message || 'Error'}`);
      }
    },
    [book, setIsDirty, showNotification]
  );

  const updateMetadata = useCallback(
    (updates: Partial<EpubMetadata>, suppressNotification: boolean = false) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const updatedBook = {
        ...currentBook,
        metadata: { ...currentBook.metadata, ...updates },
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
      if (!suppressNotification) {
        showNotification('success', 'Updated book metadata');
      }
    },
    [setIsDirty, showNotification]
  );

  const updateToc = useCallback(
    (newToc: EpubTocItem[]) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const updatedBook = {
        ...currentBook,
        toc: newToc,
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const updateCoverImage = useCallback(
    async (fileOrBlob: File | Blob, mediaType?: string) => {
      if (!book) return;
      try {
        const buffer = await fileOrBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const resolvedMediaType = mediaType || (fileOrBlob instanceof File ? fileOrBlob.type : 'image/jpeg') || 'image/jpeg';
        const ext = resolvedMediaType.includes('png') ? 'png' : resolvedMediaType.includes('svg') ? 'svg' : 'jpg';

        const coverId = book.coverManifestId || 'cover-image';
        const coverHref = `Images/cover.${ext}`;
        const coverFullPath = book.opfDir ? `${book.opfDir}${coverHref}` : `OEBPS/${coverHref}`;
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: resolvedMediaType }));

        const newManifestItem: EpubManifestItem = {
          id: coverId,
          href: coverHref,
          fullPath: coverFullPath,
          mediaType: resolvedMediaType,
          properties: 'cover-image',
        };

        const updatedAssets = book.assets.filter(a => a.id !== coverId);
        updatedAssets.push({
          id: coverId,
          href: coverHref,
          fullPath: coverFullPath,
          mediaType: resolvedMediaType,
          size: bytes.length,
          blobUrl,
          data: bytes,
        });

        const updatedRawFiles = new Map(book.rawFiles);
        updatedRawFiles.set(coverFullPath, bytes);

        setBook(prev =>
          prev
            ? {
                ...prev,
                coverManifestId: coverId,
                coverImageUrl: blobUrl,
                coverMediaType: resolvedMediaType,
                manifest: { ...prev.manifest, [coverId]: newManifestItem },
                assets: updatedAssets,
                rawFiles: updatedRawFiles,
              }
            : null
        );

        setIsDirty(true);
        showNotification('success', 'Cover image updated successfully!');
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Failed to update cover image: ${err?.message || 'Error'}`);
      }
    },
    [book, setIsDirty, showNotification]
  );

  const generateCustomCover = useCallback(
    async (svgString: string) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      await updateCoverImage(blob, 'image/svg+xml');
    },
    [updateCoverImage]
  );

  const loadFromCloud = useCallback(
    async (href: string, filename: string, force: boolean = false, relativePath?: string) => {
      const storedPath = relativePath || filename;
      if (isDirtyRef.current && !force) {
        setPendingUnsavedAction({
          actionType: 'cloud',
          title: 'Open Cloud Manuscript',
          description: `Opening "${filename}" from WebDAV cloud will replace your current workspace. Any unsaved edits in your current manuscript will be permanently lost.`,
          targetName: filename,
          onProceed: () => loadFromCloud(href, filename, true, relativePath),
        });
        return;
      }
      if (!webdavConfig) {
        showNotification('error', 'WebDAV configuration not found.');
        return;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('epub-file-opening'));
      }
      try {
        setIsLoading(true);
        const blob = await downloadFile(webdavConfig, href);
        const buffer = await blob.arrayBuffer();
        const lower = filename.toLowerCase();

        if (lower.endsWith('.chronicle') || lower.endsWith('.epubstudio') || lower.endsWith('.eproj')) {
          const projectBook = await parseChronicleProject(buffer, filename);
          bookRef.current = projectBook;
          setBook(projectBook);
          extractCssFromBook(projectBook);
          if (projectBook.chapters.length > 0) {
            setActiveChapterId(projectBook.chapters[0].id);
          }
          setStorageTarget('cloud');
          setCloudFileName(storedPath);
          setIsDirtyState(false);
          showNotification('success', `Opened Chronicle "${projectBook.metadata.title}" from WebDAV!`);
        } else {
          const parsed = await parseEpub(buffer, filename);
          bookRef.current = parsed;
          setBook(parsed);
          extractCssFromBook(parsed);
          if (parsed.chapters.length > 0) {
            setActiveChapterId(parsed.chapters[0].id);
          }
          setStorageTarget('cloud');
          setCloudFileName(storedPath.replace(/\.epub$/i, '.chronicle'));
          setIsDirtyState(false);
          showNotification('success', `Imported EPUB "${parsed.metadata.title}" from WebDAV!`);
        }
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Failed to open cloud manuscript: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [webdavConfig, showNotification]
  );

  const saveProject = useCallback(
    async (overrideTarget?: StorageTarget, customFilename?: string, targetSubPath?: string) => {
      isSavingRef.current = true;
      let currentBook = bookRef.current || book;
      if (!currentBook) {
        isSavingRef.current = false;
        return;
      }

      // 1. Determine target: override, current state, or prompt if unsaved
      const target = overrideTarget || storageTarget;
      if (!target) {
        setIsSaveDestinationOpen(true);
        isSavingRef.current = false;
        return;
      }

      // Synchronously flush any active WYSIWYG editor DOM content into book before creating zip
      if (typeof document !== 'undefined') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.classList.contains('wysiwyg-content')) {
          const domContent = (activeEl as HTMLElement).innerHTML;
          const currentActiveCh = currentBook.chapters.find(c => c.id === activeChapterId) || currentBook.chapters[0];
          if (currentActiveCh && currentActiveCh.content !== domContent) {
            const updatedOriginalXhtml = wrapInXhtml(
              restoreAssetUrls(domContent, currentActiveCh.fullPath, currentBook.assets),
              currentActiveCh.title
            );
            const updatedChapters = currentBook.chapters.map(c =>
              c.id === currentActiveCh.id
                ? {
                    ...c,
                    content: domContent,
                    originalXhtml: updatedOriginalXhtml,
                    wordCount: calculateWordCount(domContent),
                  }
                : c
            );
            currentBook = {
              ...currentBook,
              chapters: updatedChapters,
            };
            bookRef.current = currentBook;
            setBook(currentBook);
          }
        }
      }

      // Capture the exact manuscript snapshot being saved to disk/cloud
      const saveSnapshot = currentBook;

      try {
        setIsSaving(true);
        const cleanTitle = (currentBook.metadata.title || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');
        const blob = await saveChronicleProject(currentBook);

        if (target === 'local') {
          const downloadName = customFilename || `${cleanTitle}.chronicle`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = downloadName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setStorageTarget('local');
          if (bookRef.current === saveSnapshot) {
            setIsDirtyState(false);
          }
          showNotification('success', `Saved project "${downloadName}" locally!`);
        } else if (target === 'cloud') {
          if (!webdavConfig) {
            setIsWebDavConfigOpen(true);
            showNotification('info', 'Please configure your WebDAV server to save to cloud storage.');
            return;
          }

          let uploadName = customFilename || cloudFileName || `${cleanTitle}.chronicle`;
          if (!uploadName.endsWith('.chronicle')) {
            uploadName += '.chronicle';
          }
          if (targetSubPath !== undefined) {
            const cleanSub = targetSubPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
            const nameOnly = uploadName.split('/').pop() || uploadName;
            uploadName = cleanSub ? `${cleanSub}/${nameOnly}` : nameOnly;
          }

          await uploadFile(webdavConfig, uploadName, blob);

          setStorageTarget('cloud');
          setCloudFileName(uploadName);
          if (bookRef.current === saveSnapshot) {
            setIsDirtyState(false);
          }
          showNotification('success', `Saved and updated "${uploadName}" on WebDAV cloud!`);
        }

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          /* Confetti optional */
        }
      } catch (err: any) {
        console.error(err);
        showNotification('error', `Failed to save project: ${err?.message || 'Error'}`);
      } finally {
        setIsSaving(false);
        // Keep isSavingRef active for 500ms after saving to guard against download blur / refocus triggers
        setTimeout(() => {
          if (bookRef.current === saveSnapshot) {
            setIsDirtyState(false);
          }
          isSavingRef.current = false;
        }, 500);
      }
    },
    [book, activeChapterId, storageTarget, cloudFileName, webdavConfig, showNotification]
  );

  const saveAs = useCallback(
    async (target: StorageTarget, filename?: string, targetSubPath?: string) => {
      await saveProject(target, filename, targetSubPath);
    },
    [saveProject]
  );

  const exportAndDownload = useCallback(async () => {
    if (!book) return;
    try {
      setIsLoading(true);
      const epubBlob = await exportEpub(book);

      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (book.metadata.title || 'book').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('success', `Exported "${book.metadata.title}.epub" successfully!`);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        /* Confetti optional */
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', `Failed to export EPUB: ${err?.message || 'Error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [book, showNotification]);

  const applyCustomCssToBook = useCallback(
    (newCss: string) => {
      if (!book) return;
      try {
        const bytes = new TextEncoder().encode(newCss);
        const existingCssAsset = book.assets.find(a => a.mediaType.includes('css'));
        const cssPath = existingCssAsset
          ? existingCssAsset.fullPath
          : book.opfDir
          ? `${book.opfDir}Styles/style.css`
          : 'OEBPS/Styles/style.css';
        const cssHref = existingCssAsset ? existingCssAsset.href : 'Styles/style.css';
        const cssId = existingCssAsset ? existingCssAsset.id : 'style';
        const blobUrl = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'text/css' }));

        const updatedAssets = book.assets.filter(a => a.id !== cssId);
        updatedAssets.push({
          id: cssId,
          href: cssHref,
          fullPath: cssPath,
          mediaType: 'text/css',
          size: bytes.length,
          blobUrl,
          data: bytes,
        });

        const updatedRawFiles = new Map(book.rawFiles);
        updatedRawFiles.set(cssPath, bytes);

        const updatedManifest = {
          ...book.manifest,
          [cssId]: {
            id: cssId,
            href: cssHref,
            fullPath: cssPath,
            mediaType: 'text/css',
          },
        };

        setBook(prev =>
          prev
            ? {
                ...prev,
                assets: updatedAssets,
                rawFiles: updatedRawFiles,
                manifest: updatedManifest,
              }
            : null
        );

        setCustomCss(newCss);
        setIsDirty(true);
        showNotification('success', 'Applied stylesheet to book successfully!');
      } catch (err: any) {
        console.error(err);
        showNotification('error', 'Failed to apply stylesheet');
      }
    },
    [book, setIsDirty, showNotification]
  );

  const characters = useMemo(() => {
    return book?.writerData?.characters || [];
  }, [book]);

  const addCharacter = useCallback(
    (charUpdates?: Partial<CharacterProfile>): string => {
      const newId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newChar: CharacterProfile = {
        id: newId,
        name: charUpdates?.name?.trim() || 'New Character',
        role: charUpdates?.role || 'Protagonist',
        archetype: charUpdates?.archetype || '',
        age: charUpdates?.age || '',
        aliases: charUpdates?.aliases || '',
        occupation: charUpdates?.occupation || '',
        oneLineSummary: charUpdates?.oneLineSummary || '',
        traits: charUpdates?.traits || [],
        appearance: charUpdates?.appearance || '',
        personality: charUpdates?.personality || '',
        motivation: charUpdates?.motivation || '',
        backstory: charUpdates?.backstory || '',
        notes: charUpdates?.notes || '',
        color: charUpdates?.color || '#3b82f6',
        avatarUrl: charUpdates?.avatarUrl || '',
        ...charUpdates,
      };

      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: [...currentChars, newChar],
          },
        };
      });
      setIsDirty(true);
      return newId;
    },
    [setIsDirty]
  );

  const updateCharacter = useCallback(
    (id: string, updates: Partial<CharacterProfile>) => {
      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        const updated = currentChars.map(c => (c.id === id ? { ...c, ...updates } : c));
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const deleteCharacter = useCallback(
    (id: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: currentChars.filter(c => c.id !== id),
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const toggleCharacterTrait = useCallback(
    (characterId: string, traitId: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        const updated = currentChars.map(c => {
          if (c.id !== characterId) return c;
          const traits = (c.traits || []).map(t =>
            t.id === traitId ? { ...t, completed: !t.completed } : t
          );
          return { ...c, traits };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const addCharacterTrait = useCallback(
    (characterId: string, traitText: string, category: string = 'custom') => {
      if (!traitText.trim()) return;
      const newTrait: CharacterTraitItem = {
        id: `trait-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: traitText.trim(),
        completed: false,
        category,
      };

      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        const updated = currentChars.map(c => {
          if (c.id !== characterId) return c;
          return {
            ...c,
            traits: [...(c.traits || []), newTrait],
          };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const removeCharacterTrait = useCallback(
    (characterId: string, traitId: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentChars = prev.writerData?.characters || [];
        const updated = currentChars.map(c => {
          if (c.id !== characterId) return c;
          return {
            ...c,
            traits: (c.traits || []).filter(t => t.id !== traitId),
          };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            characters: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  // Locations / Settings Codex State & Actions
  const locations = useMemo(() => {
    return book?.writerData?.locations || [];
  }, [book]);

  const addLocation = useCallback((locUpdates?: Partial<LocationCodexEntry>): string => {
    const newId = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLoc: LocationCodexEntry = {
      id: newId,
      name: locUpdates?.name?.trim() || 'New Location',
      type: locUpdates?.type || 'Interior',
      scale: locUpdates?.scale || 'Building / Structure',
      aliases: locUpdates?.aliases || '',
      region: locUpdates?.region || '',
      oneLineSummary: locUpdates?.oneLineSummary || '',
      atmosphere: locUpdates?.atmosphere || '',
      sight: locUpdates?.sight || '',
      sound: locUpdates?.sound || '',
      smell: locUpdates?.smell || '',
      touchWeather: locUpdates?.touchWeather || '',
      features: locUpdates?.features || [],
      history: locUpdates?.history || '',
      lore: locUpdates?.lore || '',
      rulesHazards: locUpdates?.rulesHazards || '',
      significance: locUpdates?.significance || '',
      connectedCharacters: locUpdates?.connectedCharacters || [],
      connectedLocations: locUpdates?.connectedLocations || [],
      notes: locUpdates?.notes || '',
      color: locUpdates?.color || '#3b82f6',
      imageUrl: locUpdates?.imageUrl,
      ...locUpdates,
    };

    setBook(prev => {
      if (!prev) return null;
      const currentLocs = prev.writerData?.locations || [];
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          locations: [...currentLocs, newLoc],
        },
      };
    });
    setIsDirty(true);
    return newId;
  }, [setIsDirty]);

  const updateLocation = useCallback(
    (id: string, updates: Partial<LocationCodexEntry>) => {
      setBook(prev => {
        if (!prev) return null;
        const currentLocs = prev.writerData?.locations || [];
        const updated = currentLocs.map(l => (l.id === id ? { ...l, ...updates } : l));
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            locations: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const deleteLocation = useCallback(
    (id: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentLocs = prev.writerData?.locations || [];
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            locations: currentLocs.filter(l => l.id !== id),
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const toggleLocationFeature = useCallback(
    (locationId: string, featureId: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentLocs = prev.writerData?.locations || [];
        const updated = currentLocs.map(loc => {
          if (loc.id !== locationId) return loc;
          const features = (loc.features || []).map(f =>
            f.id === featureId ? { ...f, explored: !f.explored } : f
          );
          return { ...loc, features };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            locations: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const addLocationFeature = useCallback(
    (locationId: string, name: string, category: string = 'landmark') => {
      if (!name.trim()) return;
      const newFeature: LocationFeatureItem = {
        id: `feat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        explored: false,
        category,
      };

      setBook(prev => {
        if (!prev) return null;
        const currentLocs = prev.writerData?.locations || [];
        const updated = currentLocs.map(loc => {
          if (loc.id !== locationId) return loc;
          return {
            ...loc,
            features: [...(loc.features || []), newFeature],
          };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            locations: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const removeLocationFeature = useCallback(
    (locationId: string, featureId: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentLocs = prev.writerData?.locations || [];
        const updated = currentLocs.map(loc => {
          if (loc.id !== locationId) return loc;
          return {
            ...loc,
            features: (loc.features || []).filter(f => f.id !== featureId),
          };
        });
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            locations: updated,
          },
        };
      });
      setIsDirty(true);
    },
    [setIsDirty]
  );

  // Timeline State & Actions
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);

  const timelines = useMemo(() => {
    return book?.writerData?.timelines || [];
  }, [book]);

  // Set default activeTimelineId if not selected
  useEffect(() => {
    if (timelines.length > 0 && (!activeTimelineId || !timelines.some(t => t.id === activeTimelineId))) {
      setActiveTimelineId(timelines[0].id);
    }
  }, [timelines, activeTimelineId]);

  const createTimeline = useCallback((tlUpdates?: Partial<StoryTimeline>): string => {
    const newId = `timeline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTimeline: StoryTimeline = {
      id: newId,
      title: tlUpdates?.title?.trim() || 'New Timeline',
      description: tlUpdates?.description || '',
      timescale: tlUpdates?.timescale || 'hours',
      color: tlUpdates?.color || '#3b82f6',
      totalUnitsPerSegment: tlUpdates?.totalUnitsPerSegment || 24,
      unitStep: tlUpdates?.unitStep || 2,
      segments: tlUpdates?.segments || [
        {
          id: `seg-${Date.now()}-1`,
          name: 'Day 1',
          events: [],
        },
      ],
      ...tlUpdates,
    };

    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: [...currentTimelines, newTimeline],
        },
      };
    });
    setActiveTimelineId(newId);
    setIsDirty(true);
    return newId;
  }, [setIsDirty]);

  const updateTimeline = useCallback((id: string, updates: Partial<StoryTimeline>) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => (t.id === id ? { ...t, ...updates } : t));
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const deleteTimeline = useCallback((id: string) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const filtered = currentTimelines.filter(t => t.id !== id);
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: filtered,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const addTimelineSegment = useCallback((timelineId: string, name?: string) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        const count = t.segments.length + 1;
        const newSeg: TimelineSegment = {
          id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: name || `Day ${count}`,
          events: [],
        };
        return {
          ...t,
          segments: [...t.segments, newSeg],
        };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const updateTimelineSegment = useCallback((timelineId: string, segmentId: string, updates: Partial<TimelineSegment>) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        const segments = t.segments.map(s => (s.id === segmentId ? { ...s, ...updates } : s));
        return { ...t, segments };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const deleteTimelineSegment = useCallback((timelineId: string, segmentId: string) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        return {
          ...t,
          segments: t.segments.filter(s => s.id !== segmentId),
        };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const addTimelineEvent = useCallback((timelineId: string, segmentId: string, eventData: Partial<TimelineEvent>) => {
    const newEvent: TimelineEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: eventData.title?.trim() || 'New Event',
      description: eventData.description || '',
      start: typeof eventData.start === 'number' ? Math.max(0, eventData.start) : 0,
      duration: typeof eventData.duration === 'number' && eventData.duration > 0 ? eventData.duration : 2,
      color: eventData.color || '#2563eb',
      lane: typeof eventData.lane === 'number' ? eventData.lane : 0,
      characters: eventData.characters || [],
      notes: eventData.notes || '',
      ...eventData,
    };

    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        const segments = t.segments.map(s => {
          if (s.id !== segmentId) return s;
          return {
            ...s,
            events: [...s.events, newEvent],
          };
        });
        return { ...t, segments };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const updateTimelineEvent = useCallback((timelineId: string, segmentId: string, eventId: string, updates: Partial<TimelineEvent>) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        const segments = t.segments.map(s => {
          if (s.id !== segmentId) return s;
          const events = s.events.map(e => (e.id === eventId ? { ...e, ...updates } : e));
          return { ...s, events };
        });
        return { ...t, segments };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  const deleteTimelineEvent = useCallback((timelineId: string, segmentId: string, eventId: string) => {
    setBook(prev => {
      if (!prev) return null;
      const currentTimelines = prev.writerData?.timelines || [];
      const updated = currentTimelines.map(t => {
        if (t.id !== timelineId) return t;
        const segments = t.segments.map(s => {
          if (s.id !== segmentId) return s;
          return {
            ...s,
            events: s.events.filter(e => e.id !== eventId),
          };
        });
        return { ...t, segments };
      });
      return {
        ...prev,
        writerData: {
          ...prev.writerData,
          timelines: updated,
        },
      };
    });
    setIsDirty(true);
  }, [setIsDirty]);

  // Author Comments & Highlighting
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState<boolean>(false);
  const [showCommentHighlights, setShowCommentHighlights] = useState<boolean>(true);

  const toggleCommentHighlights = useCallback(() => {
    setShowCommentHighlights(prev => !prev);
  }, []);

  const comments = useMemo(() => {
    return book?.writerData?.comments || [];
  }, [book]);

  const chapterComments = useMemo(() => {
    if (!activeChapterId) return [];
    return (book?.writerData?.comments || []).filter(c => c.chapterId === activeChapterId);
  }, [book, activeChapterId]);

  const addComment = useCallback(
    (
      chapterId: string,
      selectedText: string,
      commentText: string,
      color: string = DEFAULT_HIGHLIGHT_COLOR,
      customId?: string,
      newChapterContent?: string
    ): AuthorComment => {
      const commentId = customId || `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newComment: AuthorComment = {
        id: commentId,
        chapterId,
        selectedText: selectedText.trim(),
        comment: commentText.trim(),
        color,
        createdAt: new Date().toISOString(),
      };

      const currentBook = bookRef.current;
      if (currentBook) {
        const currentComments = currentBook.writerData?.comments || [];
        let updatedChapters = currentBook.chapters;

        if (newChapterContent !== undefined) {
          const targetChapter = currentBook.chapters.find(c => c.id === chapterId);
          if (targetChapter) {
            const updatedOriginalXhtml = wrapInXhtml(
              restoreAssetUrls(newChapterContent, targetChapter.fullPath, currentBook.assets),
              targetChapter.title
            );
            updatedChapters = currentBook.chapters.map(c =>
              c.id === chapterId
                ? {
                    ...c,
                    content: newChapterContent,
                    originalXhtml: updatedOriginalXhtml,
                    wordCount: calculateWordCount(newChapterContent),
                  }
                : c
            );
          }
        }

        const updatedBook: EpubBook = {
          ...currentBook,
          chapters: updatedChapters,
          writerData: {
            ...currentBook.writerData,
            comments: [...currentComments, newComment],
          },
        };

        bookRef.current = updatedBook;
        setBook(updatedBook);
        setIsDirty(true);
      }

      setActiveCommentId(newComment.id);
      showNotification('success', 'Comment added');
      return newComment;
    },
    [showNotification, setIsDirty]
  );

  const updateComment = useCallback(
    (commentId: string, updates: { comment?: string; color?: string }) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const currentComments = currentBook.writerData?.comments || [];
      const target = currentComments.find(c => c.id === commentId);
      const updatedComments = currentComments.map(c =>
        c.id === commentId
          ? { ...c, ...updates, updatedAt: new Date().toISOString() }
          : c
      );

      let updatedChapters = currentBook.chapters;
      if (target && updates.color && updates.color !== target.color) {
        updatedChapters = currentBook.chapters.map(ch => {
          if (ch.id === target.chapterId) {
            return {
              ...ch,
              content: updateCommentHighlightColorInHtml(ch.content, commentId, updates.color!),
            };
          }
          return ch;
        });
      }

      const updatedBook: EpubBook = {
        ...currentBook,
        chapters: updatedChapters,
        writerData: {
          ...currentBook.writerData,
          comments: updatedComments,
        },
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const currentComments = currentBook.writerData?.comments || [];
      const target = currentComments.find(c => c.id === commentId);
      const filtered = currentComments.filter(c => c.id !== commentId);

      let updatedChapters = currentBook.chapters;
      if (target) {
        updatedChapters = currentBook.chapters.map(ch => {
          if (ch.id === target.chapterId) {
            return {
              ...ch,
              content: unwrapCommentHighlightInHtml(ch.content, commentId),
            };
          }
          return ch;
        });
      }

      const updatedBook: EpubBook = {
        ...currentBook,
        chapters: updatedChapters,
        writerData: {
          ...currentBook.writerData,
          comments: filtered,
        },
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }
      setIsDirty(true);
      showNotification('info', 'Comment removed');
    },
    [activeCommentId, showNotification, setIsDirty]
  );

  return (
    <EpubContext.Provider
      value={{
        book,
        isLoading,
        isSaving,
        activeChapterId,
        setActiveChapterId,
        activeChapter,
        loadEpubFile,
        loadAnyFile,
        loadSampleBook,
        createNewBook,
        saveProject,
        saveAs,
        loadFromCloud,
        viewMode,
        setViewMode,
        editorSubMode,
        setEditorSubMode,
        readerTheme,
        setReaderTheme,
        readerFont,
        setReaderFont,
        readerFontSize,
        setReaderFontSize,
        readerLineHeight,
        setReaderLineHeight,
        readerMarginWidth,
        setReaderMarginWidth,
        customCss,
        setCustomCss,
        applyCustomCssToBook,
        isDirty,
        notification,
        storageTarget,
        setStorageTarget,
        cloudFileName,
        setCloudFileName,
        webdavConfig,
        isWebDavConnected,
        updateWebDavConfig,
        isWebDavConfigOpen,
        setIsWebDavConfigOpen,
        isSaveDestinationOpen,
        setIsSaveDestinationOpen,
        isSaveAsOpen,
        setIsSaveAsOpen,
        isCloudBrowserOpen,
        setIsCloudBrowserOpen,
        isCloudDesktopNoticeOpen,
        setIsCloudDesktopNoticeOpen,
        isWelcomeModalOpen,
        setIsWelcomeModalOpen,
        uiTheme,
        setUiTheme,
        isSettingsOpen,
        setIsSettingsOpen,
        settingsInitialTab,
        openSettings,
        closeSettings,
        pendingUnsavedAction,
        setPendingUnsavedAction,
        updateChapterContent,
        updateChapterTitle,
        reorderChapters,
        deleteChapter,
        addBlankChapter,
        splitCurrentChapter,
        splitAtHeading,
        splitAtTextMarker,
        updateMetadata,
        updateToc,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        totalWordCount,
        totalReadingTimeMinutes,
        updateCoverImage,
        generateCustomCover,
        exportAndDownload,
        showNotification,
        characters,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        toggleCharacterTrait,
        addCharacterTrait,
        removeCharacterTrait,
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        toggleLocationFeature,
        addLocationFeature,
        removeLocationFeature,
        timelines,
        activeTimelineId,
        setActiveTimelineId,
        createTimeline,
        updateTimeline,
        deleteTimeline,
        addTimelineSegment,
        updateTimelineSegment,
        deleteTimelineSegment,
        addTimelineEvent,
        updateTimelineEvent,
        deleteTimelineEvent,
        comments,
        chapterComments,
        activeCommentId,
        setActiveCommentId,
        isCommentsSidebarOpen,
        setIsCommentsSidebarOpen,
        showCommentHighlights,
        setShowCommentHighlights,
        toggleCommentHighlights,
        addComment,
        updateComment,
        deleteComment,
      }}
    >
      {children}
    </EpubContext.Provider>
  );
};

export function useEpub(): EpubContextType {
  const context = useContext(EpubContext);
  if (!context) {
    throw new Error('useEpub must be used within an EpubProvider');
  }
  return context;
}
