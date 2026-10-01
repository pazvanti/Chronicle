import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { TimelineSegment, TimelineEvent, TimelineTimescale } from '../../types/project';
import { TimelineEventModal } from './TimelineEventModal';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Users,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';

function isColorLight(hexColor: string): boolean {
  if (!hexColor || !hexColor.startsWith('#')) return false;
  let hex = hexColor.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

export const TimelineStudio: React.FC = () => {
  const {
    timelines,
    activeTimelineId,
    setActiveTimelineId,
    createTimeline,
    updateTimeline,
    deleteTimeline,
    addTimelineSegment,
    updateTimelineSegment,
    deleteTimelineSegment,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    characters,
    readerTheme,
    customPaperTone,
  } = useEpub();
  const { t } = useTranslation();

  const activeTimeline = timelines.find(tObj => tObj.id === activeTimelineId) || timelines[0] || null;

  // Selected event for modal
  const [modalEvent, setModalEvent] = useState<{
    event: TimelineEvent;
    segmentId: string;
    segmentName: string;
  } | null>(null);

  // Dragging / Resizing interaction state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-right' | 'resize-left';
    eventId: string;
    segmentId: string;
    initialMouseX: number;
    initialStart: number;
    initialDuration: number;
    trackWidth: number;
    totalUnits: number;
  } | null>(null);

  // Prevent click opening modal after drag or resize
  const lastDragEndTimeRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Inline editing for segment title
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentName, setEditingSegmentName] = useState('');

  // Timescale configuration
  const timescale: TimelineTimescale = activeTimeline?.timescale || 'hours';
  const totalUnits = activeTimeline?.totalUnitsPerSegment || (timescale === 'hours' ? 24 : timescale === 'weeks' ? 7 : 12);
  const unitStep = activeTimeline?.unitStep || (timescale === 'hours' ? 2 : 1);

  // Snap interval in time units
  const snapStep = timescale === 'hours' ? 0.25 : 0.5; // 15 mins for hours

  // Compute sub-lane automatically for rendering (if not manually set)
  const computeEventLanes = useCallback((events: TimelineEvent[]) => {
    // Sort by start time
    const sorted = [...events].sort((a, b) => a.start - b.start);
    const lanes: { end: number }[] = [];
    const eventLaneMap: { [id: string]: number } = {};

    sorted.forEach(ev => {
      if (typeof ev.lane === 'number' && ev.lane > 0) {
        eventLaneMap[ev.id] = ev.lane;
        return;
      }
      // Find first lane that doesn't overlap
      let placedLane = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (ev.start >= lanes[i].end) {
          placedLane = i;
          lanes[i].end = ev.start + ev.duration;
          break;
        }
      }
      if (placedLane === -1) {
        placedLane = lanes.length;
        lanes.push({ end: ev.start + ev.duration });
      }
      eventLaneMap[ev.id] = placedLane;
    });

    const maxLane = Math.max(0, ...Object.values(eventLaneMap));
    return { eventLaneMap, maxLane };
  }, []);

  // Format tick labels
  const formatTick = (unitIndex: number, seg?: TimelineSegment) => {
    if (timescale === 'hours') {
      const hh = String(unitIndex).padStart(2, '0');
      // Relative hour offset display if startOffset / zeroHour set
      let relativeStr = '';
      if (seg && typeof seg.startOffset === 'number') {
        const rel = seg.startOffset + unitIndex;
        relativeStr = ` (${rel >= 0 ? '+' : ''}${rel}h)`;
      } else if (seg && typeof seg.zeroHour === 'number') {
        const rel = unitIndex - seg.zeroHour;
        relativeStr = ` (${rel >= 0 ? '+' : ''}${rel}h)`;
      }
      return `${hh}:00${relativeStr}`;
    }
    if (timescale === 'days') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days[unitIndex % 7] || `Day ${unitIndex + 1}`;
    }
    if (timescale === 'weeks') {
      return `Wk ${unitIndex + 1}`;
    }
    if (timescale === 'months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[unitIndex % 12] || `M${unitIndex + 1}`;
    }
    return `Yr ${unitIndex + 1}`;
  };

  // Drag / Resize Event Listeners
  useEffect(() => {
    if (!dragState || !activeTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.initialMouseX;
      if (Math.abs(deltaPx) > 2) {
        hasMovedRef.current = true;
      }
      const unitsPerPx = dragState.totalUnits / dragState.trackWidth;
      const deltaUnits = deltaPx * unitsPerPx;

      if (dragState.type === 'move') {
        let newStart = dragState.initialStart + deltaUnits;
        // Snap to grid
        newStart = Math.round(newStart / snapStep) * snapStep;
        newStart = Math.max(0, Math.min(dragState.totalUnits - dragState.initialDuration, newStart));

        updateTimelineEvent(activeTimeline.id, dragState.segmentId, dragState.eventId, {
          start: Number(newStart.toFixed(2)),
        });
      } else if (dragState.type === 'resize-right') {
        let newDuration = dragState.initialDuration + deltaUnits;
        newDuration = Math.round(newDuration / snapStep) * snapStep;
        newDuration = Math.max(0.25, Math.min(dragState.totalUnits - dragState.initialStart, newDuration));

        updateTimelineEvent(activeTimeline.id, dragState.segmentId, dragState.eventId, {
          duration: Number(newDuration.toFixed(2)),
        });
      } else if (dragState.type === 'resize-left') {
        let newStart = dragState.initialStart + deltaUnits;
        newStart = Math.round(newStart / snapStep) * snapStep;
        newStart = Math.max(0, Math.min(dragState.initialStart + dragState.initialDuration - 0.25, newStart));
        const newDuration = dragState.initialDuration + (dragState.initialStart - newStart);

        updateTimelineEvent(activeTimeline.id, dragState.segmentId, dragState.eventId, {
          start: Number(newStart.toFixed(2)),
          duration: Number(newDuration.toFixed(2)),
        });
      }
    };

    const handleMouseUp = () => {
      if (hasMovedRef.current) {
        lastDragEndTimeRef.current = Date.now();
      }
      hasMovedRef.current = false;
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, activeTimeline, updateTimelineEvent, snapStep]);

  // Click on empty track area to quickly add an event
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, seg: TimelineSegment) => {
    if (!activeTimeline) return;
    if (Date.now() - lastDragEndTimeRef.current < 250) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    let clickedUnit = clickRatio * totalUnits;
    clickedUnit = Math.round(clickedUnit / snapStep) * snapStep;
    clickedUnit = Math.max(0, Math.min(totalUnits - 1, clickedUnit));

    const defaultDuration = timescale === 'hours' ? 2 : 1;
    addTimelineEvent(activeTimeline.id, seg.id, {
      title: 'New Event',
      start: clickedUnit,
      duration: defaultDuration,
      color: '#2563eb',
    });
  };

  const handleCreateTimeline = () => {
    const title = prompt('Timeline:', `${t('timeline.title')} ${timelines.length + 1}`);
    if (title && title.trim()) {
      createTimeline({
        title: title.trim(),
        timescale: 'hours',
      });
    }
  };

  const handleTimescaleChange = (newScale: TimelineTimescale) => {
    if (!activeTimeline) return;
    const defaultUnits = newScale === 'hours' ? 24 : newScale === 'weeks' ? 7 : 12;
    const defaultStep = newScale === 'hours' ? 2 : 1;
    updateTimeline(activeTimeline.id, {
      timescale: newScale,
      totalUnitsPerSegment: defaultUnits,
      unitStep: defaultStep,
    });
  };

  const handleDeleteTimeline = () => {
    if (!activeTimeline) return;
    if (window.confirm(`${activeTimeline.title}?`)) {
      deleteTimeline(activeTimeline.id);
    }
  };

  // Generate tick array
  const ticks: number[] = [];
  for (let i = 0; i <= totalUnits; i += unitStep) {
    ticks.push(i);
  }

  const activeTone = readerTheme || 'light';

  const themeVars = useMemo<React.CSSProperties>(() => {
    if (activeTone === 'custom') {
      const paper = customPaperTone?.paperColor || '#FBF7EE';
      const canvas = customPaperTone?.canvasColor || '#E8E0D0';
      const text = customPaperTone?.textColor || '#24211D';
      const isCustomDark = !isColorLight(paper);

      return {
        '--custom-paper-color': paper,
        '--custom-canvas-color': canvas,
        '--custom-text-color': text,
        '--timeline-desk-bg': canvas,
        '--timeline-canvas-bg': canvas,
        '--timeline-card-bg': paper,
        '--timeline-card-border': isCustomDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        '--timeline-card-shadow': isCustomDark ? '0 4px 20px rgba(0, 0, 0, 0.45)' : '0 4px 18px rgba(0, 0, 0, 0.08)',
        '--timeline-track-bg': `color-mix(in srgb, ${paper} 90%, ${text} 10%)`,
        '--timeline-track-border': isCustomDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.14)',
        '--timeline-track-border-hover': isCustomDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.28)',
        '--timeline-gridline': isCustomDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        '--timeline-text-primary': text,
        '--timeline-text-hover': text,
        '--timeline-text-muted': isCustomDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)',
        '--timeline-ruler-border': isCustomDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.14)',
        '--timeline-tick-line': isCustomDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)',
        '--timeline-pill-bg': isCustomDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
        '--timeline-pill-text': text,
        '--timeline-input-bg': paper,
        '--timeline-input-text': text,
        '--timeline-input-border': 'var(--accent-primary, #0284c7)',
        '--timeline-event-shadow': isCustomDark ? '0 2px 8px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.18)',
        '--timeline-event-border': isCustomDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)',
      } as React.CSSProperties;
    }

    if (activeTone === 'sepia') {
      return {
        '--timeline-desk-bg': '#ede5d8',
        '--timeline-canvas-bg': '#ede5d8',
        '--timeline-card-bg': '#f7f3e8',
        '--timeline-card-border': '#dfd5c4',
        '--timeline-card-shadow': '0 4px 18px rgba(60, 40, 20, 0.08), 0 1px 3px rgba(60, 40, 20, 0.04)',
        '--timeline-track-bg': '#eee7d8',
        '--timeline-track-border': '#dcd1be',
        '--timeline-track-border-hover': '#bfae95',
        '--timeline-gridline': 'rgba(90, 60, 30, 0.07)',
        '--timeline-text-primary': '#2e261f',
        '--timeline-text-hover': '#1a1510',
        '--timeline-text-muted': '#7c6853',
        '--timeline-ruler-border': '#dfd5c4',
        '--timeline-tick-line': '#cfc2ad',
        '--timeline-pill-bg': '#e8ded0',
        '--timeline-pill-text': '#5c4632',
        '--timeline-input-bg': '#f7f3e8',
        '--timeline-input-text': '#2e261f',
        '--timeline-input-border': 'var(--accent-primary, #0284c7)',
        '--timeline-event-shadow': '0 2px 8px rgba(60, 40, 20, 0.2)',
        '--timeline-event-border': 'rgba(60, 40, 20, 0.12)',
      } as React.CSSProperties;
    }

    if (activeTone === 'obsidian') {
      return {
        '--timeline-desk-bg': '#000000',
        '--timeline-canvas-bg': '#000000',
        '--timeline-card-bg': '#0d0d10',
        '--timeline-card-border': '#222227',
        '--timeline-card-shadow': '0 0 0 1px #222227, 0 8px 30px rgba(0, 0, 0, 0.95)',
        '--timeline-track-bg': '#050507',
        '--timeline-track-border': '#222227',
        '--timeline-track-border-hover': '#3f3f46',
        '--timeline-gridline': 'rgba(255, 255, 255, 0.04)',
        '--timeline-text-primary': '#f4f4f6',
        '--timeline-text-hover': '#ffffff',
        '--timeline-text-muted': '#71717a',
        '--timeline-ruler-border': '#222227',
        '--timeline-tick-line': '#3f3f46',
        '--timeline-pill-bg': 'rgba(255, 255, 255, 0.08)',
        '--timeline-pill-text': '#a1a1aa',
        '--timeline-input-bg': '#050507',
        '--timeline-input-text': '#ffffff',
        '--timeline-input-border': 'var(--accent-primary, #0284c7)',
        '--timeline-event-shadow': '0 2px 8px rgba(0, 0, 0, 0.6)',
        '--timeline-event-border': 'rgba(255, 255, 255, 0.2)',
      } as React.CSSProperties;
    }

    if (activeTone === 'dark') {
      return {
        '--timeline-desk-bg': '#141619',
        '--timeline-canvas-bg': '#121417',
        '--timeline-card-bg': '#1c1f24',
        '--timeline-card-border': 'rgba(255, 255, 255, 0.08)',
        '--timeline-card-shadow': '0 4px 20px rgba(0, 0, 0, 0.3)',
        '--timeline-track-bg': '#16181c',
        '--timeline-track-border': 'rgba(255, 255, 255, 0.08)',
        '--timeline-track-border-hover': 'rgba(255, 255, 255, 0.2)',
        '--timeline-gridline': 'rgba(255, 255, 255, 0.04)',
        '--timeline-text-primary': '#f3f4f6',
        '--timeline-text-hover': '#ffffff',
        '--timeline-text-muted': '#9ca3af',
        '--timeline-ruler-border': 'rgba(255, 255, 255, 0.12)',
        '--timeline-tick-line': 'rgba(255, 255, 255, 0.25)',
        '--timeline-pill-bg': 'rgba(255, 255, 255, 0.06)',
        '--timeline-pill-text': 'var(--text-muted)',
        '--timeline-input-bg': '#141619',
        '--timeline-input-text': '#ffffff',
        '--timeline-input-border': 'var(--accent-primary, #0284c7)',
        '--timeline-event-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)',
        '--timeline-event-border': 'rgba(255, 255, 255, 0.2)',
      } as React.CSSProperties;
    }

    // Default: light
    return {
      '--timeline-desk-bg': '#f0f2f5',
      '--timeline-canvas-bg': '#f0f2f5',
      '--timeline-card-bg': '#ffffff',
      '--timeline-card-border': '#e2e8f0',
      '--timeline-card-shadow': '0 4px 18px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)',
      '--timeline-track-bg': '#f8fafc',
      '--timeline-track-border': '#e2e8f0',
      '--timeline-track-border-hover': '#cbd5e1',
      '--timeline-gridline': 'rgba(0, 0, 0, 0.05)',
      '--timeline-text-primary': '#0f172a',
      '--timeline-text-hover': '#0284c7',
      '--timeline-text-muted': '#64748b',
      '--timeline-ruler-border': '#e2e8f0',
      '--timeline-tick-line': '#cbd5e1',
      '--timeline-pill-bg': '#f1f5f9',
      '--timeline-pill-text': '#475569',
      '--timeline-input-bg': '#ffffff',
      '--timeline-input-text': '#0f172a',
      '--timeline-input-border': 'var(--accent-primary, #0284c7)',
      '--timeline-event-shadow': '0 2px 8px rgba(0, 0, 0, 0.16)',
      '--timeline-event-border': 'rgba(0, 0, 0, 0.08)',
    } as React.CSSProperties;
  }, [activeTone, customPaperTone]);

  return (
    <div
      className={`timeline-studio-container timeline-theme-${activeTone}`}
      style={themeVars}
    >
      {/* Top Studio Toolbar */}
      <div className="timeline-studio-toolbar">
        {/* Left: Timeline Switcher */}
        <div className="timeline-selector-group">
          <Clock size={18} className="text-primary" />
          {timelines.length > 0 ? (
            <select
              className="timeline-dropdown-select"
              value={activeTimeline?.id || ''}
              onChange={e => setActiveTimelineId(e.target.value)}
            >
              {timelines.map(tOption => (
                <option key={tOption.id} value={tOption.id}>
                  {tOption.title} ({tOption.segments.length} {tOption.segments.length === 1 ? t('timeline.segmentSingle') : t('timeline.segmentPlural')})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('timeline.title')}</span>
          )}

          <button
            className="btn btn-sm btn-ghost"
            onClick={handleCreateTimeline}
            title={t('timeline.addTimeline')}
          >
            <Plus size={14} />
            <span>{t('timeline.addTimeline')}</span>
          </button>
        </div>

        {/* Center: Timescale Selector */}
        {activeTimeline && (
          <div className="timeline-timescale-segmented">
            <span className="timescale-label">{t('timeline.timescaleLabel').replace(/:$/, '')}:</span>
            {(['hours', 'days', 'weeks', 'months', 'years'] as TimelineTimescale[]).map(ts => (
              <button
                key={ts}
                className={`timescale-pill ${timescale === ts ? 'active' : ''}`}
                onClick={() => handleTimescaleChange(ts)}
              >
                {ts === 'hours'
                  ? t('timeline.timescaleHours')
                  : ts === 'days'
                  ? t('timeline.timescaleDays')
                  : ts === 'weeks'
                  ? t('timeline.timescaleWeeks')
                  : ts === 'months'
                  ? t('timeline.timescaleMonths')
                  : t('timeline.timescaleYears')}
              </button>
            ))}
          </div>
        )}

        {/* Right: Actions */}
        {activeTimeline && (
          <div className="timeline-actions-group">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => addTimelineSegment(activeTimeline.id)}
              title={t('timeline.addSegment')}
            >
              <Plus size={14} />
              <span>{t('timeline.addSegment')}</span>
            </button>
            <button
              className="btn btn-sm btn-ghost danger-hover"
              onClick={handleDeleteTimeline}
              title={t('common.delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="timeline-canvas-scroll">
        {!activeTimeline || activeTimeline.segments.length === 0 ? (
          <div className="timeline-empty-state">
            <Clock size={48} strokeWidth={1.5} className="timeline-empty-icon" />
            <h3>{t('timeline.noEvents')}</h3>
            <p>{t('timeline.subtitle')}</p>
            <button className="btn btn-primary" onClick={handleCreateTimeline}>
              <Plus size={16} />
              <span>{t('timeline.addTimeline')}</span>
            </button>
          </div>
        ) : (
          <div className="timeline-tracks-list">
            {activeTimeline.segments.map(seg => {
              const { eventLaneMap, maxLane } = computeEventLanes(seg.events);
              // Calculate track lane height
              const laneHeight = 36;
              const trackHeight = Math.max(76, (maxLane + 1) * (laneHeight + 8) + 16);

              return (
                <div key={seg.id} className="timeline-day-card">
                  {/* Segment / Day Header */}
                  <div className="timeline-day-header">
                    <div className="timeline-day-title-row">
                      {editingSegmentId === seg.id ? (
                        <input
                          type="text"
                          className="timeline-day-name-input"
                          value={editingSegmentName}
                          onChange={e => setEditingSegmentName(e.target.value)}
                          onBlur={() => {
                            if (editingSegmentName.trim()) {
                              updateTimelineSegment(activeTimeline.id, seg.id, {
                                name: editingSegmentName.trim(),
                              });
                            }
                            setEditingSegmentId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editingSegmentName.trim()) {
                                updateTimelineSegment(activeTimeline.id, seg.id, {
                                name: editingSegmentName.trim(),
                              });
                            }
                            setEditingSegmentId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="timeline-day-name"
                          onClick={() => {
                            setEditingSegmentId(seg.id);
                            setEditingSegmentName(seg.name);
                          }}
                          title="Click to rename"
                        >
                          <span>{seg.name}</span>
                          <Edit2 size={12} className="timeline-edit-hint" />
                        </div>
                      )}

                      <span className="timeline-event-count-pill">
                        {seg.events.length} {seg.events.length === 1 ? t('timeline.eventSingle') : t('timeline.eventPlural')}
                      </span>
                    </div>

                    <div className="timeline-day-actions">
                      <button
                        className="btn btn-sm btn-ghost danger-hover"
                        title="Delete Day / Segment"
                        onClick={() => {
                          if (window.confirm(`Delete ${seg.name}?`)) {
                            deleteTimelineSegment(activeTimeline.id, seg.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Timeline Ruler & Track Grid */}
                  <div className="timeline-track-wrapper">
                    {/* Time Ruler (Ticks) */}
                    <div className="timeline-ruler">
                      {ticks.map((tickVal, idx) => {
                        const percent = (tickVal / totalUnits) * 100;
                        const isFirst = idx === 0;
                        const isLast = idx === ticks.length - 1;
                        return (
                          <div
                            key={tickVal}
                            className={`timeline-ruler-tick ${isFirst ? 'first-tick' : ''} ${isLast ? 'last-tick' : ''}`}
                            style={{ left: `${percent}%` }}
                          >
                            <span className="tick-label">{formatTick(tickVal, seg)}</span>
                            <div className="tick-line" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Interactive Event Track Grid */}
                    <div
                      className="timeline-events-track"
                      style={{ height: `${trackHeight}px` }}
                      onClick={e => handleTrackClick(e, seg)}
                      title="Click anywhere to add event at that time"
                    >
                      {/* Vertical Background Gridlines */}
                      {ticks.map(tickVal => {
                        const percent = (tickVal / totalUnits) * 100;
                        return (
                          <div
                            key={tickVal}
                            className="timeline-gridline"
                            style={{ left: `${percent}%` }}
                          />
                        );
                      })}

                      {/* Event Blocks */}
                      {seg.events.map(ev => {
                        const leftPercent = (ev.start / totalUnits) * 100;
                        const widthPercent = (ev.duration / totalUnits) * 100;
                        const currentLane = eventLaneMap[ev.id] ?? (ev.lane || 0);
                        const topPx = 10 + currentLane * (laneHeight + 8);

                        const isEvLight = isColorLight(ev.color || '#2563eb');

                        return (
                          <div
                            key={ev.id}
                            className="timeline-event-block"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              top: `${topPx}px`,
                              height: `${laneHeight}px`,
                              backgroundColor: ev.color || '#2563eb',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              if (Date.now() - lastDragEndTimeRef.current < 250) return;
                              setModalEvent({
                                event: ev,
                                segmentId: seg.id,
                                segmentName: seg.name,
                              });
                            }}
                            title={`${ev.title} (${ev.start} - ${ev.start + ev.duration})`}
                          >
                            {/* Left Resize Handle */}
                            <div
                              className="timeline-resize-handle left"
                              onMouseDown={e => {
                                e.stopPropagation();
                                hasMovedRef.current = false;
                                const trackRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                if (trackRect) {
                                  setDragState({
                                    type: 'resize-left',
                                    eventId: ev.id,
                                    segmentId: seg.id,
                                    initialMouseX: e.clientX,
                                    initialStart: ev.start,
                                    initialDuration: ev.duration,
                                    trackWidth: trackRect.width,
                                    totalUnits,
                                  });
                                }
                              }}
                            />

                            {/* Center Drag Handle (Move) */}
                            <div
                              className="timeline-event-content"
                              onMouseDown={e => {
                                e.stopPropagation();
                                hasMovedRef.current = false;
                                const trackRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                if (trackRect) {
                                  setDragState({
                                    type: 'move',
                                    eventId: ev.id,
                                    segmentId: seg.id,
                                    initialMouseX: e.clientX,
                                    initialStart: ev.start,
                                    initialDuration: ev.duration,
                                    trackWidth: trackRect.width,
                                    totalUnits,
                                  });
                                }
                              }}
                            >
                              <span
                                className="timeline-event-title"
                                style={{
                                  color: isEvLight ? '#0f172a' : '#ffffff',
                                  textShadow: isEvLight ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.6)',
                                }}
                              >
                                {ev.title}
                              </span>
                              {ev.characters && ev.characters.length > 0 && (
                                <Users
                                  size={11}
                                  className="timeline-event-users-icon"
                                  style={{
                                    color: isEvLight ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.75)',
                                  }}
                                />
                              )}
                            </div>

                            {/* Right Resize Handle */}
                            <div
                              className="timeline-resize-handle right"
                              onMouseDown={e => {
                                e.stopPropagation();
                                hasMovedRef.current = false;
                                const trackRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                if (trackRect) {
                                  setDragState({
                                    type: 'resize-right',
                                    eventId: ev.id,
                                    segmentId: seg.id,
                                    initialMouseX: e.clientX,
                                    initialStart: ev.start,
                                    initialDuration: ev.duration,
                                    trackWidth: trackRect.width,
                                    totalUnits,
                                  });
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {modalEvent && activeTimeline && (
        <TimelineEventModal
          isOpen={!!modalEvent}
          event={modalEvent.event}
          segmentName={modalEvent.segmentName}
          timescale={timescale}
          totalUnits={totalUnits}
          characters={characters}
          onClose={() => setModalEvent(null)}
          onSave={updates => {
            updateTimelineEvent(activeTimeline.id, modalEvent.segmentId, modalEvent.event.id, updates);
          }}
          onDelete={() => {
            deleteTimelineEvent(activeTimeline.id, modalEvent.segmentId, modalEvent.event.id);
            setModalEvent(null);
          }}
        />
      )}
    </div>
  );
};
