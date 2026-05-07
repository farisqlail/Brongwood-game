/**
 * Shared type definitions used across the entire game.
 * 
 * WHY: TypeScript interfaces enforce contracts between systems.
 * When the dialogue system emits an event, the relationship system
 * knows exactly what shape the data will be.
 */

/** Cardinal + diagonal directions for movement and animation */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Player state machine states */
export type PlayerState = 'idle' | 'walking' | 'interacting';

/** Vector2 shorthand */
export interface Vec2 {
  x: number;
  y: number;
}

/** Tile coordinate (grid position, not pixel position) */
export interface TileCoord {
  col: number;
  row: number;
}

/** Generic entity configuration */
export interface EntityConfig {
  x: number;
  y: number;
  texture: string;
  frame?: number;
}

/** Scene transition data passed between scenes */
export interface SceneTransitionData {
  targetScene: string;
  spawnPoint?: Vec2;
  fromScene?: string;
  fadeColor?: number;
  fadeDuration?: number;
}
