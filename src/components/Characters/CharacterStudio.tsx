import React, { useState, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { CHARACTER_PRESET_COLORS } from '../../types/project';
import {
  Users,
  Plus,
  Search,
  Trash2,
  CheckSquare,
  Square,
  ArrowLeft,
  LayoutGrid,
  Edit3,
  BookOpen,
  Target,
  Eye,
  FileText,
  Activity,
  Filter,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

const ROLE_OPTIONS = [
  'Protagonist',
  'Antagonist',
  'Supporting',
  'Deuteragonist',
  'Mentor',
  'Foil',
  'Love Interest',
  'Minor',
];

const PRESET_COLORS = CHARACTER_PRESET_COLORS;

const TRAIT_CATEGORIES = [
  { id: 'goal', label: 'Goal' },
  { id: 'personality', label: 'Personality' },
  { id: 'flaw', label: 'Flaw' },
  { id: 'habit', label: 'Habit' },
  { id: 'action', label: 'Key Action' },
  { id: 'custom', label: 'Custom' },
];

export const CharacterStudio: React.FC = () => {
  const {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    toggleCharacterTrait,
    addCharacterTrait,
    removeCharacterTrait,
    castPresenceData,
    runCastPresenceAnalysis,
    setActiveChapterId,
    setViewMode,
  } = useEpub();
  const { t } = useTranslation();

  // Selection & active tabs
  const [selectedId, setSelectedId] = useState<string | null>(characters[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'identity' | 'traits' | 'arc' | 'footprint' | 'notes'>('identity');

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form input for new trait
  const [newTraitText, setNewTraitText] = useState('');
  const [newTraitCategory, setNewTraitCategory] = useState('goal');

  // Ensure valid selection
  const selectedCharacter = useMemo(() => {
    if (selectedId) {
      const found = characters.find(c => c.id === selectedId);
      if (found) return found;
    }
    return characters[0] || null;
  }, [characters, selectedId]);

  // Filtered characters list for master pane
  const filteredCharacters = useMemo(() => {
    let list = [...characters];

    if (roleFilter !== 'all') {
      list = list.filter(c => c.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          (c.aliases && c.aliases.toLowerCase().includes(q)) ||
          (c.archetype && c.archetype.toLowerCase().includes(q)) ||
          (c.occupation && c.occupation.toLowerCase().includes(q))
      );
    }

    return list;
  }, [characters, roleFilter, searchQuery]);

  // Create new character action
  const handleCreateNew = () => {
    const newId = addCharacter({
      name: `${t('characters.addCharacter')} ${characters.length + 1}`,
      role: 'Supporting',
      color: PRESET_COLORS[characters.length % PRESET_COLORS.length],
    });
    setSelectedId(newId);
    setActiveTab('identity');
  };

  // Trait submission
  const handleAddTraitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharacter || !newTraitText.trim()) return;
    addCharacterTrait(selectedCharacter.id, newTraitText.trim(), newTraitCategory);
    setNewTraitText('');
  };

  // Trait progress calculation
  const completedTraits = selectedCharacter?.traits.filter(t => t.completed).length || 0;
  const totalTraits = selectedCharacter?.traits.length || 0;
  const traitsPercent = totalTraits > 0 ? Math.round((completedTraits / totalTraits) * 100) : 0;

  // Chapter presence data for selected character
  const characterPresenceInfo = useMemo(() => {
    if (!selectedCharacter || !castPresenceData) return null;
    const chaptersAppeared = castPresenceData.chapters.filter(ch => {
      const key = `${selectedCharacter.id}::${ch.id}`;
      const pres = castPresenceData.presenceMap[key];
      return pres && pres.count > 0;
    });

    const totalMentions = chaptersAppeared.reduce((acc, ch) => {
      const pres = castPresenceData.presenceMap[`${selectedCharacter.id}::${ch.id}`];
      return acc + (pres?.count || 0);
    }, 0);

    return {
      chapters: chaptersAppeared,
      totalMentions,
    };
  }, [selectedCharacter, castPresenceData]);

  return (
    <div className="entity-studio-container">
      {/* Top Studio Toolbar */}
      <div className="entity-studio-toolbar">
        <div className="entity-toolbar-left">
          <button
            className="btn btn-sm btn-ghost return-writing-btn"
            onClick={() => setViewMode('editor')}
            title={t('header.writeMode')}
          >
            <ArrowLeft size={14} />
            <Edit3 size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>{t('header.writeMode')}</span>
          </button>

          <div className="entity-studio-brand">
            <div className="entity-studio-icon-chip">
              <Users size={16} />
            </div>
            <div>
              <h2 className="entity-studio-title">{t('characters.title')}</h2>
              <span className="entity-studio-count">
                {characters.length} {characters.length === 1 ? t('characters.countSingle') : t('characters.countPlural')}
              </span>
            </div>
          </div>
        </div>

        <div className="entity-toolbar-right">
          {/* Search box */}
          <div className="entity-search-box">
            <Search size={14} className="entity-search-icon" />
            <input
              type="text"
              placeholder={t('characters.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="entity-search-input"
            />
            {searchQuery && (
              <button className="entity-search-clear" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>

          {/* Role filter */}
          <div className="entity-dropdown-wrap">
            <Filter size={13} color="var(--text-muted)" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="entity-select-control"
            >
              <option value="all">{t('characters.filterAllRoles')}</option>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Presence Grid shortcut */}
          <button
            className="btn btn-sm btn-outline entity-action-btn"
            onClick={() => setViewMode('cast-grid')}
            title={t('subNav.presenceGridTitle')}
          >
            <LayoutGrid size={13} />
            <span>{t('subNav.presenceGrid')}</span>
          </button>

          {/* New Character Button */}
          <button className="btn btn-sm btn-primary entity-action-btn" onClick={handleCreateNew}>
            <Plus size={14} />
            <span>{t('characters.addCharacter')}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Two-Pane Master-Detail */}
      <div className="entity-studio-workspace">
        {/* Left Master Pane: Character Roster */}
        <aside className="entity-master-pane">
          <div className="entity-master-header">
            <span className="master-header-label">{t('subNav.characters')}</span>
            <span className="master-header-badge">{filteredCharacters.length}</span>
          </div>

          <div className="entity-card-list">
            {filteredCharacters.length === 0 ? (
              <div className="entity-list-empty">
                <span>{t('characters.emptyTitle')}</span>
              </div>
            ) : (
              filteredCharacters.map(char => {
                const isSelected = selectedCharacter?.id === char.id;
                const charCompleted = char.traits.filter(t => t.completed).length;
                const charTotal = char.traits.length;
                const charPercent = charTotal > 0 ? Math.round((charCompleted / charTotal) * 100) : 0;

                return (
                  <div
                    key={char.id}
                    className={`entity-roster-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedId(char.id)}
                    style={{
                      '--card-color': char.color || '#3b82f6',
                    } as React.CSSProperties}
                  >
                    <div className="roster-card-header">
                      <div
                        className="roster-avatar-chip"
                        style={{ backgroundColor: char.color || '#3b82f6' }}
                      >
                        {char.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="roster-card-title-group">
                        <div className="roster-card-name">{char.name}</div>
                        <div className="roster-card-role-line">
                          <span className="roster-role-badge">{char.role}</span>
                          {char.archetype && (
                            <span className="roster-archetype-badge">{char.archetype}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {char.oneLineSummary && (
                      <div className="roster-card-summary">{char.oneLineSummary}</div>
                    )}

                    <div className="roster-card-footer">
                      {charTotal > 0 ? (
                        <div className="roster-progress-group">
                          <div className="roster-progress-track">
                            <div
                              className="roster-progress-fill"
                              style={{
                                width: `${charPercent}%`,
                                backgroundColor: char.color || '#3b82f6',
                              }}
                            />
                          </div>
                          <span className="roster-progress-text">
                            {charCompleted}/{charTotal} goals
                          </span>
                        </div>
                      ) : (
                        <span className="roster-no-traits">No goals listed</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Detail Workspace: Character Dossier */}
        {selectedCharacter ? (
          <main className="entity-detail-workspace">
            {/* Dossier Hero Header */}
            <div className="dossier-hero-header">
              <div className="dossier-hero-identity">
                <div
                  className="dossier-avatar-large"
                  style={{ backgroundColor: selectedCharacter.color || '#3b82f6' }}
                  title="Character Avatar Color"
                >
                  {selectedCharacter.name.charAt(0).toUpperCase()}
                </div>

                <div className="dossier-title-editor">
                  <input
                    type="text"
                    className="dossier-name-input"
                    value={selectedCharacter.name}
                    onChange={e => updateCharacter(selectedCharacter.id, { name: e.target.value })}
                    placeholder="Character Name..."
                  />

                  <div className="dossier-meta-controls">
                    <select
                      className="dossier-select-control"
                      value={selectedCharacter.role}
                      onChange={e => updateCharacter(selectedCharacter.id, { role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      className="dossier-inline-input"
                      placeholder="Archetype (e.g. The Mentor)..."
                      value={selectedCharacter.archetype || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { archetype: e.target.value })}
                    />

                    <input
                      type="text"
                      className="dossier-inline-input"
                      style={{ width: '90px' }}
                      placeholder="Age..."
                      value={selectedCharacter.age || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { age: e.target.value })}
                    />

                    <input
                      type="text"
                      className="dossier-inline-input"
                      placeholder="Occupation..."
                      value={selectedCharacter.occupation || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { occupation: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Color Swatch Picker & Actions */}
              <div className="dossier-hero-actions">
                <div className="dossier-color-picker">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`dossier-color-dot ${selectedCharacter.color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => updateCharacter(selectedCharacter.id, { color: c })}
                      title={`Select ${c}`}
                    />
                  ))}
                </div>

                <button
                  className="btn btn-sm btn-ghost delete-entity-btn"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${selectedCharacter.name}"?`)) {
                      deleteCharacter(selectedCharacter.id);
                      setSelectedId(null);
                    }
                  }}
                  title="Delete character"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Dossier Tabs Navigation */}
            <nav className="dossier-tabs-nav">
              <button
                className={`dossier-tab-btn ${activeTab === 'identity' ? 'active' : ''}`}
                onClick={() => setActiveTab('identity')}
              >
                <Eye size={14} />
                <span>{t('characters.tabIdentity')}</span>
              </button>

              <button
                className={`dossier-tab-btn ${activeTab === 'traits' ? 'active' : ''}`}
                onClick={() => setActiveTab('traits')}
              >
                <CheckSquare size={14} />
                <span>{t('characters.tabTraits')} ({selectedCharacter.traits.length})</span>
              </button>

              <button
                className={`dossier-tab-btn ${activeTab === 'arc' ? 'active' : ''}`}
                onClick={() => setActiveTab('arc')}
              >
                <Target size={14} />
                <span>{t('characters.tabArc')}</span>
              </button>

              <button
                className={`dossier-tab-btn ${activeTab === 'footprint' ? 'active' : ''}`}
                onClick={() => setActiveTab('footprint')}
              >
                <Activity size={14} />
                <span>{t('characters.tabFootprint')}</span>
              </button>

              <button
                className={`dossier-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <FileText size={14} />
                <span>{t('characters.tabNotes')}</span>
              </button>
            </nav>

            {/* Dossier Tab Content */}
            <div className="dossier-body-viewport">
              {/* Tab 1: Identity & Appearance */}
              {activeTab === 'identity' && (
                <div className="dossier-section animate-fadeIn">
                  <div className="form-group">
                    <label className="form-label">
                      <span>{t('characters.aliasesLabel')}</span>
                      <span className="label-hint">
                        ({t('characters.aliasesDesc')})
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Pete, Prescott..."
                      value={selectedCharacter.aliases || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { aliases: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('characters.bioLabel')}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={selectedCharacter.oneLineSummary || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { oneLineSummary: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('characters.tabIdentity')}</label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={selectedCharacter.appearance || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { appearance: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Psychology & Traits Checklist */}
              {activeTab === 'traits' && (
                <div className="dossier-section animate-fadeIn">
                  {/* Progress Meter */}
                  <div className="traits-meter-card">
                    <div className="meter-header">
                      <span className="meter-title">{t('characters.traitsTitle')}</span>
                      <span className="meter-stats">
                        {completedTraits} / {totalTraits} ({traitsPercent}%)
                      </span>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${traitsPercent}%`,
                          backgroundColor: selectedCharacter.color || 'var(--accent-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Add Trait Form */}
                  <form onSubmit={handleAddTraitSubmit} className="add-trait-bar">
                    <select
                      value={newTraitCategory}
                      onChange={e => setNewTraitCategory(e.target.value)}
                      className="trait-category-select"
                    >
                      {TRAIT_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder={t('characters.addTraitPlaceholder')}
                      value={newTraitText}
                      onChange={e => setNewTraitText(e.target.value)}
                      className="add-trait-input"
                    />

                    <button type="submit" className="btn btn-sm btn-primary add-trait-btn">
                      <Plus size={14} />
                      <span>{t('characters.addTraitBtn')}</span>
                    </button>
                  </form>

                  {/* Traits List */}
                  <div className="traits-checklist-grid">
                    {selectedCharacter.traits.length === 0 ? (
                      <div className="traits-empty-hint">
                        {t('characters.addTraitPlaceholder')}
                      </div>
                    ) : (
                      selectedCharacter.traits.map(trait => (
                        <div
                          key={trait.id}
                          className={`trait-item-row ${trait.completed ? 'completed' : ''}`}
                        >
                          <button
                            type="button"
                            className="trait-toggle-check"
                            onClick={() => toggleCharacterTrait(selectedCharacter.id, trait.id)}
                            title={trait.completed ? t('common.done') : t('common.edit')}
                          >
                            {trait.completed ? (
                              <CheckSquare size={17} color={selectedCharacter.color || '#3b82f6'} />
                            ) : (
                              <Square size={17} color="var(--text-muted)" />
                            )}
                          </button>

                          <span className={`trait-tag tag-${trait.category || 'goal'}`}>
                            {trait.category || 'trait'}
                          </span>

                          <span className="trait-label-text">{trait.text}</span>

                          <button
                            type="button"
                            className="trait-delete-btn"
                            onClick={() => removeCharacterTrait(selectedCharacter.id, trait.id)}
                            title={t('common.delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Personality Freeform */}
                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className="form-label">{t('characters.tabTraits')}</label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={selectedCharacter.personality || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { personality: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Arc & Motivation */}
              {activeTab === 'arc' && (
                <div className="dossier-section animate-fadeIn">
                  <div className="form-group">
                    <label className="form-label">{t('characters.arcTitle')}</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={selectedCharacter.motivation || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { motivation: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('characters.arcBeginning')}</label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      value={selectedCharacter.backstory || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { backstory: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Story Footprint */}
              {activeTab === 'footprint' && (
                <div className="dossier-section animate-fadeIn">
                  <div className="footprint-overview-card">
                    <div className="footprint-stat">
                      <span className="stat-label">{t('characters.chaptersAppeared')}</span>
                      <span className="stat-value">
                        {characterPresenceInfo ? characterPresenceInfo.chapters.length : '—'}
                      </span>
                    </div>

                    <div className="footprint-stat">
                      <span className="stat-label">{t('characters.totalMentions')}</span>
                      <span className="stat-value">
                        {characterPresenceInfo ? characterPresenceInfo.totalMentions : '—'}
                      </span>
                    </div>

                    <div className="footprint-actions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setViewMode('cast-grid')}
                      >
                        <LayoutGrid size={14} />
                        <span>{t('subNav.presenceGrid')}</span>
                      </button>

                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => runCastPresenceAnalysis(true)}
                      >
                        <span>{t('characters.runAnalysis')}</span>
                      </button>
                    </div>
                  </div>

                  {characterPresenceInfo && characterPresenceInfo.chapters.length > 0 ? (
                    <div className="footprint-chapters-list">
                      <h4 className="footprint-subheading">{t('characters.chaptersAppeared')}</h4>
                      {characterPresenceInfo.chapters.map(ch => {
                        const pres = castPresenceData?.presenceMap[`${selectedCharacter.id}::${ch.id}`];
                        return (
                          <div key={ch.id} className="footprint-chapter-row">
                            <div className="footprint-ch-info">
                              <span className="footprint-ch-title">{ch.title}</span>
                              <span className="footprint-ch-mentions">
                                {pres?.count || 0} {t('characters.totalMentions')}
                              </span>
                            </div>

                            {pres?.occurrences?.[0] && (
                              <div className="footprint-sample-snippet">
                                "{pres.occurrences[0].snippet}"
                              </div>
                            )}

                            <button
                              className="btn btn-xs btn-ghost footprint-jump-btn"
                              onClick={() => {
                                setActiveChapterId(ch.id);
                                setViewMode('editor');
                              }}
                            >
                              <BookOpen size={12} />
                              <span>{t('common.open')}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="footprint-empty-hint">
                      {t('characters.noPresence')}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Freeform Notes */}
              {activeTab === 'notes' && (
                <div className="dossier-section animate-fadeIn">
                  <div className="form-group">
                    <label className="form-label">{t('characters.tabNotes')}</label>
                    <textarea
                      className="form-textarea"
                      rows={12}
                      value={selectedCharacter.notes || ''}
                      onChange={e => updateCharacter(selectedCharacter.id, { notes: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          <div className="entity-detail-empty">
            <Users size={38} color="var(--text-muted)" />
            <p>{t('characters.emptyDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
