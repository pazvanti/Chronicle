export interface QwenTtsModel {
  id: string;
  fullName: string;
  displayName: string;
  parameters: string;
  sizeBytes: number;
  sizeFormatted: string;
  vramRequirement: string;
  description: string;
  isRecommended?: boolean;
  supportsVoiceDesign?: boolean;
}

export interface QwenTtsVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  description: string;
  pitch: number;
  rate: number;
  sampleText: string;
}

export const QWEN_MODELS: QwenTtsModel[] = [
  {
    id: 'kokoro-82m-v1.0-onnx',
    fullName: 'Kokoro-82M Model (8-Bit Quantized ONNX)',
    displayName: 'In-Browser Model (Kokoro-82M)',
    parameters: '82 Million',
    sizeBytes: 86 * 1024 * 1024,
    sizeFormatted: '86 MB',
    vramRequirement: 'Runs 100% client-side via WebGPU / WebAssembly',
    description: 'Studio-grade text-to-speech model running directly inside your browser. Once downloaded, it caches locally and runs completely offline with zero external servers or configuration needed.',
    isRecommended: true,
    supportsVoiceDesign: true,
  },
];

export const QWEN_VOICES: QwenTtsVoice[] = [
  {
    id: 'af_heart',
    name: 'Heart',
    gender: 'female',
    style: 'Warm Literary & Expressive',
    description: 'Rich, natural, and eloquent human narration. Exceptional for literary fiction, memoirs, and character-driven stories.',
    pitch: 1.0,
    rate: 1.0,
    sampleText: 'In the quiet hours before dawn, the library felt like a sanctuary of sleeping voices, waiting to be read.',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    gender: 'male',
    style: 'Deep Baritone Narrator',
    description: 'Measured, rich, and authoritative. Perfect for fantasy, historical epics, thrillers, and non-fiction.',
    pitch: 1.0,
    rate: 0.98,
    sampleText: 'The ancient stone towers loomed through the mountain fog, silent witnesses to centuries of forgotten history.',
  },
  {
    id: 'af_bella',
    name: 'Bella',
    gender: 'female',
    style: 'Dynamic Storyteller',
    description: 'Engaging, animated, and dramatic with heightened emotional inflection across dialogue and suspense.',
    pitch: 1.0,
    rate: 1.02,
    sampleText: '"Stop right there!" whispered the shadowy figure from behind the heavy velvet curtain.',
  },
  {
    id: 'am_adam',
    name: 'Adam',
    gender: 'male',
    style: 'Crisp & Articulate',
    description: 'Warm, clear, and engaging modern pacing. Great for contemporary fiction, sci-fi, and essays.',
    pitch: 1.0,
    rate: 1.0,
    sampleText: 'We now bring you the next thrilling chapter of our chronicle, recorded live from the observatory.',
  },
  {
    id: 'bf_emma',
    name: 'Emma',
    gender: 'female',
    style: 'British Eloquent',
    description: 'Refined, cultured, and elegant British English accent. Ideal for period drama, poetry, and classics.',
    pitch: 1.0,
    rate: 0.98,
    sampleText: 'The stars reflected on the obsidian lake like embers cast across liquid glass, unmoving in the midnight chill.',
  },
  {
    id: 'bm_george',
    name: 'George',
    gender: 'male',
    style: 'British Classic Broadcast',
    description: 'Distinguished mid-century British cadence reminiscent of BBC broadcast serials and classic audiobooks.',
    pitch: 1.0,
    rate: 0.98,
    sampleText: 'It was a bright cold day in April, and the clocks were striking thirteen as the traveler arrived.',
  },
];

const LOCAL_STORAGE_KEY_DOWNLOADED_MODELS = 'chronicle_downloaded_tts_models';
const LOCAL_STORAGE_KEY_SELECTED_MODEL = 'chronicle_selected_tts_model';
const LOCAL_STORAGE_KEY_SELECTED_VOICE = 'chronicle_selected_tts_voice';
const LOCAL_STORAGE_KEY_SELECTED_SYSTEM_VOICE = 'chronicle_tts_selected_system_voice';

// In-Memory Kokoro Instance
let kokoroInstance: any = null;
let isLoadingKokoro = false;

