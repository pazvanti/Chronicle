import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Expand,
  AlertTriangle,
  X,
} from 'lucide-react';

export interface ImageToolbarPosition {
  top: number;
  left: number;
  width: number;
}

interface ImageControlsToolbarProps {
  position: ImageToolbarPosition | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  currentAlign?: 'left' | 'center' | 'right' | 'full';
  currentWidthPercent?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onAlign: (align: 'left' | 'center' | 'right' | 'full') => void;
  onResize: (percent: number) => void;
}

export const ImageControlsToolbar: React.FC<ImageControlsToolbarProps> = ({
  position,
  canMoveUp,
  canMoveDown,
  currentAlign = 'center',
  onMoveUp,
  onMoveDown,
  onDelete,
  onAlign,
  onResize,
}) => {
  const { t } = useTranslation();
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Reset confirmation state whenever position changes
  useEffect(() => {
    setIsConfirmingDelete(false);
    setShowSizeMenu(false);
  }, [position?.top, position?.left]);

  // Auto-reset confirmation after 5 seconds of inactivity
  useEffect(() => {
    if (!isConfirmingDelete) return;
    const timer = setTimeout(() => {
      setIsConfirmingDelete(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isConfirmingDelete]);

  if (!position) return null;

  // If image top is near viewport header, display toolbar below image top
  const isNearTop = position.top < 85;
  const topCoord = isNearTop ? position.top + 12 : position.top - 12;
  const transform = isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirmingDelete(false);
    onDelete();
  };

  return (
    <div
      className="image-controls-toolbar"
      style={{
        position: 'fixed',
        left: `${position.left}px`,
        top: `${topCoord}px`,
        transform,
        zIndex: 1000,
      }}
      onMouseDown={e => {
        // Prevent clearing selection or focus in contentEditable
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Move Up */}
      <button
        type="button"
        className="tool-btn"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={!canMoveUp}
        title={`${t('imageToolbar.up')} (Alt+↑)`}
      >
        <ArrowUp size={15} />
        <span className="tool-btn-text">{t('imageToolbar.up')}</span>
      </button>

      {/* Move Down */}
      <button
        type="button"
        className="tool-btn"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={!canMoveDown}
        title={`${t('imageToolbar.down')} (Alt+↓)`}
      >
        <ArrowDown size={15} />
        <span className="tool-btn-text">{t('imageToolbar.down')}</span>
      </button>

      <div className="toolbar-separator" />

      {/* Alignment Options */}
      <button
        type="button"
        className={`tool-btn tool-btn-icon-only ${currentAlign === 'left' ? 'active' : ''}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onAlign('left');
        }}
        title={t('imageToolbar.alignLeft')}
      >
        <AlignLeft size={15} />
      </button>
      <button
        type="button"
        className={`tool-btn tool-btn-icon-only ${currentAlign === 'center' ? 'active' : ''}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onAlign('center');
        }}
        title={t('imageToolbar.alignCenter')}
      >
        <AlignCenter size={15} />
      </button>
      <button
        type="button"
        className={`tool-btn tool-btn-icon-only ${currentAlign === 'right' ? 'active' : ''}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onAlign('right');
        }}
        title={t('imageToolbar.alignRight')}
      >
        <AlignRight size={15} />
      </button>
      <button
        type="button"
        className={`tool-btn tool-btn-icon-only ${currentAlign === 'full' ? 'active' : ''}`}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onAlign('full');
        }}
        title={t('imageToolbar.fullWidth')}
      >
        <Maximize2 size={14} />
      </button>

      <div className="toolbar-separator" />

      {/* Quick Size Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="tool-btn"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setShowSizeMenu(prev => !prev);
          }}
          title={t('imageToolbar.size')}
          style={{ gap: '3px' }}
        >
          <Expand size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{t('imageToolbar.size')}</span>
        </button>

        {showSizeMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 1001 }}
              onClick={e => {
                e.stopPropagation();
                setShowSizeMenu(false);
              }}
            />
            <div
              className="popover-menu-card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1002,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '0.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: '100px',
              }}
              onClick={e => e.stopPropagation()}
            >
              {[
                { label: t('imageToolbar.sizeSmall'), val: 25 },
                { label: t('imageToolbar.sizeMedium'), val: 50 },
                { label: t('imageToolbar.sizeLarge'), val: 75 },
                { label: t('imageToolbar.sizeFull'), val: 100 },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    justifyContent: 'flex-start',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onClick={() => {
                    onResize(opt.val);
                    setShowSizeMenu(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="toolbar-separator" />

      {/* Delete Image with Confirmation */}
      {isConfirmingDelete ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <button
            type="button"
            className="tool-btn tool-btn-danger-confirm"
            onClick={handleConfirmDelete}
            title={t('imageToolbar.confirmDelete')}
          >
            <AlertTriangle size={13} />
            <span className="tool-btn-text">{t('imageToolbar.confirmDelete')}</span>
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-icon-only"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsConfirmingDelete(false);
            }}
            title={t('imageToolbar.cancel')}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="tool-btn tool-btn-danger"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsConfirmingDelete(true);
          }}
          title={`${t('imageToolbar.delete')} (Del / Backspace)`}
        >
          <Trash2 size={15} />
          <span className="tool-btn-text">{t('imageToolbar.delete')}</span>
        </button>
      )}
    </div>
  );
};
