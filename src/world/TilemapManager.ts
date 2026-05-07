/**
 * TilemapManager - Loads and configures Tiled JSON maps for gameplay.
 * 
 * WHY a dedicated manager:
 * 1. Scenes should orchestrate, not parse. A scene says "load downtown" and gets
 *    back typed layers, spawn points, and collision — no parsing logic in the scene.
 * 2. Reusable across ALL maps. Every area in Brongwood uses the same pipeline.
 * 3. Encapsulates the Tiled → Phaser translation. If Tiled's format changes or
 *    we switch map editors, only this file changes.
 * 4. Testable in isolation — you can verify layer creation without a full scene.
 * 
 * PIPELINE:
 * Tiled Editor → Export JSON → public/assets/tilemaps/
 * PreloadScene → this.load.tilemapTiledJSON(key, path)
 * WorldScene → TilemapManager.load(scene, config) → ParsedMapData
 * 
 * DEPTH STRATEGY:
 * - ground:       depth 0   (always behind everything)
 * - ground_decor: depth 1   (behind entities but above ground)
 * - buildings:    depth 2   (same level as entities, uses Y-sort for overlap)
 * - above_player: depth 1000 (always on top — roofs, canopy)
 * 
 * Entities (player, NPCs) use their Y position as depth (typically 50-500),
 * so they naturally sort with the buildings layer.
 */

import Phaser from 'phaser';
import { DEPTH } from '@config/game.config';
import {
  MAP_LAYERS,
  MapConfig,
  ParsedMapData,
  SpawnPoint,
  MapZone,
  CollisionShape,
  TiledObject,
} from '@/types/tilemap';

/** Depth values for each standard layer */
const LAYER_DEPTHS: Record<string, number> = {
  [MAP_LAYERS.GROUND]: DEPTH.GROUND,
  [MAP_LAYERS.GROUND_DECOR]: DEPTH.GROUND_DECOR,
  [MAP_LAYERS.BUILDINGS]: DEPTH.ENTITIES, // Same range as entities for Y-sort overlap
  [MAP_LAYERS.ABOVE_PLAYER]: DEPTH.ABOVE_PLAYER,
};

export class TilemapManager {
  /**
   * Load and configure a tilemap from a pre-loaded Tiled JSON.
   * 
   * PREREQUISITES:
   * - The JSON must already be loaded via scene.load.tilemapTiledJSON()
   * - All tileset images must already be loaded via scene.load.image()
   * 
   * @param scene - The Phaser scene to create the map in
   * @param config - Map configuration from the registry
   * @returns Fully parsed map data with typed layers, spawns, and zones
   */
  static load(scene: Phaser.Scene, config: MapConfig): ParsedMapData {
    // Create the tilemap from cached JSON
    const tilemap = scene.make.tilemap({ key: config.key });

    // Add all tilesets
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    for (const tilesetConfig of config.tilesets) {
      const tileset = tilemap.addTilesetImage(
        tilesetConfig.tiledName,
        tilesetConfig.textureKey,
        tilesetConfig.tileWidth,
        tilesetConfig.tileHeight,
        tilesetConfig.margin ?? 0,
        tilesetConfig.spacing ?? 0
      );
      if (tileset) {
        tilesets.push(tileset);
      }
    }

    if (tilesets.length === 0) {
      console.error(`[TilemapManager] No tilesets loaded for map "${config.key}"`);
    }

    // Create tile layers
    const layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
    const collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];

    // Process each tile layer in the tilemap
    for (const layerData of tilemap.layers) {
      const layerName = layerData.name;
      const layer = tilemap.createLayer(layerName, tilesets, 0, 0);

      if (!layer) {
        console.warn(`[TilemapManager] Failed to create layer "${layerName}"`);
        continue;
      }

      // Set depth based on layer name
      const depth = LAYER_DEPTHS[layerName] ?? DEPTH.GROUND;
      layer.setDepth(depth);

      // Enable collision on the buildings layer
      // Uses Tiled's custom property "collides" = true on tiles
      if (layerName === MAP_LAYERS.BUILDINGS) {
        layer.setCollisionByProperty({ collides: true });
        collisionLayers.push(layer);
      }

      layers.set(layerName, layer);
    }

    // Parse object layers
    const spawns = TilemapManager.parseSpawns(tilemap);
    const zones = TilemapManager.parseZones(tilemap, scene);
    const collisionBodies = TilemapManager.parseCollisionObjects(tilemap, scene);

    // Calculate map dimensions
    const widthInPixels = tilemap.widthInPixels;
    const heightInPixels = tilemap.heightInPixels;

