import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';

export type CinematicLightingProfile =
  | 'cozy_world'
  | 'rainy_night'
  | 'morning_coastal'
  | 'flower_shop';

interface LightingPreset {
  grade: { color: number; alpha: number };
  shadow: { color: number; alpha: number };
  vignette: { color: number; alpha: number };
  glow: { color: number; alpha: number };
  reflection: { color: number; alpha: number };
}

const LIGHTING_PRESETS: Record<CinematicLightingProfile, LightingPreset> = {
  cozy_world: {
    grade: { color: 0xf0c37a, alpha: 0.025 },
    shadow: { color: 0x142033, alpha: 0 },
    vignette: { color: 0x0a0c16, alpha: 0 },
    glow: { color: 0xffc46d, alpha: 0 },
    reflection: { color: 0xb8d2e8, alpha: 0 },
  },
  rainy_night: {
    grade: { color: 0x203a70, alpha: 0.18 },
    shadow: { color: 0x050814, alpha: 0.08 },
    vignette: { color: 0x02040b, alpha: 0.08 },
    glow: { color: 0xd18a43, alpha: 0.08 },
    reflection: { color: 0x8bb0d8, alpha: 0.09 },
  },
  morning_coastal: {
    grade: { color: 0xffe2a8, alpha: 0.07 },
    shadow: { color: 0x8fb8c8, alpha: 0 },
    vignette: { color: 0x6f8aa0, alpha: 0 },
    glow: { color: 0xffd18c, alpha: 0.035 },
    reflection: { color: 0xf4e7c8, alpha: 0.02 },
  },
  flower_shop: {
    grade: { color: 0xffc37a, alpha: 0.11 },
    shadow: { color: 0x2c1c18, alpha: 0.04 },
    vignette: { color: 0x120b08, alpha: 0.045 },
    glow: { color: 0xffbf66, alpha: 0.08 },
    reflection: { color: 0xffdf9f, alpha: 0.02 },
  },
};

export class CinematicLightingSystem {
  private scene: Phaser.Scene;
  private profile: CinematicLightingProfile;
  private grade: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Graphics;
  private vignette: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private reflection: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene, profile: CinematicLightingProfile = 'cozy_world') {
    this.scene = scene;
    this.profile = profile;

    this.grade = scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH,
      GAME_CONFIG.HEIGHT,
      0xffffff,
      0,
    );
    this.grade.setScrollFactor(0).setDepth(DEPTH.LIGHTING + 1);

    this.shadow = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING + 2);
    this.vignette = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING + 3);
    this.reflection = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING + 4);
    this.glow = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.LIGHTING + 5);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.reflection.setBlendMode(Phaser.BlendModes.ADD);

    this.draw();
  }

  setProfile(profile: CinematicLightingProfile): void {
    if (this.profile === profile) return;
    this.profile = profile;
    this.draw();
  }

  update(delta: number): void {
    this.time += delta * 0.001;
    this.draw();
  }

  destroy(): void {
    this.grade.destroy();
    this.shadow.destroy();
    this.vignette.destroy();
    this.glow.destroy();
    this.reflection.destroy();
  }

  private draw(): void {
    const preset = LIGHTING_PRESETS[this.profile];
    const flicker = 0.92 + Math.sin(this.time * 1.7) * 0.035 + Math.sin(this.time * 4.1) * 0.015;

    this.grade.setFillStyle(preset.grade.color, preset.grade.alpha);
    this.grade.setBlendMode(Phaser.BlendModes.NORMAL);

    this.shadow.clear();
    if (preset.shadow.alpha > 0) {
      this.shadow.fillStyle(preset.shadow.color, preset.shadow.alpha);
      this.shadow.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    }

    this.drawVignette(preset.vignette.color, preset.vignette.alpha);
    this.drawGlow(preset.glow.color, preset.glow.alpha * flicker);
    this.drawReflections(preset.reflection.color, preset.reflection.alpha);
  }

  private drawVignette(color: number, alpha: number): void {
    this.vignette.clear();
    if (alpha <= 0) return;

    this.vignette.fillStyle(color, alpha);
    this.vignette.fillRect(0, 0, GAME_CONFIG.WIDTH, 14);
    this.vignette.fillRect(0, GAME_CONFIG.HEIGHT - 18, GAME_CONFIG.WIDTH, 18);

    this.vignette.fillStyle(color, alpha * 0.55);
    this.vignette.fillRect(0, 14, GAME_CONFIG.WIDTH, 10);
    this.vignette.fillRect(0, GAME_CONFIG.HEIGHT - 28, GAME_CONFIG.WIDTH, 10);
  }

  private drawGlow(color: number, alpha: number): void {
    this.glow.clear();
    if (alpha <= 0) return;

    this.glow.fillStyle(color, alpha * 0.35);
    this.glow.fillRect(0, 0, GAME_CONFIG.WIDTH, 38);
    this.glow.fillRect(0, 38, GAME_CONFIG.WIDTH, 22);

    this.glow.fillStyle(color, alpha * 0.22);
    this.glow.fillRect(0, GAME_CONFIG.HEIGHT - 70, GAME_CONFIG.WIDTH, 30);

    if (this.profile === 'rainy_night' || this.profile === 'flower_shop') {
      this.glow.fillStyle(color, alpha * 0.26);
      this.glow.fillRect(0, 34, GAME_CONFIG.WIDTH, 44);
      this.glow.fillStyle(color, alpha * 0.16);
      this.glow.fillRect(0, 78, GAME_CONFIG.WIDTH, 36);
    }

    if (this.profile === 'morning_coastal') {
      this.glow.fillStyle(color, alpha * 0.28);
      this.glow.fillRect(0, 0, GAME_CONFIG.WIDTH, 58);
    }
  }

  private drawReflections(color: number, alpha: number): void {
    this.reflection.clear();
    if (alpha <= 0 || this.profile === 'cozy_world') return;

    this.reflection.fillStyle(color, alpha);
    for (let i = 0; i < 9; i++) {
      const y = GAME_CONFIG.HEIGHT * 0.48 + i * 18;
      const width = 28 + (i % 3) * 20;
      const x = 48 + ((i * 73) % (GAME_CONFIG.WIDTH - 96));
      this.reflection.fillRect(x, y, width, 1);
      this.reflection.fillRect(x + 8, y + 4, Math.max(10, width - 16), 1);
    }

    if (this.profile === 'rainy_night') {
      this.reflection.fillStyle(0xffb86a, alpha * 0.42);
      this.reflection.fillRect(68, GAME_CONFIG.HEIGHT - 76, 52, 1);
      this.reflection.fillRect(76, GAME_CONFIG.HEIGHT - 69, 34, 1);
      this.reflection.fillStyle(0x7fa7d8, alpha * 0.5);
      this.reflection.fillRect(GAME_CONFIG.WIDTH - 150, GAME_CONFIG.HEIGHT - 84, 84, 1);
      this.reflection.fillRect(GAME_CONFIG.WIDTH - 132, GAME_CONFIG.HEIGHT - 76, 50, 1);
    }
  }
}
