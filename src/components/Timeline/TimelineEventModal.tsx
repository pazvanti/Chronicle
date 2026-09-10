import React, { useState, useEffect } from 'react';
import { TimelineEvent, TimelineTimescale, CharacterProfile } from '../../types/epub';
import { X, Trash2, Clock, Check, Users } from 'lucide-react';

import { useEscapeKey } from '../../hooks/useEscapeKey';

interface TimelineEventModalProps {
  isOpen: boolean;
  event: TimelineEvent | null;
  segmentName: string;
  timescale: TimelineTimescale;
  totalUnits: number;
  characters: CharacterProfile[];
  onClose: () => void;
  onSave: (updates: Partial<TimelineEvent>) => void;
  onDelete: () => void;
}

const PRESET_EVENT_COLORS = [
  '#0055d4', // Royal Blue
  '#3a6982', // Sea Steel
  '#ff1721', // Alert Red
  '#7a1a1e', // Burgundy
  '#009a34', // Emerald Green
  '#2d5a36', // Forest Green
  '#00ab2e', // Bright Green
  '#d89614', // Warm Amber
  '#321f42', // Deep Purple
  '#2a3236', // Dark Charcoal
  '#0a0c0e', // Onyx Black
  '#8b5cf6', // Violet
];

const formatHoursToHHMM = (val: number): string => {
  const clamped = Math.max(0, val);
  const totalMinutes = Math.round(clamped * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const parseTimeToHours = (inputStr: string, maxUnits: number): number => {
  const trimmed = inputStr.trim();
  if (!trimmed) return 0;

  // Handle "HH:mm" or "H:mm" format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const total = h + (m / 60);
    return Math.max(0, Math.min(maxUnits, total));
  }

  // Handle decimal hours
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(maxUnits, parsed));
};

const parseDurationToUnits = (inputStr: string, maxUnits: number): number => {
  const trimmed = inputStr.trim();
  if (!trimmed) return 1;

  // Handle "HH:mm" format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const total = h + (m / 60);
    return Math.max(0.05, Math.min(maxUnits, total));
  }

  // Handle "1h 30m" or "45m" format
  if (/h|m/i.test(trimmed)) {
    let hours = 0;
    let mins = 0;
    const hMatch = trimmed.match(/(\d+(\.\d+)?)\s*h/i);
    const mMatch = trimmed.match(/(\d+(\.\d+)?)\s*m/i);
    if (hMatch) hours = parseFloat(hMatch[1]) || 0;
    if (mMatch) mins = parseFloat(mMatch[1]) || 0;
    const total = hours + (mins / 60);
    if (total > 0) return Math.max(0.05, Math.min(maxUnits, total));
  }

  // Decimal
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed)) return 1;
  return Math.max(0.05, Math.min(maxUnits, parsed));
};

