import React, { useState } from 'react';
import { useTts } from '../../context/TtsContext';
import {
  QWEN_MODELS,
  QWEN_VOICES,
  synthesizeSpeechChunk,
} from '../../services/tts/qwenTtsEngine';
import {
  X,
  Cpu,
  Download,
  Check,
  Headphones,
  Volume2,
  Zap,
  Mic,
  Sliders,
  Play,
  Square,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export const TTSModelModal: React.FC = () => {
  const {
    isModelModalOpen,
    closeModelModal,
    selectedModel,
    downloadedModels,
    downloadProgress,
    downloadModel,
    selectedVoice,
    selectVoice,
    playbackSpeed,
    setPlaybackSpeed,
    isNeuralModelLoaded,
    availableSystemVoices,
    selectedSystemVoiceName,
    selectSystemVoiceName,
    volume,
  } = useTts();

  useEscapeKey(closeModelModal, isModelModalOpen);

  const [activeTab, setActiveTab] = useState<'voices' | 'models'>('voices');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewCancel, setPreviewCancel] = useState<(() => void) | null>(null);

  if (!isModelModalOpen) return null;

  const handlePlaySample = (voice: typeof QWEN_VOICES[0]) => {
    if (previewCancel) {
      previewCancel();
      setPreviewCancel(null);
    }

    if (previewingVoiceId === voice.id) {
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    const controller = synthesizeSpeechChunk(
      voice.sampleText,
      voice,
      playbackSpeed,
      volume,
      selectedSystemVoiceName,
      undefined,
      () => {
        setPreviewingVoiceId(null);
        setPreviewCancel(null);
      },
      () => {
        setPreviewingVoiceId(null);
        setPreviewCancel(null);
      }
    );

    setPreviewCancel(() => controller.cancel);
  };

  const handleClose = () => {
    if (previewCancel) {
      previewCancel();
      setPreviewCancel(null);
    }
    setPreviewingVoiceId(null);
    closeModelModal();
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 220 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '680px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Headphones size={20} color="var(--accent-primary)" />
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
                In-Browser Audio Narrator
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Neural text-to-speech running 100% inside your web browser
              </p>
            </div>
          </div>
          <button className="btn-icon btn-sm" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{ padding: '0.75rem 1.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="view-tabs" style={{ background: 'var(--bg-app)' }}>
            <button
              className={`view-tab-btn ${activeTab === 'voices' ? 'active' : ''}`}
              onClick={() => setActiveTab('voices')}
            >
              <Mic size={14} />
              <span>Voice Personas</span>
            </button>
            <button
              className={`view-tab-btn ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              <Cpu size={14} />
              <span>In-Browser Model</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
          {/* TAB 1: VOICES */}
          {activeTab === 'voices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Active Engine Badge */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isNeuralModelLoaded ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                  border: isNeuralModelLoaded ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {isNeuralModelLoaded ? (
                    <CheckCircle2 size={18} color="#34d399" />
                  ) : (
                    <Zap size={18} color="var(--accent-primary)" />
                  )}
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isNeuralModelLoaded ? 'In-Browser Neural Engine Active' : 'Browser High-Quality Natural Voice Active'}
                    </h5>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {isNeuralModelLoaded
                        ? 'Running Kokoro-82M ONNX directly in client memory via WebGPU/WASM'
                        : 'Using browser studio natural voices. You can download the in-browser model for offline studio audio.'}
                    </p>
                  </div>
                </div>

                {!isNeuralModelLoaded && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('models')}
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Load Neural Model
                  </button>
                )}
              </div>

              {/* Voice Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {QWEN_VOICES.map(voice => {
                  const isSelected = selectedVoice === voice.id;
                  const isPreviewing = previewingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => selectVoice(voice.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.9rem 1.1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.1)'
                          : 'var(--bg-surface-elevated)',
                        border: isSelected
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#ffffff' : 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          <Volume2 size={17} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {voice.name}
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ({voice.style})
                            </span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {voice.description}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          className={`btn btn-sm ${isPreviewing ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handlePlaySample(voice)}
                          title="Preview voice sample"
                        >
                          {isPreviewing ? <Square size={12} /> : <Play size={12} />}
                          <span>{isPreviewing ? 'Stop' : 'Sample'}</span>
                        </button>
                        {isSelected && (
                          <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>
                            <Check size={18} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Direct System Voice Override */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Volume2 size={16} color="var(--accent-primary)" />
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Direct Browser / System Voice
                    </h4>
                  </div>
                  {selectedSystemVoiceName && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
                      onClick={() => selectSystemVoiceName(null)}
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  By default, Chronicle automatically selects the highest-quality <strong>Natural / Neural</strong> voice on your computer. You can override it with any installed voice:
                </p>

                <select
                  className="form-input"
                  value={selectedSystemVoiceName || ''}
                  onChange={e => selectSystemVoiceName(e.target.value || null)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem' }}
                >
                  <option value="">✨ Auto (Prioritize High-Fidelity Natural Neural Voice)</option>
                  {availableSystemVoices.map(v => (
                    <option key={v.id} value={v.name}>
                      {v.isNeural ? '⚡ [Neural Studio] ' : '• '}{v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Controls */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={16} color="var(--accent-primary)" />
                  <div>
                    <h5 style={{ fontSize: '0.84rem', fontWeight: 600 }}>Default Narration Speed</h5>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pacing multiplier for audio playback</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[0.85, 1.0, 1.2, 1.35].map(speed => (
                    <button
                      key={speed}
                      className={`btn btn-sm ${playbackSpeed === speed ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPlaybackSpeed(speed)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IN-BROWSER MODEL */}
          {activeTab === 'models' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Load the neural model directly inside your web browser. Weights are cached in your browser's local Cache Storage so they only need to be downloaded once, then run 100% offline.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {QWEN_MODELS.map(model => {
                  const isSelected = selectedModel === model.id;
                  const isDownloaded = Boolean(downloadedModels[model.id]) || isNeuralModelLoaded;
                  const progressData = downloadProgress[model.id];
                  const isDownloading = progressData?.isDownloading;

                  return (
                    <div
                      key={model.id}
                      style={{
                        padding: '1.2rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'var(--bg-surface-elevated)',
                        border: isSelected
                          ? '1.5px solid var(--accent-primary)'
                          : '1px solid var(--border-subtle)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {model.displayName}
                            </h4>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Zap size={10} />
                              100% In-Browser (No Server Needed)
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {model.parameters} • {model.sizeFormatted} • {model.vramRequirement}
                          </p>
                        </div>

                        {/* Action: Select / Download */}
                        <div style={{ flexShrink: 0 }}>
                          {isDownloading ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              Downloading ({progressData.progress}%)...
                            </span>
                          ) : isDownloaded ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.78rem',
                                color: '#34d399',
                                fontWeight: 600,
                                padding: '0.3rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(16, 185, 129, 0.1)',
                              }}
                            >
                              <Check size={14} />
                              <span>Loaded in Browser</span>
                            </span>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => downloadModel(model.id)}
                            >
                              <Download size={13} />
                              <span>Load Model ({model.sizeFormatted})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {model.description}
                      </p>

                      {/* Download Progress Bar */}
                      {isDownloading && (
                        <div style={{ marginTop: '0.9rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                            <span>Downloading weights into browser Cache Storage...</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{progressData.progress}%</strong>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${progressData.progress}%`,
                                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                borderRadius: '3px',
                                transition: 'width 0.15s ease',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', gap: '0.65rem' }}>
                <Info size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This neural model executes locally using ONNX Runtime Web. It runs completely inside your browser tab without transmitting your book text to any server or third party.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {isNeuralModelLoaded ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
                <CheckCircle2 size={14} />
                <span>Kokoro Neural Engine (Direct In-Browser)</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#818cf8' }}>
                <Zap size={14} />
                <span>
                  {selectedSystemVoiceName
                    ? `Voice: ${selectedSystemVoiceName}`
                    : 'Browser High-Quality Natural Voice'}
                </span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
