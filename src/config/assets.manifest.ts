/**
 * Asset Manifest - Single source of truth for ALL game assets.
 * 
 * WHY a manifest:
 * 1. ONE place to see every asset in the game
 * 2. PreloadScene iterates this — no scattered load calls
 * 3. Assets are categorized (sprites, tilesets, audio, UI)
 * 4. Supports conditional loading (load only what current scene needs)
 * 5. Easy to generate from a build tool or asset pipeline
 * 6. Type-safe — typos in asset keys are caught at compile time
 * 
 * ASSET TYPES EXPLAINED:
 * - atlas: JSON + PNG pair. Best for characters/objects with named frames.
 *   Phaser loads both files and creates a texture with named frame lookup.
 * - spritesheet: Single PNG with fixed-size grid frames. Simpler but less flexible.
 *   Use when all frames are identical size (e.g., simple particle effects).
 * - image: Single static image. Tilesets, backgrounds, UI elements.
 * - audio: Sound files. Supports multiple formats for browser compatibility.
 * - tilemapJSON: Tiled map export. Loaded separately from tileset images.
 * 
 * HOW TO ADD A NEW ASSET:
 * 1. Place the file in the correct public/assets/ subdirectory
 * 2. Add an entry to the appropriate category below
 * 3. Use the key in your code: this.add.sprite(x, y, 'lail')
 * 4. Done. PreloadScene handles the rest.
 * 
 * PERFORMANCE NOTES:
 * - Atlases are GPU-optimal (single texture, multiple frames)
 * - Group related sprites into one atlas to minimize draw calls
 * - Audio uses OGG (smaller) with MP3 fallback (compatibility)
 */

import { GAME_CONFIG } from './game.config';

// ============================================================
// ASSET KEY CONSTANTS
// ============================================================

/**
 * Texture keys used throughout the codebase.
 * Reference these instead of string literals to catch typos at compile time.
 */
export const TEXTURE_KEYS = {
  // Characters
  PLAYER: 'lail',
  RIKA: 'rika',
  NPC_BAKER: 'npc_baker',
  NPC_FISHER: 'npc_fisher',
  NPC_ELDER: 'npc_elder',
  NPC_GIRL: 'npc_girl',
  NPC_BOY: 'npc_boy',
  NPC_MERCHANT: 'npc_merchant',
  NPC_FARMER: 'npc_farmer',
  NPC_ARTIST: 'npc_artist',
  NPC_POSTMAN: 'npc_postman',
  NPC_LIBRARIAN: 'npc_librarian',

  // Tilesets
  TILESET_BRONGWOOD: 'tileset_brongwood',

  // Food - Meats
  MEAT_1: 'meat_1',
  MEAT_2: 'meat_2',
  MEAT_3: 'meat_3',
  MEAT_4: 'meat_4',
  MEAT_5: 'meat_5',

  // UI
  PORTRAIT_LAIL: 'portrait_lail',
  PORTRAIT_RIKA: 'portrait_rika',
  DIALOGUE_BOX: 'dialogue_box',
  PROLOGUE_SCENE_1: 'prologue_scene_1',
  PROLOGUE_SCENE_2: 'prologue_scene_2',
  PROLOGUE_SCENE_3_1: 'prologue_scene_3_1',
  PROLOGUE_SCENE_3_2: 'prologue_scene_3_2',
  PROLOGUE_SCENE_3_3: 'prologue_scene_3_3',
  PROLOGUE_SCENE_3_4: 'prologue_scene_3_4',
  PROLOGUE_SCENE_3_5: 'prologue_scene_3_5',
  PROLOGUE_SCENE_3_6: 'prologue_scene_3_6',
} as const;

/**
 * Audio keys used throughout the codebase.
 */
export const AUDIO_KEYS = {
  // BGM
  BGM_DOWNTOWN: 'bgm_downtown',
  BGM_MENU: 'bgm_menu',

  // Ambience
  AMB_RAIN: 'amb_rain',
  AMB_CICADA: 'amb_cicada',
  AMB_WIND: 'amb_wind',
  AMB_OCEAN: 'amb_ocean',

  // SFX
  SFX_FOOTSTEP_GRASS: 'sfx_footstep_grass',
  SFX_FOOTSTEP_STONE: 'sfx_footstep_stone',
  SFX_DOOR_OPEN: 'sfx_door_open',
  SFX_UI_SELECT: 'sfx_ui_select',
  SFX_UI_CONFIRM: 'sfx_ui_confirm',
} as const;

// ============================================================
// MANIFEST TYPES
// ============================================================

export interface AtlasAsset {
  type: 'atlas';
  key: string;
  imagePath: string;
  jsonPath: string;
}

export interface SpritesheetAsset {
  type: 'spritesheet';
  key: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  /** Total frames in the sheet (optional, auto-detected if omitted) */
  frameCount?: number;
  /** Margin around the spritesheet edge */
  margin?: number;
  /** Spacing between frames */
  spacing?: number;
}

export interface ImageAsset {
  type: 'image';
  key: string;
  path: string;
}

export interface AudioAsset {
  type: 'audio';
  key: string;
  /** Multiple formats for browser compatibility (OGG preferred, MP3 fallback) */
  paths: string[];
}

