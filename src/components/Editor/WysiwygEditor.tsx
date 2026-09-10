import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Link,
  RemoveFormatting,
  Scissors,
  Sun,
  Moon,
  FileText,
  Maximize2,
  SlidersHorizontal,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SplitChapterModal } from './SplitChapterModal';
import { scopeCssForContainer } from '../../services/epub/cssPresets';
import { getStoredSettings, updateStoredSettings } from '../../services/epub/settingsStorage';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { AuthorComment } from '../../types/epub';
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

export const WysiwygEditor: React.FC = () => {
  const {
    activeChapter,
    updateChapterContent,
    book,
    readerTheme,
    setReaderTheme,
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
  } = useEpub();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Author Comments State
  const [commentPillPos, setCommentPillPos] = useState<{ x: number; y: number } | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);
  const [activeModalComment, setActiveModalComment] = useState<AuthorComment | null>(null);
  const [selectedTextForComment, setSelectedTextForComment] = useState<string>('');
  const selectedRangeRef = useRef<Range | null>(null);

  useEscapeKey(() => setShowImageDialog(false), showImageDialog);
  useEscapeKey(() => setShowWidthMenu(false), showWidthMenu);

  const setEditorLayout = (layout: 'page' | 'widescreen') => {
    setEditorLayoutState(layout);
    updateStoredSettings({ editorLayout: layout });
  };

  const setEditorWidth = (width: number) => {
    setEditorWidthState(width);
    updateStoredSettings({ editorWidth: width });
  };

  // Sync content into editor and scroll to top when active chapter changes
  useEffect(() => {
    if (editorRef.current && activeChapter) {
      if (editorRef.current.innerHTML !== activeChapter.content) {
        editorRef.current.innerHTML = activeChapter.content;
      }
    }
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when chapter ID changes, not on keystroke updates
  }, [activeChapter?.id]);

  const handleInput = useCallback(() => {
    if (editorRef.current && activeChapter) {
      const html = editorRef.current.innerHTML;
      if (html !== activeChapter.content) {
        updateChapterContent(activeChapter.id, html);
      }
    }
  }, [activeChapter, updateChapterContent]);

  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

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

  const handleSelectionChange = useCallback(() => {
    const activeSel = getSelectionFloatingPosition(editorRef.current);
    if (activeSel) {
      setSelectedText(activeSel.text);
      selectedRangeRef.current = activeSel.range;
      setCommentPillPos(activeSel.position);
    } else {
      setSelectedText('');
      if (!isCommentModalOpen) {
        setCommentPillPos(null);
      }
    }
    updateActiveAlignment();
  }, [updateActiveAlignment, isCommentModalOpen]);

  // Handle clicking inside editor: detects if clicked on existing comment highlight
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setShowWidthMenu(false);
    // When highlights are hidden, don't hijack editor text clicks
    if (!showCommentHighlights) return;

    const target = e.target as HTMLElement;
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
  }, [comments, setActiveCommentId, showCommentHighlights]);

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
      updateChapterContent(activeChapter.id, editorRef.current.innerHTML);
    }
  }, [updateComment, activeChapter, updateChapterContent]);

  // Delete comment and remove highlight markup
  const handleDeleteComment = useCallback((commentId: string) => {
    if (editorRef.current && activeChapter) {
      unwrapCommentHighlight(editorRef.current, commentId);
      updateChapterContent(activeChapter.id, editorRef.current.innerHTML);
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

  // Keyboard shortcuts: Ctrl/Cmd + L (left), E (center), R (right), J (justify)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'l') {
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
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && book) {
      const blobUrl = URL.createObjectURL(file);
      execCommand('insertImage', blobUrl);
      setShowImageDialog(false);
    }
  };

  const handleQuickSplit = () => {
    setIsSplitModalOpen(true);
  };

  if (!activeChapter) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a chapter to edit
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Editor Sub-toolbar */}
      <div className="sub-toolbar">
        <div className="toolbar-group toolbar-group-scrollable">
          <button
            className="tool-btn"
            onClick={() => insertHeading('h1')}
            title="Heading 1"
          >
            <Heading1 size={17} />
          </button>
          <button
            className="tool-btn"
            onClick={() => insertHeading('h2')}
            title="Heading 2"
          >
            <Heading2 size={17} />
          </button>
          <button
            className="tool-btn"
            onClick={() => insertHeading('h3')}
            title="Heading 3"
          >
            <Heading3 size={17} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => execCommand('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('strikeThrough')}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </button>

          <div className="toolbar-separator" />

          {/* Text Alignment Controls */}
          <button
            className={`tool-btn ${currentAlign === 'left' ? 'active' : ''}`}
            onClick={() => handleAlign('left')}
            title="Align Left (Ctrl+L)"
          >
            <AlignLeft size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'center' ? 'active' : ''}`}
            onClick={() => handleAlign('center')}
            title="Align Center (Ctrl+E)"
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'right' ? 'active' : ''}`}
            onClick={() => handleAlign('right')}
            title="Align Right (Ctrl+R)"
          >
            <AlignRight size={16} />
          </button>
          <button
            className={`tool-btn ${currentAlign === 'justify' ? 'active' : ''}`}
            onClick={() => handleAlign('justify')}
            title="Justify (Ctrl+J)"
          >
            <AlignJustify size={16} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('formatBlock', '<blockquote>')}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('insertHorizontalRule')}
            title="Horizontal Divider"
          >
            <Minus size={16} />
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => setShowImageDialog(true)}
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={handleInsertLink}
            title="Insert Link"
          >
            <Link size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={() => execCommand('removeFormat')}
            title="Clear Formatting"
          >
            <RemoveFormatting size={16} />
          </button>
        </div>

        {/* Right side tools: Layout, Width, Theme & Split */}
        <div className="toolbar-group">
          {/* Layout Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
            <button
              className={`btn-icon btn-sm ${editorLayout === 'page' ? 'active' : ''}`}
              onClick={() => {
                setEditorLayout('page');
                if (editorWidth > 950) setEditorWidth(820);
              }}
              title="Page Layout (Centered Sheet)"
              style={{ padding: '3px 7px', fontSize: '0.75rem', gap: '4px', width: 'auto' }}
            >
              <FileText size={13} />
              <span>Page</span>
            </button>
            <button
              className={`btn-icon btn-sm ${editorLayout === 'widescreen' ? 'active' : ''}`}
              onClick={() => {
                setEditorLayout('widescreen');
                if (editorWidth < 1000) setEditorWidth(1200);
              }}
              title="Widescreen Layout (Expanded Canvas)"
              style={{ padding: '3px 7px', fontSize: '0.75rem', gap: '4px', width: 'auto' }}
            >
              <Maximize2 size={13} />
              <span>Widescreen</span>
            </button>
          </div>

          {/* Width Adjuster Popover Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn-icon btn-sm ${showWidthMenu ? 'active' : ''}`}
              onClick={() => setShowWidthMenu(prev => !prev)}
              title="Adjust Editor Width (Editor only - does not affect book)"
              style={{ padding: '3px 8px', fontSize: '0.75rem', gap: '4px', width: 'auto', background: 'var(--bg-input)' }}
            >
              <SlidersHorizontal size={13} />
              <span>{editorWidth}px</span>
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
                    width: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Editor Canvas Width
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
                    Compact (680px)
                  </button>
                  <button
                    className={`btn btn-sm ${editorWidth === 820 ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                    onClick={() => setEditorWidth(820)}
                  >
                    Page (820px)
                  </button>
                  <button
                    className={`btn btn-sm ${editorWidth === 1100 ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                    onClick={() => setEditorWidth(1100)}
                  >
                    Wide (1100px)
                  </button>
                  <button
                    className={`btn btn-sm ${editorWidth === 1450 ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '0.2rem' }}
                    onClick={() => setEditorWidth(1450)}
                  >
                    Ultra (1450px)
                  </button>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                  Authoring view only (doesn't alter EPUB)
                </div>
              </div>
            </>
          )}
          </div>

          <div className="toolbar-separator" />

          {/* Editor Canvas Theme Selector */}
          <div className="canvas-theme-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
            <button
              className={`btn-icon btn-sm ${readerTheme === 'light' ? 'active' : ''}`}
              onClick={() => setReaderTheme('light')}
              title="Paper White Canvas"
              style={{ padding: '3px 6px', background: readerTheme === 'light' ? '#fafafa' : undefined, color: readerTheme === 'light' ? '#18181b' : undefined }}
            >
              <Sun size={14} />
            </button>
            <button
              className={`btn-icon btn-sm ${readerTheme === 'sepia' ? 'active' : ''}`}
              onClick={() => setReaderTheme('sepia')}
              title="Warm Sepia Canvas"
              style={{ padding: '3px 6px', background: readerTheme === 'sepia' ? '#f7f3e8' : undefined, color: readerTheme === 'sepia' ? '#2e261f' : undefined }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>S</span>
            </button>
            <button
              className={`btn-icon btn-sm ${readerTheme === 'dark' ? 'active' : ''}`}
              onClick={() => setReaderTheme('dark')}
              title="Graphite Dark Canvas"
              style={{ padding: '3px 6px', background: readerTheme === 'dark' ? '#121215' : undefined, color: readerTheme === 'dark' ? '#fafafa' : undefined }}
            >
              <Moon size={14} />
            </button>
            <button
              className={`btn-icon btn-sm ${readerTheme === 'obsidian' ? 'active' : ''}`}
              onClick={() => setReaderTheme('obsidian')}
              title="Obsidian OLED"
              style={{ padding: '3px 6px', background: readerTheme === 'obsidian' ? '#000000' : undefined, color: readerTheme === 'obsidian' ? '#ffffff' : undefined }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>O</span>
            </button>
          </div>

          <div className="toolbar-separator" />

          {/* Comments Sidebar Toggle Button */}
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
            <MessageSquare size={14} />
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
            {showCommentHighlights ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleQuickSplit}
            title="Split chapter at cursor, selection, or heading"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Scissors size={14} />
            <span>Split Chapter</span>
          </button>
        </div>
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
            Selected: <strong style={{ color: 'var(--text-primary)' }}>"{selectedText.substring(0, 24)}..."</strong>
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStartAddComment}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={13} />
            <span>Add Comment</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleQuickSplit}
          >
            <Scissors size={13} />
            <span>Split from here</span>
          </button>
        </div>
      )}

      {/* Main Canvas & Docked Comments Drawer Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Editor Surface */}
        <div
          ref={workspaceRef}
          className={`editor-workspace editor-theme-${readerTheme} editor-layout-${editorLayout} ${!showCommentHighlights ? 'hide-comment-highlights' : ''}`}
          onClick={handleEditorClick}
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
            }}
          />
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
      </div>

      {/* Floating Comment Trigger Pill */}
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

      {/* Image Inserter Modal */}
      {showImageDialog && (
        <div className="modal-overlay" onClick={() => setShowImageDialog(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Insert Image</h3>
            </div>
            <div className="modal-body">
              {/* Asset Pool Selection */}
              {book && book.assets.filter(a => a.mediaType.startsWith('image/')).length > 0 && (
                <div className="form-group">
                  <label className="form-label">Choose from Book Assets:</label>
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
                <label className="form-label">Or Upload an Image File:</label>
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
                <label className="form-label">Or Image URL:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImageDialog(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleInsertImage(imageUrlInput)}
                disabled={!imageUrlInput.trim()}
              >
                Insert
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
