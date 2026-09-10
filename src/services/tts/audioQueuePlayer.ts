import { SpeechChunk } from './textChunker';
import {
  QwenTtsVoice,
  synthesizeSpeechChunk,
  generateNeuralAudioBlob,
  SpeechSynthesisController,
} from './qwenTtsEngine';

export interface AudioPlayerListener {
  onChunkStart?: (chunk: SpeechChunk, index: number, total: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number, index: number) => void;
  onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

export class AudioQueuePlayer {
  private chunks: SpeechChunk[] = [];
  private currentIndex = 0;
  private voice: QwenTtsVoice;
  private speedMultiplier = 1.0;
  private volume = 1.0;
  private isPlaying = false;
  private isPaused = false;
  private chunkCurrentTime = 0;
  private chunkDuration = 0;
  private knownDurations = new Map<number, number>();
  private activeSynthesisController: SpeechSynthesisController | null = null;
  private listeners: AudioPlayerListener = {};
  private preferredVoiceName: string | null = null;
  private prefetchedBlobs = new Map<string, Blob>();

  constructor(voice: QwenTtsVoice, speed = 1.0, volume = 1.0) {
    this.voice = voice;
    this.speedMultiplier = speed;
    this.volume = volume;
  }

  public setListeners(listeners: AudioPlayerListener): void {
    this.listeners = listeners;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.activeSynthesisController?.setVolume?.(this.volume);
  }

  public getVolume(): number {
    return this.volume;
  }

  public getChunkCurrentTime(): number {
    return this.chunkCurrentTime;
  }

  public getChunkDuration(): number {
    return this.chunkDuration;
  }

  public getKnownDurations(): Map<number, number> {
    return this.knownDurations;
  }

  public setPreferredVoiceName(preferredVoiceName: string | null): void {
    if (this.preferredVoiceName === preferredVoiceName) return;
    this.preferredVoiceName = preferredVoiceName;
    this.prefetchedBlobs.clear();
    if (this.isPlaying && !this.isPaused) {
      this.playChunk(this.currentIndex);
    }
  }

  public setVoice(voice: QwenTtsVoice): void {
    if (this.voice?.id === voice.id) return;
    this.voice = voice;
    this.prefetchedBlobs.clear();
    if (this.isPlaying && !this.isPaused) {
      this.playChunk(this.currentIndex);
    }
  }

  public setSpeed(speed: number): void {
    if (this.speedMultiplier === speed) return;
    this.speedMultiplier = speed;
    this.prefetchedBlobs.clear();
    if (this.isPlaying && !this.isPaused) {
      this.playChunk(this.currentIndex);
    }
  }

