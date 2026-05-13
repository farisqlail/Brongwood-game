/**
 * Entry point for Brongwood.
 * 
 * WHY this structure:
 * - Phaser.Game is the root object that manages everything
 * - We pass a config object that defines rendering, physics, scaling
 * - Scenes are registered here but only started on demand
 * - The AUTO renderer picks WebGL if available, falls back to Canvas
 * 
 * RESOLUTION STRATEGY (32x32 pixel art):
 * - Internal resolution: 384x216 pixels (16:9 ratio)
 * - This is the "virtual pixel canvas" — all game logic uses these coordinates
 * - Phaser's scale manager upscales to fill the browser window
 * - 384x216 * 3 = 1152x648, * 5 = 1920x1080
 * - pixelArt: true ensures nearest-neighbor scaling (crisp pixels)
 * 
 * WHY 384x216:
 * - 16:9 ratio (scales to all modern displays)
 * - 384/32 = 12 tiles visible horizontally (intimate framing)
 * - Matches the aesthetic of Eastward, CrossCode, Moonlighter
 * - Small enough for cozy atmosphere, large enough for 32x32 detail
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from './config/game.config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { NewGamePrologueScene } from './scenes/NewGamePrologueScene';
import { WorldScene } from './scenes/WorldScene';
import { CafeScene } from './scenes/CafeScene';
import { PlayerHouseScene } from './scenes/PlayerHouseScene';
import { HouseInteriorScene } from './scenes/HouseInteriorScene';
import { FishingScene } from './scenes/FishingScene';
import { GardenScene } from './scenes/GardenScene';
import { BenchScene } from './scenes/BenchScene';
import { HomesteadScene } from './scenes/HomesteadScene';
import { FarmSupplyShopScene } from './scenes/FarmSupplyShopScene';
import { FlowerShopScene } from './scenes/FlowerShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',

  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,

  // Pixel-perfect rendering settings
  pixelArt: true,        // Disables anti-aliasing globally (nearest-neighbor scaling)
  roundPixels: true,     // Prevents sub-pixel rendering artifacts
  antialias: false,      // Extra safety for crisp pixels

  backgroundColor: '#1a1a2e',

  // Scale manager handles responsive sizing
  scale: {
    mode: Phaser.Scale.FIT,               // Maintain aspect ratio, fit in window
    autoCenter: Phaser.Scale.CENTER_BOTH,  // Center canvas in viewport
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    zoom: GAME_CONFIG.SCALE,               // Initial zoom (3x for 32px art)
  },

  // Arcade physics - lightweight, perfect for top-down RPGs
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },  // No gravity for top-down
      debug: false,               // Toggle for development
    },
  },

  // Scene registration order (first scene auto-starts)
  scene: [BootScene, PreloadScene, MainMenuScene, NewGamePrologueScene, WorldScene, CafeScene, PlayerHouseScene, HouseInteriorScene, FishingScene, GardenScene, BenchScene, HomesteadScene, FarmSupplyShopScene, FlowerShopScene],

  // Input configuration
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },

  // Performance
  fps: {
    target: GAME_CONFIG.FPS,
    forceSetTimeOut: false,
  },
};

// Create the game instance
const game = new Phaser.Game(config);

export default game;
