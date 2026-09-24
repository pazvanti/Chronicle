import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { BookOpen, Sparkles, ChevronUp, Check, Search, X } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

export const GhostHud: React.FC = () => {
  const {
    book,
    isZenMode,
    setZenMode,
    activeChapter,
    setActiveChapterId,
    todayWordsCount,
    zenSettings,
  } = useEpub();
  const { t } = useTranslation();

  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isChapterMenuOpen, setIsChapterMenuOpen] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [chapterSearch, setChapterSearch] = useState<string>('');

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menuCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const isMenuOpenRef = useRef<boolean>(false);

  const clearMenuCloseTimer = () => {
    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    isHoveringRef.current = isHovering;
  }, [isHovering]);

  useEffect(() => {
    isMenuOpenRef.current = isChapterMenuOpen;
  }, [isChapterMenuOpen]);

  // Filter chapters based on quick search
  const filteredChapters = useMemo(() => {
    if (!book?.chapters) return [];
    if (!chapterSearch.trim()) return book.chapters;
    const q = chapterSearch.toLowerCase();
    return book.chapters.filter(ch => ch.title.toLowerCase().includes(q));
  }, [book?.chapters, chapterSearch]);

  useEffect(() => {
    if (!isZenMode || !zenSettings.ghostHud) {
      return;
    }

    // Show initially when entering Zen mode, then fade out after 3.5s if not hovering
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isHoveringRef.current && !isMenuOpenRef.current) {
        setIsVisible(false);
      }
    }, 3500);

    const handleMouseMove = () => {
      setIsVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (!isHoveringRef.current && !isMenuOpenRef.current) {
          setIsVisible(false);
        }
      }, 3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // If chapter menu is open and Escape is pressed, close chapter menu first
      if (e.key === 'Escape' && isMenuOpenRef.current) {
        e.stopPropagation();
        setIsChapterMenuOpen(false);
        clearMenuCloseTimer();
        return;
      }

      // Don't hide if pressing Escape or modifier keys alone
      if (e.key === 'Escape' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift') {
        return;
      }

      // Instantly fade out HUD and close menu as soon as typing begins
      setIsChapterMenuOpen(false);
      setIsVisible(false);
      clearMenuCloseTimer();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      clearMenuCloseTimer();
    };
  }, [isZenMode, zenSettings.ghostHud]);

  if (!isZenMode || !zenSettings.ghostHud || !book) {
    return null;
  }

  return (
    <div
      className={`ghost-hud-container ${isVisible ? 'visible' : 'hidden'} ${isHovering ? 'hovered' : 'translucent'}`}
      onMouseEnter={() => {
        setIsHovering(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
        if (isChapterMenuOpen) {
          clearMenuCloseTimer();
          menuCloseTimerRef.current = setTimeout(() => {
            setIsChapterMenuOpen(false);
          }, 600);
        }
      }}
      aria-label="Zen Mode Quick Status"
    >
      {/* Chapter Dropdown Popover (Floating above HUD) */}
      {isChapterMenuOpen && (
        <div
          className="ghost-chapter-popover"
          onMouseEnter={clearMenuCloseTimer}
          onMouseLeave={() => {
            clearMenuCloseTimer();
            menuCloseTimerRef.current = setTimeout(() => {
              setIsChapterMenuOpen(false);
            }, 600);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header with Search */}
          <div className="ghost-chapter-header">
            <div className="ghost-chapter-search-box">
              <Search size={13} className="ghost-chapter-search-icon" />
              <input
                type="text"
                className="ghost-chapter-search-input"
                placeholder={t('zen.searchChapters')}
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                autoFocus
              />
              {chapterSearch && (
                <button
                  type="button"
                  className="ghost-chapter-search-clear"
                  onClick={() => setChapterSearch('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Chapters Scrollable List */}
          <div className="ghost-chapter-list">
            {filteredChapters.length === 0 ? (
              <div className="ghost-chapter-empty">
                {t('zen.noChaptersFound')}
              </div>
            ) : (
              filteredChapters.map((ch, index) => {
                const isActive = ch.id === activeChapter?.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`ghost-chapter-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChapterId(ch.id);
                      setIsChapterMenuOpen(false);
                      setChapterSearch('');
                    }}
                  >
                    <div className="ghost-chapter-item-left">
                      <span className="ghost-chapter-number">{index + 1}.</span>
                      <span className="ghost-chapter-item-title">
                        {ch.title || `${t('statusBar.activeChapter')} ${index + 1}`}
                      </span>
                    </div>
                    <div className="ghost-chapter-item-right">
                      <span className="ghost-chapter-words">
                        {ch.wordCount.toLocaleString()} w
                      </span>
                      {isActive && <Check size={12} className="ghost-chapter-active-check" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Floating Capsule HUD */}
      <div
        className="ghost-hud"
        role="toolbar"
        aria-label="Zen Mode Ghost HUD"
      >
        {/* Interactive Translucent Chapter Trigger */}
        <div
          className={`ghost-hud-section ghost-hud-chapter ghost-hud-interactive ${isChapterMenuOpen ? 'active' : ''}`}
          onMouseEnter={() => {
            setIsChapterMenuOpen(true);
            clearMenuCloseTimer();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsChapterMenuOpen(prev => {
              const next = !prev;
              if (!next) clearMenuCloseTimer();
              return next;
            });
          }}
          title={t('zen.manuscript')}
        >
          <BookOpen size={14} className="ghost-hud-icon" />
          <span className="ghost-hud-text">
            {activeChapter?.title || t('zen.manuscript')}
          </span>
          <ChevronUp
            size={12}
            className={`ghost-hud-chevron ${isChapterMenuOpen ? 'rotated' : ''}`}
          />
        </div>

        <div className="ghost-hud-divider" />

        {/* Session Words Written Today */}
        <div className="ghost-hud-section ghost-hud-words">
          <Sparkles size={13} className="ghost-hud-sparkle-icon" />
          <span>
            {`+${todayWordsCount.toLocaleString()} ${t('zen.words')} ${t('zen.today')}`}
          </span>
        </div>

        <div className="ghost-hud-divider" />

        {/* Exit Button */}
        <button
          type="button"
          className="ghost-hud-exit-btn"
          onClick={() => setZenMode(false)}
          title={t('zen.exitZen')}
        >
          <span>{t('zen.exitZen').split(' (')[0]}</span>
          <kbd className="ghost-kbd">Esc</kbd>
        </button>
      </div>
    </div>
  );
};