export const TimelineEventModal: React.FC<TimelineEventModalProps> = ({
  isOpen,
  event,
  segmentName,
  timescale,
  totalUnits,
  characters,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startStr, setStartStr] = useState<string>('0');
  const [durationStr, setDurationStr] = useState<string>('2');
  const [color, setColor] = useState('#2563eb');
  const [lane, setLane] = useState<number>(0);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      const rawStart = typeof event.start === 'number' ? event.start : 0;
      if (timescale === 'hours') {
        setStartStr(formatHoursToHHMM(rawStart));
      } else {
        setStartStr(String(rawStart));
      }
      setDurationStr(String(typeof event.duration === 'number' ? event.duration : 2));
      setColor(event.color || '#2563eb');
      setLane(typeof event.lane === 'number' ? event.lane : 0);
      setSelectedCharIds(event.characters || []);
    }
  }, [event, timescale]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !event) return null;

  const handleToggleChar = (charId: string) => {
    setSelectedCharIds(prev =>
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalStart = timescale === 'hours'
      ? parseTimeToHours(startStr, totalUnits)
      : Math.max(0, Math.min(totalUnits, parseFloat(startStr) || 0));

    const finalDuration = timescale === 'hours'
      ? parseDurationToUnits(durationStr, totalUnits)
      : Math.max(0.05, Math.min(totalUnits, parseFloat(durationStr) || 1));

    onSave({
      title: title.trim() || 'Untitled Event',
      description: description.trim(),
      start: Number(finalStart.toFixed(4)),
      duration: Number(finalDuration.toFixed(4)),
      color,
      lane: Math.max(0, Number(lane)),
      characters: selectedCharIds,
    });
    onClose();
  };

  const formatUnitValue = (val: number) => {
    if (timescale === 'hours') {
      return formatHoursToHHMM(val);
    }
    return `${val} ${timescale}`;
  };

  const formatDurationHint = (valStr: string) => {
    const val = timescale === 'hours' ? parseDurationToUnits(valStr, totalUnits) : parseFloat(valStr);
    if (isNaN(val) || val <= 0) return `0 ${timescale}`;
    if (timescale === 'hours') {
      const totalMins = Math.round(val * 60);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (h === 0) {
        return `${Number(val.toFixed(2))} hrs (${m}m)`;
      } else if (m === 0) {
        return `${Number(val.toFixed(2))} hrs (${h}h)`;
      } else {
        return `${Number(val.toFixed(2))} hrs (${h}h ${m}m)`;
      }
    }
    return `${val} ${timescale}`;
  };

  const numStart = timescale === 'hours'
    ? parseTimeToHours(startStr, totalUnits)
    : (parseFloat(startStr) || 0);

  const numDuration = timescale === 'hours'
    ? parseDurationToUnits(durationStr, totalUnits)
    : (parseFloat(durationStr) || 0);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '92vw',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            borderLeft: `5px solid ${color}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={18} style={{ color }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Edit Event</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {segmentName} • {formatUnitValue(numStart)} - {formatUnitValue(numStart + numDuration)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <button
              type="button"
              className="btn btn-ghost danger-hover"
              title="Delete event"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Title input */}
          <div>
            <label className="section-label" style={{ marginBottom: '4px', display: 'block' }}>Event Title</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.95rem', fontWeight: 600 }}
              placeholder="e.g. Down the Rabbit Hole, A Mad Tea-Party"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="section-label" style={{ marginBottom: '6px', display: 'block' }}>Event Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {PRESET_EVENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: c,
                    border: color === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                    transform: color === c ? 'scale(1.15)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: color === c ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {color === c && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title="Custom color"
              />
            </div>
          </div>

          {/* Time & Duration Controls */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.85rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <label
                className="section-label"
                style={{
                  marginBottom: '4px',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {timescale === 'hours' ? 'Start Time (HH:mm)' : `Start (${timescale})`}
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                placeholder={timescale === 'hours' ? '10:00' : '0'}
                value={startStr}
                onChange={e => setStartStr(e.target.value)}
              />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {timescale === 'hours'
                  ? `${formatHoursToHHMM(numStart)} (${Number(numStart.toFixed(2))}h)`
                  : formatUnitValue(numStart)}
              </span>
            </div>

            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <label
                className="section-label"
                style={{
                  marginBottom: '4px',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Duration {timescale === 'hours' ? '(hrs)' : `(${timescale})`}
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                placeholder={timescale === 'hours' ? 'e.g. 2 or 1:30' : '1'}
                value={durationStr}
                onChange={e => setDurationStr(e.target.value)}
              />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginTop: '3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatDurationHint(durationStr)}
              </span>
            </div>

            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <label
                className="section-label"
                style={{
                  marginBottom: '4px',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Track Lane
              </label>
              <select
                className="form-input"
                value={lane}
                onChange={e => setLane(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  cursor: 'pointer',
                  textOverflow: 'ellipsis',
                }}
              >
                <option value={0}>Top Lane (0)</option>
                <option value={1}>Sub-Lane 1</option>
                <option value={2}>Sub-Lane 2</option>
              </select>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Vertical row
              </span>
            </div>
          </div>

          {/* Linked Characters */}
          {characters.length > 0 && (
            <div>
              <label className="section-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={12} />
                <span>Featured Characters</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {characters.map(char => {
                  const isSelected = selectedCharIds.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => handleToggleChar(char.id)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '0.74rem',
                        border: isSelected
                          ? `1.5px solid ${char.color || 'var(--color-primary)'}`
                          : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected
                          ? `${char.color || '#3b82f6'}28`
                          : 'rgba(255,255,255,0.04)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {char.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description / Notes */}
          <div>
            <label className="section-label" style={{ marginBottom: '4px', display: 'block' }}>Event Notes / Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="What happens in this scene or event? Key reveals, actions, or conflicts..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
