import React, { useState, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Sparkles,
  X,
  Quote,
  Minus,
  MoreHorizontal,
  Trash2,
  Space,
  Type,
  BookOpen,
} from 'lucide-react';
import {
  TypographyOptions,
  DEFAULT_TYPOGRAPHY_OPTIONS,
  cleanChapterContent,
} from '../../services/epub/typographyUtils';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface TypographyModalProps {
  onClose: () => void;
}

export const TypographyModal: React.FC<TypographyModalProps> = ({ onClose }) => {
  const {
    book,
    activeChapter,
    updateChapterContent,
    showNotification,
  } = useEpub();

  useEscapeKey(onClose);

  const [options, setOptions] = useState<TypographyOptions>(DEFAULT_TYPOGRAPHY_OPTIONS);
  const [scope, setScope] = useState<'current' | 'all'>('current');

  // Preview cleaned content on active chapter
  const previewResult = useMemo(() => {
    if (!activeChapter) return null;
    return cleanChapterContent(activeChapter.content, options);
  }, [activeChapter, options]);

  if (!book || !activeChapter) return null;

  const toggleOption = (key: keyof TypographyOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyCleanup = () => {
    if (scope === 'current') {
      if (previewResult) {
        updateChapterContent(activeChapter.id, previewResult.cleaned);
        const fixedTotal =
          (previewResult.stats.smartQuotesFixed || 0) +
          (previewResult.stats.emDashesFixed || 0) +
          (previewResult.stats.ellipsesFixed || 0) +
          (previewResult.stats.blankParagraphsRemoved || 0) +
          (previewResult.stats.spacesFixed || 0);

        showNotification(
          'success',
          `Cleaned typography in "${activeChapter.title}" (${fixedTotal} improvements applied)!`
        );
        onClose();
      }
    } else {
      // Clean all chapters in the book
      let totalQuotes = 0;
      let totalDashes = 0;
      let totalEllipses = 0;
      let totalBlanks = 0;
      let totalSpaces = 0;

      book.chapters.forEach(ch => {
        const res = cleanChapterContent(ch.content, options);
        updateChapterContent(ch.id, res.cleaned);
        totalQuotes += res.stats.smartQuotesFixed || 0;
        totalDashes += res.stats.emDashesFixed || 0;
        totalEllipses += res.stats.ellipsesFixed || 0;
        totalBlanks += res.stats.blankParagraphsRemoved || 0;
        totalSpaces += res.stats.spacesFixed || 0;
      });

      const grandTotal = totalQuotes + totalDashes + totalEllipses + totalBlanks + totalSpaces;
      showNotification(
        'success',
        `Cleaned typography across all ${book.chapters.length} chapters (${grandTotal} total fixes)!`
      );
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="modal-title">Smart Typography & Cleanup</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Enhance punctuation, smart quotes, dashes, spacing, and formatting
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '1.2rem' }}>
          {/* Target Scope Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`view-tab-btn ${scope === 'current' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setScope('current')}
            >
              <span>Current Chapter: "{activeChapter.title.substring(0, 24)}..."</span>
            </button>
            <button
              className={`view-tab-btn ${scope === 'all' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setScope('all')}
            >
              <BookOpen size={15} />
              <span>Entire Book ({book.chapters.length} Chapters)</span>
            </button>
          </div>

          {/* Cleanup Rule Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.smartQuotes ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.smartQuotes}
                onChange={() => toggleOption('smartQuotes')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <Quote size={16} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Smart Curly Quotes</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>"..." ➔ “...” and '...' ➔ ‘...’</div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.emDashes ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.emDashes}
                onChange={() => toggleOption('emDashes')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <Minus size={16} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Typographic Em-Dashes</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>-- or --- ➔ —</div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.ellipses ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.ellipses}
                onChange={() => toggleOption('ellipses')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <MoreHorizontal size={16} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>True Ellipses</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>... ➔ …</div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.removeBlankParagraphs ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.removeBlankParagraphs}
                onChange={() => toggleOption('removeBlankParagraphs')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <Trash2 size={16} color="var(--accent-danger)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Remove Empty Paragraphs</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Strip empty &lt;p&gt;&amp;nbsp;&lt;/p&gt;</div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.cleanSpaces ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.cleanSpaces}
                onChange={() => toggleOption('cleanSpaces')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <Space size={16} color="var(--accent-warning)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Normalize Spacing</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fix double spaces & misplaced spaces</div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: `1px solid ${options.addDropCaps ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={options.addDropCaps}
                onChange={() => toggleOption('addDropCaps')}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <Type size={16} color="var(--accent-secondary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Chapter Drop Caps</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Style initial letter of first paragraph</div>
              </div>
            </label>
          </div>

          {/* Stats on Current Chapter */}
          {previewResult && (
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Found in Active Chapter:
              </div>
              <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                <span>Quotes: <strong style={{ color: 'var(--accent-primary)' }}>{previewResult.stats.smartQuotesFixed}</strong></span>
                <span>Dashes: <strong style={{ color: 'var(--accent-primary)' }}>{previewResult.stats.emDashesFixed}</strong></span>
                <span>Ellipses: <strong style={{ color: 'var(--accent-primary)' }}>{previewResult.stats.ellipsesFixed}</strong></span>
                <span>Empty Lines: <strong style={{ color: 'var(--accent-danger)' }}>{previewResult.stats.blankParagraphsRemoved}</strong></span>
                <span>Spaces: <strong style={{ color: 'var(--accent-warning)' }}>{previewResult.stats.spacesFixed}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleApplyCleanup}>
            <Sparkles size={15} />
            <span>Apply Cleanup ({scope === 'current' ? 'Current Chapter' : 'Entire Book'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
