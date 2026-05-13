/**
 * SceneHUD — Combined HUD overlay for activity/house scenes.
 *
 * Bundles:
 *   1. Minimap card (top-left) — scene-specific terrain + player dot
 *   2. Inventory hotbar (bottom-centre) — reads from gameManager.inventory
 *   3. Phone icon (top-right) — opens PhoneUI overlay
 *
 * Usage:
 *   this.hud = new SceneHUD(this, 'fishing', W, H);
 *   // in update:
 *   this.hud.update(player.x, player.y);
 *   // in onShutdown:
 *   this.hud.destroy();
 */

import Phaser from 'phaser';
import { DEPTH } from '@config/game.config';
import { InventoryUI } from '@/ui/InventoryUI';
import { PhoneUI } from '@/ui/PhoneUI';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { InputGuard } from '@/ui/InputGuard';
import { formatRupiah } from '@config/economy.config';

// ─── Minimap panel geometry (mirrors WorldScene minimap) ──────
const PX     = 6;
const PY     = 6;
const PW     = 100;
const PAD    = 4;
const MM_W   = PW - PAD * 2;   // 92
const MM_H   = 50;
const INFO_H = 38;              // 3 text rows: location + time/day + period/weather
const PH     = PAD + MM_H + PAD + 1 + PAD + INFO_H + PAD;
const IX     = PX + PAD;
const IY     = PY + PAD;

export type SceneHUDMode =
  | 'fishing'
  | 'garden'
  | 'bench'
  | 'homestead'
  | 'farm_shop'
  | 'flower_shop'
  | 'player_house'
  | 'house_interior';

export class SceneHUD {
  private scene: Phaser.Scene;
  private mode: SceneHUDMode;
  private sceneW: number;
  private sceneH: number;

  // Minimap
  private mapBg!: Phaser.GameObjects.Graphics;
  private dotG!:  Phaser.GameObjects.Graphics;
  private locationText!: Phaser.GameObjects.Text;
  private timeText!:     Phaser.GameObjects.Text;
  private infoText!:     Phaser.GameObjects.Text;
  private moneyText!:    Phaser.GameObjects.Text;
  private clickZone!:   Phaser.GameObjects.Rectangle;

  // Hotbar & phone
  private inventoryUI: InventoryUI;
  private phoneUI: PhoneUI;

  constructor(
    scene: Phaser.Scene,
    mode: SceneHUDMode,
    sceneW: number,
    sceneH: number,
  ) {
    this.scene   = scene;
    this.mode    = mode;
    this.sceneW  = sceneW;
    this.sceneH  = sceneH;

    this.buildMinimap();
    this.inventoryUI = new InventoryUI(scene, gameManager.inventory);
    this.inventoryUI.redrawSlots();
    this.phoneUI = new PhoneUI(scene);
  }

  /** Call every frame with player world position and current weather state. */
  update(playerX: number, playerY: number, weatherState = 'clear'): void {
    this.drawPlayerDot(playerX, playerY);
    this.updateInfoTexts(weatherState);
    this.inventoryUI.redrawSlots();
    this.phoneUI.update();
  }

  destroy(): void {
    this.mapBg.destroy();
    this.dotG.destroy();
    this.locationText.destroy();
    this.timeText.destroy();
    this.infoText.destroy();
    this.moneyText.destroy();
    this.clickZone.destroy();
    this.inventoryUI.destroy();
    this.phoneUI.destroy();
  }

  /** Hide hotbar + phone icon (e.g. during pause) */
  setVisible(visible: boolean): void {
    this.clickZone.setVisible(visible);
    this.inventoryUI.setVisible(visible);
    this.phoneUI.setVisible(visible);
  }

  // ============================================================
  // MINIMAP BUILD
  // ============================================================

