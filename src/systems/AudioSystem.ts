/**
 * AudioSystem - Manages BGM, ambience, and sound effects.
 * 
 * WHY AUDIO IS CRITICAL FOR BRONGWOOD:
 * In a game about atmosphere and emotion, audio does 50% of the work.
 * - Rain sounds make loneliness tangible
 * - Distant train sounds evoke nostalgia
 * - Soft piano BGM creates melancholy
 * - Cicadas at dusk signal the passage of time
 * - Silence between sounds creates intimacy
 * 
 * ARCHITECTURE:
 * Three independent layers that blend together:
 * 1. BGM: Background music (one track at a time, crossfades between tracks)
 * 2. Ambience: Layered environmental sounds (rain + wind + distant ocean)
 * 3. SFX: One-shot sound effects (footsteps, door, UI clicks)
 * 
 * WHY LAYERED AMBIENCE:
 * Real environments have multiple simultaneous sounds.
 * A rainy night = rain loop + distant thunder + wind + dripping eaves.
 * Each layer has independent volume, allowing dynamic mixing:
 * - Rain gets louder as night deepens
 * - Cicadas fade in at dusk, fade out at night
 * - Ocean is louder near the coast
 * 
 * CROSSFADE STRATEGY:
 * BGM never cuts abruptly. When changing tracks:
 * 1. New track fades in over 2 seconds
 * 2. Old track fades out over 2 seconds
 * 3. Brief overlap creates smooth transition
 * This prevents jarring audio cuts during scene/time transitions.
 * 
 * TIME INTEGRATION:
 * The AudioSystem listens to time events and automatically:
 * - Changes BGM based on time period
 * - Adjusts ambience layers (cicadas at dusk, silence at night)
 * - This happens without any scene code — fully reactive
 */

import Phaser from 'phaser';
import { EventBus, TimePeriod } from '@/core/EventBus';

// ============================================================
// TYPES
// ============================================================

interface AmbienceLayer {
  key: string;
  sound: Phaser.Sound.BaseSound | null;
  targetVolume: number;
  currentVolume: number;
  loop: boolean;
}

interface BGMState {
  currentKey: string | null;
  currentSound: Phaser.Sound.BaseSound | null;
  targetVolume: number;
  fadingOut: boolean;
}

// ============================================================
// SYSTEM
// ============================================================

export class AudioSystem {
  private scene: Phaser.Scene;

  // BGM state
  private bgm: BGMState = {
    currentKey: null,
    currentSound: null,
    targetVolume: 0.4,
    fadingOut: false,
  };

  // Ambience layers (multiple simultaneous loops)
  private ambienceLayers: Map<string, AmbienceLayer> = new Map();

  // Master volumes
  private masterVolume: number = 1.0;
  private bgmVolume: number = 0.4;
  private ambienceVolume: number = 0.6;
  private sfxVolume: number = 0.8;

