import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Type,
  Headphones,
  BookOpen,
  SlidersHorizontal,
  X,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ReaderFont, AuthorComment } from '../../types/epub';
import { scopeCssForContainer } from '../../services/epub/cssPresets';
import { useTts } from '../../context/TtsContext';
import { SpeechChunk } from '../../services/tts/textChunker';
import { AudioPlayerBar } from '../TTS/AudioPlayerBar';
import { TTSModelModal } from '../TTS/TTSModelModal';
import { useEscapeKey } from '../../hooks/useEscapeKey';
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

export const ReaderView: React.FC = () => {
  const {
    book,
    activeChapter,
    setActiveChapterId,
    setViewMode,
    readerTheme,
    setReaderTheme,
    readerFont,
    setReaderFont,
    readerFontSize,
    setReaderFontSize,
    readerMarginWidth,
    setReaderMarginWidth,
    customCss,
    updateChapterContent,
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
  } = useEpub();

  const [showWidthMenu, setShowWidthMenu] = useState(false);
  useEscapeKey(() => setShowWidthMenu(false), showWidthMenu);

  // Author Comments State
  const [commentPillPos, setCommentPillPos] = useState<{ x: number; y: number } | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);
  const [activeModalComment, setActiveModalComment] = useState<AuthorComment | null>(null);
  const [selectedTextForComment, setSelectedTextForComment] = useState<string>('');
  const selectedRangeRef = useRef<Range | null>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);

  const {
    isAudioActive,
    isPlaying,
    pauseAudio,
    resumeAudio,
    stopAudio,
    startListening,
    selectedModel,
    openModelModal,
    currentChunk,
    allChunks,
    seekToChunk,
  } = useTts();

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Live sentence highlight & auto-scroll tracking (ONLY when listening panel is active)
  useEffect(() => {
    if (!isAudioActive || !currentChunk?.text || !readerContainerRef.current) {
      const existing = readerContainerRef.current?.querySelectorAll('.tts-active-sentence');
      existing?.forEach(el => el.classList.remove('tts-active-sentence'));
      return;
    }

    const existing = readerContainerRef.current.querySelectorAll('.tts-active-sentence');
    existing.forEach(el => el.classList.remove('tts-active-sentence'));

    const snippet = currentChunk.text.slice(0, 30).trim();
    if (snippet.length > 5) {
      const walker = document.createTreeWalker(
        readerContainerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.includes(snippet)) {
          const parent = node.parentElement;
          if (parent) {
            parent.classList.add('tts-active-sentence');
            const rect = parent.getBoundingClientRect();
            const containerRect = readerContainerRef.current.getBoundingClientRect();
            if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
              parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
          }
        }
      }
    }

    const container = readerContainerRef.current;
    return () => {
      const existing = container?.querySelectorAll('.tts-active-sentence');
      existing?.forEach(el => el.classList.remove('tts-active-sentence'));
    };
  }, [isAudioActive, currentChunk?.text]);

  // Scroll back to top whenever the active chapter changes
  useEffect(() => {
    if (readerContainerRef.current) {
      readerContainerRef.current.scrollTop = 0;
    }
  }, [activeChapter?.id]);

  // Find index of current chapter
  const currentIndex = useMemo(() => {
    if (!book || !activeChapter) return 0;
    return book.chapters.findIndex(c => c.id === activeChapter.id);
  }, [book, activeChapter]);

  const prevChapter = currentIndex > 0 ? book?.chapters[currentIndex - 1] : null;
  const nextChapter = book && currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevChapter) {
        setActiveChapterId(prevChapter.id);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        setActiveChapterId(nextChapter.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, setActiveChapterId]);

  const getFontFamily = (font: ReaderFont) => {
    switch (font) {
      case 'serif':
        return 'var(--font-reader-serif)';
      case 'sans':
        return 'var(--font-reader-sans)';
      case 'literata':
        return 'var(--font-reader-literata)';
      case 'mono':
        return 'var(--font-reader-mono)';
      default:
        return 'var(--font-reader-serif)';
    }
  };

  const handleListenClick = () => {
    if (!activeChapter) return;
    if (isAudioActive) {
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      if (!selectedModel) {
        openModelModal();
      } else {
        startListening(activeChapter.content);
      }
    }
  };

  const readingMinutes = activeChapter ? Math.max(1, Math.round(activeChapter.wordCount / 220)) : 1;

  /**
   * Matches clicked snippet and block to the exact SpeechChunk
   */
  const findChunkIndex = (targetSnippet: string, fullBlockText: string, chunks: SpeechChunk[]): number => {
    const cleanSnippet = targetSnippet.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanBlock = fullBlockText.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleanSnippet && !cleanBlock) return -1;

    // 1. Try matching targetSnippet directly against chunks
    if (cleanSnippet.length >= 5) {
      for (let i = 0; i < chunks.length; i++) {
        const cleanChunk = chunks[i].text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanChunk.includes(cleanSnippet) || cleanSnippet.includes(cleanChunk)) {
          return i;
        }
      }
    }

    // 2. Try matching the beginning of fullBlockText
    const blockHead = cleanBlock.slice(0, 60);
    if (blockHead.length >= 5) {
      for (let i = 0; i < chunks.length; i++) {
        const cleanChunk = chunks[i].text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanChunk.includes(blockHead) || blockHead.includes(cleanChunk)) {
          return i;
        }
      }
    }

    // 3. Keyword matching
    const words = cleanSnippet.split(/\s+/).filter(w => w.length >= 3);
    let bestIdx = -1;
    let maxScore = 0;

    for (let i = 0; i < chunks.length; i++) {
      const cleanChunk = chunks[i].text.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (cleanChunk.includes(w)) score++;
      }
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }

    return maxScore >= 2 ? bestIdx : -1;
  };

  const handleSelectionChange = useCallback(() => {
    const activeSel = getSelectionFloatingPosition(readerContainerRef.current);
    if (activeSel) {
      selectedRangeRef.current = activeSel.range;
      setCommentPillPos(activeSel.position);
    } else {
      if (!isCommentModalOpen) {
        setCommentPillPos(null);
      }
    }
  }, [isCommentModalOpen]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Start adding comment from reader selection
  const handleStartAddComment = useCallback(() => {
    const snippet = selectedRangeRef.current?.toString().trim();
    if (snippet) {
      setSelectedTextForComment(snippet);
      setActiveModalComment(null);
      setIsCommentModalOpen(true);
      setCommentPillPos(null);
    }
  }, []);

  // Save new comment and wrap reader DOM
  const handleSaveNewComment = useCallback((selectedSnippet: string, noteText: string, color: string) => {
    if (!activeChapter) return;
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let newHtml: string | undefined = undefined;

    if (selectedRangeRef.current && articleContentRef.current) {
      wrapSelectionWithComment(selectedRangeRef.current, commentId, color);
      newHtml = articleContentRef.current.innerHTML;
      selectedRangeRef.current = null;
      window.getSelection()?.removeAllRanges();
    }

    if (!showCommentHighlights) {
      setShowCommentHighlights(true);
    }

    addComment(activeChapter.id, selectedSnippet, noteText, color, commentId, newHtml);
    setIsCommentModalOpen(false);
  }, [activeChapter, addComment, showCommentHighlights, setShowCommentHighlights]);

  // Update existing comment (text or color)
  const handleUpdateComment = useCallback((commentId: string, updates: { comment?: string; color?: string }) => {
    updateComment(commentId, updates);
    if (updates.color && articleContentRef.current && activeChapter) {
      updateCommentHighlightColor(articleContentRef.current, commentId, updates.color);
      updateChapterContent(activeChapter.id, articleContentRef.current.innerHTML);
    }
  }, [updateComment, activeChapter, updateChapterContent]);

  // Delete comment and unwrap highlight
  const handleDeleteComment = useCallback((commentId: string) => {
    if (articleContentRef.current && activeChapter) {
      unwrapCommentHighlight(articleContentRef.current, commentId);
      updateChapterContent(activeChapter.id, articleContentRef.current.innerHTML);
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
    pulseAndScrollToHighlight(readerContainerRef.current, commentId);
  }, [setActiveCommentId, showCommentHighlights, setShowCommentHighlights]);

  const handleArticleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowWidthMenu(false);
    const target = e.target as HTMLElement;

    // 0. Check if clicked an existing author comment highlight (only when highlights are visible)
    if (showCommentHighlights) {
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
            return;
          }
        }
      }
    }

    if (!isAudioActive || allChunks.length === 0) return;

    // Don't intercept clicks on buttons, selects, inputs, links
    if (target.closest('button, select, input, a')) {
      return;
    }

    // 1. Identify the EXACT block element clicked (h1-h6, p, blockquote, li, tr)
    const blockEl = target.closest<HTMLElement>('h1, h2, h3, h4, h5, h6, p, blockquote, li, tr, td, th');
    if (!blockEl) return;

    const blockTag = blockEl.tagName.toLowerCase();
    const fullBlockText = (blockEl.textContent || '').replace(/[ \t\r\n]+/g, ' ').trim();
    if (!fullBlockText) return;

    let targetSnippet = '';

    // 2. Headings: snippet is simply the heading's text (never use caret range)
    if (blockTag.startsWith('h')) {
      targetSnippet = fullBlockText;
    } else {
      // 3. Paragraphs/quotes: check if caretRange is actually within this block
      let range: Range | null = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      } else {
        const docWithCaret = document as unknown as {
          caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        };
        if (docWithCaret.caretPositionFromPoint) {
          const pos = docWithCaret.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos && pos.offsetNode) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }
      }

      // ONLY use range if it genuinely belongs inside blockEl!
      // This prevents margin/padding clicks from snapping to preceding/following sibling elements!
      if (range && range.startContainer && blockEl.contains(range.startContainer)) {
        const nodeText = range.startContainer.textContent || '';
        const offset = range.startOffset;

        const prevPunct = Math.max(
          nodeText.lastIndexOf('.', offset - 1),
          nodeText.lastIndexOf('!', offset - 1),
          nodeText.lastIndexOf('?', offset - 1)
        );
        const start = prevPunct === -1 ? 0 : prevPunct + 1;

        let nextPunct = -1;
        for (let i = offset; i < nodeText.length; i++) {
          if (nodeText[i] === '.' || nodeText[i] === '!' || nodeText[i] === '?') {
            nextPunct = i + 1;
            break;
          }
        }
        const end = nextPunct === -1 ? nodeText.length : nextPunct;
        const candidate = nodeText.substring(start, end).replace(/[ \t\r\n]+/g, ' ').trim();
        if (candidate.length >= 6) {
          targetSnippet = candidate;
        }
      }

      // Fallback: use beginning of block
      if (!targetSnippet) {
        targetSnippet = fullBlockText.slice(0, 120);
      }
    }

    if (targetSnippet) {
      const targetChunkIndex = findChunkIndex(targetSnippet, fullBlockText, allChunks);
      if (targetChunkIndex !== -1) {
        seekToChunk(targetChunkIndex);
      }
    }
  };

  if (!book || !activeChapter) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a chapter to read
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>
      {/* Main Content Pane */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sleek Compact Reader Toolbar */}
        <div
          className="sub-toolbar"
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0.5rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            minHeight: '46px',
          }}
        >
          {/* Left: Chapter Breadcrumb & Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <BookOpen size={15} color="var(--accent-primary)" />
              <span>
                Chapter {currentIndex + 1}: {activeChapter.title}
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              • {activeChapter.wordCount.toLocaleString()} words (~{readingMinutes} min read)
            </span>
          </div>

          {/* Center: Typography & Theme Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Theme Switcher Segmented Control */}
            <div className="reader-theme-segmented">
              <button
                className={`theme-segment-btn ${readerTheme === 'light' ? 'active' : ''}`}
                onClick={() => setReaderTheme('light')}
                title="Light Paper"
              >
                <Sun size={12} />
                <span>Light</span>
              </button>
              <button
                className={`theme-segment-btn ${readerTheme === 'sepia' ? 'active' : ''}`}
                onClick={() => setReaderTheme('sepia')}
                title="Warm Sepia"
              >
                <span className="theme-dot dot-sepia" />
                <span>Sepia</span>
              </button>
              <button
                className={`theme-segment-btn ${readerTheme === 'dark' ? 'active' : ''}`}
                onClick={() => setReaderTheme('dark')}
                title="Graphite Dark"
              >
                <Moon size={12} />
                <span>Dark</span>
              </button>
              <button
                className={`theme-segment-btn ${readerTheme === 'obsidian' ? 'active' : ''}`}
                onClick={() => setReaderTheme('obsidian')}
                title="Obsidian OLED"
              >
                <span className="theme-dot dot-oled" />
                <span>OLED</span>
              </button>
            </div>

            <div className="header-divider" style={{ height: '16px' }} />

            {/* Font Family Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <Type size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <select
                className="form-select"
                value={readerFont}
                onChange={e => setReaderFont(e.target.value as ReaderFont)}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.78rem',
                  height: '28px',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <option value="serif">Book Serif (Merriweather)</option>
                <option value="literata">Literata (Editorial)</option>
                <option value="sans">Inter (Modern Sans)</option>
                <option value="mono">Fira Code (Monospace)</option>
              </select>
            </div>

            <div className="header-divider" style={{ height: '16px' }} />

            {/* Font Size Adjustment */}
            <div
              className="reader-font-stepper"
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            >
              <button
                className="btn-icon btn-sm"
                onClick={() => setReaderFontSize(Math.max(13, readerFontSize - 1))}
                title="Decrease font size"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
              >
                A-
              </button>
              <span style={{ fontSize: '0.74rem', minWidth: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {readerFontSize}
              </span>
              <button
                className="btn-icon btn-sm"
                onClick={() => setReaderFontSize(Math.min(32, readerFontSize + 1))}
                title="Increase font size"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
              >
                A+
              </button>
            </div>

            <div className="header-divider" style={{ height: '16px' }} />

            {/* Page Width Adjuster Popover Trigger */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                className={`btn-icon btn-sm ${showWidthMenu ? 'active' : ''}`}
                onClick={() => setShowWidthMenu(prev => !prev)}
                title="Adjust Reading Page Width"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  gap: '4px',
                  width: 'auto',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={13} />
                <span>{readerMarginWidth}px</span>
              </button>

              {/* Width Slider Dropdown Popover */}
              {showWidthMenu && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 90,
                    }}
                    onClick={() => setShowWidthMenu(false)}
                  />
                  <div
                    className="popover-menu-card"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      zIndex: 100,
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '1rem',
                      width: '240px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Reading Page Width
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {readerMarginWidth}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="600"
                    max="1600"
                    step="20"
                    value={readerMarginWidth}
                    onChange={e => setReaderMarginWidth(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />

                  {/* Quick Presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                    <button
                      className={`btn btn-sm ${readerMarginWidth === 680 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      onClick={() => {
                        setReaderMarginWidth(680);
                        setShowWidthMenu(false);
                      }}
                    >
                      Compact (680px)
                    </button>
                    <button
                      className={`btn btn-sm ${readerMarginWidth === 760 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      onClick={() => {
                        setReaderMarginWidth(760);
                        setShowWidthMenu(false);
                      }}
                    >
                      Standard (760px)
                    </button>
                    <button
                      className={`btn btn-sm ${readerMarginWidth === 920 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      onClick={() => {
                        setReaderMarginWidth(920);
                        setShowWidthMenu(false);
                      }}
                    >
                      Comfort (920px)
                    </button>
                    <button
                      className={`btn btn-sm ${readerMarginWidth === 1150 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                      onClick={() => {
                        setReaderMarginWidth(1150);
                        setShowWidthMenu(false);
                      }}
                    >
                      Wide (1150px)
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.4rem',
                    }}
                  >
                    Reader view only (doesn't alter EPUB)
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Listen with In-Browser Audio */}
            <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                className={`btn btn-sm ${isAudioActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleListenClick}
                title={
                  isAudioActive
                    ? isPlaying
                      ? 'Pause reading aloud'
                      : 'Resume reading aloud'
                    : 'Listen to chapter (In-Browser Audio)'
                }
                style={{
                  borderRadius: isAudioActive ? 'var(--radius-full) 0 0 var(--radius-full)' : 'var(--radius-full)',
                  padding: '0.35rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Headphones size={13} />
                <span>{isAudioActive ? (isPlaying ? 'Pause' : 'Resume') : 'Listen'}</span>
              </button>

              {isAudioActive && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={stopAudio}
                  title="Close listening controls"
                  style={{
                    borderRadius: '0 var(--radius-full) var(--radius-full) 0',
                    padding: '0.35rem 0.55rem',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Comments Toggle */}
            <button
              className={`btn btn-secondary btn-sm ${isCommentsSidebarOpen ? 'active' : ''}`}
              onClick={() => setIsCommentsSidebarOpen(!isCommentsSidebarOpen)}
              title="Comments & Highlights"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isCommentsSidebarOpen ? 'var(--accent-primary-glow)' : undefined,
                borderColor: isCommentsSidebarOpen ? 'var(--accent-primary)' : undefined,
              }}
            >
              <MessageSquare size={13} />
              <span>Comments</span>
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
              title={showCommentHighlights ? "Hide comment highlights in text" : "Show comment highlights in text"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.55rem',
                color: !showCommentHighlights ? 'var(--accent-warning)' : undefined,
              }}
            >
              {showCommentHighlights ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>

            {/* Jump to Edit */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setViewMode('editor')}
              title="Edit chapter in WYSIWYG editor"
              style={{ color: 'var(--text-muted)' }}
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Reader Page Container (Prose starts directly here with zero wasted space) */}
        <div
          ref={readerContainerRef}
          className={`reader-container reader-theme-${readerTheme} ${isAudioActive ? 'reader-audio-active' : ''} ${!showCommentHighlights ? 'hide-comment-highlights' : ''}`}
          onClick={handleArticleClick}
          title={isAudioActive ? 'Click any sentence to play from here' : undefined}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2.5rem 1.5rem 5rem',
          }}
        >
          <article
            className="reader-article"
            style={{
              maxWidth: `${readerMarginWidth}px`,
              fontSize: `${readerFontSize}px`,
              fontFamily: readerFont !== 'serif' ? getFontFamily(readerFont) : undefined,
              margin: '0 auto',
            }}
          >
            {customCss && (
              <style
                dangerouslySetInnerHTML={{
                  __html: scopeCssForContainer(customCss, '.reader-article'),
                }}
              />
            )}
            <div ref={articleContentRef} dangerouslySetInnerHTML={{ __html: activeChapter.content }} />
          </article>
        </div>

        {/* Chapter Bottom Navigation Bar */}
        <div
          style={{
            height: '48px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => prevChapter && setActiveChapterId(prevChapter.id)}
            disabled={!prevChapter}
            style={{ fontSize: '0.78rem' }}
          >
            <ChevronLeft size={15} />
            <span>Prev: {prevChapter ? prevChapter.title : 'None'}</span>
          </button>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Chapter {currentIndex + 1} of {book.chapters.length} ({activeChapter.wordCount.toLocaleString()} words)
          </span>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => nextChapter && setActiveChapterId(nextChapter.id)}
            disabled={!nextChapter}
            style={{ fontSize: '0.78rem' }}
          >
            <span>Next: {nextChapter ? nextChapter.title : 'End'}</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* DOCKED BOTTOM AUDIO PLAYER BAR (Directly below chapter controls with 0 gap) */}
        <AudioPlayerBar />
      </div>

      {/* Comments Sidebar Drawer */}
      <CommentsSidebar
        isOpen={isCommentsSidebarOpen}
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

      {/* Selection Floating Pill */}
      <CommentFloatingPill
        position={commentPillPos}
        onAddComment={handleStartAddComment}
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

      {/* In-Browser TTS Model & Voice Setup Modal */}
      <TTSModelModal />
    </div>
  );
};
