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
const NEW_LAIL_FRAME_WIDTH = 360;
const NEW_LAIL_FRAME_HEIGHT = 708;
const NEW_RIKA_FRAME_WIDTH = 244;
const NEW_RIKA_FRAME_HEIGHT = 428;

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

    // === PROLOGUE SCENES ===
    this.load.image(TEXTURE_KEYS.PROLOGUE_SCENE_1, 'assets/sceenes/sceene_1.png');
    this.load.image(TEXTURE_KEYS.PROLOGUE_SCENE_2, 'assets/sceenes/sceene_2.png');
    const earlyPrologueSceneShotCounts: Record<number, number> = { 1: 4, 2: 5 };
    for (const [sceneNumber, shotCount] of Object.entries(earlyPrologueSceneShotCounts)) {
      for (let i = 1; i <= shotCount; i++) {
        this.load.image(`prologue_scene_${sceneNumber}_${i}`, `assets/sceenes/scene_${sceneNumber}/shot_${i}.png`);
      }
    }
    for (let i = 1; i <= 6; i++) {
      const key = TEXTURE_KEYS[`PROLOGUE_SCENE_3_${i}` as keyof typeof TEXTURE_KEYS];
      this.load.image(key, `assets/sceenes/scene_3/shot_${i}.png`);
    }
    const prologueSceneShotCounts: Record<number, number> = { 4: 5, 5: 4, 6: 5 };
    for (const [sceneNumber, shotCount] of Object.entries(prologueSceneShotCounts)) {
      for (let i = 1; i <= shotCount; i++) {
        this.load.image(`prologue_scene_${sceneNumber}_${i}`, `assets/sceenes/scene_${sceneNumber}/shot_${i}.png`);
      }
    }

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
    this.load.image('house2-rumah-indo-3', `${houseV2}/rumah_indo_3.png`);
    this.load.image('house2-rumah-indo-4', `${houseV2}/rumah_indo_4.png`);
    this.load.image('house2-rumah-indo-5', `${houseV2}/rumah_indo_5.png`);
    this.load.image('house2-toko-indo-1', `${houseV2}/toko_indo_1.png`);
    this.load.image('house2-toko-rika', `${houseV2}/toko_rika.png`);
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
    const garlicFiles = [
      'bibit_bawang_putih', 'bawang_putih_1', 'bawang_putih_2', 'bawang_putih_3',
      'bawang_putih_4', 'bawang_putih_4_busuk', 'bawang_putih_5', 'bawang_putih_6',
      'bawang_putih_6_busuk', 'box_bawang_putih', 'karung_bawang_putih', 'karung_bawang_putih_buka',
    ];
    for (const name of garlicFiles) {
      this.load.image(`farm-${name}`, `${farm}/bawang_putih/${name}.png`);
    }
    const jasmineFiles = [
      'bibit_melati', 'melati_1', 'melati_2', 'melati_3', 'melati_4',
      'melati_4_busuk', 'melati_5', 'melati_6', 'melati_6_busuk',
      'box_melati', 'karung_melati', 'karung_melati_buka',
    ];
    for (const name of jasmineFiles) {
      this.load.image(`farm-${name}`, `${farm}/melati/${name}.png`);
    }
    const cabbageFiles = [
      'bibit_kubis', 'kubis_1', 'kubis_2', 'kubis_3', 'kubis_4',
      'kubis_4_busuk', 'kubis_5', 'kubis_6', 'kubis_6_busuk',
      'box_karung_kubis', 'karung_kubis', 'karung_kubis_buka',
    ];
    for (const name of cabbageFiles) {
      this.load.image(`farm-${name}`, `${farm}/kubis/${name}.png`);
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

    // === LAIL new character frames ===
    const lailNew = 'assets/sprites/characters/lail/new';
    const lailNewFiles = [
      'hadap_depan', 'hadap_belakang', 'hadap_kiri', 'hadap_kanan',
      'jalan_depan_1', 'jalan_depan_2',
      'jalan_belakang_1', 'jalan_belakang_2',
      'jalan_kiri_1', 'jalan_kiri_2', 'jalan_kiri_3',
      'jalan_kanan_1', 'jalan_kanan_2', 'jalan_kanan_3', 'jalan_kanan_4',
    ];
    for (const name of lailNewFiles) {
      this.load.image(`lail-new-${name}`, `${lailNew}/${name}.png`);
    }

    // === RIKA new character frames ===
    const rikaNew = 'assets/sprites/characters/rika/new';
    const rikaNewFiles = [
      'hadap_depan', 'hadap_belakang', 'hadap_kiri', 'hadap_kanan',
      'jalan_depan_1', 'jalan_depan_2', 'jalan_depan_3',
      'jalan_belakang_1', 'jalan_belakang_2', 'jalan_belakang_3', 'jalan_belakang_4',
      'jalan_kiri_1', 'jalan_kiri_2', 'jalan_kiri_3', 'jalan_kiri_4',
      'jalan_kanan_1', 'jalan_kanan_2', 'jalan_kanan_3', 'jalan_kanan_4',
    ];
    for (const name of rikaNewFiles) {
      this.load.image(`rika-new-${name}`, `${rikaNew}/${name}.png`);
    }
  }

  create(): void {
    // Tileset loaded from real PNG (FieldsTileset.png) — no placeholder generation needed

    // Build character spritesheets from real animation frames
    this.buildNewLailSpritesheet();
    this.buildNewRikaSpritesheet();

    // Create animations
    this.createNewLailAnimations();
    this.createNewRikaAnimations();

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

  private buildNewLailSpritesheet(): void {
    if (this.textures.exists(TEXTURE_KEYS.PLAYER)) return;

    const cols = 4;
    const rows = 5;
    const canvas = this.textures.createCanvas(
      TEXTURE_KEYS.PLAYER,
      NEW_LAIL_FRAME_WIDTH * cols,
      NEW_LAIL_FRAME_HEIGHT * rows,
    );
    if (!canvas) return;

    const ctx = canvas.getContext();
    const walkFrames: Record<string, string[]> = {
      south: ['jalan_depan_1', 'jalan_depan_2'],
      north: ['jalan_belakang_1', 'jalan_belakang_2'],
      west: ['jalan_kiri_1', 'jalan_kiri_2', 'jalan_kiri_3'],
      east: ['jalan_kanan_1', 'jalan_kanan_2', 'jalan_kanan_3', 'jalan_kanan_4'],
    };
    const idleFrames: Record<string, string> = {
      south: 'hadap_depan',
      north: 'hadap_belakang',
      west: 'hadap_kiri',
      east: 'hadap_kanan',
    };

    const getSourceImage = (sourceKey: string): HTMLImageElement | HTMLCanvasElement | null => {
      const tex = this.textures.get(`lail-new-${sourceKey}`);
      if (!tex || tex.key === '__MISSING') return null;

      return tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    };

    const idleTargetHeights: Record<string, number> = {
      south: getSourceImage(idleFrames.south)?.height ?? NEW_LAIL_FRAME_HEIGHT,
      north: getSourceImage(idleFrames.north)?.height ?? NEW_LAIL_FRAME_HEIGHT,
      west: getSourceImage(idleFrames.west)?.height ?? NEW_LAIL_FRAME_HEIGHT,
      east: getSourceImage(idleFrames.east)?.height ?? NEW_LAIL_FRAME_HEIGHT,
    };

    const drawFrame = (sourceKey: string, col: number, row: number, targetHeight?: number): void => {
      const src = getSourceImage(sourceKey);
      if (!src) return;

      const scale = targetHeight ? targetHeight / src.height : 1;
      const drawWidth = src.width * scale;
      const drawHeight = src.height * scale;
      const x = col * NEW_LAIL_FRAME_WIDTH + (NEW_LAIL_FRAME_WIDTH - drawWidth) / 2;
      const y = (row + 1) * NEW_LAIL_FRAME_HEIGHT - drawHeight;
      ctx.drawImage(src, x, y, drawWidth, drawHeight);
    };

    DIRECTIONS.forEach((dir, rowIdx) => {
      const frames = walkFrames[dir];
      frames.forEach((frame, col) => drawFrame(frame, col, rowIdx, idleTargetHeights[dir]));
    });

    DIRECTIONS.forEach((dir, col) => {
      drawFrame(idleFrames[dir], col, 4);
    });

    canvas.refresh();

    for (let row = 0; row < rows; row++) {
      const colCount = row === 4 ? DIRECTIONS.length : cols;
      for (let col = 0; col < colCount; col++) {
        this.textures.get(TEXTURE_KEYS.PLAYER).add(
          row * cols + col,
          0,
          col * NEW_LAIL_FRAME_WIDTH,
          row * NEW_LAIL_FRAME_HEIGHT,
          NEW_LAIL_FRAME_WIDTH,
          NEW_LAIL_FRAME_HEIGHT,
        );
      }
    }
  }

  private createNewLailAnimations(): void {
    if (this.anims.exists('lail-walk-down')) return;

    const walkFrameCounts: Record<string, number> = {
      south: 2,
      north: 2,
      west: 3,
      east: 4,
    };

    DIRECTIONS.forEach((dir, dirIdx) => {
      const gameDir = DIR_TO_KEY[dir];
      const rowStartFrame = dirIdx * 4;
      const frameCount = walkFrameCounts[dir];

      this.anims.create({
        key: `lail-walk-${gameDir}`,
        frames: this.anims.generateFrameNumbers(TEXTURE_KEYS.PLAYER, {
          start: rowStartFrame,
          end: rowStartFrame + frameCount - 1,
        }),
        frameRate: 7,
        repeat: -1,
      });

      this.anims.create({
        key: `lail-idle-${gameDir}`,
        frames: [{ key: TEXTURE_KEYS.PLAYER, frame: 16 + dirIdx }],
        frameRate: 1,
        repeat: 0,
      });
    });
  }

  private buildNewRikaSpritesheet(): void {
    if (this.textures.exists(TEXTURE_KEYS.RIKA)) return;

    const cols = 4;
    const rows = 5;
    const canvas = this.textures.createCanvas(
      TEXTURE_KEYS.RIKA,
      NEW_RIKA_FRAME_WIDTH * cols,
      NEW_RIKA_FRAME_HEIGHT * rows,
    );
    if (!canvas) return;

    const ctx = canvas.getContext();
    const walkFrames: Record<string, string[]> = {
      south: ['jalan_depan_1', 'jalan_depan_2', 'jalan_depan_3'],
      north: ['jalan_belakang_1', 'jalan_belakang_2', 'jalan_belakang_3', 'jalan_belakang_4'],
      west: ['jalan_kiri_1', 'jalan_kiri_2', 'jalan_kiri_3', 'jalan_kiri_4'],
      east: ['jalan_kanan_1', 'jalan_kanan_2', 'jalan_kanan_3', 'jalan_kanan_4'],
    };
    const idleFrames: Record<string, string> = {
      south: 'hadap_depan',
      north: 'hadap_belakang',
      west: 'hadap_kiri',
      east: 'hadap_kanan',
    };

    const getSourceImage = (sourceKey: string): HTMLImageElement | HTMLCanvasElement | null => {
      const tex = this.textures.get(`rika-new-${sourceKey}`);
      if (!tex || tex.key === '__MISSING') return null;

      return tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    };

    const idleTargetHeights: Record<string, number> = {
      south: getSourceImage(idleFrames.south)?.height ?? NEW_RIKA_FRAME_HEIGHT,
      north: getSourceImage(idleFrames.north)?.height ?? NEW_RIKA_FRAME_HEIGHT,
      west: getSourceImage(idleFrames.west)?.height ?? NEW_RIKA_FRAME_HEIGHT,
      east: getSourceImage(idleFrames.east)?.height ?? NEW_RIKA_FRAME_HEIGHT,
    };

    const drawFrame = (sourceKey: string, col: number, row: number, targetHeight?: number): void => {
      const src = getSourceImage(sourceKey);
      if (!src) return;

      const scale = targetHeight ? targetHeight / src.height : 1;
      const drawWidth = src.width * scale;
      const drawHeight = src.height * scale;
      const x = col * NEW_RIKA_FRAME_WIDTH + (NEW_RIKA_FRAME_WIDTH - drawWidth) / 2;
      const y = (row + 1) * NEW_RIKA_FRAME_HEIGHT - drawHeight;
      ctx.drawImage(src, x, y, drawWidth, drawHeight);
    };

    DIRECTIONS.forEach((dir, rowIdx) => {
      const frames = walkFrames[dir];
      frames.forEach((frame, col) => drawFrame(frame, col, rowIdx, idleTargetHeights[dir]));
    });

    DIRECTIONS.forEach((dir, col) => {
      drawFrame(idleFrames[dir], col, 4);
    });

    canvas.refresh();

    for (let row = 0; row < rows; row++) {
      const colCount = row === 4 ? DIRECTIONS.length : cols;
      for (let col = 0; col < colCount; col++) {
        this.textures.get(TEXTURE_KEYS.RIKA).add(
          row * cols + col,
          0,
          col * NEW_RIKA_FRAME_WIDTH,
          row * NEW_RIKA_FRAME_HEIGHT,
          NEW_RIKA_FRAME_WIDTH,
          NEW_RIKA_FRAME_HEIGHT,
        );
      }
    }
  }

  private createNewRikaAnimations(): void {
    if (this.anims.exists('rika-walk-down')) return;

    const walkFrameCounts: Record<string, number> = {
      south: 3,
      north: 4,
      west: 4,
      east: 4,
    };

    DIRECTIONS.forEach((dir, dirIdx) => {
      const gameDir = DIR_TO_KEY[dir];
      const rowStartFrame = dirIdx * 4;
      const frameCount = walkFrameCounts[dir];

      this.anims.create({
        key: `rika-walk-${gameDir}`,
        frames: this.anims.generateFrameNumbers(TEXTURE_KEYS.RIKA, {
          start: rowStartFrame,
          end: rowStartFrame + frameCount - 1,
        }),
        frameRate: 7,
        repeat: -1,
      });

      const idleFrame = 16 + dirIdx;
      this.anims.create({
        key: `rika-idle-${gameDir}`,
        frames: [{ key: TEXTURE_KEYS.RIKA, frame: idleFrame }],
        frameRate: 1,
        repeat: 0,
      });

      this.anims.create({
        key: `rika-talk-${gameDir}`,
        frames: [{ key: TEXTURE_KEYS.RIKA, frame: idleFrame }],
        frameRate: 1,
        repeat: 0,
      });
    });
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
