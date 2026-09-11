import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
  QwenTtsModel,
  QwenTtsVoice,
  QWEN_MODELS,
  QWEN_VOICES,
  getDownloadedModels,
  getStoredModel,
  setStoredModel,
  getStoredVoice,
  setStoredVoice,
  startModelDownload,
  loadInBrowserNeuralModel,
  isInBrowserNeuralModelLoaded,
  SystemVoiceInfo,
  getStoredSystemVoiceName,
  setStoredSystemVoiceName,
  getAvailableSystemVoices,
} from '../services/tts/qwenTtsEngine';
import { chunkTextForSpeech, SpeechChunk } from '../services/tts/textChunker';
import { AudioQueuePlayer } from '../services/tts/audioQueuePlayer';
import { useEpub } from './EpubContext';

export interface ModelDownloadStatus {
  isDownloading: boolean;
  progress: number;
  transferredBytes: number;
  totalBytes: number;
}

interface TtsContextType {
  selectedModel: string | null;
  selectedVoice: string;
  downloadedModels: Record<string, boolean>;
  downloadProgress: Record<string, ModelDownloadStatus>;
  isModelModalOpen: boolean;
  isNeuralModelLoaded: boolean;

  // Audio Playback State
  isAudioActive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  currentChunk: SpeechChunk | null;
  allChunks: SpeechChunk[];
  playbackSpeed: number;
  customVoicePrompt: string;
  isReadAlongOpen: boolean;
  volume: number;
  chunkCurrentTime: number;
  chunkDuration: number;
  subscribeToTimeUpdate: (cb: (currentTime: number, duration: number, index: number) => void) => () => void;

  // Model & Voice Controls
  openModelModal: () => void;
  closeModelModal: () => void;
  downloadModel: (modelId: string) => void;
  selectModel: (modelId: string) => void;
  selectVoice: (voiceId: string) => void;
  setCustomVoicePrompt: (prompt: string) => void;

  // Voice Selection
  availableSystemVoices: SystemVoiceInfo[];
  selectedSystemVoiceName: string | null;
  selectSystemVoiceName: (voiceName: string | null) => void;

  // Playback Controls
  startListening: (contentHtmlOrText: string, startIndex?: number) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  skipNext: () => void;
  skipPrev: () => void;
  seekToChunk: (index: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleReadAlong: () => void;
  setVolume: (vol: number) => void;

  // Helpers
  activeModelData: QwenTtsModel | undefined;
  activeVoiceData: QwenTtsVoice | undefined;
}

const LOCAL_STORAGE_KEY_VOLUME = 'epub_tts_volume';

function getStoredVolume(): number {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_VOLUME);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
  } catch {
    /* Ignore localStorage access errors */
  }
  return 1.0;
}

const TtsContext = createContext<TtsContextType | undefined>(undefined);

