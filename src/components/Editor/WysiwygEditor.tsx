import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEpub } from '../../context/EpubContext';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Link,
  RemoveFormatting,
  Scissors,
  FileText,
  Maximize2,
  SlidersHorizontal,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';
import { SplitChapterModal } from './SplitChapterModal';
import { TextColorPicker } from './TextColorPicker';
import { scopeCssForContainer } from '../../services/epub/cssPresets';
import { getStoredSettings, updateStoredSettings } from '../../services/epub/settingsStorage';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AuthorComment, ReaderFont } from '../../types/project';
import { ZenFloatingToolbar } from '../Zen/ZenFloatingToolbar';
import {
  wrapSelectionWithComment,
  unwrapCommentHighlight,
  updateCommentHighlightColor,
  pulseAndScrollToHighlight,
  getSelectionFloatingPosition,
} from '../../services/epub/commentHighlightService';
import { CommentFloatingPill } from '../Comments/CommentFloatingPill';
import { CommentModal } from '../Comments/CommentModal';
import { CommentsSidebar } from '../Comments/CommentsSidebar';
import { ImageControlsToolbar, ImageToolbarPosition } from './ImageControlsToolbar';

function cleanTransientEditorMarkup(html: string): string {
  if (!html) return html;
  return html
    .replace(/\s*\bzen-active-focus\b/g, '')
    .replace(/\s*\bselected-editor-image\b/g, '')
    .replace(/\s*data-selected="true"/g, '')
    .replace(/\s*data-selected='true'/g, '')
    .replace(/ class="(\s*)"/g, '')
    .replace(/ class=""/g, '');
}

function getMovableUnit(img: HTMLImageElement, editorContainer: HTMLElement | null): HTMLElement | null {
  if (!img || !editorContainer || !editorContainer.contains(img)) return null;

  let current: HTMLElement = img;
  while (current.parentElement && current.parentElement !== editorContainer) {
    const parent = current.parentElement;
    // Check if parent's text content is empty besides whitespace/images/br
    const clone = parent.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('img, br').forEach(el => el.remove());
    const remainingText = (clone.textContent || '').trim();

    if (remainingText === '' || parent.tagName === 'FIGURE') {
      current = parent;
    } else {
      break;
    }
  }
  return current;
}

function saveCaretPosition(el: HTMLElement | null): number | null {
  if (!el) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function restoreCaretPosition(el: HTMLElement | null, offset: number | null | undefined) {
  if (!el || offset === null || offset === undefined) return;
  const sel = window.getSelection();
  if (!sel) return;

  let current = 0;
  let targetNode: Node | null = null;
  let targetOffset = 0;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const len = textNode.textContent?.length || 0;
    if (current + len >= offset) {
      targetNode = textNode;
      targetOffset = offset - current;
      break;
    }
    current += len;
    textNode = walker.nextNode();
  }

  if (targetNode) {
    try {
      const range = document.createRange();
      range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // ignore
    }
  }
}

function getFontFamily(font: ReaderFont): string {
  switch (font) {
    case 'serif':
      return 'var(--font-reader-serif)';
    case 'sans':
      return 'var(--font-reader-sans)';
    case 'literata':
      return 'var(--font-reader-literata)';
    case 'mono':
      return 'var(--font-reader-mono)';
    case 'opendyslexic':
      return 'var(--font-reader-opendyslexic, "OpenDyslexic", "Comic Sans MS", sans-serif)';
    default:
      return 'var(--font-reader-serif)';
  }
}

