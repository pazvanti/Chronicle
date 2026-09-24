import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { BookOpen, Check, Search, X, Layers } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

export const ZenLeftChapterMenu: React.FC = () => {
  const {
    book,
    isZenMode,
    activeChapter,
    setActiveChapterId,
    zenSettings,
  } = useEpub();
  const { t } = useTranslation();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = useRef<boolean>(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  const filteredChapters = useMemo(() => {
    if (!book?.chapters) return [];
    if (!searchQuery.trim()) return book.chapters;
    const q = searchQuery.toLowerCase();
    return book.chapters.filter(ch => ch.title.toLowerCase().includes(q));
  }, [book?.chapters, searchQuery]);

  useEffect(() => {
    if (!isZenMode || !zenSettings.ghostHud) {
      return;
    }

    // Show initially when entering Zen mode, then fade out after 3.5s if not hovered
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) {
        setIsVisible(false);
      }
    }, 3500);

    const handleMouseMove = () => {
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (!isHoveredRef.current) {
          setIsVisible(false);
        }
      }, 3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hide if pressing Escape or modifier keys alone
      if (e.key === 'Escape' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') {
        return;
      }

      // Instantly fade out as soon as typing begins
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
  }, [isZenMode, zenSettings.ghostHud]);

  if (!isZenMode || !zenSettings.ghostHud || !book || book.chapters.length === 0) {
    return null;
  }

  return (
    <aside
      className={`zen-left-chapter-menu ${isVisible ? 'visible' : 'hidden'} ${isHovered ? 'hovered' : 'translucent'}`}
      onMouseEnter={() => {
        setIsHovered(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2500);
      }}
      aria-label="Zen Mode Chapter Navigator"
    >
      {/* Header */}
      <div className="zen-left-menu-header">
        <div className="zen-left-menu-title-wrap">
          <BookOpen size={14} className="zen-left-menu-icon" />
          <span className="zen-left-menu-title">{t('zen.manuscript')}</span>
        </div>
        <span className="zen-left-menu-count">
          {book.chapters.length} ch
        </span>
      </div>

      {/* Search Input when more than 5 chapters */}
      {book.chapters.length > 5 && (
        <div className="zen-left-search-wrap">
          <Search size={12} className="zen-left-search-icon" />
          <input
            type="text"
            className="zen-left-search-input"
            placeholder={t('zen.searchChapters')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="zen-left-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Chapter List */}
      <div className="zen-left-menu-list">
        {filteredChapters.map((ch, index) => {
          const isActive = ch.id === activeChapter?.id;
          return (
            <button
              key={ch.id}
              type="button"
              className={`zen-left-chapter-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveChapterId(ch.id);
                setSearchQuery('');
              }}
              title={ch.title || `${t('statusBar.activeChapter')} ${index + 1}`}
            >
              <div className="zen-left-item-left">
                <span className="zen-left-chapter-num">{index + 1}.</span>
                <span className="zen-left-chapter-text">
                  {ch.title || `${t('statusBar.activeChapter')} ${index + 1}`}
                </span>
              </div>
              <div className="zen-left-item-right">
                <span className="zen-left-chapter-words">
                  {ch.wordCount.toLocaleString()} w
                </span>
                {isActive && <Check size={12} className="zen-left-active-check" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Subtle Footer */}
      <div className="zen-left-menu-footer">
        <Layers size={11} />
        <span>Zen Navigator</span>
      </div>
    </aside>
  );
};