export function isInBrowserNeuralModelLoaded(): boolean {
  return kokoroInstance !== null;
}

/**
 * Loads the Kokoro TTS model directly into browser memory/Cache Storage.
 * Uses Transformers.js with WebGPU GPU shaders if available, with multi-threaded WASM SIMD fallback.
 */
export async function loadInBrowserNeuralModel(
  onProgress?: (progress: number, transferredBytes: number, totalBytes: number) => void
): Promise<any> {
  if (kokoroInstance) return kokoroInstance;
  if (isLoadingKokoro) {
    while (isLoadingKokoro) {
      await new Promise(r => setTimeout(r, 100));
    }
    return kokoroInstance;
  }

  isLoadingKokoro = true;
  try {
    const { KokoroTTS } = await import('kokoro-js');
    const { env } = await import('@huggingface/transformers');

    // Configure Transformers.js WebAssembly multi-threading & SIMD acceleration
    if (env?.backends?.onnx?.wasm) {
      const concurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      env.backends.onnx.wasm.numThreads = Math.min(4, concurrency);
      env.backends.onnx.wasm.simd = true;
    }

    const totalBytes = 86 * 1024 * 1024;
    const progressCallback = (p: any) => {
      if (p && typeof p.progress === 'number') {
        const progress = Math.min(100, Math.max(0, Math.round(p.progress)));
        const transferred = Math.round((progress / 100) * totalBytes);
        onProgress?.(progress, transferred, totalBytes);
      }
    };

    // Check for WebGPU hardware acceleration
    let hasWebGPU = false;
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          hasWebGPU = true;
        }
      } catch (e) {
        console.warn('WebGPU check failed:', e);
      }
    }

    // Try WebGPU first for 10x-20x GPU shader speedup
    if (hasWebGPU) {
      try {
        console.log('⚡ Initializing Kokoro TTS with WebGPU acceleration...');
        kokoroInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback: progressCallback,
        });
      } catch (gpuErr) {
        console.warn('WebGPU compilation error, falling back to multi-threaded WASM:', gpuErr);
        kokoroInstance = null;
      }
    }

    // Fallback to quantized WASM SIMD (CPU multi-core)
    if (!kokoroInstance) {
      console.log('🚀 Initializing Kokoro TTS with multi-threaded WASM SIMD...');
      kokoroInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progressCallback,
      });
    }

    setModelDownloaded('kokoro-82m-v1.0-onnx', true);
    setStoredModel('kokoro-82m-v1.0-onnx');
    isLoadingKokoro = false;
    return kokoroInstance;
  } catch (err) {
    isLoadingKokoro = false;
    console.error('Failed to load in-browser model:', err);
    throw err;
  }
}

/**
 * Downloads the in-browser model with progress updates.
 */
export function startModelDownload(
  _modelId: string,
  onProgress: (progress: number, transferredBytes: number, totalBytes: number) => void,
  onComplete: () => void,
  onError: (err: Error) => void
): () => void {
  let isCancelled = false;

  loadInBrowserNeuralModel((progress, transferred, total) => {
    if (!isCancelled) {
      onProgress(progress, transferred, total);
    }
  })
    .then(() => {
      if (!isCancelled) {
        onProgress(100, 86 * 1024 * 1024, 86 * 1024 * 1024);
        onComplete();
      }
    })
    .catch((err) => {
      if (!isCancelled) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return () => {
    isCancelled = true;
  };
}

export function getDownloadedModels(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DOWNLOADED_MODELS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setModelDownloaded(modelId: string, isDownloaded = true): void {
  try {
    const current = getDownloadedModels();
    if (isDownloaded) {
      current[modelId] = true;
    } else {
      delete current[modelId];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_DOWNLOADED_MODELS, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save downloaded model state:', err);
  }
}

export function getStoredModel(): string {
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_KEY_SELECTED_MODEL);
    // Automatically migrate legacy Qwen keys to Kokoro in-browser model
    if (!val || val.includes('Qwen') || val.includes('qwen')) {
      localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_MODEL, 'kokoro-82m-v1.0-onnx');
      return 'kokoro-82m-v1.0-onnx';
    }
    return val;
  } catch {
    return 'kokoro-82m-v1.0-onnx';
  }
}

export function setStoredModel(modelId: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_MODEL, modelId);
  } catch (err) {
    console.warn('Failed to save selected model:', err);
  }
}

