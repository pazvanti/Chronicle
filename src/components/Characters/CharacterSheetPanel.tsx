import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Users,
  Plus,
  Search,
  X,
  Maximize2,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  Brain,
  Target,
  History,
  FileText,
  User,
} from 'lucide-react';

interface CharacterSheetPanelProps {
  onExpandModal: (characterId: string) => void;
  onClose: () => void;
}

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

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const TRAIT_CATEGORIES = [
  { id: 'goal', label: 'Goal' },
  { id: 'personality', label: 'Personality' },
  { id: 'flaw', label: 'Flaw' },
  { id: 'habit', label: 'Habit' },
  { id: 'action', label: 'Key Action' },
  { id: 'custom', label: 'Custom' },
];

export const CharacterSheetPanel: React.FC<CharacterSheetPanelProps> = ({
  onExpandModal,
  onClose,
}) => {
  const {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    toggleCharacterTrait,
    addCharacterTrait,
    removeCharacterTrait,
  } = useEpub();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [newTraitText, setNewTraitText] = useState('');
  const [newTraitCategory, setNewTraitCategory] = useState('goal');

  // Collapsible narrative section states in drawer
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    traits: true,
    quick: true,
    appearance: false,
    personality: false,
    motivation: false,
    backstory: false,
    notes: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedCharacter = characters.find(c => c.id === selectedId) || null;

  // Filtered characters list
  const filteredCharacters = characters.filter(char => {
    const matchesRole = roleFilter === 'All' || char.role === roleFilter;
    if (!matchesRole) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      char.name.toLowerCase().includes(q) ||
      (char.archetype && char.archetype.toLowerCase().includes(q)) ||
      (char.oneLineSummary && char.oneLineSummary.toLowerCase().includes(q)) ||
      (char.traits && char.traits.some(t => t.text.toLowerCase().includes(q)))
    );
  });

  const handleCreateNewCharacter = () => {
    const newId = addCharacter({
      name: 'New Character',
      role: 'Protagonist',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      traits: [
        { id: `t-${Date.now()}-1`, text: 'Introduce key goal or motivation', completed: false, category: 'goal' },
      ],
    });
    setSelectedId(newId);
  };

  const handleAddTrait = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newTraitText.trim()) return;
    addCharacterTrait(selectedId, newTraitText.trim(), newTraitCategory);
    setNewTraitText('');
  };

  const handleDeleteCurrent = (id: string, name: string) => {
    if (window.confirm(`Delete character "${name}"?`)) {
      deleteCharacter(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  return (
    <div className="character-drawer-panel">
      {/* 1. LIST VIEW */}
      {!selectedCharacter ? (
        <div className="char-panel-list-container">
          {/* Header */}
          <div className="char-panel-header">
            <div className="char-panel-header-title">
              <Users size={16} className="text-primary" />
              <span>Characters</span>
              <span className="char-count-badge">{characters.length}</span>
            </div>
            <div className="char-panel-header-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleCreateNewCharacter}
                title="Add new character"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={onClose}
                title="Close character panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="char-search-box">
            <Search size={14} className="char-search-icon" />
            <input
              type="text"
              placeholder="Search characters, traits..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="char-search-input"
            />
            {searchQuery && (
              <button className="char-search-clear" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="char-filter-bar">
            {['All', 'Protagonist', 'Antagonist', 'Supporting'].map(role => (
              <button
                key={role}
                className={`char-filter-pill ${roleFilter === role ? 'active' : ''}`}
                onClick={() => setRoleFilter(role)}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Character Card List */}
          <div className="char-cards-scroll">
            {filteredCharacters.length === 0 ? (
              <div className="char-empty-state">
                <Users size={32} strokeWidth={1.5} className="char-empty-icon" />
                <p className="char-empty-title">
                  {characters.length === 0 ? 'No characters yet' : 'No characters match filter'}
                </p>
                <p className="char-empty-desc">
                  {characters.length === 0
                    ? 'Create your first character to organize traits, goals, and descriptions while writing.'
                    : 'Try clearing your search query or filter.'}
                </p>
                {characters.length === 0 && (
                  <button className="btn btn-sm btn-primary" onClick={handleCreateNewCharacter}>
                    <Plus size={14} />
                    <span>Add First Character</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCharacters.map(char => {
                const completedCount = (char.traits || []).filter(t => t.completed).length;
                const totalCount = (char.traits || []).length;
                const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                  <div
                    key={char.id}
                    className="char-card"
                    style={{ borderLeftColor: char.color || '#3b82f6' }}
                    onClick={() => setSelectedId(char.id)}
                  >
                    <div className="char-card-top">
                      <div className="char-card-identity">
                        <div
                          className="char-avatar-mini"
                          style={{
                            backgroundColor: `${char.color || '#3b82f6'}20`,
                            color: char.color || '#3b82f6',
                            borderColor: char.color || '#3b82f6',
                          }}
                        >
                          {char.name.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="char-card-name">{char.name}</div>
                          <div className="char-card-role-row">
                            <span className="char-role-badge">{char.role}</span>
                            {char.archetype && (
                              <span className="char-archetype-badge">{char.archetype}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="char-card-quick-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="char-card-action-btn"
                          title="Open Full Sheet Modal"
                          onClick={() => onExpandModal(char.id)}
                        >
                          <Maximize2 size={13} />
                        </button>
                        <button
                          className="char-card-action-btn danger"
                          title="Delete Character"
                          onClick={() => handleDeleteCurrent(char.id, char.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {char.oneLineSummary && (
                      <div className="char-card-summary">{char.oneLineSummary}</div>
                    )}

                    {/* Mini Trait Checklist Progress */}
                    <div className="char-card-traits-summary">
                      <div className="char-card-traits-label">
                        <span>Traits / Arc</span>
                        <span className="char-card-traits-count">
                          {completedCount}/{totalCount}
                        </span>
                      </div>
                      <div className="char-card-progress-track">
                        <div
                          className="char-card-progress-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: char.color || '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 2. CHARACTER DETAIL VIEW IN DRAWER */
        <div className="char-panel-detail-container">
          {/* Sub-header */}
          <div className="char-detail-nav">
            <button
              className="btn btn-sm btn-ghost char-back-btn"
              onClick={() => setSelectedId(null)}
            >
              <ChevronLeft size={16} />
              <span>Characters</span>
            </button>
            <div className="char-detail-nav-actions">
              <button
                className="btn btn-sm btn-outline"
                title="Expand to Full Sheet Modal"
                onClick={() => onExpandModal(selectedCharacter.id)}
              >
                <Maximize2 size={13} />
                <span>Expand</span>
              </button>
              <button
                className="btn btn-sm btn-ghost danger-hover"
                title="Delete Character"
                onClick={() => handleDeleteCurrent(selectedCharacter.id, selectedCharacter.name)}
              >
                <Trash2 size={14} />
              </button>
              <button
                className="btn btn-sm btn-ghost"
                title="Close drawer"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Character Quick Info Header */}
          <div
            className="char-detail-header-card"
            style={{ borderLeftColor: selectedCharacter.color || '#3b82f6' }}
          >
            <div className="char-detail-top-row">
              <input
                type="text"
                className="char-detail-name-input"
                value={selectedCharacter.name}
                placeholder="Character Name"
                onChange={e =>
                  updateCharacter(selectedCharacter.id, { name: e.target.value })
                }
              />
              <select
                className="char-detail-role-select"
                value={selectedCharacter.role}
                onChange={e =>
                  updateCharacter(selectedCharacter.id, { role: e.target.value })
                }
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Colors picker */}
            <div className="char-detail-color-row">
              <span className="char-caption-label">Accent:</span>
              <div className="char-mini-palette">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`char-mini-dot ${selectedCharacter.color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateCharacter(selectedCharacter.id, { color: c })}
                  />
                ))}
              </div>
            </div>

            {/* One line premise */}
            <input
              type="text"
              className="char-detail-summary-input"
              placeholder="One-line hook: Who they are and what drives them..."
              value={selectedCharacter.oneLineSummary || ''}
              onChange={e =>
                updateCharacter(selectedCharacter.id, { oneLineSummary: e.target.value })
              }
            />
          </div>

          {/* Scrollable Sections */}
          <div className="char-detail-sections-scroll">
            {/* SECTION: Traits & Arc Checklist (Todo List) */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('traits')}
              >
                <div className="char-section-title">
                  {openSections.traits ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Traits & Arc Checklist</span>
                  <span className="char-progress-mini-tag">
                    {(selectedCharacter.traits || []).filter(t => t.completed).length}/
                    {(selectedCharacter.traits || []).length}
                  </span>
                </div>
              </div>

              {openSections.traits && (
                <div className="char-section-content">
                  {/* Progress bar */}
                  {selectedCharacter.traits.length > 0 && (
                    <div className="traits-progress-track mb-2">
                      <div
                        className="traits-progress-fill"
                        style={{
                          width: `${
                            Math.round(
                              (selectedCharacter.traits.filter(t => t.completed).length /
                                selectedCharacter.traits.length) *
                                100
                            )
                          }%`,
                          backgroundColor: selectedCharacter.color || '#3b82f6',
                        }}
                      />
                    </div>
                  )}

                  {/* Todo list items */}
                  <div className="char-drawer-traits-list">
                    {selectedCharacter.traits.length === 0 ? (
                      <div className="traits-empty-hint-drawer">
                        No traits added. Check off key traits or goals as your character develops!
                      </div>
                    ) : (
                      selectedCharacter.traits.map(trait => (
                        <div
                          key={trait.id}
                          className={`trait-todo-item-drawer ${trait.completed ? 'completed' : ''}`}
                        >
                          <button
                            type="button"
                            className="trait-checkbox-btn"
                            onClick={() =>
                              toggleCharacterTrait(selectedCharacter.id, trait.id)
                            }
                            title={trait.completed ? 'Mark uncompleted' : 'Mark completed'}
                          >
                            {trait.completed ? (
                              <CheckSquare size={15} className="text-primary" />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                          <span
                            className="trait-drawer-text"
                            onClick={() =>
                              toggleCharacterTrait(selectedCharacter.id, trait.id)
                            }
                          >
                            {trait.text}
                          </span>
                          {trait.category && (
                            <span className="trait-drawer-cat">{trait.category}</span>
                          )}
                          <button
                            type="button"
                            className="trait-delete-btn"
                            onClick={() =>
                              removeCharacterTrait(selectedCharacter.id, trait.id)
                            }
                            title="Remove trait"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add trait form */}
                  <form onSubmit={handleAddTrait} className="trait-add-form-drawer">
                    <input
                      type="text"
                      className="trait-drawer-input"
                      placeholder="New trait or arc goal..."
                      value={newTraitText}
                      onChange={e => setNewTraitText(e.target.value)}
                    />
                    <select
                      className="trait-drawer-cat-select"
                      value={newTraitCategory}
                      onChange={e => setNewTraitCategory(e.target.value)}
                    >
                      {TRAIT_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={!newTraitText.trim()}
                    >
                      <Plus size={13} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* SECTION: Quick Stats (Archetype, Age, Occupation, Aliases) */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('quick')}>
                <div className="char-section-title">
                  {openSections.quick ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <User size={14} />
                  <span>Profile Overview</span>
                </div>
              </div>
              {openSections.quick && (
                <div className="char-section-content">
                  <div className="char-drawer-grid">
                    <div>
                      <span className="char-field-label">Archetype</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. The Mentor"
                        value={selectedCharacter.archetype || ''}
                        onChange={e =>
                          updateCharacter(selectedCharacter.id, { archetype: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <span className="char-field-label">Age</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. 32"
                        value={selectedCharacter.age || ''}
                        onChange={e =>
                          updateCharacter(selectedCharacter.id, { age: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <span className="char-field-label">Occupation</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. Apothecary"
                        value={selectedCharacter.occupation || ''}
                        onChange={e =>
                          updateCharacter(selectedCharacter.id, { occupation: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <span className="char-field-label">Aliases</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. The Fox"
                        value={selectedCharacter.aliases || ''}
                        onChange={e =>
                          updateCharacter(selectedCharacter.id, { aliases: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: Physical Appearance */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('appearance')}
              >
                <div className="char-section-title">
                  {openSections.appearance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Eye size={14} />
                  <span>Appearance & Style</span>
                </div>
              </div>
              {openSections.appearance && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={4}
                    placeholder="Describe build, posture, clothing, mannerisms, distinguishing marks..."
                    value={selectedCharacter.appearance || ''}
                    onChange={e =>
                      updateCharacter(selectedCharacter.id, { appearance: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* SECTION: Personality & Psychology */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('personality')}
              >
                <div className="char-section-title">
                  {openSections.personality ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Brain size={14} />
                  <span>Personality & Flaws</span>
                </div>
              </div>
              {openSections.personality && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={4}
                    placeholder="Temperament, virtues, fatal flaws, quirks, and emotional defenses..."
                    value={selectedCharacter.personality || ''}
                    onChange={e =>
                      updateCharacter(selectedCharacter.id, { personality: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* SECTION: Motivations & Stakes */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('motivation')}
              >
                <div className="char-section-title">
                  {openSections.motivation ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Target size={14} />
                  <span>Goals & Motivations</span>
                </div>
              </div>
              {openSections.motivation && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={4}
                    placeholder="Core desires, what is at stake, the internal dilemma, what they must overcome..."
                    value={selectedCharacter.motivation || ''}
                    onChange={e =>
                      updateCharacter(selectedCharacter.id, { motivation: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* SECTION: Backstory */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('backstory')}
              >
                <div className="char-section-title">
                  {openSections.backstory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <History size={14} />
                  <span>Backstory & Origins</span>
                </div>
              </div>
              {openSections.backstory && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={4}
                    placeholder="Origins, defining childhood events, key relationships, secrets kept..."
                    value={selectedCharacter.backstory || ''}
                    onChange={e =>
                      updateCharacter(selectedCharacter.id, { backstory: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* SECTION: Writer Notes */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('notes')}>
                <div className="char-section-title">
                  {openSections.notes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FileText size={14} />
                  <span>Writer Notes & Scenes</span>
                </div>
              </div>
              {openSections.notes && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={4}
                    placeholder="Scene tie-ins, chapter appearances, dialogue ideas, secrets to reveal..."
                    value={selectedCharacter.notes || ''}
                    onChange={e =>
                      updateCharacter(selectedCharacter.id, { notes: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Full Sheet Button */}
            <div className="char-detail-bottom-cta">
              <button
                className="btn btn-outline w-full"
                onClick={() => onExpandModal(selectedCharacter.id)}
              >
                <Maximize2 size={14} />
                <span>Open Full Character Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
