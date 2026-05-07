/**
 * WeatherSystem - Rain, fog, and atmospheric weather effects.
 * 
 * WHY WEATHER IS EMOTIONALLY CRITICAL:
 * Rain in Brongwood isn't just visual — it's emotional punctuation.
 * - Rain makes loneliness tangible (you can hear/see isolation)
 * - Rain creates intimacy (being inside together while it rains outside)
 * - Rain triggers special events (Rika's vulnerable moments happen in rain)
 * - Rain changes the soundscape (ambient rain loop replaces cicadas)
 * 
 * TECHNICAL APPROACH:
 * - Particle emitter for rain drops (GPU-accelerated, hundreds of particles)
 * - Darkening overlay (stacks with day/night atmosphere)
 * - Audio layer integration (rain ambience fades in/out)
 * - Splash particles on ground (subtle, adds depth)
 * 
 * WEATHER STATES:
 * - clear: no effects
 * - light_rain: subtle particles, gentle audio
 * - rain: full rain, darker overlay, louder audio
 * - heavy_rain: dense particles, thunder flashes, very dark
 * 
 * WEATHER SCHEDULING:
 * Weather can be:
 * - Random (chance per day, weighted by season)
 * - Scripted (forced for specific events)
 * - Time-based (rain more likely at night)
 * 
 * For the vertical slice, we use simple probability + event forcing.
 */

import Phaser from 'phaser';
import { EventBus, TimePeriod } from '@/core/EventBus';
import { DEPTH, GAME_CONFIG } from '@config/game.config';

// ============================================================
// TYPES
// ============================================================

export type WeatherState = 'clear' | 'light_rain' | 'rain' | 'heavy_rain';

interface WeatherConfig {
  /** Number of rain particles */
  particleCount: number;
  /** Rain particle speed (pixels/sec) */
  speed: number;
  /** Additional darkness overlay alpha */
  darknessAlpha: number;
  /** Wind angle (degrees from vertical, 0 = straight down) */
  windAngle: number;
  /** Ambience volume multiplier */
  ambienceVolume: number;
}

const WEATHER_CONFIGS: Record<WeatherState, WeatherConfig> = {
  clear: {
    particleCount: 0,
    speed: 0,
    darknessAlpha: 0,
    windAngle: 0,
    ambienceVolume: 0,
  },
  light_rain: {
    particleCount: 40,
    speed: 200,
    darknessAlpha: 0.05,
    windAngle: 5,
    ambienceVolume: 0.3,
  },
  rain: {
    particleCount: 100,
    speed: 300,
    darknessAlpha: 0.12,
    windAngle: 10,
    ambienceVolume: 0.6,
  },
  heavy_rain: {
    particleCount: 200,
    speed: 400,
    darknessAlpha: 0.2,
    windAngle: 15,
    ambienceVolume: 0.9,
  },
};

// ============================================================
// SYSTEM
// ============================================================

export class WeatherSystem {
  private scene: Phaser.Scene;
  private _state: WeatherState = 'clear';
  private _targetState: WeatherState = 'clear';

  // Visual elements
  private rainParticles: Phaser.GameObjects.Graphics | null = null;
  private darknessOverlay: Phaser.GameObjects.Rectangle | null = null;
  private rainDrops: Array<{ x: number; y: number; speed: number; length: number }> = [];

  // Transition
  private transitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 3000; // ms

  // Rain scheduling (30% base chance — rain is common in Brongwood)
  private rainChancePerHour: number = 0.30;
  private forcedWeather: WeatherState | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createVisuals();

    // Listen for hour changes to potentially start/stop rain
    EventBus.on('time:hour-changed', this.onHourChanged, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  get state(): WeatherState { return this._state; }
  get isRaining(): boolean { return this._state !== 'clear'; }

  /**
   * Force a specific weather state (for events/cutscenes).
   * Overrides random weather until clearForced() is called.
   */
  forceWeather(state: WeatherState): void {
    this.forcedWeather = state;
    this.transitionTo(state);
  }

  /** Clear forced weather, return to random scheduling */
  clearForced(): void {
    this.forcedWeather = null;
  }

  /** Transition to a new weather state over time */
  transitionTo(state: WeatherState): void {
    if (state === this._state && !this.transitioning) return;
    this._targetState = state;
    this.transitioning = true;
    this.transitionProgress = 0;
  }

  /**
   * Update weather visuals every frame.
   * Handles rain particle simulation and transitions.
   */
  update(delta: number): void {
    // Handle transitions
    if (this.transitioning) {
      this.transitionProgress += delta / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.transitioning = false;
        this._state = this._targetState;
      }
      this.updateVisuals();
    }

    // Animate rain particles
    if (this._state !== 'clear' || this.transitioning) {
      this.updateRain(delta);
    }
  }

