import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEpub } from '../../context/EpubContext';
import { TimelineSegment, TimelineEvent, TimelineTimescale } from '../../types/epub';
import { TimelineEventModal } from './TimelineEventModal';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Users,
} from 'lucide-react';

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
  } = useEpub();

  const activeTimeline = timelines.find(t => t.id === activeTimelineId) || timelines[0] || null;

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
    const title = prompt('Enter Timeline Title:', `Timeline ${timelines.length + 1}`);
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
    if (window.confirm(`Delete timeline "${activeTimeline.title}"?`)) {
      deleteTimeline(activeTimeline.id);
    }
  };

  // Generate tick array
  const ticks: number[] = [];
  for (let i = 0; i <= totalUnits; i += unitStep) {
    ticks.push(i);
  }

  return (
    <div className="timeline-studio-container">
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
              {timelines.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.segments.length} {t.segments.length === 1 ? 'segment' : 'segments'})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Story Timelines</span>
          )}

          <button
            className="btn btn-sm btn-ghost"
            onClick={handleCreateTimeline}
            title="Create new timeline"
          >
            <Plus size={14} />
            <span>New Timeline</span>
          </button>
        </div>

        {/* Center: Timescale Selector */}
        {activeTimeline && (
          <div className="timeline-timescale-segmented">
            <span className="timescale-label">Scale:</span>
            {(['hours', 'days', 'weeks', 'months', 'years'] as TimelineTimescale[]).map(ts => (
              <button
                key={ts}
                className={`timescale-pill ${timescale === ts ? 'active' : ''}`}
                onClick={() => handleTimescaleChange(ts)}
              >
                {ts === 'hours' ? '24 Hours' : ts.charAt(0).toUpperCase() + ts.slice(1)}
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
              title="Add a new Day or Segment row"
            >
              <Plus size={14} />
              <span>Add Day / Segment</span>
            </button>
            <button
              className="btn btn-sm btn-ghost danger-hover"
              onClick={handleDeleteTimeline}
              title="Delete current timeline"
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
            <h3>No Timelines Created Yet</h3>
            <p>Design multi-day story timelines, plot critical beats, and visualize simultaneous events.</p>
            <button className="btn btn-primary" onClick={handleCreateTimeline}>
              <Plus size={16} />
              <span>Create First Timeline</span>
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
                        {seg.events.length} {seg.events.length === 1 ? 'event' : 'events'}
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
                              <span className="timeline-event-title">{ev.title}</span>
                              {ev.characters && ev.characters.length > 0 && (
                                <Users size={11} className="timeline-event-users-icon" />
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
