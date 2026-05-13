/**
 * MinimapSystem — combined minimap panel (top-left corner).
 *
 * Layout:
 *   ┌─────────────────────┐
 *   │  terrain overview   │  ← coloured map with dots
 *   ├─────────────────────┤
 *   │  Day 1 · 07:30      │
 *   │  Morning · Clear    │
 *   │  Pos  240, 160      │
 *   │  Rika [stranger] ♥3 │
 *   └─────────────────────┘
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { NPC } from '@/entities/NPC';
import { gameManager } from '@/managers/GameManager';
import { formatTime } from '@config/time.config';
import { EventBus } from '@/core/EventBus';

// ─── Panel geometry ───────────────────────────────────────────
const PW      = 112;
const PH      = 88;
const PX      = GAME_CONFIG.WIDTH - PW - 6;
const PY      = 6;
const PAD     = 4;    // inner padding

// Minimap section (inside panel)
const MM_W    = 40;
const MM_H    = 40;

// Minimap inner origin
const IX      = PX + 8;
const IY      = PY + 12;
const INFO_X  = IX + MM_W + 6;
const INFO_Y  = PY + 8;
const MONEY_Y = PY + PH - 19;
const STAMINA_X = PX + 8;
const STAMINA_Y = PY + PH + 4;
const STAMINA_W = PW - 16;
const STAMINA_H = 7;

// ─── Terrain feature colours ──────────────────────────────────
const C_GRASS  = 0x2e5e26;
const C_ROAD   = 0x7a6a52;
const C_TREE   = 0x1c3e18;
const C_HOUSE  = 0x7a4828;
const C_CAFE   = 0xc87820;
const C_FLOWER = 0xd889ac;
const C_WATER  = 0x1a3a6a;
const C_STONE  = 0xa59d8b;
const C_BOX    = 0xbd7f3a;

/** Activity zone marker data for minimap display */
export interface MinimapZoneMarker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  icon: string;
}

