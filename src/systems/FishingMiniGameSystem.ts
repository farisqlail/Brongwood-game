import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';
import { EventBus, TimePeriod } from '@/core/EventBus';
import { InventoryItem, ITEM_DEFS } from '@/types/inventory';
import { WeatherState } from '@/systems/WeatherSystem';
import { proceduralAudio } from '@/audio/ProceduralAudio';

export type FishItemId = 'small_fish' | 'reef_fish' | 'night_fish' | 'rain_fish' | 'rare_fish';

export interface FishingZoneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FishingMiniGameConfig {
  player: Phaser.Physics.Arcade.Sprite;
  zone: FishingZoneConfig;
  getWeather: () => WeatherState;
}

export interface FishingContext {
  hour: number;
  period: TimePeriod;
  weather: WeatherState;
  accuracy: number;
}

interface FishWeight {
  id: FishItemId;
  weight: number;
}

const BAR_W = 148;
const BAR_H = 10;
const BAR_X = GAME_CONFIG.WIDTH / 2 - BAR_W / 2;
const BAR_Y = GAME_CONFIG.HEIGHT / 2 + 48;
const MARKER_W = 5;
const PERFECT_THRESHOLD = 0.86;
const GOOD_THRESHOLD = 0.58;
const FISHING_STAMINA_COST = 4;
const FISHING_TIME_MINUTES = 20;

export function getFishWeights(context: Omit<FishingContext, 'accuracy'>): FishWeight[] {
  const isRain = context.weather !== 'clear';
  const isNight = context.period === 'evening' || context.period === 'night' || context.period === 'late_night';
  const isDawn = context.period === 'dawn' || context.hour < 8;

  const weights: FishWeight[] = [
    { id: 'small_fish', weight: isDawn ? 54 : 42 },
    { id: 'reef_fish', weight: isNight ? 18 : 28 },
    { id: 'night_fish', weight: isNight ? 24 : 4 },
    { id: 'rain_fish', weight: isRain ? 28 : 3 },
    { id: 'rare_fish', weight: 2 + (isRain ? 3 : 0) + (isNight ? 3 : 0) },
  ];

  return weights.filter((entry) => entry.weight > 0);
}

export function selectFishingCatch(context: FishingContext, random: () => number = Math.random): FishItemId | null {
  if (context.accuracy < GOOD_THRESHOLD) return null;

  const weights = getFishWeights(context);
  const boostedWeights = weights.map((entry) => {
    if (entry.id !== 'rare_fish') return entry;
    const perfectBoost = context.accuracy >= PERFECT_THRESHOLD ? 12 : 0;
    return { ...entry, weight: entry.weight + perfectBoost };
  });

  const total = boostedWeights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of boostedWeights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }

  return boostedWeights[boostedWeights.length - 1]?.id ?? null;
}

export class FishingMiniGameSystem {
  private readonly scene: Phaser.Scene;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly getWeather: () => WeatherState;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly barGraphics: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Container;
  private inZone = false;
  private playerOverlapping = false;
  private active = false;
  private marker = 0;
  private markerDirection = 1;
  private markerSpeed = 0.0025;
  private targetCenter = 0.5;
  private targetWidth = 0.24;

  constructor(scene: Phaser.Scene, config: FishingMiniGameConfig) {
    this.scene = scene;
    this.player = config.player;
    this.getWeather = config.getWeather;

    this.zone = scene.add.zone(
      config.zone.x + config.zone.width / 2,
      config.zone.y + config.zone.height / 2,
      config.zone.width,
      config.zone.height,
    );
    scene.physics.add.existing(this.zone, true);
    scene.physics.add.overlap(this.player, this.zone, () => {
      this.playerOverlapping = true;
    });

    this.promptText = scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 55, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 15).setVisible(false);

    this.statusText = scene.add.text(GAME_CONFIG.WIDTH / 2, BAR_Y - 24, '', {
      fontSize: '8px',
      color: '#f2e8d0',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);

    this.barGraphics = scene.add.graphics().setScrollFactor(0);
    this.overlay = scene.add.container(0, 0, [this.barGraphics, this.statusText])
      .setDepth(DEPTH.UI + 24)
      .setVisible(false);
  }

  get isActive(): boolean {
    return this.active;
  }

  get isInZone(): boolean {
    return this.inZone;
  }

  update(delta: number, canShowPrompt: boolean = true): void {
    this.inZone = this.playerOverlapping;
    this.playerOverlapping = false;

    if (this.active) {
      this.updateMarker(delta);
      this.drawBar();
      this.promptText.setVisible(false);
      return;
    }

    if (!this.inZone || !canShowPrompt) {
      this.promptText.setVisible(false);
      return;
    }

    this.promptText.setText('[E] Lempar kail');
    this.promptText.setVisible(true);
  }

  handleAction(): boolean {
    if (this.active) {
      this.resolveCatch();
      return true;
    }

    if (!this.inZone) return false;
    this.start();
    return true;
  }

  destroy(): void {
    this.zone.destroy();
    this.promptText.destroy();
    this.overlay.destroy();
  }