export function getStoredVoice(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_SELECTED_VOICE) || 'af_heart';
  } catch {
    return 'af_heart';
  }
}

export function setStoredVoice(voiceId: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_VOICE, voiceId);
  } catch (err) {
    console.warn('Failed to save selected voice:', err);
  }
}

export function getStoredSystemVoiceName(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_SELECTED_SYSTEM_VOICE);
  } catch {
    return null;
  }
}

export function setStoredSystemVoiceName(voiceName: string | null): void {
  try {
    if (voiceName) {
      localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_SYSTEM_VOICE, voiceName);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_SELECTED_SYSTEM_VOICE);
    }
  } catch {
    /* Ignore localStorage access errors */
  }
}

export interface SystemVoiceInfo {
  id: string;
  name: string;
  lang: string;
  isNeural: boolean;
  gender: 'male' | 'female' | 'neutral';
}

/**
 * Enumerates all browser/system TTS voices and detects neural/natural deep-learning voices.
 */
export function getAvailableSystemVoices(): SystemVoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();

  return voices
    .map(v => {
      const nameLower = v.name.toLowerCase();
      const is =
        nameLower.includes('natural') ||
        nameLower.includes('neural') ||
        nameLower.includes('online') ||
        nameLower.includes('google');

      const isFemale =
        nameLower.includes('female') ||
        nameLower.includes('jenny') ||
        nameLower.includes('aria') ||
        nameLower.includes('sonia') ||
        nameLower.includes('michelle') ||
        nameLower.includes('zira') ||
        nameLower.includes('samantha') ||
        nameLower.includes('victoria');

      const isMale =
        nameLower.includes('male') ||
        nameLower.includes('christopher') ||
        nameLower.includes('guy') ||
        nameLower.includes('ryan') ||
        nameLower.includes('eric') ||
        nameLower.includes('david') ||
        nameLower.includes('george') ||
        nameLower.includes('daniel');

      return {
        id: v.name,
        name: v.name,
        lang: v.lang,
        isNeural,
        gender: (isFemale ? 'female' : isMale ? 'male' : 'neutral') as 'male' | 'female' | 'neutral',
      };
    })
    .sort((a, b) => {
      if (a.is && !b.isNeural) return -1;
      if (!a.is && b.isNeural) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Finds the highest-fidelity natural voice matching the requested gender,
 * strictly filtering out legacy robotic desktop voices (e.g. Microsoft David / Zira).
 */
export function findBestVoice(gender: 'male' | 'female', preferredVoiceName?: string | null): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (preferredVoiceName) {
    const matched = voices.find(v => v.name === preferredVoiceName);
    if (matched) return matched;
  }

  // High-priority / Natural voices (Edge Natural / Google Deep Learning)
  const neuralVoices = voices.filter(v => {
    const n = v.name.toLowerCase();
    return (
      (n.includes('natural') || n.includes('neural') || n.includes('online') || n.includes('google')) &&
      v.lang.startsWith('en')
    );
  });

  if (neuralVoices.length > 0) {
    if (gender === 'female') {
      const match = neuralVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('female') || n.includes('jenny') || n.includes('aria') || n.includes('sonia') || n.includes('michelle');
      });
      if (match) return match;
    } else {
      const match = neuralVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('male') || n.includes('christopher') || n.includes('guy') || n.includes('ryan') || n.includes('eric');
      });
      if (match) return match;
    }
    return neuralVoices[0];
  }

  // Filter OUT legacy robotic desktop SAPI5 voices
  const nonRobotic = voices.filter(v => {
    const n = v.name.toLowerCase();
    return !n.includes('desktop') && !n.includes('espeak') && v.lang.startsWith('en');
  });

  if (nonRobotic.length > 0) {
    return nonRobotic[0];
  }

  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

export interface SpeechSynthesisController {
  cancel: () => void;
  setVolume?: (volume: number) => void;
  pause?: () => void;
  resume?: () => void;
}