  private buildMinimap(): void {
    // Static terrain panel (drawn once)
    this.mapBg = this.scene.add.graphics();
    this.mapBg.setScrollFactor(0);
    this.mapBg.setDepth(DEPTH.UI + 5);
    this.drawPanel();
    this.drawTerrain();

    this.clickZone = this.scene.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, 0x000000, 0);
    this.clickZone.setScrollFactor(0);
    this.clickZone.setDepth(DEPTH.UI + 8);
    this.clickZone.setInteractive({ useHandCursor: true });
    this.clickZone.on('pointerdown', () => {
      InputGuard.consume();
      EventBus.emit('ui:open-pause-menu', {});
    });

    // Dynamic player dot layer
    this.dotG = this.scene.add.graphics();
    this.dotG.setScrollFactor(0);
    this.dotG.setDepth(DEPTH.UI + 6);

    // Info text rows below minimap
    const infoY = PY + PAD + MM_H + PAD + 1 + PAD;

    // Row 0: location name
    this.locationText = this.scene.add.text(PX + PAD, infoY, this.getLocationName(), {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: this.getLocationColor(),
      fontStyle: 'bold',
    });
    this.locationText.setScrollFactor(0).setDepth(DEPTH.UI + 6);

    // Row 1: day + time  (updated every frame)
    this.timeText = this.scene.add.text(PX + PAD, infoY + 10, '', {
      fontSize: '6px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.timeText.setScrollFactor(0).setDepth(DEPTH.UI + 6);

    // Row 2: period + weather  (updated every frame)
    this.infoText = this.scene.add.text(PX + PAD, infoY + 20, '', {
      fontSize: '5px',
      fontFamily: 'monospace',
      color: '#aabbcc',
    });
    this.infoText.setScrollFactor(0).setDepth(DEPTH.UI + 6);

    this.moneyText = this.scene.add.text(PX + PW - PAD, infoY + 29, '', {
      fontSize: '5px',
      fontFamily: 'monospace',
      color: '#f2d65a',
    });
    this.moneyText.setOrigin(1, 0);
    this.moneyText.setScrollFactor(0).setDepth(DEPTH.UI + 6);
  }

  private drawPanel(): void {
    const g = this.mapBg;
    g.fillStyle(0x0d1117, 0.82);
    g.fillRoundedRect(PX, PY, PW, PH, 3);
    g.lineStyle(1, 0x445566, 0.7);
    g.strokeRoundedRect(PX, PY, PW, PH, 3);
    g.lineStyle(1, 0x334455, 0.9);
    g.strokeRect(IX - 1, IY - 1, MM_W + 2, MM_H + 2);
    const divY = PY + PAD + MM_H + PAD;
    g.lineStyle(1, 0x334455, 0.5);
    g.lineBetween(PX + PAD, divY, PX + PW - PAD, divY);
  }

  private drawTerrain(): void {
    const g = this.mapBg;
    switch (this.mode) {
      case 'fishing':        this.drawFishingTerrain(g);      break;
      case 'garden':         this.drawGardenTerrain(g);       break;
      case 'bench':          this.drawBenchTerrain(g);        break;
      case 'homestead':      this.drawHomesteadTerrain(g);    break;
      case 'farm_shop':      this.drawFarmShopTerrain(g);     break;
      case 'flower_shop':    this.drawFlowerShopTerrain(g);   break;
      case 'player_house':   this.drawPlayerHouseTerrain(g);  break;
      case 'house_interior': this.drawHouseInteriorTerrain(g); break;
    }
  }

  // ── Terrain: Fishing Scene ────────────────────────────────────
  // Layout: sky 28%, water 35%, sand 37%  (matches HORIZON_Y=85, SHORE_Y=190, H=300)
  private drawFishingTerrain(g: Phaser.GameObjects.Graphics): void {
    // Sky
    g.fillStyle(0x87ceeb, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.28);

    // Water base (dark blue)
    g.fillStyle(0x1a4a8a, 1);
    g.fillRect(IX, IY + MM_H * 0.28, MM_W, MM_H * 0.35);

    // Water tile overlay (cross pattern hint)
    g.fillStyle(0x2e7fb8, 0.6);
    for (let wx = 0; wx < MM_W; wx += 10) {
      for (let wy = 0; wy < MM_H * 0.35; wy += 10) {
        if ((wx / 10 + wy / 10) % 2 === 0) {
          g.fillRect(IX + wx + 2, IY + MM_H * 0.28 + wy + 2, 6, 6);
        }
      }
    }

    // Shore transition line
    g.lineStyle(1, 0x4fa8d8, 0.7);
    g.lineBetween(IX, IY + MM_H * 0.63, IX + MM_W, IY + MM_H * 0.63);

    // Sand (Floors_Tiles 2 color)
    g.fillStyle(0xd4a96a, 1);
    g.fillRect(IX, IY + MM_H * 0.63, MM_W, MM_H * 0.37);

    // Sand patches (darker blobs)
    g.fillStyle(0xc89040, 0.5);
    g.fillCircle(IX + MM_W * 0.15, IY + MM_H * 0.72, 4);
    g.fillCircle(IX + MM_W * 0.45, IY + MM_H * 0.80, 5);
    g.fillCircle(IX + MM_W * 0.78, IY + MM_H * 0.70, 3);

    // Dock (brown strip, right side, at shore level)
    g.fillStyle(0x6b4c2a, 1);
    g.fillRect(IX + MM_W * 0.50, IY + MM_H * 0.58, MM_W * 0.40, MM_H * 0.05);

    // Return arrow hint (left edge, in sand area)
    g.fillStyle(0xf2a65a, 0.7);
    g.fillTriangle(IX + 3, IY + MM_H * 0.78, IX + 8, IY + MM_H * 0.75, IX + 8, IY + MM_H * 0.81);

    this.drawMinimapBorder(g);
  }

  // ── Terrain: Garden Scene ─────────────────────────────────────
  private drawGardenTerrain(g: Phaser.GameObjects.Graphics): void {
    // Sky
    g.fillStyle(0x87ceeb, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.25);

    // Grass
    g.fillStyle(0x5a9e3a, 1);
    g.fillRect(IX, IY + MM_H * 0.25, MM_W, MM_H * 0.75);

    // Path (vertical centre)
    g.fillStyle(0xb8a880, 0.6);
    g.fillRect(IX + MM_W * 0.44, IY + MM_H * 0.25, MM_W * 0.12, MM_H * 0.55);
    // Path (horizontal bottom)
    g.fillRect(IX, IY + MM_H * 0.80, MM_W, MM_H * 0.08);

    // Garden beds (3 horizontal patches)
    g.fillStyle(0x4a2e0e, 1);
    g.fillRect(IX + MM_W * 0.05, IY + MM_H * 0.28, MM_W * 0.20, MM_H * 0.20);
    g.fillRect(IX + MM_W * 0.40, IY + MM_H * 0.28, MM_W * 0.20, MM_H * 0.20);
    g.fillRect(IX + MM_W * 0.74, IY + MM_H * 0.28, MM_W * 0.20, MM_H * 0.20);

    // Plant dots
    g.fillStyle(0x3a8020, 0.9);
    for (const bx of [0.15, 0.50, 0.84]) {
      g.fillCircle(IX + MM_W * bx, IY + MM_H * 0.36, 2.5);
    }

    // Tree clusters
    g.fillStyle(0x1c3e18, 0.85);
    g.fillRect(IX + 2, IY + MM_H * 0.27, 4, 5);
    g.fillRect(IX + MM_W - 6, IY + MM_H * 0.25, 4, 5);

    // Return arrow hint (bottom edge)
    g.fillStyle(0xf2a65a, 0.7);
    g.fillTriangle(IX + MM_W * 0.5, IY + MM_H - 2, IX + MM_W * 0.5 - 4, IY + MM_H - 7, IX + MM_W * 0.5 + 4, IY + MM_H - 7);

    this.drawMinimapBorder(g);
  }

  // ── Terrain: Bench (Park) Scene ───────────────────────────────
  private drawBenchTerrain(g: Phaser.GameObjects.Graphics): void {
    // Sky (warm orange-blue)
    g.fillStyle(0xffd580, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.25);
    g.fillStyle(0x87ceeb, 0.7);
    g.fillRect(IX, IY + MM_H * 0.12, MM_W, MM_H * 0.13);

    // Grass
    g.fillStyle(0x4a7a2a, 1);
    g.fillRect(IX, IY + MM_H * 0.25, MM_W, MM_H * 0.75);

    // Stone path (horizontal band, ~52% down)
    g.fillStyle(0x9a9070, 1);
    g.fillRect(IX, IY + MM_H * 0.48, MM_W, MM_H * 0.12);

    // Bench (small brown rect)
    g.fillStyle(0x6b4c2a, 1);
    g.fillRect(IX + MM_W * 0.30, IY + MM_H * 0.44, MM_W * 0.18, MM_H * 0.06);

    // Trees
    g.fillStyle(0x1c3e18, 0.85);
    g.fillRect(IX + 4, IY + MM_H * 0.27, 5, 8);
    g.fillRect(IX + MM_W - 9, IY + MM_H * 0.26, 5, 8);

    // Return arrow hint (right edge)
    g.fillStyle(0xf2a65a, 0.7);
    g.fillTriangle(IX + MM_W - 2, IY + MM_H * 0.55, IX + MM_W - 7, IY + MM_H * 0.52, IX + MM_W - 7, IY + MM_H * 0.58);

    this.drawMinimapBorder(g);
  }

  // ── Terrain: Player House ─────────────────────────────────────
  private drawPlayerHouseTerrain(g: Phaser.GameObjects.Graphics): void {
    // Wall (top)
    g.fillStyle(0x8b6b3d, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.22);

    // Wooden floor
    g.fillStyle(0x7a5530, 1);
    g.fillRect(IX, IY + MM_H * 0.22, MM_W, MM_H * 0.78);

    // Floor planks
    g.lineStyle(1, 0x3d2610, 0.18);
    for (let y = 0.22; y < 1.0; y += 0.10) {
      g.lineBetween(IX, IY + MM_H * y, IX + MM_W, IY + MM_H * y);
    }

    // Kasur (top-right)
    g.fillStyle(0x4488cc, 0.8);
    g.fillRect(IX + MM_W * 0.80, IY + MM_H * 0.24, MM_W * 0.16, MM_H * 0.30);

    // Lemari (top-left)
    g.fillStyle(0x6b4c2a, 0.9);
    g.fillRect(IX + MM_W * 0.01, IY + MM_H * 0.24, MM_W * 0.13, MM_H * 0.22);

    // Buffet (right of lemari)
    g.fillStyle(0x8b5e3c, 0.9);
    g.fillRect(IX + MM_W * 0.14, IY + MM_H * 0.24, MM_W * 0.24, MM_H * 0.14);

    // Exit indicator (bottom centre)
    g.fillStyle(0xf2a65a, 0.6);
    g.fillRect(IX + MM_W * 0.37, IY + MM_H * 0.94, MM_W * 0.26, MM_H * 0.05);

    this.drawMinimapBorder(g);
  }

  // ── Terrain: Homestead ────────────────────────────────────────
  private drawHomesteadTerrain(g: Phaser.GameObjects.Graphics): void {
    const toX = (x: number) => IX + (x / this.sceneW) * MM_W;
    const toY = (y: number) => IY + (y / this.sceneH) * MM_H;
    const toW = (w: number) => (w / this.sceneW) * MM_W;
    const toH = (h: number) => (h / this.sceneH) * MM_H;
    const ox = (x: number) => x + 180;
    const oy = (y: number) => y + 110;

    g.fillStyle(0x5a9e3a, 1);
    g.fillRect(IX, IY, MM_W, MM_H);

    g.fillStyle(0x4e7b32, 0.20);
    for (const patch of [
      { x: ox(84), y: oy(74), w: 190, h: 56 },
      { x: ox(598), y: oy(92), w: 224, h: 64 },
      { x: ox(610), y: oy(406), w: 206, h: 72 },
      { x: ox(42), y: oy(430), w: 220, h: 68 },
    ]) {
      g.fillEllipse(toX(patch.x), toY(patch.y), toW(patch.w), toH(patch.h));
    }

    // House at the upper-right, matching the actual scene footprint more closely.
    g.fillStyle(0x9a6c3c, 1);
    g.fillRect(toX(ox(286)), toY(oy(92)), toW(162), toH(66));
    g.fillStyle(0x704121, 1);
    g.fillTriangle(toX(ox(274)), toY(oy(103)), toX(ox(366)), toY(oy(62)), toX(ox(458)), toY(oy(103)));
    g.fillStyle(0x4a2d17, 1);
    g.fillRect(toX(ox(380)), toY(oy(132)), toW(18), toH(28));

    // Crop field on the left side of the house.
    g.fillStyle(0x6e4b26, 1);
    g.fillRect(toX(ox(-18)), toY(oy(152)), toW(166), toH(80));
    g.lineStyle(1, 0x3c2411, 0.45);
    for (let row = 1; row < 4; row++) {
      g.lineBetween(toX(ox(-18)), toY(oy(152 + row * 20)), toX(ox(148)), toY(oy(152 + row * 20)));
    }
    for (let col = 1; col < 6; col++) {
      g.lineBetween(toX(ox(-18 + col * 27)), toY(oy(152)), toX(ox(-18 + col * 27)), toY(oy(232)));
    }

    // Trees and major props from buildDecor.
    g.fillStyle(0x21451c, 0.9);
    const trees = [
      [ox(-58), oy(64)], [ox(-24), oy(118)], [ox(24), oy(76)], [ox(105), oy(56)], [ox(166), oy(46)],
      [ox(224), oy(28)], [ox(312), oy(-28)], [ox(460), oy(70)], [ox(520), oy(120)], [ox(36), oy(278)], [ox(-34), oy(330)],
      [ox(82), oy(344)], [ox(158), oy(292)], [ox(470), oy(292)], [ox(548), oy(338)], [ox(238), oy(326)],
      [ox(590), oy(70)], [ox(642), oy(110)], [ox(694), oy(32)], [ox(702), oy(168)], [ox(760), oy(94)], [ox(794), oy(162)],
      [ox(824), oy(246)], [ox(676), oy(262)], [ox(640), oy(318)], [ox(620), oy(354)], [ox(196), oy(458)], [ox(346), oy(470)],
      [ox(520), oy(464)], [ox(706), oy(444)], [ox(-116), oy(214)],
    ];
    for (const [x, y] of trees) {
      g.fillCircle(toX(x), toY(y), 2.8);
    }

    g.fillStyle(0x9c8b5f, 0.35);
    g.fillEllipse(toX(ox(54)), toY(oy(329)), toW(152), toH(82));
    g.fillEllipse(toX(ox(95)), toY(oy(314)), toW(46), toH(24));
    g.fillStyle(0x2b677a, 0.94);
    g.fillEllipse(toX(ox(49)), toY(oy(325)), toW(116), toH(58));
    g.fillEllipse(toX(ox(90)), toY(oy(311)), toW(36), toH(18));
    g.fillEllipse(toX(ox(18)), toY(oy(320)), toW(34), toH(18));
    g.fillStyle(0x6cbfd7, 0.52);
    g.fillEllipse(toX(ox(44)), toY(oy(314)), toW(64), toH(22));
    g.fillEllipse(toX(ox(74)), toY(oy(334)), toW(28), toH(10));

    g.fillStyle(0x7e5728, 1);
    g.fillCircle(toX(ox(236)), toY(oy(82)), 2.2);
    const crates = [
      [ox(248), oy(96)], [ox(264), oy(108)], [ox(248), oy(124)], [ox(430), oy(188)],
    ];
    g.fillStyle(0xd8791f, 0.95);
    for (const [x, y] of crates) {
      g.fillRect(toX(x) - 1.2, toY(y) - 1.2, 2.4, 2.4);
    }

    g.fillStyle(0xf2a65a, 0.7);
    g.fillTriangle(IX + MM_W - 2, IY + MM_H * 0.50, IX + MM_W - 7, IY + MM_H * 0.46, IX + MM_W - 7, IY + MM_H * 0.54);

    this.drawMinimapBorder(g);
  }

  // ── Terrain: House Interior (NPC house) ───────────────────────
  private drawHouseInteriorTerrain(g: Phaser.GameObjects.Graphics): void {
    // Roof strip
    g.fillStyle(0x5c3a1e, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.12);

    // Wall strip
    g.fillStyle(0x8b6b3d, 1);
    g.fillRect(IX, IY + MM_H * 0.12, MM_W, MM_H * 0.18);

    // Wooden floor
    g.fillStyle(0x7a5530, 1);
    g.fillRect(IX, IY + MM_H * 0.30, MM_W, MM_H * 0.70);

    // Divider (vertical line — left/right room)
    g.lineStyle(1, 0x3d2610, 0.5);
    g.lineBetween(IX + MM_W * 0.5, IY + MM_H * 0.30, IX + MM_W * 0.5, IY + MM_H * 0.92);

    // Left room: kasur
    g.fillStyle(0x4488cc, 0.8);
    g.fillRect(IX + MM_W * 0.05, IY + MM_H * 0.33, MM_W * 0.18, MM_H * 0.22);

    // Right room: meja + bangku
    g.fillStyle(0x6b4c2a, 0.8);
    g.fillRect(IX + MM_W * 0.58, IY + MM_H * 0.38, MM_W * 0.18, MM_H * 0.12);
    g.fillRect(IX + MM_W * 0.58, IY + MM_H * 0.53, MM_W * 0.20, MM_H * 0.09);

    // Exit indicator
    g.fillStyle(0xf2a65a, 0.6);
    g.fillRect(IX + MM_W * 0.37, IY + MM_H * 0.94, MM_W * 0.26, MM_H * 0.05);

    this.drawMinimapBorder(g);
  }

  private drawFarmShopTerrain(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x5c3a1e, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.12);

    g.fillStyle(0x8b6b3d, 1);
    g.fillRect(IX, IY + MM_H * 0.12, MM_W, MM_H * 0.18);

    g.fillStyle(0x7a5530, 1);
    g.fillRect(IX, IY + MM_H * 0.30, MM_W, MM_H * 0.70);

    g.fillStyle(0x6b4c2a, 0.95);
    g.fillRect(IX + MM_W * 0.12, IY + MM_H * 0.34, MM_W * 0.76, MM_H * 0.12);

    g.fillStyle(0xd8a256, 0.95);
    for (const x of [0.18, 0.42, 0.66]) {
      g.fillRect(IX + MM_W * x, IY + MM_H * 0.18, MM_W * 0.12, MM_H * 0.09);
    }

    g.fillStyle(0xf2a65a, 0.6);
    g.fillRect(IX + MM_W * 0.37, IY + MM_H * 0.94, MM_W * 0.26, MM_H * 0.05);

    this.drawMinimapBorder(g);
  }

