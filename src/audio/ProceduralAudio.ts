/**
 * ProceduralAudio - Generates ambient sounds using Web Audio API.
 * 
 * No external audio files needed. All sounds are synthesized:
 * - Rain: filtered white noise
 * - Wind: low-frequency filtered noise with modulation
 * - Birds: sine wave chirps with random timing
 * - Footsteps: short noise bursts
 * - UI click: short high-frequency blip
 * 
 * WHY PROCEDURAL:
 * - Zero file downloads (instant load)
 * - Infinite variation (never sounds repetitive)
 * - Reactive to game state (rain intensity changes smoothly)
 * - Tiny code footprint vs MB of audio files
 */

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;

  // Active sound nodes
  private rainNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private windNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private birdInterval: number | null = null;

  // State
  private _initialized: boolean = false;
  private _muted: boolean = false;

  /**
   * Initialize audio context (must be called after user interaction).
   */
  init(): void {
    if (this._initialized) return;

    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) {
      console.warn('[ProceduralAudio] Web Audio not available');
    }
  }

  get initialized(): boolean { return this._initialized; }

  /** Resume audio context (needed after user gesture) */
  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ============================================================
  // RAIN
  // ============================================================

  /** Start rain sound (intensity 0-1) */
  startRain(intensity: number = 0.5): void {
    if (!this.ctx) return;
    if (this.rainNode) this.stopRain();

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate filtered noise (rain-like)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass filter to make it sound like rain
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    // High-pass to remove rumble
    const hipass = this.ctx.createBiquadFilter();
    hipass.type = 'highpass';
    hipass.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.value = intensity * 0.3;

    source.connect(filter);
    filter.connect(hipass);
    hipass.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.rainNode = { source, gain };
  }

  /** Adjust rain intensity (0-1) */
  setRainIntensity(intensity: number): void {
    if (this.rainNode && this.ctx) {
      this.rainNode.gain.gain.linearRampToValueAtTime(
        intensity * 0.3,
        this.ctx.currentTime + 1
      );
    }
  }

  /** Stop rain sound */
  stopRain(): void {
    if (this.rainNode) {
      this.rainNode.source.stop();
      this.rainNode = null;
    }
  }

  // ============================================================
  // WIND
  // ============================================================

  /** Start wind ambient */
  startWind(intensity: number = 0.3): void {
    if (!this.ctx) return;
    if (this.windNode) this.stopWind();

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate low-frequency noise (wind-like)
    let lastVal = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Low-pass by averaging (creates whooshing)
      lastVal = lastVal * 0.98 + white * 0.02;
      data[i] = lastVal * 3;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.value = intensity * 0.2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.windNode = { source, gain };
  }

  /** Stop wind */
  stopWind(): void {
    if (this.windNode) {
      this.windNode.source.stop();
      this.windNode = null;
    }
  }

  // ============================================================
  // BIRDS (periodic chirps)
  // ============================================================

  /** Start bird chirps (random intervals) */
  startBirds(): void {
    if (!this.ctx) return;
    this.stopBirds();

    const chirp = () => {
      if (!this.ctx || this._muted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random() * 2000;

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

      // Quick frequency sweep (chirp sound)
      osc.frequency.linearRampToValueAtTime(
        osc.frequency.value + 500 + Math.random() * 1000,
        this.ctx.currentTime + 0.08
      );

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    };

    // Random chirps every 2-6 seconds
    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 4000;
      this.birdInterval = window.setTimeout(() => {
        chirp();
        // Sometimes double chirp
        if (Math.random() > 0.5) {
          setTimeout(chirp, 100 + Math.random() * 150);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  /** Stop birds */
  stopBirds(): void {
    if (this.birdInterval !== null) {
      clearTimeout(this.birdInterval);
      this.birdInterval = null;
    }
  }

  // ============================================================
  // SFX (one-shot)
  // ============================================================

  /** Play footstep sound */
  playFootstep(): void {
    if (!this.ctx) return;

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600 + Math.random() * 200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  /** Play UI click/interact sound */
  playClick(): void {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // ============================================================
  // MASTER CONTROL
  // ============================================================

  setVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  mute(): void {
    this._muted = true;
    if (this.masterGain) this.masterGain.gain.value = 0;
  }

  unmute(): void {
    this._muted = false;
    if (this.masterGain) this.masterGain.gain.value = 0.5;
  }

  /** Stop all sounds */
  stopAll(): void {
    this.stopRain();
    this.stopWind();
    this.stopBirds();
  }

  destroy(): void {
    this.stopAll();
    this.ctx?.close();
    this.ctx = null;
  }
}

/** Global instance */
export const proceduralAudio = new ProceduralAudio();