export const TtsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedModel, setSelectedModelState] = useState<string | null>(getStoredModel());
  const [selectedVoice, setSelectedVoiceState] = useState<string>(getStoredVoice());
  const [downloadedModels, setDownloadedModels] = useState<Record<string, boolean>>(getDownloadedModels());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, ModelDownloadStatus>>({});
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [customVoicePrompt, setCustomVoicePrompt] = useState<string>('A wise, calm storyteller with a gentle tone');

  // In-Browser Model state
  const [isNeuralModelLoaded, setIsNeuralModelLoaded] = useState<boolean>(isInBrowserNeuralModelLoaded());
  const [selectedSystemVoiceName, setSelectedSystemVoiceNameState] = useState<string | null>(getStoredSystemVoiceName());
  const [availableSystemVoices, setAvailableSystemVoices] = useState<SystemVoiceInfo[]>([]);

  // If in-browser model was previously downloaded, load it into memory
  useEffect(() => {
    if (downloadedModels['kokoro-82m-v1.0-onnx'] && !isInBrowserNeuralModelLoaded()) {
      loadInBrowserNeuralModel()
        .then(() => setIsNeuralModelLoaded(true))
        .catch(err => console.warn('Background model load error:', err));
    }
  }, [downloadedModels]);

  // Discover real browser system voices
  useEffect(() => {
    const updateVoices = () => {
      const v = getAvailableSystemVoices();
      setAvailableSystemVoices(v);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Playback state
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState<SpeechChunk | null>(null);
  const [allChunks, setAllChunks] = useState<SpeechChunk[]>([]);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [isReadAlongOpen, setIsReadAlongOpen] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(getStoredVolume);
  const [chunkCurrentTime, setChunkCurrentTime] = useState<number>(0);
  const [chunkDuration, setChunkDuration] = useState<number>(0);

  const playerRef = useRef<AudioQueuePlayer | null>(null);
  const cancelDownloadRef = useRef<Record<string, () => void>>({});
  const timeListenersRef = useRef<Set<(currentTime: number, duration: number, index: number) => void>>(new Set());

  const activeModelData = QWEN_MODELS.find(m => m.id === selectedModel);
  const activeVoiceData = QWEN_VOICES.find(v => v.id === selectedVoice) || QWEN_VOICES[0];

  // Ensure player instance is initialized
  if (!playerRef.current) {
    playerRef.current = new AudioQueuePlayer(activeVoiceData, playbackSpeed, volume);
    playerRef.current.setPreferredVoiceName(selectedSystemVoiceName);
  }

  // Update voice independently
  useEffect(() => {
    playerRef.current?.setVoice(activeVoiceData);
  }, [activeVoiceData]);

  // Update playback speed independently
  useEffect(() => {
    playerRef.current?.setSpeed(playbackSpeed);
  }, [playbackSpeed]);

  // Update preferred system voice independently
  useEffect(() => {
    playerRef.current?.setPreferredVoiceName(selectedSystemVoiceName);
  }, [selectedSystemVoiceName]);

  // Adjust volume directly on the playing audio element without re-generating audio
  useEffect(() => {
    playerRef.current?.setVolume(volume);
  }, [volume]);

  // Attach listener to player
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setListeners({
        onChunkStart: (chunk, index, total) => {
          setCurrentChunk(chunk);
          setCurrentChunkIndex(index);
          setTotalChunks(total);
          setChunkCurrentTime(0);
        },
        onTimeUpdate: (currentTime, duration, index) => {
          setChunkCurrentTime(currentTime);
          setChunkDuration(duration);
          timeListenersRef.current.forEach(cb => {
            try {
              cb(currentTime, duration, index);
            } catch (err) {
              console.error('Time update listener error:', err);
            }
          });
        },
        onStateChange: (playing, paused) => {
          setIsPlaying(playing);
          setIsPaused(paused);
        },
        onComplete: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentChunk(null);
          setChunkCurrentTime(0);
        },
        onError: (err) => {
          console.error('Audio Player error:', err);
        },
      });
    }
  }, []);

  const openModelModal = useCallback(() => {
    setIsModelModalOpen(true);
  }, []);

  const closeModelModal = useCallback(() => {
    setIsModelModalOpen(false);
  }, []);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
    setStoredModel(modelId);
  }, []);

  const selectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceState(voiceId);
    setStoredVoice(voiceId);
  }, []);

  const downloadModel = useCallback((modelId: string) => {
    setDownloadProgress(prev => ({
      ...prev,
      [modelId]: { isDownloading: true, progress: 0, transferredBytes: 0, totalBytes: 0 },
    }));

    const cancel = startModelDownload(
      modelId,
      (progress, transferred, total) => {
        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: {
            isDownloading: true,
            progress,
            transferredBytes: transferred,
            totalBytes: total,
          },
        }));
      },
      () => {
        setDownloadedModels(getDownloadedModels());
        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: { isDownloading: false, progress: 100, transferredBytes: 0, totalBytes: 0 },
        }));
        // If no model selected yet, auto-select this downloaded one
        setSelectedModelState(curr => curr || modelId);
        setStoredModel(modelId);
      },
      (err) => {
        console.error('Download error:', err);
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });
      }
    );

    cancelDownloadRef.current[modelId] = cancel;
  }, []);

  const startListening = useCallback(
    (contentHtmlOrText: string, startIndex = 0) => {
      // If no model has been selected, open the modal to prompt the user
      if (!selectedModel) {
        setIsModelModalOpen(true);
        return;
      }

      // 1. Chunk the text
      const result = chunkTextForSpeech(contentHtmlOrText);
      if (result.chunks.length === 0) {
        return;
      }

      setIsAudioActive(true);
      setAllChunks(result.chunks);
      setTotalChunks(result.chunks.length);
      setCurrentChunkIndex(startIndex);
      setChunkCurrentTime(0);
      setChunkDuration(0);

      if (playerRef.current) {
        playerRef.current.startQueue(result.chunks, startIndex);
      }
    },
    [selectedModel]
  );

  const pauseAudio = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const resumeAudio = useCallback(() => {
    playerRef.current?.resume();
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const stopAudio = useCallback(() => {
    playerRef.current?.stop();
    setIsAudioActive(false);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunk(null);
    setAllChunks([]);
    setTotalChunks(0);
    setCurrentChunkIndex(0);
    setChunkCurrentTime(0);
  }, []);

  const { book } = useEpub();
  const prevBookRef = useRef(book);

  // When opening a new manuscript/document, stop audio playback and close the audio player
  useEffect(() => {
    if (prevBookRef.current && prevBookRef.current !== book) {
      stopAudio();
    }
    prevBookRef.current = book;
  }, [book, stopAudio]);

  // Listen for the global file-opening event so audio stops the instant file reading begins
  useEffect(() => {
    const handleFileOpening = () => {
      stopAudio();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('epub-file-opening', handleFileOpening);
      return () => {
        window.removeEventListener('epub-file-opening', handleFileOpening);
      };
    }
  }, [stopAudio]);

  const skipNext = useCallback(() => {
    playerRef.current?.skipNext();
  }, []);

  const skipPrev = useCallback(() => {
    playerRef.current?.skipPrev();
  }, []);

  const seekToChunk = useCallback((index: number) => {
    setChunkCurrentTime(0);
    playerRef.current?.seekToChunk(index);
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    playerRef.current?.setSpeed(speed);
  }, []);

  const toggleReadAlong = useCallback(() => {
    setIsReadAlongOpen(prev => !prev);
  }, []);

  const selectSystemVoiceName = useCallback((voiceName: string | null) => {
    setSelectedSystemVoiceNameState(voiceName);
    setStoredSystemVoiceName(voiceName);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_VOLUME, String(clamped));
    } catch {
      /* Ignore localStorage access errors */
    }
    playerRef.current?.setVolume(clamped);
  }, []);

  const subscribeToTimeUpdate = useCallback(
    (cb: (currentTime: number, duration: number, index: number) => void) => {
      timeListenersRef.current.add(cb);
      return () => {
        timeListenersRef.current.delete(cb);
      };
    },
    []
  );

  return (
    <TtsContext.Provider
      value={{
        selectedModel,
        selectedVoice,
        downloadedModels,
        downloadProgress,
        isModelModalOpen,
        isNeuralModelLoaded,
        isAudioActive,
        isPlaying,
        isPaused,
        currentChunkIndex,
        totalChunks,
        currentChunk,
        allChunks,
        playbackSpeed,
        customVoicePrompt,
        isReadAlongOpen,
        volume,
        chunkCurrentTime,
        chunkDuration,
        subscribeToTimeUpdate,
        openModelModal,
        closeModelModal,
        downloadModel,
        selectModel,
        selectVoice,
        setCustomVoicePrompt,
        startListening,
        pauseAudio,
        resumeAudio,
        stopAudio,
        skipNext,
        skipPrev,
        seekToChunk,
        setPlaybackSpeed,
        toggleReadAlong,
        setVolume,
        activeModelData,
        activeVoiceData,
        availableSystemVoices,
        selectedSystemVoiceName,
        selectSystemVoiceName,
      }}
    >
      {children}
    </TtsContext.Provider>
  );
};

export function useTts(): TtsContextType {
  const context = useContext(TtsContext);
  if (!context) {
    throw new Error('useTts must be used within a TtsProvider');
  }
  return context;
}