  private start(): void {
    const selected = gameManager.inventory.getSelectedItem();
    if (selected?.id !== 'fishing_rod') {
      this.showFloatingText('Pilih fishing rod', 0xffd36a);
      return;
    }

    if (gameManager.stamina < FISHING_STAMINA_COST) {
      this.showFloatingText('Stamina habis', 0xff7a6a);
      return;
    }

    gameManager.consumeStamina(FISHING_STAMINA_COST);
    proceduralAudio.playClick();
    this.active = true;
    this.marker = 0.05 + Math.random() * 0.9;
    this.markerDirection = Math.random() < 0.5 ? -1 : 1;
    this.targetCenter = 0.22 + Math.random() * 0.56;
    this.targetWidth = this.getTargetWidth();
    this.markerSpeed = this.getMarkerSpeed();
    this.statusText.setText('Tekan E saat marker masuk zona');
    this.overlay.setVisible(true);
    EventBus.emit('event:player-locked', { locked: true });
  }

  private resolveCatch(): void {
    const targetMin = this.targetCenter - this.targetWidth / 2;
    const targetMax = this.targetCenter + this.targetWidth / 2;
    const targetDistance = this.marker < targetMin
      ? targetMin - this.marker
      : this.marker > targetMax
        ? this.marker - targetMax
        : 0;
    const accuracy = Phaser.Math.Clamp(1 - targetDistance / 0.32, 0, 1);
    const fishId = selectFishingCatch({
      hour: gameManager.time.hour,
      period: gameManager.time.period,
      weather: this.getWeather(),
      accuracy,
    });

    gameManager.time.advanceTo(gameManager.time.hour, gameManager.time.minute + FISHING_TIME_MINUTES);
    this.active = false;
    this.overlay.setVisible(false);
    EventBus.emit('event:player-locked', { locked: false });

    if (!fishId) {
      this.showFloatingText('Ikan lepas...', 0xffd36a);
      return;
    }

    const item = ITEM_DEFS[fishId] as InventoryItem | undefined;
    if (!item) return;

    if (gameManager.inventory.isFull() && !gameManager.inventory.hasItem(item.id)) {
      this.showFloatingText('Inventori penuh', 0xff7a6a);
      return;
    }

    const slot = gameManager.inventory.addItem({ ...item, quantity: 1 });
    if (slot === -1) {
      this.showFloatingText('Inventori penuh', 0xff7a6a);
      return;
    }

    const prefix = accuracy >= PERFECT_THRESHOLD ? 'Perfect! ' : '';
    this.showFloatingText(`${prefix}+ ${item.name}`, accuracy >= PERFECT_THRESHOLD ? 0xf8e36a : 0x8ff28a);
  }

  private updateMarker(delta: number): void {
    this.marker += this.markerDirection * this.markerSpeed * delta;
    if (this.marker <= 0) {
      this.marker = 0;
      this.markerDirection = 1;
    } else if (this.marker >= 1) {
      this.marker = 1;
      this.markerDirection = -1;
    }
  }

  private drawBar(): void {
    const g = this.barGraphics;
    g.clear();
    g.fillStyle(0x0f1720, 0.88);
    g.fillRoundedRect(BAR_X - 8, BAR_Y - 20, BAR_W + 16, 42, 5);
    g.lineStyle(1, 0xf2a65a, 0.55);
    g.strokeRoundedRect(BAR_X - 8, BAR_Y - 20, BAR_W + 16, 42, 5);

    g.fillStyle(0x263642, 1);
    g.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 3);

    const targetX = BAR_X + (this.targetCenter - this.targetWidth / 2) * BAR_W;
    const targetW = this.targetWidth * BAR_W;
    g.fillStyle(0x68c66b, 0.9);
    g.fillRoundedRect(targetX, BAR_Y, targetW, BAR_H, 3);

    const perfectW = Math.max(8, targetW * 0.35);
    g.fillStyle(0xf8e36a, 0.9);
    g.fillRoundedRect(BAR_X + this.targetCenter * BAR_W - perfectW / 2, BAR_Y, perfectW, BAR_H, 3);

    const markerX = BAR_X + this.marker * BAR_W;
    g.fillStyle(0xffffff, 1);
    g.fillRect(markerX - MARKER_W / 2, BAR_Y - 4, MARKER_W, BAR_H + 8);
  }

  private getTargetWidth(): number {
    const weather = this.getWeather();
    const period = gameManager.time.period;
    const night = period === 'night' || period === 'late_night';
    const rainPenalty = weather === 'heavy_rain' ? 0.04 : weather !== 'clear' ? 0.02 : 0;
    const nightPenalty = night ? 0.03 : 0;
    const toolBonus = (gameManager.getToolLevel('fishing_rod') - 1) * 0.025;
    return Math.max(0.14, 0.25 - rainPenalty - nightPenalty + toolBonus);
  }

  private getMarkerSpeed(): number {
    const weather = this.getWeather();
    const period = gameManager.time.period;
    const rainBoost = weather === 'heavy_rain' ? 0.0007 : weather !== 'clear' ? 0.00035 : 0;
    const nightBoost = period === 'night' || period === 'late_night' ? 0.00025 : 0;
    const toolReduction = (gameManager.getToolLevel('fishing_rod') - 1) * 0.00018;
    return Math.max(0.0017, 0.00235 + rainBoost + nightBoost - toolReduction);
  }

  private showFloatingText(text: string, color: number): void {
    const label = this.scene.add.text(this.player.x, this.player.y - 36, text, {
      fontSize: '8px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 6, y: 4 },
      align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.UI + 28);

    this.scene.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
