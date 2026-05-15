/**
 * HomesteadScene - Halaman rumah main character.
 *
 * Dicapai dari sisi kiri map utama. Area ini menjadi tempat awal untuk
 * menanam dan berternak sebelum masuk ke interior rumah.
 */

import Phaser from 'phaser';
import { CAMERA_CONFIG, DEPTH, GAME_CONFIG } from '@config/game.config';
import { AUDIO_KEYS } from '@config/assets.manifest';
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
import { FirstDayObjectiveUI } from '@/ui/FirstDayObjectiveUI';
import { formatRupiah } from '@config/economy.config';

const VIEW_W = GAME_CONFIG.WIDTH;
const VIEW_H = GAME_CONFIG.HEIGHT;
const HOMESTEAD_W = 900;
const HOMESTEAD_H = 560;
const CONTENT_OFFSET_X = 180;
const CONTENT_OFFSET_Y = 110;
const ox = (x: number) => x + CONTENT_OFFSET_X;
const oy = (y: number) => y + CONTENT_OFFSET_Y;
const HOUSE_X = ox(365);
const HOUSE_Y = oy(92);
const HOUSE_SCALE = 0.43;
const DOOR_X = ox(385);
const DOOR_Y = oy(162);
const DOOR_INTERACT_RADIUS = 26;
const SHIPPING_BIN_X = ox(468);
const SHIPPING_BIN_Y = oy(184);
const SHIPPING_BIN_RADIUS = 34;
const FIELD_RECT = { x: ox(-18), y: oy(152), w: 166, h: 80 };
const ENTRY_SPAWN_X = HOMESTEAD_W - 48;
const ENTRY_SPAWN_Y = oy(156);
const FARM_SAVE_KEY = 'homesteadFarm';
const FARM_DAY_KEY = 'homesteadFarmDay';
const FARM_TILE_SCALE = 0.70;
const FARM_TILE_W = 21;
const FARM_TILE_H = 19;
const FARM_INTERACT_W = 20;
const FARM_INTERACT_H = 18;
const STAMINA_HOE_COST = 2;
const STAMINA_PLANT_COST = 2;
const STAMINA_WATER_COST = 1;
const STAMINA_HARVEST_COST = 2;
const STAMINA_CLEAR_COST = 2;
const STARTER_TOOL_IDS = ['hoe', 'watering_can', 'axe', 'pickaxe', 'fishing_rod', 'seed_bag'] as const;
const CARROT_FRAMES = ['wortel_1', 'wortel_2', 'wortel_3', 'wortel_4', 'wortel_5'] as const;
const ONION_FRAMES = [
  'bawang_merah_1', 'bawang_merah_2', 'bawang_merah_3', 'bawang_merah_4',
  'bawang_merah_5', 'bawang_merah_6', 'bawang_merah_7',
] as const;

type CropKind = 'carrot' | 'onion';
type CropQuality = 'normal' | 'silver' | 'gold';
type ToolId = typeof STARTER_TOOL_IDS[number];

interface CropConfig {
  seedId: string;
  cropItemId: 'carrot' | 'red_onion';
  label: string;
  seedLabel: string;
  seasons: Array<'spring' | 'summer' | 'autumn' | 'winter'>;
}

const CROP_CONFIGS: Record<CropKind, CropConfig> = {
  carrot: {
    seedId: 'carrot_seed',
    cropItemId: 'carrot',
    label: 'wortel',
    seedLabel: 'Bibit wortel',
    seasons: ['spring'],
  },
  onion: {
    seedId: 'red_onion_seed',
    cropItemId: 'red_onion',
    label: 'bawang',
    seedLabel: 'Bibit bawang',
    seasons: ['spring'],
  },
};

