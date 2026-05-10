/**
 * SceneAtmosphere — atmosphere + weather for activity/house scenes.
 *
 * Bundles AtmosphereSystem (day/night colour tint) and WeatherSystem
 * (rain particles + darkness) into a single lifecycle object.
 *
 * Usage:
 *   this.atmosphere = new SceneAtmosphere(this);
 *   // in update:
 *   this.atmosphere.update(delta);
 *   // in onShutdown:
 *   this.atmosphere.destroy();
 */

import Phaser from 'phaser';
import { AtmosphereSystem } from '@/systems/AtmosphereSystem';
import { WeatherSystem, WeatherState } from '@/systems/WeatherSystem';
import { gameManager } from '@/managers/GameManager';

export class SceneAtmosphere {
  private atmo: AtmosphereSystem;
  private weather: WeatherSystem | null;

  get isRaining(): boolean { return this.weather?.isRaining ?? false; }
  get weatherState(): WeatherState { return this.weather?.state ?? 'clear'; }

  constructor(scene: Phaser.Scene, options: { weather?: boolean } = {}) {
    this.atmo    = new AtmosphereSystem(scene, gameManager.time);
    this.weather = options.weather === false ? null : new WeatherSystem(scene);
  }

  update(delta: number): void {
    this.atmo.update();
    this.weather?.update(delta);
  }

  destroy(): void {
    this.atmo.destroy();
    this.weather?.destroy();
  }
}
