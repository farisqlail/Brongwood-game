/**
 * PlayerHouseScene - Interior rumah main character.
 *
 *   ┌──[TEMBOK]──[TEMBOK]──[TEMBOK]──────────────────────────┐  y: 0–84
 *   ├─────────────────────────────────────────────────────────┤
 *   │                                                         │
 *   │   [BUFFET]  [LEMARI_BUKU]                  [KASUR]     │
 *   │                                                         │
 *   │                                                         │
 *   │                    [ EXIT ]                             │
 *   └─────────────────────────────────────────────────────────┘
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { AUDIO_KEYS } from '@config/assets.manifest';
import { Player } from '@/entities/Player';
import { gameManager } from '@/managers/GameManager';
import { MobileControls } from '@/ui/MobileControls';
import { SceneHUD } from '@/ui/SceneHUD';
import { SceneAtmosphere } from '@/systems/SceneAtmosphere';
import { AudioSystem } from '@/systems/AudioSystem';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { FirstDayObjectiveUI } from '@/ui/FirstDayObjectiveUI';
import { FIRST_DAY_OBJECTIVES } from '@config/firstDay.config';

const ROOM_W = 480;
const ROOM_H = 384;

// 3 tile tembok mengisi 480px → scale = 480/(3×138)
const WALL_SCALE  = 480 / (3 * 138);   // ≈ 1.159
const WALL_H      = Math.round(72 * WALL_SCALE); // ≈ 84px
const WALL_TILE_W = ROOM_W / 3;         // 160px per tile

// Lantai mulai tepat di bawah tembok
const WALL_BOTTOM_Y = WALL_H;           // ≈ 84

// Skala furnitur
const KASUR_SCALE  = 1.4;  // asli 48×81 → 67×113
const LEMARI_SCALE = 1.2;  // asli 48×69 → 58×83
const BUFFET_SCALE = 1.5;  // asli 72×35 → 108×53

// Gap pintu (tengah bawah)
const DOOR_GAP_X1 = 192;
const DOOR_GAP_X2 = 288;

export class PlayerHouseScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private hud!: SceneHUD;
  private pauseMenu!: PauseMenuUI;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private objectiveUI!: FirstDayObjectiveUI;
  private exiting = false;
  private nearBed = false;
  private returnScene = 'WorldScene';

  constructor() {
    super({ key: 'PlayerHouseScene' });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = data?.returnScene ?? this.getDefaultReturnScene();
  }

  create(): void {
    this.exiting = false;
    this.nearBed  = false;
    this.sound.stopByKey(AUDIO_KEYS.BGM_SCENE_1_6);

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildFloor();
    this.buildBackWall();
    this.buildFurniture();

    this.player = new Player(this, ROOM_W / 2, ROOM_H - 48);
    this.player.sprite.setCollideWorldBounds(false);

    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.centerOn(ROOM_W / 2, ROOM_H / 2);

    this.createColliders();

    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => this.handleInteract());

    this.promptText = this.add
      .text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 40, '', {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#00000099',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 15)
      .setVisible(false);

    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'player_house', ROOM_W, ROOM_H);
    this.atmosphere = new SceneAtmosphere(this, { weather: false, lighting: 'flower_shop' });
    this.objectiveUI = new FirstDayObjectiveUI(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);
    proceduralAudio.stopRain();

    if (gameManager.firstDayStage === 'wake_up') {
      gameManager.advanceFirstDay('wake_up');
    }

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake',     this.onWake,     this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.hud.update(this.player.sprite.x, this.player.sprite.y, this.atmosphere.weatherState);
    this.objectiveUI.update();
    if (this.pauseMenu.opened) return;

    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleInteract();
    }

    this.player.update();
    this.checkBedProximity();

    if (!this.exiting && this.player.sprite.y > ROOM_H - 14) {
      this.doExit();
    }
  }

  // ============================================================
  // ROOM BUILDING
  // ============================================================

  /** Lantai kayu penuh satu ruangan */
  private buildFloor(): void {
    this.add
      .rectangle(0, WALL_BOTTOM_Y, ROOM_W, ROOM_H - WALL_BOTTOM_Y, 0x7a5530)
      .setOrigin(0, 0)
      .setDepth(DEPTH.GROUND - 1);

    // Garis papan lantai
    for (let y = WALL_BOTTOM_Y; y < ROOM_H; y += 28) {
      this.add
        .rectangle(0, y, ROOM_W, 1, 0x3d2610)
        .setOrigin(0, 0)
        .setDepth(DEPTH.GROUND)
        .setAlpha(0.22);
    }
  }

  /**
   * Tembok belakang — 3 tile tembok_kayu_1 mengisi penuh lebar ruangan.
   * Ditempatkan di paling atas (y=0) sebagai batas belakang ruangan.
   */
  private buildBackWall(): void {
    for (let i = 0; i < 3; i++) {
      const img = this.add.image(
        WALL_TILE_W * i + WALL_TILE_W / 2,
        WALL_H / 2,
        'house2-tembok-kayu',
      );
      img.setScale(WALL_SCALE).setDepth(DEPTH.GROUND + 1);
    }
  }

  /**
   * Furnitur:
   *  kasur  (1.4×): 67×113 → pojok kanan-atas
   *  lemari (1.2×): 58×83  → pojok kiri-atas (menempel tembok kiri)
   *  buffet (1.5×): 108×53 → kanan lemari, masih di area kiri-atas
   */
  private buildFurniture(): void {
    const top = WALL_BOTTOM_Y;

    // Kasur — pojok kanan-atas
    const kasurW = 48 * KASUR_SCALE;   // 67.2
    const kasurH = 81 * KASUR_SCALE;   // 113.4
    const kasurX = ROOM_W - kasurW / 2;
    const kasurY = top + kasurH / 2;
    this.placeObj(kasurX, kasurY, 'house2-kasur', DEPTH.ENTITIES, KASUR_SCALE);

    // Lemari buku — pojok kiri-atas (menempel tembok kiri)
    const lemariW = 48 * LEMARI_SCALE;  // 57.6
    const lemariH = 69 * LEMARI_SCALE;  // 82.8
    const lemariX = lemariW / 2;
    const lemariY = top + lemariH / 2;
    this.placeObj(lemariX, lemariY, 'house2-lemari-buku', DEPTH.ENTITIES, LEMARI_SCALE);

    // Buffet — kanan lemari, masih di kiri-atas
    const buffetW = 72 * BUFFET_SCALE;  // 108
    const buffetH = 35 * BUFFET_SCALE;  // 52.5
    const buffetX = lemariW + buffetW / 2;
    const buffetY = top + buffetH / 2;
    this.placeObj(buffetX, buffetY, 'house2-buffet', DEPTH.ENTITIES, BUFFET_SCALE);
  }

  // ============================================================
  // COLLIDERS
  // ============================================================

  private createColliders(): void {
    const thick = 6;
    const top = WALL_BOTTOM_Y;

    const wallTop = this.physics.add.staticBody(0, top, ROOM_W, thick);
    const lft     = this.physics.add.staticBody(-thick, 0, thick, ROOM_H);
    const rgt     = this.physics.add.staticBody(ROOM_W, 0, thick, ROOM_H);
    const botL    = this.physics.add.staticBody(0, ROOM_H, DOOR_GAP_X1, thick);
    const botR    = this.physics.add.staticBody(DOOR_GAP_X2, ROOM_H, ROOM_W - DOOR_GAP_X2, thick);

    for (const b of [wallTop, lft, rgt, botL, botR]) {
      this.physics.add.collider(this.player.sprite, b as unknown as Phaser.Physics.Arcade.StaticBody);
    }

    // Kasur (1.4×): 67×113 — pojok kanan-atas
    const kasurW = Math.round(48 * KASUR_SCALE);
    const kasurH = Math.round(81 * KASUR_SCALE);
    this.addBox(ROOM_W - kasurW, top, kasurW, kasurH);

    // Lemari (1.2×): 58×83 — pojok kiri-atas
    const lemariW = Math.round(48 * LEMARI_SCALE);
    const lemariH = Math.round(69 * LEMARI_SCALE);
    this.addBox(0, top, lemariW, lemariH);

    // Buffet (1.5×): 108×53 — kanan lemari
    const buffetW = Math.round(72 * BUFFET_SCALE);
    const buffetH = Math.round(35 * BUFFET_SCALE);
    this.addBox(lemariW, top, buffetW, buffetH);
  }

  private addBox(x: number, y: number, w: number, h: number): void {
    const body = this.physics.add.staticBody(x, y, w, h);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  // ============================================================
  // INTERAKSI KASUR
  // ============================================================

  private handleInteract(): void {
    if (this.nearBed) this.sleepInBed();
  }

  private checkBedProximity(): void {
    const kasurX = ROOM_W - (48 * KASUR_SCALE) / 2;
    const kasurY = WALL_BOTTOM_Y + (81 * KASUR_SCALE) / 2;
    const dist   = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      kasurX, kasurY,
    );
    if (dist < 80) {
      this.nearBed = true;
      this.promptText.setText('[E] Tidur').setVisible(true);
    } else {
      this.nearBed = false;
      this.promptText.setVisible(false);
    }
  }

  private sleepInBed(): void {
    if (gameManager.isFirstDayActive() && gameManager.firstDayStage !== 'sleep') {
      this.showHint(FIRST_DAY_OBJECTIVES[gameManager.firstDayStage]);
      return;
    }

    this.player.freeze();
    this.promptText.setVisible(false);

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      gameManager.time.advanceTo(7, 0);
      if (gameManager.firstDayStage === 'sleep') {
        gameManager.advanceFirstDay('sleep');
      }
      this.cameras.main.fadeIn(1500, 0, 0, 0);

      const dayText = this.add
        .text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2, `Hari ${gameManager.time.day}`, {
          fontSize: '12px', color: '#f2a65a', fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH.UI + 50)
        .setAlpha(0);

      this.tweens.add({
        targets: dayText,
        alpha: 1,
        duration: 800,
        hold: 2000,
        yoyo: true,
        onComplete: () => { dayText.destroy(); this.player.unfreeze(); },
      });
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private placeObj(x: number, y: number, key: string, depth: number, scale: number): void {
    this.add.image(x, y, key).setScale(scale).setDepth(depth);
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

  private doExit(): void {
    this.exiting = true;
    if (gameManager.firstDayStage === 'leave_house') {
      gameManager.advanceFirstDay('leave_house');
    }
    this.player.freeze();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      if (this.scene.isSleeping(this.returnScene)) {
        this.scene.wake(this.returnScene);
      } else {
        this.scene.start(this.returnScene);
      }
    });
  }

  private onWake(): void {
    this.exiting = false;
    this.player.unfreeze();
    proceduralAudio.stopRain();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    this.mobileControls.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.objectiveUI.destroy();
    this.atmosphere.destroy();
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }

  private showHint(message: string): void {
    const label = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 24, message, {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000bb',
      padding: { x: 6, y: 4 },
      align: 'center',
      wordWrap: { width: 220 },
    });
    label.setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 40);
    this.tweens.add({
      targets: label,
      alpha: 0,
      y: label.y - 12,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private getDefaultReturnScene(): string {
    return gameManager.time.day === 1 && gameManager.isFirstDayActive()
      ? 'HomesteadScene'
      : 'WorldScene';
  }
}