  public startQueue(chunks: SpeechChunk[], startIndex = 0): void {
    this.stop();
    this.prefetchedBlobs.clear();
    this.knownDurations.clear();
    this.chunkCurrentTime = 0;
    this.chunkDuration = 0;
    this.chunks = chunks;
    this.currentIndex = Math.max(0, Math.min(startIndex, chunks.length - 1));

    if (this.chunks.length === 0) {
      this.listeners.onComplete?.();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.listeners.onStateChange?.(true, false);
    this.playChunk(this.currentIndex);
  }

  public pause(): void {
    this.isPaused = true;
    this.isPlaying = false;
    if (this.activeSynthesisController?.pause) {
      this.activeSynthesisController.pause();
    } else {
      if (this.activeSynthesisController) {
        this.activeSynthesisController.cancel();
        this.activeSynthesisController = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    this.listeners.onStateChange?.(false, true);
  }

  public resume(): void {
    this.isPaused = false;
    this.isPlaying = true;
    this.listeners.onStateChange?.(true, false);
    if (this.activeSynthesisController?.resume) {
      this.activeSynthesisController.resume();
    } else {
      this.playChunk(this.currentIndex);
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.chunkCurrentTime = 0;
    this.prefetchedBlobs.clear();
    if (this.activeSynthesisController) {
      this.activeSynthesisController.cancel();
      this.activeSynthesisController = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.listeners.onStateChange?.(false, false);
  }

  public skipNext(): void {
    if (this.currentIndex < this.chunks.length - 1) {
      this.currentIndex++;
      this.isPlaying = true;
      this.isPaused = false;
      this.chunkCurrentTime = 0;
      this.chunkDuration = this.knownDurations.get(this.currentIndex) || 0;
      this.listeners.onStateChange?.(true, false);
      this.listeners.onTimeUpdate?.(0, this.chunkDuration, this.currentIndex);
      this.playChunk(this.currentIndex);
    } else {
      this.stop();
      this.listeners.onComplete?.();
    }
  }

  public skipPrev(): void {
    this.prefetchedBlobs.clear();
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = 0;
    }
    this.isPlaying = true;
    this.isPaused = false;
    this.chunkCurrentTime = 0;
    this.chunkDuration = this.knownDurations.get(this.currentIndex) || 0;
    this.listeners.onStateChange?.(true, false);
    this.listeners.onTimeUpdate?.(0, this.chunkDuration, this.currentIndex);
    this.playChunk(this.currentIndex);
  }

  public seekToChunk(index: number): void {
    if (index >= 0 && index < this.chunks.length) {
      this.currentIndex = index;
      this.isPlaying = true;
      this.isPaused = false;
      this.chunkCurrentTime = 0;
      this.chunkDuration = this.knownDurations.get(index) || 0;
      this.prefetchedBlobs.clear();
      this.listeners.onStateChange?.(true, false);
      this.listeners.onTimeUpdate?.(0, this.chunkDuration, index);
      this.playChunk(this.currentIndex);
    }
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getTotalChunks(): number {
    return this.chunks.length;
  }

  public getCurrentChunk(): SpeechChunk | null {
    return this.chunks[this.currentIndex] || null;
  }

  private prefetchNext(index: number): void {
    if (index >= this.chunks.length) return;
    const nextChunk = this.chunks[index];
    if (this.prefetchedBlobs.has(nextChunk.id)) return;

    generateNeuralAudioBlob(nextChunk.text, this.voice, this.speedMultiplier)
      .then(blob => {
        if (blob && this.isPlaying) {
          this.prefetchedBlobs.set(nextChunk.id, blob);
        }
      })
      .catch(() => {});
  }

  private playChunk(index: number): void {
    if (index >= this.chunks.length) {
      this.stop();
      this.listeners.onComplete?.();
      return;
    }

    if (this.activeSynthesisController) {
      this.activeSynthesisController.cancel();
      this.activeSynthesisController = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const chunk = this.chunks[index];
    this.currentIndex = index;
    this.isPlaying = true;
    this.isPaused = false;
    this.chunkCurrentTime = 0;
    this.chunkDuration = this.knownDurations.get(index) || 0;
    this.listeners.onChunkStart?.(chunk, index, this.chunks.length);
    this.listeners.onTimeUpdate?.(0, this.chunkDuration, index);

    // Retrieve pre-buffered audio if already generated in the background
    const prefetched = this.prefetchedBlobs.get(chunk.id) || null;
    this.prefetchedBlobs.delete(chunk.id);

    // Concurrently prefetch the upcoming chunk in the background so it is ready immediately!
    this.prefetchNext(index + 1);

    this.activeSynthesisController = synthesizeSpeechChunk(
      chunk.text,
      this.voice,
      this.speedMultiplier,
      this.volume,
      this.preferredVoiceName,
      prefetched,
      () => {
        // Speech started
      },
      () => {
        // Speech finished for this chunk, proceed to next
        if (this.chunkDuration > 0) {
          this.knownDurations.set(index, this.chunkDuration);
        }
        this.activeSynthesisController = null;
        this.chunkCurrentTime = 0;
        if (this.isPlaying && !this.isPaused) {
          this.currentIndex++;
          this.playChunk(this.currentIndex);
        }
      },
      (err) => {
        console.error('TTS Chunk synthesis error:', err);
        this.listeners.onError?.(err);
      },
      (currentTime, duration) => {
        this.chunkCurrentTime = currentTime;
        if (duration > 0) {
          this.chunkDuration = duration;
          this.knownDurations.set(index, duration);
        }
        this.listeners.onTimeUpdate?.(currentTime, duration, index);
      }
    );
  }
}
