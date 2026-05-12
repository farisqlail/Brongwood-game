/**
 * VegetationSystem - Shadow as grass, decor/box/stone as props.
 * 
 * Layout:
 * - Jalanan utama: tile dari FieldsTileset (rows 4-5)
 * - Selain jalanan: Shadow sprites sebagai rumput
 * - Pernak-pernik: Decor, Box, Stone tersebar — semua punya collision
 * - Houses: 5 rumah dengan collision
 * - SEMUA object tidak bisa ditembus character
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';

interface AnimatedSprite {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  phase: number;
  swayAmount: number;
  swaySpeed: number;
}

export class VegetationSystem {
  private scene: Phaser.Scene;
  private animatedProps: AnimatedSprite[] = [];
  private staticProps: Phaser.GameObjects.GameObject[] = [];
  private time: number = 0;

  /** All collidable objects — player and NPCs cannot pass through */
  public collisionGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.collisionGroup = scene.physics.add.staticGroup();

    // Create a 1x1 transparent texture for invisible collision bodies
    if (!scene.textures.exists('_collider')) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x000000, 0);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture('_collider', 1, 1);
      gfx.destroy();
    }

    this.placeGrassGround();
    this.placeHouses();
    this.placeRikaFlowerShop();
    this.placeUpperIndonesianBuildings();
    this.placeIndonesianHouse();
    this.placeIndonesianHouse2();
    this.placeTilemapTrees();
    this.placeTilemapGroundDetails();
    this.placeDecor();
    this.placeStones();
    this.placeBoxes();
  }

  update(delta: number): void {
    this.time += delta * 0.001;

    for (const p of this.animatedProps) {
      const sway = Math.sin(this.time * p.swaySpeed + p.phase) * p.swayAmount;
      p.sprite.setX(p.baseX + sway);
    }
  }

  destroy(): void {
    for (const p of this.animatedProps) p.sprite.destroy();
    for (const p of this.staticProps) p.destroy();
    this.collisionGroup.destroy(true);
    this.animatedProps = [];
    this.staticProps = [];
  }

  // ============================================================
  // SHADOW as grass ground cover (no collision, just visual)
  // Covers all area EXCEPT the road (rows 4-5)
  // ============================================================

  private placeGrassGround(): void {
    const ts = GAME_CONFIG.TILE_SIZE;
    const mapW = 15 * ts;
    const mapH = 10 * ts;

    // Check if shadow textures are available
    if (!this.scene.textures.exists('shadow-1')) return;

    // 80% coverage with shadow sprites as grass
    for (let i = 0; i < 9000; i++) {
      const x = ts * 0.3 + Math.random() * (mapW - ts * 0.6);
      const y = ts * 0.3 + Math.random() * (mapH - ts * 0.6);

      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const variant = Phaser.Math.Between(1, 6);
      const key = `shadow-${variant}`;

      // Use graphics rectangle as fallback if texture not available
      const tex = this.scene.textures.get(key);
      if (!tex || tex.key === '__MISSING' || !tex.getSourceImage()) {
        // Fallback: green rectangle
        const rect = this.scene.add.rectangle(x, y, 10, 10, 0x4a7a4a, 0.3);
        rect.setDepth(DEPTH.GROUND_DECOR);
        this.staticProps.push(rect);
        continue;
      }

      const sprite = this.scene.add.image(x, y, key);
      sprite.setDepth(DEPTH.GROUND_DECOR);
      sprite.setScale(0.4 + Math.random() * 0.5);
      sprite.setAlpha(0.75 + Math.random() * 0.25);
      this.staticProps.push(sprite);
    }

    // Add actual grass sprites on top for variety.
    // These are intentionally more visible than shadow ground cover, but still avoid the main road.
    if (!this.scene.textures.exists('grass-1')) return;

    for (let i = 0; i < 180; i++) {
      const x = ts * 1 + Math.random() * (mapW - ts * 2);
      const y = ts * 1 + Math.random() * (mapH - ts * 2);

      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const variant = Phaser.Math.Between(1, 6);
      const key = `grass-${variant}`;
      const tex = this.scene.textures.get(key);
      if (!tex || tex.key === '__MISSING' || !tex.getSourceImage()) continue;

      const sprite = this.scene.add.image(x, y, key);
      sprite.setDepth(DEPTH.GROUND_DECOR + 1);
      sprite.setScale(0.28 + Math.random() * 0.36);
      sprite.setAlpha(0.78 + Math.random() * 0.22);
      this.staticProps.push(sprite);

      if (i % 2 === 0) {
        this.animatedProps.push({
          sprite,
          baseX: x,
          baseY: y,
          phase: Math.random() * Math.PI * 2,
          swayAmount: 0.25 + Math.random() * 0.35,
          swaySpeed: 0.7 + Math.random() * 0.6,
        });
      }
    }

    // Denser grass clusters near the top and bottom fields so the town feels less empty.
    const clusterRows = [2.7, 3.35, 6.45, 7.15, 8.7];
    for (let i = 0; i < 140; i++) {
      const row = clusterRows[i % clusterRows.length];
      const x = ts * 0.5 + Math.random() * (mapW - ts);
      const y = ts * row + (Math.random() - 0.5) * ts * 0.45;

      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const variant = Phaser.Math.Between(1, 6);
      const key = `grass-${variant}`;
      const tex = this.scene.textures.get(key);
      if (!tex || tex.key === '__MISSING' || !tex.getSourceImage()) continue;

      const sprite = this.scene.add.image(x, y, key);
      sprite.setDepth(DEPTH.GROUND_DECOR + 1);
      sprite.setScale(0.22 + Math.random() * 0.28);
      sprite.setAlpha(0.65 + Math.random() * 0.25);
      this.staticProps.push(sprite);

      this.animatedProps.push({
        sprite,
        baseX: x,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        swayAmount: 0.2 + Math.random() * 0.25,
        swaySpeed: 0.55 + Math.random() * 0.45,
      });
    }
  }

  // ============================================================
  // 5 HOUSES — collision enabled
  // ============================================================

  private placeHouses(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    const houses: Array<{ x: number; y: number; variant: number; scale: number }> = [
      { x: ts * 7.5, y: ts * 1.5, variant: 2, scale: 0.8 },
      { x: ts * 4, y: ts * 8, variant: 4, scale: 0.7 },
    ];

    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      const key = `house-${h.variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(h.x, h.y, key);
      sprite.setScale(h.scale);
      sprite.setDepth(h.y);
      sprite.setOrigin(0.5, 0.7);
      this.staticProps.push(sprite);

      // Label + entrance indicator for the cafe (middle top house)
      if (i === 0) {
        const label = this.scene.add.text(h.x, h.y - 30 * h.scale, 'CAFE', {
          fontSize: '7px',
          color: '#f2a65a',
          fontFamily: 'monospace',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 2 },
        });
        label.setOrigin(0.5);
        label.setDepth(DEPTH.ABOVE_PLAYER + 1);

        // Pulsing entrance arrow below cafe
        const arrow = this.scene.add.text(h.x, h.y + 20 * h.scale, 'v ENTER v', {
          fontSize: '5px',
          color: '#f2a65a',
          fontFamily: 'monospace',
        });
        arrow.setOrigin(0.5);
        arrow.setDepth(DEPTH.ABOVE_PLAYER + 1);
        this.scene.tweens.add({
          targets: arrow,
          alpha: 0.3,
          y: arrow.y + 3,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }

      // Collision body
      const col = this.collisionGroup.create(h.x, h.y + 8, '_collider') as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(55 * h.scale, 35 * h.scale);
      col.refreshBody();
    }
  }

  private placeRikaFlowerShop(): void {
    const key = 'house2-toko-rika';
    if (!this.scene.textures.exists(key)) return;

    const ts = GAME_CONFIG.TILE_SIZE;
    const x = ts * 12.25;
    const y = ts * 2.15;
    const scale = 0.16;

    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(scale);
    sprite.setOrigin(0.5, 0.76);
    sprite.setDepth(y);
    this.staticProps.push(sprite);

    const label = this.scene.add.text(x, y - 86, 'TOKO BUNGA RIKA', {
      fontSize: '7px',
      color: '#ffd6ec',
      fontFamily: 'monospace',
      backgroundColor: '#1a102088',
      padding: { x: 4, y: 2 },
    });
    label.setOrigin(0.5);
    label.setDepth(DEPTH.ABOVE_PLAYER + 1);
    this.staticProps.push(label);

    const col = this.collisionGroup.create(x - 4, y - 40, '_collider') as Phaser.Physics.Arcade.Sprite;
    col.setVisible(false);
    col.setDisplaySize(112, 88);
    col.refreshBody();
  }

  private placeIndonesianHouse2(): void {
    const key = 'house2-rumah-indo-2';
    if (!this.scene.textures.exists(key)) return;

    const ts = GAME_CONFIG.TILE_SIZE;
    const x = ts * 11;
    const y = ts * 8.5;
    const scale = 0.20;

    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(scale);
    sprite.setOrigin(0.5, 0.76);
    sprite.setDepth(y);
    this.staticProps.push(sprite);

    const col = this.collisionGroup.create(x - 4, y - 40, '_collider') as Phaser.Physics.Arcade.Sprite;
    col.setVisible(false);
    col.setDisplaySize(132, 104);
    col.refreshBody();
  }

  private placeUpperIndonesianBuildings(): void {
    const ts = GAME_CONFIG.TILE_SIZE;
    const buildings = [
      { key: 'house2-rumah-indo-5', x: ts * 2.5, y: ts * 2.15, scale: 0.20 },
      { key: 'house2-rumah-indo-4', x: ts * 4.6, y: ts * 2.15, scale: 0.20 },
    ];

    for (const building of buildings) {
      if (!this.scene.textures.exists(building.key)) continue;

      const sprite = this.scene.add.image(building.x, building.y, building.key);
      sprite.setScale(building.scale);
      sprite.setOrigin(0.5, 0.76);
      sprite.setDepth(building.y);
      this.staticProps.push(sprite);

      const col = this.collisionGroup.create(
        building.x - 4,
        building.y - 40,
        '_collider',
      ) as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.setDisplaySize(132, 104);
      col.refreshBody();
    }
  }

  private placeIndonesianHouse(): void {
    const key = 'house2-rumah-indo-1';
    if (!this.scene.textures.exists(key)) return;

    const ts = GAME_CONFIG.TILE_SIZE;
    const x = ts * 7.5;
    const y = ts * 8.5;
    const scale = 0.20;

    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(scale);
    sprite.setOrigin(0.5, 0.76);
    sprite.setDepth(y);
    this.staticProps.push(sprite);

    const col = this.collisionGroup.create(x - 4, y - 40, '_collider') as Phaser.Physics.Arcade.Sprite;
    col.setVisible(false);
    col.setDisplaySize(132, 104);
    col.refreshBody();
  }

  // ============================================================
  // DECOR (trees/plants) — collision enabled, animated sway
  // ============================================================

  private placeTilemapTrees(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    const positions: Array<{
      x: number;
      y: number;
      key: string;
      scale: number;
      bodyW: number;
      bodyH: number;
      bodyOffsetY: number;
      swayAmount?: number;
    }> = [
      { x: ts * 1.15, y: ts * 1.6, key: 'tile-tree-5', scale: 0.34, bodyW: 34, bodyH: 24, bodyOffsetY: -4 },
      { x: ts * 13.85, y: ts * 1.55, key: 'tile-tree-6', scale: 0.42, bodyW: 28, bodyH: 22, bodyOffsetY: -2 },
      { x: ts * 1.1, y: ts * 8.85, key: 'tile-tree-6', scale: 0.38, bodyW: 26, bodyH: 20, bodyOffsetY: -2 },
      { x: ts * 13.7, y: ts * 8.8, key: 'tile-tree-5', scale: 0.30, bodyW: 30, bodyH: 22, bodyOffsetY: -3 },
      { x: ts * 6.0, y: ts * 2.85, key: 'tile-wood-tree-5', scale: 0.58, bodyW: 34, bodyH: 22, bodyOffsetY: 2, swayAmount: 0.15 },
      { x: ts * 9.1, y: ts * 7.25, key: 'tile-wood-tree-5', scale: 0.50, bodyW: 30, bodyH: 18, bodyOffsetY: 2, swayAmount: 0.15 },
      { x: ts * 12.65, y: ts * 6.75, key: 'tile-wood-tree-6', scale: 0.85, bodyW: 18, bodyH: 18, bodyOffsetY: 3, swayAmount: 0.1 },
      { x: ts * 2.65, y: ts * 7.45, key: 'tile-wood-tree-6', scale: 0.75, bodyW: 16, bodyH: 16, bodyOffsetY: 3, swayAmount: 0.1 },
    ];

    for (const pos of positions) {
      if (!this.scene.textures.exists(pos.key)) continue;

      const sprite = this.scene.add.image(pos.x, pos.y, pos.key);
      sprite.setScale(pos.scale);
      sprite.setOrigin(0.5, 0.88);
      sprite.setDepth(pos.y);
      this.staticProps.push(sprite);

      const col = this.collisionGroup.create(
        pos.x,
        pos.y + pos.bodyOffsetY,
        '_collider',
      ) as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(pos.bodyW, pos.bodyH);
      col.refreshBody();

      this.animatedProps.push({
        sprite,
        baseX: pos.x,
        baseY: pos.y,
        phase: Math.random() * Math.PI * 2,
        swayAmount: pos.swayAmount ?? (0.25 + Math.random() * 0.25),
        swaySpeed: 0.45 + Math.random() * 0.35,
      });
    }
  }

  private placeTilemapGroundDetails(): void {
    const ts = GAME_CONFIG.TILE_SIZE;
    const mapW = 15 * ts;
    const mapH = 10 * ts;

    const grassPatches: Array<{ x: number; y: number; key: string; scale: number }> = [
      { x: ts * 1.8, y: ts * 2.7, key: 'tile-rumput-besar-1', scale: 0.28 },
      { x: ts * 3.2, y: ts * 3.2, key: 'tile-rumput-besar-2', scale: 0.24 },
      { x: ts * 6.6, y: ts * 2.8, key: 'tile-rumput-besar-1', scale: 0.22 },
      { x: ts * 11.2, y: ts * 3.1, key: 'tile-rumput-besar-2', scale: 0.26 },
      { x: ts * 13.4, y: ts * 2.7, key: 'tile-rumput-besar-1', scale: 0.24 },
      { x: ts * 2.2, y: ts * 7.2, key: 'tile-rumput-besar-2', scale: 0.24 },
      { x: ts * 5.6, y: ts * 7.7, key: 'tile-rumput-besar-1', scale: 0.26 },
      { x: ts * 10.0, y: ts * 7.3, key: 'tile-rumput-besar-2', scale: 0.22 },
      { x: ts * 12.9, y: ts * 8.0, key: 'tile-rumput-besar-1', scale: 0.24 },
    ];

    for (const patch of grassPatches) {
      this.placeGroundDetail(patch.x, patch.y, patch.key, patch.scale, DEPTH.GROUND_DECOR + 2, true);
    }

    for (let i = 0; i < 90; i++) {
      const x = ts * 0.7 + Math.random() * (mapW - ts * 1.4);
      const y = ts * 0.8 + Math.random() * (mapH - ts * 1.6);
      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const key = `tile-rumput-${Phaser.Math.Between(1, 8)}`;
      this.placeGroundDetail(
        x,
        y,
        key,
        0.16 + Math.random() * 0.16,
        DEPTH.GROUND_DECOR + 2,
        i % 3 === 0,
      );
    }

    const stones: Array<{ x: number; y: number; key: string; scale: number; bodyW: number; bodyH: number }> = [
      { x: ts * 1.4, y: ts * 3.5, key: 'tile-batu-abu-1', scale: 0.28, bodyW: 20, bodyH: 14 },
      { x: ts * 3.1, y: ts * 6.7, key: 'tile-batu-coklat-2', scale: 0.34, bodyW: 18, bodyH: 12 },
      { x: ts * 5.7, y: ts * 3.55, key: 'tile-batu-abu-3', scale: 0.38, bodyW: 16, bodyH: 10 },
      { x: ts * 8.5, y: ts * 6.75, key: 'tile-batu-coklat-1', scale: 0.25, bodyW: 20, bodyH: 14 },
      { x: ts * 11.5, y: ts * 3.45, key: 'tile-batu-abu-2', scale: 0.34, bodyW: 18, bodyH: 12 },
      { x: ts * 13.3, y: ts * 6.8, key: 'tile-batu-coklat-3', scale: 0.36, bodyW: 16, bodyH: 10 },
      { x: ts * 6.4, y: ts * 8.35, key: 'tile-batu-abu-1', scale: 0.24, bodyW: 18, bodyH: 12 },
      { x: ts * 10.3, y: ts * 8.1, key: 'tile-batu-coklat-2', scale: 0.30, bodyW: 18, bodyH: 12 },
    ];

    for (const stone of stones) {
      if (!this.scene.textures.exists(stone.key)) continue;

      const sprite = this.scene.add.image(stone.x, stone.y, stone.key);
      sprite.setScale(stone.scale);
      sprite.setOrigin(0.5, 0.85);
      sprite.setDepth(stone.y);
      this.staticProps.push(sprite);

      const col = this.collisionGroup.create(stone.x, stone.y, '_collider') as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(stone.bodyW, stone.bodyH);
      col.refreshBody();
    }
  }

  private placeGroundDetail(
    x: number,
    y: number,
    key: string,
    scale: number,
    depth: number,
    animated: boolean,
  ): void {
    if (!this.scene.textures.exists(key)) return;

    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(scale);
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(depth);
    sprite.setAlpha(0.82 + Math.random() * 0.18);
    this.staticProps.push(sprite);

    if (!animated) return;

    this.animatedProps.push({
      sprite,
      baseX: x,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      swayAmount: 0.18 + Math.random() * 0.2,
      swaySpeed: 0.45 + Math.random() * 0.35,
    });
  }

  private placeDecor(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    const positions: Array<{ x: number; y: number; variant: number; scale: number }> = [
      // Left side
      { x: ts * 0.7, y: ts * 3, variant: 1, scale: 0.55 },
      { x: ts * 0.5, y: ts * 6.5, variant: 5, scale: 0.5 },
      // Right side
      { x: ts * 14.3, y: ts * 3, variant: 3, scale: 0.55 },
      { x: ts * 14.5, y: ts * 7, variant: 7, scale: 0.5 },
      // Near houses
      { x: ts * 5, y: ts * 3, variant: 9, scale: 0.4 },
      { x: ts * 10, y: ts * 3, variant: 11, scale: 0.4 },
      // Bottom area
      { x: ts * 7.5, y: ts * 9, variant: 2, scale: 0.45 },
      { x: ts * 2, y: ts * 6.5, variant: 4, scale: 0.4 },
      { x: ts * 13, y: ts * 6, variant: 6, scale: 0.4 },
    ];

    for (const pos of positions) {
      const key = `decor-${pos.variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(pos.x, pos.y, key);
      sprite.setScale(pos.scale);
      sprite.setDepth(pos.y);
      this.staticProps.push(sprite);

      // Collision
      const col = this.collisionGroup.create(pos.x, pos.y, '_collider') as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(20 * pos.scale, 15 * pos.scale);
      col.refreshBody();

      // Animated sway
      this.animatedProps.push({
        sprite,
        baseX: pos.x,
        baseY: pos.y,
        phase: Math.random() * Math.PI * 2,
        swayAmount: 0.4 + Math.random() * 0.4,
        swaySpeed: 0.8 + Math.random() * 0.5,
      });
    }
  }

  // ============================================================
  // STONES — collision enabled
  // ============================================================

  private placeStones(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    const positions: Array<{ x: number; y: number; variant: number; scale: number }> = [
      { x: ts * 3.5, y: ts * 6, variant: 1, scale: 0.5 },
      { x: ts * 11.5, y: ts * 6.5, variant: 3, scale: 0.45 },
      { x: ts * 6, y: ts * 7.5, variant: 5, scale: 0.4 },
      { x: ts * 9, y: ts * 3.5, variant: 2, scale: 0.4 },
    ];

    for (const pos of positions) {
      const key = `stone-${pos.variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(pos.x, pos.y, key);
      sprite.setScale(pos.scale);
      sprite.setDepth(pos.y);
      this.staticProps.push(sprite);

      // Collision
      const col = this.collisionGroup.create(pos.x, pos.y, '_collider') as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(16 * pos.scale, 12 * pos.scale);
      col.refreshBody();
    }
  }

  // ============================================================
  // BOXES — surround each house (like fences/crates around buildings)
  // ============================================================

  private placeBoxes(): void {
    const ts = GAME_CONFIG.TILE_SIZE;
    const boxScale = 1;

    // House positions (same as placeHouses)
    const housePositions = [
      { x: ts * 2.5, y: ts * 1.5, skipBoxes: false },
      { x: ts * 7.5, y: ts * 1.5, skipBoxes: false },
      { x: ts * 12.5, y: ts * 1.5, skipBoxes: false },
      { x: ts * 4, y: ts * 8, skipBoxes: true },
      { x: ts * 11, y: ts * 8, skipBoxes: false },
    ];

    // Place boxes around each house (left, right, and front)
    for (let hIdx = 0; hIdx < housePositions.length; hIdx++) {
      const h = housePositions[hIdx];
      if (h.skipBoxes) continue;

      const offsets = [
        { dx: -80, dy: 10 },   // left
        { dx: 80, dy: 10 },    // right
        { dx: -80, dy: -10 },  // left-back
        { dx: 80, dy: -10 },   // right-back
        { dx: -20, dy: 25 },   // front-left
        { dx: 20, dy: 25 },    // front-right
      ];

      for (let i = 0; i < offsets.length; i++) {
        const bx = h.x + offsets[i].dx;
        const by = h.y + offsets[i].dy;
        const variant = ((hIdx + i) % 5) + 1;
        const key = `box-${variant}`;
        if (!this.scene.textures.exists(key)) continue;

        const sprite = this.scene.add.image(bx, by, key);
        sprite.setScale(boxScale);
        sprite.setDepth(by);
        this.staticProps.push(sprite);

        // Collision
        const col = this.collisionGroup.create(bx, by, '_collider') as Phaser.Physics.Arcade.Sprite;
        col.setVisible(false);
        col.body!.setSize(14, 10);
        col.refreshBody();
      }
    }
  }
}

