import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEpub } from '../../context/EpubContext';
import { useTts } from '../../context/TtsContext';
import { SpeechChunk } from '../../services/tts/textChunker';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BookMarked,
  Heart,
  Volume2,
  VolumeX,
  Headphones,
  Settings2,
  X,
} from 'lucide-react';

export const AudioPlayerBar: React.FC = () => {
  const { book, activeChapter } = useEpub();
  const {
    isAudioActive,
    isPlaying,
    isPaused,
    pauseAudio,
    resumeAudio,
    stopAudio,
    skipNext,
    skipPrev,
    seekToChunk,
    currentChunkIndex,
    totalChunks,
    allChunks,
    playbackSpeed,
    setPlaybackSpeed,
    activeVoiceData,
    openModelModal,
    volume,
    setVolume,
    isNeuralModelLoaded,
    subscribeToTimeUpdate,
  } = useTts();

  const [knownDurations, setKnownDurations] = useState<Record<number, number>>({});
  const [subChunkTime, setSubChunkTime] = useState<number>(0);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState<boolean>(false);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const prevVolumeRef = useRef<number>(volume > 0 ? volume : 1.0);

  // Keep track of non-zero volume for mute toggling
  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
    }
  }, [volume]);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 1.0);
    }
  };

  // Reset sub-chunk timer whenever active chunk changes
  useEffect(() => {
    setSubChunkTime(0);
  }, [currentChunkIndex]);

  // Subscribe to real-time audio playback clock updates
  useEffect(() => {
    const unsubscribe = subscribeToTimeUpdate((currentTime, duration, index) => {
      setSubChunkTime(currentTime);
      if (duration > 0) {
        setKnownDurations(prev => (prev[index] === duration ? prev : { ...prev, [index]: duration }));
      }
    });
    return unsubscribe;
  }, [subscribeToTimeUpdate]);

  const speeds = [0.85, 1.0, 1.25, 1.5];
  const cycleSpeed = () => {
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const getChunkDuration = useCallback(
    (chunk: SpeechChunk, index: number): number => {
      if (knownDurations[index] && knownDurations[index] > 0) {
        return knownDurations[index];
      }
      const words = chunk.wordCount || chunk.text.trim().split(/\s+/).filter(Boolean).length || 10;
      return Math.max(1.5, words / (2.5 * playbackSpeed));
    },
    [knownDurations, playbackSpeed]
  );

  if (!isAudioActive) return null;

  // Cumulative elapsed seconds prior to the currently playing chunk
  const elapsedBeforeCurrent = allChunks.slice(0, currentChunkIndex).reduce((sum, chunk, idx) => {
    return sum + getChunkDuration(chunk, idx);
  }, 0);

  // Total duration across all chunks in the chapter
  const totalSeconds = allChunks.length > 0
    ? allChunks.reduce((sum, chunk, idx) => sum + getChunkDuration(chunk, idx), 0)
    : Math.max(1, totalChunks * 8);

  const currentChunkDur = allChunks[currentChunkIndex]
    ? getChunkDuration(allChunks[currentChunkIndex], currentChunkIndex)
    : 8;

  // Accurate real-time elapsed seconds
  const elapsedSeconds = elapsedBeforeCurrent + Math.min(subChunkTime, currentChunkDur);

  // Smooth progress percentage (0 - 100)
  const progressPercent = totalSeconds > 0
    ? Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100))
    : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeekFromEvent = (clientX: number) => {
    if (!timelineTrackRef.current || allChunks.length === 0 || totalSeconds <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * totalSeconds;

    let accumulated = 0;
    for (let i = 0; i < allChunks.length; i++) {
      const d = getChunkDuration(allChunks[i], i);
      if (targetTime <= accumulated + d || i === allChunks.length - 1) {
        seekToChunk(i);
        break;
      }
      accumulated += d;
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleSeekFromEvent(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeekFromEvent(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="modern-player-dock"
      style={{
        height: '76px',
        background: 'var(--bg-surface-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) minmax(360px, 2fr) minmax(220px, 1fr)',
        alignItems: 'center',
        padding: '0 1.5rem',
        zIndex: 20,
        flexShrink: 0,
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 1. LEFT: Track / Cover Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
        {/* Cover Thumbnail */}
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '6px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {book?.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt="Book Cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <BookMarked size={22} color="var(--accent-cyan)" />
          )}
        </div>

        {/* Title & Author Info */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '0.86rem',
              fontWeight: 600,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={activeChapter?.title}
          >
            {activeChapter?.title || 'Chapter Narration'}
          </span>
          <span
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '1px',
            }}
          >
            {book?.metadata.title || 'Untitled Manuscript'} • {book?.metadata.creator || 'Author'}
          </span>
        </div>

        {/* Favorite / Bookmark Icon */}
        <button
          className="btn-icon btn-sm"
          style={{ color: 'var(--text-muted)', marginLeft: '0.2rem', flexShrink: 0 }}
          title="Save chapter to favorites"
        >
          <Heart size={15} />
        </button>
      </div>

      {/* 2. CENTER: Playback Controls & Timeline Slider */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.45rem',
          maxWidth: '560px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Speed Toggle */}
          <button
            className="btn-icon btn-sm"
            onClick={cycleSpeed}
            title="Narration speed"
            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            {playbackSpeed}x
          </button>

          {/* Previous Sentence */}
          <button
            className="btn-icon btn-sm"
            onClick={skipPrev}
            title="Previous sentence"
            disabled={currentChunkIndex === 0}
            style={{ color: '#ffffff' }}
          >
            <SkipBack size={18} />
          </button>

          {/* Play / Pause Circular Button */}
          {isPlaying && !isPaused ? (
            <button
              onClick={pauseAudio}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#08090d',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(255, 255, 255, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              title="Pause narration"
            >
              <Pause size={17} fill="#08090d" />
            </button>
          ) : (
            <button
              onClick={resumeAudio}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#08090d',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(255, 255, 255, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              title="Resume narration"
            >
              <Play size={17} fill="#08090d" style={{ marginLeft: '2px' }} />
            </button>
          )}

          {/* Next Sentence */}
          <button
            className="btn-icon btn-sm"
            onClick={skipNext}
            title="Next sentence"
            disabled={currentChunkIndex >= totalChunks - 1}
            style={{ color: '#ffffff' }}
          >
            <SkipForward size={18} />
          </button>

          {/* Model & Voice Config */}
          <button
            className="btn-icon btn-sm"
            onClick={openModelModal}
            title="Configure Narration Voice"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Timeline Slider Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%' }}>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              minWidth: '32px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(elapsedSeconds)}
          </span>

          <div
            ref={timelineTrackRef}
            onMouseDown={handleTimelineMouseDown}
            onMouseEnter={() => setIsHoveringTimeline(true)}
            onMouseLeave={() => setIsHoveringTimeline(false)}
            style={{
              flex: 1,
              height: isHoveringTimeline ? '6px' : '4px',
              background: 'rgba(255, 255, 255, 0.14)',
              borderRadius: '3px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'height 0.15s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Click or drag to seek in chapter"
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: isHoveringTimeline ? 'var(--accent-cyan, #38bdf8)' : '#ffffff',
                borderRadius: '3px',
                position: 'relative',
                transition: 'width 0.08s linear, background-color 0.15s ease',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: '-5px',
                  top: isHoveringTimeline ? '-3px' : '-4px',
                  width: isHoveringTimeline ? '12px' : '10px',
                  height: isHoveringTimeline ? '12px' : '10px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.9)',
                  transition: 'width 0.15s ease, height 0.15s ease, top 0.15s ease',
                }}
              />
            </div>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              minWidth: '32px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(totalSeconds)}
          </span>
        </div>
      </div>

      {/* 3. RIGHT: Model Pill & Volume */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
        {/* Model Chip */}
        <div
          onClick={openModelModal}
          style={{
            cursor: 'pointer',
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
          title="Narration Voice Settings"
        >
          <Headphones size={12} color="var(--accent-cyan)" />
          <span>
            {isNeuralModelLoaded ? 'Kokoro' : 'Natural'} •{' '}
            {activeVoiceData?.name || 'Heart'}
          </span>
        </div>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.2rem' }}>
          <button
            className="btn-icon btn-sm"
            onClick={toggleMute}
            style={{ color: 'var(--text-secondary)' }}
            title={volume === 0 ? 'Unmute narration' : 'Mute narration'}
          >
            {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            title={`Volume: ${Math.round(volume * 100)}%`}
            style={{
              width: '70px',
              height: '4px',
              accentColor: '#ffffff',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Divider */}
        <div className="header-divider" style={{ height: '18px', margin: '0 0.15rem' }} />

        {/* Close Button */}
        <button
          className="btn-icon btn-sm"
          onClick={stopAudio}
          title="Close listening controls"
          style={{
            color: 'var(--text-muted)',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
