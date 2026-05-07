/**
 * HUDSystem - Minimal, atmospheric heads-up display.
 * 
 * WHY MINIMAL UI:
 * Brongwood's UI should be almost invisible. Heavy UI breaks immersion.
 * The player should feel like they're IN the world, not looking at a dashboard.
 * 
 * UI PHILOSOPHY:
 * - Show only what's needed, when it's needed
 * - Fade in/out smoothly (never pop)
 * - Match the game's warm color palette
 * - Use pixel-art-friendly fonts and sizes
 * - Never obstruct the game world
 * 
 * HUD ELEMENTS:
 * 1. Clock (top-right, very subtle, shows time)
 * 2. Phone notification (small dot when unread messages)
 * 3. Activity prompt (bottom-center, "Press E to fish")
 * 4. Notification toast (top-center, fades in/out for events)
 * 
 * All elements use setScrollFactor(0) to stay fixed to camera.
 * All elements are at DEPTH.UI to render above everything.
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { EventBus } from '@/core/EventBus';
import { gameManager } from '@/managers/GameManager';
import { formatTime } from '@config/time.config';

// ============================================================
// CONSTANTS
// ============================================================

const CLOCK_COLOR = '#d4c4a0';
const CLOCK_SHADOW = '#00000066';
const NOTIFICATION_COLOR = '#f2a65a';
const PROMPT_COLOR = '#ffffff';
const TOAST_BG = 0x1a1a2e;
const TOAST_TEXT_COLOR = '#f2a65a';

// ============================================================
// SYSTEM
// ============================================================

export class HUDSystem {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Elements
  private clockText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private phoneIcon!: Phaser.GameObjects.Text;
  private phoneDot!: Phaser.GameObjects.Arc;
  private promptText!: Phaser.GameObjects.Text;
  private toastContainer!: Phaser.GameObjects.Container;
  private toastBg!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;

  // State
  private promptVisible: boolean = false;
  private toastQueue: string[] = [];
  private toastActive: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Update HUD every frame */
  update(): void {
    this.updateClock();
  }

  /** Show an activity/interaction prompt */
  showPrompt(text: string): void {
    if (this.promptVisible && this.promptText.text === text) return;
    this.promptText.setText(text);
    this.promptVisible = true;
    this.promptText.setVisible(true);
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 200,
    });
  }

  /** Hide the prompt */
  hidePrompt(): void {
    if (!this.promptVisible) return;
    this.promptVisible = false;
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 0,
      duration: 200,
      onComplete: () => this.promptText.setVisible(false),
    });
  }

  /** Show a notification toast (queued if one is already showing) */
  showToast(text: string): void {
    this.toastQueue.push(text);
    if (!this.toastActive) {
      this.displayNextToast();
    }
  }

  /** Show/hide phone notification dot */
  setPhoneNotification(hasUnread: boolean): void {
    this.phoneDot.setVisible(hasUnread);
  }

  /** Clean up */
  destroy(): void {
    this.container.destroy();
  }

  // ============================================================
  // PRIVATE: CREATION
  // ============================================================

  private create(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.UI);

    this.createClock();
    this.createPhoneIcon();
    this.createPrompt();
    this.createToast();
  }

  private createClock(): void {
    // Day indicator (top-right)
    this.dayText = this.scene.add.text(
      GAME_CONFIG.WIDTH - 6, 4,
      'Day 1',
      {
        fontSize: '7px',
        color: CLOCK_COLOR,
        fontFamily: 'monospace',
      }
    );
    this.dayText.setOrigin(1, 0);
    this.dayText.setAlpha(0.7);
    this.container.add(this.dayText);

    // Clock (below day)
    this.clockText = this.scene.add.text(
      GAME_CONFIG.WIDTH - 6, 13,
      '08:00',
      {
        fontSize: '8px',
        color: CLOCK_COLOR,
        fontFamily: 'monospace',
      }
    );
    this.clockText.setOrigin(1, 0);
    this.clockText.setAlpha(0.8);
    this.container.add(this.clockText);
  }

  private createPhoneIcon(): void {
    // Phone icon (top-left area)
    this.phoneIcon = this.scene.add.text(6, 4, '[P]', {
      fontSize: '7px',
      color: CLOCK_COLOR,
      fontFamily: 'monospace',
    });
    this.phoneIcon.setAlpha(0.6);
    this.container.add(this.phoneIcon);

    // Notification dot
    this.phoneDot = this.scene.add.circle(22, 5, 2, 0xf25a5a);
    this.phoneDot.setVisible(false);
    this.container.add(this.phoneDot);

    // Pulse animation for notification
    this.scene.tweens.add({
      targets: this.phoneDot,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private createPrompt(): void {
    this.promptText = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT - 20,
      '',
      {
        fontSize: '8px',
        color: PROMPT_COLOR,
        fontFamily: 'monospace',
        backgroundColor: '#00000088',
        padding: { x: 6, y: 3 },
      }
    );
    this.promptText.setOrigin(0.5);
    this.promptText.setAlpha(0);
    this.promptText.setVisible(false);
    this.container.add(this.promptText);
  }

  private createToast(): void {
    this.toastContainer = this.scene.add.container(GAME_CONFIG.WIDTH / 2, -30);
    this.container.add(this.toastContainer);

    this.toastBg = this.scene.add.rectangle(0, 0, 200, 20, TOAST_BG, 0.9);
    this.toastBg.setStrokeStyle(1, 0xf2a65a, 0.4);
    this.toastContainer.add(this.toastBg);

    this.toastText = this.scene.add.text(0, 0, '', {
      fontSize: '7px',
      color: TOAST_TEXT_COLOR,
      fontFamily: 'monospace',
    });
    this.toastText.setOrigin(0.5);
    this.toastContainer.add(this.toastText);
  }

  // ============================================================
  // PRIVATE: UPDATES
  // ============================================================

  private updateClock(): void {
    const time = gameManager.time;
    this.clockText.setText(formatTime(time.hour, time.minute));
    this.dayText.setText(`Day ${time.day}`);
  }

  private displayNextToast(): void {
    if (this.toastQueue.length === 0) {
      this.toastActive = false;
      return;
    }

    this.toastActive = true;
    const text = this.toastQueue.shift()!;
    this.toastText.setText(text);

    // Resize background to fit text
    this.toastBg.setSize(this.toastText.width + 16, 20);

    // Animate in
    this.scene.tweens.add({
      targets: this.toastContainer,
      y: 16,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for 2.5 seconds, then animate out
        this.scene.time.delayedCall(2500, () => {
          this.scene.tweens.add({
            targets: this.toastContainer,
            y: -30,
            duration: 300,
            ease: 'Cubic.easeIn',
            onComplete: () => this.displayNextToast(),
          });
        });
      },
    });
  }
}
