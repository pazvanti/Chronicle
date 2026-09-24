import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  EpubBook,
  EpubChapter,
  EpubMetadata,
  AppViewMode,
  PrimaryAppMode,
  PRIMARY_MODE_MAP,
  PRIMARY_DEFAULT_VIEWS,
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
  CastPresenceMatrix,
  StorySnapshot,
  StorySnapshotData,
  SnapshotRestoreOptions,
} from '../types/project';
import { analyzeCastPresence, AnalysisProgress } from '../services/analysis/presenceAnalysisService';
import {
  unwrapCommentHighlightInHtml,
  updateCommentHighlightColorInHtml,
  DEFAULT_HIGHLIGHT_COLOR,
  reconcileChapterComments,
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
import { isMarkdownFile, parseMarkdownToBook } from '../services/epub/markdownImporter';
import { WebDavConfig, StorageTarget } from '../types/cloud';
import { UiTheme } from '../types/theme';
import { saveWebDavConfig, deleteWebDavConfig } from '../services/cloud/webdavStorage';
import {
  loadAllSettings,
  saveSetting,
  ZenModeSettings,
  DEFAULT_ZEN_SETTINGS,
} from '../services/storage/indexedDbSettings';
import { uploadFile, downloadFile } from '../services/cloud/webdavClient';
import {
  isTauri,
  pickFileToOpen,
  pickFileToSave,
  readLocalBinaryFile,
  writeLocalBinaryFile,
  checkLocalFileExists,
} from '../services/native/tauriFs';
import {
  saveDesktopSession,
  getDesktopSession,
  updateDesktopSessionChapter,
  clearDesktopSession,
} from '../services/native/desktopSession';
import {
  UpdateCheckResult,
  checkForUpdates,
  getCachedUpdate,
} from '../services/update/updateChecker';
import { useTranslation } from '../i18n/I18nContext';

export interface PendingUnsavedAction {
  actionType: 'new' | 'open' | 'sample' | 'cloud';
  title: string;
  description: string;
  targetName?: string;
  onProceed: () => void | Promise<void>;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationState {
  type: 'success' | 'error' | 'info' | 'update';
  message: string;
  title?: string;
  action?: NotificationAction;
}

interface EpubContextType {
  book: EpubBook | null;
  bookSessionId: string;
  refreshBookSession: () => void;
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

  primaryMode: PrimaryAppMode;
  setPrimaryMode: (mode: PrimaryAppMode) => void;
  lastWriteView: AppViewMode;
  lastKnowledgeBaseView: AppViewMode;
  lastPublishView: AppViewMode;
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
  openLocalDocument: (targetPath?: string, force?: boolean, initialChapterId?: string | null, isRestore?: boolean) => Promise<void>;
  loadSampleBook: (force?: boolean) => Promise<void>;
  createNewBook: (title?: string, author?: string, force?: boolean) => Promise<void>;
  saveProject: (overrideTarget?: StorageTarget, customFilename?: string, targetSubPath?: string, forceSaveAs?: boolean, isAutoSave?: boolean) => Promise<void>;
  saveAs: (target: StorageTarget, filename?: string, targetSubPath?: string) => Promise<void>;
  loadFromCloud: (href: string, filename: string, force?: boolean, relativePath?: string) => Promise<void>;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => Promise<void>;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => Promise<void>;
  lastAutoSavedAt: Date | null;
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
  showNotification: (
    type: 'success' | 'error' | 'info' | 'update',
    message: string,
    action?: NotificationAction,
    duration?: number,
    title?: string
  ) => void;
  dismissNotification: () => void;

  storageTarget: StorageTarget | null;
  setStorageTarget: (target: StorageTarget | null) => void;
  localFilePath: string | null;
  setLocalFilePath: (path: string | null) => void;
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
  showWelcomeOnStartup: boolean;
  setShowWelcomeOnStartup: (enabled: boolean) => Promise<void>;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;

  isCharacterSidebarOpen: boolean;
  setIsCharacterSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLocationSidebarOpen: boolean;
  setIsLocationSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

  uiTheme: UiTheme;
  setUiTheme: (theme: UiTheme) => void;

  minimalistMode: boolean;
  setMinimalistMode: (minimalist: boolean | ((prev: boolean) => boolean)) => void;
  toggleMinimalistMode: () => void;

  isZenMode: boolean;
  setZenMode: (zen: boolean | ((prev: boolean) => boolean)) => void;
  toggleZenMode: () => void;
  zenSettings: ZenModeSettings;
  updateZenSettings: (partial: Partial<ZenModeSettings>) => void;
  todayWordsCount: number;

  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settingsInitialTab: 'appearance' | 'themes' | 'cloud' | 'editor' | 'general' | 'updates';
  openSettings: (tab?: 'appearance' | 'themes' | 'cloud' | 'editor' | 'general' | 'updates') => void;
  closeSettings: () => void;

  checkUpdatesOnStartup: boolean;
  setCheckUpdatesOnStartup: (enabled: boolean) => Promise<void>;
  isUpdateAvailable: boolean;
  latestRelease: UpdateCheckResult | null;
  checkForUpdatesManually: (forceRefresh?: boolean) => Promise<UpdateCheckResult>;

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

  snapshots: StorySnapshot[];
  isSnapshotsModalOpen: boolean;
  setIsSnapshotsModalOpen: (open: boolean) => void;
  createSnapshot: (name?: string, description?: string) => StorySnapshot;
  updateSnapshot: (id: string, updates: { name?: string; description?: string }) => void;
  deleteSnapshot: (id: string) => void;
  restoreSnapshot: (id: string, options?: SnapshotRestoreOptions) => void;

  castPresenceData: CastPresenceMatrix | null;
  isPresenceCacheValid: boolean;
  isPresenceAnalyzing: boolean;
  presenceProgress: AnalysisProgress | null;
  runCastPresenceAnalysis: (force?: boolean) => Promise<CastPresenceMatrix | null>;
  invalidatePresenceCache: () => void;
}

const EpubContext = createContext<EpubContextType | undefined>(undefined);

export const EpubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const initialSettings = getStoredSettings();
  const [book, setBook] = useState<EpubBook | null>(null);
  const [bookSessionId, setBookSessionId] = useState<string>(() => `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const refreshBookSession = useCallback(() => {
    setBookSessionId(`book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  }, []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<AppViewMode>(initialSettings.viewMode);
  const [lastWriteView, setLastWriteView] = useState<AppViewMode>(() =>
    ['editor', 'reader', 'inspector'].includes(initialSettings.viewMode) ? initialSettings.viewMode : 'editor'
  );
  const [lastKnowledgeBaseView, setLastKnowledgeBaseView] = useState<AppViewMode>(() =>
    ['timeline', 'cast-grid', 'characters', 'locations'].includes(initialSettings.viewMode) ? initialSettings.viewMode : 'cast-grid'
  );
  const [lastPublishView, setLastPublishView] = useState<AppViewMode>(() =>
    ['cover', 'styles', 'toc', 'metadata', 'assets'].includes(initialSettings.viewMode) ? initialSettings.viewMode : 'cover'
  );

  const primaryMode: PrimaryAppMode = useMemo(() => {
    return PRIMARY_MODE_MAP[viewMode] || 'write';
  }, [viewMode]);
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
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);
  const [cloudFileName, setCloudFileName] = useState<string | null>(null);
  const [webdavConfig, setWebdavConfig] = useState<WebDavConfig | null>(null);
  const [isWebDavConnected, setIsWebDavConnected] = useState<boolean>(false);

  const [isWebDavConfigOpen, setIsWebDavConfigOpen] = useState<boolean>(false);
  const [isSaveDestinationOpen, setIsSaveDestinationOpen] = useState<boolean>(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState<boolean>(false);
  const [isCloudBrowserOpen, setIsCloudBrowserOpen] = useState<boolean>(false);
  const [isCloudDesktopNoticeOpen, setIsCloudDesktopNoticeOpen] = useState<boolean>(false);

  const [autoSaveEnabled, setAutoSaveEnabledState] = useState<boolean>(
    initialSettings.autoSaveEnabled ?? isTauri()
  );
  const [autoSaveInterval, setAutoSaveIntervalState] = useState<number>(
    initialSettings.autoSaveInterval ?? 60
  );
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);

  const setAutoSaveEnabled = useCallback(async (enabled: boolean) => {
    setAutoSaveEnabledState(enabled);
    await saveSetting('autoSaveEnabled', enabled);
  }, []);

  const setAutoSaveInterval = useCallback(async (interval: number) => {
    setAutoSaveIntervalState(interval);
    await saveSetting('autoSaveInterval', interval);
  }, []);

  const [uiTheme, setUiThemeState] = useState<UiTheme>('classic-dark');
  const [minimalistMode, setMinimalistModeState] = useState<boolean>(false);
  const [isZenMode, setIsZenModeState] = useState<boolean>(false);
  const [zenSettings, setZenSettingsState] = useState<ZenModeSettings>(DEFAULT_ZEN_SETTINGS);
  const [todayWordsCount, setTodayWordsCount] = useState<number>(0);
  const baselineBookWordsRef = useRef<number | null>(null);

  const [castPresenceData, setCastPresenceData] = useState<CastPresenceMatrix | null>(null);
  const [isPresenceCacheValid, setIsPresenceCacheValid] = useState<boolean>(false);
  const [isPresenceAnalyzing, setIsPresenceAnalyzing] = useState<boolean>(false);
  const [presenceProgress, setPresenceProgress] = useState<AnalysisProgress | null>(null);

  const invalidatePresenceCache = useCallback(() => {
    setIsPresenceCacheValid(false);
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'themes' | 'cloud' | 'editor' | 'general' | 'updates'>('appearance');

  const [checkUpdatesOnStartup, setCheckUpdatesOnStartupState] = useState<boolean>(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [latestRelease, setLatestRelease] = useState<UpdateCheckResult | null>(() => getCachedUpdate());

  const setCheckUpdatesOnStartup = useCallback(async (enabled: boolean) => {
    setCheckUpdatesOnStartupState(enabled);
    await saveSetting('checkUpdatesOnStartup', enabled);
    try {
      localStorage.setItem('chronicle_check_updates_on_startup', String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const checkForUpdatesManually = useCallback(async (forceRefresh = true): Promise<UpdateCheckResult> => {
    const res = await checkForUpdates(forceRefresh);
    if (res.hasUpdate) {
      setIsUpdateAvailable(true);
      setLatestRelease(res);
    } else {
      setIsUpdateAvailable(false);
      if (!res.error) {
        setLatestRelease(res);
      }
    }
    return res;
  }, []);

  const openSettings = useCallback((tab: 'appearance' | 'themes' | 'cloud' | 'editor' | 'general' | 'updates' = 'appearance') => {
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

  const [showWelcomeOnStartup, setShowWelcomeOnStartupState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('chronicle_show_welcome_on_startup');
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch {
      /* ignore */
    }
    return true;
  });

  const showWelcomeOnStartupRef = useRef<boolean>(showWelcomeOnStartup);
  useEffect(() => {
    showWelcomeOnStartupRef.current = showWelcomeOnStartup;
  }, [showWelcomeOnStartup]);

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('chronicle_show_welcome_on_startup');
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch {
      /* ignore */
    }
    return true;
  });

  const setShowWelcomeOnStartup = useCallback(async (enabled: boolean) => {
    setShowWelcomeOnStartupState(enabled);
    showWelcomeOnStartupRef.current = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('chronicle_show_welcome_on_startup', String(enabled));
      }
    } catch {
      /* ignore */
    }
    await saveSetting('showWelcomeOnStartup', enabled);
  }, []);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCharacterSidebarOpen, setIsCharacterSidebarOpen] = useState<boolean>(false);
  const [isLocationSidebarOpen, setIsLocationSidebarOpen] = useState<boolean>(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState<boolean>(false);
  const [showCommentHighlights, setShowCommentHighlights] = useState<boolean>(true);

  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<PendingUnsavedAction | null>(null);
  const isDirtyRef = useRef<boolean>(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const activeChapterIdRef = useRef<string | null>(activeChapterId);
  useEffect(() => {
    activeChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);

  const localFilePathRef = useRef<string | null>(localFilePath);
  useEffect(() => {
    localFilePathRef.current = localFilePath;
  }, [localFilePath]);

  // Keep stored desktop session chapter in sync whenever active chapter changes
  useEffect(() => {
    if (isTauri() && localFilePath && activeChapterId) {
      updateDesktopSessionChapter(activeChapterId);
    }
  }, [activeChapterId, localFilePath]);

  // Window beforeunload protection: prompt before leaving/reloading if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTauri() && localFilePathRef.current) {
        updateDesktopSessionChapter(activeChapterIdRef.current);
      }
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

        const loadedMinimalist = settings.minimalistMode;
        if (typeof loadedMinimalist === 'boolean') {
          setMinimalistModeState(loadedMinimalist);
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-minimalist-mode', loadedMinimalist ? 'true' : 'false');
          }
        }

        if (settings.zenSettings) {
          setZenSettingsState(settings.zenSettings);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        if (settings.todayWordsDate === todayStr && typeof settings.todayWordsCount === 'number') {
          setTodayWordsCount(settings.todayWordsCount);
        } else {
          saveSetting('todayWordsDate', todayStr);
          saveSetting('todayWordsCount', 0);
          setTodayWordsCount(0);
        }

        if (settings.webdavConfig) {
          setWebdavConfig(settings.webdavConfig);
          setIsWebDavConnected(settings.webdavConfig.connected ?? true);
        }

        setShowWelcomeOnStartupState(settings.showWelcomeOnStartup);
        showWelcomeOnStartupRef.current = settings.showWelcomeOnStartup;
        setIsWelcomeModalOpen(settings.showWelcomeOnStartup);

        if (typeof settings.autoSaveEnabled === 'boolean') {
          setAutoSaveEnabledState(settings.autoSaveEnabled);
        }
        if (typeof settings.autoSaveInterval === 'number') {
          setAutoSaveIntervalState(settings.autoSaveInterval);
        }

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
            const validViews: AppViewMode[] = ['reader', 'editor', 'toc', 'metadata', 'cover', 'styles', 'assets', 'inspector', 'timeline', 'cast-grid', 'characters', 'locations'];
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
        if (typeof settings.checkUpdatesOnStartup === 'boolean') {
          setCheckUpdatesOnStartupState(settings.checkUpdatesOnStartup);
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

  // Session-wide comment history cache to allow seamless resurrection during Undo (Ctrl+Z) / Redo
  const commentHistoryCacheRef = useRef<Map<string, AuthorComment>>(new Map());
  useEffect(() => {
    if (book?.writerData?.comments) {
      book.writerData.comments.forEach(c => {
        commentHistoryCacheRef.current.set(c.id, c);
      });
    }
  }, [book]);

  // Guarded setIsDirty: ignores dirty triggers occurring during save or download cooldown
  const setIsDirty = useCallback((dirty: boolean) => {
    if (dirty && isSavingRef.current) {
      return;
    }
    if (dirty) {
      setIsPresenceCacheValid(false);
    }
    setIsDirtyState(dirty);
  }, []);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNotification = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
    setNotification(null);
  }, []);

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

  // Track words written today incrementally
  useEffect(() => {
    if (baselineBookWordsRef.current === null) {
      if (totalWordCount > 0) {
        baselineBookWordsRef.current = totalWordCount;
      }
      return;
    }
    if (totalWordCount > baselineBookWordsRef.current) {
      const diff = totalWordCount - baselineBookWordsRef.current;
      baselineBookWordsRef.current = totalWordCount;
      setTodayWordsCount(prev => {
        const next = prev + diff;
        const todayStr = new Date().toISOString().split('T')[0];
        saveSetting('todayWordsDate', todayStr);
        saveSetting('todayWordsCount', next);
        return next;
      });
    } else if (totalWordCount < baselineBookWordsRef.current) {
      baselineBookWordsRef.current = totalWordCount;
    }
  }, [totalWordCount]);

  const setViewMode = useCallback((mode: AppViewMode) => {
    setViewModeState(mode);
    const parentPrimary = PRIMARY_MODE_MAP[mode] || 'write';
    if (parentPrimary === 'write') setLastWriteView(mode);
    else if (parentPrimary === 'knowledge-base') setLastKnowledgeBaseView(mode);
    else if (parentPrimary === 'publish') setLastPublishView(mode);
    saveSetting('viewMode', mode);
  }, []);

  const setPrimaryMode = useCallback(
    (mode: PrimaryAppMode) => {
      let targetView: AppViewMode;
      if (mode === 'write') targetView = lastWriteView;
      else if (mode === 'knowledge-base') targetView = lastKnowledgeBaseView;
      else if (mode === 'publish') targetView = lastPublishView;
      else targetView = PRIMARY_DEFAULT_VIEWS[mode] || 'editor';
      setViewMode(targetView);
    },
    [lastWriteView, lastKnowledgeBaseView, lastPublishView, setViewMode]
  );

  const setEditorSubMode = useCallback((subMode: EditorSubMode) => {
    setEditorSubModeState(subMode);
    saveSetting('editorSubMode', subMode);
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

  const setReaderLineHeight = useCallback((h: number) => {
    setReaderLineHeightState(h);
    updateStoredSettings({ readerLineHeight: h });
    saveSetting('readerLineHeight', h);
  }, []);

  const setReaderMarginWidth = useCallback((w: number) => {
    setReaderMarginWidthState(w);
    updateStoredSettings({ readerMarginWidth: w });
    saveSetting('readerMarginWidth', w);
  }, []);

  const showNotification = useCallback(
    (
      type: 'success' | 'error' | 'info' | 'update',
      message: string,
      action?: NotificationAction,
      duration: number = 4000,
      title?: string
    ) => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      setNotification({ type, message, action, title });
      if (duration > 0) {
        notificationTimerRef.current = setTimeout(() => {
          setNotification(null);
          notificationTimerRef.current = null;
        }, duration);
      }
    },
    []
  );

  // Automatic background update check on startup
  useEffect(() => {
    if (checkUpdatesOnStartup) {
      const timer = setTimeout(() => {
        checkForUpdates(false).then(res => {
          if (res.hasUpdate) {
            setIsUpdateAvailable(true);
            setLatestRelease(res);
            showNotification(
              'update',
              `A new version of Chronicle (${res.latestVersion}) is available!`,
              {
                label: 'View Update',
                onClick: () => openSettings('updates'),
              },
              10000,
              'New Release Available'
            );
          }
        }).catch(err => {
          console.warn('Background update check failed:', err);
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [checkUpdatesOnStartup, showNotification, openSettings]);

  const setMinimalistMode = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setMinimalistModeState(prev => {
        const next = typeof val === 'function' ? val(prev) : val;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-minimalist-mode', next ? 'true' : 'false');
        }
        saveSetting('minimalistMode', next);
        showNotification('info', next ? 'Minimalist Mode enabled (Alt+M to exit)' : 'Studio Mode restored');
        return next;
      });
    },
    [showNotification]
  );

  const toggleMinimalistMode = useCallback(() => {
    setMinimalistMode(prev => !prev);
  }, [setMinimalistMode]);

  const setZenMode = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsZenModeState(prev => {
        const next = typeof val === 'function' ? val(prev) : val;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-zen-mode', next ? 'true' : 'false');
          document.documentElement.setAttribute('data-zen-hide-comments', (next && zenSettings.hideComments) ? 'true' : 'false');
        }
        showNotification('info', next ? 'Zen Mode engaged (Press Esc to exit)' : 'Exited Zen Mode');
        return next;
      });
    },
    [showNotification, zenSettings.hideComments]
  );

  const toggleZenMode = useCallback(() => {
    setZenMode(prev => !prev);
  }, [setZenMode]);

  const updateZenSettings = useCallback(
    (partial: Partial<ZenModeSettings>) => {
      setZenSettingsState(prev => {
        const next = { ...prev, ...partial };
        saveSetting('zenSettings', next);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-zen-hide-comments', (isZenMode && next.hideComments) ? 'true' : 'false');
          const dimOpacity = ((next.focusDimOpacity ?? 35) / 100).toFixed(2);
          document.documentElement.style.setProperty('--zen-dim-opacity', dimOpacity);
        }
        return next;
      });
    },
    [isZenMode]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-zen-mode', isZenMode ? 'true' : 'false');
      document.documentElement.setAttribute('data-zen-hide-comments', (isZenMode && zenSettings.hideComments) ? 'true' : 'false');
      const dimOpacity = ((zenSettings.focusDimOpacity ?? 35) / 100).toFixed(2);
      document.documentElement.style.setProperty('--zen-dim-opacity', dimOpacity);
    }
  }, [isZenMode, zenSettings.hideComments, zenSettings.focusDimOpacity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+M toggles Minimalist Mode
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleMinimalistMode();
      }
      // Alt+Z toggles Zen Mode
      if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        toggleZenMode();
      }
      // Esc exits Zen Mode if active
      if (e.key === 'Escape' && isZenMode) {
        e.preventDefault();
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMinimalistMode, toggleZenMode, isZenMode, setZenMode]);

  const runCastPresenceAnalysis = useCallback(
    async (force: boolean = false): Promise<CastPresenceMatrix | null> => {
      const currentBook = bookRef.current;
      if (!currentBook) return null;
      if (!force && isPresenceCacheValid && castPresenceData) {
        return castPresenceData;
      }
      setIsPresenceAnalyzing(true);
      setPresenceProgress({
        current: 0,
        total: currentBook.chapters.length,
        chapterTitle: 'Initializing manuscript analysis...',
        percent: 0,
      });

      try {
        const matrix = await analyzeCastPresence(currentBook, progress => {
          setPresenceProgress(progress);
        });
        setCastPresenceData(matrix);
        setIsPresenceCacheValid(true);
        return matrix;
      } catch (err) {
        console.error('Cast presence analysis failed:', err);
        showNotification('error', 'Failed to analyze cast presence in manuscript');
        return null;
      } finally {
        setIsPresenceAnalyzing(false);
        setPresenceProgress(null);
      }
    },
    [isPresenceCacheValid, castPresenceData, showNotification]
  );

  // Helper to extract CSS from loaded book
  const extractCssFromBook = (loadedBook: EpubBook) => {
    const cssAsset = loadedBook.assets?.find(a => a.mediaType?.includes('css'));
    if (cssAsset && cssAsset.data) {
      const decoded = new TextDecoder('utf-8').decode(cssAsset.data);
      setCustomCss(decoded);
      return;
    }
    if (loadedBook.rawFiles) {
      for (const [path, bytes] of loadedBook.rawFiles.entries()) {
        if (path.toLowerCase().endsWith('.css') && bytes) {
          const decoded = new TextDecoder('utf-8').decode(bytes);
          setCustomCss(decoded);
          return;
        }
      }
    }
    setCustomCss(CSS_PRESETS[0].css);
  };

  // Load sample book on initial startup
  useEffect(() => {
    async function init() {
      // On desktop, if a previous session file exists, do not load sample book
      if (isTauri() && getDesktopSession()?.filePath) {
        return;
      }
      try {
        setIsLoading(true);
        const settings = await loadAllSettings();
        const activeLang = settings.language || (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en');
        const sample = await createSampleEpubBook(activeLang);
        setBook(sample);
        refreshBookSession();
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
  }, [refreshBookSession]);

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
      const settings = await loadAllSettings();
      const activeLang = settings.language || (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en');
      const sample = await createSampleEpubBook(activeLang);
      bookRef.current = sample;
      setBook(sample);
      refreshBookSession();
      extractCssFromBook(sample);
      if (sample.chapters.length > 0) {
        setActiveChapterId(sample.chapters[0].id);
      }
      if (isTauri()) {
        clearDesktopSession();
      }
      setStorageTarget(null);
      setLocalFilePath(null);
      setCloudFileName(null);
      setCastPresenceData(null);
      setIsPresenceCacheValid(false);
      setIsDirty(false);
      showNotification('success', t('notifications.loadedSampleBook'));
    } catch (err) {
      console.error(err);
      showNotification('error', t('notifications.failedLoadSampleBook'));
    } finally {
      setIsLoading(false);
    }
  }, [setIsDirty, showNotification, refreshBookSession, t]);

  const createNewBook = useCallback(
    async (title?: string, author?: string, force: boolean = false) => {
      const settings = await loadAllSettings();
      const activeLang = settings.language || (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en');
      const defaultTitle = t('welcome.defaultTitle');
      const defaultAuthor = t('welcome.defaultAuthor');
      const finalTitle = title || defaultTitle;
      const finalAuthor = author || defaultAuthor;

      if (isDirtyRef.current && !force) {
        setPendingUnsavedAction({
          actionType: 'new',
          title: t('header.newManuscript'),
          description: t('unsavedModal.newManuscriptDesc', { title: finalTitle }),
          targetName: finalTitle,
          onProceed: () => createNewBook(finalTitle, finalAuthor, true),
        });
        return;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('epub-file-opening'));
      }
      try {
        setIsLoading(true);
        const newBook = await createNewBlankEpubBook(finalTitle, finalAuthor, activeLang);
        bookRef.current = newBook;
        setBook(newBook);
        refreshBookSession();
        extractCssFromBook(newBook);
        if (newBook.chapters.length > 0) {
          setActiveChapterId(newBook.chapters[0].id);
        }
        if (isTauri()) {
          clearDesktopSession();
        }
        setStorageTarget(null);
        setLocalFilePath(null);
        setCloudFileName(null);
        setCastPresenceData(null);
        setIsPresenceCacheValid(false);
        setIsDirty(true);
        setViewModeState('editor');
        showNotification('success', t('notifications.createdNewManuscript', { title: finalTitle }));
      } catch (err: any) {
        console.error(err);
        showNotification('error', t('notifications.failedCreateManuscript', { error: err?.message || 'Error' }));
      } finally {
        setIsLoading(false);
      }
    },
    [setIsDirty, showNotification, refreshBookSession, t]
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
        const nativePath = (file as any).path as string | undefined;

        if (isChronicleProjectFile(file)) {
          const projectBook = await parseChronicleProject(buffer, file.name);
          bookRef.current = projectBook;
          setBook(projectBook);
          refreshBookSession();
          extractCssFromBook(projectBook);
          if (projectBook.chapters.length > 0) {
            setActiveChapterId(projectBook.chapters[0].id);
          }
          setStorageTarget('local');
          setLocalFilePath(nativePath || null);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirty(false);
          showNotification('success', `Opened Chronicle "${projectBook.metadata.title}" successfully!`);
        } else if (isMarkdownFile(file)) {
          const text = await file.text();
          const mdBook = await parseMarkdownToBook(text, file.name);
          bookRef.current = mdBook;
          setBook(mdBook);
          refreshBookSession();
          extractCssFromBook(mdBook);
          if (mdBook.chapters.length > 0) {
            setActiveChapterId(mdBook.chapters[0].id);
          }
          setStorageTarget('local');
          setLocalFilePath(nativePath ? nativePath.replace(/\.(md|markdown|mdown|mkd)$/i, '.chronicle') : null);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirty(true);
          setViewModeState('editor');
          showNotification(
            'success',
            `Imported Markdown "${mdBook.metadata.title}" (${mdBook.chapters.length} chapter${mdBook.chapters.length === 1 ? '' : 's'
            })! Ready to edit and save as .chronicle`
          );
        } else {
          const parsed = await parseEpub(buffer, file.name);
          bookRef.current = parsed;
          setBook(parsed);
          refreshBookSession();
          extractCssFromBook(parsed);
          if (parsed.chapters.length > 0) {
            setActiveChapterId(parsed.chapters[0].id);
          }
          setStorageTarget('local');
          setLocalFilePath(nativePath ? nativePath.replace(/\.epub$/i, '.chronicle') : null);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
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
    [setIsDirty, showNotification, refreshBookSession]
  );

  const openLocalDocument = useCallback(
    async (
      targetPath?: string,
      force: boolean = false,
      initialChapterId?: string | null,
      isRestore: boolean = false
    ) => {
      if (isDirtyRef.current && !force) {
        const targetDisplayName = targetPath
          ? targetPath.split(/[\\/]/).pop() || 'Manuscript'
          : 'Selected Manuscript';
        setPendingUnsavedAction({
          actionType: 'open',
          title: 'Open Manuscript',
          description: `Opening "${targetDisplayName}" will replace your current workspace. Any unsaved edits in your current manuscript will be permanently lost.`,
          targetName: targetDisplayName,
          onProceed: () => openLocalDocument(targetPath, true, initialChapterId, isRestore),
        });
        return;
      }

      let filePath = targetPath;
      if (!filePath) {
        if (isTauri()) {
          const picked = await pickFileToOpen();
          if (!picked) return;
          filePath = picked;
        } else {
          return;
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('epub-file-opening'));
      }

      try {
        setIsLoading(true);
        const uint8 = await readLocalBinaryFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop() || 'manuscript';
        const lower = fileName.toLowerCase();

        if (lower.endsWith('.chronicle')) {
          const projectBook = await parseChronicleProject(uint8.buffer as ArrayBuffer, fileName);
          bookRef.current = projectBook;
          setBook(projectBook);
          refreshBookSession();
          extractCssFromBook(projectBook);
          const targetChapterId = (initialChapterId && projectBook.chapters.some(c => c.id === initialChapterId))
            ? initialChapterId
            : (projectBook.chapters[0]?.id || null);
          if (targetChapterId) {
            setActiveChapterId(targetChapterId);
          }
          setStorageTarget('local');
          setLocalFilePath(filePath);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirtyState(false);
          if (isTauri()) {
            saveDesktopSession(filePath, targetChapterId);
          }
          if (isRestore) {
            setViewModeState('editor');
            const ch = projectBook.chapters.find(c => c.id === targetChapterId);
            const chTitle = ch?.title ? ` at "${ch.title}"` : '';
            showNotification('info', `Resumed "${projectBook.metadata.title}"${chTitle}`);
          } else {
            showNotification('success', `Opened Chronicle "${projectBook.metadata.title}" successfully!`);
          }
        } else if (
          lower.endsWith('.md') ||
          lower.endsWith('.markdown') ||
          lower.endsWith('.mdown') ||
          lower.endsWith('.mkd')
        ) {
          const text = new TextDecoder().decode(uint8);
          const mdBook = await parseMarkdownToBook(text, fileName);
          bookRef.current = mdBook;
          setBook(mdBook);
          refreshBookSession();
          extractCssFromBook(mdBook);
          const targetChapterId = (initialChapterId && mdBook.chapters.some(c => c.id === initialChapterId))
            ? initialChapterId
            : (mdBook.chapters[0]?.id || null);
          if (targetChapterId) {
            setActiveChapterId(targetChapterId);
          }
          setStorageTarget('local');
          const chroniclePath = filePath.replace(/\.(md|markdown|mdown|mkd)$/i, '.chronicle');
          setLocalFilePath(chroniclePath);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirtyState(true);
          setViewModeState('editor');
          if (isTauri()) {
            saveDesktopSession(filePath, targetChapterId);
          }
          if (isRestore) {
            const ch = mdBook.chapters.find(c => c.id === targetChapterId);
            const chTitle = ch?.title ? ` at "${ch.title}"` : '';
            showNotification('info', `Resumed "${mdBook.metadata.title}"${chTitle}`);
          } else {
            showNotification(
              'success',
              `Imported Markdown "${mdBook.metadata.title}" (${mdBook.chapters.length} chapter${
                mdBook.chapters.length === 1 ? '' : 's'
              })! Ready to edit and save as .chronicle`
            );
          }
        } else {
          const parsed = await parseEpub(uint8.buffer as ArrayBuffer, fileName);
          bookRef.current = parsed;
          setBook(parsed);
          refreshBookSession();
          extractCssFromBook(parsed);
          const targetChapterId = (initialChapterId && parsed.chapters.some(c => c.id === initialChapterId))
            ? initialChapterId
            : (parsed.chapters[0]?.id || null);
          if (targetChapterId) {
            setActiveChapterId(targetChapterId);
          }
          setStorageTarget('local');
          const chroniclePath = filePath.replace(/\.epub$/i, '.chronicle');
          setLocalFilePath(chroniclePath);
          setCloudFileName(null);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirtyState(false);
          if (isTauri()) {
            saveDesktopSession(filePath, targetChapterId);
          }
          if (isRestore) {
            setViewModeState('editor');
            const ch = parsed.chapters.find(c => c.id === targetChapterId);
            const chTitle = ch?.title ? ` at "${ch.title}"` : '';
            showNotification('info', `Resumed "${parsed.metadata.title}"${chTitle}`);
          } else {
            showNotification('success', `Imported EPUB "${parsed.metadata.title}" successfully!`);
          }
        }
      } catch (err: any) {
        console.error(err);
        if (isRestore) {
          clearDesktopSession();
          if (showWelcomeOnStartupRef.current) {
            setIsWelcomeModalOpen(true);
          }
        }
        showNotification('error', `Failed to open file: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [showNotification, refreshBookSession, extractCssFromBook]
  );

  // Auto-restore previous desktop session on app launch (Tauri desktop only)
  const hasAttemptedDesktopRestoreRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isTauri()) return;
    if (hasAttemptedDesktopRestoreRef.current) return;
    hasAttemptedDesktopRestoreRef.current = true;

    let isMounted = true;

    async function restorePreviousSession() {
      try {
        const session = getDesktopSession();
        if (!session || !session.filePath) return;

        const fileExists = await checkLocalFileExists(session.filePath);
        if (!isMounted) return;

        if (!fileExists) {
          console.info('[Chronicle Desktop] Previous session file no longer exists on disk:', session.filePath);
          clearDesktopSession();
          return;
        }

        // Restore previous document & chapter
        await openLocalDocument(session.filePath, true, session.activeChapterId, true);
      } catch (err) {
        console.warn('[Chronicle Desktop] Could not restore previous session:', err);
        clearDesktopSession();
      }
    }

    restorePreviousSession();

    return () => {
      isMounted = false;
    };
  }, [openLocalDocument]);

  const loadEpubFile = loadAnyFile;

  const activeChapter = book?.chapters.find(c => c.id === activeChapterId) || book?.chapters[0] || null;

  const updateChapterContent = useCallback(
    (chapterId: string, newContent: string) => {
      const currentBook = bookRef.current;
      if (!currentBook) return;

      const targetChapter = currentBook.chapters.find(c => c.id === chapterId);
      if (!targetChapter) return;

      const currentComments = currentBook.writerData?.comments || [];
      const currentChapterComments = currentComments.filter(c => c.chapterId === chapterId);

      let processedContent = newContent;
      let updatedComments = currentComments;
      let commentsChanged = false;

      if (currentChapterComments.length > 0 || newContent.includes('data-comment-id')) {
        const {
          cleanedHtml,
          survivingCommentIds,
          removedCommentIds,
          resurrectedComments,
          updatedSnippets,
        } = reconcileChapterComments(newContent, currentChapterComments);

        processedContent = cleanedHtml;

        if (
          removedCommentIds.size > 0 ||
          resurrectedComments.length > 0 ||
          Object.keys(updatedSnippets).length > 0
        ) {
          commentsChanged = true;

          // 1. Keep surviving comments and update snippets
          let nextComments = currentComments
            .filter(c => c.chapterId !== chapterId || survivingCommentIds.has(c.id))
            .map(c => {
              if (c.chapterId === chapterId && updatedSnippets[c.id]) {
                const updated = { ...c, selectedText: updatedSnippets[c.id] };
                commentHistoryCacheRef.current.set(c.id, updated);
                return updated;
              }
              return c;
            });

          // 2. Resurrect any restored comments (e.g. from Ctrl+Z / Redo)
          if (resurrectedComments.length > 0) {
            const restoredList: AuthorComment[] = [];
            resurrectedComments.forEach(res => {
              const cached = commentHistoryCacheRef.current.get(res.id);
              if (cached) {
                const restored: AuthorComment = {
                  ...cached,
                  chapterId,
                  selectedText: res.selectedText || cached.selectedText,
                  color: res.color || cached.color,
                };
                commentHistoryCacheRef.current.set(res.id, restored);
                restoredList.push(restored);
              } else {
                const fallback: AuthorComment = {
                  id: res.id,
                  chapterId,
                  selectedText: res.selectedText || '',
                  comment: '',
                  color: res.color || DEFAULT_HIGHLIGHT_COLOR,
                  createdAt: new Date().toISOString(),
                };
                commentHistoryCacheRef.current.set(res.id, fallback);
                restoredList.push(fallback);
              }
            });

            nextComments = [...nextComments, ...restoredList];
          }

          updatedComments = nextComments;

          if (activeCommentId && removedCommentIds.has(activeCommentId)) {
            setActiveCommentId(null);
          }
        }
      }

      // Strict equality check: if content is identical and comments haven't changed, do not mark dirty or trigger re-render
      if (targetChapter.content === processedContent && !commentsChanged) {
        return;
      }

      const updatedOriginalXhtml = wrapInXhtml(
        restoreAssetUrls(processedContent, targetChapter.fullPath, currentBook.assets),
        targetChapter.title
      );

      const updatedChapters = currentBook.chapters.map(c =>
        c.id === chapterId
          ? {
            ...c,
            content: processedContent,
            originalXhtml: updatedOriginalXhtml,
            wordCount: calculateWordCount(processedContent),
          }
          : c
      );

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
    [activeCommentId, setIsDirty]
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

      const currentComments = book.writerData?.comments || [];
      const filteredComments = currentComments.filter(c => c.chapterId !== chapterId);

      setBook(prev =>
        prev
          ? {
            ...prev,
            chapters: newChapters,
            spine: newSpine,
            manifest: newManifest,
            toc: newToc,
            writerData: {
              ...prev.writerData,
              comments: filteredComments,
            },
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

        if (lower.endsWith('.chronicle')) {
          const projectBook = await parseChronicleProject(buffer, filename);
          bookRef.current = projectBook;
          setBook(projectBook);
          refreshBookSession();
          extractCssFromBook(projectBook);
          if (projectBook.chapters.length > 0) {
            setActiveChapterId(projectBook.chapters[0].id);
          }
          setStorageTarget('cloud');
          setLocalFilePath(null);
          if (isTauri()) {
            clearDesktopSession();
          }
          setCloudFileName(storedPath);
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirtyState(false);
          showNotification('success', `Opened Chronicle "${projectBook.metadata.title}" from WebDAV!`);
        } else if (isMarkdownFile(filename)) {
          const text = await blob.text();
          const mdBook = await parseMarkdownToBook(text, filename);
          bookRef.current = mdBook;
          setBook(mdBook);
          refreshBookSession();
          extractCssFromBook(mdBook);
          if (mdBook.chapters.length > 0) {
            setActiveChapterId(mdBook.chapters[0].id);
          }
          setStorageTarget('cloud');
          setLocalFilePath(null);
          setCloudFileName(storedPath.replace(/\.(md|markdown|mdown|mkd)$/i, '.chronicle'));
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
          setIsDirtyState(true);
          setViewModeState('editor');
          showNotification(
            'success',
            `Imported Markdown "${mdBook.metadata.title}" (${mdBook.chapters.length} chapter${mdBook.chapters.length === 1 ? '' : 's'
            }) from WebDAV!`
          );
        } else {
          const parsed = await parseEpub(buffer, filename);
          bookRef.current = parsed;
          setBook(parsed);
          refreshBookSession();
          extractCssFromBook(parsed);
          if (parsed.chapters.length > 0) {
            setActiveChapterId(parsed.chapters[0].id);
          }
          setStorageTarget('cloud');
          setLocalFilePath(null);
          setCloudFileName(storedPath.replace(/\.epub$/i, '.chronicle'));
          setCastPresenceData(null);
          setIsPresenceCacheValid(false);
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
    [webdavConfig, showNotification, refreshBookSession]
  );

  const saveProject = useCallback(
    async (
      overrideTarget?: StorageTarget,
      customFilename?: string,
      targetSubPath?: string,
      forceSaveAs: boolean = false,
      isAutoSave?: boolean
    ) => {
      isSavingRef.current = true;
      let currentBook = bookRef.current || book;
      if (!currentBook) {
        isSavingRef.current = false;
        return;
      }

      // 1. Determine target: override, current state, or default to local in desktop environment
      let target = overrideTarget || storageTarget;
      if (!target && isTauri()) {
        target = 'local';
      }

      if (!target) {
        if (!isAutoSave) {
          setIsSaveDestinationOpen(true);
        }
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
          if (isTauri()) {
            let destinationPath = localFilePath;

            // If forced Save As, or no path known yet, prompt user with native Save File Dialog
            if (forceSaveAs || !destinationPath) {
              let defaultName = customFilename || (destinationPath ? destinationPath.split(/[\\/]/).pop() : `${cleanTitle}.chronicle`);
              if (!defaultName) defaultName = `${cleanTitle}.chronicle`;
              if (!defaultName.endsWith('.chronicle')) defaultName += '.chronicle';

              const pickedPath = await pickFileToSave(defaultName);
              if (!pickedPath) {
                // User cancelled native save dialog
                return;
              }
              destinationPath = pickedPath;
              if (!destinationPath.endsWith('.chronicle')) {
                destinationPath += '.chronicle';
              }
            }

            // Directly overwrite local file on disk
            await writeLocalBinaryFile(destinationPath, blob);

            setStorageTarget('local');
            setLocalFilePath(destinationPath);
            saveDesktopSession(destinationPath, activeChapterId);
            const savedFileName = destinationPath.split(/[\\/]/).pop() || `${cleanTitle}.chronicle`;

            if (bookRef.current === saveSnapshot) {
              setIsDirtyState(false);
            }
            showNotification('success', `Saved project "${savedFileName}" locally!`);
          } else {
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
            if (isAutoSave) {
              setLastAutoSavedAt(new Date());
            } else {
              showNotification('success', `Saved project "${downloadName}" locally!`);
            }
          }
        } else if (target === 'cloud') {
          if (!webdavConfig) {
            if (!isAutoSave) {
              setIsWebDavConfigOpen(true);
              showNotification('info', 'Please configure your WebDAV server to save to cloud storage.');
            }
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
          if (isAutoSave) {
            setLastAutoSavedAt(new Date());
          } else {
            showNotification('success', `Saved and updated "${uploadName}" on WebDAV cloud!`);
          }
        }

        if (!isAutoSave) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            /* Confetti optional */
          }
        }
      } catch (err: any) {
        console.error(err);
        if (!isAutoSave) {
          showNotification('error', `Failed to save project: ${err?.message || 'Error'}`);
        }
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
    [book, activeChapterId, storageTarget, localFilePath, cloudFileName, webdavConfig, showNotification]
  );

  const saveAs = useCallback(
    async (target: StorageTarget, filename?: string, targetSubPath?: string) => {
      if (target === 'local' && isTauri()) {
        await saveProject('local', filename, undefined, true);
      } else {
        await saveProject(target, filename, targetSubPath);
      }
    },
    [saveProject]
  );

  // Auto-save timer effect: persists manuscript changes in background exclusively on desktop with an existing file
  useEffect(() => {
    // Web environment does not perform background filesystem auto-save to prevent unwanted download prompts
    if (!isTauri() || !autoSaveEnabled || !book || autoSaveInterval <= 0) {
      return;
    }

    const timer = setInterval(() => {
      // Only auto-save if project already has an established file path on disk to avoid interrupting typing with a save dialog
      if (isDirtyRef.current && !isSavingRef.current && bookRef.current && localFilePath) {
        saveProject(undefined, undefined, undefined, false, true);
      }
    }, autoSaveInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSaveEnabled, autoSaveInterval, book, localFilePath, saveProject]);

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
      commentHistoryCacheRef.current.set(newComment.id, newComment);

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
      const updatedComments = currentComments.map(c => {
        if (c.id === commentId) {
          const updated = { ...c, ...updates, updatedAt: new Date().toISOString() };
          commentHistoryCacheRef.current.set(commentId, updated);
          return updated;
        }
        return c;
      });

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
      if (target) {
        commentHistoryCacheRef.current.set(commentId, target);
      }
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

  // Snapshots (Time Machine) State & Actions
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);

  const snapshots = useMemo(() => {
    return book?.writerData?.snapshots || [];
  }, [book]);

  const createSnapshot = useCallback(
    (name?: string, description?: string): StorySnapshot => {
      let currentBook = bookRef.current || book;
      if (!currentBook) {
        throw new Error('Cannot create snapshot: No manuscript loaded');
      }

      // Synchronously flush any active WYSIWYG editor DOM content into book before creating snapshot
      if (typeof document !== 'undefined') {
        const wysiwygEl = document.querySelector('.wysiwyg-content');
        if (wysiwygEl) {
          const domContent = (wysiwygEl as HTMLElement).innerHTML;
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

      const totalWordCount = currentBook.chapters.reduce((acc, c) => acc + (c.wordCount || 0), 0);
      const createdAt = new Date().toISOString();
      const now = new Date();
      const formattedDate = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const formattedTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const defaultName = name?.trim() || `Snapshot — ${formattedDate}, ${formattedTime}`;

      const snapshotData: StorySnapshotData = {
        metadata: JSON.parse(JSON.stringify(currentBook.metadata)),
        toc: JSON.parse(JSON.stringify(currentBook.toc)),
        chapters: JSON.parse(JSON.stringify(currentBook.chapters)),
        characters: JSON.parse(JSON.stringify(currentBook.writerData?.characters || [])),
        locations: JSON.parse(JSON.stringify(currentBook.writerData?.locations || [])),
        timelines: JSON.parse(JSON.stringify(currentBook.writerData?.timelines || [])),
        comments: JSON.parse(JSON.stringify(currentBook.writerData?.comments || [])),
        worldbuilding: JSON.parse(JSON.stringify(currentBook.writerData?.worldbuilding || [])),
        synopsis: currentBook.writerData?.synopsis || '',
        customNotes: currentBook.writerData?.customNotes || '',
      };

      const newSnapshot: StorySnapshot = {
        id: `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: defaultName,
        description: description?.trim() || undefined,
        createdAt,
        totalWordCount,
        chapterCount: currentBook.chapters.length,
        data: snapshotData,
      };

      setBook(prev => {
        if (!prev) return null;
        const currentSnapshots = prev.writerData?.snapshots || [];
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            snapshots: [newSnapshot, ...currentSnapshots],
          },
        };
      });

      setIsDirty(true);
      showNotification('success', `Captured snapshot: "${defaultName}"`);
      return newSnapshot;
    },
    [book, activeChapterId, setIsDirty, showNotification]
  );

  const updateSnapshot = useCallback(
    (id: string, updates: { name?: string; description?: string }) => {
      setBook(prev => {
        if (!prev) return null;
        const currentSnapshots = prev.writerData?.snapshots || [];
        const updated = currentSnapshots.map(s => (s.id === id ? { ...s, ...updates } : s));
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            snapshots: updated,
          },
        };
      });
      setIsDirty(true);
      showNotification('success', 'Snapshot details updated');
    },
    [setIsDirty, showNotification]
  );

  const deleteSnapshot = useCallback(
    (id: string) => {
      setBook(prev => {
        if (!prev) return null;
        const currentSnapshots = prev.writerData?.snapshots || [];
        const filtered = currentSnapshots.filter(s => s.id !== id);
        return {
          ...prev,
          writerData: {
            ...prev.writerData,
            snapshots: filtered,
          },
        };
      });
      setIsDirty(true);
      showNotification('info', 'Snapshot deleted');
    },
    [setIsDirty, showNotification]
  );

  const restoreSnapshot = useCallback(
    (id: string, options?: SnapshotRestoreOptions) => {
      const currentBook = bookRef.current || book;
      if (!currentBook) return;

      const target = (currentBook.writerData?.snapshots || []).find(s => s.id === id);
      if (!target) {
        showNotification('error', 'Snapshot not found');
        return;
      }

      // Check if full restore (no options provided or all booleans undefined)
      const isFullRestore =
        !options ||
        (options.chapters === undefined &&
          options.characters === undefined &&
          options.locations === undefined &&
          options.timelines === undefined &&
          options.worldbuilding === undefined &&
          options.comments === undefined &&
          options.metadata === undefined &&
          options.synopsis === undefined);

      const restoreChapters = isFullRestore || !!options?.chapters;
      const restoreCharacters = isFullRestore || !!options?.characters;
      const restoreLocations = isFullRestore || !!options?.locations;
      const restoreTimelines = isFullRestore || !!options?.timelines;
      const restoreWorldbuilding = isFullRestore || !!options?.worldbuilding;
      const restoreComments = isFullRestore || !!options?.comments;
      const restoreMetadata = isFullRestore || !!options?.metadata;
      const restoreSynopsis = isFullRestore || !!options?.synopsis;

      const restoredItemLabels: string[] = [];

      // 1. Chapters & TOC & Spine
      let nextChapters = currentBook.chapters;
      let nextToc = currentBook.toc;
      let nextSpine = currentBook.spine;

      if (restoreChapters) {
        if (options?.selectedChapterIds && options.selectedChapterIds.length > 0) {
          const snapshotChapters = target.data.chapters || [];
          const selectedChMap = new Map<string, EpubChapter>();
          snapshotChapters.forEach(c => {
            if (options.selectedChapterIds!.includes(c.id)) {
              selectedChMap.set(c.id, JSON.parse(JSON.stringify(c)));
            }
          });

          const updatedList = currentBook.chapters.map(existing => {
            if (selectedChMap.has(existing.id)) {
              const restored = selectedChMap.get(existing.id)!;
              selectedChMap.delete(existing.id);
              return restored;
            }
            return existing;
          });

          selectedChMap.forEach(newCh => {
            updatedList.push(newCh);
          });

          nextChapters = updatedList;
          nextSpine = nextChapters.map(c => ({ idref: c.id }));
          nextToc = nextChapters.map(c => {
            const existingToc = currentBook.toc.find(t => t.href === c.href || t.id === c.id);
            const snapshotToc = target.data.toc?.find(t => t.href === c.href || t.id === c.id);
            return (
              snapshotToc ||
              existingToc || {
                id: c.id,
                title: c.title,
                href: c.href,
                chapterId: c.id,
                level: 1,
              }
            );
          });
          restoredItemLabels.push(
            `${options.selectedChapterIds.length} Chapter${options.selectedChapterIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextChapters = JSON.parse(JSON.stringify(target.data.chapters || []));
          nextToc = JSON.parse(JSON.stringify(target.data.toc || []));
          nextSpine = nextChapters.map((c: EpubChapter) => ({ idref: c.id }));
          restoredItemLabels.push('Chapters');
        }
      }

      // 2. Metadata
      let nextMetadata = currentBook.metadata;
      if (restoreMetadata) {
        nextMetadata = JSON.parse(JSON.stringify(target.data.metadata));
        restoredItemLabels.push('Book Metadata');
      }

      // 3. Characters
      let nextCharacters = currentBook.writerData?.characters || [];
      if (restoreCharacters) {
        if (options?.selectedCharacterIds && options.selectedCharacterIds.length > 0) {
          const snapshotChars = target.data.characters || [];
          const selectedCharMap = new Map<string, CharacterProfile>();
          snapshotChars.forEach(c => {
            if (options.selectedCharacterIds!.includes(c.id)) {
              selectedCharMap.set(c.id, JSON.parse(JSON.stringify(c)));
            }
          });
          const merged = (currentBook.writerData?.characters || []).map(existing => {
            if (selectedCharMap.has(existing.id)) {
              const restored = selectedCharMap.get(existing.id)!;
              selectedCharMap.delete(existing.id);
              return restored;
            }
            return existing;
          });
          selectedCharMap.forEach(newChar => merged.push(newChar));
          nextCharacters = merged;
          restoredItemLabels.push(
            `${options.selectedCharacterIds.length} Character Sheet${options.selectedCharacterIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextCharacters = JSON.parse(JSON.stringify(target.data.characters || []));
          restoredItemLabels.push('Character Sheets');
        }
      }

      // 4. Locations
      let nextLocations = currentBook.writerData?.locations || [];
      if (restoreLocations) {
        if (options?.selectedLocationIds && options.selectedLocationIds.length > 0) {
          const snapshotLocs = target.data.locations || [];
          const selectedLocMap = new Map<string, LocationCodexEntry>();
          snapshotLocs.forEach(l => {
            if (options.selectedLocationIds!.includes(l.id)) {
              selectedLocMap.set(l.id, JSON.parse(JSON.stringify(l)));
            }
          });
          const merged = (currentBook.writerData?.locations || []).map(existing => {
            if (selectedLocMap.has(existing.id)) {
              const restored = selectedLocMap.get(existing.id)!;
              selectedLocMap.delete(existing.id);
              return restored;
            }
            return existing;
          });
          selectedLocMap.forEach(newLoc => merged.push(newLoc));
          nextLocations = merged;
          restoredItemLabels.push(
            `${options.selectedLocationIds.length} Location${options.selectedLocationIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextLocations = JSON.parse(JSON.stringify(target.data.locations || []));
          restoredItemLabels.push('Location Codex');
        }
      }

      // 5. Timelines
      let nextTimelines = currentBook.writerData?.timelines || [];
      if (restoreTimelines) {
        if (options?.selectedTimelineIds && options.selectedTimelineIds.length > 0) {
          const snapshotTimelines = target.data.timelines || [];
          const selectedTimeMap = new Map<string, StoryTimeline>();
          snapshotTimelines.forEach(t => {
            if (options.selectedTimelineIds!.includes(t.id)) {
              selectedTimeMap.set(t.id, JSON.parse(JSON.stringify(t)));
            }
          });
          const merged = (currentBook.writerData?.timelines || []).map(existing => {
            if (selectedTimeMap.has(existing.id)) {
              const restored = selectedTimeMap.get(existing.id)!;
              selectedTimeMap.delete(existing.id);
              return restored;
            }
            return existing;
          });
          selectedTimeMap.forEach(newT => merged.push(newT));
          nextTimelines = merged;
          restoredItemLabels.push(
            `${options.selectedTimelineIds.length} Timeline${options.selectedTimelineIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextTimelines = JSON.parse(JSON.stringify(target.data.timelines || []));
          restoredItemLabels.push('Timelines');
        }
      }

      // 6. Worldbuilding
      let nextWorldbuilding = currentBook.writerData?.worldbuilding || [];
      if (restoreWorldbuilding) {
        if (options?.selectedWorldbuildingIds && options.selectedWorldbuildingIds.length > 0) {
          const snapshotWb = target.data.worldbuilding || [];
          const selectedWbMap = new Map<string, any>();
          snapshotWb.forEach(w => {
            if (options.selectedWorldbuildingIds!.includes(w.id)) {
              selectedWbMap.set(w.id, JSON.parse(JSON.stringify(w)));
            }
          });
          const merged = (currentBook.writerData?.worldbuilding || []).map(existing => {
            if (selectedWbMap.has(existing.id)) {
              const restored = selectedWbMap.get(existing.id)!;
              selectedWbMap.delete(existing.id);
              return restored;
            }
            return existing;
          });
          selectedWbMap.forEach(newWb => merged.push(newWb));
          nextWorldbuilding = merged;
          restoredItemLabels.push(
            `${options.selectedWorldbuildingIds.length} Worldbuilding Note${options.selectedWorldbuildingIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextWorldbuilding = JSON.parse(JSON.stringify(target.data.worldbuilding || []));
          restoredItemLabels.push('Worldbuilding Notes');
        }
      }

      // 7. Comments
      let nextComments = currentBook.writerData?.comments || [];
      if (restoreComments) {
        if (options?.selectedCommentIds && options.selectedCommentIds.length > 0) {
          const snapshotComments = target.data.comments || [];
          const selectedCommMap = new Map<string, AuthorComment>();
          snapshotComments.forEach(c => {
            if (options.selectedCommentIds!.includes(c.id)) {
              selectedCommMap.set(c.id, JSON.parse(JSON.stringify(c)));
            }
          });
          const merged = (currentBook.writerData?.comments || []).map(existing => {
            if (selectedCommMap.has(existing.id)) {
              const restored = selectedCommMap.get(existing.id)!;
              selectedCommMap.delete(existing.id);
              return restored;
            }
            return existing;
          });
          selectedCommMap.forEach(newComm => merged.push(newComm));
          nextComments = merged;
          restoredItemLabels.push(
            `${options.selectedCommentIds.length} Comment${options.selectedCommentIds.length === 1 ? '' : 's'}`
          );
        } else {
          nextComments = JSON.parse(JSON.stringify(target.data.comments || []));
          restoredItemLabels.push('Author Comments');
        }
      }

      // 8. Synopsis & Notes
      let nextSynopsis = currentBook.writerData?.synopsis || '';
      let nextCustomNotes = currentBook.writerData?.customNotes || '';
      if (restoreSynopsis) {
        nextSynopsis = target.data.synopsis || '';
        nextCustomNotes = target.data.customNotes || '';
        restoredItemLabels.push('Synopsis & Notes');
      }

      const updatedBook: EpubBook = {
        ...currentBook,
        metadata: nextMetadata,
        toc: nextToc,
        chapters: nextChapters,
        spine: nextSpine,
        writerData: {
          ...currentBook.writerData,
          characters: nextCharacters,
          locations: nextLocations,
          timelines: nextTimelines,
          comments: nextComments,
          worldbuilding: nextWorldbuilding,
          synopsis: nextSynopsis,
          customNotes: nextCustomNotes,
        },
      };

      bookRef.current = updatedBook;
      setBook(updatedBook);

      if (restoreChapters && nextChapters.length > 0) {
        const stillValidActive = nextChapters.find((c: EpubChapter) => c.id === activeChapterId);
        setActiveChapterId(stillValidActive ? stillValidActive.id : nextChapters[0].id);
      }

      refreshBookSession();
      setCastPresenceData(null);
      setIsPresenceCacheValid(false);
      setIsDirty(true);

      const restoreMsg = isFullRestore
        ? `Restored manuscript to snapshot: "${target.name}"`
        : `Restored ${restoredItemLabels.join(', ')} from snapshot: "${target.name}"`;

      showNotification('success', restoreMsg);
    },
    [book, activeChapterId, showNotification, setIsDirty, refreshBookSession]
  );

  return (
    <EpubContext.Provider
      value={{
        book,
        bookSessionId,
        refreshBookSession,
        isLoading,
        isSaving,
        activeChapterId,
        setActiveChapterId,
        activeChapter,
        loadEpubFile,
        loadAnyFile,
        openLocalDocument,
        loadSampleBook,
        createNewBook,
        saveProject,
        saveAs,
        loadFromCloud,
        autoSaveEnabled,
        setAutoSaveEnabled,
        autoSaveInterval,
        setAutoSaveInterval,
        lastAutoSavedAt,
        primaryMode,
        setPrimaryMode,
        lastWriteView,
        lastKnowledgeBaseView,
        lastPublishView,
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
        localFilePath,
        setLocalFilePath,
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
        showWelcomeOnStartup,
        setShowWelcomeOnStartup,
        isExportModalOpen,
        setIsExportModalOpen,
        isCharacterSidebarOpen,
        setIsCharacterSidebarOpen,
        isLocationSidebarOpen,
        setIsLocationSidebarOpen,
        uiTheme,
        setUiTheme,
        minimalistMode,
        setMinimalistMode,
        toggleMinimalistMode,
        isZenMode,
        setZenMode,
        toggleZenMode,
        zenSettings,
        updateZenSettings,
        todayWordsCount,
        isSettingsOpen,
        setIsSettingsOpen,
        settingsInitialTab,
        openSettings,
        closeSettings,
        checkUpdatesOnStartup,
        setCheckUpdatesOnStartup,
        isUpdateAvailable,
        latestRelease,
        checkForUpdatesManually,
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
        dismissNotification,
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
        snapshots,
        isSnapshotsModalOpen,
        setIsSnapshotsModalOpen,
        createSnapshot,
        updateSnapshot,
        deleteSnapshot,
        restoreSnapshot,
        castPresenceData,
        isPresenceCacheValid,
        isPresenceAnalyzing,
        presenceProgress,
        runCastPresenceAnalysis,
        invalidatePresenceCache,
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
