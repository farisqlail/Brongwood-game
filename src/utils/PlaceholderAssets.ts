/**
 * PlaceholderAssets - Stardew Valley style pixel art (16x16 tiles, 16x32 characters).
 * 
 * STARDEW VALLEY ART RULES:
 * 1. Every element has a 1px dark outline
 * 2. 2-3 color shading (base + shadow, sometimes highlight)
 * 3. Characters have BIG heads (~40% of height)
 * 4. Saturated, warm color palette
 * 5. Tiles have subtle texture (grass has dots, paths have cracks)
 * 6. Walk cycle: 4 frames, bouncy step
 * 7. Idle: single frame, no animation
 */

import Phaser from 'phaser';
import { GAME_CONFIG, PLAYER_CONFIG } from '@config/game.config';
import { TEXTURE_KEYS } from '@config/assets.manifest';

// ============================================================
// PIXEL HELPERS
// ============================================================

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ============================================================
// STARDEW PALETTE
// ============================================================

const LAIL = {
  outline: '#2a2030',
  hair: '#3a2820',
  hairLight: '#5a4030',
  skin: '#f8c8a0',
  skinShade: '#d8a070',
  eyeWhite: '#ffffff',
  eye: '#2a4060',
  shirt: '#4878b8',
  shirtShade: '#3060a0',
  shirtLight: '#68a0d8',
  pants: '#485868',
  pantsShade: '#384858',
  shoes: '#3a3030',
};

const RIKA = {
  outline: '#2a2030',
  hair: '#282028',
  hairLight: '#483848',
  skin: '#f8d0a8',
  skinShade: '#e0a878',
  eyeWhite: '#ffffff',
  eye: '#306848',
  blush: '#f0a0a0',
  dress: '#f8f0e0',
  dressShade: '#e0d8c8',
  apron: '#58a858',
  apronShade: '#408040',
  shoes: '#785840',
};

// ============================================================
// LAIL (Player) - Stardew Valley Style
// 16x32 per frame, 4 frames x 4 directions
// ============================================================

function drawLailFrame(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: number, frame: number): void {
  const o = LAIL;
  // Walk bounce: frames 1,3 are "step" frames (1px up)
  const bounce = (frame === 1 || frame === 3) ? -1 : 0;

  // --- HAIR/HEAD (big, Stardew style ~12px tall) ---
  // Head outline
  rect(ctx, ox + 3, oy + 1 + bounce, 10, 12, o.outline);
  // Head fill (skin)
  rect(ctx, ox + 4, oy + 2 + bounce, 8, 10, o.skin);
  // Skin shadow (bottom of face)
  rect(ctx, ox + 4, oy + 9 + bounce, 8, 3, o.skinShade);

  // Hair (top of head, covers forehead)
  rect(ctx, ox + 3, oy + 0 + bounce, 10, 6, o.outline); // hair outline
  rect(ctx, ox + 4, oy + 1 + bounce, 8, 4, o.hair);
  // Hair highlight
  px(ctx, ox + 6, oy + 2 + bounce, o.hairLight);
  px(ctx, ox + 7, oy + 2 + bounce, o.hairLight);
  // Side hair
  rect(ctx, ox + 3, oy + 4 + bounce, 1, 4, o.hair);
  rect(ctx, ox + 12, oy + 4 + bounce, 1, 4, o.hair);

  // Eyes (direction-dependent)
  if (dir === 0) { // Down - facing camera
    px(ctx, ox + 5, oy + 7 + bounce, o.eyeWhite);
    px(ctx, ox + 6, oy + 7 + bounce, o.eye);
    px(ctx, ox + 9, oy + 7 + bounce, o.eyeWhite);
    px(ctx, ox + 10, oy + 7 + bounce, o.eye);
  } else if (dir === 1) { // Up - back of head, more hair
    rect(ctx, ox + 4, oy + 2 + bounce, 8, 8, o.hair);
    px(ctx, ox + 5, oy + 3 + bounce, o.hairLight);
    px(ctx, ox + 8, oy + 4 + bounce, o.hairLight);
  } else if (dir === 2) { // Left
    px(ctx, ox + 5, oy + 7 + bounce, o.eye);
    px(ctx, ox + 6, oy + 7 + bounce, o.eyeWhite);
    rect(ctx, ox + 3, oy + 3 + bounce, 2, 6, o.hair); // side hair
  } else { // Right
    px(ctx, ox + 9, oy + 7 + bounce, o.eyeWhite);
    px(ctx, ox + 10, oy + 7 + bounce, o.eye);
    rect(ctx, ox + 11, oy + 3 + bounce, 2, 6, o.hair);
  }

  // --- BODY (shirt) ---
  rect(ctx, ox + 4, oy + 13 + bounce, 8, 10, o.outline); // body outline
  rect(ctx, ox + 5, oy + 14 + bounce, 6, 8, o.shirt);
  // Shirt shading
  rect(ctx, ox + 5, oy + 14 + bounce, 2, 8, o.shirtShade);
  px(ctx, ox + 9, oy + 15 + bounce, o.shirtLight);

  // Arms
  const armOff = (frame === 1) ? 1 : (frame === 3) ? -1 : 0;
  rect(ctx, ox + 3, oy + 14 + bounce, 1, 7, o.outline);
  rect(ctx, ox + 12, oy + 14 + bounce, 1, 7, o.outline);
  rect(ctx, ox + 3, oy + 14 + bounce + armOff, 1, 6, o.shirtShade);
  rect(ctx, ox + 12, oy + 14 + bounce - armOff, 1, 6, o.shirt);
  // Hands
  px(ctx, ox + 3, oy + 20 + bounce + armOff, o.skin);
  px(ctx, ox + 12, oy + 20 + bounce - armOff, o.skin);

  // --- LEGS/PANTS ---
  rect(ctx, ox + 5, oy + 22 + bounce, 6, 7, o.outline); // legs outline
  // Leg animation
  if (frame === 0 || frame === 2) {
    // Standing / mid-stride
    rect(ctx, ox + 5, oy + 23, 3, 5, o.pants);
    rect(ctx, ox + 8, oy + 23, 3, 5, o.pants);
    rect(ctx, ox + 5, oy + 25, 3, 3, o.pantsShade);
  } else if (frame === 1) {
    // Left leg forward
    rect(ctx, ox + 4, oy + 23, 3, 6, o.pants);
    rect(ctx, ox + 8, oy + 23, 3, 5, o.pantsShade);
  } else {
    // Right leg forward
    rect(ctx, ox + 5, oy + 23, 3, 5, o.pantsShade);
    rect(ctx, ox + 9, oy + 23, 3, 6, o.pants);
  }

  // Shoes
  rect(ctx, ox + 5, oy + 28, 3, 2, o.shoes);
  rect(ctx, ox + 8, oy + 28, 3, 2, o.shoes);
}

