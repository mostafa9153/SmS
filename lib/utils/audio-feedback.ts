/**
 * lib/utils/audio-feedback.ts
 * Lightweight, zero-dependency tactile sound synthesizer using Web Audio API.
 * 0 KB network downloads, 0ms latency, GPU-free, and respects user mute preferences.
 */

class SoundFeedbackManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sms_sound_feedback_enabled");
      this.soundEnabled = saved !== null ? saved === "true" : true;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggle(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_sound_feedback_enabled", String(this.soundEnabled));
    }
    if (this.soundEnabled) {
      this.playTap();
    }
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("sms_sound_feedback_enabled", String(this.soundEnabled));
    }
  }

  /**
   * Subtle, soft tactile click/pop sound (35ms sine pulse)
   */
  public playTap(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }

  /**
   * Gentle, cheerful success chime for saved/admitted operations
   */
  public playSuccess(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.06 }, // E5
        { freq: 783.99, time: 0.12 }, // G5
      ].forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.04, now + time);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + 0.15);
      });
    } catch {
      // AudioContext unavailable or blocked
    }
  }
}

export const soundManager = new SoundFeedbackManager();
export const playTap = () => soundManager.playTap();
export const playSuccess = () => soundManager.playSuccess();
export const toggleSound = () => soundManager.toggle();
export const isSoundEnabled = () => soundManager.isEnabled();
