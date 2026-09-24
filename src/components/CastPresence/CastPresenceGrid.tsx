import React, { useState, useEffect, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  CastPresenceEntity,
  CastPresenceChapterSummary,
  EntityChapterPresence,
} from '../../types/project';
import { PresenceExcerptModal } from './PresenceExcerptModal';
import { CharacterDetailModal } from '../Characters/CharacterDetailModal';
import { LocationDetailModal } from '../Locations/LocationDetailModal';
import {
  Users,
  Compass,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  Hash,
  Circle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Activity,
  Award,
  Zap,
  ArrowLeft,
  Edit3,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

export const CastPresenceGrid: React.FC = () => {
  const {
    book,
    castPresenceData,
    isPresenceCacheValid,
    isPresenceAnalyzing,
    presenceProgress,
    runCastPresenceAnalysis,
    characters,
    locations,
    setActiveChapterId,
    setViewMode,
    addCharacter,
  } = useEpub();
  const { t } = useTranslation();

  // Filters & display preferences
  const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | 'character' | 'location'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'default' | 'mentions' | 'alphabetical'>('default');
  const [displayMode, setDisplayMode] = useState<'heatmap' | 'counts' | 'dots'>('heatmap');

  // Interactive selection state
  const [selectedCell, setSelectedCell] = useState<{
    presence: EntityChapterPresence;
    entity: CastPresenceEntity;
    chapter: CastPresenceChapterSummary;
  } | null>(null);

  // Deep dive profile modal states
  const [modalCharacterId, setModalCharacterId] = useState<string | null>(null);
  const [modalLocationId, setModalLocationId] = useState<string | null>(null);

  // Hover states for row/column crosshair highlighting
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [hoveredChapterId, setHoveredChapterId] = useState<string | null>(null);

  // Automatically trigger analysis on mount if no cached data or cache is invalid
  useEffect(() => {
    if (!castPresenceData || !isPresenceCacheValid) {
      runCastPresenceAnalysis();
    }
  }, [castPresenceData, isPresenceCacheValid, runCastPresenceAnalysis]);

  // Unique roles / types for filter dropdown
  const uniqueRoles = useMemo(() => {
    if (!castPresenceData) return [];
    const roles = new Set<string>();
    castPresenceData.entities.forEach(e => {
      if (e.roleOrType) roles.add(e.roleOrType);
    });
    return Array.from(roles).sort();
  }, [castPresenceData]);

  // Filter and sort entities for the Y-axis
  const filteredEntities = useMemo(() => {
    if (!castPresenceData) return [];
    let list = [...castPresenceData.entities];

    // Filter by type (Characters vs Locations vs All)
    if (entityTypeFilter !== 'all') {
      list = list.filter(e => e.type === entityTypeFilter);
    }

    // Filter by role
    if (roleFilter !== 'all') {
      list = list.filter(e => e.roleOrType === roleFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.aliases.some(a => a.toLowerCase().includes(q)) ||
          e.roleOrType.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortMode === 'mentions') {
      list.sort((a, b) => b.totalMentions - a.totalMentions);
    } else if (sortMode === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [castPresenceData, entityTypeFilter, roleFilter, searchQuery, sortMode]);

  // Analytics Metrics Calculation
  const analytics = useMemo(() => {
    if (!castPresenceData || castPresenceData.chapters.length === 0) return null;

    const totalChapters = castPresenceData.chapters.length;
    const totalEntities = castPresenceData.entities.length;

    // Chapters with at least 1 entity present
    const coveredChapters = castPresenceData.chapters.filter(c => c.distinctEntitiesCount > 0).length;
    const coveragePercent = Math.round((coveredChapters / totalChapters) * 100);

    // Most present entity
    const topEntity = [...castPresenceData.entities].sort((a, b) => b.totalMentions - a.totalMentions)[0] || null;

    // Most populated chapter (ensemble climax)
    const peakChapter = [...castPresenceData.chapters].sort((a, b) => b.distinctEntitiesCount - a.distinctEntitiesCount)[0] || null;

    // Total occurrences across whole book
    const totalMentionsAll = castPresenceData.entities.reduce((acc, e) => acc + e.totalMentions, 0);

    return {
      totalChapters,
      totalEntities,
      coveragePercent,
      topEntity,
      peakChapter,
      totalMentionsAll,
    };
  }, [castPresenceData]);

  // Handle Export to CSV
  const handleExportCsv = () => {
    if (!castPresenceData) return;

    const headerRow = ['Entity Name', 'Type', 'Role / Category', 'Total Mentions', ...castPresenceData.chapters.map(c => `"${c.title.replace(/"/g, '""')}"`)];
    const rows = castPresenceData.entities.map(e => {
      const chapterCounts = castPresenceData.chapters.map(c => {
        const pres = castPresenceData.presenceMap[`${e.id}::${c.id}`];
        return pres ? pres.count : 0;
      });
      return [
        `"${e.name.replace(/"/g, '""')}"`,
        e.type,
        `"${e.roleOrType.replace(/"/g, '""')}"`,
        e.totalMentions,
        ...chapterCounts,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${book?.metadata.title || 'Manuscript'}_Cast_Presence_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick cell click handler
  const handleCellClick = (entity: CastPresenceEntity, chapter: CastPresenceChapterSummary) => {
    if (!castPresenceData) return;
    const pres = castPresenceData.presenceMap[`${entity.id}::${chapter.id}`];
    if (pres && pres.count > 0) {
      setSelectedCell({
        presence: pres,
        entity,
        chapter,
      });
    }
  };

  // Jump to chapter in Editor directly from column header
  const handleChapterHeaderClick = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setViewMode('editor');
  };

  // Open entity details card
  const handleEntityHeaderClick = (entity: CastPresenceEntity) => {
    if (entity.type === 'character') {
      setModalCharacterId(entity.id);
    } else {
      setModalLocationId(entity.id);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Loading / Wait Time Radar Scanning HUD
  // ---------------------------------------------------------------------------
  if (isPresenceAnalyzing || (!castPresenceData && (characters.length > 0 || locations.length > 0))) {
    const percent = presenceProgress?.percent || 0;
    return (
      <div className="cast-presence-container">
        <div className="presence-scanning-screen">
          <div className="presence-radar-wrapper">
            <div className="presence-radar-ring ring-1" />
            <div className="presence-radar-ring ring-2" />
            <div className="presence-radar-ring ring-3" />
            <div className="presence-radar-sweep" />
            <div className="presence-radar-core">
              <Activity size={28} className="animate-pulse" color="var(--accent-primary)" />
            </div>
          </div>

          <div className="presence-scanning-info">
            <h2 className="presence-scanning-title">{t('castPresence.analyzing')}</h2>
            <p className="presence-scanning-subtitle">
              {t('castPresence.subtitle')}
            </p>

            {/* Scanning Progress Bar */}
            <div className="presence-progress-track">
              <div
                className="presence-progress-fill"
                style={{ width: `${Math.max(5, percent)}%` }}
              />
            </div>

            <div className="presence-progress-labels">
              <span className="presence-step-text">
                {presenceProgress?.chapterTitle
                  ? `${presenceProgress.chapterTitle}`
                  : t('common.loading')}
              </span>
              <span className="presence-percent-text">{percent}%</span>
            </div>

            <div className="presence-scan-entities-badge">
              <Users size={14} />
              <span>{characters.length} {t('subNav.characters')}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <Compass size={14} />
              <span>{locations.length} {t('subNav.locations')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Empty State: No Characters or Locations in Manuscript
  // ---------------------------------------------------------------------------
  if (characters.length === 0 && locations.length === 0) {
    return (
      <div className="cast-presence-container">
        <div className="presence-empty-wrapper">
          <div className="presence-empty-card">
            <div className="presence-empty-icon-halo">
              <Users size={32} color="var(--accent-primary)" />
            </div>
            <h3 className="presence-empty-title">{t('characters.emptyTitle')}</h3>
            <p className="presence-empty-desc">
              {t('characters.emptyDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addCharacter({ name: t('characters.roles.protagonist'), role: 'Protagonist' });
                  setViewMode('editor');
                }}
              >
                <Users size={16} />
                <span>{t('characters.addCharacter')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Render Presence Grid View
  // ---------------------------------------------------------------------------
  return (
    <div className="cast-presence-container">
      {/* Top Header / Studio Toolbar */}
      <div className="presence-studio-toolbar">
        {/* Left Side: Title & Scope Segmented Control */}
        <div className="presence-toolbar-left">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setViewMode('editor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              color: 'var(--text-secondary)',
            }}
            title={t('header.writeMode')}
          >
            <ArrowLeft size={14} />
            <Edit3 size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>{t('header.writeMode')}</span>
          </button>

          <div className="presence-brand-group">
            <div className="presence-brand-icon">
              <Layers size={18} />
            </div>
            <div>
              <div className="presence-brand-heading">{t('castPresence.title')}</div>
              <div className="presence-brand-subheading">
                {castPresenceData?.chapters.length || 0} {t('statusBar.chapterCountPlural')} × {castPresenceData?.entities.length || 0} {t('castPresence.totalEntities')}
              </div>
            </div>
          </div>

          <div className="presence-filter-tabs">
            <button
              className={`presence-tab-btn ${entityTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setEntityTypeFilter('all')}
            >
              <span>{t('castPresence.filterAll')}</span>
              <span className="presence-tab-count">{castPresenceData?.entities.length || 0}</span>
            </button>
            <button
              className={`presence-tab-btn ${entityTypeFilter === 'character' ? 'active' : ''}`}
              onClick={() => setEntityTypeFilter('character')}
            >
              <Users size={13} />
              <span>{t('castPresence.filterCharacters')}</span>
              <span className="presence-tab-count">
                {castPresenceData?.entities.filter(e => e.type === 'character').length || 0}
              </span>
            </button>
            <button
              className={`presence-tab-btn ${entityTypeFilter === 'location' ? 'active' : ''}`}
              onClick={() => setEntityTypeFilter('location')}
            >
              <Compass size={13} />
              <span>{t('castPresence.filterLocations')}</span>
              <span className="presence-tab-count">
                {castPresenceData?.entities.filter(e => e.type === 'location').length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Right Side: Search, Controls, Cache Status & Re-Analyze */}
        <div className="presence-toolbar-right">
          {/* Quick Search */}
          <div className="presence-search-input-wrapper">
            <Search size={14} className="presence-search-icon" />
            <input
              type="text"
              className="presence-search-input"
              placeholder={t('castPresence.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="presence-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Role Filter Dropdown */}
          {uniqueRoles.length > 0 && (
            <div className="presence-dropdown-group">
              <Filter size={13} color="var(--text-muted)" />
              <select
                className="presence-select-control"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles & Types</option>
                {uniqueRoles.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="presence-dropdown-group">
            <ArrowUpDown size={13} color="var(--text-muted)" />
            <select
              className="presence-select-control"
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
            >
              <option value="default">{t('castPresence.sortDefault')}</option>
              <option value="mentions">{t('castPresence.sortMentions')}</option>
              <option value="alphabetical">{t('castPresence.sortAlphabetical')}</option>
            </select>
          </div>

          {/* Display Mode Switcher */}
          <div className="presence-display-switcher">
            <button
              className={`presence-display-btn ${displayMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setDisplayMode('heatmap')}
              title={t('castPresence.modeHeatmap')}
            >
              <Sparkles size={13} />
              <span>{t('castPresence.modeHeatmap')}</span>
            </button>
            <button
              className={`presence-display-btn ${displayMode === 'counts' ? 'active' : ''}`}
              onClick={() => setDisplayMode('counts')}
              title={t('castPresence.modeCounts')}
            >
              <Hash size={13} />
              <span>{t('castPresence.modeCounts')}</span>
            </button>
            <button
              className={`presence-display-btn ${displayMode === 'dots' ? 'active' : ''}`}
              onClick={() => setDisplayMode('dots')}
              title={t('castPresence.modeDots')}
            >
              <Circle size={13} />
              <span>{t('castPresence.modeDots')}</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            className="btn btn-ghost btn-sm presence-action-btn"
            onClick={handleExportCsv}
            title={t('common.export')}
          >
            <FileSpreadsheet size={14} />
            <span>CSV</span>
          </button>

          {/* Cache Status & Re-Analyze Action */}
          <div className="presence-cache-indicator">
            {isPresenceCacheValid ? (
              <span className="presence-cache-badge cached">
                <CheckCircle2 size={12} />
                <span>{t('common.ready')}</span>
              </span>
            ) : (
              <span className="presence-cache-badge stale">
                <AlertCircle size={12} />
                <span>{t('statusBar.unsavedChanges')}</span>
              </span>
            )}

            <button
              className="btn btn-sm btn-outline presence-reanalyze-btn"
              onClick={() => runCastPresenceAnalysis(true)}
              title={t('castPresence.reanalyze')}
            >
              <RefreshCw size={13} />
              <span>{t('castPresence.reanalyze')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      {analytics && (
        <div className="presence-analytics-banner">
          <div className="presence-metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={16} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.totalEntities}</div>
              <div className="metric-label">{t('castPresence.totalEntities')}</div>
            </div>
          </div>

          <div className="presence-metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <BookOpen size={16} />
            </div>
            <div className="metric-data">
              <div className="metric-value">{analytics.coveragePercent}%</div>
              <div className="metric-label">{t('castPresence.subtitle')}</div>
            </div>
          </div>

          {analytics.topEntity && (
            <div className="presence-metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}>
                <Award size={16} />
              </div>
              <div className="metric-data">
                <div className="metric-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {analytics.topEntity.name}
                  </span>
                  <span className="metric-pill">{analytics.topEntity.totalMentions} {t('characters.totalMentions')}</span>
                </div>
                <div className="metric-label">({analytics.topEntity.chaptersPresentCount} {t('statusBar.chapterCountPlural')})</div>
              </div>
            </div>
          )}

          {analytics.peakChapter && (
            <div className="presence-metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <Zap size={16} />
              </div>
              <div className="metric-data">
                <div className="metric-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {analytics.peakChapter.title}
                  </span>
                  <span className="metric-pill">{analytics.peakChapter.distinctEntitiesCount} cast</span>
                </div>
                <div className="metric-label">{t('castPresence.title')}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Way Scrollable Matrix Table */}
      <div className="presence-matrix-viewport">
        <div className="presence-table-wrapper">
          <table className="presence-table">
            {/* Table Header: Sticky X-Axis (Chapters) */}
            <thead>
              <tr>
                {/* Top-Left Corner Anchor */}
                <th className="presence-corner-cell">
                  <div className="corner-content">
                    <span className="corner-title">{t('castPresence.totalEntities')}</span>
                    <span className="corner-count">({filteredEntities.length})</span>
                  </div>
                </th>

                {/* Chapter Columns */}
                {castPresenceData?.chapters.map(ch => {
                  const isHovered = hoveredChapterId === ch.id;
                  return (
                    <th
                      key={ch.id}
                      className={`presence-chapter-header-cell ${isHovered ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredChapterId(ch.id)}
                      onMouseLeave={() => setHoveredChapterId(null)}
                      onClick={() => handleChapterHeaderClick(ch.id)}
                      title={`${ch.title} (${ch.wordCount.toLocaleString()} ${t('statusBar.words')})`}
                    >
                      <div className="chapter-header-content">
                        <div className="chapter-title-text">{ch.title}</div>
                        <div className="chapter-meta-line">
                          <span>{ch.wordCount}w</span>
                          {ch.distinctEntitiesCount > 0 && (
                            <span className="chapter-cast-badge">
                              {ch.distinctEntitiesCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body: Sticky Y-Axis (Entities) + Matrix Cells */}
            <tbody>
              {filteredEntities.length === 0 ? (
                <tr>
                  <td
                    colSpan={(castPresenceData?.chapters.length || 0) + 1}
                    style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    {t('castPresence.noData')}
                  </td>
                </tr>
              ) : (
                filteredEntities.map(entity => {
                  const isRowHovered = hoveredEntityId === entity.id;
                  const isChar = entity.type === 'character';

                  return (
                    <tr
                      key={entity.id}
                      className={`presence-row ${isRowHovered ? 'row-hovered' : ''}`}
                      onMouseEnter={() => setHoveredEntityId(entity.id)}
                      onMouseLeave={() => setHoveredEntityId(null)}
                    >
                      {/* Sticky Y-Axis Entity Cell */}
                      <th
                        className="presence-entity-header-cell"
                        onClick={() => handleEntityHeaderClick(entity)}
                        title={`Click to view ${entity.name}'s profile`}
                      >
                        <div className="entity-header-content">
                          <div
                            className="entity-avatar-chip"
                            style={{
                              backgroundColor: entity.color || (isChar ? '#3b82f6' : '#10b981'),
                              boxShadow: `0 0 10px ${entity.color}30`,
                            }}
                          >
                            {isChar ? <Users size={12} /> : <Compass size={12} />}
                          </div>

                          <div className="entity-text-group">
                            <div className="entity-name-row">
                              <span className="entity-name-text">{entity.name}</span>
                              <span className="entity-role-tag">{entity.roleOrType}</span>
                            </div>
                            <div className="entity-stats-subtext">
                              <span>{entity.totalMentions} mentions</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span>{entity.chaptersPresentCount} chs</span>
                            </div>
                          </div>
                        </div>
                      </th>

                      {/* Matrix Grid Cells across Chapters */}
                      {castPresenceData?.chapters.map(ch => {
                        const key = `${entity.id}::${ch.id}`;
                        const pres = castPresenceData.presenceMap[key];
                        const count = pres?.count || 0;
                        const isPresent = count > 0;
                        const isColHovered = hoveredChapterId === ch.id;

                        // Calculate visual intensity based on mention frequency
                        let intensityClass = 'absent';
                        if (count >= 8) intensityClass = 'high';
                        else if (count >= 3) intensityClass = 'medium';
                        else if (count >= 1) intensityClass = 'low';

                        const entityColor = entity.color || '#3b82f6';

                        return (
                          <td
                            key={ch.id}
                            className={`presence-cell ${isPresent ? 'present' : 'empty'} ${intensityClass} ${
                              isRowHovered ? 'cross-row' : ''
                            } ${isColHovered ? 'cross-col' : ''}`}
                            onClick={() => isPresent && handleCellClick(entity, ch)}
                            title={
                              isPresent
                                ? `${entity.name} in "${ch.title}"\n${count} ${
                                    count === 1 ? 'mention' : 'mentions'
                                  }\nClick to inspect excerpt quotes`
                                : `Not present in "${ch.title}"`
                            }
                          >
                            {isPresent ? (
                              <div
                                className={`cell-indicator-node mode-${displayMode} intensity-${intensityClass}`}
                                style={{
                                  '--node-color': entityColor,
                                  backgroundColor:
                                    displayMode === 'counts'
                                      ? `${entityColor}25`
                                      : `${entityColor}`,
                                  borderColor: entityColor,
                                  boxShadow:
                                    intensityClass === 'high'
                                      ? `0 0 14px ${entityColor}90, 0 0 4px ${entityColor}`
                                      : intensityClass === 'medium'
                                      ? `0 0 8px ${entityColor}60`
                                      : `0 0 4px ${entityColor}40`,
                                } as React.CSSProperties}
                              >
                                {displayMode === 'counts' && (
                                  <span
                                    className="cell-count-text"
                                    style={{ color: entityColor, fontWeight: 700 }}
                                  >
                                    {count}
                                  </span>
                                )}
                                {displayMode === 'heatmap' && count >= 5 && (
                                  <span className="cell-mini-count">{count}</span>
                                )}
                              </div>
                            ) : (
                              <div className="cell-absent-pip" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excerpt Modal / Occurrence Inspector Drawer */}
      <PresenceExcerptModal
        presence={selectedCell?.presence || null}
        entity={selectedCell?.entity || null}
        chapter={selectedCell?.chapter || null}
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        onOpenEntityDetail={(id, type) => {
          setSelectedCell(null);
          if (type === 'character') {
            setModalCharacterId(id);
          } else {
            setModalLocationId(id);
          }
        }}
      />

      {/* Deep-Dive Modals */}
      <CharacterDetailModal
        characterId={modalCharacterId}
        isOpen={!!modalCharacterId}
        onClose={() => setModalCharacterId(null)}
      />
      <LocationDetailModal
        locationId={modalLocationId}
        isOpen={!!modalLocationId}
        onClose={() => setModalLocationId(null)}
      />
    </div>
  );
};
