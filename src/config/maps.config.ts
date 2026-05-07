/**
 * Map Registry - Central configuration for all game maps.
 * 
 * WHY a registry:
 * 1. Single source of truth — add a map here, it's available everywhere
 * 2. Scenes reference maps by key, never by file path
 * 3. Easy to see all maps at a glance
 * 4. Supports multiple tilesets per map (common in larger areas)
 * 5. Tileset dimensions are defined here, matching what Tiled exports
 * 
 * HOW TO ADD A NEW MAP:
 * 1. Create the map in Tiled (32x32 tile size), export as JSON
 * 2. Place JSON in public/assets/tilemaps/
 * 3. Place tileset PNG in public/assets/tilemaps/tilesets/
 * 4. Add an entry to MAP_REGISTRY below
 * 5. Add the tilemap to assets.manifest.ts
 * 6. Done — TilemapManager.load() handles the rest
 * 
 * TILESET NAMING:
 * - tiledName must EXACTLY match the tileset name in your .tmx/.json file
 * - textureKey must match what's in assets.manifest.ts (or PlaceholderAssets)
 * - imagePath is relative to the public/ folder
 */

import { MapConfig } from '@/types/tilemap';
import { GAME_CONFIG } from './game.config';
import { TEXTURE_KEYS } from './assets.manifest';

/**
 * All maps in Brongwood, keyed by a readable identifier.
 */
export const MAP_REGISTRY: Record<string, MapConfig> = {
  /**
   * Downtown Brongwood - The main town area.
   * This is the first area the player experiences.
   * 
   * Emotional design: intimate streets, warm lighting, ocean in the distance.
   * Contains: flower shop, cafe, bus stop, road, ocean path, houses.
   * 
   * Map size: 20x15 tiles (640x480 pixels at 32x32)
   * This is deliberately small — cozy, not overwhelming.
   */
  downtown: {
    key: 'map_downtown',
    jsonPath: 'assets/tilemaps/downtown.json',
    tilesets: [
      {
        tiledName: 'brongwood_tiles',
        textureKey: TEXTURE_KEYS.TILESET_BRONGWOOD,
        tileWidth: GAME_CONFIG.TILE_SIZE,
        tileHeight: GAME_CONFIG.TILE_SIZE,
        margin: 0,
        spacing: 0,
        imagePath: 'assets/tilemaps/tilesets/brongwood_tiles.png',
      },
    ],
    defaultSpawn: 'default',
    backgroundColor: '#1a1a2e',
    bgmKey: 'bgm_downtown',
  },
};

/**
 * Helper to get all map configs as an array (for batch loading).
 */
export function getAllMapConfigs(): MapConfig[] {
  return Object.values(MAP_REGISTRY);
}

/**
 * Helper to get all unique tileset configs across all maps (avoids duplicate loads).
 */
export function getAllTilesetConfigs() {
  const seen = new Set<string>();
  const tilesets: Array<{ textureKey: string; imagePath: string }> = [];

  for (const map of Object.values(MAP_REGISTRY)) {
    for (const tileset of map.tilesets) {
      if (!seen.has(tileset.textureKey)) {
        seen.add(tileset.textureKey);
        tilesets.push({
          textureKey: tileset.textureKey,
          imagePath: tileset.imagePath,
        });
      }
    }
  }

  return tilesets;
}