  // Fade durations (ms)
  private bgmFadeDuration: number = 2000;
  private ambienceFadeDuration: number = 3000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Listen for time period changes to adjust audio
    EventBus.on('time:period-changed', this.onPeriodChanged, this);
  }

  // ============================================================
  // BGM
  // ============================================================

  /**
   * Play a BGM track with crossfade.
   * If the same track is already playing, does nothing.
   */
  playBGM(key: string, volume?: number): void {
    if (this.bgm.currentKey === key && !this.bgm.fadingOut) return;

    const targetVol = volume ?? this.bgmVolume;

    // Fade out current track
    if (this.bgm.currentSound && this.bgm.currentKey !== key) {
      this.fadeOutSound(this.bgm.currentSound, this.bgmFadeDuration);
    }

    // Check if audio exists in cache
    if (!this.scene.cache.audio.exists(key)) {
      // Audio not loaded yet — store intent for when it loads
      this.bgm.currentKey = key;
      this.bgm.currentSound = null;
      return;
    }

    // Start new track
    const sound = this.scene.sound.add(key, {
      loop: true,
      volume: 0,
    });
    sound.play();

    // Fade in
    this.scene.tweens.add({
      targets: sound,
      volume: targetVol * this.masterVolume,
      duration: this.bgmFadeDuration,
    });

    this.bgm.currentKey = key;
    this.bgm.currentSound = sound;
    this.bgm.targetVolume = targetVol;
    this.bgm.fadingOut = false;

    EventBus.emit('audio:bgm-changed', { trackKey: key });
  }

  /** Stop BGM with fade out */
  stopBGM(fadeDuration?: number): void {
    if (this.bgm.currentSound) {
      this.fadeOutSound(this.bgm.currentSound, fadeDuration ?? this.bgmFadeDuration);
      this.bgm.currentKey = null;
      this.bgm.currentSound = null;
    }
  }

  // ============================================================
  // AMBIENCE
  // ============================================================

  /**
   * Add an ambience layer (or adjust volume if already playing).
   * Multiple layers play simultaneously for rich environmental sound.
   * 
   * @param key - Audio key for the ambience loop
   * @param volume - Target volume (0-1)
   */
  addAmbienceLayer(key: string, volume: number = 0.5): void {
    const existing = this.ambienceLayers.get(key);

    if (existing) {
      // Already playing — just adjust target volume
      existing.targetVolume = volume * this.ambienceVolume * this.masterVolume;
      if (existing.sound) {
        this.scene.tweens.add({
          targets: existing.sound,
          volume: existing.targetVolume,
          duration: this.ambienceFadeDuration,
        });
      }
      return;
    }

    // Check if audio exists
    if (!this.scene.cache.audio.exists(key)) {
      // Store intent — will play when audio loads
      this.ambienceLayers.set(key, {
        key,
        sound: null,
        targetVolume: volume * this.ambienceVolume * this.masterVolume,
        currentVolume: 0,
        loop: true,
      });
      return;
    }

    // Create and fade in
    const sound = this.scene.sound.add(key, { loop: true, volume: 0 });
    sound.play();

    const targetVol = volume * this.ambienceVolume * this.masterVolume;

    this.scene.tweens.add({
      targets: sound,
      volume: targetVol,
      duration: this.ambienceFadeDuration,
    });

    this.ambienceLayers.set(key, {
      key,
      sound,
      targetVolume: targetVol,
      currentVolume: 0,
      loop: true,
    });

    this.emitAmbienceChanged();
  }

  /** Remove an ambience layer with fade out */
  removeAmbienceLayer(key: string): void {
    const layer = this.ambienceLayers.get(key);
    if (!layer) return;

    if (layer.sound) {
      this.fadeOutSound(layer.sound, this.ambienceFadeDuration);
    }

    this.ambienceLayers.delete(key);
    this.emitAmbienceChanged();
  }

  /** Remove all ambience layers */
  clearAmbience(): void {
    for (const layer of this.ambienceLayers.values()) {
      if (layer.sound) {
        this.fadeOutSound(layer.sound, this.ambienceFadeDuration);
      }
    }
    this.ambienceLayers.clear();
    this.emitAmbienceChanged();
  }

  // ============================================================
  // SFX
  // ============================================================

  /** Play a one-shot sound effect */
  playSFX(key: string, volume?: number): void {
    if (!this.scene.cache.audio.exists(key)) return;

    const vol = (volume ?? 1) * this.sfxVolume * this.masterVolume;
    this.scene.sound.play(key, { volume: vol });
  }

  // ============================================================
  // VOLUME CONTROL
  // ============================================================

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    this.bgm.targetVolume = this.bgmVolume;
    this.updateAllVolumes();
  }

  setAmbienceVolume(volume: number): void {
    this.ambienceVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  destroy(): void {
    this.stopBGM(0);
    this.clearAmbience();
    EventBus.off('time:period-changed', this.onPeriodChanged);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Fade out and destroy a sound */
  private fadeOutSound(sound: Phaser.Sound.BaseSound, duration: number): void {
    this.scene.tweens.add({
      targets: sound,
      volume: 0,
      duration,
      onComplete: () => {
        sound.stop();
        sound.destroy();
      },
    });
  }

  /** Update all playing sounds to reflect volume changes */
  private updateAllVolumes(): void {
    if (this.bgm.currentSound) {
      (this.bgm.currentSound as Phaser.Sound.WebAudioSound).setVolume(
        this.bgm.targetVolume * this.masterVolume
      );
    }

    for (const layer of this.ambienceLayers.values()) {
      if (layer.sound) {
        const newVol = layer.targetVolume; // Already includes master
        (layer.sound as Phaser.Sound.WebAudioSound).setVolume(newVol);
      }
    }
  }

  /** Emit ambience changed event */
  private emitAmbienceChanged(): void {
    EventBus.emit('audio:ambience-changed', {
      layers: Array.from(this.ambienceLayers.keys()),
    });
  }

  /**
   * React to time period changes.
   * This is where audio atmosphere is driven by time.
   * 
   * FUTURE: This mapping should move to a config file
   * once audio assets exist.
   */
  private onPeriodChanged = (payload: { period: TimePeriod }): void => {
    // These will activate once audio assets are loaded
    // For now, this demonstrates the reactive architecture
    switch (payload.period) {
      case 'dawn':
        // Soft morning birds, remove night sounds
        // this.removeAmbienceLayer('amb_cicada');
        // this.addAmbienceLayer('amb_birds', 0.3);
        break;
      case 'morning':
        // Clear, minimal ambience
        // this.removeAmbienceLayer('amb_birds');
        break;
      case 'evening':
        // Cicadas fade in
        // this.addAmbienceLayer('amb_cicada', 0.4);
        break;
      case 'night':
        // Cicadas louder, add wind
        // this.addAmbienceLayer('amb_cicada', 0.6);
        // this.addAmbienceLayer('amb_wind', 0.2);
        break;
      case 'late_night':
        // Quiet, just wind
        // this.removeAmbienceLayer('amb_cicada');
        // this.addAmbienceLayer('amb_wind', 0.3);
        break;
    }
  };
}
