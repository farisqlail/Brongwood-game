/**
 * PreloadScene - Loads real character animation frames and builds spritesheets.
 * 
 * Lail: 88x88, 6 frames per direction, animation ID: animation-9bfaed7f
 * Rika: 92x92, 6 frames per direction, animation ID: animation-c3630455
 */

import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG } from '@config/game.config';
import { AssetLoader } from '@/core/AssetLoader';
import { PlaceholderAssets } from '@utils/PlaceholderAssets';
import { TEXTURE_KEYS } from '@config/assets.manifest';

// Animation frame count per direction
const FRAMES_PER_DIR = 6;

// Directions we use for gameplay (4 cardinal)
const DIRECTIONS = ['south', 'north', 'west', 'east'] as const;
const DIR_TO_KEY = { south: 'down', north: 'up', west: 'left', east: 'right' } as const;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    this.createLoadingBar();
    AssetLoader.loadAll(this);

    // === TILESET ===
    this.load.image(TEXTURE_KEYS.TILESET_BRONGWOOD, 'assets/sprites/tileset/1 Tiles/FieldsTileset.png');

    // Shadow (1-6) — used as grass/ground cover
    for (let i = 1; i <= 6; i++) {
      this.load.image(`shadow-${i}`, `assets/sprites/tileset/2 Objects/1 Shadow/${i}.png`);
    }

    // Grass (1-6) — additional grass variety
    for (let i = 1; i <= 6; i++) {
      this.load.image(`grass-${i}`, `assets/sprites/tileset/2 Objects/5 Grass/${i}.png`);
    }

    // Stone (1-6)
    for (let i = 1; i <= 6; i++) {
      this.load.image(`stone-${i}`, `assets/sprites/tileset/2 Objects/2 Stone/${i}.png`);
    }

    // Decor/Trees (1-17)
    for (let i = 1; i <= 17; i++) {
      this.load.image(`decor-${i}`, `assets/sprites/tileset/2 Objects/3 Decor/${i}.png`);
    }

    // Box (1-5)
    for (let i = 1; i <= 5; i++) {
      this.load.image(`box-${i}`, `assets/sprites/tileset/2 Objects/4 Box/${i}.png`);
    }

    // Houses (1-4)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`house-${i}`, `assets/sprites/tileset/2 Objects/7 House/${i}.png`);
    }

    // === LAIL walk animation frames ===
    const lailAnimId = 'animation-9bfaed7f';
    for (const dir of DIRECTIONS) {
      for (let i = 0; i < FRAMES_PER_DIR; i++) {
        const key = `lail-walk-${dir}-${i}`;
        const path = `assets/sprites/characters/lail/animations/${lailAnimId}/${dir}/frame_${String(i).padStart(3, '0')}.png`;
        this.load.image(key, path);
      }
    }
    for (const dir of DIRECTIONS) {
      this.load.image(`lail-idle-${dir}`, `assets/sprites/characters/lail/rotations/${dir}.png`);
    }

    // === RIKA walk animation frames ===
    const rikaAnimId = 'animation-c3630455';
    for (const dir of DIRECTIONS) {
      for (let i = 0; i < FRAMES_PER_DIR; i++) {
        const key = `rika-walk-${dir}-${i}`;
        const path = `assets/sprites/characters/rika/animations/${rikaAnimId}/${dir}/frame_${String(i).padStart(3, '0')}.png`;
        this.load.image(key, path);
      }
    }
    for (const dir of DIRECTIONS) {
      this.load.image(`rika-idle-${dir}`, `assets/sprites/characters/rika/rotations/${dir}.png`);
    }
  }

  create(): void {
    // Tileset loaded from real PNG (FieldsTileset.png) — no placeholder generation needed

    // Build character spritesheets from real animation frames
    this.buildCharacterSpritesheet(TEXTURE_KEYS.PLAYER, 'lail', 88);
    this.buildCharacterSpritesheet(TEXTURE_KEYS.RIKA, 'rika', 92);

    // Create animations
    this.createCharacterAnimations(TEXTURE_KEYS.PLAYER, 'lail');
    this.createCharacterAnimations(TEXTURE_KEYS.RIKA, 'rika');

    // Register any additional animations from registry
    AssetLoader.registerAnimations(this);

    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }

  /**
   * Build a spritesheet from individual animation frame PNGs.
   * Layout: 6 columns (walk frames) x 4 rows (south/north/west/east)
   * + 1 extra row for idle frames (4 idle frames in row 4)
   * 
   * Total: 6 cols x 5 rows
   */
  private buildCharacterSpritesheet(textureKey: string, charId: string, frameSize: number): void {
    const cols = FRAMES_PER_DIR; // 6
    const rows = 5; // 4 walk directions + 1 idle row
    const fw = frameSize;
    const fh = frameSize;

    const canvas = this.textures.createCanvas(textureKey, fw * cols, fh * rows);
    if (!canvas) return;

    const ctx = canvas.getContext();

    // Rows 0-3: Walk animation frames (south, north, west, east)
    for (let rowIdx = 0; rowIdx < DIRECTIONS.length; rowIdx++) {
      const dir = DIRECTIONS[rowIdx];
      for (let col = 0; col < FRAMES_PER_DIR; col++) {
        const imgKey = `${charId}-walk-${dir}-${col}`;
        const tex = this.textures.get(imgKey);
        if (tex && tex.key !== '__MISSING') {
          const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          ctx.drawImage(src, col * fw, rowIdx * fh, fw, fh);
        }
      }
    }

    // Row 4: Idle frames (one per direction, spread across columns 0-3)
    for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
      const dir = DIRECTIONS[dirIdx];
      const imgKey = `${charId}-idle-${dir}`;
      const tex = this.textures.get(imgKey);
      if (tex && tex.key !== '__MISSING') {
        const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        ctx.drawImage(src, dirIdx * fw, 4 * fh, fw, fh);
      }
    }

    canvas.refresh();

    // Register all frames
    let frameIndex = 0;
    for (let row = 0; row < rows; row++) {
      const colCount = row === 4 ? DIRECTIONS.length : cols;
      for (let col = 0; col < colCount; col++) {
        this.textures.get(textureKey).add(
          frameIndex, 0, col * fw, row * fh, fw, fh
        );
        frameIndex++;
      }
    }
  }

  /**
   * Create walk and idle animations from the built spritesheet.
   * Walk: 6 real animation frames per direction (rows 0-3)
   * Idle: 1 static frame per direction (row 4)
   */
  private createCharacterAnimations(textureKey: string, charId: string): void {
    const walkFramesPerRow = FRAMES_PER_DIR; // 6

    for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
      const dir = DIRECTIONS[dirIdx];
      const gameDir = DIR_TO_KEY[dir]; // south→down, north→up, etc.
      const walkStartFrame = dirIdx * walkFramesPerRow;

      // Walk animation: 6 real frames, looping
      this.anims.create({
        key: `${charId}-walk-${gameDir}`,
        frames: this.anims.generateFrameNumbers(textureKey, {
          start: walkStartFrame,
          end: walkStartFrame + walkFramesPerRow - 1,
        }),
        frameRate: 10,
        repeat: -1,
      });

      // Idle animation: single frame from row 4
      const idleFrame = (4 * walkFramesPerRow) + dirIdx; // row 4, column = dirIdx
      this.anims.create({
        key: `${charId}-idle-${gameDir}`,
        frames: [{ key: textureKey, frame: idleFrame }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  private createLoadingBar(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    const barBg = this.add.rectangle(centerX, centerY, 200, 8, 0x222034);
    barBg.setOrigin(0.5);

    const barFill = this.add.rectangle(centerX - 98, centerY, 0, 4, 0xf2a65a);
    barFill.setOrigin(0, 0.5);

    const loadingText = this.add.text(centerX, centerY - 14, 'Loading...', {
      fontSize: '8px',
      color: '#f2a65a',
      fontFamily: 'monospace',
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      barFill.width = 196 * value;
    });

    this.load.on('complete', () => {
      barFill.destroy();
      barBg.destroy();
      loadingText.destroy();
    });
  }
}
