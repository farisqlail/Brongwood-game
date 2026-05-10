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
  private staticProps: Phaser.GameObjects.Image[] = [];
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
        this.staticProps.push(rect as unknown as Phaser.GameObjects.Image);
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
      { x: ts * 2.5, y: ts * 1.5, variant: 1, scale: 0.75 },
      { x: ts * 7.5, y: ts * 1.5, variant: 2, scale: 0.8 },
      { x: ts * 12.5, y: ts * 1.5, variant: 3, scale: 0.75 },
      { x: ts * 4, y: ts * 8, variant: 4, scale: 0.7 },
      { x: ts * 11, y: ts * 8, variant: 1, scale: 0.7 },
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

      // Label + entrance indicator for the cafe (house index 1 = middle top)
      if (i === 1) {
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

  // ============================================================
  // DECOR (trees/plants) — collision enabled, animated sway
  // ============================================================

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
      { x: ts * 2.5, y: ts * 1.5 },
      { x: ts * 7.5, y: ts * 1.5 },
      { x: ts * 12.5, y: ts * 1.5 },
      { x: ts * 4, y: ts * 8 },
      { x: ts * 11, y: ts * 8 },
    ];

    // Place boxes around each house (left, right, and front)
    for (let hIdx = 0; hIdx < housePositions.length; hIdx++) {
      const h = housePositions[hIdx];
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