// ============================================================
// RIKA (NPC) - Stardew Valley Style
// ============================================================

function drawRikaFrame(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: number, frame: number): void {
  const o = RIKA;
  const bounce = (frame === 1 || frame === 3) ? -1 : 0;

  // --- HEAD ---
  rect(ctx, ox + 3, oy + 1 + bounce, 10, 12, o.outline);
  rect(ctx, ox + 4, oy + 2 + bounce, 8, 10, o.skin);
  rect(ctx, ox + 4, oy + 9 + bounce, 8, 3, o.skinShade);

  // Hair (long, dark, Stardew style)
  rect(ctx, ox + 2, oy + 0 + bounce, 12, 6, o.outline);
  rect(ctx, ox + 3, oy + 1 + bounce, 10, 4, o.hair);
  px(ctx, ox + 5, oy + 2 + bounce, o.hairLight);
  px(ctx, ox + 7, oy + 2 + bounce, o.hairLight);
  // Long side hair
  rect(ctx, ox + 2, oy + 5 + bounce, 2, 14, o.hair);
  rect(ctx, ox + 12, oy + 5 + bounce, 2, 14, o.hair);
  // Hair outline on sides
  rect(ctx, ox + 1, oy + 5 + bounce, 1, 14, o.outline);
  rect(ctx, ox + 14, oy + 5 + bounce, 1, 14, o.outline);

  // Eyes
  if (dir === 0) {
    px(ctx, ox + 5, oy + 7 + bounce, o.eyeWhite);
    px(ctx, ox + 6, oy + 7 + bounce, o.eye);
    px(ctx, ox + 9, oy + 7 + bounce, o.eyeWhite);
    px(ctx, ox + 10, oy + 7 + bounce, o.eye);
    // Blush
    px(ctx, ox + 4, oy + 9 + bounce, o.blush);
    px(ctx, ox + 11, oy + 9 + bounce, o.blush);
  } else if (dir === 1) {
    rect(ctx, ox + 4, oy + 2 + bounce, 8, 9, o.hair);
    px(ctx, ox + 6, oy + 3 + bounce, o.hairLight);
  } else if (dir === 2) {
    px(ctx, ox + 5, oy + 7 + bounce, o.eye);
    px(ctx, ox + 4, oy + 9 + bounce, o.blush);
  } else {
    px(ctx, ox + 10, oy + 7 + bounce, o.eye);
    px(ctx, ox + 11, oy + 9 + bounce, o.blush);
  }

  // --- BODY (dress + apron) ---
  rect(ctx, ox + 4, oy + 13 + bounce, 8, 12, o.outline);
  rect(ctx, ox + 5, oy + 14 + bounce, 6, 10, o.dress);
  rect(ctx, ox + 5, oy + 20 + bounce, 6, 4, o.dressShade);
  // Apron
  rect(ctx, ox + 5, oy + 15 + bounce, 6, 7, o.apron);
  rect(ctx, ox + 5, oy + 15 + bounce, 2, 7, o.apronShade);
  // Apron ties
  px(ctx, ox + 4, oy + 15 + bounce, o.apron);
  px(ctx, ox + 11, oy + 15 + bounce, o.apron);

  // Arms
  const armOff = (frame === 1) ? 1 : (frame === 3) ? -1 : 0;
  px(ctx, ox + 3, oy + 15 + bounce + armOff, o.dress);
  px(ctx, ox + 3, oy + 16 + bounce + armOff, o.dress);
  px(ctx, ox + 3, oy + 17 + bounce + armOff, o.skin);
  px(ctx, ox + 12, oy + 15 + bounce - armOff, o.dress);
  px(ctx, ox + 12, oy + 16 + bounce - armOff, o.dress);
  px(ctx, ox + 12, oy + 17 + bounce - armOff, o.skin);

  // --- LEGS ---
  if (frame === 0 || frame === 2) {
    rect(ctx, ox + 5, oy + 25, 3, 4, o.skin);
    rect(ctx, ox + 8, oy + 25, 3, 4, o.skin);
  } else if (frame === 1) {
    rect(ctx, ox + 4, oy + 25, 3, 5, o.skin);
    rect(ctx, ox + 8, oy + 25, 3, 4, o.skin);
  } else {
    rect(ctx, ox + 5, oy + 25, 3, 4, o.skin);
    rect(ctx, ox + 9, oy + 25, 3, 5, o.skin);
  }

  // Shoes
  rect(ctx, ox + 5, oy + 28, 3, 2, o.shoes);
  rect(ctx, ox + 8, oy + 28, 3, 2, o.shoes);
}

