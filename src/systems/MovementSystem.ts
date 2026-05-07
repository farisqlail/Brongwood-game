/**
 * MovementSystem - Handles player input and movement logic.
 * 
 * WHY a separate system:
 * 1. Decouples input from the player entity
 * 2. Can be reused for NPCs with AI input
 * 3. Easy to disable during cutscenes/dialogue
 * 4. Testable in isolation
 * 
 * DESIGN: This follows a "System" pattern (inspired by ECS).
 * The system operates on entities that have position + velocity.
 * The entity doesn't know HOW it moves, just that it CAN.
 */

import Phaser from 'phaser';
import { Direction } from '@/types';
import { PLAYER_CONFIG } from '@config/game.config';

export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface MovableEntity {
  body: Phaser.Physics.Arcade.Body;
  setVelocity(x: number, y: number): void;
}

export class MovementSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private enabled: boolean = true;

  /** External joystick force (set by MobileControls) */
  public joystickForceX: number = 0;
  public joystickForceY: number = 0;
  public joystickActive: boolean = false;

  /** Current facing direction (persists when idle) */
  private _direction: Direction = 'down';

  /** Whether the entity is currently moving */
  private _isMoving: boolean = false;

  get direction(): Direction {
    return this._direction;
  }

  get isMoving(): boolean {
    return this._isMoving;
  }

  constructor(scene: Phaser.Scene) {
    if (scene.input.keyboard) {
      // Arrow keys
      this.cursors = scene.input.keyboard.createCursorKeys();

      // WASD keys
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  /** Enable/disable movement (for cutscenes, menus, etc.) */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Read current input state */
  getInput(): MovementInput {
    if (!this.enabled) {
      return { up: false, down: false, left: false, right: false };
    }

    return {
      up: (this.cursors?.up.isDown ?? false) || (this.wasd?.W.isDown ?? false),
      down: (this.cursors?.down.isDown ?? false) || (this.wasd?.S.isDown ?? false),
      left: (this.cursors?.left.isDown ?? false) || (this.wasd?.A.isDown ?? false),
      right: (this.cursors?.right.isDown ?? false) || (this.wasd?.D.isDown ?? false),
    };
  }

  /**
   * Apply movement to an entity based on current input.
   * Returns the current direction for animation purposes.
   * 
   * WHY normalize diagonal movement:
   * Without normalization, moving diagonally would be ~1.41x faster
   * than moving in a cardinal direction (Pythagorean theorem).
   * We normalize the velocity vector to maintain consistent speed.
   */
  update(entity: MovableEntity): void {
    const input = this.getInput();
    let vx = 0;
    let vy = 0;

    // Keyboard input
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    // Joystick input (overrides keyboard if active)
    if (this.joystickActive) {
      vx = this.joystickForceX;
      vy = this.joystickForceY;
    }

    // Normalize diagonal movement (keyboard only — joystick is already normalized)
    if (!this.joystickActive && vx !== 0 && vy !== 0) {
      const normalizer = Math.SQRT1_2;
      vx *= normalizer;
      vy *= normalizer;
    }

    // Apply speed
    const speed = PLAYER_CONFIG.SPEED;
    entity.setVelocity(vx * speed, vy * speed);

    // Update direction (prioritize last pressed for responsiveness)
    this._isMoving = vx !== 0 || vy !== 0;

    if (this._isMoving) {
      // Determine facing direction — prioritize the STRONGER axis
      // This ensures left/right shows properly when joystick is mostly horizontal
      if (Math.abs(vx) > Math.abs(vy)) {
        // Horizontal movement is dominant
        this._direction = vx < 0 ? 'left' : 'right';
      } else {
        // Vertical movement is dominant
        this._direction = vy < 0 ? 'up' : 'down';
      }
    }
  }
}
