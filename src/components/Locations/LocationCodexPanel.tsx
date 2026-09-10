import React, { useState } from 'react';
import { useEpub } from '../../context/EpubContext';
import {
  Compass,
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
  Sparkles,
  BookOpen,
  Users,
  MapPin,
  Layers,
  FileText,
} from 'lucide-react';

interface LocationCodexPanelProps {
  onExpandModal: (locationId: string) => void;
  onClose: () => void;
}

const LOCATION_TYPE_OPTIONS = [
  'All',
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

export const LocationCodexPanel: React.FC<LocationCodexPanelProps> = ({
  onExpandModal,
  onClose,
}) => {
  const {
    locations,
    characters,
    addLocation,
    updateLocation,
    deleteLocation,
    toggleLocationFeature,
    addLocationFeature,
    removeLocationFeature,
  } = useEpub();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState('landmark');

  // Collapsible section states in drawer
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    features: true,
    quick: true,
    sensory: false,
    lore: false,
    characters: false,
    notes: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedLocation = locations.find(l => l.id === selectedId) || null;

  // Filtered locations
  const filteredLocations = locations.filter(loc => {
    const matchesType = typeFilter === 'All' || loc.type === typeFilter;
    if (!matchesType) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.oneLineSummary || '').toLowerCase().includes(q) ||
      (loc.region || '').toLowerCase().includes(q) ||
      (loc.aliases || '').toLowerCase().includes(q) ||
      (loc.type || '').toLowerCase().includes(q) ||
      (loc.features || []).some(f => f.name.toLowerCase().includes(q))
    );
  });

  const handleCreateNewLocation = () => {
    const newId = addLocation({
      name: 'New Location',
      type: 'Interior',
      scale: 'Building / Structure',
      oneLineSummary: 'Brief setting hook...',
      color: PRESET_COLORS[locations.length % PRESET_COLORS.length],
      features: [
        {
          id: `feat-${Date.now()}-1`,
          name: 'Main focal entrance / landmark',
          category: 'landmark',
          explored: false,
        },
      ],
    });
    setSelectedId(newId);
  };

  const handleToggleCharacterLink = (locId: string, charId: string) => {
    if (!selectedLocation) return;
    const current = selectedLocation.connectedCharacters || [];
    const updated = current.includes(charId)
      ? current.filter(id => id !== charId)
      : [...current, charId];
    updateLocation(locId, { connectedCharacters: updated });
  };

  const handleAddFeatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !newFeatureName.trim()) return;
    addLocationFeature(selectedLocation.id, newFeatureName.trim(), newFeatureCategory);
    setNewFeatureName('');
  };

  const handleDeleteCurrent = (id: string, name: string) => {
    if (window.confirm(`Delete setting "${name}"?`)) {
      deleteLocation(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  return (
    <div className="character-drawer-panel">
      {/* 1. LIST VIEW */}
      {!selectedLocation ? (
        <div className="char-panel-list-container">
          {/* Header */}
          <div className="char-panel-header">
            <div className="char-panel-header-title">
              <Compass size={16} className="text-primary" />
              <span>Locations Codex</span>
              <span className="char-count-badge">{locations.length}</span>
            </div>
            <div className="char-panel-header-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleCreateNewLocation}
                title="Add new setting"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={onClose}
                title="Close locations panel"
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
              placeholder="Search settings, regions, landmarks..."
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

          {/* Filter Pills */}
          <div className="char-filter-bar">
            {LOCATION_TYPE_OPTIONS.map(type => (
              <button
                key={type}
                className={`char-filter-pill ${typeFilter === type ? 'active' : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Location Cards Scroll */}
          <div className="char-cards-scroll">
            {filteredLocations.length === 0 ? (
              <div className="char-empty-state">
                <Compass size={32} strokeWidth={1.5} className="char-empty-icon" />
                <p className="char-empty-title">
                  {locations.length === 0 ? 'No locations yet' : 'No locations match filter'}
                </p>
                <p className="char-empty-desc">
                  {locations.length === 0
                    ? 'Map out key rooms, cities, sensory palettes, and points of interest for your story.'
                    : 'Try clearing your search query or filter.'}
                </p>
                {locations.length === 0 && (
                  <button className="btn btn-sm btn-primary" onClick={handleCreateNewLocation}>
                    <Plus size={14} />
                    <span>Add First Location</span>
                  </button>
                )}
              </div>
            ) : (
              filteredLocations.map(loc => {
                const totalFeatures = (loc.features || []).length;
                const exploredFeatures = (loc.features || []).filter(f => f.explored).length;
                const progressPct =
                  totalFeatures > 0 ? Math.round((exploredFeatures / totalFeatures) * 100) : 0;

                const connectedCharsList = characters.filter(c =>
                  (loc.connectedCharacters || []).includes(c.id)
                );

                return (
                  <div
                    key={loc.id}
                    className="char-card"
                    style={{ borderLeftColor: loc.color || '#3b82f6' }}
                    onClick={() => setSelectedId(loc.id)}
                  >
                    <div className="char-card-top">
                      <div className="char-card-identity">
                        <div
                          className="char-avatar-mini"
                          style={{
                            backgroundColor: `${loc.color || '#3b82f6'}20`,
                            color: loc.color || '#3b82f6',
                            borderColor: loc.color || '#3b82f6',
                            borderRadius: '6px',
                          }}
                        >
                          <MapPin size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="char-card-name">
                            {loc.name}
                          </div>
                          <div className="char-card-role-row">
                            <span className="char-role-badge">{loc.type}</span>
                            {loc.scale && (
                              <span className="char-archetype-badge">{loc.scale}</span>
                            )}
                            {loc.region && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: 'var(--text-muted)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                • {loc.region}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="char-card-quick-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="char-card-action-btn"
                          title="Open Full Codex Sheet"
                          onClick={() => onExpandModal(loc.id)}
                        >
                          <Maximize2 size={13} />
                        </button>
                        <button
                          className="char-card-action-btn danger"
                          title="Delete Location"
                          onClick={() => handleDeleteCurrent(loc.id, loc.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {loc.oneLineSummary && (
                      <div className="char-card-summary">{loc.oneLineSummary}</div>
                    )}

                    {/* Features & Points of Interest Progress */}
                    {totalFeatures > 0 && (
                      <div className="char-card-traits-summary">
                        <div className="char-card-traits-label">
                          <span>Key Points of Interest</span>
                          <span className="char-card-traits-count">
                            {exploredFeatures}/{totalFeatures}
                          </span>
                        </div>
                        <div className="char-card-progress-track">
                          <div
                            className="char-card-progress-fill"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: loc.color || '#3b82f6',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Connected Characters Chips */}
                    {connectedCharsList.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {connectedCharsList.map(c => (
                          <span
                            key={c.id}
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: `${c.color || '#3b82f6'}18`,
                              color: c.color || 'var(--text-secondary)',
                              border: `1px solid ${c.color || 'var(--border-subtle)'}33`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Users size={10} />
                            <span>{c.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 2. DETAIL VIEW IN DRAWER */
        <div className="char-panel-detail-container">
          {/* Sub-header Navigation */}
          <div className="char-detail-nav">
            <button
              className="btn btn-sm btn-ghost char-back-btn"
              onClick={() => setSelectedId(null)}
              title="Return to locations list"
            >
              <ChevronLeft size={16} />
              <span>Locations</span>
            </button>
            <div className="char-detail-nav-actions">
              <button
                className="btn btn-sm btn-outline"
                title="Expand to Full Sheet Modal"
                onClick={() => onExpandModal(selectedLocation.id)}
              >
                <Maximize2 size={13} />
                <span>Expand</span>
              </button>
              <button
                className="btn btn-sm btn-ghost danger-hover"
                title="Delete Location"
                onClick={() => handleDeleteCurrent(selectedLocation.id, selectedLocation.name)}
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

          {/* Location Quick Info Header Card */}
          <div
            className="char-detail-header-card"
            style={{ borderLeftColor: selectedLocation.color || '#3b82f6' }}
          >
            <div className="char-detail-top-row">
              <input
                type="text"
                className="char-detail-name-input"
                value={selectedLocation.name}
                placeholder="Location Name"
                onChange={e =>
                  updateLocation(selectedLocation.id, { name: e.target.value })
                }
              />
              <select
                className="char-detail-role-select"
                value={selectedLocation.type}
                onChange={e =>
                  updateLocation(selectedLocation.id, { type: e.target.value })
                }
              >
                {LOCATION_TYPE_OPTIONS.filter(t => t !== 'All').map(type => (
                  <option key={type} value={type}>
                    {type}
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
                    className={`char-mini-dot ${selectedLocation.color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateLocation(selectedLocation.id, { color: c })}
                  />
                ))}
              </div>
            </div>

            {/* One-line premise input */}
            <input
              type="text"
              className="char-detail-summary-input"
              placeholder="One-line hook: What this place is and its atmosphere..."
              value={selectedLocation.oneLineSummary || ''}
              onChange={e =>
                updateLocation(selectedLocation.id, { oneLineSummary: e.target.value })
              }
            />
          </div>

          {/* Scrollable Sections */}
          <div className="char-detail-sections-scroll">
            {/* SECTION 1: Points of Interest & Key Landmarks (Todo Checklist) */}
            <div className="char-section-card">
              <div
                className="char-section-header"
                onClick={() => toggleSection('features')}
              >
                <div className="char-section-title">
                  {openSections.features ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Points of Interest</span>
                  <span className="char-progress-mini-tag">
                    {(selectedLocation.features || []).filter(f => f.explored).length}/
                    {(selectedLocation.features || []).length}
                  </span>
                </div>
              </div>

              {openSections.features && (
                <div className="char-section-content">
                  {/* Progress bar */}
                  {(selectedLocation.features || []).length > 0 && (
                    <div className="traits-progress-track mb-2">
                      <div
                        className="traits-progress-fill"
                        style={{
                          width: `${Math.round(
                            (((selectedLocation.features || []).filter(f => f.explored).length) /
                              Math.max(1, (selectedLocation.features || []).length)) *
                              100
                          )}%`,
                          backgroundColor: selectedLocation.color || '#3b82f6',
                        }}
                      />
                    </div>
                  )}

                  {/* Todo list items */}
                  <div className="char-drawer-traits-list">
                    {(selectedLocation.features || []).length === 0 ? (
                      <div className="traits-empty-hint-drawer">
                        No landmarks or points of interest added yet. Check off items as your characters explore them!
                      </div>
                    ) : (
                      selectedLocation.features.map(feat => (
                        <div
                          key={feat.id}
                          className={`trait-todo-item-drawer ${feat.explored ? 'completed' : ''}`}
                        >
                          <button
                            type="button"
                            className="trait-checkbox-btn"
                            onClick={() =>
                              toggleLocationFeature(selectedLocation.id, feat.id)
                            }
                            title={feat.explored ? 'Mark unexplored' : 'Mark explored'}
                          >
                            {feat.explored ? (
                              <CheckSquare size={15} className="text-primary" />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                          <span
                            className="trait-drawer-text"
                            onClick={() =>
                              toggleLocationFeature(selectedLocation.id, feat.id)
                            }
                          >
                            {feat.name}
                          </span>
                          {feat.category && (
                            <span className="trait-drawer-cat">{feat.category}</span>
                          )}
                          <button
                            type="button"
                            className="trait-delete-btn"
                            onClick={() =>
                              removeLocationFeature(selectedLocation.id, feat.id)
                            }
                            title="Remove point of interest"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add feature form */}
                  <form onSubmit={handleAddFeatureSubmit} className="trait-add-form-drawer">
                    <input
                      type="text"
                      className="trait-drawer-input"
                      placeholder="Add landmark, secret, hazard..."
                      value={newFeatureName}
                      onChange={e => setNewFeatureName(e.target.value)}
                    />
                    <select
                      className="trait-drawer-cat-select"
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
                      <Plus size={13} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* SECTION 2: Setting Coordinates & Scale */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('quick')}>
                <div className="char-section-title">
                  {openSections.quick ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Layers size={14} />
                  <span>Setting Coordinates</span>
                </div>
              </div>
              {openSections.quick && (
                <div className="char-section-content">
                  <div className="char-drawer-grid">
                    <div>
                      <span className="char-field-label">Scale</span>
                      <select
                        className="char-drawer-field-input"
                        value={selectedLocation.scale || 'Building / Structure'}
                        onChange={e =>
                          updateLocation(selectedLocation.id, { scale: e.target.value })
                        }
                      >
                        {SCALE_OPTIONS.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="char-field-label">Region / Realm</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. Underland Entrance"
                        value={selectedLocation.region || ''}
                        onChange={e =>
                          updateLocation(selectedLocation.id, { region: e.target.value })
                        }
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="char-field-label">Aliases / Local Names</span>
                      <input
                        type="text"
                        className="char-drawer-field-input"
                        placeholder="e.g. The Long Hall, The Threshold..."
                        value={selectedLocation.aliases || ''}
                        onChange={e =>
                          updateLocation(selectedLocation.id, { aliases: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Sensory Palette */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('sensory')}>
                <div className="char-section-title">
                  {openSections.sensory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Sparkles size={14} />
                  <span>Sensory Atmosphere</span>
                </div>
              </div>
              {openSections.sensory && (
                <div className="char-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <div>
                    <span className="char-field-label">Sight & Architecture</span>
                    <textarea
                      className="char-drawer-textarea"
                      rows={2}
                      placeholder="What draws the eye immediately? Light, colors, scale..."
                      value={selectedLocation.sight || ''}
                      onChange={e =>
                        updateLocation(selectedLocation.id, { sight: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="char-field-label">Sound & Acoustics</span>
                    <textarea
                      className="char-drawer-textarea"
                      rows={2}
                      placeholder="Echoes, silence, mechanical hums, wind..."
                      value={selectedLocation.sound || ''}
                      onChange={e =>
                        updateLocation(selectedLocation.id, { sound: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="char-field-label">Scents, Air & Temperature</span>
                    <textarea
                      className="char-drawer-textarea"
                      rows={2}
                      placeholder="Damp stone, dry tea leaves, drafty chill..."
                      value={selectedLocation.smell || ''}
                      onChange={e =>
                        updateLocation(selectedLocation.id, { smell: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Lore, Rules & Hazards */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('lore')}>
                <div className="char-section-title">
                  {openSections.lore ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <BookOpen size={14} />
                  <span>Lore, Rules & Hazards</span>
                </div>
              </div>
              {openSections.lore && (
                <div className="char-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <div>
                    <span className="char-field-label">History & Origin</span>
                    <textarea
                      className="char-drawer-textarea"
                      rows={2}
                      placeholder="Who built this place? What pivotal events occurred here?"
                      value={selectedLocation.history || ''}
                      onChange={e =>
                        updateLocation(selectedLocation.id, { history: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <span className="char-field-label">Governing Rules & Hazards</span>
                    <textarea
                      className="char-drawer-textarea"
                      rows={2}
                      placeholder="Customs, magical laws, or physical perils..."
                      value={selectedLocation.rulesHazards || ''}
                      onChange={e =>
                        updateLocation(selectedLocation.id, { rulesHazards: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: Resident & Connected Characters */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('characters')}>
                <div className="char-section-title">
                  {openSections.characters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Users size={14} />
                  <span>Resident Characters</span>
                  {(selectedLocation.connectedCharacters || []).length > 0 && (
                    <span className="char-progress-mini-tag">
                      {(selectedLocation.connectedCharacters || []).length}
                    </span>
                  )}
                </div>
              </div>
              {openSections.characters && (
                <div className="char-section-content">
                  {characters.length === 0 ? (
                    <div className="traits-empty-hint-drawer">No characters created yet in this project.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {characters.map(char => {
                        const isSelected = (selectedLocation.connectedCharacters || []).includes(char.id);
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => handleToggleCharacterLink(selectedLocation.id, char.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              border: isSelected
                                ? `1.5px solid ${char.color || 'var(--color-primary)'}`
                                : '1px solid var(--border-subtle)',
                              backgroundColor: isSelected
                                ? `${char.color || '#3b82f6'}24`
                                : 'rgba(255,255,255,0.04)',
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: char.color || '#3b82f6',
                              }}
                            />
                            <span>{char.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 6: Author Notes & Scratchpad */}
            <div className="char-section-card">
              <div className="char-section-header" onClick={() => toggleSection('notes')}>
                <div className="char-section-title">
                  {openSections.notes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FileText size={14} />
                  <span>Author Notes & Scratchpad</span>
                </div>
              </div>
              {openSections.notes && (
                <div className="char-section-content">
                  <textarea
                    className="char-drawer-textarea"
                    rows={3}
                    placeholder="Ideas for scenes set here, sensory reminders, pacing notes..."
                    value={selectedLocation.notes || ''}
                    onChange={e =>
                      updateLocation(selectedLocation.id, { notes: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Bottom CTA to open full modal */}
            <div className="char-detail-bottom-cta">
              <button
                className="btn btn-outline"
                style={{ width: '100%', fontSize: '0.82rem', gap: '0.4rem' }}
                onClick={() => onExpandModal(selectedLocation.id)}
              >
                <Maximize2 size={14} />
                <span>Open Full Codex Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
