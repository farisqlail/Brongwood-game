/**
 * MobileControls - Virtual joystick + action button for touch devices.
 * 
 * Layout:
 * - Left side: Analog joystick (drag to move)
 * - Right side: Action button (tap to interact/talk)
 * 
 * Only visible on touch devices (hidden on desktop).
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { InputGuard } from '@/ui/InputGuard';

export interface JoystickState {
  isActive: boolean;
  forceX: number; // -1 to 1
  forceY: number; // -1 to 1
}

export class MobileControls {
  private scene: Phaser.Scene;

  // Joystick
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private baseX: number = 0;
  private baseY: number = 0;
  private thumbRadius: number = 12;
  private baseRadius: number = 30;

  // Action button
  private actionBtn!: Phaser.GameObjects.Arc;
  private actionBtnText!: Phaser.GameObjects.Text;
  private _actionPressed: boolean = false;

  // State
  private _joystickState: JoystickState = { isActive: false, forceX: 0, forceY: 0 };
  private _visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Only show on touch devices
    if (this.isTouchDevice()) {
      this.create();
      this._visible = true;
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  get joystickState(): JoystickState { return this._joystickState; }
  get actionPressed(): boolean {
    const pressed = this._actionPressed;
    this._actionPressed = false; // consume
    return pressed;
  }
  get visible(): boolean { return this._visible; }

  /** Show or hide the controls (e.g. during dialogue). No-op on non-touch devices. */
  setGameVisible(visible: boolean): void {
    if (!this._visible) return;
    this.joystickBase.setVisible(visible);
    this.joystickThumb.setVisible(visible);
    this.actionBtn.setVisible(visible);
    this.actionBtnText.setVisible(visible);
  }

  destroy(): void {
    if (!this._visible) return;
    this.joystickBase?.destroy();
    this.joystickThumb?.destroy();
    this.actionBtn?.destroy();
    this.actionBtnText?.destroy();
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private create(): void {
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // --- JOYSTICK (left side) ---
    this.baseX = 50;
    this.baseY = h - 50;

    // Base circle (outer ring)
    this.joystickBase = this.scene.add.circle(this.baseX, this.baseY, this.baseRadius, 0x000000, 0.3);
    this.joystickBase.setStrokeStyle(2, 0xffffff, 0.4);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(DEPTH.UI + 50);

    // Thumb (inner draggable circle)
    this.joystickThumb = this.scene.add.circle(this.baseX, this.baseY, this.thumbRadius, 0xffffff, 0.5);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(DEPTH.UI + 51);

    // --- ACTION BUTTON (right side) ---
    const btnX = w - 45;
    const btnY = h - 45;

    this.actionBtn = this.scene.add.circle(btnX, btnY, 18, 0xf2a65a, 0.6);
    this.actionBtn.setStrokeStyle(2, 0xffffff, 0.5);
    this.actionBtn.setScrollFactor(0);
    this.actionBtn.setDepth(DEPTH.UI + 50);

    this.actionBtnText = this.scene.add.text(btnX, btnY, 'E', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.actionBtnText.setOrigin(0.5);
    this.actionBtnText.setScrollFactor(0);
    this.actionBtnText.setDepth(DEPTH.UI + 52);

    // --- INPUT HANDLING ---
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // If a UI element already consumed this pointer event, ignore it
    if (InputGuard.check()) return;

    const x = pointer.x;
    const y = pointer.y;

    // Check if touching joystick area (left half of screen)
    if (x < GAME_CONFIG.WIDTH / 2) {
      this.joystickPointer = pointer;
      this._joystickState.isActive = true;
      this.updateJoystick(pointer);
    }

    // Check if touching action button area (right side, bottom)
    const btnX = GAME_CONFIG.WIDTH - 45;
    const btnY = GAME_CONFIG.HEIGHT - 45;
    const dist = Phaser.Math.Distance.Between(x, y, btnX, btnY);
    if (dist < 25) {
      this._actionPressed = true;
      // Visual feedback
      this.actionBtn.setScale(0.85);
      this.scene.time.delayedCall(100, () => {
        this.actionBtn?.setScale(1);
      });
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
      this.updateJoystick(pointer);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
      this.joystickPointer = null;
      this._joystickState = { isActive: false, forceX: 0, forceY: 0 };
      // Reset thumb position
      this.joystickThumb.setPosition(this.baseX, this.baseY);
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.baseRadius;

    // Clamp to base radius
    let thumbX: number;
    let thumbY: number;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      thumbX = this.baseX + Math.cos(angle) * maxDist;
      thumbY = this.baseY + Math.sin(angle) * maxDist;
    } else {
      thumbX = pointer.x;
      thumbY = pointer.y;
    }

    this.joystickThumb.setPosition(thumbX, thumbY);

    // Normalize force (-1 to 1)
    const clampedDist = Math.min(dist, maxDist);
    const normalizedDist = clampedDist / maxDist;
    const angle = Math.atan2(dy, dx);

    this._joystickState.forceX = Math.cos(angle) * normalizedDist;
    this._joystickState.forceY = Math.sin(angle) * normalizedDist;
    this._joystickState.isActive = normalizedDist > 0.15; // Dead zone
  }
}
