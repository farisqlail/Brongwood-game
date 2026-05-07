/**
 * NPC Entity - A non-player character that can be interacted with.
 * 
 * Features:
 * - Displays sprite with idle/walk animations
 * - Has an interaction zone (player must be nearby to talk)
 * - Shows "Press E to talk" prompt when player is in range
 * - Triggers dialogue when interacted with
 * - Supports Y-depth sorting (natural overlap)
 */

import Phaser from 'phaser';
import { AnimationSystem } from '@/systems/AnimationSystem';
import { DEPTH } from '@config/game.config';
import { Direction } from '@/types';

export interface NPCConfig {
  id: string;
  textureKey: string;
  x: number;
  y: number;
  scale?: number;
  direction?: Direction;
  interactionRadius?: number;
}

export class NPC {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public readonly id: string;

  private animationSystem: AnimationSystem;
  private _direction: Direction;
  private interactionZone: Phaser.GameObjects.Zone;
  private _playerInRange: boolean = false;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    this.id = config.id;
    this._direction = config.direction ?? 'down';

    // Create sprite
    this.sprite = scene.physics.add.sprite(config.x, config.y, config.textureKey, 0);
    this.sprite.setScale(config.scale ?? 0.7);
    this.sprite.setImmovable(true);

    // Physics body (so player can't walk through)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 12);
    body.setOffset(35, 76); // Rika is 92x92
    body.setImmovable(true);

    // Depth sorting
    this.sprite.setDepth(config.y + 76);

    // Animation system
    this.animationSystem = new AnimationSystem();

    // Create interaction zone (larger than collision body)
    const radius = config.interactionRadius ?? 50;
    this.interactionZone = scene.add.zone(config.x, config.y, radius * 2, radius * 2);
    scene.physics.add.existing(this.interactionZone, true);

    // Play idle animation
    this.animationSystem.update(this.sprite, false, this._direction, config.id);
  }

  /** Get the interaction zone for overlap detection */
  get zone(): Phaser.GameObjects.Zone {
    return this.interactionZone;
  }

  /** Whether the player is currently in interaction range */
  get playerInRange(): boolean {
    return this._playerInRange;
  }

  set playerInRange(value: boolean) {
    this._playerInRange = value;
  }

  get direction(): Direction {
    return this._direction;
  }

  /** Face toward a position (e.g., face the player) */
  faceToward(targetX: number, targetY: number): void {
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this._direction = dx > 0 ? 'right' : 'left';
    } else {
      this._direction = dy > 0 ? 'down' : 'up';
    }

    this.animationSystem.update(this.sprite, false, this._direction, this.id);
  }

  // Wander state
  private wanderTimer: number = 0;
  private wanderDuration: number = 0;
  private wanderVx: number = 0;
  private wanderVy: number = 0;
  private idleDuration: number = 2000;
  private isWandering: boolean = false;
  private originX: number = 0;
  private originY: number = 0;
  private wanderRadius: number = 40;
  private _frozen: boolean = false;

  /** Enable natural wandering behavior */
  enableWander(radius: number = 40): void {
    this.originX = this.sprite.x;
    this.originY = this.sprite.y;
    this.wanderRadius = radius;
    this.idleDuration = 1500 + Math.random() * 2000;
  }

  /** Freeze NPC (stop moving, stay idle) — used during dialogue */
  freeze(): void {
    this._frozen = true;
    this.sprite.setVelocity(0, 0);
    this.isWandering = false;
  }

  /** Unfreeze NPC (resume wandering) */
  unfreeze(): void {
    this._frozen = false;
    this.wanderTimer = 0;
    this.idleDuration = 1500 + Math.random() * 2000;
  }

  /** Update (call every frame with delta in ms) */
  update(delta?: number): void {
    if (!delta) delta = 16;

    // If frozen (during dialogue), just play idle animation
    if (this._frozen) {
      this.sprite.setVelocity(0, 0);
      this.animationSystem.update(this.sprite, false, this._direction, this.id);
      this.sprite.setDepth(this.sprite.y + 10);
      return;
    }

    this.wanderTimer += delta;

    if (this.isWandering) {
      // Move
      this.sprite.setVelocity(this.wanderVx, this.wanderVy);

      // Check if wander time is up
      if (this.wanderTimer >= this.wanderDuration) {
        this.stopWander();
      }

      // Check if too far from origin
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y, this.originX, this.originY
      );
      if (dist > this.wanderRadius) {
        this.stopWander();
      }

      // Update animation (walking)
      this.animationSystem.update(this.sprite, true, this._direction, this.id);
    } else {
      // Idle — wait then start wandering
      if (this.wanderTimer >= this.idleDuration && this.originX !== 0) {
        this.startWander();
      }
      this.animationSystem.update(this.sprite, false, this._direction, this.id);
    }

    // Depth sort
    this.sprite.setDepth(this.sprite.y + 10);
  }

  private startWander(): void {
    this.isWandering = true;
    this.wanderTimer = 0;
    this.wanderDuration = 800 + Math.random() * 1500;

    // Pick random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 10;
    this.wanderVx = Math.cos(angle) * speed;
    this.wanderVy = Math.sin(angle) * speed;

    // Update facing direction
    if (Math.abs(this.wanderVx) > Math.abs(this.wanderVy)) {
      this._direction = this.wanderVx > 0 ? 'right' : 'left';
    } else {
      this._direction = this.wanderVy > 0 ? 'down' : 'up';
    }
  }

  private stopWander(): void {
    this.isWandering = false;
    this.wanderTimer = 0;
    this.idleDuration = 2000 + Math.random() * 3000;
    this.sprite.setVelocity(0, 0);
  }

  destroy(): void {
    this.sprite.destroy();
    this.interactionZone.destroy();
  }
}