  private drawFlowerShopTerrain(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x5c3a1e, 1);
    g.fillRect(IX, IY, MM_W, MM_H * 0.14);

    g.fillStyle(0x8a6440, 1);
    g.fillRect(IX, IY + MM_H * 0.14, MM_W, MM_H * 0.16);

    g.fillStyle(0x7a5530, 1);
    g.fillRect(IX, IY + MM_H * 0.30, MM_W, MM_H * 0.70);

    g.lineStyle(1, 0x3d2610, 0.18);
    for (let y = 0.34; y < 1.0; y += 0.12) {
      g.lineBetween(IX, IY + MM_H * y, IX + MM_W, IY + MM_H * y);
    }

    g.fillStyle(0xff8cc8, 0.95);
    for (const x of [0.12, 0.22, 0.78, 0.88]) {
      g.fillCircle(IX + MM_W * x, IY + MM_H * 0.34, 2.5);
    }
    for (const x of [0.40, 0.48, 0.56, 0.64]) {
      g.fillCircle(IX + MM_W * x, IY + MM_H * 0.62, 2.2);
    }

    g.fillStyle(0x6b4c2a, 0.92);
    g.fillRect(IX + MM_W * 0.12, IY + MM_H * 0.45, MM_W * 0.20, MM_H * 0.08);
    g.fillRect(IX + MM_W * 0.68, IY + MM_H * 0.45, MM_W * 0.20, MM_H * 0.08);
    g.fillRect(IX + MM_W * 0.40, IY + MM_H * 0.62, MM_W * 0.22, MM_H * 0.08);