interface FarmPlotState {
  tilled: boolean;
  crop: CropKind | null;
  stage: number;
  plantedDay: number;
  lastWateredDay: number;
  missedWaterDays: number;
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
  private objectiveUI!: FirstDayObjectiveUI;
  private farmPlots: FarmPlot[] = [];
  private nearbyPlot: FarmPlot | null = null;
  private lastFarmDay = 1;
  private exiting = false;
  private nearDoor = false;
  private nearShippingBin = false;
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
    this.nearShippingBin = false;
    this.nearbyPlot = null;
    this.farmPlots = [];
    this.sound.stopByKey(AUDIO_KEYS.BGM_SCENE_1_6);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, HOMESTEAD_W, HOMESTEAD_H);

    this.buildBackground();
    this.buildHouse();
    this.buildCropField();
    this.ensureStarterTools();
    this.buildFarmPlots();
    this.buildDecor();
    this.player = new Player(this, ENTRY_SPAWN_X, ENTRY_SPAWN_Y);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, HOMESTEAD_W, HOMESTEAD_H);
    this.cameras.main.startFollow(this.player.sprite, true, CAMERA_CONFIG.LERP, CAMERA_CONFIG.LERP);
    this.cameras.main.setDeadzone(CAMERA_CONFIG.DEADZONE_WIDTH, CAMERA_CONFIG.DEADZONE_HEIGHT);
    this.cameras.main.setRoundPixels(true);

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

    this.hud = new SceneHUD(this, 'homestead', HOMESTEAD_W, HOMESTEAD_H);
    this.atmosphere = new SceneAtmosphere(this);
    this.objectiveUI = new FirstDayObjectiveUI(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake', this.onWake, this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.hud.update(this.player.sprite.x, this.player.sprite.y, this.atmosphere.weatherState);
    this.objectiveUI.update();
    if (this.pauseMenu.opened) return;

    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleAction();
    }

    this.player.update();
    this.updateFarmGrowth();
    this.checkDoorProximity();
    this.checkShippingBinProximity();
    this.checkFarmProximity();
    this.activitySystem.update(delta);
    this.activityZoneUI.update(delta);

    if (!this.exiting && this.player.sprite.x > HOMESTEAD_W - 20) {
      this.doExit();
    }
  }

  private buildBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 2);
    g.fillGradientStyle(0x5c9b2e, 0x5c9b2e, 0x2f6f1f, 0x2f6f1f, 1);
    g.fillRect(0, 0, HOMESTEAD_W, HOMESTEAD_H);

    const patchColors: Array<[number, number]> = [
      [0x73b544, 0.20], [0x2b651d, 0.20], [0x83bd4c, 0.14], [0x204f19, 0.15],
    ];
    for (let i = 0; i < 42; i++) {
      const x = ((i * 127.51) % 1) * HOMESTEAD_W;
      const y = ((i * 79.37) % 1) * HOMESTEAD_H;
      const [color, alpha] = patchColors[i % patchColors.length];
      g.fillStyle(color, alpha);
      g.fillEllipse(x, y, 58 + (i % 5) * 18, 18 + (i % 4) * 8);
    }

    for (let i = 0; i < 420; i++) {
      const x = ((i * 91.17) % 1) * HOMESTEAD_W;
      const y = ((i * 47.73) % 1) * HOMESTEAD_H;
      if (this.isInsideRect(x, y, FIELD_RECT)) continue;
      g.fillStyle(i % 3 === 0 ? 0x7ec456 : i % 3 === 1 ? 0x4c8a2e : 0x285e20, 0.46);
      g.fillEllipse(x, y, 6 + (i % 4) * 3, 2.5);
    }

    for (let i = 0; i < 120; i++) {
      const x = ((i * 57.61) % 1) * HOMESTEAD_W;
      const y = ((i * 83.19) % 1) * HOMESTEAD_H;
      if (this.isInsideRect(x, y, FIELD_RECT)) continue;
      g.fillStyle(i % 2 === 0 ? 0x315f24 : 0x46752e, 0.18);
      g.fillEllipse(x, y, 22 + (i % 5) * 8, 8 + (i % 4) * 3);
    }

    this.drawPond(g, ox(-10), oy(286), 138, 74);

    for (let i = 0; i < 22; i++) {
      const x = ox(-40 + (i % 8) * 18 + (i % 3) * 4);
      const y = oy(246 + Math.floor(i / 8) * 18 + (i % 2) * 3);
      if (this.isInsideRect(x, y, FIELD_RECT)) continue;
      g.fillStyle(i % 2 === 0 ? 0x6fb24a : 0x3e7d29, 0.72);
      g.fillEllipse(x, y, 11 + (i % 3) * 3, 4 + (i % 2));
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
    g.fillStyle(0x4f7b2c, 0.22);
    g.fillRoundedRect(FIELD_RECT.x - 10, FIELD_RECT.y - 12, FIELD_RECT.w + 20, FIELD_RECT.h + 18, 8);
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
        state: this.normalizePlotState(state),
      };
      this.farmPlots.push(plot);
      this.refreshPlotSprite(plot);
    }
  }

  private ensureStarterTools(): void {
    for (const toolId of STARTER_TOOL_IDS) {
      if (!gameManager.inventory.hasItem(toolId)) {
        gameManager.inventory.addItem({ ...ITEM_DEFS[toolId] });
      }
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

  private createEmptyPlotState(tilled = false): FarmPlotState {
    return { tilled, crop: null, stage: 0, plantedDay: 0, lastWateredDay: 0, missedWaterDays: 0, rotten: false };
  }

  private normalizePlotState(state: Partial<FarmPlotState>): FarmPlotState {
    return {
      tilled: state.tilled ?? state.crop !== null,
      crop: state.crop ?? null,
      stage: state.stage ?? 0,
      plantedDay: state.plantedDay ?? 0,
      lastWateredDay: state.lastWateredDay ?? 0,
      missedWaterDays: state.missedWaterDays ?? 0,
      rotten: state.rotten ?? false,
    };
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
        state.missedWaterDays = 0;
      } else {
        state.missedWaterDays += currentDay - this.lastFarmDay;
      }

      if (state.missedWaterDays >= 1) {
        state.rotten = true;
      }

      this.refreshPlotSprite(plot);
    }

    this.lastFarmDay = currentDay;
    this.saveFarmState();
  }

  private refreshPlotSprite(plot: FarmPlot): void {
    if (plot.state.tilled) {
      plot.base.clearTint();
      plot.base.setAlpha(plot.state.lastWateredDay === gameManager.time.day ? 1 : 0.82);
    } else {
      plot.base.setTint(0x5f7f3a);
      plot.base.setAlpha(0.42);
    }

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
    const treeLayout: Array<{ x: number; y: number; key: string; scale: number }> = [
      { x: ox(-92), y: oy(34), key: 'tile-tree-4', scale: 0.62 },
      { x: ox(-58), y: oy(64), key: 'tile-tree-3', scale: 0.60 },
      { x: ox(-24), y: oy(118), key: 'tile-tree-4', scale: 0.54 },
      { x: ox(24), y: oy(76), key: 'tile-tree-1', scale: 0.48 },
      { x: ox(105), y: oy(56), key: 'tile-tree-2', scale: 0.54 },
      { x: ox(166), y: oy(46), key: 'tile-tree-1', scale: 0.46 },
      { x: ox(224), y: oy(28), key: 'tile-tree-2', scale: 0.42 },
      { x: ox(250), y: oy(22), key: 'tile-tree-1', scale: 0.38 },
      { x: ox(312), y: oy(-28), key: 'tile-tree-5', scale: 0.28 },
      { x: ox(392), y: oy(18), key: 'tile-tree-2', scale: 0.42 },
      { x: ox(460), y: oy(70), key: 'tile-tree-2', scale: 0.58 },
      { x: ox(520), y: oy(120), key: 'tile-tree-1', scale: 0.46 },
      { x: ox(590), y: oy(70), key: 'tile-tree-2', scale: 0.50 },
      { x: ox(642), y: oy(110), key: 'tile-tree-1', scale: 0.46 },
      { x: ox(694), y: oy(32), key: 'tile-tree-5', scale: 0.30 },
      { x: ox(702), y: oy(168), key: 'tile-tree-3', scale: 0.54 },
      { x: ox(760), y: oy(94), key: 'tile-tree-3', scale: 0.52 },
      { x: ox(794), y: oy(162), key: 'tile-tree-4', scale: 0.56 },
      { x: ox(824), y: oy(246), key: 'tile-tree-2', scale: 0.50 },
      { x: ox(676), y: oy(262), key: 'tile-tree-4', scale: 0.58 },
      { x: ox(640), y: oy(318), key: 'tile-tree-6', scale: 0.46 },
      { x: ox(620), y: oy(354), key: 'tile-tree-2', scale: 0.48 },
      { x: ox(548), y: oy(338), key: 'tile-tree-3', scale: 0.58 },
      { x: ox(470), y: oy(292), key: 'tile-tree-4', scale: 0.62 },
      { x: ox(304), y: oy(238), key: 'tile-wood-tree-5', scale: 0.56 },
      { x: ox(330), y: oy(388), key: 'tile-tree-1', scale: 0.44 },
      { x: ox(382), y: oy(424), key: 'tile-wood-tree-5', scale: 0.50 },
      { x: ox(238), y: oy(326), key: 'tile-tree-1', scale: 0.50 },
      { x: ox(158), y: oy(292), key: 'tile-tree-4', scale: 0.62 },
      { x: ox(104), y: oy(408), key: 'tile-tree-3', scale: 0.52 },
      { x: ox(82), y: oy(344), key: 'tile-tree-2', scale: 0.48 },
      { x: ox(40), y: oy(438), key: 'tile-tree-2', scale: 0.44 },
      { x: ox(-116), y: oy(214), key: 'tile-tree-6', scale: 0.48 },
      { x: ox(-70), y: oy(404), key: 'tile-tree-4', scale: 0.56 },
      { x: ox(-34), y: oy(330), key: 'tile-tree-4', scale: 0.66 },
      { x: ox(-20), y: oy(428), key: 'tile-wood-tree-6', scale: 0.82 },
      { x: ox(36), y: oy(278), key: 'tile-tree-3', scale: 0.64 },
      { x: ox(196), y: oy(458), key: 'tile-tree-1', scale: 0.46 },
      { x: ox(346), y: oy(470), key: 'tile-tree-2', scale: 0.48 },
      { x: ox(452), y: oy(444), key: 'tile-wood-tree-6', scale: 0.76 },
      { x: ox(520), y: oy(464), key: 'tile-tree-3', scale: 0.54 },
      { x: ox(706), y: oy(444), key: 'tile-tree-4', scale: 0.58 },
    ];
    for (const tree of treeLayout) {
      this.placeTree(tree.x, tree.y, tree.key, tree.scale);
    }

    this.drawFlowerSprinkles(g);
    this.drawShippingBin(g);

    g.fillStyle(0x9d8b73, 0.7);
    for (let i = 0; i < 38; i++) {
      const x = ox(28 + ((i * 37) % 420));
      const y = oy(22 + ((i * 61) % 256));
      g.fillEllipse(x, y, 5 + (i % 3) * 2, 3);
    }
  }

  private drawPond(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x9c8b5f, 0.34);
    g.fillEllipse(x + w * 0.46, y + h * 0.58, w * 1.12, h * 0.92);
    g.fillEllipse(x + w * 0.76, y + h * 0.44, w * 0.34, h * 0.26);

    g.fillStyle(0x245f74, 0.96);
    g.fillEllipse(x + w * 0.42, y + h * 0.56, w * 0.84, h * 0.76);
    g.fillEllipse(x + w * 0.72, y + h * 0.43, w * 0.28, h * 0.24);
    g.fillEllipse(x + w * 0.20, y + h * 0.48, w * 0.26, h * 0.22);

    g.fillStyle(0x357f98, 0.72);
    g.fillEllipse(x + w * 0.45, y + h * 0.50, w * 0.58, h * 0.40);
    g.fillEllipse(x + w * 0.67, y + h * 0.42, w * 0.18, h * 0.14);
    g.fillStyle(0x6cc5da, 0.46);
    g.fillEllipse(x + w * 0.35, y + h * 0.43, w * 0.24, h * 0.12);
    g.fillEllipse(x + w * 0.56, y + h * 0.58, w * 0.20, h * 0.10);

    for (let i = 0; i < 10; i++) {
      const reedX = x + 10 + i * 11 + (i % 2) * 2;
      const reedY = y + h - 4 - (i % 3) * 2;
      g.lineStyle(1, 0x406f21, 0.9);
      g.lineBetween(reedX, reedY, reedX + ((i % 2) === 0 ? -1 : 1), reedY - 9 - (i % 3) * 2);
      g.fillStyle(0x7db44b, 0.95);
      g.fillEllipse(reedX + 1, reedY - 8, 5, 2);
    }

    for (let i = 0; i < 6; i++) {
      const rippleX = x + w * (0.26 + i * 0.1);
      const rippleY = y + h * (0.34 + (i % 3) * 0.11);
      g.lineStyle(1, 0xa8e5ef, 0.32);
      g.strokeEllipse(rippleX, rippleY, 10 + (i % 2) * 4, 4 + (i % 2) * 2);
    }
  }

  private placeTree(x: number, y: number, textureKey: string, scale: number): void {
    if (this.isTreeBlockedArea(x, y)) return;
    const tree = this.add.image(x, y, textureKey);
    tree.setOrigin(0.5, 1);
    tree.setScale(scale);
    tree.setDepth(y);
  }

  private isTreeBlockedArea(x: number, y: number): boolean {
    const protectedZones = [
      { x: HOUSE_X, y: HOUSE_Y + 36, rx: 120, ry: 90 },
      { x: FIELD_RECT.x + FIELD_RECT.w / 2, y: FIELD_RECT.y + FIELD_RECT.h / 2, rx: FIELD_RECT.w / 2 + 32, ry: FIELD_RECT.h / 2 + 28 },
      { x: ox(59), y: oy(323), rx: 92, ry: 56 },
      { x: DOOR_X, y: DOOR_Y + 10, rx: 34, ry: 28 },
      { x: SHIPPING_BIN_X, y: SHIPPING_BIN_Y + 8, rx: 34, ry: 28 },
      { x: ENTRY_SPAWN_X - 26, y: ENTRY_SPAWN_Y, rx: 74, ry: 54 },
    ];

    return protectedZones.some((zone) =>
      Math.abs(x - zone.x) <= zone.rx && Math.abs(y - zone.y) <= zone.ry
    );
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
      { x: ox(248), y: oy(96) }, { x: ox(264), y: oy(108) }, { x: ox(248), y: oy(124) }, { x: ox(430), y: oy(188) },
    ];
    for (const crate of crates) {
      g.fillStyle(0xd8791f, 1);
      g.fillRoundedRect(crate.x, crate.y, 14, 18, 2);
      g.lineStyle(1, 0xffc175, 0.8);
      g.lineBetween(crate.x + 5, crate.y + 5, crate.x + 5, crate.y + 10);
      g.lineBetween(crate.x + 9, crate.y + 8, crate.x + 9, crate.y + 13);
    }
  }

  private drawShippingBin(g: Phaser.GameObjects.Graphics): void {
    const x = SHIPPING_BIN_X;
    const y = SHIPPING_BIN_Y;

    g.fillStyle(0x6b3f1f, 1);
    g.fillRoundedRect(x - 17, y - 8, 34, 25, 3);
    g.fillStyle(0x8a5528, 1);
    g.fillRoundedRect(x - 20, y - 16, 40, 12, 2);
    g.lineStyle(1, 0xd2a063, 0.85);
    g.strokeRoundedRect(x - 20, y - 16, 40, 33, 3);
    g.lineBetween(x - 10, y - 5, x - 10, y + 15);
    g.lineBetween(x + 8, y - 5, x + 8, y + 15);
    g.fillStyle(0xe6c27a, 1);
    g.fillRect(x - 8, y - 13, 16, 3);

    this.add.text(x, y + 25, 'JUAL', {
      fontSize: '6px',
      color: '#f7e4aa',
      fontFamily: 'monospace',
      backgroundColor: '#00000055',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES + 1);
  }

  private drawFlowerSprinkles(g: Phaser.GameObjects.Graphics): void {
    const flowers = [
      [ox(254), oy(154)], [ox(270), oy(166)], [ox(290), oy(162)], [ox(230), oy(178)], [ox(248), oy(202)],
      [ox(18), oy(158)], [ox(82), oy(252)], [ox(56), oy(234)], [ox(405), oy(190)], [ox(438), oy(176)],
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
    this.addColliderBox(ox(248), oy(28), 214, 130);
    this.addColliderBox(ox(320), oy(158), 124, 24);
    this.addColliderBox(ox(8), oy(52), 36, 48);
    this.addColliderBox(ox(88), oy(36), 34, 42);
    this.addColliderBox(ox(444), oy(46), 34, 44);
    this.addColliderBox(ox(18), oy(258), 32, 42);
    this.addColliderBox(ox(142), oy(274), 32, 42);
    this.addColliderBox(ox(454), oy(274), 32, 42);
    this.addColliderBox(ox(222), oy(306), 36, 44);
    this.addPondColliders(ox(-10), oy(286), 138, 74);
    this.addColliderBox(ox(312), oy(-38), 40, 30);
    this.addColliderBox(ox(694), oy(20), 42, 30);
    this.addColliderBox(ox(-116), oy(204), 28, 28);
    this.addColliderBox(ox(640), oy(306), 28, 28);
    this.addColliderBox(ox(304), oy(232), 42, 20);
    this.addColliderBox(ox(382), oy(418), 38, 18);
    this.addColliderBox(ox(-20), oy(424), 18, 16);
    this.addColliderBox(ox(452), oy(440), 18, 16);
    this.addColliderBox(SHIPPING_BIN_X - 18, SHIPPING_BIN_Y - 14, 36, 28);
  }

  private addColliderBox(x: number, y: number, width: number, height: number): void {
    const body = this.physics.add.staticBody(x, y, width, height);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  private addPondColliders(x: number, y: number, w: number, h: number): void {
    this.addColliderBox(x + w * 0.09, y + h * 0.30, w * 0.64, h * 0.52);
    this.addColliderBox(x + w * 0.00, y + h * 0.36, w * 0.30, h * 0.34);
    this.addColliderBox(x + w * 0.58, y + h * 0.18, w * 0.34, h * 0.34);
  }

  private buildExitSign(): void {
    const sign = this.add.text(HOMESTEAD_W - 50, HOMESTEAD_H / 2 - 26, 'Kota ->', {
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

    if (this.nearShippingBin) {
      this.shipSelectedItem();
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
    this.nearDoor = dist < DOOR_INTERACT_RADIUS;

    if (this.nearDoor && !this.activityZoneUI.isActivityActive) {
      this.doorPrompt.setText('[E] Masuk rumah');
      this.doorPrompt.setVisible(true);
    } else {
      this.doorPrompt.setVisible(false);
    }
  }

  private checkShippingBinProximity(): void {
    if (this.nearDoor || this.activityZoneUI.isActivityActive) {
      this.nearShippingBin = false;
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, SHIPPING_BIN_X, SHIPPING_BIN_Y);
    this.nearShippingBin = dist < SHIPPING_BIN_RADIUS;

    if (!this.nearShippingBin) return;

    const selected = gameManager.inventory.getSelectedItem();
    const price = selected ? gameManager.getShippingPrice(selected) : 0;
    const pending = gameManager.shippingBinValue;
    const prompt = selected && price > 0
      ? `[E] Kirim ${selected.name} (${this.formatRp(price)})`
      : pending > 0
        ? `Shipping: ${this.formatRp(pending)}`
        : 'Pilih item jual';

    this.doorPrompt.setText(prompt);
    this.doorPrompt.setVisible(true);
  }

  private checkFarmProximity(): void {
    if (this.nearDoor || this.nearShippingBin || this.activityZoneUI.isActivityActive) return;

    const target = this.getFarmInteractionPoint();
    let closest: FarmPlot | null = null;
    let closestDistance = Infinity;
    for (const plot of this.farmPlots) {
      const insideX = Math.abs(target.x - plot.x) <= FARM_INTERACT_W / 2;
      const insideY = Math.abs(target.y - plot.y) <= FARM_INTERACT_H / 2;
      if (!insideX || !insideY) continue;

      const distance = Phaser.Math.Distance.Between(target.x, target.y, plot.x, plot.y);
      if (distance < closestDistance) {
        closest = plot;
        closestDistance = distance;
      }
    }

    this.nearbyPlot = closest;
    if (!closest) {
      return;
    }

    this.doorPrompt.setText(this.getPlotPrompt(closest));
    this.doorPrompt.setVisible(true);
  }

  private shipSelectedItem(): void {
    const selectedSlot = gameManager.inventory.getSelectedSlot();
    if (selectedSlot === -1) {
      this.popFarmText(SHIPPING_BIN_X, SHIPPING_BIN_Y - 34, 'Pilih item dulu');
      return;
    }

    const result = gameManager.shipInventorySlot(selectedSlot);
    this.popFarmText(
      SHIPPING_BIN_X,
      SHIPPING_BIN_Y - 34,
      result.success ? `Dikirim +${this.formatRp(result.value)}` : result.message,
    );

    if (result.success) {
      proceduralAudio.playClick();
    }
  }

  private getFarmInteractionPoint(): { x: number; y: number } {
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const feetX = body.center.x;
    const feetY = body.bottom - 2;

    switch (this.player.direction) {
      case 'up':
        return { x: feetX, y: feetY - 18 };
      case 'down':
        return { x: feetX, y: feetY + 8 };
      case 'left':
        return { x: feetX - 18, y: feetY + 2 };
      case 'right':
        return { x: feetX + 18, y: feetY + 2 };
      default:
        return { x: feetX, y: feetY };
    }
  }

  private getPlotPrompt(plot: FarmPlot): string {
    const state = plot.state;
    const selectedTool = this.getSelectedTool();
    if (!state.tilled) {
      return selectedTool === 'hoe' ? '[E] Cangkul tanah' : 'Pilih hoe untuk cangkul';
    }

    if (!state.crop) {
      const targetCrop = this.getSelectedSeedCrop();
      if (!targetCrop) {
        return this.hasAnySeed() ? 'Pilih seed bag / bibit' : 'Butuh bibit';
      }
      if (!this.isCropInSeason(targetCrop)) return 'Bibit ini belum musim';
      return `[E] Tanam ${this.getCropLabel(targetCrop)}`;
    }

    const cropName = this.getCropLabel(state.crop);
    if (state.rotten) return '[E] Bersihkan tanaman busuk';
    if (state.stage >= this.getCropFrames(state.crop).length - 1) return `[E] Panen ${cropName}`;
    if (selectedTool !== 'watering_can') return 'Pilih watering can';
    if (state.lastWateredDay === gameManager.time.day) return `${cropName} sudah disiram`;
    return `[E] Siram ${cropName}`;
  }

  private interactWithPlot(plot: FarmPlot): void {
    const state = plot.state;
    const today = gameManager.time.day;
    const selectedTool = this.getSelectedTool();

    if (!state.tilled) {
      if (selectedTool !== 'hoe') {
        this.popFarmText(plot.x, plot.y - 26, 'Pilih hoe dulu');
        return;
      }
      if (!this.spendStamina(STAMINA_HOE_COST, plot.x, plot.y)) return;
      state.tilled = true;
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, 'Tanah dicangkul');
      this.saveFarmState();
      return;
    }

    if (!state.crop) {
      const cropToPlant = this.getSelectedSeedCrop();
      if (!cropToPlant) {
        this.popFarmText(plot.x, plot.y - 26, this.hasAnySeed() ? 'Pilih bibit dulu' : 'Butuh bibit');
        return;
      }

      if (!this.isCropInSeason(cropToPlant)) {
        this.popFarmText(plot.x, plot.y - 26, 'Belum musim tanam');
        return;
      }

      const selectedSlot = this.getSeedSlotForPlanting(cropToPlant);
      if (selectedSlot === -1) {
        this.popFarmText(plot.x, plot.y - 26, 'Pilih bibit dulu');
        return;
      }

      const selectedItem = gameManager.inventory.getSlot(selectedSlot);
      const seedItemId = this.getSeedItemId(cropToPlant);
      if (!selectedItem || selectedItem.id !== seedItemId) {
        this.popFarmText(plot.x, plot.y - 26, `Butuh ${this.getSeedLabel(cropToPlant)}`);
        return;
      }
      if (!this.spendStamina(STAMINA_PLANT_COST, plot.x, plot.y)) return;
      if (!gameManager.inventory.consumeOneAtSlot(selectedSlot)) return;

      plot.state = {
        tilled: true,
        crop: cropToPlant,
        stage: 0,
        plantedDay: today,
        lastWateredDay: today,
        missedWaterDays: 0,
        rotten: false,
      };
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, `${this.getSeedLabel(cropToPlant)} ditanam`);
      if (gameManager.time.day === 1 && gameManager.isFirstDayActive()) {
        gameManager.setFirstDayStage('sleep');
      }
      this.saveFarmState();
      return;
    }

    if (state.rotten) {
      if (!this.spendStamina(STAMINA_CLEAR_COST, plot.x, plot.y)) return;
      plot.state = this.createEmptyPlotState(true);
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, 'Dibersihkan');
      this.saveFarmState();
      return;
    }

    if (state.stage >= this.getCropFrames(state.crop).length - 1) {
      const quality = this.rollCropQuality(state);
      const item = this.createHarvestItem(state.crop, quality);
      if (gameManager.inventory.isFull() && !gameManager.inventory.hasItem(item.id)) {
        this.popFarmText(plot.x, plot.y - 26, 'Tas penuh');
        return;
      }
      if (!this.spendStamina(STAMINA_HARVEST_COST, plot.x, plot.y)) return;
      const slot = gameManager.inventory.addItem({ ...item });
      if (slot === -1) {
        this.popFarmText(plot.x, plot.y - 26, 'Tas penuh');
        return;
      }
      plot.state = this.createEmptyPlotState(true);
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.popFarmText(plot.x, plot.y - 26, `Panen ${this.getQualityLabel(quality)}!`);
      this.saveFarmState();
      return;
    }

    if (state.lastWateredDay !== today) {
      if (selectedTool !== 'watering_can') {
        this.popFarmText(plot.x, plot.y - 26, 'Pilih watering can');
        return;
      }
      if (!this.spendStamina(STAMINA_WATER_COST, plot.x, plot.y)) return;
      state.lastWateredDay = today;
      state.missedWaterDays = 0;
      proceduralAudio.playClick();
      this.refreshPlotSprite(plot);
      this.playWaterEffect(plot.x, plot.y);
      this.saveFarmState();
      return;
    }

    this.popFarmText(plot.x, plot.y - 26, 'Sudah disiram');
  }

  private spendStamina(cost: number, x: number, y: number): boolean {
    if (gameManager.consumeStamina(cost)) return true;
    this.popFarmText(x, y - 26, 'Stamina habis');
    return false;
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

  private getSelectedTool(): ToolId | null {
    const selected = gameManager.inventory.getSelectedItem();
    if (!selected) return null;
    return (STARTER_TOOL_IDS as readonly string[]).includes(selected.id) ? selected.id as ToolId : null;
  }

  private getSeedItemId(cropKind: CropKind): 'carrot_seed' | 'red_onion_seed' {
    return CROP_CONFIGS[cropKind].seedId as 'carrot_seed' | 'red_onion_seed';
  }

  private getSelectedSeedCrop(): CropKind | null {
    const selected = gameManager.inventory.getSelectedItem();
    if (!selected) return null;
    if (selected.id === 'seed_bag') {
      if (gameManager.inventory.hasItem('red_onion_seed')) return 'onion';
      if (gameManager.inventory.hasItem('carrot_seed')) return 'carrot';
      return null;
    }
    if (selected.id === 'carrot_seed') {
      return 'carrot';
    }
    if (selected.id === 'red_onion_seed') {
      return 'onion';
    }
    return null;
  }

  private getSeedSlotForPlanting(cropKind: CropKind): number {
    const selectedSlot = gameManager.inventory.getSelectedSlot();
    const selectedItem = selectedSlot === -1 ? null : gameManager.inventory.getSlot(selectedSlot);
    const seedItemId = this.getSeedItemId(cropKind);
    if (selectedItem?.id === seedItemId) return selectedSlot;
    return gameManager.inventory.findFirstSlotByItemId(seedItemId);
  }

  private hasAnySeed(): boolean {
    return gameManager.inventory.hasItem('carrot_seed') || gameManager.inventory.hasItem('red_onion_seed');
  }

  private getCropLabel(cropKind: CropKind): string {
    return CROP_CONFIGS[cropKind].label;
  }

  private getSeedLabel(cropKind: CropKind): string {
    return CROP_CONFIGS[cropKind].seedLabel;
  }

  private createHarvestItem(cropKind: CropKind, quality: CropQuality) {
    const base = ITEM_DEFS[CROP_CONFIGS[cropKind].cropItemId];
    if (quality === 'normal') return { ...base };

    const qualityName = quality === 'gold' ? 'Gold' : 'Silver';
    return {
      ...base,
      id: `${base.id}_${quality}`,
      name: `${base.name} (${qualityName})`,
      description: `${base.description}\nQuality: ${qualityName}.`,
      color: quality === 'gold' ? 0xf2d65a : 0xc8d0d6,
    };
  }

  private rollCropQuality(state: FarmPlotState): CropQuality {
    const grewCleanly = state.missedWaterDays === 0;
    const ageBonus = Math.max(0, gameManager.time.day - state.plantedDay);
    const roll = Math.random() + (grewCleanly ? 0.18 : 0) + Math.min(ageBonus, 6) * 0.015;
    if (roll > 0.88) return 'gold';
    if (roll > 0.62) return 'silver';
    return 'normal';
  }

  private getQualityLabel(quality: CropQuality): string {
    switch (quality) {
      case 'gold': return 'Gold';
      case 'silver': return 'Silver';
      default: return 'Normal';
    }
  }

  private isCropInSeason(cropKind: CropKind): boolean {
    return CROP_CONFIGS[cropKind].seasons.includes(this.getCurrentSeason());
  }

  private getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    return 'spring';
  }

  private formatRp(amount: number): string {
    return formatRupiah(amount);
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
    this.cameras.main.startFollow(this.player.sprite, true, CAMERA_CONFIG.LERP, CAMERA_CONFIG.LERP);
  }

  private onShutdown(): void {
    EventBus.off('event:player-locked', this.onPlayerLocked);
    this.mobileControls.destroy();
    this.activityZoneUI.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.objectiveUI.destroy();
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
