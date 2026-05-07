/**
 * MainMenuScene - Title screen and main menu.
 * 
 * WHY: Every game needs a title screen. It serves as:
 * 1. First impression / mood setter
 * 2. Entry point for new game / continue / settings
 * 3. A "safe" place to return to from gameplay
 * 
 * For Brongwood, this will eventually feature:
 * - Animated pixel art background (rainy town scene)
 * - Soft piano BGM
 * - Warm color palette
 * - Simple menu options
 */

import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG } from '@config/game.config';

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private startText!: Phaser.GameObjects.Text;
  private blinkTimer: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU });
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    // Background gradient effect using a rectangle
    this.add.rectangle(centerX, centerY, WIDTH, HEIGHT, 0x1a1a2e);

    // Decorative elements - simple pixel stars
    this.createStarfield();

    // Game title
    this.titleText = this.add.text(centerX, centerY - 40, 'BRONGWOOD', {
      fontSize: '20px',
      color: '#f2a65a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    // Subtitle
    this.add.text(centerX, centerY - 18, 'A story of healing', {
      fontSize: '8px',
      color: '#8b8b8b',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Start prompt
    this.startText = this.add.text(centerX, centerY + 40, 'Press ENTER to start', {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    this.startText.setOrigin(0.5);

    // Version text
    this.add.text(WIDTH - 6, HEIGHT - 6, 'v0.1.0', {
      fontSize: '7px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(1, 1);

    // Input handling
    this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.on('keydown-SPACE', this.startGame, this);

    // Click/tap to start
    this.input.on('pointerdown', this.startGame, this);
  }

  update(_time: number, delta: number): void {
    // Blink the "press enter" text
    this.blinkTimer += delta;
    if (this.blinkTimer > 600) {
      this.blinkTimer = 0;
      this.startText.setVisible(!this.startText.visible);
    }
  }

  private startGame(): void {
    // Fade out transition
    this.cameras.main.fadeOut(500, 0x1a, 0x1a, 0x2e);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.WORLD);
    });
  }

  private createStarfield(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const graphics = this.add.graphics();

    // Scatter small dots as stars
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.6);
      
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillRect(x, y, 1, 1);
    }
  }
}
