/**
 * Tilemap Type Definitions
 * 
 * These types define the contract between Tiled map exports and our game systems.
 * 
 * WHY strict typing for maps:
 * 1. Tiled exports JSON with arbitrary string keys — typos cause silent failures
 * 2. Typed object layers mean spawn points, zones, and triggers are validated at compile time
 * 3. The TilemapManager returns typed results, so scenes know exactly what data they get
 * 4. Future maps can be validated against these interfaces before runtime
 * 
 * NAMING CONVENTION:
 * - Layer names in Tiled use snake_case (ground_decor, above_player)
 * - Object types in Tiled use PascalCase (PlayerSpawn, ZoneTrigger)
 * - Properties in Tiled use camelCase (targetScene, spawnId)
 */

import { Vec2 } from './common';

// ============================================================
// LAYER CONFIGURATION
// ============================================================

/**
 * Standard layer names expected in Tiled maps.
 * Maps MUST use these exact names for automatic processing.
 */
export const MAP_LAYERS = {
  /** Base terrain: grass, dirt, roads, water */
  GROUND: 'ground',
  /** Decorative ground details: cracks, puddles, flowers */
  GROUND_DECOR: 'ground_decor',
  /** Structures with collision: walls, buildings, fences */
  BUILDINGS: 'buildings',
  /** Rendered above the player: rooftops, tree canopy, awnings */
  ABOVE_PLAYER: 'above_player',
  /** Object layer: spawn points for player and NPCs */
  SPAWNS: 'spawns',
  /** Object layer: collision shapes (rectangles/polygons) */
  COLLISIONS: 'collisions',
  /** Object layer: trigger zones (scene transitions, events) */
  ZONES: 'zones',
} as const;

export type MapLayerName = typeof MAP_LAYERS[keyof typeof MAP_LAYERS];

// ============================================================
// OBJECT LAYER TYPES
// ============================================================

/**
 * Base interface for all objects parsed from Tiled object layers.
 * Every object in Tiled has at minimum: name, position, and dimensions.
 */
export interface TiledObject {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, string | number | boolean>;
}

/**
 * A spawn point defines where an entity appears on the map.
 * 
 * In Tiled: Object layer "spawns", type = "PlayerSpawn" or "NPCSpawn"
 * Properties:
 *   - id: string (unique identifier, e.g. "default", "from_cafe")
 *   - direction: string (facing direction on spawn)
 */
export interface SpawnPoint {
  id: string;
  position: Vec2;
  direction?: 'up' | 'down' | 'left' | 'right';
  type: 'player' | 'npc';
  /** For NPC spawns: which NPC entity to create */
  entityId?: string;
}

/**
 * A zone defines a rectangular trigger area.
 * 
 * In Tiled: Object layer "zones", type = "SceneTransition" or "EventTrigger"
 * Properties:
 *   - targetScene: string (scene key to transition to)
 *   - spawnId: string (which spawn point in the target scene)
 *   - eventId: string (which event to trigger)
 */
export interface MapZone {
  id: string;
  bounds: Phaser.Geom.Rectangle;
  type: 'scene_transition' | 'event_trigger' | 'interaction';
  /** For scene transitions */
  targetScene?: string;
  /** Which spawn point to use in the target scene */
  spawnId?: string;
  /** For event triggers */
  eventId?: string;
}

/**
 * A collision shape from the object layer.
 * Used for precise collision that doesn't align to the tile grid.
 */
export interface CollisionShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================
// MAP DATA RESULT
// ============================================================

/**
 * The complete parsed result from loading a tilemap.
 * This is what TilemapManager.load() returns to the scene.
 * 
 * WHY return a structured result:
 * - The scene doesn't need to know HOW layers are parsed
 * - All data is pre-processed and typed
 * - Easy to extend with new layer types without changing scene code
 */
export interface ParsedMapData {
  /** The Phaser tilemap instance */
  tilemap: Phaser.Tilemaps.Tilemap;
  /** All created tile layers, keyed by layer name */
  layers: Map<string, Phaser.Tilemaps.TilemapLayer>;
  /** Collision layer(s) for physics */
  collisionLayers: Phaser.Tilemaps.TilemapLayer[];
  /** Static body collision shapes from object layer */
  collisionBodies: Phaser.Physics.Arcade.StaticGroup | null;
  /** Parsed spawn points */
  spawns: SpawnPoint[];
  /** Parsed trigger zones */
  zones: MapZone[];
  /** Map dimensions in pixels */
  widthInPixels: number;
  heightInPixels: number;
}

// ============================================================
// MAP REGISTRY
// ============================================================

/**
 * Configuration for a single map in the game.
 * Used by the map registry to know what to load and how.
 * 
 * WHY a registry:
 * - Centralizes all map metadata in one place
 * - PreloadScene can iterate the registry to load all maps
 * - Scenes reference maps by key, not file path
 * - Easy to add new maps without touching loading code
 */
export interface MapConfig {
  /** Unique key for this map (used in Phaser's cache) */
  key: string;
  /** Path to the Tiled JSON file (relative to public/) */
  jsonPath: string;
  /** Tilesets used by this map */
  tilesets: TilesetConfig[];
  /** Default player spawn point ID */
  defaultSpawn: string;
  /** Background color for this map's scene */
  backgroundColor?: string;
  /** BGM track key to play on this map */
  bgmKey?: string;
}

/**
 * Configuration for a tileset used in a map.
 */
export interface TilesetConfig {
  /** Name as defined in Tiled (must match exactly) */
  tiledName: string;
  /** Phaser texture key (what you loaded the image as) */
  textureKey: string;
  /** Path to the tileset image (relative to public/) */
  imagePath: string;
  /** Tile width in pixels */
  tileWidth: number;
  /** Tile height in pixels */
  tileHeight: number;
  /** Margin around the tileset image */
  margin?: number;
  /** Spacing between tiles in the tileset image */
  spacing?: number;
}
