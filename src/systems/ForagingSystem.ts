import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';
import { InventoryItem, ITEM_DEFS } from '@/types/inventory';
import { proceduralAudio } from '@/audio/ProceduralAudio';

export type ForageItemId = 'flower' | 'mushroom' | 'shell' | 'berry';

export interface ForageSpawnArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ForagingSystemConfig {
  locationId: string;
  player: Phaser.Physics.Arcade.Sprite;
  areas: ForageSpawnArea[];
  itemIds: ForageItemId[];
  dailyCount: number;
  promptY?: number;
  avoid?: Array<{ x: number; y: number; radius: number }>;
}

interface ForageSpawn {
  id: string;
  itemId: ForageItemId;
  x: number;
  y: number;
}

interface ForageObject {
  spawn: ForageSpawn;
  root: Phaser.GameObjects.Container;
}

const INTERACTION_RADIUS = 28;

export function createDailyForageSpawns(config: {
  locationId: string;
  day: number;
  areas: ForageSpawnArea[];
  itemIds: ForageItemId[];
  dailyCount: number;
  avoid?: Array<{ x: number; y: number; radius: number }>;
}): ForageSpawn[] {
  if (config.areas.length === 0 || config.itemIds.length === 0 || config.dailyCount <= 0) return [];

  const rand = makeRandom(hashString(`${config.locationId}:${config.day}:forage`));
  const spawns: ForageSpawn[] = [];
  const maxAttempts = config.dailyCount * 32;
  let attempts = 0;

  while (spawns.length < config.dailyCount && attempts < maxAttempts) {
    attempts++;
    const area = config.areas[Math.floor(rand() * config.areas.length)];
    const x = area.x + 12 + rand() * Math.max(1, area.width - 24);
    const y = area.y + 12 + rand() * Math.max(1, area.height - 24);

    if (config.avoid?.some((spot) => Phaser.Math.Distance.Between(x, y, spot.x, spot.y) < spot.radius)) {
      continue;
    }

    if (spawns.some((spawn) => Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 42)) {
      continue;
    }

    const itemId = config.itemIds[Math.floor(rand() * config.itemIds.length)];
    spawns.push({
      id: `${config.locationId}-${config.day}-${spawns.length}`,
      itemId,
      x: Math.round(x),
      y: Math.round(y),
    });
  }

  return spawns;
}

export class ForagingSystem {
  private readonly scene: Phaser.Scene;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly locationId: string;
  private readonly objects: ForageObject[] = [];
  private readonly promptText: Phaser.GameObjects.Text;
  private nearest: ForageObject | null = null;

  constructor(scene: Phaser.Scene, config: ForagingSystemConfig) {
    this.scene = scene;
    this.player = config.player;
    this.locationId = config.locationId;

    const spawns = createDailyForageSpawns({
      locationId: config.locationId,
      day: gameManager.time.day,
      areas: config.areas,
      itemIds: config.itemIds,
      dailyCount: config.dailyCount,
      avoid: config.avoid,
    });

    for (const spawn of spawns) {
      if (this.isCollected(spawn.id)) continue;
      this.objects.push({ spawn, root: this.createForageObject(spawn) });
    }

    this.promptText = scene.add.text(GAME_CONFIG.WIDTH / 2, config.promptY ?? GAME_CONFIG.HEIGHT - 72, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 18).setVisible(false);
  }

  update(canShowPrompt: boolean = true): void {
    let nearest: ForageObject | null = null;
    let nearestDistance = Infinity;

    for (const object of this.objects) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        object.spawn.x,
        object.spawn.y,
      );
      const bob = Math.sin((this.scene.time.now + object.spawn.x * 17) * 0.004) * 1.2;
      object.root.setY(object.spawn.y + bob);

      if (distance < INTERACTION_RADIUS && distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }

    this.nearest = nearest;
    if (!nearest || !canShowPrompt) {
      this.promptText.setVisible(false);
      return;
    }

