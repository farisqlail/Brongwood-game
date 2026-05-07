/**
 * Animation Registry - Data-driven animation definitions for all characters.
 * 
 * WHY data-driven:
 * 1. Adding a new character = adding an entry here. Zero code changes elsewhere.
 * 2. Artists can preview animations by editing frame counts/rates here.
 * 3. The AnimationLoader reads this and registers all anims with Phaser.
 * 4. Supports future hot-reload during development.
 * 5. All animation metadata is visible and auditable in one file.
 * 
 * FRAME NAMING CONVENTION:
 * {character}-{action}-{direction}-{frameIndex}
 * 
 * Examples:
 *   lail-idle-down-0, lail-idle-down-1, lail-idle-down-2, lail-idle-down-3
 *   lail-walk-left-0, lail-walk-left-1, lail-walk-left-2, lail-walk-left-3
 * 
 * This convention is used by:
 * - Your art tool (Aseprite tags → export with this naming)
 * - TexturePacker (auto-names frames from folder structure)
 * - The AnimationLoader (generates frame arrays from this pattern)
 * - The AnimationSystem (constructs keys at runtime)
 * 
 * WORKFLOW FOR ARTISTS:
 * 1. Create sprite in Aseprite with tags: "idle-down", "walk-down", etc.
 * 2. Export as spritesheet with JSON (Hash format)
 * 3. Frame names auto-match: "lail-idle-down-0", "lail-idle-down-1"...
 * 4. Place PNG + JSON in public/assets/sprites/characters/
 * 5. Uncomment the atlas entry in assets.manifest.ts
 * 6. Done — animations auto-register on load.
 */

import { CharacterAnimationSet, AnimationDef, generateFrameNames } from '@/types/assets';
import { TEXTURE_KEYS } from './assets.manifest';
import { PLAYER_CONFIG } from './game.config';
import { Direction } from '@/types/common';

// ============================================================
// HELPER: Generate standard directional animations
// ============================================================

/**
 * Generates a full set of directional animations for a character action.
 * Creates 4 animations (up, down, left, right) with consistent naming.
 * 
 * @param character - Character key
 * @param textureKey - Atlas texture key
 * @param action - Action name (idle, walk, etc.)
 * @param frameCount - Frames per direction
 * @param frameRate - Playback speed
 * @param repeat - -1 for loop, 0 for once
 */
function createDirectionalAnims(
  character: string,
  textureKey: string,
  action: string,
  frameCount: number,
  frameRate: number,
  repeat: number,
  options?: { yoyo?: boolean }
): AnimationDef[] {
  const directions: Direction[] = ['down', 'up', 'left', 'right'];
  return directions.map(dir => ({
    key: `${character}-${action}-${dir}`,
    textureKey,
    frames: generateFrameNames(character, action, dir, frameCount),
    frameRate,
    repeat,
    yoyo: options?.yoyo,
  }));
}

// ============================================================
// CHARACTER ANIMATION SETS
// ============================================================

/**
 * Lail (Player Character) - Animation Set
 * 
 * Animations:
 * - idle: 4 frames, slow breathing cycle (atmospheric, alive feel)
 * - walk: 6 frames, smooth walk cycle (responsive, grounded)
 * 
 * FUTURE ADDITIONS:
 * - run: faster movement for open areas
 * - interact: reaching out to objects/NPCs
 * - sit: resting on benches (cozy moments)
 * - emote: emotional reactions during dialogue
 */
export const LAIL_ANIMATIONS: CharacterAnimationSet = {
  characterKey: 'lail',
  textureKey: TEXTURE_KEYS.PLAYER,
  frameWidth: PLAYER_CONFIG.FRAME_WIDTH,
  frameHeight: PLAYER_CONFIG.FRAME_HEIGHT,
  animations: [
    // Idle: slow, breathing animation (4 frames, looping)
    ...createDirectionalAnims('lail', TEXTURE_KEYS.PLAYER, 'idle', 4, PLAYER_CONFIG.IDLE_FRAMERATE, -1),
    // Walk: smooth 6-frame walk cycle (looping)
    ...createDirectionalAnims('lail', TEXTURE_KEYS.PLAYER, 'walk', 6, PLAYER_CONFIG.ANIM_FRAMERATE, -1),
  ],
  defaultAnimation: 'lail-idle-down',
};

/**
 * Rika (First NPC) - Animation Set
 * 
 * Rika has additional animations for dialogue and emotional moments.
 */
export const RIKA_ANIMATIONS: CharacterAnimationSet = {
  characterKey: 'rika',
  textureKey: TEXTURE_KEYS.RIKA,
  frameWidth: 32,
  frameHeight: 48,
  animations: [
    ...createDirectionalAnims('rika', TEXTURE_KEYS.RIKA, 'idle', 4, 4, -1),
    ...createDirectionalAnims('rika', TEXTURE_KEYS.RIKA, 'walk', 6, 8, -1),
    // Talk animation (used during dialogue)
    ...createDirectionalAnims('rika', TEXTURE_KEYS.RIKA, 'talk', 4, 6, -1),
  ],
  defaultAnimation: 'rika-idle-down',
};

// ============================================================
// REGISTRY
// ============================================================

/**
 * All character animation sets, keyed by character identifier.
 * The AnimationLoader iterates this to register all animations with Phaser.
 */
export const ANIMATION_REGISTRY: Record<string, CharacterAnimationSet> = {
  lail: LAIL_ANIMATIONS,
  rika: RIKA_ANIMATIONS,
};

/**
 * Get all animation definitions as a flat array (for batch registration).
 */
export function getAllAnimationDefs(): AnimationDef[] {
  const allAnims: AnimationDef[] = [];
  for (const set of Object.values(ANIMATION_REGISTRY)) {
    allAnims.push(...set.animations);
  }
  return allAnims;
}
