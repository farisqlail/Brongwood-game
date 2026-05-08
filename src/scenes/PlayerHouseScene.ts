/**
 * PlayerHouseScene - Main character's cozy home interior.
 *
 * Built using individual tiles from Kenney Roguelike Indoors:
 * - part 1: walls, bed, floor, chairs, bucket
 * - part 2: table, buffet, kitchen set, cabinets
 *
 * LAYOUT (10x8 grid, each cell = 16px * 3 scale = 48px):
 *
 *   ┌─────────────────────────────────────────┐
 *   │ WALL WALL WALL WALL WALL WALL WALL WALL │  row 0
 *   │ WALL WALL WALL WALL WALL WALL WALL WALL │  row 1
 *   │ [BED-L][BED-R]    [KITCHEN1 L M R]      │  row 2
 *   │ [CHAIR-V]         [KITCHEN2 L M R]      │  row 3
 *   │ [BUCKET]  [TABLE L M R]  [BUFFET]       │  row 4
 *   │           [CHAIR-HL][CHAIR-HR]           │  row 5
 *   │ [CABINET-S][CABINET L1 L2]              │  row 6
 *   │              [DOOR EXIT]                 │  row 7
 *   └─────────────────────────────────────────┘
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { Player } from '@/entities/Player';
import { gameManager } from '@/managers/GameManager';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';

// ─── Room dimensions ──────────────────────────────────────────
const TILE = 16;
const SCALE = 3;
const ROOM_COLS = 10;
const ROOM_ROWS = 8;
const ROOM_W = ROOM_COLS * TILE * SCALE; // 480
const ROOM_H = ROOM_ROWS * TILE * SCALE; // 384
const TS = TILE * SCALE; // 48 — one grid cell

export class PlayerHouseScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private promptText!: Phaser.GameObjects.Text;
  private exiting: boolean = false;
  private nearBed: boolean = false;

  constructor() {
    super({ key: 'PlayerHouseScene' });
  }

  create(): void {
    this.exiting = false;
    this.nearBed = false;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Build the room
    this.buildFloor();
    this.buildWalls();
    this.buildFurniture();

    // Player spawns near the door (bottom center)
    this.player = new Player(this, ROOM_W / 2, ROOM_H - TS * 1.2);
    this.player.sprite.setCollideWorldBounds(false);

    // Camera
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.centerOn(ROOM_W / 2, ROOM_H / 2);

    // Wall colliders
    this.createColliders();

    // Interaction (E key)
    const interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    interactKey.on('down', () => this.handleInteract());

    // Prompt text
    this.promptText = this.add.text(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 40,
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
    this.promptText.setDepth(DEPTH.UI + 15);
    this.promptText.setVisible(false);

    // Mobile controls
    this.mobileControls = new MobileControls(this);

    // Exit label
    const exitLabel = this.add.text(ROOM_W / 2, ROOM_H - 12, '[ EXIT - walk down ]', {
      fontSize: '7px', color: '#f2a65a', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.UI);
    this.tweens.add({ targets: exitLabel, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Scene lifecycle
    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake', this.onWake, this);
  }

  update(_time: number, delta: number): void {
    // Mobile joystick
    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) {
        this.handleInteract();
      }
    }

    this.player.update();
    this.checkBedProximity();

    // Exit: player walks past bottom edge
    if (!this.exiting && this.player.sprite.y > ROOM_H - TS * 0.3) {
      this.doExit();
    }
  }

  // ============================================================
  // ROOM BUILDING
  // ============================================================

  /** Floor tiles covering the entire room — no walls, tiles placed flush (no gap) */
  private buildFloor(): void {
    for (let row = 0; row < ROOM_ROWS; row++) {
      for (let col = 0; col < ROOM_COLS; col++) {
        this.placeImage(col, row, 'house-floor-main', DEPTH.GROUND);
      }
    }
  }

  /** No walls — open room */
  private buildWalls(): void {
    // No walls rendered — room is open
  }

  /** Place all furniture objects */
  private buildFurniture(): void {
    // ─── Bed (top-left, row 2, cols 1-2) — horizontal ───
    this.placeImage(1, 2, 'house-bed-l', DEPTH.ENTITIES);
    this.placeImage(2, 2, 'house-bed-r', DEPTH.ENTITIES);

    // ─── Chair vertical (below bed, row 3, col 1) ───
    this.placeImage(1, 3, 'house-chair-v', DEPTH.ENTITIES);

    // ─── Kitchen set (top-right, rows 2-3, cols 7-9) ───
    // Kitchen row 1 (upper cabinets)
    this.placeImage(7, 2, 'house-kitchen-1-l', DEPTH.ENTITIES);
    this.placeImage(8, 2, 'house-kitchen-1-m', DEPTH.ENTITIES);
    // Kitchen row 2 (lower counter)
    this.placeImage(7, 3, 'house-kitchen-2-l', DEPTH.ENTITIES);
    this.placeImage(8, 3, 'house-kitchen-2-m', DEPTH.ENTITIES);

    // ─── Bucket (row 4, col 1) ───
    this.placeImage(1, 4, 'house-bucket', DEPTH.ENTITIES);

    // ─── Red table (row 4, cols 4-6) — horizontal 3 tiles ───
    this.placeImage(4, 4, 'house-table-l', DEPTH.ENTITIES);
    this.placeImage(5, 4, 'house-table-m', DEPTH.ENTITIES);
    this.placeImage(6, 4, 'house-table-r', DEPTH.ENTITIES);

    // ─── Buffet (row 4, col 8) ───
    this.placeImage(8, 4, 'house-buffet', DEPTH.ENTITIES);

    // ─── Chairs at table (row 5, cols 4-5) — horizontal ───
    this.placeImage(4, 5, 'house-chair-h-l', DEPTH.ENTITIES);
    this.placeImage(5, 5, 'house-chair-h-r', DEPTH.ENTITIES);

    // ─── Cabinets (row 6, cols 1-3) ───
    this.placeImage(1, 6, 'house-cabinet-s', DEPTH.ENTITIES);
    this.placeImage(2, 6, 'house-cabinet-l-1', DEPTH.ENTITIES);
    this.placeImage(3, 6, 'house-cabinet-l-2', DEPTH.ENTITIES);

    // ─── Labels ───
    this.addLabel(1.5 * TS, 2 * TS - 10, 'Bed');
    this.addLabel(7.5 * TS, 2 * TS - 10, 'Kitchen');
    this.addLabel(5 * TS, 4 * TS - 10, 'Table');
    this.addLabel(2 * TS, 6 * TS - 10, 'Storage');
  }

  // ============================================================
  // COLLIDERS
  // ============================================================

  private createColliders(): void {
    // Invisible room boundaries (no visual walls, just collision edges)
    const edgeThick = 4; // thin invisible edge

    // Top edge
    const edgeTop = this.physics.add.staticBody(0, -edgeThick, ROOM_W, edgeThick);
    this.physics.add.collider(this.player.sprite, edgeTop as unknown as Phaser.Physics.Arcade.StaticBody);

    // Left edge
    const edgeLeft = this.physics.add.staticBody(-edgeThick, 0, edgeThick, ROOM_H);
    this.physics.add.collider(this.player.sprite, edgeLeft as unknown as Phaser.Physics.Arcade.StaticBody);

    // Right edge
    const edgeRight = this.physics.add.staticBody(ROOM_W, 0, edgeThick, ROOM_H);
    this.physics.add.collider(this.player.sprite, edgeRight as unknown as Phaser.Physics.Arcade.StaticBody);

    // Bottom edge — left part (cols 0-3) and right part (cols 6-9), gap for door
    const edgeBotL = this.physics.add.staticBody(0, ROOM_H, 4 * TS, edgeThick);
    this.physics.add.collider(this.player.sprite, edgeBotL as unknown as Phaser.Physics.Arcade.StaticBody);
    const edgeBotR = this.physics.add.staticBody(6 * TS, ROOM_H, 4 * TS, edgeThick);
    this.physics.add.collider(this.player.sprite, edgeBotR as unknown as Phaser.Physics.Arcade.StaticBody);

    // Furniture colliders
    // Bed (cols 1-2, row 2)
    const bed = this.physics.add.staticBody(1 * TS, 2 * TS, 2 * TS, TS);
    this.physics.add.collider(this.player.sprite, bed as unknown as Phaser.Physics.Arcade.StaticBody);

    // Kitchen (cols 7-8, rows 2-3)
    const kitchen = this.physics.add.staticBody(7 * TS, 2 * TS, 2 * TS, 2 * TS);
    this.physics.add.collider(this.player.sprite, kitchen as unknown as Phaser.Physics.Arcade.StaticBody);

    // Table (cols 4-6, row 4)
    const table = this.physics.add.staticBody(4 * TS, 4 * TS, 3 * TS, TS);
    this.physics.add.collider(this.player.sprite, table as unknown as Phaser.Physics.Arcade.StaticBody);

    // Buffet (col 8, row 4)
    const buffet = this.physics.add.staticBody(8 * TS, 4 * TS, TS, TS);
    this.physics.add.collider(this.player.sprite, buffet as unknown as Phaser.Physics.Arcade.StaticBody);

    // Cabinets (cols 1-3, row 6)
    const cabinets = this.physics.add.staticBody(1 * TS, 6 * TS, 3 * TS, TS);
    this.physics.add.collider(this.player.sprite, cabinets as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  // ============================================================
  // INTERACTION
  // ============================================================

  private handleInteract(): void {
    if (this.nearBed) {
      this.sleepInBed();
    }
  }

  private checkBedProximity(): void {
    const bedCX = 1 * TS + TS; // center of bed (cols 1-2)
    const bedCY = 2 * TS + TS / 2; // center of bed row
    const dist = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      bedCX, bedCY
    );

    if (dist < TS * 1.8) {
      this.nearBed = true;
      this.promptText.setText('[E] Sleep');
      this.promptText.setVisible(true);
    } else {
      this.nearBed = false;
      this.promptText.setVisible(false);
    }
  }

  private sleepInBed(): void {
    this.player.freeze();
    this.promptText.setVisible(false);

    // Fade to black
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Advance to next day morning
      gameManager.time.advanceTo(7, 0);

      // Fade back in
      this.cameras.main.fadeIn(1500, 0, 0, 0);

      // Show "Day X" text
      const dayText = this.add.text(
        GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
        `Day ${gameManager.time.day}`,
        {
          fontSize: '12px',
          color: '#f2a65a',
          fontFamily: 'monospace',
        }
      );
      dayText.setOrigin(0.5);
      dayText.setScrollFactor(0);
      dayText.setDepth(DEPTH.UI + 50);
      dayText.setAlpha(0);

      this.tweens.add({
        targets: dayText,
        alpha: 1,
        duration: 800,
        hold: 2000,
        yoyo: true,
        onComplete: () => {
          dayText.destroy();
          this.player.unfreeze();
        },
      });
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /** Place an image tile at grid position (col, row) — origin top-left, no gap */
  private placeImage(col: number, row: number, key: string, depth: number): void {
    const x = col * TS;
    const y = row * TS;
    const img = this.add.image(x, y, key);
    img.setOrigin(0, 0);
    img.setScale(SCALE);
    img.setDepth(depth);
  }

  /** Add a subtle label */
  private addLabel(x: number, y: number, text: string): void {
    const label = this.add.text(x, y, text, {
      fontSize: '5px',
      color: '#8899aa',
      fontFamily: 'monospace',
    });
    label.setOrigin(0.5);
    label.setDepth(DEPTH.ENTITIES + 2);
    label.setAlpha(0.6);
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

  private doExit(): void {
    this.exiting = true;
    this.player.freeze();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.wake('WorldScene');
    });
  }

  private onWake(): void {
    this.exiting = false;
    this.player.unfreeze();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    this.mobileControls.destroy();
  }
}
