/**
 * ActivityZoneUI — Visual feedback for activity zones and active activities.
 *
 * RESPONSIBILITIES:
 * - Show "[E] Fish by the ocean" prompt when player enters a zone
 * - Display activity progress (timer bar) while active
 * - Show outcome text when activity completes
 * - Manage the visual state machine for activities
 *
 * DESIGN:
 * - Minimal, atmospheric — doesn't break immersion
 * - Progress shown as a subtle bar that fills
 * - Outcome text fades in/out gently
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { ActivitySystem, ActivityId, ACTIVITY_CONFIGS } from '@/systems/ActivitySystem';
import { InputGuard } from '@/ui/InputGuard';

// ─── Layout ────────────────────────────────────────────────────
const PROMPT_Y = GAME_CONFIG.HEIGHT - 55;
const PROGRESS_W = 100;
const PROGRESS_H = 6;
const PROGRESS_Y = GAME_CONFIG.HEIGHT / 2 + 40;
const OUTCOME_Y = GAME_CONFIG.HEIGHT / 2 - 10;

// ─── Colors ────────────────────────────────────────────────────
const CLR_PROGRESS_BG = 0x1a1a2e;
const CLR_PROGRESS_FILL = 0xf2a65a;
const CLR_OUTCOME_TEXT = '#f2a65a';

const UI_DEPTH = DEPTH.UI + 15;

export interface ActivityZoneConfig {
  id: ActivityId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ActivityZoneUI {
  private scene: Phaser.Scene;
  private activitySystem: ActivitySystem;

  // Prompt
  private promptText!: Phaser.GameObjects.Text;
  private promptVisible: boolean = false;

  // Progress bar
  private progressBg!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressVisible: boolean = false;

  // Outcome display
  private outcomeText!: Phaser.GameObjects.Text;

  // Zone tracking
  private zones: Phaser.GameObjects.Zone[] = [];
  private activeZoneId: ActivityId | null = null;
  private playerInZone: boolean = false;

  constructor(scene: Phaser.Scene, activitySystem: ActivitySystem) {
    this.scene = scene;
    this.activitySystem = activitySystem;
    this.buildUI();
    this.setupEventListeners();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Create activity zones in the world */
  createZones(player: Phaser.Physics.Arcade.Sprite, zoneConfigs: ActivityZoneConfig[]): void {
    for (const config of zoneConfigs) {
      const zone = this.scene.add.zone(
        config.x + config.width / 2,
        config.y + config.height / 2,
        config.width,
        config.height
      );
      this.scene.physics.add.existing(zone, true);

      // Store activity ID on the zone
      (zone as unknown as { activityId: ActivityId }).activityId = config.id;

      // Overlap detection
      this.scene.physics.add.overlap(
        player, zone,
        () => this.onPlayerEnterZone(config.id),
        undefined, this
      );

      this.zones.push(zone);
    }
  }

  /** Call every frame */
  update(delta: number): void {
    const current = this.activitySystem.current;

    if (current && current.state === 'active') {
      // Show and update progress bar
      this.showProgress(current.elapsed, current.config.durationMinutes * 1000);
    } else if (this.progressVisible) {
      this.hideProgress();
    }

    // Check if player left all zones
    if (this.playerInZone && !current) {
      // Will be reset by overlap callback each frame
      // If no overlap fires this frame, player left
      this.scene.time.delayedCall(100, () => {
        if (!this.playerInZone) {
          this.hidePrompt();
          this.activeZoneId = null;
        }
      });
    }
    this.playerInZone = false;
  }

  /** Start the activity for the current zone */
  startActivity(): boolean {
    if (!this.activeZoneId) return false;
    if (this.activitySystem.current) return false;

    this.activitySystem.start(this.activeZoneId);
    this.hidePrompt();
    return true;
  }

  /** Cancel current activity */
  cancelActivity(): void {
    this.activitySystem.cancel();
  }

  /** Check if player is in any activity zone */
  get isInZone(): boolean {
    return this.activeZoneId !== null;
  }

  /** Check if an activity is currently running */
  get isActivityActive(): boolean {
    return this.activitySystem.current !== null && this.activitySystem.current.state === 'active';
  }

  destroy(): void {
    this.promptText.destroy();
    this.progressBg.destroy();
    this.progressFill.destroy();
    this.outcomeText.destroy();
    for (const zone of this.zones) zone.destroy();
    EventBus.off('activity:completed', this.onActivityCompleted);
    EventBus.off('activity:cancelled', this.onActivityCancelled);
  }

  // ============================================================
  // PRIVATE: BUILD UI
  // ============================================================

  private buildUI(): void {
    // Activity prompt (reuses same position as NPC prompt)
    this.promptText = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, PROMPT_Y,
      '',
      {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#00000099',
        padding: { x: 8, y: 4 },
      }
    );
    this.promptText.setOrigin(0.5);
    this.promptText.setScrollFactor(0);
    this.promptText.setDepth(UI_DEPTH);
    this.promptText.setVisible(false);

    // Progress bar background
    this.progressBg = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2, PROGRESS_Y,
      PROGRESS_W, PROGRESS_H,
      CLR_PROGRESS_BG, 0.8
    );
    this.progressBg.setScrollFactor(0);
    this.progressBg.setDepth(UI_DEPTH);
    this.progressBg.setVisible(false);

    // Progress bar fill
    this.progressFill = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2 - PROGRESS_W / 2, PROGRESS_Y,
      0, PROGRESS_H,
      CLR_PROGRESS_FILL, 0.9
    );
    this.progressFill.setOrigin(0, 0.5);
    this.progressFill.setScrollFactor(0);
    this.progressFill.setDepth(UI_DEPTH + 1);
    this.progressFill.setVisible(false);

    // Outcome text
    this.outcomeText = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, OUTCOME_Y,
      '',
      {
        fontSize: '7px',
        color: CLR_OUTCOME_TEXT,
        fontFamily: 'monospace',
        backgroundColor: '#00000099',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 200 },
        align: 'center',
      }
    );
    this.outcomeText.setOrigin(0.5);
    this.outcomeText.setScrollFactor(0);
    this.outcomeText.setDepth(UI_DEPTH + 2);
    this.outcomeText.setVisible(false);
  }

  // ============================================================
  // PRIVATE: EVENT HANDLERS
  // ============================================================

  private setupEventListeners(): void {
    EventBus.on('activity:completed', this.onActivityCompleted, this);
    EventBus.on('activity:cancelled', this.onActivityCancelled, this);
  }

  private onActivityCompleted = (payload: { activityId: string; outcomeId?: string }): void => {
    // current is still set when this event fires (before end() clears it)
    const current = this.activitySystem.current;
    if (current?.outcome) {
      this.showOutcome(current.outcome.text);
    } else {
      // Fallback based on activity type
      const config = ACTIVITY_CONFIGS[payload.activityId as ActivityId];
      this.showOutcome(config ? `${config.name} complete.` : 'A peaceful moment.');
    }
    this.hideProgress();
  };

  private onActivityCancelled = (): void => {
    this.hideProgress();
  };

  // ============================================================
  // PRIVATE: ZONE LOGIC
  // ============================================================

  private onPlayerEnterZone(activityId: ActivityId): void {
    this.playerInZone = true;

    // Don't show prompt if activity is running
    if (this.activitySystem.current) return;

    if (this.activeZoneId !== activityId) {
      this.activeZoneId = activityId;
      const config = ACTIVITY_CONFIGS[activityId];
      this.showPrompt(`[E] ${config.promptText}`);
    }
  }

  // ============================================================
  // PRIVATE: UI UPDATES
  // ============================================================

  private showPrompt(text: string): void {
    this.promptText.setText(text);
    this.promptText.setVisible(true);
    this.promptText.setAlpha(0);
    this.promptVisible = true;
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 200,
    });
  }

  private hidePrompt(): void {
    if (!this.promptVisible) return;
    this.promptVisible = false;
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 0,
      duration: 200,
      onComplete: () => this.promptText.setVisible(false),
    });
  }

  private showProgress(elapsed: number, total: number): void {
    if (!this.progressVisible) {
      this.progressBg.setVisible(true);
      this.progressFill.setVisible(true);
      this.progressVisible = true;
    }

    const ratio = Math.min(elapsed / total, 1);
    this.progressFill.width = PROGRESS_W * ratio;
  }

  private hideProgress(): void {
    this.progressVisible = false;
    this.progressBg.setVisible(false);
    this.progressFill.setVisible(false);
    this.progressFill.width = 0;
  }

  private showOutcome(text: string): void {
    this.outcomeText.setText(text);
    this.outcomeText.setVisible(true);
    this.outcomeText.setAlpha(0);

    this.scene.tweens.add({
      targets: this.outcomeText,
      alpha: 1,
      duration: 500,
      hold: 3000,
      yoyo: true,
      onComplete: () => this.outcomeText.setVisible(false),
    });
  }
}
