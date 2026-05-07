/**
 * Core game configuration - Stardew Valley style.
 * 
 * RESOLUTION STRATEGY (16x16 pixel art, Stardew Valley style):
 * - Internal resolution: 320x180 pixels (16:9)
 * - Tile size: 16x16 pixels
 * - Visible area: 20 x 11.25 tiles
 * - Scale: x4 = 1280x720
 * - Character: 16x32 (1 tile wide, 2 tiles tall)
 * 
 * This matches Stardew Valley's proportions exactly:
 * - Chunky, readable pixels
 * - Characters are 2 tiles tall with big heads
 * - World feels cozy and intimate
 */

export const GAME_CONFIG = {
  WIDTH: 480,
  HEIGHT: 300,
  SCALE: 3,
  TILE_SIZE: 64,
  FPS: 60,
} as const;

/**
 * Player configuration.
 * Using real sprite: 88x88 per frame from PNG files.
 * Physics body is small (feet area only) for proper collision.
 */
export const PLAYER_CONFIG = {
  SPEED: 80,
  FRAME_WIDTH: 88,
  FRAME_HEIGHT: 88,
  BODY_WIDTH: 20,
  BODY_HEIGHT: 10,
  BODY_OFFSET_X: 34,
  BODY_OFFSET_Y: 74,
  ANIM_FRAMERATE: 8,
  IDLE_FRAMERATE: 1,
} as const;

export const CAMERA_CONFIG = {
  LERP: 0.1,
  DEADZONE_WIDTH: 64,
  DEADZONE_HEIGHT: 48,
} as const;

export const DEPTH = {
  GROUND: 0,
  GROUND_DECOR: 1,
  SHADOWS: 2,
  ENTITIES: 10,
  PLAYER: 10,
  ABOVE_PLAYER: 1000,
  WEATHER: 1100,
  LIGHTING: 1200,
  UI: 2000,
} as const;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  WORLD: 'WorldScene',
} as const;