    const item = ITEM_DEFS[nearest.spawn.itemId];
    this.promptText.setText(`[E] Ambil ${item.name}`);
    this.promptText.setVisible(true);
  }

  tryCollect(): boolean {
    if (!this.nearest) return false;

    const item = ITEM_DEFS[this.nearest.spawn.itemId];
    if (!item) return false;

    if (gameManager.inventory.isFull() && !gameManager.inventory.hasItem(item.id)) {
      this.popText(this.nearest.spawn.x, this.nearest.spawn.y - 18, 'Inventori penuh', 0xff7a6a);
      return true;
    }

    const slot = gameManager.inventory.addItem({ ...item, quantity: 1 });
    if (slot === -1) {
      this.popText(this.nearest.spawn.x, this.nearest.spawn.y - 18, 'Inventori penuh', 0xff7a6a);
      return true;
    }

    proceduralAudio.playClick();
    this.markCollected(this.nearest.spawn.id);
    this.popText(this.nearest.spawn.x, this.nearest.spawn.y - 18, `+ ${item.name}`, 0xb8f28a);
    this.nearest.root.destroy();
    this.objects.splice(this.objects.indexOf(this.nearest), 1);
    this.nearest = null;
    this.promptText.setVisible(false);
    return true;
  }

  destroy(): void {
    for (const object of this.objects) object.root.destroy();
    this.objects.length = 0;
    this.promptText.destroy();
  }

  private createForageObject(spawn: ForageSpawn): Phaser.GameObjects.Container {
    const container = this.scene.add.container(spawn.x, spawn.y).setDepth(spawn.y + 2);
    const shadow = this.scene.add.ellipse(0, 6, 16, 6, 0x000000, 0.18);
    const graphic = this.scene.add.graphics();
    container.add([shadow, graphic]);

    switch (spawn.itemId) {
      case 'flower':
        this.drawFlower(graphic);
        break;
      case 'mushroom':
        this.drawMushroom(graphic);
        break;
      case 'shell':
        this.drawShell(graphic);
        break;
      case 'berry':
        this.drawBerry(graphic);
        break;
    }

    return container;
  }

  private drawFlower(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(1, 0x2f8a36, 1);
    g.lineBetween(0, 6, 0, -6);
    g.fillStyle(0xff75b8, 1);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      g.fillCircle(Math.cos(angle) * 4, -8 + Math.sin(angle) * 4, 3);
    }
    g.fillStyle(0xffe36a, 1);
    g.fillCircle(0, -8, 2.5);
  }

  private drawMushroom(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xe4d2aa, 1);
    g.fillRoundedRect(-3, -3, 6, 10, 2);
    g.fillStyle(0xc84c58, 1);
    g.fillEllipse(0, -5, 18, 11);
    g.fillStyle(0xffe8d2, 1);
    g.fillCircle(-4, -7, 1.6);
    g.fillCircle(2, -4, 1.4);
  }

  private drawShell(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xf2d6a6, 1);
    g.fillEllipse(0, -2, 17, 12);
    g.lineStyle(1, 0xb7835a, 0.8);
    for (const x of [-5, -2, 1, 4]) {
      g.lineBetween(0, 3, x, -7);
    }
  }

  private drawBerry(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(1, 0x3f7a24, 1);
    g.lineBetween(0, 4, 0, -8);
    g.fillStyle(0x3f8f2f, 1);
    g.fillTriangle(-5, -7, 0, -12, 5, -7);
    g.fillStyle(0xb7355c, 1);
    g.fillCircle(-4, -3, 4);
    g.fillCircle(2, -5, 4);
    g.fillCircle(4, 0, 3.5);
  }

  private popText(x: number, y: number, text: string, color: number): void {
    const label = this.scene.add.text(x, y, text, {
      fontSize: '8px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(DEPTH.UI + 10);

    this.scene.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 850,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private isCollected(spawnId: string): boolean {
    return gameManager.gameFlags[this.getFlagKey(spawnId)] === true;
  }

  private markCollected(spawnId: string): void {
    gameManager.gameFlags[this.getFlagKey(spawnId)] = true;
  }

  private getFlagKey(spawnId: string): string {
    return `forage:${this.locationId}:${gameManager.time.day}:${spawnId}`;
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
