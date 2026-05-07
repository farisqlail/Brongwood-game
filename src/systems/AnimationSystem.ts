/**
 * AnimationSystem - Manages sprite animation state transitions.
 * 
 * WHY separate from movement:
 * 1. Animation logic can get complex (blending, priorities, overrides)
 * 2. NPCs need animations without player input
 * 3. Cutscenes need to control animations independently
 * 4. Keeps the player entity lean
 * 
 * ANIMATION KEY FORMAT:
 * {character}-{action}-{direction}
 * Examples: "lail-walk-down", "rika-idle-left", "lail-talk-right"
 * 
 * This system reads the current state (moving/idle + direction)
 * and plays the appropriate animation on the sprite.
 * It only changes animation when the key actually changes,
 * preventing restart flicker.
 * 
 * FUTURE EXPANSION:
 * - Animation priority system (emote > walk > idle)
 * - Animation blending/crossfade
 * - Animation events (footstep sounds on specific frames)
 * - Override animations (cutscene-controlled)
 */

import Phaser from 'phaser';
import { Direction } from '@/types';

export class AnimationSystem {
  private currentAnim: string = '';
  private overrideAnim: string | null = null;

  /**
   * Update the animation based on movement state.
   * Only changes animation if the key actually changed,
   * preventing restart flicker.
   * 
   * @param sprite - The sprite to animate
   * @param isMoving - Whether the entity is currently moving
   * @param direction - Current facing direction
   * @param character - Character prefix for animation keys (e.g., "lail", "rika")
   */
  update(
    sprite: Phaser.GameObjects.Sprite,
    isMoving: boolean,
    direction: Direction,
    character: string = 'lail'
  ): void {
    // If an override is active, don't change animation
    if (this.overrideAnim) return;

    const action = isMoving ? 'walk' : 'idle';
    const animKey = `${character}-${action}-${direction}`;

    // Only change animation if it's different (prevents restart flicker)
    if (this.currentAnim !== animKey) {
      this.currentAnim = animKey;

      // Check if animation exists before playing (graceful fallback)
      if (sprite.anims.animationManager.exists(animKey)) {
        sprite.anims.play(animKey, true);
      }
    }
  }

  /**
   * Force play a specific animation (for cutscenes, emotes).
   * Overrides normal state-based animation until clearOverride() is called.
   */
  forcePlay(sprite: Phaser.GameObjects.Sprite, animKey: string): void {
    this.overrideAnim = animKey;
    this.currentAnim = animKey;

    if (sprite.anims.animationManager.exists(animKey)) {
      sprite.anims.play(animKey, true);
    }
  }

  /**
   * Clear the override, returning to normal state-based animation.
   */
  clearOverride(): void {
    this.overrideAnim = null;
    this.currentAnim = ''; // Force re-evaluation on next update
  }

  /** Get current animation key */
  getCurrentAnim(): string {
    return this.currentAnim;
  }

  /** Whether an override animation is active */
  isOverrideActive(): boolean {
    return this.overrideAnim !== null;
  }
}