function fallbackToBrowserSpeech(
  text: string,
  voice: QwenTtsVoice,
  speedMultiplier = 1.0,
  volume = 1.0,
  preferredVoiceName?: string | null,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void,
  onTimeUpdate?: (currentTime: number, duration: number) => void
): SpeechSynthesisController {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('Speech Synthesis not supported in this environment'));
    return { cancel: () => { } };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = voice.pitch;
  utterance.rate = voice.rate * speedMultiplier;
  utterance.volume = Math.max(0, Math.min(1, volume));

  const matchedVoice = findBestVoice(voice.gender, preferredVoiceName);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.max(1.5, wordCount / (2.5 * speedMultiplier));
  let startTime = 0;
  let animId: number | null = null;
  let isPaused = false;
  let pausedElapsed = 0;

  const tick = () => {
    if (!isPaused && startTime > 0) {
      const elapsed = pausedElapsed + (performance.now() - startTime) / 1000;
      onTimeUpdate?.(Math.min(elapsed, estimatedDuration), estimatedDuration);
      if (elapsed < estimatedDuration) {
        animId = requestAnimationFrame(tick);
      }
    }
  };

  utterance.onstart = () => {
    startTime = performance.now();
    onStart?.();
    animId = requestAnimationFrame(tick);
  };

  utterance.onend = () => {
    if (animId) cancelAnimationFrame(animId);
    onTimeUpdate?.(estimatedDuration, estimatedDuration);
    onEnd?.();
  };

  utterance.onerror = (e) => {
    if (animId) cancelAnimationFrame(animId);
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      onError?.(e);
    }
  };

  window.speechSynthesis.speak(utterance);

  return {
    cancel: () => {
      if (animId) cancelAnimationFrame(animId);
      window.speechSynthesis.cancel();
    },
    setVolume: (vol: number) => {
      utterance.volume = Math.max(0, Math.min(1, vol));
    },
    pause: () => {
      isPaused = true;
      if (animId) cancelAnimationFrame(animId);
      if (startTime > 0) {
        pausedElapsed += (performance.now() - startTime) / 1000;
      }
      window.speechSynthesis.pause();
    },
    resume: () => {
      isPaused = false;
      startTime = performance.now();
      animId = requestAnimationFrame(tick);
      window.speechSynthesis.resume();
    },
  };
}

/**
 * Asynchronously generates an audio Blob for a text chunk using the in-browser Kokoro model.
 * Used for background pre-buffering while previous chunks are playing.
 */
export async function generateNeuralAudioBlob(
  text: string,
  voice: QwenTtsVoice,
  speedMultiplier = 1.0
): Promise<Blob | null> {
  if (!kokoroInstance) return null;

  try {
    const voiceId = voice.id.startsWith('af_') || voice.id.startsWith('am_') || voice.id.startsWith('bf_') || voice.id.startsWith('bm_')
      ? voice.id
      : voice.gender === 'female' ? 'af_heart' : 'am_michael';

    const rawAudio = await kokoroInstance.generate(text, {
      voice: voiceId,
      speed: speedMultiplier,
    });

    return rawAudio.toBlob();
  } catch (err) {
    console.warn('Background pre-synthesis error:', err);
    return null;
  }
}

/**
 * Synthesizes speech:
 * 1. If prefetchedBlob is provided, starts playing IMMEDIATELY with 0ms latency!
 * 2. If In-Browser Model is loaded, executes 100% in-browser via WebGPU/WASM.
 * 3. If not yet loaded, falls back to High-Quality Browser Natural Voice with anti-robotic filter.
 */
