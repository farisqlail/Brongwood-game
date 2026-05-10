/**
 * GardenScene - Taman / kebun berkebun.
 *
 * Dicapai dengan berjalan ke tepi ATAS peta downtown.
 * Keluar dengan berjalan kembali ke tepi BAWAH (↓ kota).
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │          LANGIT (biru pagi, awan)                       │  y: 0–70
 *   │  ▓▓▓  POHON KIRI          POHON KANAN  ▓▓▓             │  y: 50–130
 *   │        [KEBUN 1]  [KEBUN 2]  [KEBUN 3]                  │  y: 120–200
 *   │             [ZONA BERKEBUN]                             │
 *   │                      ↓ Kota                             │  y: 280–300
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
import { UtilityInteractionSystem, UtilityObjectPlacement } from '@/systems/UtilityInteractionSystem';

const W = GAME_CONFIG.WIDTH;
const H = GAME_CONFIG.HEIGHT;
const MAIN_PATH_X = W / 2;
const MAIN_PATH_HALF_W = 24;
const BOTTOM_PATH_Y = H - 58;
const TREE_POSITIONS = [
  { x: 24,  y: 28 },
  { x: 456, y: 24 },
  { x: 24,  y: 232 },
  { x: 456, y: 228 },
] as const;
const UTILITY_OBJECTS: UtilityObjectPlacement[] = [
  { kind: 'ember', x: 178, y: 220, startFrame: 0, scale: 1.05, collider: { width: 22, height: 18 } },
  { kind: 'ember', x: 302, y: 72,  startFrame: 2, scale: 1.05, collider: { width: 22, height: 18 } },
  { kind: 'box',   x: 382, y: 228, startFrame: 0, scale: 0.95, collider: { width: 26, height: 22 } },
  { kind: 'box',   x: 82,  y: 44,  startFrame: 4, scale: 0.95, collider: { width: 26, height: 22 } },
  { kind: 'box',   x: 384, y: 44,  startFrame: 7, scale: 0.95, collider: { width: 26, height: 22 } },
];

export class GardenScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;
  private pauseMenu!: PauseMenuUI;
  private hud!: SceneHUD;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private utilityInteractions!: UtilityInteractionSystem;
  private exiting = false;
  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  constructor() {
    super({ key: 'GardenScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, W, H);

    this.buildBackground();
    this.buildFieldDetails();
    this.buildGardenBeds();
    this.buildTrees();

    // Player masuk dari bawah (datang dari kota)
    // Spawn di y=220 agar tidak langsung menyentuh batas bawah
    this.player = new Player(this, W / 2, H - 80);
    this.player.sprite.setCollideWorldBounds(true);
    this.utilityInteractions = new UtilityInteractionSystem(this, this.player.sprite, UTILITY_OBJECTS);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.centerOn(W / 2, H / 2);

    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);

    // Zona berkebun — di tengah kebun
    this.activityZoneUI.createZones(this.player.sprite, [{
      id: 'gardening',
      x: 48,
      y: 156,
      width: 104,
      height: 62,
    }]);

    this.createObjectColliders();

    // E key
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => {
        if (this.utilityInteractions.tryInteract()) return;

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

    this.hud = new SceneHUD(this, 'garden', W, H);
    this.atmosphere = new SceneAtmosphere(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake',     this.onWake,     this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.hud.update(this.player.sprite.x, this.player.sprite.y, this.atmosphere.weatherState);
    if (this.pauseMenu.opened) return;

    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) {
        if (this.utilityInteractions.tryInteract()) return;
        if (this.activityZoneUI.isActivityActive) this.activityZoneUI.cancelActivity();
        else if (this.activityZoneUI.isInZone) this.activityZoneUI.startActivity();
      }
    }

    this.player.update();
    this.utilityInteractions.update();
    this.activitySystem.update(delta);
    this.activityZoneUI.update(delta);

    // Keluar kembali ke kota (tepi bawah)
    // Threshold 55px dari bawah karena world bounds + body offset
    // membatasi sprite.y maksimal ~H-40. Gunakan H-60 agar aman.
    if (!this.exiting && this.player.sprite.y > H - 60) {
      this.doExit();
    }
  }

  // ============================================================
  // BACKGROUND
  // ============================================================

  private buildBackground(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 2);

    // Full kebun dari atas sampai bawah, tanpa strip langit.
    g.fillGradientStyle(0x6aa642, 0x6aa642, 0x3f7a2a, 0x3f7a2a, 1);
    g.fillRect(0, 0, W, H);

    // Patch tanah dan rumput agar bidang terasa luas, bukan panel datar.
    const patchColors: Array<[number, number]> = [
      [0x4f8b31, 0.24], [0x76b34c, 0.18], [0x2f6421, 0.16],
      [0x8a6a34, 0.12], [0x5d9b39, 0.18],
    ];
    for (let i = 0; i < 46; i++) {
      const x = ((i * 137.508) % 1) * W;
      const y = ((i * 73.137) % 1) * H;
      const [color, alpha] = patchColors[i % patchColors.length];
      g.fillStyle(color, alpha);
      g.fillEllipse(x, y, 48 + (i % 6) * 18, 14 + (i % 5) * 8);
    }

    // Jalan utama berupa tanah padat, bukan jalur abu-abu.
    g.fillStyle(0x8a6434, 0.92);
    g.fillRect(MAIN_PATH_X - MAIN_PATH_HALF_W, 0, MAIN_PATH_HALF_W * 2, H);
    g.fillRect(0, BOTTOM_PATH_Y - 12, W, 26);

    g.fillStyle(0xa77b44, 0.45);
    g.fillRect(MAIN_PATH_X - MAIN_PATH_HALF_W + 4, 0, MAIN_PATH_HALF_W * 2 - 8, H);
    g.fillRect(0, BOTTOM_PATH_Y - 8, W, 18);

    // Tepi jalur yang tidak terlalu kaku.
    g.fillStyle(0x5f7c32, 0.35);
    g.fillRect(MAIN_PATH_X - MAIN_PATH_HALF_W - 3, 0, 3, BOTTOM_PATH_Y - 12);
    g.fillRect(MAIN_PATH_X + MAIN_PATH_HALF_W, 0, 3, BOTTOM_PATH_Y - 12);
    g.fillRect(0, BOTTOM_PATH_Y - 15, W, 3);
    g.fillRect(0, BOTTOM_PATH_Y + 14, W, 3);

    // Variasi tanah di jalan utama.
    g.fillStyle(0x6e4b26, 0.26);
    for (let y = 8; y < H - 42; y += 14) {
      g.fillEllipse(MAIN_PATH_X - 10, y, 16, 5);
      g.fillEllipse(MAIN_PATH_X + 11, y + 7, 14, 4);
    }

    // Jalur horizontal bawah dibuat lebih organik dengan jejak tanah kecil.
    for (let x = 8; x < W; x += 26) {
      g.fillEllipse(x, BOTTOM_PATH_Y - 2 + ((x * 17) % 9), 18, 6);
    }
  }

  private buildFieldDetails(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR - 1);

    // Furrow / bekas garu di lahan.
    g.lineStyle(1, 0x2f6421, 0.22);
    for (let y = 22; y < H - 80; y += 14) {
      g.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const yy = y + Math.sin(x * 0.035 + y * 0.13) * 2.2;
        if (x === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.strokePath();
    }

    // Rumput kecil tersebar.
    for (let i = 0; i < 150; i++) {
      const x = ((i * 97.31) % 1) * W;
      const y = ((i * 53.77) % 1) * (H - 22) + 8;
      if (this.isOnMainPath(x, y, 10)) continue;

      const h = 4 + (i % 6);
      const col = i % 3 === 0 ? 0x83c65a : i % 3 === 1 ? 0x4d8a2e : 0x2f6a22;
      g.lineStyle(1, col, 0.58);
      g.lineBetween(x, y, x - 2, y - h);
      g.lineBetween(x + 1, y, x + 3, y - h + 1);
    }

    // Batu dan daun kecil sebagai noise visual.
    for (let i = 0; i < 58; i++) {
      const x = ((i * 41.91) % 1) * W;
      const y = ((i * 83.17) % 1) * H;
      if (this.isOnMainPath(x, y, 8)) continue;
      const isPebble = i % 4 === 0;
      g.fillStyle(isPebble ? 0x8d8066 : 0x6faa36, isPebble ? 0.42 : 0.30);
      g.fillEllipse(x, y, isPebble ? 5 : 7, isPebble ? 3 : 2);
    }
  }

  private buildGardenBeds(): void {
    const beds = [
      { x: 48,  y: 64,  w: 104, h: 62 },
      { x: 328, y: 64,  w: 104, h: 62 },
      { x: 48,  y: 156, w: 104, h: 62 },
      { x: 328, y: 156, w: 104, h: 62 },
    ];

    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);

    for (const bed of beds) {
      // Tanah gelap (bed)
      g.fillStyle(0x4a2e0e, 1);
      g.fillRoundedRect(bed.x, bed.y, bed.w, bed.h, 4);

      // Border kayu
      g.lineStyle(2, 0x3a2008, 1);
      g.strokeRoundedRect(bed.x, bed.y, bed.w, bed.h, 4);

      // Highlight tanah
      g.fillStyle(0x5c3a18, 0.5);
      g.fillRoundedRect(bed.x + 4, bed.y + 4, bed.w - 8, 8, 2);

      // Garis tanah
      g.lineStyle(1, 0x3a2008, 0.3);
      for (let lx = bed.x + 10; lx < bed.x + bed.w - 5; lx += 10) {
        g.lineBetween(lx, bed.y + 5, lx, bed.y + bed.h - 5);
      }

      // Tanaman di dalam bed
      this.drawPlants(bed.x + bed.w / 2, bed.y + bed.h / 2);
    }

    // Pagar rendah / patok tepi kebun atas.
    g.fillStyle(0x6b4c2a, 1);
    for (let x = 12; x < W; x += 34) {
      g.fillRect(x, 12, 5, 18);
      g.fillRect(x + 2, 17, 28, 4);
    }
  }

  private drawPlants(cx: number, cy: number): void {
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES - 2);
    g.fillStyle(0x3a8020, 1);
    // 3 tanaman per bed
    for (let i = -1; i <= 1; i++) {
      const px = cx + i * 22;
      // Batang
      g.fillStyle(0x5c8c20, 1);
      g.fillRect(px - 1, cy - 8, 2, 12);
      // Daun
      g.fillStyle(0x4aaa28, 1);
      g.fillTriangle(px - 8, cy, px, cy - 16, px + 8, cy);
      g.fillStyle(0x3a8020, 1);
      g.fillTriangle(px - 6, cy - 5, px + 1, cy - 18, px + 7, cy - 4);
    }
  }

  private buildTrees(): void {
    for (const t of TREE_POSITIONS) {
      this.drawTree(t.x, t.y);
    }
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

    // Daun berbentuk circle berlapis seperti map taman.
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

    g.fillStyle(0x5cc030, 0.38);
    g.fillCircle(x - 8,   y - 10, 11);
    g.fillCircle(x + 4,   y - 12, 8);
  }

  private createObjectColliders(): void {
    for (const tree of TREE_POSITIONS) {
      this.addTreeCollider(tree.x, tree.y);
    }
  }

  private addTreeCollider(x: number, y: number): void {
    this.addColliderBox(x - 18, y + 24, 36, 42);
  }

  private addColliderBox(x: number, y: number, width: number, height: number): void {
    const body = this.physics.add.staticBody(x, y, width, height);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  private buildExitSign(): void {
    // Tanda exit di zona yang bisa dijangkau player (H-80 area)
    const signY = H - 75;
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES);
    g.fillStyle(0x8b6b3d, 1);
    g.fillRoundedRect(W / 2 - 26, signY, 52, 14, 2);
    g.lineStyle(1, 0x5c3a1e, 1);
    g.strokeRoundedRect(W / 2 - 26, signY, 52, 14, 2);

    this.add.text(W / 2, signY + 7, '↓ Kota', {
      fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES + 1);
  }

  private buildZoneMarker(x: number, y: number, icon: string, label: string): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);
    g.fillStyle(0x66bb66, 0.1);
    g.fillCircle(x, y, 50);
    g.lineStyle(1, 0x66bb66, 0.4);
    g.strokeCircle(x, y, 50);

    const sg = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);
    sg.fillStyle(0x5c3a1e, 1);
    sg.fillRect(x - 2, y - 30, 4, 26);
    sg.fillStyle(0x8b6b3d, 1);
    sg.fillRoundedRect(x - 22, y - 44, 44, 14, 2);
    sg.lineStyle(1, 0x5c3a1e, 1);
    sg.strokeRoundedRect(x - 22, y - 44, 44, 14, 2);

    this.add.text(x, y - 37, label, {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);

    const iconTxt = this.add.text(x, y - 56, icon, { fontSize: '10px' })
      .setOrigin(0.5).setDepth(DEPTH.ENTITIES);
    this.tweens.add({ targets: iconTxt, y: y - 60, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private isOnMainPath(x: number, y: number, padding: number = 0): boolean {
    const onVertical = Math.abs(x - MAIN_PATH_X) < MAIN_PATH_HALF_W + padding && y < BOTTOM_PATH_Y + 16;
    const onBottom = y > BOTTOM_PATH_Y - 12 - padding;
    return onVertical || onBottom;
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
    this.utilityInteractions.destroy();
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
