/**
 * BenchScene - Taman kota / bangku istirahat.
 *
 * Dicapai dengan berjalan ke tepi KIRI peta downtown.
 * Keluar dengan berjalan kembali ke tepi KANAN (→ kota).
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │          LANGIT (sore, kuning hangat)                   │  y: 0–75
 *   │   🌳                              🌳    POHON            │
 *   │          ════════════════════════  JALAN SETAPAK        │  y: 150–175
 *   │             [BANGKU]  [ZONA DUDUK]                      │
 *   │                                              Kota →     │  y: 150
 *   └─────────────────────────────────────────────────────────┘
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
import { ForagingSystem } from '@/systems/ForagingSystem';

const W = GAME_CONFIG.WIDTH;
const H = GAME_CONFIG.HEIGHT;

const PATH_Y      = 155; // Y tengah jalur setapak
const PATH_HALF_H = 28;  // jalan utama lebih lebar: total 56px
const PATH_TOP    = PATH_Y - PATH_HALF_H;
const PATH_BOTTOM = PATH_Y + PATH_HALF_H;
const SKY_H       = 80;  // tinggi area langit
const IMAGE_TREE_POSITIONS = [
  { x: 60, y: 112, key: 'tile-tree-5', scale: 0.34, collider: { x: -20, y: -28, width: 40, height: 32 } },
  { x: 420, y: 110, key: 'tile-tree-6', scale: 0.50, collider: { x: -16, y: -30, width: 32, height: 34 } },
  { x: 34, y: 132, key: 'tile-tree-6', scale: 0.46, collider: { x: -16, y: -28, width: 32, height: 32 } },
  { x: 444, y: 128, key: 'tile-tree-5', scale: 0.32, collider: { x: -20, y: -28, width: 40, height: 30 } },
  { x: 115, y: PATH_BOTTOM + 78, key: 'tile-tree-2', scale: 0.58, collider: { x: -16, y: -38, width: 32, height: 42 } },
  { x: 370, y: PATH_BOTTOM + 74, key: 'tile-tree-3', scale: 0.60, collider: { x: -16, y: -38, width: 32, height: 42 } },
  { x: 88, y: 276, key: 'tile-tree-2', scale: 0.56, collider: { x: -16, y: -36, width: 32, height: 40 } },
  { x: 382, y: 274, key: 'tile-tree-3', scale: 0.58, collider: { x: -16, y: -36, width: 32, height: 40 } },
] as const;
const WOOD_POSITIONS = [
  { x: 128, y: 112, key: 'tile-wood-tree-5', scale: 0.42, collider: { width: 28, height: 16 } },
  { x: 342, y: 104, key: 'tile-wood-tree-5', scale: 0.38, collider: { width: 26, height: 14 } },
  { x: 62, y: 242, key: 'tile-wood-tree-6', scale: 0.74, collider: { width: 16, height: 14 } },
  { x: 400, y: 226, key: 'tile-wood-tree-6', scale: 0.70, collider: { width: 16, height: 14 } },
] as const;

export class BenchScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;
  private pauseMenu!: PauseMenuUI;
  private hud!: SceneHUD;
  private atmosphere!: SceneAtmosphere;
  private nightSky!: Phaser.GameObjects.Graphics;
  private ownedAudioSystem: AudioSystem | null = null;
  private foragingSystem!: ForagingSystem;
  private lanternGlows: Phaser.GameObjects.Graphics[] = [];
  private fireflyGs:    Phaser.GameObjects.Graphics[] = [];
  private butterflies:  Phaser.GameObjects.Graphics[] = [];
  private grassTufts:   Phaser.GameObjects.Graphics[] = [];
  private skyGrassObjects: Phaser.GameObjects.Image[] = [];
  private lightFlickerTime = 0;
  private exiting = false;
  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  constructor() {
    super({ key: 'BenchScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, W, H);

    this.buildBackground();
    this.buildGrassDetail();
    this.buildFlowers();
    this.buildAssetDecor();
    this.buildPath();
    this.buildBench();
    this.buildLanterns();
    this.spawnLeaves();
    this.spawnFireflies();
    this.spawnButterflies();

    // Player masuk dari sisi kanan (datang dari kota)
    this.player = new Player(this, W - 30, PATH_Y + 10);
    this.player.sprite.setCollideWorldBounds(true);
    this.foragingSystem = new ForagingSystem(this, {
      locationId: 'bench',
      player: this.player.sprite,
      dailyCount: 6,
      itemIds: ['flower', 'mushroom', 'berry'],
      areas: [
        { x: 24, y: SKY_H + 16, width: 120, height: PATH_TOP - SKY_H - 28 },
        { x: 308, y: SKY_H + 16, width: 132, height: PATH_TOP - SKY_H - 28 },
        { x: 36, y: PATH_BOTTOM + 24, width: 132, height: H - PATH_BOTTOM - 42 },
        { x: 312, y: PATH_BOTTOM + 24, width: 120, height: H - PATH_BOTTOM - 42 },
      ],
      avoid: [
        { x: W - 30, y: PATH_Y + 10, radius: 56 },
        { x: 210, y: PATH_TOP - 4, radius: 58 },
      ],
    });

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.centerOn(W / 2, H / 2);

    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);

    // Zona duduk di bangku
    this.activityZoneUI.createZones(this.player.sprite, [{
      id: 'bench_sit',
      x: 150,
      y: PATH_TOP - 50,
      width: 120,
      height: 38,
    }]);

    this.createObjectColliders();

    // E key
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => {
        if (this.foragingSystem.tryCollect()) return;
        if (this.activityZoneUI.isActivityActive) {
          this.activityZoneUI.cancelActivity();
        } else if (this.activityZoneUI.isInZone) {
          this.activityZoneUI.startActivity();
        }
      });

    EventBus.on('event:player-locked', this.onPlayerLocked, this);

    this.mobileControls = new MobileControls(this);

    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'bench', W, H);
    this.atmosphere = new SceneAtmosphere(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake',     this.onWake,     this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.lightFlickerTime += delta;
    const nightA = this.getNightAlpha();
    this.nightSky.setAlpha(nightA);
    this.updateNightElements(nightA);
    this.hud.update(this.player.sprite.x, this.player.sprite.y, this.atmosphere.weatherState);
    if (this.pauseMenu.opened) return;

    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) {
        if (this.foragingSystem.tryCollect()) return;
        if (this.activityZoneUI.isActivityActive) this.activityZoneUI.cancelActivity();
        else if (this.activityZoneUI.isInZone) this.activityZoneUI.startActivity();
      }
    }

    this.player.update();
    this.activitySystem.update(delta);
    this.activityZoneUI.update(delta);
    this.foragingSystem.update(!this.activityZoneUI.isInZone && !this.activityZoneUI.isActivityActive);

    // Keluar kembali ke kota (tepi kanan)
    if (!this.exiting && this.player.sprite.x > W - 22) {
      this.doExit();
    }
  }

  // ============================================================
  // BACKGROUND
  // ============================================================

  private buildBackground(): void {
    // ── Langit siang — biru netral (SceneAtmosphere menangani tint malam/sore) ──
    const skyG = this.add.graphics().setDepth(DEPTH.GROUND - 5);
    skyG.fillGradientStyle(0x4a9ed8, 0x4a9ed8, 0xb8e0f4, 0xb8e0f4, 1);
    skyG.fillRect(0, 0, W, SKY_H + 6);

    // Haze horizon — strip tipis menurun alpha
    const hazeColors: [number, number][] = [
      [0xd8eeff, 0.22],
      [0xc8e4ff, 0.14],
      [0xb8dcff, 0.08],
    ];
    for (let i = 0; i < hazeColors.length; i++) {
      const [col, a] = hazeColors[i];
      skyG.fillStyle(col, a);
      skyG.fillRect(0, SKY_H - 8 + i * 5, W, 7);
    }

    // Awan siang — hanya circles, tanpa fillRect
    const cloudG = this.add.graphics().setDepth(DEPTH.GROUND - 4);
    cloudG.fillStyle(0xffffff, 0.90);
    this.drawCloud(cloudG, 100, 18, 42);
    this.drawCloud(cloudG, 348, 10, 34);
    this.drawCloud(cloudG, 218, 28, 26);

    // ── Langit malam ──
    this.buildNightSky();

    // ── Rumput taman ──
    const grassG = this.add.graphics().setDepth(DEPTH.GROUND - 5);
    grassG.fillGradientStyle(0x4a7a2a, 0x4a7a2a, 0x3a6020, 0x3a6020, 1);
    grassG.fillRect(0, SKY_H, W, H - SKY_H);

    // Variasi patch rumput — ellips overlap rendah alpha
    const grassPalette = [0x5a8c32, 0x3a7018, 0x6aa040, 0x2e5814];
    const patchG = this.add.graphics().setDepth(DEPTH.GROUND - 4);
    for (let i = 0; i < 24; i++) {
      const ex  = ((i * 137.5) % 1) * W;
      const ey  = SKY_H + 8 + ((i * 73.1) % 1) * (H - SKY_H - 12);
      const col = grassPalette[i % grassPalette.length];
      patchG.fillStyle(col, 0.18 + (i % 3) * 0.07);
      patchG.fillEllipse(ex, ey, 50 + (i % 5) * 20, 14 + (i % 4) * 6);
    }
  }

  /** Semua circles — tanpa fillRect agar tidak terlihat kotak. */
  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillCircle(x,              y,     r * 0.60);
    g.fillCircle(x + r * 0.52,  y + 3, r * 0.50);
    g.fillCircle(x - r * 0.48,  y + 5, r * 0.45);
    g.fillCircle(x + r * 0.18,  y + 6, r * 0.44);
    g.fillCircle(x - r * 0.16,  y + 7, r * 0.40);
    g.fillCircle(x + r * 0.38,  y + 9, r * 0.36);
    g.fillCircle(x - r * 0.32,  y + 9, r * 0.34);
    g.fillCircle(x,              y + 9, r * 0.38);
  }

  // ── Langit malam — bintang + bulan, alpha naik saat evening/night ──
  private buildNightSky(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 3.5);
    this.nightSky = g;

    // Langit gelap menutupi langit siang
    g.fillGradientStyle(0x05081a, 0x05081a, 0x0e1838, 0x0e1838, 1);
    g.fillRect(0, 0, W, SKY_H + 6);

    // Bintang — distribusi golden ratio
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 44; i++) {
      const sx = ((i * 137.508) % 1) * W;
      const sy = ((i *  73.137) % 1) * (SKY_H - 6);
      g.fillCircle(sx, sy, i % 7 === 0 ? 1.5 : 1);
    }
    g.fillStyle(0xaabbdd, 1);
    for (let i = 0; i < 26; i++) {
      const sx = ((i * 211.34) % 1) * W;
      const sy = ((i *  98.61) % 1) * (SKY_H - 6);
      g.fillCircle(sx, sy, 0.8);
    }

    // Bulan — kiri atas (berlawanan posisi dengan FishingScene)
    const mx = W * 0.18;
    const my = SKY_H  * 0.32;
    const mr = 12;
    g.fillStyle(0xfff8cc, 0.10);
    g.fillCircle(mx, my, mr * 3.0);
    g.fillStyle(0xfff8cc, 0.18);
    g.fillCircle(mx, my, mr * 1.8);
    g.fillStyle(0xfff5d0, 1);
    g.fillCircle(mx, my, mr);
    // Crescent shadow
    g.fillStyle(0x0e1838, 1);
    g.fillCircle(mx + mr * 0.38, my - mr * 0.08, mr * 0.84);

    g.setAlpha(this.getNightAlpha());
  }

  /** Alpha layer malam berdasarkan periode waktu. */
  private getNightAlpha(): number {
    const { period, periodProgress } = gameManager.time;
    switch (period) {
      case 'late_night': return 1.0;
      case 'night':      return 0.55 + periodProgress * 0.45;
      case 'evening':    return periodProgress * 0.55;
      case 'dawn':       return Math.max(0, 1.0 - periodProgress * 1.4);
      default:           return 0;
    }
  }

  private buildPath(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);

    // Jalur batu utama (lebih lebar agar nyaman dilalui)
    g.fillStyle(0x9a9070, 1);
    g.fillRect(0, PATH_TOP, W, PATH_HALF_H * 2);

    g.fillStyle(0x80765d, 0.5);
    g.fillRect(0, PATH_TOP, W, 4);
    g.fillRect(0, PATH_BOTTOM - 4, W, 4);

    // Batu-batu individual
    g.fillStyle(0x8a8060, 1);
    for (let x = 10; x < W; x += 28) {
      g.fillRoundedRect(x, PATH_TOP + 8, 18, 10, 2);
      g.fillRoundedRect(x + 10, PATH_Y + 2, 14, 8, 2);
      g.fillRoundedRect(x - 4, PATH_BOTTOM - 16, 16, 8, 2);
    }

    // Tepi rumput
    g.fillStyle(0x4a8020, 1);
    g.fillRect(0, PATH_TOP - 2, W, 3);
    g.fillRect(0, PATH_BOTTOM, W, 3);
  }

  private buildBench(): void {
    this.add
      .image(210, PATH_TOP - 4, 'house2-bangku-taman')
      .setOrigin(0.5, 1)
      .setScale(1.05)
      .setDepth(DEPTH.ENTITIES - 1);
  }

  private buildExitSign(): void {
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES);
    const signY = PATH_TOP - 22;
    g.fillStyle(0x8b6b3d, 1);
    g.fillRoundedRect(W - 54, signY, 48, 14, 2);
    g.lineStyle(1, 0x5c3a1e, 1);
    g.strokeRoundedRect(W - 54, signY, 48, 14, 2);

    this.add.text(W - 30, signY + 7, 'Kota →', {
      fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES + 1);
  }

  private buildZoneMarker(x: number, y: number, icon: string, label: string): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);
    g.fillStyle(0x88aa66, 0.1);
    g.fillCircle(x, y, 45);
    g.lineStyle(1, 0x88aa66, 0.4);
    g.strokeCircle(x, y, 45);

    const sg = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);
    sg.fillStyle(0x5c3a1e, 1);
    sg.fillRect(x - 2, y - 45, 4, 30);
    sg.fillStyle(0x8b6b3d, 1);
    sg.fillRoundedRect(x - 20, y - 60, 40, 14, 2);
    sg.lineStyle(1, 0x5c3a1e, 1);
    sg.strokeRoundedRect(x - 20, y - 60, 40, 14, 2);

    this.add.text(x, y - 53, label, {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);

    const iconTxt = this.add.text(x, y - 72, icon, { fontSize: '10px' })
      .setOrigin(0.5).setDepth(DEPTH.ENTITIES);

    this.tweens.add({ targets: iconTxt, y: y - 76, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawTree(x: number, y: number): void {
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);

    // Bayangan pohon di tanah
    g.fillStyle(0x1a4008, 0.15);
    g.fillEllipse(x + 5, y + 62, 56, 12);

    // Batang pohon
    g.fillStyle(0x5c3a1e, 1);
    g.fillRect(x - 5, y + 28, 10, 36);
    g.fillStyle(0x6e4826, 1);
    g.fillRect(x - 3, y + 30, 3, 32);
    g.lineStyle(1, 0x3a2010, 0.35);
    g.lineBetween(x + 2, y + 34, x + 3, y + 58);

    // Daun — circles berlapis untuk tampilan organis
    g.fillStyle(0x1e4c0a, 0.9);
    g.fillCircle(x,       y + 10, 28);
    g.fillCircle(x - 18,  y + 20, 20);
    g.fillCircle(x + 20,  y + 16, 22);

    g.fillStyle(0x2e7010, 0.9);
    g.fillCircle(x - 10,  y + 2,  24);
    g.fillCircle(x + 12,  y + 6,  22);
    g.fillCircle(x,       y - 8,  18);
    g.fillCircle(x - 22,  y + 8,  15);
    g.fillCircle(x + 22,  y + 6,  15);

    g.fillStyle(0x3e8820, 0.88);
    g.fillCircle(x - 5,   y - 4,  16);
    g.fillCircle(x + 9,   y - 2,  14);
    g.fillCircle(x - 13,  y + 6,  12);
    g.fillCircle(x + 16,  y - 2,  12);

    // Highlight hijau muda (sudut cahaya kiri atas)
    g.fillStyle(0x5cc030, 0.38);
    g.fillCircle(x - 8,   y - 10, 11);
    g.fillCircle(x + 4,   y - 12, 8);
  }

  // ── Helai rumput di tepi langit dan jalur ──────────────────────
  private buildAssetDecor(): void {
    for (const tree of IMAGE_TREE_POSITIONS) {
      if (!this.textures.exists(tree.key)) continue;

      this.add.image(tree.x, tree.y, tree.key)
        .setOrigin(0.5, 1)
        .setScale(tree.scale)
        .setDepth(tree.y);
    }

    for (const wood of WOOD_POSITIONS) {
      if (!this.textures.exists(wood.key)) continue;

      this.add.image(wood.x, wood.y, wood.key)
        .setOrigin(0.5, 0.9)
        .setScale(wood.scale)
        .setDepth(wood.y);
    }

    const grassPatches = [
      { x: 40, y: 112, key: 'tile-rumput-besar-1', scale: 0.20 },
      { x: 136, y: 104, key: 'tile-rumput-besar-2', scale: 0.18 },
      { x: 344, y: 116, key: 'tile-rumput-besar-1', scale: 0.18 },
      { x: 432, y: 214, key: 'tile-rumput-besar-2', scale: 0.20 },
      { x: 74, y: 264, key: 'tile-rumput-besar-1', scale: 0.16 },
      { x: 324, y: 264, key: 'tile-rumput-besar-2', scale: 0.16 },
    ];

    for (const patch of grassPatches) {
      this.placeGrassImage(patch.x, patch.y, patch.key, patch.scale);
    }

    for (let i = 0; i < 54; i++) {
      const x = 18 + ((i * 73) % (W - 36));
      const y = SKY_H + 14 + ((i * 41) % (H - SKY_H - 24));
      if (this.isOnPath(x, y, 12)) continue;

      this.placeGrassImage(
        x,
        y,
        `tile-rumput-${(i % 8) + 1}`,
        0.12 + (i % 4) * 0.025,
      );
    }
  }

  private placeGrassImage(x: number, y: number, key: string, scale: number): void {
    if (!this.textures.exists(key)) return;

    const grass = this.add.image(x, y, key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(DEPTH.GROUND_DECOR + 1)
      .setAlpha(0.82);

    if ((Math.floor(x + y) % 3) === 0) {
      this.tweens.add({
        targets: grass,
        x: x + 0.45,
        duration: 1200 + ((x + y) % 400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createObjectColliders(): void {
    this.addColliderBox(0, 0, W, SKY_H + 4); // batas langit

    this.addColliderBox(166, PATH_TOP - 36, 88, 30); // bench
    this.addColliderBox(300, PATH_BOTTOM + 3, 20, 74); // lower lantern
    this.addColliderBox(420, PATH_TOP - 76, 20, 74); // upper lantern

    for (const tree of IMAGE_TREE_POSITIONS) {
      this.addColliderBox(
        tree.x + tree.collider.x,
        tree.y + tree.collider.y,
        tree.collider.width,
        tree.collider.height,
      );
    }

    for (const wood of WOOD_POSITIONS) {
      this.addColliderBox(
        wood.x - wood.collider.width / 2,
        wood.y - wood.collider.height / 2,
        wood.collider.width,
        wood.collider.height,
      );
    }
  }

  private addTreeCollider(x: number, y: number): void {
    this.addColliderBox(x - 18, y + 24, 36, 42);
  }

  private addColliderBox(x: number, y: number, width: number, height: number): void {
    const body = this.physics.add.staticBody(x, y, width, height);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  private isOnPath(x: number, y: number, padding: number = 0): boolean {
    return y >= PATH_TOP - padding && y <= PATH_BOTTOM + padding;
  }

  private buildGrassDetail(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 3);

    // Helai rumput di batas langit-rumput
    for (let x = 0; x < W; x += 5) {
      const h   = 4 + ((x * 7919) % 7);
      const col = x % 4 === 0 ? 0x5a9a30 : 0x4a8a20;
      g.fillStyle(col, 0.25 + (x % 3) * 0.08);
      g.fillRect(x, SKY_H - h, 2, h + 1);
    }

    // Helai rumput di tepi atas jalur setapak
    for (let x = 0; x < W; x += 4) {
      const h = 3 + ((x * 3571) % 5);
      g.fillStyle(0x5a9030, 0.55);
      g.fillRect(x,     PATH_TOP - 3 - h, 1, h);
      g.fillRect(x + 2, PATH_TOP - 3 - (h - 1), 1, h - 1);
    }
    // Tepi bawah jalur
    for (let x = 0; x < W; x += 4) {
      const h = 2 + ((x * 2713) % 4);
      g.fillStyle(0x4a8020, 0.50);
      g.fillRect(x, PATH_BOTTOM + 2, 1, h);
    }

    this.spawnAnimatedGrassTufts();
    this.spawnSkyGrassObjects();
  }

  // ── Bunga tersebar di rumput ────────────────────────────────────
  private spawnAnimatedGrassTufts(): void {
    const zones = [
      { y: PATH_TOP - 10, spread: 16, count: 42 },
      { y: PATH_BOTTOM + 10, spread: 20, count: 48 },
      { y: PATH_BOTTOM + 34, spread: 26, count: 24 },
    ];

    for (const zone of zones) {
      for (let i = 0; i < zone.count; i++) {
        const x = (i * 73.137 + zone.y * 0.37) % W;
        const y = zone.y + (((i * 41.71) % 1) - 0.5) * zone.spread;
        const tuft = this.createGrassTuft(x, y, i);
        this.grassTufts.push(tuft);
      }
    }
  }

  private createGrassTuft(x: number, y: number, seed: number): Phaser.GameObjects.Graphics {
    const tuft = this.add.graphics().setDepth(DEPTH.GROUND_DECOR + 1);
    const bladeCount = 4 + (seed % 4);
    const heightBase = 6 + (seed % 5);
    const colors = [0x5aa02f, 0x4b8a24, 0x6db43a, 0x3f7420];

    for (let i = 0; i < bladeCount; i++) {
      const offset = (i - bladeCount / 2) * 1.8;
      const height = heightBase + ((seed + i * 3) % 5);
      const lean = ((seed * 11 + i * 7) % 9) - 4;
      tuft.lineStyle(1, colors[(seed + i) % colors.length], 0.72);
      tuft.lineBetween(offset, 0, offset + lean, -height);
    }

    tuft.setPosition(x, y);

    this.tweens.add({
      targets: tuft,
      angle: { from: -2 - (seed % 3), to: 2 + (seed % 4) },
      scaleX: { from: 0.94, to: 1.08 },
      duration: 900 + (seed % 7) * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: (seed % 9) * 90,
    });

    return tuft;
  }

  private spawnSkyGrassObjects(): void {
    const rows = [
      { y: SKY_H + 8, count: 14, scale: 0.42 },
      { y: SKY_H + 24, count: 10, scale: 0.36 },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const x = ((i * 37 + row.y * 1.9) % (W + 36)) - 18;
        const y = row.y + (((i * 19.73) % 1) - 0.5) * 10;
        const key = `grass-${(i % 6) + 1}`;
        const grass = this.add.image(x, y, key)
          .setScale(row.scale + (i % 3) * 0.04)
          .setDepth(DEPTH.GROUND_DECOR + 2)
          .setAlpha(0.82);

        this.tweens.add({
          targets: grass,
          angle: { from: -1.8 - (i % 2), to: 1.8 + (i % 3) },
          x: x + (((i % 2) * 2 - 1) * 1.5),
          duration: 1300 + (i % 6) * 180,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 65,
        });

        this.skyGrassObjects.push(grass);
      }
    }
  }

  private buildFlowers(): void {
    const palette: [number, number][] = [
      [0xffffff, 0xffee88], // daisy putih
      [0xff88bb, 0xffee44], // pink
      [0xffdd44, 0xff8800], // kuning
      [0xcc88ff, 0xffee88], // ungu
      [0xff7755, 0xffdd88], // oranye
      [0xaaddff, 0xffffff], // biru muda
    ];
    const fg = this.add.graphics().setDepth(DEPTH.GROUND - 3);

    for (let i = 0; i < 34; i++) {
      const fx = ((i * 137.508) % 1) * W;
      const fy = SKY_H + 10 + ((i * 73.137) % 1) * (PATH_TOP - SKY_H - 14);
      if (fy > PATH_TOP - 6 && fy < PATH_BOTTOM + 6) continue; // lewati jalur
      const [petal, center] = palette[i % palette.length];

      // Batang
      fg.lineStyle(1, 0x3a7018, 0.75);
      fg.lineBetween(fx, fy, fx, fy + 7);

      // 5 kelopak kecil
      fg.fillStyle(petal, 0.90);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        fg.fillCircle(fx + Math.cos(a) * 2.8, fy + Math.sin(a) * 2.8, 1.6);
      }
      // Pusat bunga
      fg.fillStyle(center, 1);
      fg.fillCircle(fx, fy, 1.8);
    }
  }

  // ── Lampu taman (tiang + cahaya malam) ─────────────────────────
  private buildLanterns(): void {
    const posts = [
      { x: 310, y: PATH_BOTTOM + 19 },
      { x: 430, y: PATH_TOP - 60 },
    ];
    for (const post of posts) {
      const lx = post.x;
      const ly = post.y;
      const g  = this.add.graphics().setDepth(DEPTH.ENTITIES);

      // Tiang
      g.fillStyle(0x4a4030, 1);
      g.fillRect(lx - 2, ly, 4, 56);

      // Kepala lampu
      g.fillStyle(0x6a5840, 1);
      g.fillRoundedRect(lx - 8, ly - 16, 16, 16, 3);
      g.lineStyle(1, 0x3a3020, 0.8);
      g.strokeRoundedRect(lx - 8, ly - 16, 16, 16, 3);

      // Bohlam
      g.fillStyle(0xfff8cc, 1);
      g.fillCircle(lx, ly - 8, 4);

      // Lingkaran cahaya malam (alpha di-update tiap frame)
      const glow = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);
      glow.fillStyle(0xffeeb0, 0.10);
      glow.fillEllipse(lx, ly - 2, 82, 52);
      glow.fillStyle(0xffd56a, 0.11);
      glow.fillEllipse(lx, ly + 18, 62, 34);
      glow.fillStyle(0xfff3bf, 0.26);
      glow.fillCircle(lx, ly - 8, 24);
      glow.fillStyle(0xffffff, 0.30);
      glow.fillCircle(lx, ly - 8, 9);
      glow.setAlpha(0);
      this.lanternGlows.push(glow);
    }
  }

  // ── Daun berguguran ─────────────────────────────────────────────
  private spawnLeaves(): void {
    const cols = [0x4a8820, 0x7aaa30, 0xc8a020, 0xa86820, 0xd04a10, 0x6aaa38];
    for (let i = 0; i < 20; i++) {
      const sx  = Math.random() * W;
      const sy  = SKY_H + 4 + Math.random() * 30;
      const col = cols[i % cols.length];
      const ew  = 6 + Math.random() * 5;
      const eh  = 3 + Math.random() * 3;

      const lg = this.add.graphics().setDepth(DEPTH.GROUND_DECOR + 1);
      lg.fillStyle(col, 0.85);
      lg.fillEllipse(0, 0, ew, eh);
      lg.setPosition(sx, sy);

      const fallDist = PATH_TOP - 8 - sy;
      const dur      = 5000 + Math.random() * 5000;
      const swayX    = (Math.random() < 0.5 ? 1 : -1) * (18 + Math.random() * 28);

      // Jatuh
      this.tweens.add({
        targets: lg, y: sy + fallDist,
        duration: dur, repeat: -1, delay: Math.random() * 8000,
        onRepeat: () => lg.setPosition(Math.random() * W, sy),
      });
      // Ayun kiri-kanan
      this.tweens.add({
        targets: lg, x: `+=${swayX}`,
        duration: 1800 + Math.random() * 1400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Berputar
      this.tweens.add({
        targets: lg, angle: 360,
        duration: 2800 + Math.random() * 2000, repeat: -1,
      });
    }
  }

  // ── Kunang-kunang (hanya malam) ─────────────────────────────────
  private spawnFireflies(): void {
    const clusters = [
      { cx: 70,  cy: 110 }, { cx: 160, cy: 104 },
      { cx: 325, cy: PATH_BOTTOM + 34 }, { cx: 430, cy: 106 },
    ];
    for (let i = 0; i < 22; i++) {
      const cl = clusters[i % clusters.length];
      const fx = cl.cx + (Math.random() - 0.5) * 65;
      const fy = cl.cy + (Math.random() - 0.5) * 35;

      const fg = this.add.graphics().setDepth(DEPTH.ENTITIES + 2);
      fg.fillStyle(0xccff88, 1);
      fg.fillCircle(0, 0, 1.5);
      // Halo lembut
      fg.fillStyle(0xccff88, 0.25);
      fg.fillCircle(0, 0, 4);
      fg.setPosition(fx, fy).setAlpha(0).setVisible(false);
      this.fireflyGs.push(fg);

      // Pulse cahaya
      this.tweens.add({
        targets: fg, alpha: { from: 0.05, to: 0.92 },
        duration: 700 + Math.random() * 1300,
        yoyo: true, repeat: -1, delay: Math.random() * 3000,
        ease: 'Sine.easeInOut',
      });
      // Melayang pelan
      this.tweens.add({
        targets: fg,
        x: fx + (Math.random() - 0.5) * 50,
        y: fy + (Math.random() - 0.5) * 25,
        duration: 3500 + Math.random() * 4000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Kupu-kupu (hanya siang) ─────────────────────────────────────
  private spawnButterflies(): void {
    const cols = [0xff88cc, 0xffcc44, 0x88ddff, 0xdd88ff, 0xff9944];
    for (let i = 0; i < 5; i++) {
      const baseX = -30 + i * 22;
      const baseY = SKY_H + 15 + i * 12;
      const col   = cols[i];

      const bg = this.add.graphics().setDepth(DEPTH.ENTITIES + 1);
      bg.fillStyle(col, 0.85);
      // Dua sayap (segitiga kecil)
      bg.fillTriangle(-8, 1, 0, -5, 0, 6);
      bg.fillTriangle(8,  1, 0, -5, 0, 6);
      bg.fillStyle(0x222222, 0.5);
      bg.fillRect(-0.5, -5, 1, 11); // badan
      bg.setPosition(baseX, baseY);
      this.butterflies.push(bg);

      // Terbang menyeberang layar
      this.tweens.add({
        targets: bg, x: W + 30,
        duration: 9000 + i * 2200,
        repeat: -1, delay: i * 1800,
        onRepeat: () => bg.setX(-30),
      });
      // Naik-turun (bobbing)
      this.tweens.add({
        targets: bg, y: baseY - 14,
        duration: 550 + i * 110,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Kepak sayap (scaleX flip)
      this.tweens.add({
        targets: bg, scaleX: -1,
        duration: 130 + i * 20,
        yoyo: true, repeat: -1,
      });
    }
  }

  // ── Update elemen malam setiap frame ───────────────────────────
  private updateNightElements(nightAlpha: number): void {
    // Lampu taman — menyala saat sore/malam
    for (let i = 0; i < this.lanternGlows.length; i++) {
      const glow = this.lanternGlows[i];
      const flicker = 0.88 + Math.sin(this.lightFlickerTime * 0.006 + i * 1.7) * 0.07
        + Math.sin(this.lightFlickerTime * 0.017 + i) * 0.03;
      glow.setAlpha(Math.min(nightAlpha * 1.15 * flicker, 0.82));
      glow.setScale(1 + (flicker - 0.9) * 0.08);
    }
    // Kunang-kunang — muncul di malam
    const showFF = nightAlpha > 0.15;
    for (const ff of this.fireflyGs) ff.setVisible(showFF);
    // Kupu-kupu — terlihat hanya siang
    const showBF = nightAlpha < 0.4;
    for (const bf of this.butterflies) bf.setVisible(showBF);
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

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
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    EventBus.off('event:player-locked', this.onPlayerLocked);
    this.mobileControls.destroy();
    this.activityZoneUI.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.atmosphere.destroy();
    this.foragingSystem.destroy();
    for (const tuft of this.grassTufts) tuft.destroy();
    this.grassTufts = [];
    for (const grass of this.skyGrassObjects) grass.destroy();
    this.skyGrassObjects = [];
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
