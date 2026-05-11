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
const PX      = 6;    // panel left
const PY      = 6;    // panel top
const PW      = 100;  // panel width
const PAD     = 4;    // inner padding

// Minimap section (inside panel)
const MM_W    = PW - PAD * 2;   // 92
const MM_H    = 50;             // fixed map height

// Info section height
const INFO_H  = 38;

// Total panel height
const PH      = PAD + MM_H + PAD + 1 + PAD + INFO_H + PAD; // ~107

// Minimap inner origin
const IX      = PX + PAD;
const IY      = PY + PAD;

// ─── Terrain feature colours ──────────────────────────────────
const C_GRASS  = 0x2e5e26;
const C_ROAD   = 0x7a6a52;
const C_TREE   = 0x1c3e18;
const C_HOUSE  = 0x7a4828;
const C_CAFE   = 0xc87820;
const C_FLOWER = 0xd889ac;
const C_WATER  = 0x1a3a6a;

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

    // Invisible click zone over the entire panel — opens pause menu
    this.clickZone = scene.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, 0x000000, 0);
    this.clickZone.setScrollFactor(0);
    this.clickZone.setDepth(DEPTH.UI + 8);
    this.clickZone.setInteractive({ useHandCursor: true });
    this.clickZone.on('pointerdown', () => { EventBus.emit('ui:open-pause-menu', {}); });

    // Create info text lines (4 rows)
    const infoY0 = PY + PAD + MM_H + PAD + 1 + PAD;
    const lineH  = 9;
    for (let i = 0; i < 4; i++) {
      const t = scene.add.text(PX + PAD, infoY0 + i * lineH, '', {
        fontSize: '7px',
        fontFamily: 'monospace',
        color: '#cccccc',
      });
      t.setScrollFactor(0);
      t.setDepth(DEPTH.UI + 6);
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
    this.drawPanel();
    this.drawTerrain();
    this.drawZoneMarkers();
    this.drawDots(playerX, playerY, rika, townNPCs);
    this.updateInfo(playerX, playerY, isRaining);
  }

  destroy(): void {
    this.g.destroy();
    this.clickZone.destroy();
    for (const t of this.texts) t.destroy();
    for (const t of this.zoneLabels) t.destroy();
  }

  // ─────────────────────────────────────────────────────────────

  private drawPanel(): void {
    const g = this.g;

    // Outer background
    g.fillStyle(0x0d1117, 0.82);
    g.fillRoundedRect(PX, PY, PW, PH, 3);

    // Outer border
    g.lineStyle(1, 0x445566, 0.7);
    g.strokeRoundedRect(PX, PY, PW, PH, 3);

    // Minimap frame
    g.lineStyle(1, 0x334455, 0.9);
    g.strokeRect(IX - 1, IY - 1, MM_W + 2, MM_H + 2);

    // Divider between map and info
    const divY = PY + PAD + MM_H + PAD;
    g.lineStyle(1, 0x334455, 0.5);
    g.lineBetween(PX + PAD, divY, PX + PW - PAD, divY);
  }

  private drawTerrain(): void {
    const g  = this.g;
    const ts = GAME_CONFIG.TILE_SIZE;

    // Helper: world tile coords → minimap pixel
    const tx = (tileFracX: number) => IX + tileFracX * MM_W;
    const ty = (tileFracY: number) => IY + tileFracY * MM_H;
    const tw = (tiles: number)      => (tiles * ts / this.mapW) * MM_W;
    const th = (tiles: number)      => (tiles * ts / this.mapH) * MM_H;

    const totalTilesX = this.mapW / ts;
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
      ty(roadRow / totalTilesY),
      MM_W,
      th(roadRows),
    );

    // 4. Tree clusters (same positions as VegetationSystem decor)
    const trees: Array<[number, number]> = [
      [0.7, 3], [0.5, 6.5],
      [14.3, 3], [14.5, 7],
      [5, 3],   [10, 3],
      [7.5, 9], [2, 6.5], [13, 6],
    ];
    g.fillStyle(C_TREE, 0.85);
    for (const [tx_, ty_] of trees) {
      const mx = IX + (tx_ * ts / this.mapW) * MM_W;
      const my = IY + (ty_ * ts / this.mapH) * MM_H;
      g.fillRect(mx - 2, my - 2, 4, 4);
    }

    // 5. Houses (3 top row, 2 bottom row)
    const houses: Array<{ tx: number; ty: number; cafe?: true; flower?: true }> = [
      { tx: 2.5,  ty: 1.5 },
      { tx: 7.5,  ty: 1.5, cafe: true },   // cafe
      { tx: 12.25, ty: 2.15, flower: true },
      { tx: 4,    ty: 8   },
      { tx: 11,   ty: 8   },
    ];
    const hW = tw(1.2);
    const hH = th(1.1);
    for (const h of houses) {
      const mx = IX + (h.tx * ts / this.mapW) * MM_W;
      const my = IY + (h.ty * ts / this.mapH) * MM_H;
      g.fillStyle(h.flower ? C_FLOWER : h.cafe ? C_CAFE : C_HOUSE, 1);
      g.fillRect(mx - hW / 2, my - hH / 2, hW, hH);
    }

    // 6. Minimap border clip (re-draw frame on top of terrain)
    g.lineStyle(1, 0x556677, 0.8);
    g.strokeRect(IX, IY, MM_W, MM_H);
  }

  private drawDots(
    playerX: number,
    playerY: number,
    rika: NPC,
    townNPCs: NPC[],
  ): void {
    const g = this.g;

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
    g.fillStyle(0xff88cc, 1);
    const rp = toMM(rika.sprite.x, rika.sprite.y);
    g.fillCircle(rp.x, rp.y, 2);

    // Player — bright dot with small glow
    const pp = toMM(playerX, playerY);
    g.fillStyle(0xffee88, 0.3);
    g.fillCircle(pp.x, pp.y, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(pp.x, pp.y, 2);
  }

  private drawZoneMarkers(): void {
    if (this.zoneMarkers.length === 0) return;
    const g = this.g;

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

  private updateInfo(playerX: number, playerY: number, isRaining: boolean): void {
    const time = gameManager.time;
    const rel  = gameManager.relationships.get('rika');

    const timeStr    = formatTime(time.hour, time.minute);
    const periodStr  = time.period.replace('_', ' ');
    const weatherStr = isRaining ? 'Rain' : 'Clear';
    const relStage   = rel?.stage   ?? '?';
    const affection  = rel?.affection ?? 0;

    // Line 0: day + time
    this.texts[0].setText(`Day ${time.day}  ${timeStr}`);

    // Line 1: period + weather
    this.texts[1].setText(`${periodStr}  ${weatherStr}`);

    // Line 2: position
    this.texts[2].setText(`${Math.round(playerX)}, ${Math.round(playerY)}`);

    // Line 3: rika status
    this.texts[3].setText(`Rika [${relStage}] ♥${affection}`);

    // Tint time text based on period
    const col = this.periodColour(time.period);
    this.texts[0].setColor(col);
    this.texts[1].setColor(col);
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