export const WysiwygEditor: React.FC = () => {
  const {
    activeChapter,
    updateChapterContent,
    book,
    readerTheme,
    customCss,
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
    minimalistMode,
    isZenMode,
    setZenMode,
    zenSettings,
    bookSessionId,
    readerFont,
    setReaderFont,
  } = useEpub();
  const { t } = useTranslation();

  const initialSettings = getStoredSettings();
  const editorRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [showImageDialog, setShowImageDialog] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [editorLayout, setEditorLayoutState] = useState<'page' | 'widescreen'>(initialSettings.editorLayout);
  const [editorWidth, setEditorWidthState] = useState<number>(initialSettings.editorWidth);
  const [showWidthMenu, setShowWidthMenu] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [activeTextColor, setActiveTextColor] = useState<string>('auto');
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const historyRef = useRef<{
    entries: { html: string; caret: number | null }[];
    index: number;
    lastInputTime: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({
    entries: [],
    index: -1,
    lastInputTime: 0,
    timer: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Author Comments State
  const [commentPillPos, setCommentPillPos] = useState<{ x: number; y: number } | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);
  const [activeModalComment, setActiveModalComment] = useState<AuthorComment | null>(null);
  const [selectedTextForComment, setSelectedTextForComment] = useState<string>('');
  const selectedRangeRef = useRef<Range | null>(null);

  const handlePreserveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Selected Image Controls State
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageToolbarPos, setImageToolbarPos] = useState<ImageToolbarPosition | null>(null);
  const [canMoveImageUp, setCanMoveImageUp] = useState<boolean>(false);
  const [canMoveImageDown, setCanMoveImageDown] = useState<boolean>(false);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right' | 'full'>('center');

  const widthTriggerRef = useRef<HTMLButtonElement>(null);
  const [widthPopoverPos, setWidthPopoverPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateWidthPopoverPos = useCallback(() => {
    if (widthTriggerRef.current) {
      const rect = widthTriggerRef.current.getBoundingClientRect();
      const popoverWidth = 250;
      const right = Math.max(10, Math.min(window.innerWidth - rect.right, window.innerWidth - popoverWidth - 10));
      setWidthPopoverPos({
        top: rect.bottom + 8,
        right,
      });
    }
  }, []);

  useEffect(() => {
    if (showWidthMenu) {
      updateWidthPopoverPos();
      window.addEventListener('resize', updateWidthPopoverPos);
      window.addEventListener('scroll', updateWidthPopoverPos, true);
      return () => {
        window.removeEventListener('resize', updateWidthPopoverPos);
        window.removeEventListener('scroll', updateWidthPopoverPos, true);
      };
    }
  }, [showWidthMenu, updateWidthPopoverPos]);

  useEscapeKey(() => setShowImageDialog(false), showImageDialog);
  useEscapeKey(() => setShowWidthMenu(false), showWidthMenu);
  useEscapeKey(() => setShowColorPicker(false), showColorPicker);

  const deselectImage = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.querySelectorAll('.selected-editor-image').forEach(el => {
        el.classList.remove('selected-editor-image');
        el.removeAttribute('data-selected');
      });
    }
    setSelectedImage(null);
    setImageToolbarPos(null);
  }, []);

  useEscapeKey(() => {
    if (selectedImage) {
      deselectImage();
    }
  }, !!selectedImage);

  const setEditorLayout = (layout: 'page' | 'widescreen') => {
    setEditorLayoutState(layout);
    updateStoredSettings({ editorLayout: layout });
  };

  const setEditorWidth = (width: number) => {
    setEditorWidthState(width);
    updateStoredSettings({ editorWidth: width });
  };

  const lastSelfUpdatedHtmlRef = useRef<string>('');

  // Sync content into editor and scroll to top when active chapter or book session changes
  useEffect(() => {
    deselectImage();
    if (editorRef.current && activeChapter) {
      const cleanContent = cleanTransientEditorMarkup(activeChapter.content);
      if (editorRef.current.innerHTML !== cleanContent) {
        editorRef.current.innerHTML = cleanContent;
      }
      if (historyRef.current.timer) {
        clearTimeout(historyRef.current.timer);
      }
      historyRef.current = {
        entries: [{ html: cleanContent, caret: null }],
        index: 0,
        lastInputTime: 0,
        timer: null,
      };
      setCanUndo(false);
      setCanRedo(false);
    }
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when chapter ID or book session changes, not on keystroke updates
  }, [activeChapter?.id, bookSessionId, deselectImage]);

  // Sync content from activeChapter when content changes externally (e.g. from Snapshot Diff, Typography Modal, Restore Snapshot)
  useEffect(() => {
    if (!editorRef.current || !activeChapter) return;
    const cleanContent = cleanTransientEditorMarkup(activeChapter.content);

    // If this content update was triggered by the user's own typing in handleInput, skip re-injecting
    if (cleanContent === lastSelfUpdatedHtmlRef.current) {
      return;
    }

    // External change detected! Update editor innerHTML to match activeChapter.content
    if (editorRef.current.innerHTML !== cleanContent) {
      deselectImage();
      editorRef.current.innerHTML = cleanContent;
      lastSelfUpdatedHtmlRef.current = cleanContent;
    }
  }, [activeChapter?.content, deselectImage]);

  // 1. Zen Mode - Typewriter Scrolling (locks cursor vertically centered)
  const performTypewriterScroll = useCallback(() => {
    if (!isZenMode || !zenSettings.typewriterScrolling || !workspaceRef.current) {
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    if (rect.height === 0 || rect.top === 0) {
      const parent =
        range.startContainer instanceof HTMLElement
          ? range.startContainer
          : range.startContainer.parentElement;
      if (parent) {
        rect = parent.getBoundingClientRect();
      }
    }
    if (!rect || rect.height === 0) return;

    const container = workspaceRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetY = containerRect.top + containerRect.height / 2;
    const cursorY = rect.top + rect.height / 2;
    const delta = cursorY - targetY;

    if (Math.abs(delta) > 4) {
      container.scrollTop += delta;
    }
  }, [isZenMode, zenSettings.typewriterScrolling]);

  // 2. Zen Mode - Paragraph / Line Focus Dimming (spotlight effect)
  const updateParagraphFocusDimming = useCallback(() => {
    if (!editorRef.current) return;
    if (!isZenMode || !zenSettings.focusDimming) {
      const allActive = editorRef.current.querySelectorAll('.zen-active-focus');
      allActive.forEach(el => el.classList.remove('zen-active-focus'));
      return;
    }
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    let node: Node | null = sel.anchorNode;
    if (node === editorRef.current) {
      const child =
        editorRef.current.childNodes[sel.anchorOffset] ||
        editorRef.current.childNodes[Math.max(0, sel.anchorOffset - 1)];
      node = child || null;
    }
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    while (node && node !== editorRef.current && node.parentElement !== editorRef.current) {
      node = node.parentElement;
    }

    const activeNode =
      node && node.parentElement === editorRef.current && node instanceof HTMLElement
        ? node
        : null;

    // Remove .zen-active-focus from ALL elements that are not the current active paragraph
    const allActive = editorRef.current.querySelectorAll('.zen-active-focus');
    allActive.forEach(el => {
      if (el !== activeNode) {
        el.classList.remove('zen-active-focus');
      }
    });

    if (activeNode && !activeNode.classList.contains('zen-active-focus')) {
      activeNode.classList.add('zen-active-focus');
    }
  }, [isZenMode, zenSettings.focusDimming]);

  useEffect(() => {
    updateParagraphFocusDimming();
    if (isZenMode && zenSettings.typewriterScrolling) {
      requestAnimationFrame(performTypewriterScroll);
    }
  }, [isZenMode, zenSettings.focusDimming, zenSettings.typewriterScrolling, updateParagraphFocusDimming, performTypewriterScroll]);

  const recordImmediateSnapshot = useCallback(() => {
    if (!editorRef.current) return;
    const h = historyRef.current;
    if (h.timer) {
      clearTimeout(h.timer);
      h.timer = null;
    }

    const html = cleanTransientEditorMarkup(editorRef.current.innerHTML);
    if (h.entries.length === 0) {
      h.entries = [{ html, caret: saveCaretPosition(editorRef.current) }];
      h.index = 0;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    if (h.entries[h.index] && h.entries[h.index].html === html) {
      return;
    }

    if (h.index < h.entries.length - 1) {
      h.entries = h.entries.slice(0, h.index + 1);
    }

    h.entries.push({ html, caret: saveCaretPosition(editorRef.current) });
    if (h.entries.length > 80) {
      h.entries.shift();
    }
    h.index = h.entries.length - 1;
    h.lastInputTime = Date.now();
    setCanUndo(h.index > 0);
    setCanRedo(false);
  }, []);

  const recordTypingSnapshot = useCallback((html: string) => {
    const h = historyRef.current;
    if (h.entries.length === 0) {
      h.entries = [{ html, caret: saveCaretPosition(editorRef.current) }];
      h.index = 0;
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const currentEntry = h.entries[h.index];
    if (currentEntry && currentEntry.html === html) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - h.lastInputTime;
    h.lastInputTime = now;

    if (h.index < h.entries.length - 1) {
      h.entries = h.entries.slice(0, h.index + 1);
      setCanRedo(false);
    }

    if (timeSinceLast > 600) {
      h.entries.push({ html, caret: saveCaretPosition(editorRef.current) });
      if (h.entries.length > 80) {
        h.entries.shift();
      }
      h.index = h.entries.length - 1;
      setCanUndo(h.index > 0);
    } else {
      if (h.index === 0 && h.entries.length === 1) {
        h.entries.push({ html, caret: saveCaretPosition(editorRef.current) });
        h.index = 1;
      } else {
        h.entries[h.index] = { html, caret: saveCaretPosition(editorRef.current) };
      }
      setCanUndo(h.index > 0);

      if (h.timer) clearTimeout(h.timer);
      h.timer = setTimeout(() => {
        if (editorRef.current) {
          const freshHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
          if (h.entries[h.index] && h.entries[h.index].html !== freshHtml) {
            h.entries.push({ html: freshHtml, caret: saveCaretPosition(editorRef.current) });
            if (h.entries.length > 80) h.entries.shift();
            h.index = h.entries.length - 1;
            setCanUndo(h.index > 0);
          }
        }
      }, 700);
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current && activeChapter) {
      const rawHtml = editorRef.current.innerHTML;
      const cleanedHtml = cleanTransientEditorMarkup(rawHtml);
      if (cleanedHtml !== activeChapter.content) {
        lastSelfUpdatedHtmlRef.current = cleanedHtml;
        updateChapterContent(activeChapter.id, cleanedHtml);
      }
      recordTypingSnapshot(cleanedHtml);
    }
    requestAnimationFrame(() => {
      updateParagraphFocusDimming();
      performTypewriterScroll();
    });
  }, [activeChapter, updateChapterContent, updateParagraphFocusDimming, performTypewriterScroll, recordTypingSnapshot]);

  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current && activeChapter) {
      const cleanedHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
      updateChapterContent(activeChapter.id, cleanedHtml);
    }
    recordImmediateSnapshot();
    editorRef.current?.focus();
  }, [activeChapter, updateChapterContent, recordImmediateSnapshot]);

  const handleUndo = useCallback(() => {
    const h = historyRef.current;
    if (h.timer) {
      clearTimeout(h.timer);
      h.timer = null;
    }
    if (h.index <= 0 || !editorRef.current || !activeChapter) return;

    h.index -= 1;
    const entry = h.entries[h.index];
    if (entry) {
      editorRef.current.innerHTML = entry.html;
      updateChapterContent(activeChapter.id, entry.html);
      restoreCaretPosition(editorRef.current, entry.caret);
    }
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.entries.length - 1);
  }, [activeChapter, updateChapterContent]);

  const handleRedo = useCallback(() => {
    const h = historyRef.current;
    if (h.timer) {
      clearTimeout(h.timer);
      h.timer = null;
    }
    if (h.index >= h.entries.length - 1 || !editorRef.current || !activeChapter) return;

    h.index += 1;
    const entry = h.entries[h.index];
    if (entry) {
      editorRef.current.innerHTML = entry.html;
      updateChapterContent(activeChapter.id, entry.html);
      restoreCaretPosition(editorRef.current, entry.caret);
    }
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.entries.length - 1);
  }, [activeChapter, updateChapterContent]);

  // Inspect selection/caret to detect explicit text color
  const updateActiveTextColor = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !editorRef.current || !editorRef.current.contains(sel.anchorNode)) {
      return;
    }
    let el: HTMLElement | null =
      sel.anchorNode.nodeType === Node.ELEMENT_NODE
        ? (sel.anchorNode as HTMLElement)
        : sel.anchorNode.parentElement;

    while (el && el !== editorRef.current) {
      if (el.tagName.toLowerCase() === 'font' && el.getAttribute('color')) {
        setActiveTextColor(el.getAttribute('color') || 'auto');
        return;
      }
      if (el.style && el.style.color && el.style.color !== 'inherit') {
        setActiveTextColor(el.style.color);
        return;
      }
      el = el.parentElement;
    }
    setActiveTextColor('auto');
  }, []);

  const handleSelectColor = useCallback((colorHex: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (selectedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(selectedRangeRef.current);
      }
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // styleWithCSS may not be supported in some environments
    }
    document.execCommand('foreColor', false, colorHex);
    setActiveTextColor(colorHex);
    if (editorRef.current && activeChapter) {
      const cleanedHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
      updateChapterContent(activeChapter.id, cleanedHtml);
    }
    recordImmediateSnapshot();
  }, [activeChapter, updateChapterContent, recordImmediateSnapshot]);

  const handleSetColorAuto = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (selectedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(selectedRangeRef.current);
      }
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let container: Node | null = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
      }

      if (container && editorRef.current.contains(container)) {
        // Strip color from ancestors if selection is inside
        let current = container as HTMLElement | null;
        while (current && current !== editorRef.current) {
          if (current.tagName.toLowerCase() === 'font' && current.hasAttribute('color')) {
            current.removeAttribute('color');
          }
          if (current.style && current.style.color) {
            current.style.color = '';
            if (!current.getAttribute('style')?.trim()) {
              current.removeAttribute('style');
            }
          }
          current = current.parentElement;
        }

        // Strip color from descendants intersecting the range
        editorRef.current.querySelectorAll('[style*="color"], font[color]').forEach(el => {
          if (range.intersectsNode(el)) {
            if (el.tagName.toLowerCase() === 'font') {
              el.removeAttribute('color');
            }
            if (el instanceof HTMLElement && el.style.color) {
              el.style.color = '';
              if (!el.getAttribute('style')?.trim()) {
                el.removeAttribute('style');
              }
            }
          }
        });
      }
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, 'inherit');
    } catch {
      // ignore if command fails in detached context
    }

    setActiveTextColor('auto');
    if (editorRef.current && activeChapter) {
      const cleanedHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
      updateChapterContent(activeChapter.id, cleanedHtml);
    }
    recordImmediateSnapshot();
  }, [activeChapter, updateChapterContent, recordImmediateSnapshot]);

  // Inspect selection/caret to detect active block alignment
  const updateActiveAlignment = useCallback(() => {
    try {
      if (document.queryCommandState('justifyCenter')) {
        setCurrentAlign('center');
        return;
      }
      if (document.queryCommandState('justifyRight')) {
        setCurrentAlign('right');
        return;
      }
      if (document.queryCommandState('justifyFull')) {
        setCurrentAlign('justify');
        return;
      }
      if (document.queryCommandState('justifyLeft')) {
        setCurrentAlign('left');
        return;
      }
    } catch {
      // document.queryCommandState can throw in detached or non-rendered contexts
    }

    const sel = window.getSelection();
    if (sel && sel.anchorNode && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      let el: HTMLElement | null =
        sel.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode.parentElement;
      while (el && el !== editorRef.current) {
        const align = el.style?.textAlign;
        if (align === 'center' || align === 'right' || align === 'justify' || align === 'left') {
          setCurrentAlign(align as 'left' | 'center' | 'right' | 'justify');
          return;
        }
        el = el.parentElement;
      }
    }
    setCurrentAlign('left');
  }, []);

  const handleAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    const commandMap: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    execCommand(commandMap[alignment]);
    setCurrentAlign(alignment);
  }, [execCommand]);

  const isCommentsHidden = !showCommentHighlights || (isZenMode && zenSettings.hideComments);

  const updateToolbarPosForImage = useCallback((img: HTMLImageElement) => {
    if (!img || !img.isConnected || !editorRef.current || !editorRef.current.contains(img)) {
      setSelectedImage(null);
      setImageToolbarPos(null);
      return;
    }
    const rect = img.getBoundingClientRect();
    setImageToolbarPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
      width: rect.width,
    });

    const unit = getMovableUnit(img, editorRef.current);
    if (unit && unit.parentElement) {
      if (unit.parentElement === editorRef.current) {
        setCanMoveImageUp(!!unit.previousElementSibling);
        setCanMoveImageDown(!!unit.nextElementSibling);
      } else {
        setCanMoveImageUp(true);
        setCanMoveImageDown(true);
      }
    } else {
      setCanMoveImageUp(false);
      setCanMoveImageDown(false);
    }

    const sFloat = img.style.float;
    const sWidth = img.style.width;
    if (sWidth === '100%') {
      setImageAlign('full');
    } else if (sFloat === 'left') {
      setImageAlign('left');
    } else if (sFloat === 'right') {
      setImageAlign('right');
    } else {
      setImageAlign('center');
    }
  }, []);

  const selectImage = useCallback((img: HTMLImageElement) => {
    if (editorRef.current) {
      editorRef.current.querySelectorAll('.selected-editor-image').forEach(el => {
        el.classList.remove('selected-editor-image');
        el.removeAttribute('data-selected');
      });
    }
    img.classList.add('selected-editor-image');
    img.setAttribute('data-selected', 'true');
    setSelectedImage(img);
    updateToolbarPosForImage(img);
  }, [updateToolbarPosForImage]);

  const handleMoveImageUp = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;
    const unit = getMovableUnit(selectedImage, editorRef.current);
    if (!unit || !unit.parentElement) return;

    if (unit.parentElement !== editorRef.current) {
      let topAncestor: HTMLElement = unit;
      while (topAncestor.parentElement && topAncestor.parentElement !== editorRef.current) {
        topAncestor = topAncestor.parentElement;
      }
      editorRef.current.insertBefore(unit, topAncestor);
    } else {
      const prev = unit.previousElementSibling as HTMLElement | null;
      if (prev) {
        editorRef.current.insertBefore(unit, prev);
      }
    }

    handleInput();
    requestAnimationFrame(() => {
      selectedImage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      updateToolbarPosForImage(selectedImage);
    });
  }, [selectedImage, handleInput, updateToolbarPosForImage]);

  const handleMoveImageDown = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;
    const unit = getMovableUnit(selectedImage, editorRef.current);
    if (!unit || !unit.parentElement) return;

    if (unit.parentElement !== editorRef.current) {
      let topAncestor: HTMLElement = unit;
      while (topAncestor.parentElement && topAncestor.parentElement !== editorRef.current) {
        topAncestor = topAncestor.parentElement;
      }
      const nextAfterAncestor = topAncestor.nextElementSibling;
      editorRef.current.insertBefore(unit, nextAfterAncestor);
    } else {
      const next = unit.nextElementSibling as HTMLElement | null;
      if (next) {
        editorRef.current.insertBefore(unit, next.nextElementSibling);
      }
    }

    handleInput();
    requestAnimationFrame(() => {
      selectedImage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      updateToolbarPosForImage(selectedImage);
    });
  }, [selectedImage, handleInput, updateToolbarPosForImage]);

  const handleDeleteImage = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;
    const unit = getMovableUnit(selectedImage, editorRef.current);
    const targetNode = unit && unit !== editorRef.current ? unit : selectedImage;

    // Clean transient selection attributes before deleting so it's not stored in undo snapshot
    selectedImage.classList.remove('selected-editor-image');
    selectedImage.removeAttribute('data-selected');

    // Focus editor container before executing delete command
    editorRef.current.focus();

    try {
      const range = document.createRange();
      range.selectNode(targetNode);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const success = document.execCommand('delete', false);
      if (!success || targetNode.isConnected) {
        targetNode.remove();
      }
    } catch {
      targetNode.remove();
    }

    deselectImage();
    handleInput();
    // Keep editor focused so immediate Ctrl+Z keystrokes target the editor's undo stack
    editorRef.current?.focus();
  }, [selectedImage, deselectImage, handleInput]);

  const handleAlignImage = useCallback((alignment: 'left' | 'center' | 'right' | 'full') => {
    if (!selectedImage) return;
    if (alignment === 'left') {
      selectedImage.style.float = 'left';
      selectedImage.style.margin = '0.5rem 1.5rem 1rem 0';
      selectedImage.style.display = 'block';
      selectedImage.style.maxWidth = '50%';
      selectedImage.style.width = 'auto';
    } else if (alignment === 'right') {
      selectedImage.style.float = 'right';
      selectedImage.style.margin = '0.5rem 0 1rem 1.5rem';
      selectedImage.style.display = 'block';
      selectedImage.style.maxWidth = '50%';
      selectedImage.style.width = 'auto';
    } else if (alignment === 'center') {
      selectedImage.style.float = 'none';
      selectedImage.style.margin = '1.5rem auto';
      selectedImage.style.display = 'block';
      if (selectedImage.style.width === '100%') {
        selectedImage.style.width = 'auto';
      }
    } else if (alignment === 'full') {
      selectedImage.style.float = 'none';
      selectedImage.style.margin = '1.5rem auto';
      selectedImage.style.display = 'block';
      selectedImage.style.width = '100%';
      selectedImage.style.maxWidth = '100%';
    }
    setImageAlign(alignment);
    handleInput();
    requestAnimationFrame(() => {
      updateToolbarPosForImage(selectedImage);
    });
  }, [selectedImage, handleInput, updateToolbarPosForImage]);

  const handleResizeImage = useCallback((percentage: number) => {
    if (!selectedImage) return;
    selectedImage.style.width = `${percentage}%`;
    selectedImage.style.maxWidth = '100%';
    selectedImage.style.height = 'auto';
    if (percentage === 100) {
      setImageAlign('full');
    }
    handleInput();
    requestAnimationFrame(() => {
      updateToolbarPosForImage(selectedImage);
    });
  }, [selectedImage, handleInput, updateToolbarPosForImage]);

  // Keep image toolbar pinned on workspace scroll / resize
  useEffect(() => {
    const handleScroll = () => {
      if (selectedImage) {
        updateToolbarPosForImage(selectedImage);
      }
    };
    const ws = workspaceRef.current;
    if (ws) {
      ws.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('resize', handleScroll);
    return () => {
      if (ws) ws.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [selectedImage, updateToolbarPosForImage]);

  // Global Undo / Redo listener to ensure Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z work seamlessly across workspace
  useEffect(() => {
    const handleGlobalUndoRedo = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' || key === 'y') {
          const activeTag = document.activeElement?.tagName;
          if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
            return;
          }
          e.preventDefault();
          if (key === 'y' || e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalUndoRedo);
    return () => window.removeEventListener('keydown', handleGlobalUndoRedo);
  }, [handleUndo, handleRedo]);

  const handleSelectionChange = useCallback(() => {
    const activeSel = getSelectionFloatingPosition(editorRef.current);
    if (activeSel) {
      setSelectedText(activeSel.text);
      selectedRangeRef.current = activeSel.range;
      if (isZenMode && zenSettings.hideComments) {
        setCommentPillPos(null);
      } else {
        setCommentPillPos(activeSel.position);
      }
    } else {
      setSelectedText('');
      if (!isCommentModalOpen) {
        setCommentPillPos(null);
      }
    }
    updateActiveAlignment();
    updateActiveTextColor();
    updateParagraphFocusDimming();
    if (isZenMode && zenSettings.typewriterScrolling) {
      requestAnimationFrame(performTypewriterScroll);
    }
  }, [updateActiveAlignment, updateActiveTextColor, isCommentModalOpen, updateParagraphFocusDimming, isZenMode, zenSettings.typewriterScrolling, zenSettings.hideComments, performTypewriterScroll]);

  // Handle clicking inside editor: detects if clicked on image or existing comment highlight
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setShowWidthMenu(false);
    setShowColorPicker(false);
    const target = e.target as HTMLElement;

    if (target instanceof HTMLImageElement || target.tagName === 'IMG') {
      selectImage(target as HTMLImageElement);
      return;
    } else {
      deselectImage();
    }

    // When highlights are hidden, don't hijack editor text clicks
    if (!showCommentHighlights || (isZenMode && zenSettings.hideComments)) return;

    const mark = target.closest<HTMLElement>('.author-comment-highlight, mark[data-comment-id]');
    if (mark) {
      const commentId = mark.getAttribute('data-comment-id');
      if (commentId) {
        const found = comments.find(c => c.id === commentId);
        if (found) {
          setActiveModalComment(found);
          setActiveCommentId(found.id);
          setIsCommentModalOpen(true);
          setCommentPillPos(null);
        }
      }
    }
  }, [comments, setActiveCommentId, showCommentHighlights, isZenMode, zenSettings.hideComments, selectImage, deselectImage]);

  // Start adding a comment from selection
  const handleStartAddComment = useCallback(() => {
    const snippet = selectedRangeRef.current?.toString().trim() || selectedText.trim();
    if (snippet) {
      setSelectedTextForComment(snippet);
      setActiveModalComment(null);
      setIsCommentModalOpen(true);
      setCommentPillPos(null);
    }
  }, [selectedText]);

  // Save brand new comment & wrap highlighted selection
  const handleSaveNewComment = useCallback((selectedSnippet: string, noteText: string, color: string) => {
    if (!activeChapter) return;
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let newHtml: string | undefined = undefined;

    if (selectedRangeRef.current && editorRef.current) {
      wrapSelectionWithComment(selectedRangeRef.current, commentId, color);
      newHtml = editorRef.current.innerHTML;
      selectedRangeRef.current = null;
      window.getSelection()?.removeAllRanges();
    }

    if (!showCommentHighlights) {
      setShowCommentHighlights(true);
    }

    addComment(activeChapter.id, selectedSnippet, noteText, color, commentId, newHtml);
    setIsCommentModalOpen(false);
  }, [activeChapter, addComment, showCommentHighlights, setShowCommentHighlights]);

  // Update existing comment (note text or highlight color)
  const handleUpdateComment = useCallback((commentId: string, updates: { comment?: string; color?: string }) => {
    updateComment(commentId, updates);
    if (updates.color && editorRef.current && activeChapter) {
      updateCommentHighlightColor(editorRef.current, commentId, updates.color);
      updateChapterContent(activeChapter.id, cleanTransientEditorMarkup(editorRef.current.innerHTML));
    }
  }, [updateComment, activeChapter, updateChapterContent]);

  // Delete comment and remove highlight markup
  const handleDeleteComment = useCallback((commentId: string) => {
    if (editorRef.current && activeChapter) {
      unwrapCommentHighlight(editorRef.current, commentId);
      updateChapterContent(activeChapter.id, cleanTransientEditorMarkup(editorRef.current.innerHTML));
    }
    deleteComment(commentId);
    if (activeModalComment?.id === commentId) {
      setIsCommentModalOpen(false);
      setActiveModalComment(null);
    }
  }, [activeChapter, updateChapterContent, deleteComment, activeModalComment]);

  const handleJumpToHighlight = useCallback((commentId: string) => {
    setActiveCommentId(commentId);
    if (!showCommentHighlights) {
      setShowCommentHighlights(true);
    }
    pulseAndScrollToHighlight(editorRef.current, commentId);
  }, [setActiveCommentId, showCommentHighlights, setShowCommentHighlights]);

  useEffect(() => {
    const onDocSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
        handleSelectionChange();
      }
    };
    document.addEventListener('selectionchange', onDocSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onDocSelectionChange);
    };
  }, [handleSelectionChange]);

  // Keyboard shortcuts: Ctrl/Cmd + L (left), E (center), R (right), J (justify), and Image shortcuts
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (selectedImage) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteImage();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectImage();
        return;
      }
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handleMoveImageUp();
        return;
      }
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        handleMoveImageDown();
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (zenSettings.autoSwitchOnTyping && !isZenMode) {
        setZenMode(true);
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current || !editorRef.current.contains(sel.anchorNode)) {
        return;
      }

      // Check if inside a list item (li)
      let inList = false;
      let el: HTMLElement | null =
        sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode?.parentElement ?? null;

      while (el && el !== editorRef.current) {
        if (el.tagName === 'LI') {
          inList = true;
          break;
        }
        el = el.parentElement;
      }

      if (inList) {
        if (e.shiftKey) {
          execCommand('outdent');
        } else {
          execCommand('indent');
        }
        return;
      }

      // Check if multi-block selection
      if (!sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const isMultiBlock =
          commonAncestor === editorRef.current ||
          (commonAncestor.nodeType === Node.ELEMENT_NODE &&
            (commonAncestor as HTMLElement).querySelectorAll('p, div, li, h1, h2, h3, blockquote').length > 1);

        if (isMultiBlock) {
          if (e.shiftKey) {
            execCommand('outdent');
          } else {
            execCommand('indent');
          }
          return;
        }
      }

      // Check if inside a <pre> or <code> block
      let inCode = false;
      let codeEl: HTMLElement | null =
        sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode?.parentElement ?? null;

      while (codeEl && codeEl !== editorRef.current) {
        if (codeEl.tagName === 'PRE' || codeEl.tagName === 'CODE') {
          inCode = true;
          break;
        }
        codeEl = codeEl.parentElement;
      }

      if (e.shiftKey) {
        // Shift+Tab: outdent / unindent
        if (sel.isCollapsed && sel.anchorNode) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          const offset = range.startOffset;
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const textBefore = node.textContent.substring(0, offset);
            const match = textBefore.match(/(?:\u00a0| |\t){1,4}$/);
            if (match) {
              const deleteLen = match[0].length;
              range.setStart(node, offset - deleteLen);
              range.deleteContents();
              sel.removeAllRanges();
              sel.addRange(range);
              if (editorRef.current && activeChapter) {
                const cleanedHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
                lastSelfUpdatedHtmlRef.current = cleanedHtml;
                updateChapterContent(activeChapter.id, cleanedHtml);
                recordImmediateSnapshot();
              }
              requestAnimationFrame(() => {
                updateParagraphFocusDimming();
                performTypewriterScroll();
              });
              return;
            }
          }
        }
        execCommand('outdent');
        return;
      }

      // Tab: insert tab / indentation into the text
      const indentText = inCode ? '  ' : '\u00a0\u00a0\u00a0\u00a0';
      const inserted = document.execCommand('insertText', false, indentText);
      if (!inserted) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(indentText);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      if (editorRef.current && activeChapter) {
        const cleanedHtml = cleanTransientEditorMarkup(editorRef.current.innerHTML);
        lastSelfUpdatedHtmlRef.current = cleanedHtml;
        updateChapterContent(activeChapter.id, cleanedHtml);
        recordImmediateSnapshot();
      }

      requestAnimationFrame(() => {
        updateParagraphFocusDimming();
        performTypewriterScroll();
      });
      return;
    }

    // Auto-switch to Zen Mode on typing if enabled
    if (zenSettings.autoSwitchOnTyping && !isZenMode) {
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key !== 'Escape' &&
        e.key !== 'Tab' &&
        !e.key.startsWith('F') &&
        (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete')
      ) {
        setZenMode(true);
      }
    }

    // When Enter is pressed in Zen mode, immediately trigger focus dimming update and typewriter scroll
    if (e.key === 'Enter') {
      requestAnimationFrame(() => {
        updateParagraphFocusDimming();
        performTypewriterScroll();
      });
    }

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (key === 'l') {
        e.preventDefault();
        handleAlign('left');
      } else if (key === 'e') {
        e.preventDefault();
        handleAlign('center');
      } else if (key === 'r') {
        e.preventDefault();
        handleAlign('right');
      } else if (key === 'j') {
        e.preventDefault();
        handleAlign('justify');
      }
    }
  };

  const insertHeading = (level: string) => {
    if (level === 'p') {
      execCommand('formatBlock', '<p>');
    } else {
      execCommand('formatBlock', `<${level}>`);
    }
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleInsertImage = (url: string) => {
    if (url) {
      execCommand('insertImage', url);
      setShowImageDialog(false);
      setImageUrlInput('');
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const imgs = editorRef.current.querySelectorAll('img');
          if (imgs.length > 0) {
            const lastImg = imgs[imgs.length - 1];
            selectImage(lastImg);
            lastImg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && book) {
      const blobUrl = URL.createObjectURL(file);
      execCommand('insertImage', blobUrl);
      setShowImageDialog(false);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          const imgs = editorRef.current.querySelectorAll('img');
          if (imgs.length > 0) {
            const lastImg = imgs[imgs.length - 1];
            selectImage(lastImg);
            lastImg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    }
  };

  const handleQuickSplit = () => {
    setIsSplitModalOpen(true);
  };

  if (!activeChapter) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('editor.selectChapterToEdit')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Zen Mode Floating Formatting Toolbar */}
      {isZenMode && (
        <ZenFloatingToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onHeading={insertHeading}
          onExecCommand={execCommand}
          onAlign={handleAlign}
          currentAlign={currentAlign}
          activeTextColor={activeTextColor}
          onSelectColor={handleSelectColor}
          onSetAutoColor={handleSetColorAuto}
          readerTheme={readerTheme}
          readerFont={readerFont}
          onSetFont={setReaderFont}
          onPreserveSelection={handlePreserveSelection}
        />
      )}

      {/* Editor Sub-toolbar */}
      <div className={`sub-toolbar ${minimalistMode ? 'minimalist-sub-toolbar' : ''}`}>
        <div className="toolbar-group toolbar-group-scrollable">
          {/* Undo / Redo */}
          <button
            type="button"
            className="tool-btn"
            disabled={!canUndo}
            onMouseDown={e => e.preventDefault()}
            onClick={handleUndo}
            title={canUndo ? "Undo (Ctrl+Z)" : "Undo"}
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={!canRedo}
            onMouseDown={e => e.preventDefault()}
            onClick={handleRedo}
            title={canRedo ? "Redo (Ctrl+Y / Ctrl+Shift+Z)" : "Redo"}
          >
            <Redo size={16} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => insertHeading('p')}
            title="Normal text size (Paragraph)"
          >
            <Pilcrow size={17} />
          </button>
          <button
            className="tool-btn"
            onClick={() => insertHeading('h1')}
            title={t('editor.h1')}
          >
            <Heading1 size={17} />
          </button>
          <button
            className="tool-btn"
            onClick={() => insertHeading('h2')}
            title={t('editor.h2')}
          >
            <Heading2 size={17} />
          </button>
          <button
            className="tool-btn"
            onClick={() => insertHeading('h3')}
            title={t('editor.h3')}
          >
            <Heading3 size={17} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => execCommand('bold')}
            title={t('editor.bold')}
          >
            <Bold size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('italic')}
            title={t('editor.italic')}
          >
            <Italic size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('underline')}
            title={t('editor.underline')}
          >
            <Underline size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('strikeThrough')}
            title={t('editor.strikethrough')}
          >
            <Strikethrough size={16} />
          </button>

          {/* Text Color Picker */}
          <TextColorPicker
            isOpen={showColorPicker}
            onToggle={() => {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                selectedRangeRef.current = sel.getRangeAt(0).cloneRange();
              }
              setShowColorPicker(prev => !prev);
            }}
            onClose={() => setShowColorPicker(false)}
            activeTextColor={activeTextColor}
            readerTheme={readerTheme}
            onSelectColor={handleSelectColor}
            onSetAuto={handleSetColorAuto}
            onTriggerMouseDown={() => {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                selectedRangeRef.current = sel.getRangeAt(0).cloneRange();
              }
            }}
          />

          <div className="toolbar-separator" />

          {/* Text Alignment Controls */}
          <button
            className={`tool-btn ${currentAlign === 'left' ? 'active' : ''}`}
            onClick={() => handleAlign('left')}
            title={t('editor.alignLeft')}
          >
            <AlignLeft size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'center' ? 'active' : ''}`}
            onClick={() => handleAlign('center')}
            title={t('editor.alignCenter')}
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'right' ? 'active' : ''}`}
            onClick={() => handleAlign('right')}
            title={t('editor.alignRight')}
          >
            <AlignRight size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'justify' ? 'active' : ''}`}
            onClick={() => handleAlign('justify')}
            title={t('editor.alignJustify')}
          >
            <AlignJustify size={16} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title={t('editor.bulletList')}
          >
            <List size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('insertOrderedList')}
            title={t('editor.numberedList')}
          >
            <ListOrdered size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('formatBlock', '<blockquote>')}
            title={t('editor.blockquote')}
          >
            <Quote size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('insertHorizontalRule')}
            title={t('editor.divider')}
          >
            <Minus size={16} />
          </button>

          <div className="toolbar-separator" />

          {!minimalistMode && (
            <>
              <button
                className="tool-btn"
                onClick={() => setShowImageDialog(true)}
                title={t('editor.insertImage')}
              >
                <ImageIcon size={16} />
              </button>
              <button
                className="tool-btn"
                onClick={handleInsertLink}
                title={t('editor.insertLink')}
              >
                <Link size={16} />
              </button>
            </>
          )}
          <button
            className="tool-btn"
            onClick={() => execCommand('removeFormat')}
            title={t('editor.clearFormatting')}
          >
            <RemoveFormatting size={16} />
          </button>
        </div>

        {/* Right side tools: Layout, Width, Theme & Split (Hidden in Minimalist Mode) */}
        {!minimalistMode && (
          <div className="toolbar-group">
            {/* Layout Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
              <button
                className={`btn-icon btn-sm ${editorLayout === 'page' ? 'active' : ''}`}
                onClick={() => {
                  setEditorLayout('page');
                  if (editorWidth > 950) setEditorWidth(820);
                }}
                title={t('editor.pageLayout')}
                style={{ padding: '3px 7px', fontSize: '0.75rem', gap: '4px', width: 'auto' }}
              >
                <FileText size={13} />
                <span>{t('editor.page')}</span>
              </button>
              <button
                className={`btn-icon btn-sm ${editorLayout === 'widescreen' ? 'active' : ''}`}
                onClick={() => {
                  setEditorLayout('widescreen');
                  if (editorWidth < 1000) setEditorWidth(1200);
                }}
                title={t('editor.widescreenLayout')}
                style={{ padding: '3px 7px', fontSize: '0.75rem', gap: '4px', width: 'auto' }}
              >
                <Maximize2 size={13} />
                <span>{t('editor.widescreenLayout')}</span>
              </button>
            </div>

            {/* Width Adjuster Popover Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                ref={widthTriggerRef}
                className={`btn-icon btn-sm ${showWidthMenu ? 'active' : ''}`}
                onClick={() => setShowWidthMenu(prev => !prev)}
                title={t('editor.canvasWidth')}
                style={{ padding: '3px 8px', fontSize: '0.75rem', gap: '4px', width: 'auto', background: 'var(--bg-input)' }}
              >
                <SlidersHorizontal size={13} />
                <span>{editorWidth}px</span>
              </button>

              {/* Width Slider Dropdown Popover */}
              {showWidthMenu &&
                createPortal(
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                      }}
                      onClick={() => setShowWidthMenu(false)}
                    />
                    <div
                      className="popover-menu-card"
                      style={{
                        position: 'fixed',
                        top: `${widthPopoverPos.top}px`,
                        right: `${widthPopoverPos.right}px`,
                        zIndex: 9999,
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '1rem',
                        width: '250px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {t('editor.canvasWidth')}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {editorWidth}px
                        </span>
                      </div>

                      <input
                        type="range"
                        min="600"
                        max="1600"
                        step="20"
                        value={editorWidth}
                        onChange={e => setEditorWidth(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />

                      {/* Quick Presets */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                        <button
                          className={`btn btn-sm ${editorWidth === 680 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                          onClick={() => setEditorWidth(680)}
                        >
                          {t('editor.compact')}
                        </button>
                        <button
                          className={`btn btn-sm ${editorWidth === 820 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                          onClick={() => setEditorWidth(820)}
                        >
                          {t('editor.page')}
                        </button>
                        <button
                          className={`btn btn-sm ${editorWidth === 1100 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                          onClick={() => setEditorWidth(1100)}
                        >
                          {t('editor.wide')}
                        </button>
                        <button
                          className={`btn btn-sm ${editorWidth === 1450 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                          onClick={() => setEditorWidth(1450)}
                        >
                          {t('editor.ultra')}
                        </button>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                        {t('editor.authorViewOnly')}
                      </div>
                    </div>
                  </>,
                  document.body
                )}
            </div>

            <div className="toolbar-separator" />

            {/* Comments Sidebar Toggle Button */}
            <button
              className={`btn btn-secondary btn-sm ${isCommentsSidebarOpen ? 'active' : ''}`}
              onClick={() => setIsCommentsSidebarOpen(!isCommentsSidebarOpen)}
              title={t('editor.toggleHighlights')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isCommentsSidebarOpen ? 'var(--accent-primary-glow)' : undefined,
                borderColor: isCommentsSidebarOpen ? 'var(--accent-primary)' : undefined,
              }}
            >
              <MessageSquare size={14} />
              <span>{t('editor.comments')}</span>
              {chapterComments.length > 0 && (
                <span
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    lineHeight: 1.2,
                  }}
                >
                  {chapterComments.length}
                </span>
              )}
            </button>

            {/* Highlights Show/Hide Toggle */}
            <button
              className={`btn btn-secondary btn-sm ${!showCommentHighlights ? 'active' : ''}`}
              onClick={toggleCommentHighlights}
              title={showCommentHighlights ? t('comments.hide') : t('comments.show')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.55rem',
                color: !showCommentHighlights ? 'var(--accent-warning)' : undefined,
              }}
            >
              {showCommentHighlights ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* Quick Selection Floating Banner */}
      {selectedText && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 40,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            {t('editor.selected')}: <strong style={{ color: 'var(--text-primary)' }}>"{selectedText.substring(0, 24)}..."</strong>
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStartAddComment}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={13} />
            <span>{t('editor.addCommentBtn')}</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleQuickSplit}
          >
            <Scissors size={13} />
            <span>{t('editor.splitFromHere')}</span>
          </button>
        </div>
      )}

      {/* Main Canvas & Docked Comments Drawer Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Editor Surface */}
        <div
          ref={workspaceRef}
          className={`editor-workspace editor-theme-${readerTheme} editor-layout-${editorLayout} ${isCommentsHidden ? 'hide-comment-highlights' : ''} ${isZenMode && zenSettings.typewriterScrolling ? 'zen-typewriter-mode' : ''} ${isZenMode && zenSettings.focusDimming ? 'zen-focus-dimming' : ''}`}
          onClick={handleEditorClick}
          style={{
            ['--zen-dim-opacity' as any]: ((zenSettings.focusDimOpacity ?? 35) / 100).toFixed(2),
          }}
        >
          {customCss && (
            <style
              dangerouslySetInnerHTML={{
                __html: scopeCssForContainer(customCss, '.wysiwyg-content'),
              }}
            />
          )}
          <div
            ref={editorRef}
            className="wysiwyg-content"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleInput}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onKeyDown={handleEditorKeyDown}
            spellCheck
            style={{
              maxWidth: `${editorWidth}px`,
              width: '100%',
              fontFamily: getFontFamily(readerFont),
            }}
          />
        </div>

        {/* Comments Sidebar Drawer */}
        <CommentsSidebar
          isOpen={isCommentsSidebarOpen && !isCommentsHidden}
          onClose={() => setIsCommentsSidebarOpen(false)}
          chapterTitle={activeChapter.title}
          comments={chapterComments}
          activeCommentId={activeCommentId}
          onSelectComment={comment => {
            setActiveModalComment(comment);
            setActiveCommentId(comment.id);
            setIsCommentModalOpen(true);
            handleJumpToHighlight(comment.id);
          }}
          onDeleteComment={handleDeleteComment}
          onJumpToHighlight={handleJumpToHighlight}
        />
      </div>

      {/* Floating Comment Trigger Pill */}
      {!isCommentsHidden && (
        <CommentFloatingPill
          position={commentPillPos}
          onAddComment={handleStartAddComment}
        />
      )}

      {/* Floating Image Controls Toolbar */}
      <ImageControlsToolbar
        position={imageToolbarPos}
        canMoveUp={canMoveImageUp}
        canMoveDown={canMoveImageDown}
        currentAlign={imageAlign}
        onMoveUp={handleMoveImageUp}
        onMoveDown={handleMoveImageDown}
        onDelete={handleDeleteImage}
        onAlign={handleAlignImage}
        onResize={handleResizeImage}
      />

      {/* Author Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => {
          setIsCommentModalOpen(false);
          setActiveModalComment(null);
        }}
        comment={activeModalComment}
        selectedText={selectedTextForComment}
        onSaveNew={handleSaveNewComment}
        onUpdate={handleUpdateComment}
        onDelete={handleDeleteComment}
      />

      {/* Image Inserter Modal */}
      {showImageDialog && (
        <div className="modal-overlay" onClick={() => setShowImageDialog(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('editor.insertImage')}</h3>
            </div>
            <div className="modal-body">
              {/* Asset Pool Selection */}
              {book && book.assets.filter(a => a.mediaType.startsWith('image/')).length > 0 && (
                <div className="form-group">
                  <label className="form-label">{t('editor.chooseBookAssets')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {book.assets
                      .filter(a => a.mediaType.startsWith('image/'))
                      .map(asset => (
                        <div
                          key={asset.id}
                          onClick={() => handleInsertImage(asset.blobUrl || asset.href)}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.3rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: 'var(--bg-input)',
                          }}
                        >
                          <img
                            src={asset.blobUrl}
                            alt={asset.id}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <div style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {asset.id}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Upload Local Image */}
              <div className="form-group">
                <label className="form-label">{t('editor.uploadImageFile')}</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="form-input"
                />
              </div>

              {/* Image URL input */}
              <div className="form-group">
                <label className="form-label">{t('editor.orImageUrl')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://..."
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImageDialog(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleInsertImage(imageUrlInput)}
                disabled={!imageUrlInput.trim()}
              >
                {t('editor.insert')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {isSplitModalOpen && (
        <SplitChapterModal
          onClose={() => setIsSplitModalOpen(false)}
          prefillText={selectedText}
        />
      )}
    </div>
  );
};
