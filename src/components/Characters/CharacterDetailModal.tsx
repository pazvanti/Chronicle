import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  X,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  FileText,
  Eye,
  Brain,
  Target,
  History,
} from 'lucide-react';

import { useEscapeKey } from '../../hooks/useEscapeKey';

interface CharacterDetailModalProps {
  characterId: string | null;
  isOpen: boolean;
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

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  characterId,
  isOpen,
  onClose,
}) => {
  const {
    characters,
    updateCharacter,
    deleteCharacter,
    toggleCharacterTrait,
    addCharacterTrait,
    removeCharacterTrait,
  } = useEpub();

  const character = characters.find(c => c.id === characterId) || null;

  const [activeTab, setActiveTab] = useState<'details' | 'psychology' | 'motivation' | 'backstory' | 'notes'>('details');
  const [newTraitText, setNewTraitText] = useState('');
  const [newTraitCategory, setNewTraitCategory] = useState('goal');

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !character) return null;

  const completedTraitsCount = character.traits.filter(t => t.completed).length;
  const totalTraitsCount = character.traits.length;
  const traitsPercent = totalTraitsCount > 0 ? Math.round((completedTraitsCount / totalTraitsCount) * 100) : 0;

  const handleAddTrait = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraitText.trim()) return;
    addCharacterTrait(character.id, newTraitText.trim(), newTraitCategory);
    setNewTraitText('');
  };

  const handleDeleteCharacter = () => {
    if (window.confirm(`Are you sure you want to delete character "${character.name}"?`)) {
      deleteCharacter(character.id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop character-modal-backdrop" onClick={onClose}>
      <div
        className="modal-content character-detail-modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1240px',
          width: '95vw',
          height: '92vh',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          className="character-modal-header"
          style={{
            borderLeft: `6px solid ${character.color || '#3b82f6'}`,
          }}
        >
          <div className="character-header-left">
            <div
              className="character-avatar-large"
              style={{ backgroundColor: `${character.color || '#3b82f6'}20`, color: character.color || '#3b82f6', borderColor: character.color || '#3b82f6' }}
            >
              {character.name.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="character-header-titles">
              <input
                type="text"
                className="character-name-input-large"
                value={character.name}
                placeholder="Character Name"
                onChange={e => updateCharacter(character.id, { name: e.target.value })}
              />
              <div className="character-header-meta">
                <select
                  className="character-role-select"
                  value={character.role}
                  onChange={e => updateCharacter(character.id, { role: e.target.value })}
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {character.archetype && (
                  <span className="character-archetype-tag">{character.archetype}</span>
                )}
                {character.age && (
                  <span className="character-age-tag">Age: {character.age}</span>
                )}
              </div>
            </div>
          </div>

          <div className="character-header-actions">
            <button
              className="btn btn-ghost danger-hover"
              title="Delete Character"
              onClick={handleDeleteCharacter}
            >
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost" title="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Split */}
        <div className="character-modal-body">
          {/* Left Column: Quick Profile, Colors, Traits Todo List */}
          <div className="character-modal-sidebar">
            {/* Color accent selector */}
            <div className="char-sidebar-section">
              <label className="section-label">Character Color</label>
              <div className="char-color-palette">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`char-color-dot ${character.color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateCharacter(character.id, { color: c })}
                  />
                ))}
              </div>
            </div>

            {/* Quick Profile fields */}
            <div className="char-sidebar-section">
              <label className="section-label">Quick Profile</label>
              <div className="char-field-grid">
                <div className="char-field-group">
                  <span className="field-caption">Archetype</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. Reluctant Hero"
                    value={character.archetype || ''}
                    onChange={e => updateCharacter(character.id, { archetype: e.target.value })}
                  />
                </div>
                <div className="char-field-group">
                  <span className="field-caption">Age</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. 28"
                    value={character.age || ''}
                    onChange={e => updateCharacter(character.id, { age: e.target.value })}
                  />
                </div>
                <div className="char-field-group">
                  <span className="field-caption">Occupation</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. Detective"
                    value={character.occupation || ''}
                    onChange={e => updateCharacter(character.id, { occupation: e.target.value })}
                  />
                </div>
                <div className="char-field-group">
                  <span className="field-caption">Aliases / Nicknames</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. The Shadow"
                    value={character.aliases || ''}
                    onChange={e => updateCharacter(character.id, { aliases: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* One-Line Essence */}
            <div className="char-sidebar-section">
              <label className="section-label">One-Line Hook / Premise</label>
              <textarea
                className="char-textarea-sm"
                rows={2}
                placeholder="A brief 1-sentence hook of who they are and what drives them..."
                value={character.oneLineSummary || ''}
                onChange={e => updateCharacter(character.id, { oneLineSummary: e.target.value })}
              />
            </div>

            {/* Traits Todo Checklist */}
            <div className="char-sidebar-section traits-todo-section">
              <div className="traits-todo-header">
                <label className="section-label">Traits & Arc Checklist</label>
                <span className="traits-progress-pill">
                  {completedTraitsCount} of {totalTraitsCount} ({traitsPercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="traits-progress-track">
                <div
                  className="traits-progress-fill"
                  style={{
                    width: `${traitsPercent}%`,
                    backgroundColor: character.color || '#3b82f6',
                  }}
                />
              </div>

              {/* Trait list items */}
              <div className="traits-items-list">
                {character.traits.length === 0 ? (
                  <div className="traits-empty-hint">
                    No traits added yet. Add traits, habits, or character arc goals below!
                  </div>
                ) : (
                  character.traits.map(trait => (
                    <div
                      key={trait.id}
                      className={`trait-todo-item ${trait.completed ? 'completed' : ''}`}
                    >
                      <button
                        type="button"
                        className="trait-checkbox-btn"
                        onClick={() => toggleCharacterTrait(character.id, trait.id)}
                        title={trait.completed ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {trait.completed ? (
                          <CheckSquare size={16} className="text-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <span
                        className="trait-item-text"
                        onClick={() => toggleCharacterTrait(character.id, trait.id)}
                      >
                        {trait.text}
                      </span>
                      {trait.category && (
                        <span className="trait-item-cat">{trait.category}</span>
                      )}
                      <button
                        type="button"
                        className="trait-delete-btn"
                        onClick={() => removeCharacterTrait(character.id, trait.id)}
                        title="Remove trait"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add trait form */}
              <form onSubmit={handleAddTrait} className="trait-add-form">
                <input
                  type="text"
                  className="trait-add-input"
                  placeholder="Add trait or goal..."
                  value={newTraitText}
                  onChange={e => setNewTraitText(e.target.value)}
                />
                <select
                  className="trait-add-cat-select"
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
                  <Plus size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Deep Narrative Tabs */}
          <div className="character-modal-narrative">
            {/* Tabs Bar */}
            <div className="char-narrative-tabs">
              <button
                className={`char-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <Eye size={14} />
                <span>Appearance</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'psychology' ? 'active' : ''}`}
                onClick={() => setActiveTab('psychology')}
              >
                <Brain size={14} />
                <span>Personality</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'motivation' ? 'active' : ''}`}
                onClick={() => setActiveTab('motivation')}
              >
                <Target size={14} />
                <span>Motivations & Arc</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'backstory' ? 'active' : ''}`}
                onClick={() => setActiveTab('backstory')}
              >
                <History size={14} />
                <span>Backstory</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <FileText size={14} />
                <span>Writer Notes</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="char-narrative-content">
              {activeTab === 'details' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Physical Appearance & Sensory Details</h4>
                    <p className="caption">
                      Describe physical build, eye & hair color, distinctive clothing, posture, vocal quality, signature gestures, and sensory impressions.
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={12}
                    placeholder="E.g., Tall and angular, always wearing a faded tweed coat with ink-stained cuffs. Walks with a deliberate, quiet stride..."
                    value={character.appearance || ''}
                    onChange={e => updateCharacter(character.id, { appearance: e.target.value })}
                  />
                </div>
              )}

              {activeTab === 'psychology' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Personality, Temperament & Fatal Flaw</h4>
                    <p className="caption">
                      What are their psychological strengths, fatal flaws, moral compass, habits under stress, defense mechanisms, and quirks?
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={12}
                    placeholder="E.g., Inquisitive and intensely logical, but fiercely impatient with foolishness. Tends to overthink simple emotional situations..."
                    value={character.personality || ''}
                    onChange={e => updateCharacter(character.id, { personality: e.target.value })}
                  />
                </div>
              )}

              {activeTab === 'motivation' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Core Desire, Internal Stakes & Arc</h4>
                    <p className="caption">
                      What is their primary external goal? What internal need or wound are they trying to heal? What is the "lie" they believe about themselves?
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={12}
                    placeholder="E.g., External goal: escape the court trial unscathed. Internal need: realize that rules and decorum cannot protect her from an unfair world..."
                    value={character.motivation || ''}
                    onChange={e => updateCharacter(character.id, { motivation: e.target.value })}
                  />
                </div>
              )}

              {activeTab === 'backstory' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Origins, History & Formative Events</h4>
                    <p className="caption">
                      What happened before the story started? Key childhood memories, defining relationships, secrets they hide from others.
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={12}
                    placeholder="E.g., Raised in a strict Victorian household where proper etiquette was demanded at all costs. She retreated into books of fairy tales..."
                    value={character.backstory || ''}
                    onChange={e => updateCharacter(character.id, { backstory: e.target.value })}
                  />
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Writer’s Private Notes & Scene Tie-ins</h4>
                    <p className="caption">
                      Plot notes, chapter appearances, foreshadowing ideas, character relationship dynamics, or dialogue snippets to use later.
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={12}
                    placeholder="E.g., Key scenes: Appears in Chapters 1, 4, 7, and the final climax. Note: Don't reveal their true identity until the tea party scene..."
                    value={character.notes || ''}
                    onChange={e => updateCharacter(character.id, { notes: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="character-modal-footer">
          <span className="char-modal-hint">
            Changes are automatically saved to the manuscript and included in your Chronicle project.
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
