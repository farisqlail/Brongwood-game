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

const W = GAME_CONFIG.WIDTH;
const H = GAME_CONFIG.HEIGHT;

export class GardenScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;
  private pauseMenu!: PauseMenuUI;
  private hud!: SceneHUD;
  private atmosphere!: SceneAtmosphere;
  private exiting = false;

  constructor() {
    super({ key: 'GardenScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, W, H);

    this.buildBackground();
    this.buildGardenBeds();
    this.buildTrees();
    this.buildExitSign();

    // Player masuk dari bawah (datang dari kota)
    // Spawn di y=220 agar tidak langsung menyentuh batas bawah
    this.player = new Player(this, W / 2, H - 80);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.centerOn(W / 2, H / 2);

    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);

    // Zona berkebun — di tengah kebun
    this.activityZoneUI.createZones(this.player.sprite, [{
      id: 'gardening',
      x: 170,
      y: 140,
      width: 140,
      height: 60,
    }]);

    this.buildZoneMarker(240, 165, '🌱', 'Berkebun');

    // E key
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => {
        if (this.activityZoneUI.isActivityActive) {
          this.activityZoneUI.cancelActivity();
        } else if (this.activityZoneUI.isInZone) {
          this.activityZoneUI.startActivity();
        }
      });

    EventBus.on('event:player-locked', (payload: { locked: boolean }) => {
      if (payload.locked) this.player.freeze();
      else this.player.unfreeze();
    }, this);

    this.mobileControls = new MobileControls(this);

    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'garden', W, H);
    this.atmosphere = new SceneAtmosphere(this);

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
        if (this.activityZoneUI.isActivityActive) this.activityZoneUI.cancelActivity();
        else if (this.activityZoneUI.isInZone) this.activityZoneUI.startActivity();
      }
    }

    this.player.update();
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

    // Langit pagi (kuning-biru)
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xd4f0ff, 0xd4f0ff, 1);
    g.fillRect(0, 0, W, 75);

    // Bukit jauh (hijau muda)
    g.fillStyle(0x6aab3e, 0.7);
    for (let x = -20; x < W + 20; x += 80) {
      g.fillCircle(x, 80, 55);
    }

    // Rumput taman (hijau cerah)
    g.fillGradientStyle(0x5a9e3a, 0x5a9e3a, 0x4a8c2e, 0x4a8c2e, 1);
    g.fillRect(0, 65, W, H - 65);

    // Jalur setapak (abu pasir)
    g.fillStyle(0xb8a880, 0.6);
    g.fillRect(W / 2 - 16, 65, 32, H - 65);
    g.fillRect(0, H - 60, W, 20);

    // Batu-batu jalur
    g.fillStyle(0xa09070, 0.4);
    for (let y = 80; y < H - 60; y += 16) {
      g.fillRect(W / 2 - 14, y, 12, 8);
      g.fillRect(W / 2 + 2,  y + 5, 12, 8);
    }

    // Awan
    const cloudG = this.add.graphics().setDepth(DEPTH.GROUND);
    cloudG.fillStyle(0xffffff, 0.9);
    this.drawCloud(cloudG, 70,  20, 45);
    this.drawCloud(cloudG, 380, 12, 38);
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    g.fillCircle(x,      y,     r * 0.55);
    g.fillCircle(x + r * 0.5,  y + 2, r * 0.48);
    g.fillCircle(x - r * 0.45, y + 4, r * 0.42);
    g.fillRect(x - r * 0.45, y, r * 1.0, r * 0.5);
  }

  private buildGardenBeds(): void {
    const beds = [
      { x: 60,  y: 130, w: 90, h: 55 },
      { x: 195, y: 130, w: 90, h: 55 },
      { x: 330, y: 130, w: 90, h: 55 },
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
    const treePositions = [
      { x: 30,  y: 90 },
      { x: 80,  y: 75 },
      { x: 400, y: 85 },
      { x: 450, y: 70 },
    ];

    for (const t of treePositions) {
      this.drawTree(t.x, t.y);
    }
  }

  private drawTree(x: number, y: number): void {
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);

    // Batang
    g.fillStyle(0x6b4c2a, 1);
    g.fillRect(x - 5, y + 30, 10, 40);

    // Mahkota 3 lapis
    g.fillStyle(0x2e7d1a, 1);
    g.fillTriangle(x - 30, y + 35, x, y - 5, x + 30, y + 35);
    g.fillStyle(0x3a9922, 1);
    g.fillTriangle(x - 24, y + 20, x, y - 20, x + 24, y + 20);
    g.fillStyle(0x4ab030, 1);
    g.fillTriangle(x - 18, y + 5, x, y - 35, x + 18, y + 5);
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
    EventBus.off('event:player-locked', undefined, this);
    this.mobileControls.destroy();
    this.activityZoneUI.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.atmosphere.destroy();
  }
}
