import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Undo,
  Redo,
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
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  RemoveFormatting,
} from 'lucide-react';
import { ReaderTheme, ReaderFont } from '../../types/project';
import { TextColorPicker } from '../Editor/TextColorPicker';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  p: boolean;
  ul: boolean;
  ol: boolean;
  blockquote: boolean;
}

export interface ZenFloatingToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onHeading: (level: string) => void;
  onExecCommand: (command: string, value?: string) => void;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  currentAlign: 'left' | 'center' | 'right' | 'justify';
  activeFormats?: ActiveFormats;
  activeTextColor: string;
  onSelectColor: (hex: string) => void;
  onSetAutoColor: () => void;
  readerTheme: ReaderTheme;
  readerFont?: ReaderFont;
  onSetFont?: (font: ReaderFont) => void;
  onPreserveSelection?: () => void;
}

export const ZenFloatingToolbar: React.FC<ZenFloatingToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onHeading,
  onExecCommand,
  onAlign,
  currentAlign,
  activeFormats,
  activeTextColor,
  onSelectColor,
  onSetAutoColor,
  readerTheme,
  onPreserveSelection,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef<boolean>(false);
  const isSubmenuOpenRef = useRef<boolean>(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isSubmenuOpenRef.current = isColorPickerOpen;
  }, [isColorPickerOpen]);

  const resetHideTimer = useCallback((delay = 3000) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveredRef.current && !isSubmenuOpenRef.current) {
        setIsVisible(false);
      }
    }, delay);
  }, []);

  useEffect(() => {
    // Show initially when entering Zen mode, then fade out after 3.5s if not hovered
    setIsVisible(true);
    resetHideTimer(3500);

    const handleMouseMove = () => {
      setIsVisible(true);
      resetHideTimer(3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hide if pressing Escape or modifier keys alone
      if (
        e.key === 'Escape' ||
        e.key === 'Control' ||
        e.key === 'Alt' ||
        e.key === 'Shift' ||
        e.key === 'Meta' ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      // If user starts typing, close menus and fade out
      setIsColorPickerOpen(false);
      setIsVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useEscapeKey(() => {
    if (isColorPickerOpen) {
      setIsColorPickerOpen(false);
      resetHideTimer(2500);
    }
  }, isColorPickerOpen);

  return createPortal(
    <div
      className={`zen-floating-toolbar-container ${
        isVisible ? 'visible' : 'hidden'
      } ${isHovered || isColorPickerOpen ? 'hovered' : 'translucent'}`}
      onMouseEnter={() => {
        setIsHovered(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isSubmenuOpenRef.current) {
          resetHideTimer(2500);
        }
      }}
      role="toolbar"
      aria-label="Zen Mode Formatting Toolbar"
    >
      <div className="zen-floating-toolbar">
        {/* Undo / Redo */}
        <button
          type="button"
          className="zen-toolbar-btn"
          disabled={!canUndo}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={onUndo}
          title={canUndo ? 'Undo (Ctrl+Z)' : 'Undo'}
          aria-label="Undo"
        >
          <Undo size={17} />
        </button>
        <button
          type="button"
          className="zen-toolbar-btn"
          disabled={!canRedo}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={onRedo}
          title={canRedo ? 'Redo (Ctrl+Y)' : 'Redo'}
          aria-label="Redo"
        >
          <Redo size={17} />
        </button>

        <div className="zen-toolbar-separator" />

        {/* Headings */}
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.p ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onHeading('p')}
          title="Paragraph / Normal Text"
          aria-label="Normal Text"
        >
          <Pilcrow size={18} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.h1 ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onHeading('h1')}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.h2 ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onHeading('h2')}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.h3 ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onHeading('h3')}
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 size={18} />
        </button>

        <div className="zen-toolbar-separator" />

        {/* Inline Formatting */}
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.bold ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('bold')}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.italic ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('italic')}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.underline ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('underline')}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <Underline size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.strikeThrough ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('strikeThrough')}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={17} />
        </button>

        {/* Text Color Picker */}
        <TextColorPicker
          isOpen={isColorPickerOpen}
          onToggle={() => {
            onPreserveSelection?.();
            setIsColorPickerOpen(prev => !prev);
          }}
          onClose={() => {
            setIsColorPickerOpen(false);
            resetHideTimer(2500);
          }}
          activeTextColor={activeTextColor}
          readerTheme={readerTheme}
          onSelectColor={color => {
            onSelectColor(color);
            setIsColorPickerOpen(false);
            resetHideTimer(2500);
          }}
          onSetAuto={() => {
            onSetAutoColor();
            setIsColorPickerOpen(false);
            resetHideTimer(2500);
          }}
          onTriggerMouseDown={() => {
            onPreserveSelection?.();
          }}
          popoverZIndex={100000}
          buttonSize={36}
          iconSize={17}
        />

        <div className="zen-toolbar-separator" />

        {/* Text Alignment */}
        <button
          type="button"
          className={`zen-toolbar-btn ${currentAlign === 'left' ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onAlign('left')}
          title="Align Left (Ctrl+L)"
          aria-label="Align Left"
        >
          <AlignLeft size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${currentAlign === 'center' ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onAlign('center')}
          title="Align Center (Ctrl+E)"
          aria-label="Align Center"
        >
          <AlignCenter size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${currentAlign === 'right' ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onAlign('right')}
          title="Align Right (Ctrl+R)"
          aria-label="Align Right"
        >
          <AlignRight size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${currentAlign === 'justify' ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onAlign('justify')}
          title="Justify (Ctrl+J)"
          aria-label="Justify"
        >
          <AlignJustify size={17} />
        </button>

        <div className="zen-toolbar-separator" />

        {/* Lists & Quotes */}
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.ul ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('insertUnorderedList')}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.ol ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('insertOrderedList')}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={17} />
        </button>
        <button
          type="button"
          className={`zen-toolbar-btn ${activeFormats?.blockquote ? 'active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('formatBlock', '<blockquote>')}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote size={17} />
        </button>
        <button
          type="button"
          className="zen-toolbar-btn"
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('insertHorizontalRule')}
          title="Horizontal Divider"
          aria-label="Horizontal Divider"
        >
          <Minus size={17} />
        </button>
        <button
          type="button"
          className="zen-toolbar-btn"
          onMouseDown={e => {
            e.preventDefault();
            onPreserveSelection?.();
          }}
          onClick={() => onExecCommand('removeFormat')}
          title="Clear Formatting"
          aria-label="Clear Formatting"
        >
          <RemoveFormatting size={17} />
        </button>
      </div>
    </div>,
    document.body
  );
};
