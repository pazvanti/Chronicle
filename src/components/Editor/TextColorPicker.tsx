import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Baseline, Check, RotateCcw } from 'lucide-react';
import { ReaderTheme } from '../../types/project';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useEpub } from '../../context/EpubContext';

function isColorLight(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return true;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128;
}

export interface TextColorPickerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  activeTextColor: string; // 'auto' or hex or rgb(...)
  readerTheme: ReaderTheme;
  onSelectColor: (hex: string) => void;
  onSetAuto: () => void;
  onTriggerMouseDown?: (e: React.MouseEvent) => void;
  popoverZIndex?: number;
  buttonSize?: number;
  iconSize?: number;
}

interface ColorOption {
  name: string;
  hex: string;
  isDark?: boolean;
  isLight?: boolean;
}

const MONOCHROME_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#000000', isDark: true },
  { name: 'Charcoal', hex: '#374151', isDark: true },
  { name: 'Muted Slate', hex: '#64748b' },
  { name: 'Silver Gray', hex: '#cbd5e1', isLight: true },
  { name: 'Pure White', hex: '#ffffff', isLight: true },
];

const PUBLISHING_COLORS: ColorOption[] = [
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Coral Orange', hex: '#ea580c' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Emerald Green', hex: '#16a34a' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Deep Indigo', hex: '#4f46e5' },
  { name: 'Purple Amethyst', hex: '#9333ea' },
  { name: 'Rose Pink', hex: '#e11d48' },
  { name: 'Sepia Brown', hex: '#78350f' },
];

const PASTEL_COLORS: ColorOption[] = [
  { name: 'Soft Coral', hex: '#f87171' },
  { name: 'Soft Peach', hex: '#fb923c' },
  { name: 'Soft Amber', hex: '#facc15' },
  { name: 'Soft Mint', hex: '#4ade80' },
  { name: 'Soft Sky', hex: '#38bdf8' },
  { name: 'Soft Lavender', hex: '#a78bfa' },
  { name: 'Blossom Pink', hex: '#f472b6' },
  { name: 'Warm Sand', hex: '#a8a29e' },
];

function normalizeToHex(color: string): string {
  if (!color || color === 'auto') return 'auto';
  if (color.startsWith('#')) return color.toLowerCase();
  // Handle rgb(r, g, b)
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toLowerCase();
  }
  return color.toLowerCase();
}

