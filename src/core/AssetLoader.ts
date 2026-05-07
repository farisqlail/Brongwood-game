/**
 * AssetLoader - Reads the asset manifest and loads everything into Phaser.
 * 
 * WHY a dedicated loader class:
 * 1. PreloadScene stays thin — it calls AssetLoader.loadAll() and that's it
 * 2. Loading logic is testable and reusable (e.g., lazy-load a new area)
 * 3. Handles all asset types uniformly (atlas, spritesheet, image, audio, tilemap)
 * 4. Integrates with the AnimationRegistry to auto-register animations after load
 * 5. Supports future features: lazy loading, asset bundles, download progress
 * 
 * LOADING PIPELINE:
 * 1. AssetLoader.loadAll(scene) — queues all manifest assets with Phaser's loader
 * 2. Phaser downloads everything asynchronously (fires progress events)
 * 3. After load completes, scene.create() calls AssetLoader.registerAnimations()
 * 4. All animations from ANIMATION_REGISTRY are created in Phaser's anim manager
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Atlases are preferred over individual images (fewer GPU texture swaps)
 * - Audio is loaded last (largest files, not needed immediately)
 * - Tilemap JSON is tiny — loads almost instantly
 * - Real tileset PNGs should be power-of-2 dimensions for GPU efficiency
 *   (256x256, 512x512, 1024x1024)
 */

import Phaser from 'phaser';
import {
  ASSET_MANIFEST,
  AssetEntry,
  AtlasAsset,
  SpritesheetAsset,
  ImageAsset,
  AudioAsset,
  TilemapAsset,
} from '@config/assets.manifest';
import { getAllAnimationDefs } from '@config/animations.config';
import { AnimationDef } from '@/types/assets';

export class AssetLoader {
  /**
   * Queue all manifest assets for loading.
   * Call this in PreloadScene.preload().
   * 
   * WHY in preload():
   * Phaser's loader only processes queued items during the preload phase.
   * After preload completes, the scene transitions to create().
   */
  static loadAll(scene: Phaser.Scene): void {
    const manifest = ASSET_MANIFEST;

    // Load in priority order (smallest/most critical first)
    AssetLoader.loadTilemaps(scene, manifest.tilemaps);
    AssetLoader.loadImages(scene, manifest.tilesets);
    AssetLoader.loadAtlases(scene, manifest.characters);
    AssetLoader.loadMixed(scene, manifest.ui);
    AssetLoader.loadMixed(scene, manifest.misc);
    AssetLoader.loadAudioBatch(scene, manifest.bgm);
    AssetLoader.loadAudioBatch(scene, manifest.ambience);
    AssetLoader.loadAudioBatch(scene, manifest.sfx);
  }

  /**
   * Register all animations from the animation registry.
   * Call this in PreloadScene.create() AFTER assets are loaded.
   * 
   * WHY separate from loading:
   * - Animations reference textures that must exist first
   * - Atlas-based animations use frame names that are only available after load
   * - This two-phase approach (load → register) prevents race conditions
   */
  static registerAnimations(scene: Phaser.Scene): void {
    const animDefs = getAllAnimationDefs();

    for (const def of animDefs) {
      // Skip if texture doesn't exist (placeholder mode)
      if (!scene.textures.exists(def.textureKey)) {
        continue;
      }

      // Skip if animation already registered (prevents duplicates on scene restart)
      if (scene.anims.exists(def.key)) {
        continue;
      }

      const frames = AssetLoader.resolveFrames(scene, def);
      if (frames.length === 0) continue;

      scene.anims.create({
        key: def.key,
        frames,
        frameRate: def.frameRate,
        repeat: def.repeat,
        yoyo: def.yoyo ?? false,
        delay: def.delay ?? 0,
        repeatDelay: def.repeatDelay ?? 0,
      });
    }
  }

  // ============================================================
  // PRIVATE LOADING METHODS
  // ============================================================

  private static loadAtlases(scene: Phaser.Scene, assets: AtlasAsset[]): void {
    for (const asset of assets) {
      scene.load.atlas(asset.key, asset.imagePath, asset.jsonPath);
    }
  }

  private static loadImages(scene: Phaser.Scene, assets: ImageAsset[]): void {
    for (const asset of assets) {
      scene.load.image(asset.key, asset.path);
    }
  }

  private static loadTilemaps(scene: Phaser.Scene, assets: TilemapAsset[]): void {
    for (const asset of assets) {
      scene.load.tilemapTiledJSON(asset.key, asset.path);
    }
  }

  private static loadAudioBatch(scene: Phaser.Scene, assets: AudioAsset[]): void {
    for (const asset of assets) {
      scene.load.audio(asset.key, asset.paths);
    }
  }

  /**
   * Load mixed asset arrays (UI, misc) that can contain different types.
   */
  private static loadMixed(scene: Phaser.Scene, assets: (ImageAsset | AtlasAsset | SpritesheetAsset)[]): void {
    for (const asset of assets) {
      switch (asset.type) {
        case 'image':
          scene.load.image(asset.key, asset.path);
          break;
        case 'atlas':
          scene.load.atlas(asset.key, asset.imagePath, asset.jsonPath);
          break;
        case 'spritesheet':
          scene.load.spritesheet(asset.key, asset.imagePath, {
            frameWidth: asset.frameWidth,
            frameHeight: asset.frameHeight,
            margin: asset.margin ?? 0,
            spacing: asset.spacing ?? 0,
          });
          break;
      }
    }
  }

  // ============================================================
  // FRAME RESOLUTION
  // ============================================================

  /**
   * Resolve animation frames from definition.
   * 
   * Handles two cases:
   * 1. String frames → atlas frame names (e.g., "lail-walk-down-0")
   * 2. Number frames → spritesheet indices (e.g., 0, 1, 2, 3)
   */
  private static resolveFrames(
    scene: Phaser.Scene,
    def: AnimationDef
  ): Phaser.Types.Animations.AnimationFrame[] {
    if (def.frames.length === 0) return [];

    if (typeof def.frames[0] === 'string') {
      // Atlas frames (named)
      const frameNames = def.frames as string[];

      // Validate that frames exist in the atlas
      const texture = scene.textures.get(def.textureKey);
      const validFrames = frameNames.filter(name => texture.has(name));

      if (validFrames.length === 0) {
        // Frames don't exist yet (placeholder mode) — skip silently
        return [];
      }

      return validFrames.map(name => ({
        key: def.textureKey,
        frame: name,
      }));
    } else {
      // Spritesheet frames (numeric indices)
      const frameIndices = def.frames as number[];
      return frameIndices.map(index => ({
        key: def.textureKey,
        frame: index,
      }));
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Check if a specific texture is loaded and available.
   * Useful for conditional rendering (show placeholder if art missing).
   */
  static isTextureLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
  }

  /**
   * Get the frame count for a loaded atlas.
   * Returns 0 if the texture doesn't exist.
   */
  static getAtlasFrameCount(scene: Phaser.Scene, key: string): number {
    if (!scene.textures.exists(key)) return 0;
    return scene.textures.get(key).getFrameNames().length;
  }
}
