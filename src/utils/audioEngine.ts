import { AudioSegment } from '../types';

let audioCtx: AudioContext | null = null;
let activeSource: OscillatorNode | SpeechSynthesisUtterance | null = null;

// Single-file playback state
let activeAudio: HTMLAudioElement | null = null;
let playbackSpeed = 1.0;
let isMuted = false;

export class AudioEngine {
  private static getContext(): AudioContext {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Play a pleasant harmonic voice-like preview tone or synthesize text via speech API
   */
  public static playSpeechPreview(text: string, rate: number = 1.0, onEnd?: () => void) {
    this.stop();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }
      window.speechSynthesis.speak(utterance);
      activeSource = utterance;
      return;
    }

    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 1.5);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.0);

      if (onEnd) {
        setTimeout(onEnd, 2000);
      }
    } catch {
      if (onEnd) onEnd();
    }
  }

  /**
   * Plays a single local audio File or Blob preview
   */
  public static playAudioFile(file: File | Blob, onEnd?: () => void, startOffsetSec: number = 0) {
    this.stop();
    const url = URL.createObjectURL(file);
    activeAudio = new Audio(url);
    activeAudio.playbackRate = playbackSpeed;
    activeAudio.muted = isMuted;
    
    activeAudio.onended = () => {
      URL.revokeObjectURL(url);
      if (onEnd) onEnd();
    };
    activeAudio.onerror = () => {
      URL.revokeObjectURL(url);
      if (onEnd) onEnd();
    };

    if (startOffsetSec > 0) {
      activeAudio.currentTime = startOffsetSec;
    }

    activeAudio.play().catch((err) => {
      console.error('Failed to play audio file:', err);
      if (onEnd) onEnd();
    });
  }

  public static setSpeed(speed: number) {
    playbackSpeed = speed;
    if (activeAudio) {
      activeAudio.playbackRate = speed;
    }
  }

  public static setMute(muted: boolean) {
    isMuted = muted;
    if (activeAudio) {
      activeAudio.muted = muted;
    }
  }

  public static playBeep(pitch: number = 440, durationMs: number = 150) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // ignore
    }
  }

  public static getCurrentTime(): number {
    if (activeAudio) {
      return activeAudio.currentTime;
    }
    return 0;
  }

  public static stop() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeSource = null;
  }
}
