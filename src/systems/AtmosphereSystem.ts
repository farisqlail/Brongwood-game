/**
 * AtmosphereSystem - Day/night visual lighting and mood.
 * 
 * WHY THIS SYSTEM EXISTS:
 * Atmosphere is the emotional core of Brongwood. Without it, the game is just
 * colored rectangles on a grid. WITH it, the player feels:
 * - The warmth of a summer evening
 * - The loneliness of a rainy night
 * - The hope of a new dawn
 * 
 * TECHNICAL APPROACH:
 * A full-screen rectangle overlays the entire scene with a tinted color.
 * Using Phaser's blend modes, this creates a unified color grade effect.
 * 
 * WHY NOT SHADERS:
 * - Shaders are overkill for a pixel art game with flat colors
 * - A tinted overlay achieves 90% of the effect with 1% of the complexity
 * - Works on all devices (no WebGL shader compatibility issues)
 * - Easy to animate with Phaser's tween system
 * - Can be combined with weather effects (rain darkens further)
 * 
 * HOW IT WORKS:
 * 1. Listens to TimeSystem events (period changes, ticks)
 * 2. Interpolates between atmosphere presets based on time progress
 * 3. Updates the overlay rectangle's color and alpha every frame
 * 4. Optionally controls window glow sprites and lamp sprites
 * 
 * DEPTH:
 * The overlay sits at DEPTH.LIGHTING (1200) — above weather, below UI.
 * This means rain particles are also tinted by the overlay (natural).
 */

import Phaser from 'phaser';
import { EventBus, TimePeriod } from '@/core/EventBus';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import {
  ATMOSPHERE_PRESETS,
  AtmospherePreset,
  AtmosphereColor,
  lerpPreset,
} from '@config/atmosphere.config';
import { TimeSystem } from './TimeSystem';

export class AtmosphereSystem {
  private scene: Phaser.Scene;
  private timeSystem: TimeSystem;

  /** The full-screen color overlay rectangle */
  private overlay!: Phaser.GameObjects.Rectangle;

  /** Current interpolated atmosphere state */
  private currentPreset: AtmospherePreset;

  /** Whether the system is active */
  private active: boolean = true;

  constructor(scene: Phaser.Scene, timeSystem: TimeSystem) {
    this.scene = scene;
    this.timeSystem = timeSystem;

    // Initialize to current period's preset
    this.currentPreset = ATMOSPHERE_PRESETS[timeSystem.period];

    // Create the overlay
    this.createOverlay();

    // Apply initial state
    this.applyPreset(this.currentPreset);

    // Listen for period changes (for logging/events)
    EventBus.on('time:period-changed', this.onPeriodChanged, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Update atmosphere based on current time.
   * Called every frame from the scene's update().
   * 
   * WHY every frame (not just on period change):
   * We want SMOOTH transitions, not sudden jumps.
   * By interpolating based on periodProgress every frame,
   * the lighting gradually shifts — players barely notice it happening.
   */
  update(): void {
    if (!this.active) return;

    const period = this.timeSystem.period;
    const progress = this.timeSystem.periodProgress;

    // Get current and next period presets
    const currentPreset = ATMOSPHERE_PRESETS[period];
    const nextPeriod = this.getNextPeriod(period);
    const nextPreset = ATMOSPHERE_PRESETS[nextPeriod];

    // Interpolate: as we approach the end of current period, blend toward next
    // Only blend in the last 30% of the period for a natural transition
    const blendStart = 0.7;
    let blendT = 0;
    if (progress > blendStart) {
      blendT = (progress - blendStart) / (1 - blendStart);
    }

    this.currentPreset = lerpPreset(currentPreset, nextPreset, blendT);
    this.applyPreset(this.currentPreset);
  }

  /** Get current atmosphere state (for other systems to query) */
  get preset(): AtmospherePreset {
    return this.currentPreset;
  }

  /** Temporarily override atmosphere (for cutscenes, indoor areas) */
  setOverride(preset: AtmospherePreset): void {
    this.active = false;
    this.applyPreset(preset);
  }

  /** Clear override, return to time-based atmosphere */
  clearOverride(): void {
    this.active = true;
  }

  /** Fade to black (for transitions) */
  fadeToBlack(duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration,
        onComplete: () => resolve(),
      });
    });
  }

  /** Fade from black */
  fadeFromBlack(duration: number = 800): void {
    this.overlay.setAlpha(1);
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: this.currentPreset.overlay.a,
      duration,
    });
  }

  /** Clean up event listeners (call on scene shutdown) */
  destroy(): void {
    EventBus.off('time:period-changed', this.onPeriodChanged);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Create the full-screen overlay rectangle */
  private createOverlay(): void {
    this.overlay = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0x000000,
      0
    );

    // Fixed to camera (doesn't scroll with the world)
    this.overlay.setScrollFactor(0);

    // Depth: above weather, below UI
    this.overlay.setDepth(DEPTH.LIGHTING);

    // Blend mode: multiply creates natural darkening + color tint
    // For pixel art, MULTIPLY works better than additive
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /** Apply an atmosphere preset to the overlay */
  private applyPreset(preset: AtmospherePreset): void {
    const { r, g, b, a } = preset.overlay;

    // Convert RGB to Phaser color integer
    const color = Phaser.Display.Color.GetColor(r, g, b);
    this.overlay.setFillStyle(color, a);
  }

  /** Get the next period in sequence (for blending) */
  private getNextPeriod(current: TimePeriod): TimePeriod {
    const order: TimePeriod[] = ['dawn', 'morning', 'afternoon', 'evening', 'night', 'late_night'];
    const index = order.indexOf(current);
    return order[(index + 1) % order.length];
  }

  /** Handle period change event (for logging/debugging) */
  private onPeriodChanged = (payload: { period: TimePeriod; previousPeriod: TimePeriod }): void => {
    EventBus.emit('atmosphere:transition-start', {
      from: payload.previousPeriod,
      to: payload.period,
    });
  };
}
