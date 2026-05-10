/**
 * HomesteadScene - Halaman rumah main character.
 *
 * Dicapai dari sisi kiri map utama. Area ini menjadi tempat awal untuk
 * menanam dan berternak sebelum masuk ke interior rumah.
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { Player } from '@/entities/Player';
import { MobileControls } from '@/ui/MobileControls';
import { ActivitySystem } from '@/systems/ActivitySystem';
import { ActivityZoneUI } from '@/ui/ActivityZoneUI';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { SceneHUD } from '@/ui/SceneHUD';
import { SceneAtmosphere } from '@/systems/SceneAtmosphere';
import { EventBus } from '@/core/EventBus';
import { gameManager } from '@/managers/GameManager';
import { AudioSystem } from '@/systems/AudioSystem';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { ITEM_DEFS } from '@/types/inventory';

const W = GAME_CONFIG.WIDTH;
const H = GAME_CONFIG.HEIGHT;
const HOUSE_X = 365;
const HOUSE_Y = 92;
const HOUSE_SCALE = 0.43;
const DOOR_X = 385;
const DOOR_Y = 162;
const FIELD_RECT = { x: 286, y: 224, w: 166, h: 80 };
const FARM_SAVE_KEY = 'homesteadFarm';
const FARM_DAY_KEY = 'homesteadFarmDay';
const FARM_TILE_SCALE = 0.70;
const FARM_TILE_W = 21;
const FARM_TILE_H = 19;
const CARROT_FRAMES = ['wortel_1', 'wortel_2', 'wortel_3', 'wortel_4', 'wortel_5'] as const;
const ONION_FRAMES = [
  'bawang_merah_1', 'bawang_merah_2', 'bawang_merah_3', 'bawang_merah_4',
  'bawang_merah_5', 'bawang_merah_6', 'bawang_merah_7',
] as const;

type CropKind = 'carrot' | 'onion';

interface FarmPlotState {
  crop: CropKind | null;
  stage: number;
  plantedDay: number;
  lastWateredDay: number;
  rotten: boolean;
}

interface FarmPlot {
  id: string;
  x: number;
  y: number;
  cropKind: CropKind;
  base: Phaser.GameObjects.Image;
  plant: Phaser.GameObjects.Image | null;
  state: FarmPlotState;
}

export class HomesteadScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;
  private pauseMenu!: PauseMenuUI;
  private hud!: SceneHUD;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private doorPrompt!: Phaser.GameObjects.Text;
  private farmPlots: FarmPlot[] = [];
  private nearbyPlot: FarmPlot | null = null;
  private lastFarmDay = 1;
  private exiting = false;
  private nearDoor = false;
  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  constructor() {
    super({ key: 'HomesteadScene' });
  }

  create(): void {
    this.exiting = false;
    this.nearDoor = false;
    this.nearbyPlot = null;
    this.farmPlots = [];
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, W, H);

    this.buildBackground();
    this.buildHouse();
    this.buildCropField();
    this.buildFarmPlots();
    this.buildDecor();
    this.player = new Player(this, W - 44, H / 2);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.centerOn(W / 2, H / 2);

    this.createColliders();

    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);
    this.activityZoneUI.createZones(this.player.sprite, []);

    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => this.handleAction());

    EventBus.on('event:player-locked', this.onPlayerLocked, this);

    this.doorPrompt = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 72, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    });
    this.doorPrompt.setOrigin(0.5);
    this.doorPrompt.setScrollFactor(0);
    this.doorPrompt.setDepth(DEPTH.UI + 16);
    this.doorPrompt.setVisible(false);

    this.mobileControls = new MobileControls(this);

    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'homestead', W, H);
    this.atmosphere = new SceneAtmosphere(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake', this.onWake, this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.hud.update(this.player.sprite.x, this.player.sprite.y, this.atmosphere.weatherState);
    if (this.pauseMenu.opened) return;

    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleAction();
    }

    this.player.update();
    this.updateFarmGrowth();
    this.checkDoorProximity();
    this.checkFarmProximity();
    this.activitySystem.update(delta);
    this.activityZoneUI.update(delta);

    if (!this.exiting && this.player.sprite.x > W - 20) {
      this.doExit();
    }
  }

  private buildBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 2);
    g.fillGradientStyle(0x5c9b2e, 0x5c9b2e, 0x2f6f1f, 0x2f6f1f, 1);
    g.fillRect(0, 0, W, H);

    const patchColors: Array<[number, number]> = [
      [0x73b544, 0.20], [0x2b651d, 0.20], [0x83bd4c, 0.14], [0x204f19, 0.15],
    ];
    for (let i = 0; i < 42; i++) {
      const x = ((i * 127.51) % 1) * W;
      const y = ((i * 79.37) % 1) * H;
      const [color, alpha] = patchColors[i % patchColors.length];
      g.fillStyle(color, alpha);
      g.fillEllipse(x, y, 58 + (i % 5) * 18, 18 + (i % 4) * 8);
    }

    // Semua jalan di halaman rumah memakai tile land-floor-4.
    this.drawTiledPath([
      { x: W - 18, y: 150 },
      { x: 404, y: 158 },
      { x: 342, y: 168 },
      { x: 296, y: 190 },
      { x: 262, y: 226 },
      { x: 220, y: H + 14 },
    ], 0.23, 8, 54);
    this.drawTiledPath([
      { x: 262, y: 226 },
      { x: 198, y: 236 },
      { x: 150, y: 258 },
      { x: 110, y: H + 10 },
    ], 0.22, 8, 44);
    this.drawTiledPath([
      { x: 338, y: 168 },
      { x: DOOR_X, y: DOOR_Y + 14 },
    ], 0.21, 7, 38);
    this.drawTiledPath([
      { x: DOOR_X + 20, y: DOOR_Y + 16 },
      { x: HOUSE_X + 118, y: DOOR_Y + 20 },
    ], 0.21, 7, 36);

    g.fillStyle(0x6d5b45, 0.24);
    for (let i = 0; i < 22; i++) {
      const x = 190 + ((i * 37) % 250);
      const y = 148 + ((i * 53) % 126);
      g.fillEllipse(x, y, 16 + (i % 3) * 6, 5);
    }

    for (let i = 0; i < 150; i++) {
      const x = ((i * 91.17) % 1) * W;
      const y = ((i * 47.73) % 1) * H;
      if (this.isInsideRect(x, y, FIELD_RECT)) continue;
      g.fillStyle(i % 3 === 0 ? 0x7ec456 : i % 3 === 1 ? 0x4c8a2e : 0x285e20, 0.46);
      g.fillEllipse(x, y, 6 + (i % 4) * 3, 2.5);
    }
  }

  private drawTiledPath(points: Array<{ x: number; y: number }>, scale: number, spacing: number, width: number): void {
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(distance / spacing));
      const normalX = distance > 0 ? -dy / distance : 0;
      const normalY = distance > 0 ? dx / distance : 0;
      const offsetStep = Math.max(8, 120 * scale * 0.38);
      const sideOffsets: number[] = [];
      for (let offset = -width / 2; offset <= width / 2 + 0.1; offset += offsetStep) {
        sideOffsets.push(offset);
      }

      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = Phaser.Math.Linear(from.x, to.x, t);
        const y = Phaser.Math.Linear(from.y, to.y, t);
        for (let side = 0; side < sideOffsets.length; side++) {
          const offset = sideOffsets[side];
          const jitterX = Math.sin((i * 19 + step * 7 + side * 5) * 0.9) * 1.3;
          const jitterY = Math.cos((i * 13 + step * 5 + side * 3) * 0.8) * 1;
          const tile = this.add.image(
            x + normalX * offset + jitterX,
            y + normalY * offset + jitterY,
            'land-floor-4',
          );
          tile.setScale(scale);
          tile.setAngle(Math.sin(i + step + side) * 3);
          tile.setAlpha(0.92);
          tile.setDepth(DEPTH.GROUND - 1);
        }
      }
    }
  }

  private buildHouse(): void {
    const house = this.add.image(HOUSE_X, HOUSE_Y, 'house2-house-1');
    house.setScale(HOUSE_SCALE);
    house.setDepth(DOOR_Y + 35);
  }

  private buildCropField(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);
    this.drawPlanterRack(g, 312, 98, 72, 52);
  }

  private drawCropPlot(g: Phaser.GameObjects.Graphics, rect: { x: number; y: number; w: number; h: number }, crop: 'cabbage' | 'turnip'): void {
    g.fillStyle(0x6e4b26, 1);
    g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 4);
    g.lineStyle(1, 0x3c2411, 0.55);
    g.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 4);

    const cols = crop === 'cabbage' ? 8 : 9;
    const rows = crop === 'cabbage' ? 3 : 3;
    for (let row = 0; row < rows; row++) {
      const y = rect.y + 13 + row * 17;
      g.lineStyle(1, 0x3c2411, 0.28);
      g.lineBetween(rect.x + 8, y + 6, rect.x + rect.w - 8, y + 6);
      for (let col = 0; col < cols; col++) {
        const x = rect.x + 14 + col * ((rect.w - 28) / (cols - 1));
        if (crop === 'cabbage') {
          g.fillStyle(0xdfe8ce, 0.95);
          g.fillCircle(x, y + 4, 6);
          g.fillStyle(0x759d58, 0.88);
          g.fillCircle(x - 3, y + 6, 4);
          g.fillCircle(x + 3, y + 6, 4);
        } else {
          g.fillStyle(0xdb315f, 0.96);
          g.fillCircle(x, y + 7, 5);
          g.fillStyle(0x49a03c, 0.95);
          g.fillTriangle(x, y, x - 5, y + 6, x, y + 4);
          g.fillTriangle(x, y, x + 5, y + 6, x, y + 4);
        }
      }
    }
  }

  private buildFarmPlots(): void {
    const savedState = this.loadFarmState();
    const savedDay = gameManager.gameFlags[FARM_DAY_KEY];
    this.lastFarmDay = typeof savedDay === 'number' ? savedDay : gameManager.time.day;

    const plotPositions = [
      ...this.makePlotGrid(FIELD_RECT, 6, 4, 'onion'),
    ];

    for (const def of plotPositions) {
      const base = this.add.image(def.x, def.y, 'farm-tile-2');
      base.setScale(FARM_TILE_SCALE);
      base.setDepth(DEPTH.GROUND_DECOR + 1);

      const state = savedState[def.id] ?? this.createEmptyPlotState();
      const plot: FarmPlot = {
        ...def,
        base,
        plant: null,
        state,
      };
      this.farmPlots.push(plot);
      this.refreshPlotSprite(plot);
    }
  }

  private makePlotGrid(
    rect: { x: number; y: number; w: number; h: number },
    cols: number,
    rows: number,
    cropKind: CropKind,
  ): Array<{ id: string; x: number; y: number; cropKind: CropKind }> {
    const plots: Array<{ id: string; x: number; y: number; cropKind: CropKind }> = [];
    const gridW = FARM_TILE_W * cols;
    const gridH = FARM_TILE_H * rows;
    const startX = rect.x + (rect.w - gridW) / 2 + FARM_TILE_W / 2;
    const startY = rect.y + (rect.h - gridH) / 2 + FARM_TILE_H / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        plots.push({
          id: `${cropKind}_${row}_${col}`,
          x: startX + col * FARM_TILE_W,
          y: startY + row * FARM_TILE_H,
          cropKind,
        });
      }
    }
    return plots;
  }

  private createEmptyPlotState(): FarmPlotState {
    return { crop: null, stage: 0, plantedDay: 0, lastWateredDay: 0, rotten: false };
  }

  private loadFarmState(): Record<string, FarmPlotState> {
    const encoded = gameManager.gameFlags[FARM_SAVE_KEY];
    if (typeof encoded !== 'string') return {};

    try {
      return JSON.parse(encoded) as Record<string, FarmPlotState>;
    } catch {
      return {};
    }
  }

  private saveFarmState(): void {
    const state: Record<string, FarmPlotState> = {};
    for (const plot of this.farmPlots) {
      state[plot.id] = plot.state;
    }
    gameManager.gameFlags[FARM_SAVE_KEY] = JSON.stringify(state);
    gameManager.gameFlags[FARM_DAY_KEY] = this.lastFarmDay;
  }

  private updateFarmGrowth(): void {
    const currentDay = gameManager.time.day;
    if (currentDay === this.lastFarmDay) return;

    for (const plot of this.farmPlots) {
      const state = plot.state;
      if (!state.crop || state.rotten) continue;

      const wasWateredYesterday = state.lastWateredDay >= this.lastFarmDay;
      if (wasWateredYesterday) {
        state.stage = Math.min(state.stage + 1, this.getCropFrames(state.crop).length - 1);
      } else if (currentDay - state.lastWateredDay > 1) {
        state.rotten = true;
      }

      this.refreshPlotSprite(plot);
    }

    this.lastFarmDay = currentDay;
    this.saveFarmState();
  }

  private refreshPlotSprite(plot: FarmPlot): void {
    if (!plot.state.crop) {
      plot.plant?.destroy();
      plot.plant = null;
      return;
    }

    const textureKey = this.getCropTexture(plot.state);
    if (!plot.plant) {
      const offsetX = ((plot.id.length * 7) % 5) - 2;
      const offsetY = ((plot.id.length * 11) % 5) - 2;
      plot.plant = this.add.image(plot.x + offsetX, plot.y - 8 + offsetY, textureKey);
      plot.plant.setDepth(plot.y + 4);
    } else {
      plot.plant.setTexture(textureKey);
    }
    const scaleBump = (plot.id.charCodeAt(plot.id.length - 1) % 3) * 0.03;
    plot.plant.setScale((plot.state.crop === 'onion' ? 0.82 : 0.88) + scaleBump);
    plot.plant.setAlpha(plot.state.rotten ? 0.82 : 1);
  }

  private getCropTexture(state: FarmPlotState): string {
    if (state.crop === 'carrot') {
      if (state.rotten) return 'farm-wortel_5_busuk';
      return `farm-${CARROT_FRAMES[Phaser.Math.Clamp(state.stage, 0, CARROT_FRAMES.length - 1)]}`;
    }

    if (state.crop === 'onion') {
      if (state.rotten) return state.stage >= 6 ? 'farm-bawang_merah_7_busuk' : 'farm-bawang_merah_6_busuk';
      return `farm-${ONION_FRAMES[Phaser.Math.Clamp(state.stage, 0, ONION_FRAMES.length - 1)]}`;
    }

    return 'farm-tile-2';
  }

  private getCropFrames(crop: CropKind): readonly string[] {
    return crop === 'carrot' ? CARROT_FRAMES : ONION_FRAMES;
  }

  private drawPlanterRack(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    const railScale = w / 54;
    const postScale = (h + 14) / 47;
    for (const railY of [y + 4, y + h / 2 + 4, y + h + 4]) {
      const rail = this.add.image(x + w / 2, railY, 'utility-pagar-horizontal');
      rail.setScale(railScale, 0.82);
      rail.setDepth(DEPTH.GROUND_DECOR + 2);
    }

    for (const postX of [x - 2, x + w + 2]) {
      const post = this.add.image(postX, y + h / 2 + 4, 'utility-pagar-vertical-panjang');
      post.setScale(1, postScale);
      post.setDepth(DEPTH.GROUND_DECOR + 3);
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const px = x + 14 + col * 22;
        const py = y + 3 + row * (h / 2);
        g.fillStyle(0x2f7d28, 1);
        g.fillEllipse(px, py, 9, 5);
        g.fillStyle(0x7ed25d, 0.9);
        g.fillEllipse(px + 3, py - 2, 6, 3);
      }
    }
  }

  private buildDecor(): void {
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES);
    this.placeTree(24, 76, 'tile-tree-1', 0.48);
    this.placeTree(105, 56, 'tile-tree-2', 0.54);
    this.placeTree(460, 70, 'tile-tree-2', 0.58);
    this.placeTree(36, 278, 'tile-tree-3', 0.64);
    this.placeTree(158, 292, 'tile-tree-4', 0.62);
    this.placeTree(470, 292, 'tile-tree-4', 0.62);
    this.placeTree(238, 326, 'tile-tree-1', 0.50);

    this.drawStump(g, 236, 82);
    this.drawCrates(g);
    this.drawFlowerSprinkles(g);

    g.fillStyle(0x9d8b73, 0.7);
    for (let i = 0; i < 38; i++) {
      const x = 28 + ((i * 37) % 420);
      const y = 22 + ((i * 61) % 256);
      g.fillEllipse(x, y, 5 + (i % 3) * 2, 3);
    }
  }

  private placeTree(x: number, y: number, textureKey: string, scale: number): void {
    const tree = this.add.image(x, y, textureKey);
    tree.setOrigin(0.5, 1);
    tree.setScale(scale);
    tree.setDepth(y);
  }

  private drawStump(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x6b3f1f, 1);
    g.fillRect(x - 10, y, 20, 18);
    g.fillStyle(0xb98b55, 1);
    g.fillEllipse(x, y, 24, 12);
    g.lineStyle(1, 0x4a2d17, 0.65);
    g.strokeEllipse(x, y, 14, 7);
  }

  private drawCrates(g: Phaser.GameObjects.Graphics): void {
    const crates = [
      { x: 278, y: 128 }, { x: 292, y: 136 }, { x: 278, y: 150 }, { x: 116, y: 124 },
    ];
    for (const crate of crates) {
      g.fillStyle(0xd8791f, 1);
      g.fillRoundedRect(crate.x, crate.y, 14, 18, 2);
      g.lineStyle(1, 0xffc175, 0.8);
      g.lineBetween(crate.x + 5, crate.y + 5, crate.x + 5, crate.y + 10);
      g.lineBetween(crate.x + 9, crate.y + 8, crate.x + 9, crate.y + 13);
    }
  }

  private drawFlowerSprinkles(g: Phaser.GameObjects.Graphics): void {
    const flowers = [
      [254, 154], [270, 166], [290, 162], [230, 178], [248, 202],
      [18, 158], [82, 252], [124, 166], [405, 190], [438, 176],
    ];
    for (const [x, y] of flowers) {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, 2);
      g.fillCircle(x + 4, y + 1, 2);
      g.fillCircle(x + 2, y - 3, 2);
      g.fillStyle(0xf2d65a, 1);
      g.fillCircle(x + 2, y, 1.2);
    }
  }

  private createColliders(): void {
    this.addColliderBox(248, 28, 214, 130);
    this.addColliderBox(320, 158, 124, 24);
    this.addColliderBox(8, 52, 36, 48);
    this.addColliderBox(88, 36, 34, 42);
    this.addColliderBox(444, 46, 34, 44);
    this.addColliderBox(18, 258, 32, 42);
    this.addColliderBox(142, 274, 32, 42);
    this.addColliderBox(454, 274, 32, 42);
    this.addColliderBox(222, 306, 36, 44);
  }

  private addColliderBox(x: number, y: number, width: number, height: number): void {
    const body = this.physics.add.staticBody(x, y, width, height);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  private buildExitSign(): void {
    const sign = this.add.text(W - 50, H / 2 - 26, 'Kota ->', {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000066',
      padding: { x: 5, y: 2 },
    });
    sign.setOrigin(0.5);
    sign.setDepth(DEPTH.UI - 2);
  }

  private isInsideRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  private handleAction(): void {
    if (this.nearDoor) {
      this.enterHouse();
      return;
    }

    if (this.nearbyPlot) {
      this.interactWithPlot(this.nearbyPlot);
      return;
    }

    if (this.activityZoneUI.isActivityActive) {
      this.activityZoneUI.cancelActivity();
    } else if (this.activityZoneUI.isInZone) {
      this.activityZoneUI.startActivity();
    }
  }

  private checkDoorProximity(): void {
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, DOOR_X, DOOR_Y);
    this.nearDoor = dist < 38;

    if (this.nearDoor && !this.activityZoneUI.isActivityActive) {
      this.doorPrompt.setText('[E] Masuk rumah');
      this.doorPrompt.setVisible(true);
    } else {
      this.doorPrompt.setVisible(false);
    }
  }

  private checkFarmProximity(): void {
    if (this.nearDoor || this.activityZoneUI.isActivityActive) return;

    let closest: FarmPlot | null = null;
    let closestDistance = Infinity;
    for (const plot of this.farmPlots) {
      const distance = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, plot.x, plot.y);
      if (distance < 34 && distance < closestDistance) {
        closest = plot;
        closestDistance = distance;
      }
    }

    this.nearbyPlot = closest;
    if (!closest) return;

    this.doorPrompt.setText(this.getPlotPrompt(closest));
    this.doorPrompt.setVisible(true);
  }

  private getPlotPrompt(plot: FarmPlot): string {
    const cropName = plot.cropKind === 'carrot' ? 'wortel' : 'bawang';
    const state = plot.state;
    if (!state.crop) return `[E] Tanam ${cropName}`;
    if (state.rotten) return '[E] Bersihkan tanaman busuk';
    if (state.stage >= this.getCropFrames(state.crop).length - 1) return `[E] Panen ${cropName}`;
    if (state.lastWateredDay === gameManager.time.day) return `${cropName} sudah disiram`;
    return `[E] Siram ${cropName}`;
  }

  private interactWithPlot(plot: FarmPlot): void {
    const state = plot.state;
    const today = gameManager.time.day;

    if (!state.crop) {
      plot.state = {
        crop: plot.cropKind,
        stage: 0,
        plantedDay: today,
        lastWateredDay: today,
        rotten: false,
      };
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, plot.cropKind === 'carrot' ? 'Bibit wortel' : 'Bibit bawang');
      this.saveFarmState();
      return;
    }

    if (state.rotten) {
      plot.state = this.createEmptyPlotState();
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, 'Dibersihkan');
      this.saveFarmState();
      return;
    }

    if (state.stage >= this.getCropFrames(state.crop).length - 1) {
      const item = state.crop === 'carrot' ? ITEM_DEFS.carrot : ITEM_DEFS.red_onion;
      const slot = gameManager.inventory.addItem({ ...item });
      if (slot === -1) {
        this.popFarmText(plot.x, plot.y - 26, 'Tas penuh');
        return;
      }
      plot.state = this.createEmptyPlotState();
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, 'Panen!');
      this.saveFarmState();
      return;
    }

    if (state.lastWateredDay !== today) {
      state.lastWateredDay = today;
      proceduralAudio.playClick();
      this.playWaterEffect(plot.x, plot.y);
      this.saveFarmState();
      return;
    }

    this.popFarmText(plot.x, plot.y - 26, 'Sudah disiram');
  }

  private playWaterEffect(x: number, y: number): void {
    const drops: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 5; i++) {
      const drop = this.add.circle(x - 12 + i * 6, y - 18 - (i % 2) * 3, 2, 0x75c9ff, 0.9);
      drop.setDepth(DEPTH.UI - 4);
      drops.push(drop);
      this.tweens.add({
        targets: drop,
        y: drop.y + 15,
        alpha: 0,
        duration: 420,
        ease: 'Sine.easeIn',
        onComplete: () => drop.destroy(),
      });
    }
    this.popFarmText(x, y - 28, 'Disiram');
  }

  private popFarmText(x: number, y: number, text: string): void {
    const label = this.add.text(x, y, text, {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000088',
      padding: { x: 5, y: 2 },
    });
    label.setOrigin(0.5);
    label.setDepth(DEPTH.UI + 10);
    this.tweens.add({
      targets: label,
      y: y - 12,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private enterHouse(): void {
    if (this.exiting) return;
    this.exiting = true;
    proceduralAudio.playClick();
    this.player.freeze();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep();
      this.scene.run('PlayerHouseScene', { returnScene: 'HomesteadScene' });
    });
  }

  private doExit(): void {
    this.exiting = true;
    this.player.freeze();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      if (this.scene.isSleeping('WorldScene')) {
        this.scene.wake('WorldScene');
      } else {
        this.scene.start('WorldScene');
      }
    });
  }

  private onWake(): void {
    this.exiting = false;
    this.player.unfreeze();
    this.player.sprite.setPosition(DOOR_X, DOOR_Y + 32);
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    EventBus.off('event:player-locked', this.onPlayerLocked);
    this.mobileControls.destroy();
    this.activityZoneUI.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.atmosphere.destroy();
    this.doorPrompt.destroy();
    this.ownedAudioSystem?.destroy();
    this.saveFarmState();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