  /** Clean up */
  destroy(): void {
    EventBus.off('time:hour-changed', this.onHourChanged);
    this.rainParticles?.destroy();
    this.darknessOverlay?.destroy();
  }

  // ============================================================
  // PRIVATE: VISUALS
  // ============================================================

  private createVisuals(): void {
    // Rain particle graphics (drawn manually for pixel-art style)
    this.rainParticles = this.scene.add.graphics();
    this.rainParticles.setScrollFactor(0);
    this.rainParticles.setDepth(DEPTH.WEATHER);

    // Darkness overlay for rain
    this.darknessOverlay = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x1a2040,
      0
    );
    this.darknessOverlay.setScrollFactor(0);
    this.darknessOverlay.setDepth(DEPTH.WEATHER - 1);
    this.darknessOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  private updateVisuals(): void {
    // Interpolate darkness based on transition
    const currentConfig = WEATHER_CONFIGS[this._state];
    const targetConfig = WEATHER_CONFIGS[this._targetState];
    const t = this.transitionProgress;

    const alpha = currentConfig.darknessAlpha + (targetConfig.darknessAlpha - currentConfig.darknessAlpha) * t;
    this.darknessOverlay?.setAlpha(alpha);

    // Update particle count
    const targetCount = Math.round(
      currentConfig.particleCount + (targetConfig.particleCount - currentConfig.particleCount) * t
    );

    // Adjust rain drops array
    while (this.rainDrops.length < targetCount) {
      this.rainDrops.push(this.createRainDrop());
    }
    while (this.rainDrops.length > targetCount) {
      this.rainDrops.pop();
    }
  }

  private updateRain(delta: number): void {
    if (!this.rainParticles) return;

    const config = WEATHER_CONFIGS[this._targetState];
    const windRad = (config.windAngle * Math.PI) / 180;
    const deltaSeconds = delta / 1000;

    this.rainParticles.clear();
    this.rainParticles.lineStyle(1, 0xaabbdd, 0.4);

    for (const drop of this.rainDrops) {
      // Move drop
      drop.y += drop.speed * deltaSeconds;
      drop.x += Math.sin(windRad) * drop.speed * deltaSeconds * 0.3;

      // Reset if off screen
      if (drop.y > GAME_CONFIG.HEIGHT + 10) {
        drop.y = -10;
        drop.x = Math.random() * (GAME_CONFIG.WIDTH + 40) - 20;
        drop.speed = config.speed * (0.8 + Math.random() * 0.4);
      }

      // Draw rain streak
      const endX = drop.x + Math.sin(windRad) * drop.length;
      const endY = drop.y + Math.cos(windRad) * drop.length;

      this.rainParticles.beginPath();
      this.rainParticles.moveTo(drop.x, drop.y);
      this.rainParticles.lineTo(endX, endY);
      this.rainParticles.strokePath();
    }
  }

  private createRainDrop(): { x: number; y: number; speed: number; length: number } {
    const config = WEATHER_CONFIGS[this._targetState];
    return {
      x: Math.random() * (GAME_CONFIG.WIDTH + 40) - 20,
      y: Math.random() * GAME_CONFIG.HEIGHT - GAME_CONFIG.HEIGHT,
      speed: config.speed * (0.8 + Math.random() * 0.4),
      length: 3 + Math.random() * 4,
    };
  }

  // ============================================================
  // PRIVATE: SCHEDULING
  // ============================================================

  private onHourChanged = (payload: { hour: number; period: TimePeriod }): void => {
    if (this.forcedWeather) return; // Don't override forced weather

    // Rain is more likely at night and evening
    let chance = this.rainChancePerHour;
    if (payload.period === 'night' || payload.period === 'late_night') {
      chance *= 2;
    } else if (payload.period === 'evening') {
      chance *= 1.5;
    }

    if (this._state === 'clear') {
      // Chance to start raining
      if (Math.random() < chance) {
        const intensity = Math.random();
        if (intensity < 0.5) this.transitionTo('light_rain');
        else if (intensity < 0.85) this.transitionTo('rain');
        else this.transitionTo('heavy_rain');
      }
    } else {
      // Chance to stop raining (lower chance = rain lasts longer)
      if (Math.random() < chance * 0.5) {
        this.transitionTo('clear');
      }
    }
  };
}