// ============================================================
// TILESET - Stardew Valley Style (16x16, vibrant)
// ============================================================

const STARDEW_TILES: Array<{ base: string; shade: string; detail?: string; type: string }> = [
  { base: '#5ab85a', shade: '#48a048', detail: '#68c868', type: 'grass' },
  { base: '#d8b868', shade: '#c0a050', detail: '#e8c878', type: 'path' },
  { base: '#4888c8', shade: '#3870b0', detail: '#68a8e0', type: 'water' },
  { base: '#786050', shade: '#604838', detail: '#907060', type: 'wall' },
  { base: '#a08060', shade: '#886848', detail: '#b89878', type: 'building' },
  { base: '#68b848', shade: '#50a030', detail: '#f8e838', type: 'flowers' },
  { base: '#785868', shade: '#604050', detail: '#907080', type: 'roof' },
  { base: '#408840', shade: '#307030', detail: '#58a058', type: 'darkgrass' },
  { base: '#b89868', shade: '#a08050', detail: '#d0b080', type: 'dirt' },
  { base: '#e8d8a0', shade: '#d0c088', detail: '#f8e8b8', type: 'sand' },
  { base: '#909090', shade: '#787878', detail: '#a8a8a8', type: 'stone' },
  { base: '#8a7050', shade: '#705838', detail: '#a08868', type: 'fence' },
  { base: '#a07048', shade: '#885830', detail: '#b88860', type: 'door' },
  { base: '#78b8d8', shade: '#60a0c0', detail: '#a0d8f0', type: 'window' },
  { base: '#f8e040', shade: '#e0c828', detail: '#fff068', type: 'lamp' },
  { base: '#685848', shade: '#504030', detail: '#807060', type: 'bench' },
];

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, tileIdx: number): void {
  const tile = STARDEW_TILES[tileIdx] || STARDEW_TILES[0];
  const s = 16;

  // Base fill
  rect(ctx, x, y, s, s, tile.base);

  // Shading (bottom-right darker)
  rect(ctx, x, y + s - 3, s, 3, tile.shade);
  rect(ctx, x + s - 3, y, 3, s, tile.shade);

  // Detail pixels (texture)
  if (tile.detail) {
    if (tile.type === 'grass') {
      // Grass blades
      px(ctx, x + 3, y + 4, tile.detail);
      px(ctx, x + 7, y + 2, tile.detail);
      px(ctx, x + 11, y + 6, tile.detail);
      px(ctx, x + 5, y + 10, tile.detail);
      px(ctx, x + 13, y + 11, tile.detail);
      px(ctx, x + 2, y + 13, tile.detail);
    } else if (tile.type === 'path') {
      // Path cracks
      px(ctx, x + 4, y + 5, tile.shade);
      px(ctx, x + 5, y + 6, tile.shade);
      px(ctx, x + 10, y + 10, tile.shade);
    } else if (tile.type === 'water') {
      // Water shimmer
      px(ctx, x + 3, y + 4, tile.detail);
      px(ctx, x + 4, y + 4, tile.detail);
      px(ctx, x + 9, y + 8, tile.detail);
      px(ctx, x + 10, y + 8, tile.detail);
    } else if (tile.type === 'flowers') {
      // Flower dots
      px(ctx, x + 4, y + 3, tile.detail);
      px(ctx, x + 10, y + 5, tile.detail);
      px(ctx, x + 7, y + 9, '#f87878');
      px(ctx, x + 12, y + 11, tile.detail);
    } else {
      // Generic highlight
      px(ctx, x + 2, y + 2, tile.detail);
      px(ctx, x + 3, y + 2, tile.detail);
    }
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export class PlaceholderAssets {
  static createTileset(scene: Phaser.Scene): void {
    const tileSize = GAME_CONFIG.TILE_SIZE; // 16
    const cols = 8;
    const rows = 8;

    const canvas = scene.textures.createCanvas(TEXTURE_KEYS.TILESET_BRONGWOOD, tileSize * cols, tileSize * rows);
    if (!canvas) return;
    const ctx = canvas.getContext();

    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      drawTile(ctx, col * tileSize, row * tileSize, i % STARDEW_TILES.length);
    }

    canvas.refresh();
  }

  static createPlayerSprite(scene: Phaser.Scene): void {
    const fw = PLAYER_CONFIG.FRAME_WIDTH;  // 16
    const fh = PLAYER_CONFIG.FRAME_HEIGHT; // 32
    const cols = 4; // 4 walk frames
    const rows = 4; // down, up, left, right

    const canvas = scene.textures.createCanvas(TEXTURE_KEYS.PLAYER, fw * cols, fh * rows);
    if (!canvas) return;
    const ctx = canvas.getContext();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        drawLailFrame(ctx, col * fw, row * fh, row, col);
      }
    }

    canvas.refresh();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        scene.textures.get(TEXTURE_KEYS.PLAYER).add(
          row * cols + col, 0, col * fw, row * fh, fw, fh
        );
      }
    }
  }

  static createRikaSprite(scene: Phaser.Scene): void {
    const fw = 16;
    const fh = 32;
    const cols = 4;
    const rows = 4;

    const canvas = scene.textures.createCanvas(TEXTURE_KEYS.RIKA, fw * cols, fh * rows);
    if (!canvas) return;
    const ctx = canvas.getContext();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        drawRikaFrame(ctx, col * fw, row * fh, row, col);
      }
    }

    canvas.refresh();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        scene.textures.get(TEXTURE_KEYS.RIKA).add(
          row * cols + col, 0, col * fw, row * fh, fw, fh
        );
      }
    }
  }

  static createPlayerAnimations(scene: Phaser.Scene): void {
    const framesPerRow = 4;
    const directions: Array<{ key: string; row: number }> = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 },
    ];

    for (const dir of directions) {
      const startFrame = dir.row * framesPerRow;

      scene.anims.create({
        key: `lail-walk-${dir.key}`,
        frames: scene.anims.generateFrameNumbers(TEXTURE_KEYS.PLAYER, {
          start: startFrame,
          end: startFrame + framesPerRow - 1,
        }),
        frameRate: PLAYER_CONFIG.ANIM_FRAMERATE,
        repeat: -1,
      });

      scene.anims.create({
        key: `lail-idle-${dir.key}`,
        frames: [{ key: TEXTURE_KEYS.PLAYER, frame: startFrame }],
        frameRate: PLAYER_CONFIG.IDLE_FRAMERATE,
        repeat: 0,
      });
    }
  }

  static createRikaAnimations(scene: Phaser.Scene): void {
    const framesPerRow = 4;
    const directions: Array<{ key: string; row: number }> = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 },
    ];

    for (const dir of directions) {
      const startFrame = dir.row * framesPerRow;

      scene.anims.create({
        key: `rika-walk-${dir.key}`,
        frames: scene.anims.generateFrameNumbers(TEXTURE_KEYS.RIKA, {
          start: startFrame,
          end: startFrame + framesPerRow - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });

      scene.anims.create({
        key: `rika-idle-${dir.key}`,
        frames: [{ key: TEXTURE_KEYS.RIKA, frame: startFrame }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }
}
