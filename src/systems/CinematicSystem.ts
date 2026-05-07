/**
 * CinematicSystem - Camera choreography and scripted sequences.
 * 
 * WHY THIS EXISTS:
 * Emotional moments need cinematic presentation. When Rika opens up,
 * the camera should slowly zoom in. When the player arrives in town,
 * the camera should pan across the landscape. These moments transform
 * a pixel art game into an emotional experience.
 * 
 * DESIGN PHILOSOPHY:
 * Cinematics in Brongwood are SUBTLE, not flashy:
 * - Slow zooms (1.0 → 1.3 over 2 seconds) for intimate moments
 * - Gentle pans to show environment during pauses
 * - Letterbox bars for dramatic scenes
 * - Screen shake for emotional impact (very subtle, 1-2px)
 * - Fade to/from black for scene transitions
 * 
 * ARCHITECTURE:
 * A cinematic is a SEQUENCE of steps executed in order.
 * Each step can be:
 * - Camera movement (zoom, pan, follow, shake)
 * - Wait (pause for emotional beat)
 * - Overlay (letterbox, fade, flash)
 * - Callback (trigger dialogue, play sound, etc.)
 * 
 * Steps can run in parallel (zoom + pan simultaneously) or sequentially.
 * The system uses a Promise-based chain for clean async sequencing.
 * 
 * USAGE:
 * const cinematic = new CinematicSequence(scene)
 *   .zoomTo(1.3, 1500)
 *   .wait(500)
 *   .panTo(targetX, targetY, 2000)
 *   .call(() => dialogueSystem.start(dialogue))
 *   .wait(0) // waits for dialogue to end
 *   .zoomTo(1.0, 1000)
 *   .play();
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { EventBus } from '@/core/EventBus';

// ============================================================
// TYPES
// ============================================================

type CinematicStep =
  | { type: 'zoom'; target: number; duration: number }
  | { type: 'pan'; x: number; y: number; duration: number }
  | { type: 'follow'; target: Phaser.GameObjects.GameObject; lerp: number }
  | { type: 'shake'; intensity: number; duration: number }
  | { type: 'wait'; duration: number }
  | { type: 'wait_event'; event: string }
  | { type: 'fade_out'; duration: number; color?: number }
  | { type: 'fade_in'; duration: number }
  | { type: 'letterbox'; show: boolean; duration: number }
  | { type: 'flash'; color: number; duration: number }
  | { type: 'call'; fn: () => void | Promise<void> };

// ============================================================
// CINEMATIC SEQUENCE BUILDER
// ============================================================

export class CinematicSequence {
  private scene: Phaser.Scene;
  private steps: CinematicStep[] = [];
  private _playing: boolean = false;
  private letterboxTop: Phaser.GameObjects.Rectangle | null = null;
  private letterboxBottom: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ============================================================
  // BUILDER METHODS (chainable)
  // ============================================================

  /** Zoom camera to target level */
  zoomTo(target: number, duration: number): this {
    this.steps.push({ type: 'zoom', target, duration });
    return this;
  }

  /** Pan camera to world position */
  panTo(x: number, y: number, duration: number): this {
    this.steps.push({ type: 'pan', x, y, duration });
    return this;
  }

  /** Resume following a target */
  follow(target: Phaser.GameObjects.GameObject, lerp: number = 0.1): this {
    this.steps.push({ type: 'follow', target, lerp });
    return this;
  }

  /** Shake the camera */
  shake(intensity: number = 0.002, duration: number = 200): this {
    this.steps.push({ type: 'shake', intensity, duration });
    return this;
  }

  /** Wait for a duration (ms). 0 = wait for next step trigger */
  wait(duration: number): this {
    this.steps.push({ type: 'wait', duration });
    return this;
  }

  /** Wait for a specific event to fire */
  waitForEvent(event: string): this {
    this.steps.push({ type: 'wait_event', event });
    return this;
  }

  /** Fade to black (or custom color) */
  fadeOut(duration: number = 500, color?: number): this {
    this.steps.push({ type: 'fade_out', duration, color });
    return this;
  }

  /** Fade in from black */
  fadeIn(duration: number = 800): this {
    this.steps.push({ type: 'fade_in', duration });
    return this;
  }

  /** Show/hide letterbox bars (cinematic framing) */
  letterbox(show: boolean, duration: number = 400): this {
    this.steps.push({ type: 'letterbox', show, duration });
    return this;
  }

  /** Flash the screen (for impact moments) */
  flash(color: number = 0xffffff, duration: number = 100): this {
    this.steps.push({ type: 'flash', color, duration });
    return this;
  }

  /** Execute a callback function */
  call(fn: () => void | Promise<void>): this {
    this.steps.push({ type: 'call', fn });
    return this;
  }

  // ============================================================
  // PLAYBACK
  // ============================================================

  /** Play the cinematic sequence */
  async play(): Promise<void> {
    if (this._playing) return;
    this._playing = true;

    // Lock player during cinematic
    EventBus.emit('event:player-locked', { locked: true });

    for (const step of this.steps) {
      if (!this._playing) break;
      await this.executeStep(step);
    }

    // Unlock player
    EventBus.emit('event:player-locked', { locked: false });
    this._playing = false;
  }

  /** Stop the cinematic immediately */
  stop(): void {
    this._playing = false;
  }

  get playing(): boolean { return this._playing; }

  // ============================================================
  // STEP EXECUTION
  // ============================================================

  private executeStep(step: CinematicStep): Promise<void> {
    const camera = this.scene.cameras.main;

    switch (step.type) {
      case 'zoom':
        return new Promise(resolve => {
          camera.zoomTo(step.target, step.duration, undefined, undefined, (_cam, progress) => {
            if (progress >= 1) resolve();
          });
          // Fallback timeout in case callback doesn't fire
          this.scene.time.delayedCall(step.duration + 50, resolve);
        });

      case 'pan':
        return new Promise(resolve => {
          camera.stopFollow();
          camera.pan(step.x, step.y, step.duration, undefined, undefined, (_cam, progress) => {
            if (progress >= 1) resolve();
          });
          this.scene.time.delayedCall(step.duration + 50, resolve);
        });

      case 'follow':
        camera.startFollow(step.target, true, step.lerp, step.lerp);
        return Promise.resolve();

      case 'shake':
        return new Promise(resolve => {
          camera.shake(step.duration, step.intensity);
          this.scene.time.delayedCall(step.duration, resolve);
        });

      case 'wait':
        if (step.duration <= 0) return Promise.resolve();
        return new Promise(resolve => {
          this.scene.time.delayedCall(step.duration, resolve);
        });

      case 'wait_event':
        return new Promise(resolve => {
          EventBus.once(step.event as keyof import('@/core/EventBus').GameEvents, () => {
            resolve();
          });
        });

      case 'fade_out':
        return new Promise(resolve => {
          const r = ((step.color ?? 0) >> 16) & 0xff;
          const g = ((step.color ?? 0) >> 8) & 0xff;
          const b = (step.color ?? 0) & 0xff;
          camera.fadeOut(step.duration, r, g, b);
          camera.once('camerafadeoutcomplete', resolve);
        });

      case 'fade_in':
        return new Promise(resolve => {
          camera.fadeIn(step.duration);
          camera.once('camerafadeincomplete', resolve);
        });

      case 'letterbox':
        return this.animateLetterbox(step.show, step.duration);

      case 'flash':
        return new Promise(resolve => {
          camera.flash(step.duration, 
            (step.color >> 16) & 0xff,
            (step.color >> 8) & 0xff,
            step.color & 0xff
          );
          this.scene.time.delayedCall(step.duration, resolve);
        });

      case 'call':
        const result = step.fn();
        if (result instanceof Promise) return result;
        return Promise.resolve();
    }
  }

  // ============================================================
  // LETTERBOX
  // ============================================================

  private animateLetterbox(show: boolean, duration: number): Promise<void> {
    const barHeight = 24;

    if (!this.letterboxTop) {
      this.letterboxTop = this.scene.add.rectangle(
        GAME_CONFIG.WIDTH / 2, -barHeight / 2,
        GAME_CONFIG.WIDTH, barHeight, 0x000000
      );
      this.letterboxTop.setScrollFactor(0);
      this.letterboxTop.setDepth(DEPTH.UI - 1);

      this.letterboxBottom = this.scene.add.rectangle(
        GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT + barHeight / 2,
        GAME_CONFIG.WIDTH, barHeight, 0x000000
      );
      this.letterboxBottom.setScrollFactor(0);
      this.letterboxBottom.setDepth(DEPTH.UI - 1);
    }

    return new Promise(resolve => {
      const topTarget = show ? barHeight / 2 : -barHeight / 2;
      const bottomTarget = show ? GAME_CONFIG.HEIGHT - barHeight / 2 : GAME_CONFIG.HEIGHT + barHeight / 2;

      this.scene.tweens.add({
        targets: this.letterboxTop,
        y: topTarget,
        duration,
        ease: 'Cubic.easeInOut',
      });

      this.scene.tweens.add({
        targets: this.letterboxBottom,
        y: bottomTarget,
        duration,
        ease: 'Cubic.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }
}
