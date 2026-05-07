/**
 * Player Entity - The main character "Lail".
 * 
 * WHY this design:
 * - The Player is a thin wrapper around a Phaser Sprite
 * - It COMPOSES systems (movement, animation) rather than inheriting behavior
 * - This makes it easy to add new capabilities (inventory, interaction)
 *   without modifying existing code (Open/Closed Principle)
 * 
 * COMPOSITION OVER INHERITANCE:
 * Instead of: Player extends MovingSprite extends AnimatedSprite extends Entity
 * We use:     Player HAS a MovementSystem, HAS an AnimationSystem
 * 
 * This avoids the "diamond problem" and keeps each system testable.
 * 
 * PHYSICS BODY vs SPRITE SIZE:
 * - Sprite: 32x48 (full character visual)
 * - Body: 20x12 (only the feet area)
 * - WHY: The collision box at the feet means the player's head/torso
 *   can overlap with objects behind them, creating natural depth.
 *   This is standard for top-down RPGs (Zelda, Stardew Valley, etc.)
 * 
 * DEPTH SORTING:
 * The player's depth = their Y position (specifically, the bottom of their sprite).
 * This means:
 * - Walking behind a tree → tree renders on top (tree's Y > player's Y)
 * - Walking in front of a tree → player renders on top (player's Y > tree's Y)
 */

import Phaser from 'phaser';
import { MovementSystem } from '@/systems/MovementSystem';
import { AnimationSystem } from '@/systems/AnimationSystem';
import { PLAYER_CONFIG } from '@config/game.config';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { Direction } from '@/types';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private movementSystem: MovementSystem;
  private animationSystem: AnimationSystem;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create the physics-enabled sprite
    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEYS.PLAYER, 0);

    // Scale 88px sprite to fit 64px tile world (~1 tile wide)
    const displayScale = 0.7;
    this.sprite.setScale(displayScale);

    // Configure physics body (feet-only collision)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 12);
    body.setOffset(33, 72);
    this.sprite.setCollideWorldBounds(true);

    // Initialize systems
    this.movementSystem = new MovementSystem(scene);
    this.animationSystem = new AnimationSystem();
  }

  /** Called every frame from the scene's update() */
  update(): void {
    // Process movement input
    this.movementSystem.update(this.sprite as unknown as {
      body: Phaser.Physics.Arcade.Body;
      setVelocity(x: number, y: number): void;
    });

    // Update animation based on movement state
    this.animationSystem.update(
      this.sprite,
      this.movementSystem.isMoving,
      this.movementSystem.direction,
      'lail' // Character prefix for animation keys
    );

    // Dynamic depth sorting based on Y position (bottom of sprite)
    // Adding BODY_OFFSET_Y ensures depth is calculated from feet, not center
    this.sprite.setDepth(this.sprite.y + PLAYER_CONFIG.BODY_OFFSET_Y);
  }

  /** Get current facing direction */
  get direction(): Direction {
    return this.movementSystem.direction;
  }

  /** Get whether player is currently moving */
  get isMoving(): boolean {
    return this.movementSystem.isMoving;
  }

  /** Disable movement (for dialogue, cutscenes) */
  freeze(): void {
    this.movementSystem.setEnabled(false);
    this.sprite.setVelocity(0, 0);
  }

  /** Re-enable movement */
  unfreeze(): void {
    this.movementSystem.setEnabled(true);
  }

  /** Set joystick input (from mobile controls) */
  setJoystickInput(active: boolean, forceX: number, forceY: number): void {
    this.movementSystem.joystickActive = active;
    this.movementSystem.joystickForceX = forceX;
    this.movementSystem.joystickForceY = forceY;
  }

  /** Get world position */
  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }
}