export const TextColorPicker: React.FC<TextColorPickerProps> = ({
  isOpen,
  onToggle,
  onClose,
  activeTextColor,
  readerTheme,
  onSelectColor,
  onSetAuto,
  onTriggerMouseDown,
  popoverZIndex = 9999,
  buttonSize,
  iconSize = 16,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [customHex, setCustomHex] = useState<string>('#2563eb');
  const normalizedActive = normalizeToHex(activeTextColor);

  useEscapeKey(onClose, isOpen);

  const updatePopoverPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 240;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 10));
      setPopoverPos({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
      window.addEventListener('scroll', updatePopoverPosition, true);
      return () => {
        window.removeEventListener('resize', updatePopoverPosition);
        window.removeEventListener('scroll', updatePopoverPosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (normalizedActive !== 'auto' && normalizedActive.startsWith('#')) {
      setCustomHex(normalizedActive);
    }
  }, [normalizedActive]);

  const handleCustomApply = () => {
    let cleanHex = customHex.trim();
    if (!cleanHex.startsWith('#')) {
      cleanHex = `#${cleanHex}`;
    }
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleanHex)) {
      onSelectColor(cleanHex);
    }
  };

  const { customPaperTone } = useEpub();
  const isAuto = normalizedActive === 'auto';
  const isLightTone =
    readerTheme === 'light' ||
    readerTheme === 'sepia' ||
    (readerTheme === 'custom' && customPaperTone ? isColorLight(customPaperTone.paperColor) : false);

  const defaultAutoColor =
    readerTheme === 'custom' && customPaperTone
      ? customPaperTone.textColor
      : isLightTone
        ? '#18181b'
        : '#f4f4f6';

  const previewBarColor = isAuto ? defaultAutoColor : normalizedActive;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={`tool-btn ${isOpen ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault();
          onTriggerMouseDown?.(e);
        }}
        onClick={onToggle}
        title="Text Color"
        aria-label="Text Color"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          padding: '2px',
          width: buttonSize ? `${buttonSize}px` : undefined,
          height: buttonSize ? `${buttonSize}px` : undefined,
        }}
      >
        <Baseline size={iconSize} />
        <span
          className="text-color-indicator-bar"
          style={{
            width: iconSize >= 17 ? '16px' : '14px',
            height: iconSize >= 17 ? '3.5px' : '3px',
            borderRadius: '1px',
            backgroundColor: previewBarColor,
            boxShadow: '0 0 1px rgba(0,0,0,0.5)',
          }}
        />
      </button>

      {/* Popover rendered via React Portal directly into body to escape overflow clipping */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop to close on outside click */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: popoverZIndex - 1,
                background: 'transparent',
              }}
              onClick={onClose}
            />

            <div
              className="text-color-picker-popover"
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                zIndex: popoverZIndex,
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => {
                // Prevent losing text selection in the editor when clicking inside the popover
                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                  e.preventDefault();
                }
              }}
            >
              <div className="text-color-popover-header">
                <span className="text-color-popover-title">Text Color</span>
                <span className="text-color-popover-subtitle">
                  {isAuto ? 'Auto (Default)' : normalizedActive.toUpperCase()}
                </span>
              </div>

              {/* Auto Button */}
              <button
                type="button"
                className={`text-color-auto-btn ${isAuto ? 'active' : ''}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onSetAuto();
                  onClose();
                }}
                title="Automatic theme text color: adapts seamlessly to Dark, Light & Sepia modes"
              >
                <div className="text-color-auto-icon-badge">
                  <div className="text-color-auto-split-circle" />
                  <RotateCcw size={11} className="text-color-auto-reset-icon" />
                </div>
                <div className="text-color-auto-text">
                  <span className="text-color-auto-name">Auto</span>
                  <span className="text-color-auto-desc">
                    {isLightTone
                      ? 'Theme Default (Dark on light paper)'
                      : 'Theme Default (Light on dark paper)'}
                  </span>
                </div>
                {isAuto && <Check size={14} className="text-color-auto-check" />}
              </button>

              <div className="text-color-section-divider" />

              {/* Monochrome / Standard Row */}
              <div className="text-color-palette-label">Monochrome & Tone</div>
              <div className="text-color-swatch-row">
                {MONOCHROME_COLORS.map(color => {
                  const isSelected = normalizedActive === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      className={`text-color-swatch-btn ${color.isDark ? 'swatch-dark' : ''} ${color.isLight ? 'swatch-light' : ''
                        } ${isSelected ? 'selected' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelectColor(color.hex);
                        onClose();
                      }}
                      title={color.name}
                    >
                      {isSelected && (
                        <Check
                          size={12}
                          color={color.isLight ? '#09090b' : '#ffffff'}
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-color-section-divider" />

              {/* Publishing Palette Grid */}
              <div className="text-color-palette-label">Publishing Colors</div>
              <div className="text-color-swatch-grid">
                {PUBLISHING_COLORS.map(color => {
                  const isSelected = normalizedActive === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      className={`text-color-swatch-btn ${isSelected ? 'selected' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelectColor(color.hex);
                        onClose();
                      }}
                      title={color.name}
                    >
                      {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              {/* Soft Pastels */}
              <div className="text-color-palette-label" style={{ marginTop: '0.45rem' }}>
                Soft & Subtle Tones
              </div>
              <div className="text-color-swatch-grid">
                {PASTEL_COLORS.map(color => {
                  const isSelected = normalizedActive === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      className={`text-color-swatch-btn swatch-light ${isSelected ? 'selected' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onSelectColor(color.hex);
                        onClose();
                      }}
                      title={color.name}
                    >
                      {isSelected && <Check size={12} color="#18181b" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>

              <div className="text-color-section-divider" />

              {/* Custom Hex Color Picker */}
              <div className="text-color-custom-row">
                <div className="text-color-custom-input-wrap">
                  <input
                    type="color"
                    className="text-color-native-input"
                    value={customHex.startsWith('#') ? customHex : '#2563eb'}
                    onChange={e => {
                      setCustomHex(e.target.value);
                      onSelectColor(e.target.value);
                    }}
                    title="Choose custom color"
                  />
                  <input
                    type="text"
                    className="text-color-hex-text-input"
                    value={customHex}
                    onChange={e => setCustomHex(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomApply();
                        onClose();
                      }
                    }}
                    placeholder="#000000"
                    maxLength={7}
                    spellCheck={false}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    handleCustomApply();
                    onClose();
                  }}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