export function synthesizeSpeechChunk(
  text: string,
  voice: QwenTtsVoice,
  speedMultiplier = 1.0,
  volume = 1.0,
  preferredVoiceName?: string | null,
  prefetchedBlob?: Blob | null,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void,
  onTimeUpdate?: (currentTime: number, duration: number) => void
): SpeechSynthesisController {
  let isCancelled = false;
  let activeAudio: HTMLAudioElement | null = null;
  let animId: number | null = null;
  let currentVolume = volume;

  const tick = () => {
    if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
      onTimeUpdate?.(activeAudio.currentTime, activeAudio.duration || 0);
      animId = requestAnimationFrame(tick);
    }
  };

  // Case A: Prefetched audio buffer already generated in background -> INSTANT PLAYBACK!
  if (prefetchedBlob) {
    const url = URL.createObjectURL(prefetchedBlob);
    activeAudio = new Audio(url);
    activeAudio.volume = Math.max(0, Math.min(1, currentVolume));

    activeAudio.onplay = () => {
      onStart?.();
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(tick);
    };

    activeAudio.onpause = () => {
      if (animId) cancelAnimationFrame(animId);
    };

    activeAudio.ontimeupdate = () => {
      if (activeAudio) {
        onTimeUpdate?.(activeAudio.currentTime, activeAudio.duration || 0);
      }
    };

    activeAudio.onended = () => {
      if (animId) cancelAnimationFrame(animId);
      URL.revokeObjectURL(url);
      onEnd?.();
    };

    activeAudio.onerror = (e) => {
      if (animId) cancelAnimationFrame(animId);
      URL.revokeObjectURL(url);
      onError?.(e);
    };

    activeAudio.play().catch(err => {
      if (!isCancelled) onError?.(err);
    });

    return {
      cancel: () => {
        isCancelled = true;
        if (animId) cancelAnimationFrame(animId);
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.src = '';
        }
        URL.revokeObjectURL(url);
      },
      setVolume: (vol: number) => {
        currentVolume = vol;
        if (activeAudio) {
          activeAudio.volume = Math.max(0, Math.min(1, vol));
        }
      },
      pause: () => {
        if (activeAudio && !activeAudio.paused) {
          activeAudio.pause();
        }
      },
      resume: () => {
        if (activeAudio && activeAudio.paused) {
          activeAudio.play().catch(() => { });
        }
      },
    };
  }

  // Case B: Genuine In-Browser Model (on-demand generation)
  if (kokoroInstance) {
    (async () => {
      try {
        if (isCancelled) return;

        const blob = await generateNeuralAudioBlob(text, voice, speedMultiplier);
        if (isCancelled || !blob) return;

        const url = URL.createObjectURL(blob);
        activeAudio = new Audio(url);
        activeAudio.volume = Math.max(0, Math.min(1, currentVolume));

        activeAudio.onplay = () => {
          onStart?.();
          if (animId) cancelAnimationFrame(animId);
          animId = requestAnimationFrame(tick);
        };

        activeAudio.onpause = () => {
          if (animId) cancelAnimationFrame(animId);
        };

        activeAudio.ontimeupdate = () => {
          if (activeAudio) {
            onTimeUpdate?.(activeAudio.currentTime, activeAudio.duration || 0);
          }
        };

        activeAudio.onended = () => {
          if (animId) cancelAnimationFrame(animId);
          URL.revokeObjectURL(url);
          onEnd?.();
        };

        activeAudio.onerror = (e) => {
          if (animId) cancelAnimationFrame(animId);
          URL.revokeObjectURL(url);
          onError?.(e);
        };

        if (isCancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        await activeAudio.play();
      } catch (err) {
        if (!isCancelled) {
          console.warn('In-browser synthesis error, falling back to browser voice:', err);
          fallbackToBrowserSpeech(text, voice, speedMultiplier, currentVolume, preferredVoiceName, onStart, onEnd, onError, onTimeUpdate);
        }
      }
    })();

    return {
      cancel: () => {
        isCancelled = true;
        if (animId) cancelAnimationFrame(animId);
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.src = '';
        }
      },
      setVolume: (vol: number) => {
        currentVolume = vol;
        if (activeAudio) {
          activeAudio.volume = Math.max(0, Math.min(1, vol));
        }
      },
      pause: () => {
        if (activeAudio && !activeAudio.paused) {
          activeAudio.pause();
        }
      },
      resume: () => {
        if (activeAudio && activeAudio.paused) {
          activeAudio.play().catch(() => { });
        }
      },
    };
  }

  // Case C: Fallback to high-quality browser speech
  return fallbackToBrowserSpeech(text, voice, speedMultiplier, volume, preferredVoiceName, onStart, onEnd, onError, onTimeUpdate);
}