    g.fillStyle(0xf2a65a, 0.6);
    g.fillRect(IX + MM_W * 0.37, IY + MM_H * 0.94, MM_W * 0.26, MM_H * 0.05);

    this.drawMinimapBorder(g);
  }

  private drawMinimapBorder(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(1, 0x556677, 0.8);
    g.strokeRect(IX, IY, MM_W, MM_H);
  }

  // ============================================================
  // PLAYER DOT (dynamic, called each frame)
  // ============================================================

  private drawPlayerDot(px: number, py: number): void {
    const g = this.dotG;
    g.clear();

    const mx = IX + (px / this.sceneW) * MM_W;
    const my = IY + (py / this.sceneH) * MM_H;

    // Clamp inside minimap bounds
    const cx = Phaser.Math.Clamp(mx, IX + 1, IX + MM_W - 1);
    const cy = Phaser.Math.Clamp(my, IY + 1, IY + MM_H - 1);

    g.fillStyle(0xffee88, 0.35);
    g.fillCircle(cx, cy, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 2);
  }

  // ============================================================
  // INFO TEXT UPDATE (called every frame)
  // ============================================================

  private updateInfoTexts(weatherState: string): void {
    const time = gameManager.time;
    const hh   = time.hour.toString().padStart(2, '0');
    const mm   = time.minute.toString().padStart(2, '0');
    const col  = this.periodColor(time.period);

    this.timeText.setText(`Hari ${time.day}  ${hh}:${mm}`).setColor(col);
    this.infoText
      .setText(`${this.periodLabel(time.period)}  ${this.weatherLabel(weatherState)}`)
      .setColor(col);
    this.moneyText.setText(formatRupiah(gameManager.money));
  }

  private periodLabel(period: string): string {
    switch (period) {
      case 'dawn':       return 'Subuh';
      case 'morning':    return 'Pagi';
      case 'afternoon':  return 'Siang';
      case 'evening':    return 'Sore';
      case 'night':      return 'Malam';
      case 'late_night': return 'Dini Hari';
      default:           return period;
    }
  }

  private weatherLabel(state: string): string {
    switch (state) {
      case 'light_rain': return 'Gerimis';
      case 'rain':       return 'Hujan';
      case 'heavy_rain': return 'Hujan Deras';
      default:           return 'Cerah';
    }
  }

  private periodColor(period: string): string {
    switch (period) {
      case 'dawn':       return '#f0c8a0';
      case 'morning':    return '#ffffff';
      case 'afternoon':  return '#ffe0a0';
      case 'evening':    return '#f2a65a';
      case 'night':      return '#8899cc';
      case 'late_night': return '#6677aa';
      default:           return '#cccccc';
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getLocationName(): string {
    switch (this.mode) {
      case 'fishing':        return 'Pantai';
      case 'garden':         return 'Kebun';
      case 'bench':          return 'Taman';
      case 'homestead':      return 'Halaman Rumah';
      case 'farm_shop':      return 'Toko Tani';
      case 'flower_shop':    return 'Toko Bunga';
      case 'player_house':   return 'Rumahku';
      case 'house_interior': return 'Rumah NPC';
      default:               return '???';
    }
  }

  private getLocationColor(): string {
    switch (this.mode) {
      case 'fishing':        return '#4fa3d1';
      case 'garden':         return '#66bb66';
      case 'bench':          return '#f2d65a';
      case 'homestead':      return '#8fd05a';
      case 'farm_shop':      return '#f0bf72';
      case 'flower_shop':    return '#ffd6ec';
      case 'player_house':   return '#f2a65a';
      case 'house_interior': return '#c8956a';
      default:               return '#cccccc';
    }
  }
}
