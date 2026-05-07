/**
 * Asset Type Definitions
 * 
 * These types define the contract for sprite atlases, animations,
 * and the data-driven animation system.
 * 
 * WHY data-driven animations:
 * 1. Adding a new character = adding a config entry, not writing code
 * 2. Artists can define animations in JSON without touching TypeScript
 * 3. Animation configs can be hot-reloaded during development
 * 4. All animation metadata is visible in one place
 * 5. Supports complex animation features (events, transitions, blending)
 * 
 * ATLAS FORMAT (Phaser JSON Hash):
 * Phaser supports multiple atlas formats. We use "JSON Hash" because:
 * - Frame names are strings (semantic: "lail-walk-down-0")
 * - Compatible with TexturePacker, free-tex-packer, Aseprite export
 * - Supports trimmed frames (transparent pixels removed for GPU efficiency)
 * - Supports pivot points (anchor offsets per frame)
 * 
 * EXPECTED ATLAS JSON STRUCTURE:
 * {
 *   "frames": {
 *     "lail-idle-down-0": { "frame": {"x":0,"y":0,"w":32,"h":48}, ... },
 *     "lail-walk-down-0": { "frame": {"x":32,"y":0,"w":32,"h":48}, ... },
 *     ...
 *   },
 *   "meta": { "image": "lail.png", "size": {"w":256,"h":192}, ... }
 * }
 * 
 * FRAME NAMING CONVENTION:
 * {character}-{action}-{direction}-{frameIndex}
 * Examples:
 *   lail-idle-down-0
 *   lail-walk-left-2
 *   rika-idle-down-0
 *   rika-talk-down-1
 */

import { Direction } from './common';

// ============================================================
// ANIMATION DEFINITIONS
// ============================================================

/**
 * Defines a single animation sequence.
 * This is the data that drives Phaser's animation system.
 */
export interface AnimationDef {
  /** Unique animation key (e.g., "lail-walk-down") */
  key: string;
  /** Texture key (atlas name) containing the frames */
  textureKey: string;
  /** Frame names in order (for atlas) OR frame indices (for spritesheet) */
  frames: string[] | number[];
  /** Playback speed in frames per second */
  frameRate: number;
  /** -1 = loop forever, 0 = play once, N = repeat N times */
  repeat: number;
  /** Whether to yoyo (play forward then backward) */
  yoyo?: boolean;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Delay between repeats (ms) */
  repeatDelay?: number;
}

/**
 * A complete animation set for a character entity.
 * Groups all animations by action and direction.
 * 
 * WHY grouped by character:
 * - Easy to see all animations for one entity
 * - AnimationSystem can validate "does this character have a walk-left?"
 * - Supports fallback logic (no walk-left? mirror walk-right)
 */
export interface CharacterAnimationSet {
  /** Character identifier (matches texture key) */
  characterKey: string;
  /** Texture atlas key */
  textureKey: string;
  /** Frame dimensions (for collision/offset calculations) */
  frameWidth: number;
  frameHeight: number;
  /** All animation definitions for this character */
  animations: AnimationDef[];
  /** Default animation to play when no state is active */
  defaultAnimation: string;
}

/**
 * Supported character actions (animation states).
 * Each action can have 4 directional variants.
 */
export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'talk'
  | 'interact'
  | 'sit'
  | 'sleep'
  | 'emote';

/**
 * Generates the animation key for a character + action + direction.
 * This is the standard naming convention used everywhere.
 */
export function getAnimKey(character: string, action: CharacterAction, direction: Direction): string {
  return `${character}-${action}-${direction}`;
}

/**
 * Generates frame names for an animation sequence.
 * Assumes naming convention: {character}-{action}-{direction}-{index}
 * 
 * @param character - Character key (e.g., "lail")
 * @param action - Action name (e.g., "walk")
 * @param direction - Direction (e.g., "down")
 * @param frameCount - Number of frames in the animation
 * @returns Array of frame names ["lail-walk-down-0", "lail-walk-down-1", ...]
 */
export function generateFrameNames(
  character: string,
  action: string,
  direction: Direction,
  frameCount: number
): string[] {
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(`${character}-${action}-${direction}-${i}`);
  }
  return frames;
}

// ============================================================
// ATLAS METADATA
// ============================================================

/**
 * Metadata about a loaded texture atlas.
 * Used by systems that need to know frame dimensions without
 * querying the texture manager directly.
 */
export interface AtlasMetadata {
  /** Texture key in Phaser's cache */
  key: string;
  /** Total number of frames in the atlas */
  frameCount: number;
  /** Standard frame dimensions (may vary per frame in trimmed atlases) */
  frameWidth: number;
  frameHeight: number;
  /** Whether this atlas uses trimmed frames */
  trimmed: boolean;
}

// ============================================================
// SPRITESHEET METADATA (for fixed-grid sheets)
// ============================================================

/**
 * Configuration for a fixed-grid spritesheet.
 * Used when all frames are the same size (simpler than atlas).
 * 
 * WHEN TO USE SPRITESHEET vs ATLAS:
 * - Spritesheet: All frames same size, simple grid layout, quick to set up
 * - Atlas: Mixed frame sizes, trimmed transparency, named frames, production-ready
 * 
 * For Brongwood, characters use ATLAS (complex animations),
 * while simple effects (particles, sparkles) may use SPRITESHEET.
 */
export interface SpritesheetMeta {
  key: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  columns: number;
  rows: number;
}