    return {
      tilemap,
      layers,
      collisionLayers,
      collisionBodies,
      spawns,
      zones,
      widthInPixels,
      heightInPixels,
    };
  }

  /**
   * Parse spawn points from the "spawns" object layer.
   * 
   * Expected Tiled object properties:
   * - name: spawn ID (e.g. "default", "from_cafe")
   * - type: "PlayerSpawn" or "NPCSpawn"
   * - Custom property "direction": "up" | "down" | "left" | "right"
   * - Custom property "entityId": NPC identifier (for NPC spawns)
   */
  private static parseSpawns(tilemap: Phaser.Tilemaps.Tilemap): SpawnPoint[] {
    const spawns: SpawnPoint[] = [];
    const objectLayer = tilemap.getObjectLayer(MAP_LAYERS.SPAWNS);

    if (!objectLayer) return spawns;

    for (const obj of objectLayer.objects) {
      const properties = TilemapManager.extractProperties(obj);
      const isPlayer = obj.type === 'PlayerSpawn';

      spawns.push({
        id: obj.name || 'default',
        position: {
          x: obj.x ?? 0,
          y: obj.y ?? 0,
        },
        direction: (properties['direction'] as SpawnPoint['direction']) ?? 'down',
        type: isPlayer ? 'player' : 'npc',
        entityId: properties['entityId'] as string | undefined,
      });
    }

    return spawns;
  }

  /**
   * Parse trigger zones from the "zones" object layer.
   * 
   * Expected Tiled object properties:
   * - name: zone ID
   * - type: "SceneTransition" | "EventTrigger" | "Interaction"
   * - Custom property "targetScene": scene key for transitions
   * - Custom property "spawnId": spawn point in target scene
   * - Custom property "eventId": event identifier for triggers
   */
  private static parseZones(
    tilemap: Phaser.Tilemaps.Tilemap,
    scene: Phaser.Scene
  ): MapZone[] {
    const zones: MapZone[] = [];
    const objectLayer = tilemap.getObjectLayer(MAP_LAYERS.ZONES);

    if (!objectLayer) return zones;

    for (const obj of objectLayer.objects) {
      const properties = TilemapManager.extractProperties(obj);

      let zoneType: MapZone['type'] = 'event_trigger';
      if (obj.type === 'SceneTransition') zoneType = 'scene_transition';
      else if (obj.type === 'Interaction') zoneType = 'interaction';

      zones.push({
        id: obj.name || `zone_${zones.length}`,
        bounds: new Phaser.Geom.Rectangle(
          obj.x ?? 0,
          obj.y ?? 0,
          obj.width ?? 0,
          obj.height ?? 0
        ),
        type: zoneType,
        targetScene: properties['targetScene'] as string | undefined,
        spawnId: properties['spawnId'] as string | undefined,
        eventId: properties['eventId'] as string | undefined,
      });
    }

    return zones;
  }

  /**
   * Parse collision shapes from the "collisions" object layer.
   * Creates static physics bodies for precise collision.
   * 
   * WHY object-layer collision in addition to tile collision:
   * - Tile collision is grid-aligned (16x16 blocks)
   * - Object collision can be any rectangle/polygon
   * - Perfect for irregular building shapes, fences, decorative barriers
   * - Can be toggled at runtime (e.g., unlock a gate)
   */
  private static parseCollisionObjects(
    tilemap: Phaser.Tilemaps.Tilemap,
    scene: Phaser.Scene
  ): Phaser.Physics.Arcade.StaticGroup | null {
    const objectLayer = tilemap.getObjectLayer(MAP_LAYERS.COLLISIONS);

    if (!objectLayer || objectLayer.objects.length === 0) return null;

    const group = scene.physics.add.staticGroup();

    for (const obj of objectLayer.objects) {
      const x = (obj.x ?? 0) + (obj.width ?? 0) / 2;
      const y = (obj.y ?? 0) + (obj.height ?? 0) / 2;

      // Create an invisible static body
      const body = group.create(x, y, undefined) as Phaser.Physics.Arcade.Sprite;
      body.setVisible(false);
      body.body?.setSize(obj.width ?? 0, obj.height ?? 0);
      body.refreshBody();
    }

    return group;
  }

  /**
   * Extract custom properties from a Tiled object.
   * 
   * Tiled stores custom properties in an array format:
   * [{ name: "key", type: "string", value: "val" }, ...]
   * 
   * This normalizes them into a simple key-value record.
   */
  private static extractProperties(
    obj: Phaser.Types.Tilemaps.TiledObject
  ): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    if (obj.properties && Array.isArray(obj.properties)) {
      for (const prop of obj.properties as Array<{ name: string; value: string | number | boolean }>) {
        result[prop.name] = prop.value;
      }
    }

    return result;
  }

  /**
   * Find a specific spawn point by ID.
   * Convenience method for scenes to locate where to place the player.
   */
  static findSpawn(spawns: SpawnPoint[], id: string): SpawnPoint | undefined {
    return spawns.find(s => s.id === id);
  }

  /**
   * Find the default player spawn point.
   */
  static findPlayerSpawn(spawns: SpawnPoint[], id?: string): SpawnPoint | undefined {
    if (id) {
      const specific = spawns.find(s => s.id === id && s.type === 'player');
      if (specific) return specific;
    }
    // Fallback to first player spawn
    return spawns.find(s => s.type === 'player');
  }
}
