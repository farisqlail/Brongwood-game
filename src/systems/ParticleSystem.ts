/**
 * ParticleSystem - Ambient particles (falling leaves, dust motes, fireflies).
 * Adds life and atmosphere to the world without being distracting.
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
  type: 'leaf' | 'dust' | 'firefly';
}

export class ParticleSystem {
  private scene: Phaser.Scene;
  private graphics!: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private time: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(DEPTH.WEATHER - 5);
  }

  update(delta: number): void {
    this.time += delta * 0.001;

    // Spawn new particles based on time of day
    const period = gameManager.time.period;
    if (period === 'night' || period === 'late_night') {
      // Fireflies at night
      if (Math.random() < 0.02) this.spawnFirefly();
    } else {
      // Leaves/dust during day
      if (Math.random() < 0.03) this.spawnLeaf();
      if (Math.random() < 0.01) this.spawnDust();
    }

    // Update and draw
    this.graphics.clear();
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        toRemove.push(i);
        continue;
      }

      // Move
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);

      // Fade in/out
      const lifeRatio = p.life / p.maxLife;
      let alpha = p.alpha;
      if (lifeRatio < 0.2) alpha *= lifeRatio / 0.2;
      else if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

      // Draw based on type
      if (p.type === 'firefly') {
        // Pulsing glow
        const pulse = Math.sin(this.time * 4 + p.x) * 0.3 + 0.7;
        this.graphics.fillStyle(p.color, alpha * pulse);
        this.graphics.fillCircle(p.x, p.y, p.size);
        // Glow halo
        this.graphics.fillStyle(p.color, alpha * pulse * 0.3);
        this.graphics.fillCircle(p.x, p.y, p.size * 2.5);
      } else if (p.type === 'leaf') {
        // Swaying leaf
        const sway = Math.sin(this.time * 2 + p.y * 0.1) * 2;
        this.graphics.fillStyle(p.color, alpha);
        this.graphics.fillRect(p.x + sway, p.y, p.size, p.size * 0.6);
      } else {
        // Dust mote
        this.graphics.fillStyle(p.color, alpha);
        this.graphics.fillCircle(p.x, p.y, p.size);
      }
    }

    // Remove dead particles (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private spawnLeaf(): void {
    if (this.particles.length > 30) return;
    this.particles.push({
      x: Math.random() * GAME_CONFIG.WIDTH,
      y: -5,
      vx: 10 + Math.random() * 20,
      vy: 15 + Math.random() * 25,
      size: 2 + Math.random() * 2,
      alpha: 0.4 + Math.random() * 0.3,
      color: Math.random() > 0.5 ? 0x5a9a40 : 0x8ab050,
      life: 0,
      maxLife: 4000 + Math.random() * 3000,
      type: 'leaf',
    });
  }

  private spawnDust(): void {
    if (this.particles.length > 30) return;
    this.particles.push({
      x: Math.random() * GAME_CONFIG.WIDTH,
      y: Math.random() * GAME_CONFIG.HEIGHT,
      vx: (Math.random() - 0.5) * 5,
      vy: -2 + Math.random() * -3,
      size: 1,
      alpha: 0.2 + Math.random() * 0.2,
      color: 0xffffff,
      life: 0,
      maxLife: 3000 + Math.random() * 2000,
      type: 'dust',
    });
  }

  private spawnFirefly(): void {
    if (this.particles.length > 20) return;
    this.particles.push({
      x: Math.random() * GAME_CONFIG.WIDTH,
      y: GAME_CONFIG.HEIGHT * 0.3 + Math.random() * GAME_CONFIG.HEIGHT * 0.5,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 8,
      size: 1.5,
      alpha: 0.7 + Math.random() * 0.3,
      color: 0xffee88,
      life: 0,
      maxLife: 5000 + Math.random() * 4000,
      type: 'firefly',
    });
  }

  destroy(): void {
    this.graphics.destroy();
    this.particles = [];
  }
}
