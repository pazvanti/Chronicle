import React, { useState, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { Scissors, X, Heading, Search, ArrowRight } from 'lucide-react';
import { extractHeadings } from '../../services/epub/htmlUtils';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useTranslation } from '../../i18n/I18nContext';

interface SplitChapterModalProps {
  onClose: () => void;
  prefillText?: string;
}

export const SplitChapterModal: React.FC<SplitChapterModalProps> = ({ onClose, prefillText }) => {
  const { activeChapter, splitCurrentChapter, splitAtHeading } = useEpub();
  const { t } = useTranslation();

  useEscapeKey(onClose);

  const [mode, setMode] = useState<'heading' | 'text'>('heading');
  const [selectedHeadingIndex, setSelectedHeadingIndex] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>(prefillText || '');
  const [newChapterTitle, setNewChapterTitle] = useState<string>(t('sidebar.addChapter'));

  // Extract headings from active chapter
  const headings = useMemo(() => {
    if (!activeChapter) return [];
    return extractHeadings(activeChapter.content);
  }, [activeChapter]);

  // If prefilled text exists, default to 'text' mode
  React.useEffect(() => {
    if (prefillText) {
      setMode('text');
      setSearchText(prefillText);
      setNewChapterTitle(prefillText.substring(0, 30) + '...');
    }
  }, [prefillText]);

  // Compute text preview split
  const textSplitPreview = useMemo(() => {
    if (!activeChapter || !searchText || !activeChapter.content.includes(searchText)) {
      return null;
    }
    const idx = activeChapter.content.indexOf(searchText);
    const part1 = activeChapter.content.substring(0, idx);
    const part2 = activeChapter.content.substring(idx);
    return { part1, part2 };
  }, [activeChapter, searchText]);

  const handleExecuteSplit = () => {
    if (!activeChapter) return;
    if (mode === 'heading') {
      if (headings.length > 0 && selectedHeadingIndex >= 0 && selectedHeadingIndex < headings.length) {
        const h = headings[selectedHeadingIndex];
        const titleToUse = newChapterTitle.trim() || h.text || t('sidebar.addChapter');
        splitAtHeading(activeChapter.id, selectedHeadingIndex, titleToUse);
        onClose();
      }
    } else if (mode === 'text') {
      if (textSplitPreview) {
        splitCurrentChapter(textSplitPreview.part1, textSplitPreview.part2, newChapterTitle.trim() || t('sidebar.addChapter'));
        onClose();
      }
    }
  };

  if (!activeChapter) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors size={18} />
            </div>
            <div>
              <h2 className="modal-title">{t('splitModal.title')}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('splitModal.subtitle', { title: activeChapter.title })}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Method Selection */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`view-tab-btn ${mode === 'heading' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setMode('heading')}
            >
              <Heading size={15} />
              <span>{t('splitModal.tabHeading', { count: headings.length })}</span>
            </button>
            <button
              className={`view-tab-btn ${mode === 'text' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setMode('text')}
            >
              <Search size={15} />
              <span>{t('splitModal.tabText')}</span>
            </button>
          </div>

          {/* Heading Mode */}
          {mode === 'heading' && (
            <div className="form-group">
              <label className="form-label">{t('splitModal.selectHeading')}</label>
              {headings.length === 0 ? (
                <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('splitModal.noHeadings')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {headings.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedHeadingIndex(i);
                        setNewChapterTitle(h.text);
                      }}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        background: selectedHeadingIndex === i ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                        border: `1px solid ${selectedHeadingIndex === i ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                          {h.tag.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{h.text}</span>
                      </div>
                      {selectedHeadingIndex === i && <ArrowRight size={15} color="var(--accent-primary)" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Marker Mode */}
          {mode === 'text' && (
            <div className="form-group">
              <label className="form-label">{t('splitModal.searchPhrase')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('splitModal.placeholderSearch')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />

              {searchText && (
                <div style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
                  {textSplitPreview ? (
                    <span style={{ color: 'var(--accent-success)' }}>{t('splitModal.foundMatch')}</span>
                  ) : (
                    <span style={{ color: 'var(--accent-danger)' }}>{t('splitModal.notFound')}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Chapter Title Input */}
          <div className="form-group">
            <label className="form-label">{t('splitModal.newChapterTitle')}</label>
            <input
              type="text"
              className="form-input"
              value={newChapterTitle}
              onChange={e => setNewChapterTitle(e.target.value)}
              placeholder="e.g. Chapter 2: The Pool of Tears"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExecuteSplit}
            disabled={
              (mode === 'heading' && headings.length === 0) ||
              (mode === 'text' && !textSplitPreview)
            }
          >
            <Scissors size={15} />
            <span>{t('splitModal.confirmSplit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
