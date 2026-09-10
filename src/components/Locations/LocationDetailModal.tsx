import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  X,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  Compass,
  MapPin,
  Eye,
  Volume2,
  Wind,
  Sparkles,
  BookOpen,
  Users,
  Layers,
  FileText,
  Check,
} from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface LocationDetailModalProps {
  locationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const LOCATION_TYPE_OPTIONS = [
  'Interior',
  'Exterior',
  'City / Settlement',
  'Wilderness',
  'Landmark',
  'Realm',
  'Room / Chamber',
];

const SCALE_OPTIONS = [
  'Chamber / Room',
  'Building / Structure',
  'Settlement / Town',
  'District',
  'Region / Wilderness',
  'Realm / World',
];

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#d89614', // Warm Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3a6982', // Sea Steel
  '#475569', // Slate
];

const FEATURE_CATEGORIES = [
  { id: 'landmark', label: 'Landmark' },
  { id: 'secret', label: 'Secret' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'resource', label: 'Resource' },
  { id: 'clue', label: 'Clue' },
  { id: 'custom', label: 'Custom' },
];

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  locationId,
  isOpen,
  onClose,
}) => {
  const {
    locations,
    characters,
    updateLocation,
    deleteLocation,
    toggleLocationFeature,
    addLocationFeature,
    removeLocationFeature,
  } = useEpub();

  const location = locations.find(l => l.id === locationId) || null;

  const [activeTab, setActiveTab] = useState<'sensory' | 'lore' | 'characters' | 'notes'>('sensory');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState('landmark');

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !location) return null;

  const exploredCount = (location.features || []).filter(f => f.explored).length;
  const totalCount = (location.features || []).length;
  const percent = totalCount > 0 ? Math.round((exploredCount / totalCount) * 100) : 0;

  const handleAddFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName.trim()) return;
    addLocationFeature(location.id, newFeatureName.trim(), newFeatureCategory);
    setNewFeatureName('');
  };

  const handleToggleCharacter = (charId: string) => {
    const current = location.connectedCharacters || [];
    const updated = current.includes(charId)
      ? current.filter(id => id !== charId)
      : [...current, charId];
    updateLocation(location.id, { connectedCharacters: updated });
  };

  const handleDeleteLocation = () => {
    if (window.confirm(`Are you sure you want to delete setting "${location.name}"?`)) {
      deleteLocation(location.id);
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
        {/* MODAL HEADER */}
        <div
          className="character-modal-header"
          style={{
            borderLeft: `6px solid ${location.color || '#3b82f6'}`,
          }}
        >
          <div className="character-header-left">
            <div
              className="character-avatar-large"
              style={{
                backgroundColor: `${location.color || '#3b82f6'}20`,
                color: location.color || '#3b82f6',
                borderColor: location.color || '#3b82f6',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <MapPin size={24} />
            </div>

            <div className="character-header-titles">
              <input
                type="text"
                className="character-name-input-large"
                value={location.name}
                placeholder="Location Name"
                onChange={e => updateLocation(location.id, { name: e.target.value })}
              />
              <div className="character-header-meta">
                <select
                  className="character-role-select"
                  value={location.type}
                  onChange={e => updateLocation(location.id, { type: e.target.value })}
                >
                  {LOCATION_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                <select
                  className="character-role-select"
                  value={location.scale || 'Building / Structure'}
                  onChange={e => updateLocation(location.id, { scale: e.target.value })}
                >
                  {SCALE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {location.region && (
                  <span className="character-archetype-tag">
                    Region: {location.region}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="character-header-actions">
            <button
              className="btn btn-ghost danger-hover"
              title="Delete Setting"
              onClick={handleDeleteLocation}
            >
              <Trash2 size={16} />
            </button>
            <button className="btn btn-ghost" title="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY: 2-COLUMN SPLIT */}
        <div className="character-modal-body">
          {/* Left Column: Quick Coordinates, Theme Color, Points of Interest Checklist */}
          <div className="character-modal-sidebar">
            {/* Color accent selector */}
            <div className="char-sidebar-section">
              <label className="section-label">Location Accent Color</label>
              <div className="char-color-palette">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`char-color-dot ${location.color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateLocation(location.id, { color: c })}
                  />
                ))}
              </div>
            </div>

            {/* Quick Profile fields */}
            <div className="char-sidebar-section">
              <label className="section-label">Setting Coordinates</label>
              <div className="char-field-grid">
                <div className="char-field-group">
                  <span className="field-caption">Region / Territory</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. Underland Entrance"
                    value={location.region || ''}
                    onChange={e => updateLocation(location.id, { region: e.target.value })}
                  />
                </div>
                <div className="char-field-group">
                  <span className="field-caption">Aliases / Names</span>
                  <input
                    type="text"
                    className="char-input-sm"
                    placeholder="e.g. The Long Hall"
                    value={location.aliases || ''}
                    onChange={e => updateLocation(location.id, { aliases: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* One-Line Hook / Summary */}
            <div className="char-sidebar-section">
              <label className="section-label">One-Line Hook / Premise</label>
              <textarea
                className="char-textarea-sm"
                rows={2}
                placeholder="A brief 1-sentence hook of what this place is and its atmosphere..."
                value={location.oneLineSummary || ''}
                onChange={e => updateLocation(location.id, { oneLineSummary: e.target.value })}
              />
            </div>

            {/* Points of Interest Todo Checklist */}
            <div className="char-sidebar-section traits-todo-section">
              <div className="traits-todo-header">
                <label className="section-label">Points of Interest</label>
                <span className="traits-progress-pill">
                  {exploredCount} of {totalCount} ({percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="traits-progress-track">
                <div
                  className="traits-progress-fill"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: location.color || '#3b82f6',
                  }}
                />
              </div>

              {/* Items list */}
              <div className="traits-items-list">
                {(location.features || []).length === 0 ? (
                  <div className="traits-empty-hint">
                    No points of interest added yet. Add landmarks, secret doors, or hazards below!
                  </div>
                ) : (
                  location.features.map(feat => (
                    <div
                      key={feat.id}
                      className={`trait-todo-item ${feat.explored ? 'completed' : ''}`}
                    >
                      <button
                        type="button"
                        className="trait-checkbox-btn"
                        onClick={() => toggleLocationFeature(location.id, feat.id)}
                        title={feat.explored ? 'Mark unexplored' : 'Mark explored'}
                      >
                        {feat.explored ? (
                          <CheckSquare size={16} className="text-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <span
                        className="trait-item-text"
                        onClick={() => toggleLocationFeature(location.id, feat.id)}
                      >
                        {feat.name}
                      </span>
                      {feat.category && (
                        <span className="trait-item-cat">{feat.category}</span>
                      )}
                      <button
                        type="button"
                        className="trait-delete-btn"
                        onClick={() => removeLocationFeature(location.id, feat.id)}
                        title="Remove point of interest"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add feature form */}
              <form onSubmit={handleAddFeatureSubmit} className="trait-add-form">
                <input
                  type="text"
                  className="trait-add-input"
                  placeholder="Add landmark or secret..."
                  value={newFeatureName}
                  onChange={e => setNewFeatureName(e.target.value)}
                />
                <select
                  className="trait-add-cat-select"
                  value={newFeatureCategory}
                  onChange={e => setNewFeatureCategory(e.target.value)}
                >
                  {FEATURE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={!newFeatureName.trim()}
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
                className={`char-tab-btn ${activeTab === 'sensory' ? 'active' : ''}`}
                onClick={() => setActiveTab('sensory')}
              >
                <Sparkles size={14} />
                <span>Sensory Palette</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'lore' ? 'active' : ''}`}
                onClick={() => setActiveTab('lore')}
              >
                <BookOpen size={14} />
                <span>Lore & Rules</span>
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
                onClick={() => setActiveTab('characters')}
              >
                <Users size={14} />
                <span>Connected Characters</span>
                {(location.connectedCharacters || []).length > 0 && (
                  <span className="char-progress-mini-tag">
                    {(location.connectedCharacters || []).length}
                  </span>
                )}
              </button>
              <button
                className={`char-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                <FileText size={14} />
                <span>Writer Notes & Beats</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="char-narrative-content">
              {/* TAB 1: SENSORY PALETTE */}
              {activeTab === 'sensory' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Sensory Atmosphere & Environmental Immersion</h4>
                    <p className="caption">
                      Bring the setting alive on the page with tactile sensory anchors: sights, sounds, scents, and lighting.
                    </p>
                  </div>

                  <div className="char-narrative-grid">
                    <div className="char-narrative-card">
                      <label>
                        <Eye size={14} className="text-primary" />
                        <span>Sight & Visual Architecture</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={5}
                        placeholder="What draws the eye first? Scale, colors, geometries, state of repair, distinctive decor..."
                        value={location.sight || ''}
                        onChange={e => updateLocation(location.id, { sight: e.target.value })}
                      />
                    </div>

                    <div className="char-narrative-card">
                      <label>
                        <Volume2 size={14} className="text-primary" />
                        <span>Sounds & Acoustics</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={5}
                        placeholder="Echoes, murmurs, ticking clocks, draft whistling through keyholes, profound quiet..."
                        value={location.sound || ''}
                        onChange={e => updateLocation(location.id, { sound: e.target.value })}
                      />
                    </div>

                    <div className="char-narrative-card">
                      <label>
                        <Wind size={14} className="text-primary" />
                        <span>Scents, Air & Temperature</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={5}
                        placeholder="Damp stone, aged wax, dry tea leaves, drafty chill, humid oppressive air..."
                        value={location.smell || ''}
                        onChange={e => updateLocation(location.id, { smell: e.target.value })}
                      />
                    </div>

                    <div className="char-narrative-card">
                      <label>
                        <Sparkles size={14} className="text-primary" />
                        <span>Lighting & Atmospheric Mood</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={5}
                        placeholder="Shafts of sun, flickering lamps, heavy shadows, surreal dreamlike tension..."
                        value={location.atmosphere || ''}
                        onChange={e => updateLocation(location.id, { atmosphere: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LORE, HISTORY & WORLD RULES */}
              {activeTab === 'lore' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Lore, History & Governing World Rules</h4>
                    <p className="caption">
                      Record the historical backstory of this place, physical or magical laws that govern it, and hidden secrets.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="char-narrative-card">
                      <label>
                        <BookOpen size={14} className="text-primary" />
                        <span>Origin, Builders & Historical Significance</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={4}
                        placeholder="Who built or founded this place? What pivotal historical events or wars occurred here?"
                        value={location.history || ''}
                        onChange={e => updateLocation(location.id, { history: e.target.value })}
                      />
                    </div>

                    <div className="char-narrative-card">
                      <label>
                        <Layers size={14} className="text-primary" />
                        <span>Governing Laws, Magical Rules & Hazards</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={4}
                        placeholder="What customs, physical dangers, or supernatural laws govern anyone entering? (e.g. gravity shifts, do not speak untruths)..."
                        value={location.rulesHazards || ''}
                        onChange={e => updateLocation(location.id, { rulesHazards: e.target.value })}
                      />
                    </div>

                    <div className="char-narrative-card">
                      <label>
                        <Compass size={14} className="text-primary" />
                        <span>Hidden Secrets, Passages & Significance</span>
                      </label>
                      <textarea
                        className="char-narrative-card-textarea"
                        rows={4}
                        placeholder="Passages known only to a few, buried treasure, narrative significance..."
                        value={location.significance || ''}
                        onChange={e => updateLocation(location.id, { significance: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONNECTED CHARACTERS */}
              {activeTab === 'characters' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Resident & Connected Characters</h4>
                    <p className="caption">
                      Click characters to associate them with this setting. Characters who inhabit, visit, or share pivotal memories here.
                    </p>
                  </div>

                  {characters.length === 0 ? (
                    <div className="traits-empty-hint">
                      No characters have been created in this project yet. Use the Character Sheet to add characters first!
                    </div>
                  ) : (
                    <div className="char-connection-grid">
                      {characters.map(char => {
                        const isConnected = (location.connectedCharacters || []).includes(char.id);
                        return (
                          <div
                            key={char.id}
                            className={`char-connection-card ${isConnected ? 'active' : ''}`}
                            onClick={() => handleToggleCharacter(char.id)}
                          >
                            <div
                              className="char-avatar-mini"
                              style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: `${char.color || '#3b82f6'}20`,
                                color: char.color || '#3b82f6',
                                borderColor: char.color || '#3b82f6',
                              }}
                            >
                              {char.name.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {char.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {char.role}
                              </div>
                            </div>
                            {isConnected && (
                              <Check size={16} className="text-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WRITER NOTES & SCENE BEATS */}
              {activeTab === 'notes' && (
                <div className="char-tab-pane">
                  <div className="char-pane-header">
                    <h4>Writer Notes & Scene Beats</h4>
                    <p className="caption">
                      Brainstorming, drafting reminders, scene beats, and dramatic confrontations planned for this setting.
                    </p>
                  </div>
                  <textarea
                    className="char-narrative-textarea"
                    rows={14}
                    placeholder="E.g., In Chapter 4, Alice first enters this hall after falling down the rabbit hole. Emphasize the locked gold key on the 3-legged glass table and the tiny door..."
                    value={location.notes || ''}
                    onChange={e => updateLocation(location.id, { notes: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="character-modal-footer">
          <span className="char-modal-hint">
            Setting ID: <code style={{ fontFamily: 'monospace' }}>{location.id}</code>
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
