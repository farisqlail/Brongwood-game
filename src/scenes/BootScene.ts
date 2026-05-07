/**
 * BootScene - The very first scene that runs.
 * 
 * Responsibilities:
 * 1. Initialize the GameManager (creates all persistent systems)
 * 2. Set up global game settings
 * 3. Transition to PreloadScene immediately
 * 
 * WHY initialize GameManager here:
 * - It needs to exist before any gameplay scene runs
 * - It persists across all scene transitions
 * - BootScene runs exactly once, making it the perfect initialization point
 */

import Phaser from 'phaser';
import { SCENE_KEYS } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // Load minimal assets needed for the loading screen
    // (currently none — loading bar uses Phaser primitives)
  }

  create(): void {
    // Initialize the global game manager (creates all persistent systems)
    gameManager.initialize();

    // Set global game settings
    this.scale.on('resize', this.handleResize, this);

    // Immediately transition to preload
    this.scene.start(SCENE_KEYS.PRELOAD);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
  }
}
