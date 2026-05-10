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

    // === TILESETS ===
    this.load.image(TEXTURE_KEYS.TILESET_BRONGWOOD, 'assets/sprites/tileset/1 Tiles/FieldsTileset.png');

    // === LAND / BEACH TILES ===
    const land = 'assets/tilemaps/land';
    this.load.image('land-floor-2', `${land}/Floors_Tiles 2.png`);
    this.load.image('land-floor-3', `${land}/Floors_Tiles 3.png`);
    this.load.image('land-floor-4', `${land}/Floors_Tiles 4.png`);
    this.load.image('land-bridge-small', `${land}/jembatan_kecil.png`);
    this.load.image('land-bridge-small-left', `${land}/jembatan_kecil_sisi_kiri.png`);
    this.load.image('land-bridge-small-right', `${land}/jembatan_kecil_sisi_kanan.png`);
    this.load.image('land-water-2', `${land}/Water_tiles 2.png`);
    this.load.image('land-water-3', `${land}/Water_tiles 3.png`);
    this.load.image('land-water-4', `${land}/Water_tiles 4.png`);

    // === HOUSE INTERIOR (individual object PNGs) ===
    const houseV2 = 'assets/tilemaps/house';
    this.load.image('house2-bangku-semen', `${houseV2}/bangku_semen_1.png`);
    this.load.image('house2-bangku-taman', `${houseV2}/bangku_taman.png`);
    this.load.image('house2-buffet', `${houseV2}/buffet_1.png`);
    this.load.image('house2-genteng', `${houseV2}/genteng_1.png`);
    this.load.image('house2-genteng-horizontal', `${houseV2}/genteng_horizontal_1.png`);
    this.load.image('house2-genteng-kayu-tengah', `${houseV2}/genteng_kayu_tengah_1.png`);
    this.load.image('house2-house-1', `${houseV2}/house_1.png`);
    this.load.image('house2-rumah-indo-1', `${houseV2}/rumah_indo_1.png`);
    this.load.image('house2-rumah-indo-2', `${houseV2}/rumah_indo_2.png`);
    this.load.image('house2-jendela-kaca', `${houseV2}/jendela_kaca_1.png`);
    this.load.image('house2-kasur', `${houseV2}/kasur_1.png`);
    this.load.image('house2-lemari-buku', `${houseV2}/lemari_buku_1.png`);
    this.load.image('house2-meja-horizontal', `${houseV2}/meja_kayu_horizontal_1.png`);
    this.load.image('house2-meja-vertical', `${houseV2}/meja_kayu_vertical_1.png`);
    this.load.image('house2-pintu-kayu', `${houseV2}/pintu_kayu_1.png`);
    this.load.image('house2-pintu-lorong-1', `${houseV2}/pintu_lorong_1.png`);
    this.load.image('house2-pintu-lorong-2', `${houseV2}/pintu_lorong_2.png`);
    this.load.image('house2-tanaman', `${houseV2}/tanaman_1.png`);
    this.load.image('house2-tembok-kayu', `${houseV2}/tembok_kayu_1.png`);
    this.load.image('house2-tempat-bunga', `${houseV2}/tempat_bunga_kayu_1.png`);

    // === FARM / CROPS ===
    const farm = 'assets/tilemaps/farm';
    this.load.image('farm-tile-2', `${farm}/tilemap_farm_2.png`);
    const carrotFiles = [
      'bibit_wortel', 'wortel_1', 'wortel_2', 'wortel_3', 'wortel_4', 'wortel_5',
      'wortel_5_busuk', 'wortel_busuk', 'wortel', 'box_wortel',
      'karung_wortel', 'karung_wortel_buka',
    ];
    for (const name of carrotFiles) {
      this.load.image(`farm-${name}`, `${farm}/wortel/${name}.png`);
    }
    const onionFiles = [
      'bibit_bawang_merah', 'bawang_merah_1', 'bawang_merah_2', 'bawang_merah_3',
      'bawang_merah_4', 'bawang_merah_5', 'bawang_merah_6', 'bawang_merah_7',
      'bawang_merah_6_busuk', 'bawang_merah_7_busuk', 'box_bawang_merah',
      'karung_bawang_merah', 'karung_bawang_merah_buka',
    ];
    for (const name of onionFiles) {
      this.load.image(`farm-${name}`, `${farm}/bawang/${name}.png`);
    }

    // === UTILITIES / INTERACTABLE OBJECTS ===
    const ember = 'assets/tilemaps/utilities/ember';
    const emberFiles = [
      'ember_1', 'ember_2', 'ember_2_1', 'ember_2_2',
      'ember_3_1', 'ember_3_2', 'ember_4_1', 'ember_4_2',
    ];
    for (const name of emberFiles) {
      this.load.image(`utility-${name}`, `${ember}/${name}.png`);
    }

    const utilityBox = 'assets/tilemaps/utilities/box';
    const utilityBoxFiles = [
      'box_1', 'box_2', 'box_3', 'box_4',
      'circle_box_1', 'circle_box_2', 'circle_box_3',
      'peti_1', 'peti_2',
    ];
    for (const name of utilityBoxFiles) {
      this.load.image(`utility-${name}`, `${utilityBox}/${name}.png`);
    }

    const utilityFence = 'assets/tilemaps/utilities/pagar';
    this.load.image('utility-pagar-horizontal', `${utilityFence}/pagar_horizontal.png`);
    this.load.image('utility-pagar-vertical-kecil', `${utilityFence}/pagar_vertical_kecil.png`);
    this.load.image('utility-pagar-vertical-panjang', `${utilityFence}/pagar_vertical_panjang.png`);

    const utilityChair = 'assets/tilemaps/utilities/kursi';
    this.load.image('utility-kursi-horizontal', `${utilityChair}/kursi_kayu_horizontal.png`);
    this.load.image('utility-kursi-vertical', `${utilityChair}/kursi_kayu_vertical.png`);

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

    // Trees from tilemaps/trees. Do not load dry_tree variants for gameplay trees.
    const treeAssets = 'assets/tilemaps/trees';
    for (let i = 1; i <= 4; i++) {
      this.load.image(`tile-tree-${i}`, `${treeAssets}/tree_${i}.png`);
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

    // Generate 10 NPC placeholder sprites (different colors)
    this.generateNPCSprites();

    // Register any additional animations from registry
    AssetLoader.registerAnimations(this);

    this.scene.start(SCENE_KEYS.MAIN_MENU);
  }

  /**
   * Generate colored placeholder sprites for 10 NPCs.
   * Each NPC gets a unique body color. 4 frames x 4 directions.
   */
  private generateNPCSprites(): void {
    // Skip if already generated
    if (this.textures.exists(TEXTURE_KEYS.NPC_BAKER)) return;

    const npcColors: Array<{ key: string; body: string; hair: string }> = [
      { key: TEXTURE_KEYS.NPC_BAKER, body: '#d4885a', hair: '#5a3020' },
      { key: TEXTURE_KEYS.NPC_FISHER, body: '#5a88b8', hair: '#404040' },
      { key: TEXTURE_KEYS.NPC_ELDER, body: '#8a7090', hair: '#c0c0c0' },
      { key: TEXTURE_KEYS.NPC_GIRL, body: '#e8a0c0', hair: '#3a2020' },
      { key: TEXTURE_KEYS.NPC_BOY, body: '#70b870', hair: '#4a3020' },
      { key: TEXTURE_KEYS.NPC_MERCHANT, body: '#c8a840', hair: '#2a2020' },
      { key: TEXTURE_KEYS.NPC_FARMER, body: '#7a9050', hair: '#5a4030' },
      { key: TEXTURE_KEYS.NPC_ARTIST, body: '#b070c0', hair: '#1a1a30' },
      { key: TEXTURE_KEYS.NPC_POSTMAN, body: '#4080c0', hair: '#3a3030' },
      { key: TEXTURE_KEYS.NPC_LIBRARIAN, body: '#6a8a8a', hair: '#2a1a20' },
    ];

    const fw = 32;
    const fh = 32;
    const cols = 4; // walk frames
    const rows = 4; // directions

    for (const npc of npcColors) {
      const canvas = this.textures.createCanvas(npc.key, fw * cols, fh * rows);
      if (!canvas) continue;

      const ctx = canvas.getContext();

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * fw;
          const y = row * fh;
          const bounce = (col === 1 || col === 3) ? -1 : 0;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 30, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.fillStyle = npc.body;
          ctx.fillRect(x + 10, y + 14 + bounce, 12, 14);

          // Head
          ctx.fillStyle = '#f0c8a0';
          ctx.fillRect(x + 11, y + 4 + bounce, 10, 10);

          // Hair
          ctx.fillStyle = npc.hair;
          ctx.fillRect(x + 10, y + 2 + bounce, 12, 6);

          // Eyes (front-facing only)
          if (row === 0) {
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 13, y + 9 + bounce, 2, 2);
            ctx.fillRect(x + 17, y + 9 + bounce, 2, 2);
          }

          // Legs
          ctx.fillStyle = '#4a4a5a';
          const legOff = (col % 2 === 0) ? 0 : 1;
          ctx.fillRect(x + 11, y + 27 + bounce, 4, 4 - legOff);
          ctx.fillRect(x + 17, y + 27 + bounce + legOff, 4, 4 - legOff);
        }
      }

      canvas.refresh();

      // Register frames
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          this.textures.get(npc.key).add(row * cols + col, 0, col * fw, row * fh, fw, fh);
        }
      }

      // Create animations
      for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
        const dir = DIRECTIONS[dirIdx];
        const gameDir = DIR_TO_KEY[dir];
        const startFrame = dirIdx * cols;

        this.anims.create({
          key: `${npc.key}-walk-${gameDir}`,
          frames: this.anims.generateFrameNumbers(npc.key, { start: startFrame, end: startFrame + cols - 1 }),
          frameRate: 8,
          repeat: -1,
        });

        this.anims.create({
          key: `${npc.key}-idle-${gameDir}`,
          frames: [{ key: npc.key, frame: startFrame }],
          frameRate: 1,
          repeat: 0,
        });
      }
    }
  }

  /**
   * Build a spritesheet from individual animation frame PNGs.
   * Layout: 6 columns (walk frames) x 4 rows (south/north/west/east)
   * + 1 extra row for idle frames (4 idle frames in row 4)
   * 
   * Total: 6 cols x 5 rows
   */
  private buildCharacterSpritesheet(textureKey: string, charId: string, frameSize: number): void {
    // Skip if already built (prevents error on scene restart)
    if (this.textures.exists(textureKey)) return;

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
          const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
          if (src) ctx.drawImage(src, col * fw, rowIdx * fh, fw, fh);
        }
      }
    }

    // Row 4: Idle frames (one per direction, spread across columns 0-3)
    for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
      const dir = DIRECTIONS[dirIdx];
      const imgKey = `${charId}-idle-${dir}`;
      const tex = this.textures.get(imgKey);
      if (tex && tex.key !== '__MISSING') {
        const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
        if (src) ctx.drawImage(src, dirIdx * fw, 4 * fh, fw, fh);
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
    // Skip if animations already exist
    if (this.anims.exists(`${charId}-walk-down`)) return;

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
