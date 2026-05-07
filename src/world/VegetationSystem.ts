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

    // 80% coverage with shadow sprites as grass (dense, ~150 sprites)
    for (let i = 0; i < 9000; i++) {
      const x = ts * 0.3 + Math.random() * (mapW - ts * 0.6);
      const y = ts * 0.3 + Math.random() * (mapH - ts * 0.6);

      // Skip road (rows 4-5)
      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const variant = Phaser.Math.Between(1, 6);
      const key = `shadow-${variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(x, y, key);
      sprite.setDepth(DEPTH.GROUND_DECOR);
      sprite.setScale(0.4 + Math.random() * 0.5);
      sprite.setAlpha(0.75 + Math.random() * 0.25);
      this.staticProps.push(sprite);
    }

    // Add some actual grass sprites on top for variety (~20)
    for (let i = 0; i < 20; i++) {
      const x = ts * 1 + Math.random() * (mapW - ts * 2);
      const y = ts * 1 + Math.random() * (mapH - ts * 2);

      const tileY = Math.floor(y / ts);
      if (tileY >= 4 && tileY <= 5) continue;

      const variant = Phaser.Math.Between(1, 6);
      const key = `grass-${variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(x, y, key);
      sprite.setDepth(DEPTH.GROUND_DECOR + 1);
      sprite.setScale(0.35 + Math.random() * 0.3);
      this.staticProps.push(sprite);
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

    for (const h of houses) {
      const key = `house-${h.variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(h.x, h.y, key);
      sprite.setScale(h.scale);
      sprite.setDepth(h.y);
      sprite.setOrigin(0.5, 0.7);
      this.staticProps.push(sprite);

      // Collision
      const col = this.collisionGroup.create(h.x, h.y + 8, undefined) as Phaser.Physics.Arcade.Sprite;
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
      const col = this.collisionGroup.create(pos.x, pos.y, undefined) as Phaser.Physics.Arcade.Sprite;
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
      const col = this.collisionGroup.create(pos.x, pos.y, undefined) as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(16 * pos.scale, 12 * pos.scale);
      col.refreshBody();
    }
  }

  // ============================================================
  // BOXES — collision enabled
  // ============================================================

  private placeBoxes(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    const positions: Array<{ x: number; y: number; variant: number; scale: number }> = [
      { x: ts * 4.5, y: ts * 2.5, variant: 1, scale: 0.45 },
      { x: ts * 10.5, y: ts * 2.5, variant: 3, scale: 0.45 },
      { x: ts * 6.5, y: ts * 8.5, variant: 2, scale: 0.4 },
      { x: ts * 8.5, y: ts * 7, variant: 4, scale: 0.4 },
      { x: ts * 1.5, y: ts * 8.5, variant: 5, scale: 0.4 },
    ];

    for (const pos of positions) {
      const key = `box-${pos.variant}`;
      if (!this.scene.textures.exists(key)) continue;

      const sprite = this.scene.add.image(pos.x, pos.y, key);
      sprite.setScale(pos.scale);
      sprite.setDepth(pos.y);
      this.staticProps.push(sprite);

      // Collision
      const col = this.collisionGroup.create(pos.x, pos.y, undefined) as Phaser.Physics.Arcade.Sprite;
      col.setVisible(false);
      col.body!.setSize(18 * pos.scale, 14 * pos.scale);
      col.refreshBody();
    }
  }
}