export interface TilemapAsset {
  type: 'tilemapJSON';
  key: string;
  path: string;
}

export type AssetEntry =
  | AtlasAsset
  | SpritesheetAsset
  | ImageAsset
  | AudioAsset
  | TilemapAsset;

export interface AssetManifest {
  /** Character sprites (atlases with named frames) */
  characters: AtlasAsset[];
  /** Tileset images for Tiled maps */
  tilesets: ImageAsset[];
  /** Tiled JSON map files */
  tilemaps: TilemapAsset[];
  /** UI elements (portraits, dialogue boxes, icons) */
  ui: (ImageAsset | AtlasAsset)[];
  /** Background music tracks */
  bgm: AudioAsset[];
  /** Ambient sound loops */
  ambience: AudioAsset[];
  /** Sound effects */
  sfx: AudioAsset[];
  /** Miscellaneous images (effects, particles) */
  misc: (ImageAsset | SpritesheetAsset)[];
}

// ============================================================
// THE MANIFEST
// ============================================================

/**
 * Complete asset manifest for Brongwood.
 * 
 * DEVELOPMENT NOTE:
 * Assets marked with [PLACEHOLDER] don't exist yet on disk.
 * The PlaceholderAssets utility generates runtime textures for these.
 * As you create real art, uncomment the entries and remove placeholder generation.
 */
export const ASSET_MANIFEST: AssetManifest = {
  characters: [
    // [PLACEHOLDER] - Generated at runtime until real art exists
    // {
    //   type: 'atlas',
    //   key: TEXTURE_KEYS.PLAYER,
    //   imagePath: 'assets/sprites/characters/lail.png',
    //   jsonPath: 'assets/sprites/characters/lail.json',
    // },
    // {
    //   type: 'atlas',
    //   key: TEXTURE_KEYS.RIKA,
    //   imagePath: 'assets/sprites/characters/rika.png',
    //   jsonPath: 'assets/sprites/characters/rika.json',
    // },
  ],

  tilesets: [
    // [PLACEHOLDER] - Generated at runtime until real art exists
    // {
    //   type: 'image',
    //   key: TEXTURE_KEYS.TILESET_BRONGWOOD,
    //   path: 'assets/tilemaps/tilesets/brongwood_tiles.png',
    // },
  ],

  tilemaps: [
    {
      type: 'tilemapJSON',
      key: 'map_downtown',
      path: 'assets/tilemaps/downtown.json',
    },
  ],

  ui: [
    // {
    //   type: 'image',
    //   key: TEXTURE_KEYS.PORTRAIT_LAIL,
    //   path: 'assets/ui/portraits/lail.png',
    // },
    // {
    //   type: 'image',
    //   key: TEXTURE_KEYS.DIALOGUE_BOX,
    //   path: 'assets/ui/dialogue_box.png',
    // },
  ],

  bgm: [
    {
      type: 'audio',
      key: AUDIO_KEYS.BGM_DOWNTOWN,
      paths: ['assets/audio/bgm/bgm.mp3'],
    },
  ],

  ambience: [
    // {
    //   type: 'audio',
    //   key: AUDIO_KEYS.AMB_RAIN,
    //   paths: ['assets/audio/ambience/rain.ogg', 'assets/audio/ambience/rain.mp3'],
    // },
    // {
    //   type: 'audio',
    //   key: AUDIO_KEYS.AMB_CICADA,
    //   paths: ['assets/audio/ambience/cicada.ogg', 'assets/audio/ambience/cicada.mp3'],
    // },
  ],

  sfx: [
    // {
    //   type: 'audio',
    //   key: AUDIO_KEYS.SFX_FOOTSTEP_GRASS,
    //   paths: ['assets/audio/sfx/footstep_grass.ogg', 'assets/audio/sfx/footstep_grass.mp3'],
    // },
  ],

  misc: [
    {
      type: 'image',
      key: TEXTURE_KEYS.MEAT_1,
      path: 'assets/tilemaps/food/meats/Meat 1.png',
    },
    {
      type: 'image',
      key: TEXTURE_KEYS.MEAT_2,
      path: 'assets/tilemaps/food/meats/Meat 2.png',
    },
    {
      type: 'image',
      key: TEXTURE_KEYS.MEAT_3,
      path: 'assets/tilemaps/food/meats/Meat 3.png',
    },
    {
      type: 'image',
      key: TEXTURE_KEYS.MEAT_4,
      path: 'assets/tilemaps/food/meats/Meat 4.png',
    },
    {
      type: 'image',
      key: TEXTURE_KEYS.MEAT_5,
      path: 'assets/tilemaps/food/meats/Meat 5.png',
    },
  ],
};

/**
 * Get all assets as a flat array (for batch loading).
 */
export function getAllAssets(): AssetEntry[] {
  const m = ASSET_MANIFEST;
  return [
    ...m.characters,
    ...m.tilesets,
    ...m.tilemaps,
    ...m.ui,
    ...m.bgm,
    ...m.ambience,
    ...m.sfx,
    ...m.misc,
  ];
}

/**
 * Get only assets that need file loading (excludes placeholders).
 * Returns entries that have actual file paths.
 */
export function getLoadableAssets(): AssetEntry[] {
  return getAllAssets();
}