export class MinimapSystem {
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private mapG: Phaser.GameObjects.Graphics;
  private frameG: Phaser.GameObjects.Graphics;
  private minimapMaskShape: Phaser.GameObjects.Graphics;
  private minimapMask: Phaser.Display.Masks.GeometryMask;
  private texts: Phaser.GameObjects.Text[] = [];
  private mapW: number;
  private mapH: number;
  private zoneMarkers: MinimapZoneMarker[] = [];
  private zoneLabels: Phaser.GameObjects.Text[] = [];
  private clickZone!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, mapWidth: number, mapHeight: number) {
    this.scene = scene;
    this.mapW  = mapWidth;
    this.mapH  = mapHeight;

    this.g = scene.add.graphics();
    this.g.setScrollFactor(0);
    this.g.setDepth(DEPTH.UI + 5);

    this.mapG = scene.add.graphics();
    this.mapG.setScrollFactor(0);
    this.mapG.setDepth(DEPTH.UI + 6);

    this.frameG = scene.add.graphics();
    this.frameG.setScrollFactor(0);
    this.frameG.setDepth(DEPTH.UI + 7.5);

    this.minimapMaskShape = scene.add.graphics();
    this.minimapMaskShape.fillStyle(0xffffff, 1);
    this.minimapMaskShape.fillRect(IX, IY, MM_W, MM_H);
    this.minimapMaskShape.setScrollFactor(0);
    this.minimapMaskShape.setVisible(false);
    this.minimapMask = this.minimapMaskShape.createGeometryMask();
    this.mapG.setMask(this.minimapMask);

    // Invisible click zone over the entire panel — opens pause menu
    this.clickZone = scene.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, 0x000000, 0);
    this.clickZone.setScrollFactor(0);
    this.clickZone.setDepth(DEPTH.UI + 8);
    this.clickZone.setInteractive({ useHandCursor: true });
    this.clickZone.on('pointerdown', () => { EventBus.emit('ui:open-pause-menu', {}); });

    const lineH  = 13;
    for (let i = 0; i < 4; i++) {
      const isMoney = i === 3;
      const t = scene.add.text(isMoney ? PX + PW / 2 : INFO_X, isMoney ? MONEY_Y : INFO_Y + i * lineH, '', {
        fontSize: i === 3 ? '7px' : '8px',
        fontFamily: 'monospace',
        color: i === 3 ? '#f2d65a' : '#3a2418',
        fontStyle: i === 0 ? 'bold' : 'normal',
      });
      if (isMoney) t.setOrigin(0.5, 0);
      t.setScrollFactor(0);
      t.setDepth(DEPTH.UI + 8);
      this.texts.push(t);
    }
  }

  /** Register activity zone markers to display on the minimap */
  setZoneMarkers(markers: MinimapZoneMarker[]): void {
    this.zoneMarkers = markers;

    // Create persistent text labels for each zone marker
    for (const label of this.zoneLabels) label.destroy();
    this.zoneLabels = [];

    for (const marker of markers) {
      const cx = marker.x + marker.width / 2;
      const cy = marker.y + marker.height / 2;
      const mx = IX + (cx / this.mapW) * MM_W;
      const my = IY + (cy / this.mapH) * MM_H;

      const shortLabel = this.getZoneShortLabel(marker.id);
      const colorHex = '#' + marker.color.toString(16).padStart(6, '0');

      const t = this.scene.add.text(mx + 4, my - 3, shortLabel, {
        fontSize: '5px',
        fontFamily: 'monospace',
        color: colorHex,
        fontStyle: 'bold',
      });
      t.setScrollFactor(0);
      t.setDepth(DEPTH.UI + 7);
      t.setMask(this.minimapMask);
      this.zoneLabels.push(t);
    }
  }

  update(
    playerX: number,
    playerY: number,
    rika: NPC,
    townNPCs: NPC[],
    isRaining: boolean,
  ): void {
    this.g.clear();
    this.mapG.clear();
    this.frameG.clear();
    this.drawPanel();
    this.drawTerrain();
    this.drawZoneMarkers();
    this.drawDots(playerX, playerY, rika, townNPCs);
    this.drawMinimapFrame();
    this.drawStaminaBar();
    this.updateInfo(playerX, playerY, isRaining);
  }

  destroy(): void {
    this.g.destroy();
    this.mapG.destroy();
    this.frameG.destroy();
    this.minimapMask.destroy();
    this.minimapMaskShape.destroy();
    this.clickZone.destroy();
    for (const t of this.texts) t.destroy();
    for (const t of this.zoneLabels) t.destroy();
  }

  // ─────────────────────────────────────────────────────────────

  private drawPanel(): void {
    const g = this.g;

    g.fillStyle(0x6b3b16, 0.96);
    g.fillRoundedRect(PX, PY, PW, PH, 4);
    g.lineStyle(2, 0x2f1b0f, 1);
    g.strokeRoundedRect(PX, PY, PW, PH, 4);

    g.fillStyle(0xe5a943, 1);
    g.fillRoundedRect(INFO_X - 3, PY + 8, PW - MM_W - 17, 19, 3);
    g.fillStyle(0xffcc55, 1);
    g.fillRoundedRect(INFO_X - 3, PY + 30, PW - MM_W - 17, 28, 3);
    g.fillStyle(0xb65d22, 1);
    g.fillRoundedRect(PX + 8, MONEY_Y - 2, PW - 16, 16, 3);

    g.fillStyle(0x143b2f, 1);
    g.fillRoundedRect(IX - 2, IY - 2, MM_W + 4, MM_H + 4, 4);
    g.lineStyle(2, 0xffc35a, 1);
    g.strokeRoundedRect(IX - 2, IY - 2, MM_W + 4, MM_H + 4, 4);
  }

  private drawTerrain(): void {
    const g  = this.mapG;
    const ts = GAME_CONFIG.TILE_SIZE;

    // Helper: world tile coords → minimap pixel
    const tw = (tiles: number)      => (tiles * ts / this.mapW) * MM_W;
    const th = (tiles: number)      => (tiles * ts / this.mapH) * MM_H;
    const tileToX = (tileX: number) => IX + (tileX * ts / this.mapW) * MM_W;
    const tileToY = (tileY: number) => IY + (tileY * ts / this.mapH) * MM_H;
    const totalTilesY = this.mapH / ts;

    // 1. Grass background (whole minimap)
    g.fillStyle(C_GRASS, 1);
    g.fillRect(IX, IY, MM_W, MM_H);

    // 2. Water strip at very top (row 0)
    g.fillStyle(C_WATER, 0.6);
    g.fillRect(IX, IY, MM_W, th(0.6));

    // 3. Horizontal road (rows 4–5 → y fraction based on tilemap rows)
    const roadRow = 4;
    const roadRows = 2;
    g.fillStyle(C_ROAD, 1);
    g.fillRect(
      IX,
      tileToY(roadRow),
      MM_W,
      th(roadRows),
    );

    // 4. Tree clusters (same positions as VegetationSystem decor)
    const trees: Array<[number, number]> = [
      [0.7, 3], [0.5, 6.5],
      [14.3, 3], [14.5, 7],
      [5, 3],   [10, 3],
      [7.5, 9], [2, 6.5], [13, 6],
      [1.15, 1.6], [13.85, 1.55],
      [1.1, 8.85], [13.7, 8.8],
      [6.0, 2.85], [9.1, 7.25],
      [12.65, 6.75], [2.65, 7.45],
    ];
    g.fillStyle(C_TREE, 0.85);
    for (const [tx_, ty_] of trees) {
      const mx = tileToX(tx_);
      const my = tileToY(ty_);
      g.fillCircle(mx, my, 2.4);
    }

    // 5. Buildings and landmarks aligned with the live downtown layout.
    const buildings: Array<{ tx: number; ty: number; w: number; h: number; color: number }> = [
      { tx: 2.5, ty: 2.15, w: 1.55, h: 1.25, color: C_HOUSE },
      { tx: 4.6, ty: 2.15, w: 1.55, h: 1.25, color: C_HOUSE },
      { tx: 7.5, ty: 1.5, w: 1.7, h: 1.2, color: C_CAFE },
      { tx: 12.25, ty: 2.15, w: 1.85, h: 1.4, color: C_FLOWER },
      { tx: 4, ty: 8, w: 1.45, h: 1.15, color: C_HOUSE },
      { tx: 7.5, ty: 8.5, w: 1.7, h: 1.3, color: C_HOUSE },
      { tx: 11, ty: 8.5, w: 1.7, h: 1.3, color: C_HOUSE },
    ];
    for (const building of buildings) {
      const bw = tw(building.w);
      const bh = th(building.h);
      const bx = tileToX(building.tx);
      const by = tileToY(building.ty);
      g.fillStyle(building.color, 1);
      g.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 1.5);
    }

    const stones: Array<[number, number]> = [
      [3.5, 6], [11.5, 6.5], [6, 7.5], [9, 3.5],
    ];
    g.fillStyle(C_STONE, 0.95);
    for (const [stoneX, stoneY] of stones) {
      g.fillCircle(tileToX(stoneX), tileToY(stoneY), 1.4);
    }

    const boxClusters: Array<[number, number]> = [
      [1.6, 1.95], [3.4, 1.95], [6.5, 1.2], [8.5, 1.2], [11.2, 1.95], [13.2, 1.95],
      [6.7, 8.9], [8.4, 8.9], [10.3, 8.9], [12.0, 8.9],
    ];
    g.fillStyle(C_BOX, 0.85);
    for (const [boxX, boxY] of boxClusters) {
      const mx = tileToX(boxX);
      const my = tileToY(boxY);
      g.fillRect(mx - 1.3, my - 1.3, 2.6, 2.6);
    }

  }

  private drawMinimapFrame(): void {
    const g = this.frameG;
    g.lineStyle(1, 0xffe3a0, 0.8);
    g.strokeRect(IX, IY, MM_W, MM_H);
  }

  private drawStaminaBar(): void {
    const g = this.g;
    const ratio = gameManager.staminaRatio;
    const fillW = Math.max(0, Math.floor((STAMINA_W - 2) * ratio));
    const fillColor = ratio > 0.55 ? 0x7cc66a : ratio > 0.25 ? 0xf2c75c : 0xd96a4a;

    g.fillStyle(0x2f1b0f, 0.88);
    g.fillRoundedRect(STAMINA_X, STAMINA_Y, STAMINA_W, STAMINA_H, 2);
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(STAMINA_X + 1, STAMINA_Y + 1, fillW, STAMINA_H - 2, 1);
    g.lineStyle(1, 0xffe3a0, 0.55);
    g.strokeRoundedRect(STAMINA_X, STAMINA_Y, STAMINA_W, STAMINA_H, 2);
  }

  private drawDots(
    playerX: number,
    playerY: number,
    rika: NPC,
    townNPCs: NPC[],
  ): void {
    const g = this.mapG;

    const toMM = (wx: number, wy: number) => ({
      x: IX + (wx / this.mapW) * MM_W,
      y: IY + (wy / this.mapH) * MM_H,
    });

    // Town NPCs — small muted dots
    g.fillStyle(0xaabbcc, 0.55);
    for (const npc of townNPCs) {
      const p = toMM(npc.sprite.x, npc.sprite.y);
      g.fillRect(p.x - 1, p.y - 1, 2, 2);
    }

    // Rika — rose dot
    if (rika.present) {
      g.fillStyle(0xff88cc, 1);
      const rp = toMM(rika.sprite.x, rika.sprite.y);
      g.fillCircle(rp.x, rp.y, 2);
    }

    // Player — bright dot with small glow
    const pp = toMM(playerX, playerY);
    g.fillStyle(0xffee88, 0.3);
    g.fillCircle(pp.x, pp.y, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(pp.x, pp.y, 2);
  }

  private drawZoneMarkers(): void {
    if (this.zoneMarkers.length === 0) return;
    const g = this.mapG;

    for (const marker of this.zoneMarkers) {
      // Convert world position to minimap position
      const cx = marker.x + marker.width / 2;
      const cy = marker.y + marker.height / 2;
      const mx = IX + (cx / this.mapW) * MM_W;
      const my = IY + (cy / this.mapH) * MM_H;

      // Draw a diamond-shaped marker with the zone color
      g.fillStyle(marker.color, 0.9);
      // Diamond shape (two triangles)
      g.fillTriangle(
        mx, my - 3,   // top
        mx + 3, my,   // right
        mx, my + 3,   // bottom
      );
      g.fillTriangle(
        mx, my - 3,   // top
        mx - 3, my,   // left
        mx, my + 3,   // bottom
      );

      // White outline for visibility
      g.lineStyle(1, 0xffffff, 0.4);
      g.strokeTriangle(mx, my - 3, mx + 3, my, mx, my + 3);
      g.strokeTriangle(mx, my - 3, mx - 3, my, mx, my + 3);
    }
  }

  /** Get a short label character for zone markers on minimap */
  private getZoneShortLabel(id: string): string {
    switch (id) {
      case 'fishing':    return 'F';
      case 'bench_sit':  return 'B';
      case 'gardening':  return 'G';
      case 'stargazing': return 'S';
      case 'house':      return 'H';
      default:           return '?';
    }
  }

  private updateInfo(_playerX: number, _playerY: number, isRaining: boolean): void {
    const time = gameManager.time;

    const timeStr    = formatTime(time.hour, time.minute);
    const weatherStr = isRaining ? 'Rain' : 'Clear';
    const relStage = '';
    const affection = '';

    this.texts[0].setText(`Day ${time.day}`);

    this.texts[1].setText(timeStr);

    this.texts[2].setText(weatherStr);

    // Line 3: rika status
    this.texts[3].setText(`Rika [${relStage}] ♥${affection}`);

    this.texts[3].setText(`Rp${gameManager.money.toLocaleString('id-ID')}`).setColor('#fff0a8');
    this.texts[1].setColor(this.periodColour(time.period));
  }

  private periodColour(period: string): string {
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
}
