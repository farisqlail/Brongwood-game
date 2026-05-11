/**
 * FishingScene - Pantai / spot memancing.
 *
 * Dicapai dengan berjalan ke tepi KANAN peta downtown.
 * Keluar dengan berjalan kembali ke tepi KIRI (← kota).
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │               LANGIT (biru cerah)                       │  y: 0–90
 *   │ ·  ·  ·  · LAUT (biru dalam, garis ombak) · ·  ·      │  y: 90–185
 *   │  ████████████  DERMAGA  ████████████████████████        │  y: 170–210
 *   │ ██████████████████████  PANTAI PASIR  ████████████      │  y: 185–300
 *   │←Keluar                   [ZONA MANCING]                 │
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

const W = GAME_CONFIG.WIDTH;   // 480
const H = GAME_CONFIG.HEIGHT;  // 300

const HORIZON_Y = 85;          // langit bertemu air
const SHORE_Y   = 190;         // air bertemu pasir (water zone: 85-190 = 105px)

export class FishingScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;
  private pauseMenu!: PauseMenuUI;
  private hud!: SceneHUD;
  private atmosphere!: SceneAtmosphere;
  private nightSky!: Phaser.GameObjects.Graphics;
  private ownedAudioSystem: AudioSystem | null = null;
  private exiting = false;
  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  constructor() {
    super({ key: 'FishingScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.physics.world.setBounds(0, 0, W, H);

    this.buildBackground();
    this.buildDock();

    // Player masuk dari sisi kiri (di pantai, di atas pasir)
    this.player = new Player(this, 30, SHORE_Y + 45);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.centerOn(W / 2, H / 2);

    // Barrier air — mencegah player masuk ke air
    this.createWaterBarrier();

    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);

    // Zona memancing — di tepi pantai dekat dermaga (bisa dijangkau dari pasir)
    this.activityZoneUI.createZones(this.player.sprite, [{
      id: 'fishing',
      x: 260,
      y: SHORE_Y + 10,
      width: 160,
      height: 40,
    }]);

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

    // Freeze/unfreeze player saat activity berlangsung
    EventBus.on('event:player-locked', this.onPlayerLocked, this);

    this.mobileControls = new MobileControls(this);

    // Pause menu (ESC) — untuk save/load
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'fishing', W, H);
    this.atmosphere = new SceneAtmosphere(this, { lighting: 'morning_coastal' });
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake',     this.onWake,     this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.atmosphere.update(delta);
    this.nightSky.setAlpha(this.getNightAlpha());
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

    // Keluar kembali ke kota (tepi kiri)
    if (!this.exiting && this.player.sprite.x < 22) {
      this.doExit();
    }
  }

  // ============================================================
  // BACKGROUND — fully procedural water, tiles as sand texture
  // ============================================================

  private buildBackground(): void {
    this.buildSky();
    this.buildNightSky();
    this.buildWater();
    this.buildShore();
    this.buildSand();
  }

  // ── Langit ───────────────────────────────────────────────────
  private buildSky(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 5);
    // Gradient utama langit
    g.fillGradientStyle(0x6db8e0, 0x6db8e0, 0xc4e8f8, 0xc4e8f8, 1);
    g.fillRect(0, 0, W, HORIZON_Y + 6);

    // Haze horizon — bukan satu rect kotak, tapi beberapa strip tipis
    // dengan alpha menurun agar fade mulus ke biru langit
    const hazeColors: [number, number][] = [
      [0xdff0ff, 0.30],
      [0xcce8ff, 0.20],
      [0xbce0ff, 0.12],
      [0xb0d8ff, 0.07],
    ];
    for (let i = 0; i < hazeColors.length; i++) {
      const [col, a] = hazeColors[i];
      g.fillStyle(col, a);
      g.fillRect(0, HORIZON_Y - 10 + i * 4, W, 6);
    }

    this.buildClouds();
  }

  // ── Air — sepenuhnya procedural ──────────────────────────────
  private buildWater(): void {
    const WH = SHORE_Y - HORIZON_Y;   // 105 px

    // Base gradient (gelap di atas, terang di bawah dekat pantai)
    const base = this.add.graphics().setDepth(DEPTH.GROUND - 5);
    base.fillGradientStyle(0x0d2e62, 0x0d2e62, 0x2878b0, 0x2878b0, 1);
    base.fillRect(0, HORIZON_Y, W, WH);

    // Shallow band dekat pantai — fade bertahap (bukan satu rect kotak)
    // Strip tipis dengan alpha naik perlahan → tidak ada tepi keras
    const shallowSteps = 10;
    for (let i = 0; i < shallowSteps; i++) {
      const t  = i / (shallowSteps - 1);
      const sy = SHORE_Y - 28 + i * 3;
      base.fillStyle(0x48c0d8, t * t * 0.36); // alpha mulai dari ~0, naik quadratic
      base.fillRect(0, sy, W, 4);
    }

    // Gelombang — 9 band horizontal dengan bentuk sinus
    // Setiap band: warna sedikit berbeda, kecepatan dan fase berbeda
    const waveDefs = [
      { offsetY: 6,  h: 5,  col: 0x1a5a9a, a: 0.22, spd: 2200, dir:  1 },
      { offsetY: 16, h: 4,  col: 0x1060a0, a: 0.18, spd: 3100, dir: -1 },
      { offsetY: 27, h: 5,  col: 0x2070aa, a: 0.20, spd: 2700, dir:  1 },
      { offsetY: 38, h: 4,  col: 0x1858a0, a: 0.17, spd: 3600, dir: -1 },
      { offsetY: 49, h: 5,  col: 0x2878b0, a: 0.19, spd: 2400, dir:  1 },
      { offsetY: 60, h: 4,  col: 0x2272a8, a: 0.16, spd: 4000, dir: -1 },
      { offsetY: 70, h: 5,  col: 0x3080b8, a: 0.21, spd: 2900, dir:  1 },
      { offsetY: 80, h: 4,  col: 0x2a80b5, a: 0.18, spd: 3300, dir: -1 },
      { offsetY: 90, h: 6,  col: 0x38a0c8, a: 0.24, spd: 2600, dir:  1 },
    ];

    for (const w of waveDefs) {
      const wg = this.add.graphics().setDepth(DEPTH.GROUND - 4);
      const baseY = HORIZON_Y + w.offsetY;

      // Gambar satu band sinus
      wg.fillStyle(w.col, w.a);
      wg.beginPath();
      for (let x = 0; x <= W; x += 3) {
        // Dua frekuensi sinus digabung agar terlihat lebih organis
        const top = baseY + Math.sin(x * 0.035) * 4 + Math.sin(x * 0.09) * 2;
        if (x === 0) wg.moveTo(x, top);
        else         wg.lineTo(x, top);
      }
      wg.lineTo(W, baseY + w.h + 4);
      wg.lineTo(0, baseY + w.h + 4);
      wg.closePath();
      wg.fillPath();

      // Animasi geser naik-turun perlahan
      this.tweens.add({
        targets: wg,
        y: { from: 0, to: w.dir * 4 },
        duration: w.spd,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
        delay: w.offsetY * 18,
      });
    }

    // Kilap permukaan air (sparkles) — soft circles
    for (let i = 0; i < 28; i++) {
      const sx = Math.random() * W;
      const sy = HORIZON_Y + 4 + Math.random() * (WH - 12);
      const sg = this.add.graphics().setDepth(DEPTH.GROUND - 3);
      sg.fillStyle(0xd8f0ff, 1);
      sg.fillCircle(sx, sy, Math.random() < 0.5 ? 1.5 : 1);
      this.tweens.add({
        targets: sg,
        alpha: { from: 0.65, to: 0 },
        duration: 500 + Math.random() * 1500,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 3500,
      });
    }

  }

  // ── Garis pantai — buih ombak ────────────────────────────────
  private buildShore(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 2);

    // Wash utama — bentuk sinus
    g.fillStyle(0x90d0e8, 0.50);
    g.beginPath();
    g.moveTo(0, SHORE_Y + 10);
    for (let x = 0; x <= W; x += 4) {
      const wy = SHORE_Y - 3 + Math.sin(x * 0.050) * 5 + Math.sin(x * 0.115) * 2.5;
      g.lineTo(x, wy);
    }
    g.lineTo(W, SHORE_Y + 10);
    g.closePath();
    g.fillPath();

    // Wash kedua di belakang (lebih tipis, sedikit mundur)
    g.fillStyle(0x80c0d8, 0.25);
    g.beginPath();
    g.moveTo(0, SHORE_Y + 6);
    for (let x = 0; x <= W; x += 4) {
      const wy = SHORE_Y - 10 + Math.sin(x * 0.038 + 1.0) * 6 + Math.sin(x * 0.085) * 3;
      g.lineTo(x, wy);
    }
    g.lineTo(W, SHORE_Y + 6);
    g.closePath();
    g.fillPath();

    // Titik busa putih
    g.fillStyle(0xffffff, 0.75);
    for (let x = 4; x < W; x += 10 + Math.floor(Math.random() * 14)) {
      const fy = SHORE_Y - 2 + Math.sin(x * 0.050) * 5;
      g.fillCircle(x + Math.random() * 6, fy, 1 + Math.random() * 2);
    }
  }

  // ── Pasir — 100% procedural ──────────────────────────────────
  private buildSand(): void {
    const SAND_H = H - SHORE_Y;

    // ── 1. Base — zona kering (atas) ke lebih kering (bawah) ─
    const bg = this.add.graphics().setDepth(DEPTH.GROUND - 5);
    bg.fillGradientStyle(0xc8a858, 0xc8a858, 0xe0c070, 0xe0c070, 1);
    bg.fillRect(0, SHORE_Y, W, SAND_H);

    // ── 2. Zona basah dekat air — lebih gelap, kecoklatan ─────
    // Gradient dari coklat gelap di SHORE_Y ke warna pasir normal
    bg.fillGradientStyle(0x6a5830, 0x6a5830, 0xb09050, 0xb09050, 1);
    bg.fillRect(0, SHORE_Y, W, 22);
    // Kilas air — highlight refleksi tipis tepat di garis pantai
    bg.fillStyle(0xb8d8e8, 0.22);
    bg.fillRect(0, SHORE_Y, W, 8);

    // ── 3. Variasi warna pasir — ellips overlap rendah alpha ──
    // Membuat pasir terasa tidak seragam (wet pocket, shadow, dll.)
    const sandPalette = [
      0x6a5030, // gelap basah
      0x8a7040, // sedang
      0xa88850, // tengah
      0xd0a860, // kering
      0xe8c878, // sangat kering / cerah
      0xb89860, // bayangan
    ];
    const vg = this.add.graphics().setDepth(DEPTH.GROUND - 4);
    for (let i = 0; i < 36; i++) {
      const ex  = (Math.random() - 0.1) * (W + 40);
      const ey  = SHORE_Y + Math.random() * SAND_H;
      const ew  = 28 + Math.random() * 90;
      const eh  = 8  + Math.random() * 28;
      const col = sandPalette[Math.floor(Math.random() * sandPalette.length)];
      vg.fillStyle(col, 0.07 + Math.random() * 0.13);
      vg.fillEllipse(ex, ey, ew, eh);
    }

    // ── 4. Ripple marks — bekas ombak (garis sinus horizontal) ─
    const rg = this.add.graphics().setDepth(DEPTH.GROUND - 4);
    let ry = SHORE_Y + 14;
    while (ry < H - 3) {
      // Dua frekuensi sinus berbeda → garis tidak teratur
      const freq1 = 0.042 + Math.random() * 0.030;
      const freq2 = 0.095 + Math.random() * 0.040;
      const amp1  = 1.5  + Math.random() * 2.0;
      const amp2  = 0.6  + Math.random() * 1.2;
      const phase = Math.random() * Math.PI * 2;
      const col   = Math.random() < 0.5 ? 0x8a6428 : 0xb88e48;
      const alpha = 0.06 + Math.random() * 0.10;

      rg.lineStyle(1, col, alpha);
      rg.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = ry + Math.sin(x * freq1 + phase) * amp1
                     + Math.sin(x * freq2 + phase * 1.3) * amp2;
        if (x === 0) rg.moveTo(x, y);
        else         rg.lineTo(x, y);
      }
      rg.strokePath();

      ry += 4 + Math.floor(Math.random() * 5);
    }

    // ── 5. Butir pasir — titik 1px tersebar ──────────────────
    const dg = this.add.graphics().setDepth(DEPTH.GROUND - 3);
    for (let i = 0; i < 380; i++) {
      const gx    = Math.random() * W;
      const gy    = SHORE_Y + Math.random() * SAND_H;
      const rnd   = Math.random();
      const col   = rnd < 0.35 ? 0x7a5828
                  : rnd < 0.65 ? 0xa88040
                  : rnd < 0.85 ? 0xcc9850
                  :               0xe8c070;
      dg.fillStyle(col, 0.18 + Math.random() * 0.22);
      dg.fillRect(gx, gy, 1, 1);
    }

    // ── 6. Bekas buih kering — ellips putih di zona basah ────
    // Terlihat seperti foam yang sudah mengering di pasir
    const fg = this.add.graphics().setDepth(DEPTH.GROUND - 3);
    fg.fillStyle(0xeeeedd, 0.32);
    const foamMarks = [
      { x: 30,  y: SHORE_Y +  7, w: 28, h: 4 },
      { x: 100, y: SHORE_Y +  4, w: 42, h: 3 },
      { x: 200, y: SHORE_Y +  9, w: 30, h: 4 },
      { x: 312, y: SHORE_Y +  5, w: 50, h: 3 },
      { x: 428, y: SHORE_Y +  8, w: 32, h: 4 },
      { x: 55,  y: SHORE_Y + 19, w: 20, h: 3 },
      { x: 178, y: SHORE_Y + 22, w: 36, h: 3 },
      { x: 375, y: SHORE_Y + 17, w: 26, h: 3 },
      { x: 455, y: SHORE_Y + 24, w: 18, h: 2 },
    ];
    for (const f of foamMarks) {
      fg.fillEllipse(f.x, f.y, f.w, f.h);
    }
  }

  private buildClouds(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 4);

    // Awan putih — hanya circles, tanpa shadow
    g.fillStyle(0xffffff, 0.90);
    this.drawCloud(g, 68,  14, 44);
    this.drawCloud(g, 246, 6,  36);
    this.drawCloud(g, 416, 19, 30);
  }

  // ── Langit malam — ditampilkan saat evening/night/late_night ─
  // Depth GROUND-3.5 → di atas clouds (GROUND-4), hanya menggambar area langit
  // sehingga awan siang tersembunyi, tapi air/pasir tidak terpengaruh
  private buildNightSky(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND - 3.5);
    this.nightSky = g;

    // Langit gelap — gradient biru-hitam menutupi langit siang
    g.fillGradientStyle(0x05081a, 0x05081a, 0x0e1838, 0x0e1838, 1);
    g.fillRect(0, 0, W, HORIZON_Y + 6);

    // Bintang — distribusi golden ratio agar merata dan tidak berulang
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 48; i++) {
      const sx = ((i * 137.508) % 1) * W;
      const sy = ((i *  73.137) % 1) * (HORIZON_Y - 6);
      const sr = i % 7 === 0 ? 1.5 : 1;
      g.fillCircle(sx, sy, sr);
    }

    // Bintang kecil redup
    g.fillStyle(0xaabbdd, 1);
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 211.34) % 1) * W;
      const sy = ((i *  98.61) % 1) * (HORIZON_Y - 6);
      g.fillCircle(sx, sy, 0.8);
    }

    // Bulan — pojok kanan atas langit
    const mx = W * 0.80;
    const my = HORIZON_Y * 0.30;
    const mr = 13;

    // Halo rembulan (cahaya lembut)
    g.fillStyle(0xfff8cc, 0.10);
    g.fillCircle(mx, my, mr * 3.0);
    g.fillStyle(0xfff8cc, 0.18);
    g.fillCircle(mx, my, mr * 1.8);

    // Piringan bulan
    g.fillStyle(0xfff5d0, 1);
    g.fillCircle(mx, my, mr);

    // Bayangan sabit bulan (crescent) — warna cocok dengan langit malam
    g.fillStyle(0x0e1838, 1);
    g.fillCircle(mx - mr * 0.38, my - mr * 0.08, mr * 0.84);

    // Set alpha awal sesuai waktu sekarang
    g.setAlpha(this.getNightAlpha());
  }

  /** Alpha layer malam berdasarkan periode waktu (0 = siang terang, 1 = malam penuh). */
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

  /**
   * Awan hanya dari lingkaran-lingkaran — tidak ada persegi.
   * Beberapa circle kecil mengisi celah di bagian bawah.
   */
  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
    // Puncak
    g.fillCircle(x,              y,     r * 0.60);
    g.fillCircle(x + r * 0.52,  y + 3, r * 0.50);
    g.fillCircle(x - r * 0.48,  y + 5, r * 0.45);
    // Isi tengah agar tidak ada celah
    g.fillCircle(x + r * 0.18,  y + 6, r * 0.44);
    g.fillCircle(x - r * 0.16,  y + 7, r * 0.40);
    // Bagian bawah mengisi rata
    g.fillCircle(x + r * 0.38,  y + 9, r * 0.36);
    g.fillCircle(x - r * 0.32,  y + 9, r * 0.34);
    g.fillCircle(x,              y + 9, r * 0.38);
  }

  private buildDock(): void {
    const dockX = 240;
    const dockY = SHORE_Y - 15;
    const bridgeY = dockY + 13;

    const pieces = [
      { key: 'land-bridge-small-left', x: dockX + 16 },
      { key: 'land-bridge-small', x: dockX + 44 },
      { key: 'land-bridge-small', x: dockX + 68 },
      { key: 'land-bridge-small', x: dockX + 92 },
      { key: 'land-bridge-small', x: dockX + 116 },
      { key: 'land-bridge-small', x: dockX + 140 },
      { key: 'land-bridge-small-right', x: dockX + 167 },
    ];

    for (const piece of pieces) {
      this.add
        .image(piece.x, bridgeY, piece.key)
        .setDepth(DEPTH.GROUND_DECOR + 1);
    }
  }

  private buildExitSign(): void {
    // Sign ditempatkan di area pasir, sisi kiri
    const signY = SHORE_Y + 28;
    const g = this.add.graphics().setDepth(DEPTH.ENTITIES);

    g.fillStyle(0x8b6b3d, 1);
    g.fillRoundedRect(4, signY, 44, 16, 2);
    g.lineStyle(1, 0x5c3a1e, 1);
    g.strokeRoundedRect(4, signY, 44, 16, 2);

    this.add.text(26, signY + 8, '← Kota', {
      fontSize: '5px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES + 1);

    // Tiang
    g.fillStyle(0x5c3a1e, 1);
    g.fillRect(24, signY + 16, 3, 20);
  }

  // ── Physics barrier — dinding tak kasat mata di garis pantai ──
  private createWaterBarrier(): void {
    // Static body menutupi seluruh area air (y: 0 → SHORE_Y).
    // Ketika player bergerak ke atas, body kaki mereka (sprite.y + 28)
    // akan menabrak batas bawah static body ini dan terhenti di SHORE_Y.
    const waterWall = this.physics.add.staticBody(0, 0, W, SHORE_Y);
    this.physics.add.collider(
      this.player.sprite,
      waterWall as unknown as Phaser.Physics.Arcade.StaticBody,
    );
  }

  private buildZoneMarker(x: number, y: number, icon: string, label: string): void {
    // Lingkaran glow zona
    const g = this.add.graphics().setDepth(DEPTH.GROUND_DECOR);
    g.fillStyle(0xf2a65a, 0.08);
    g.fillCircle(x, y, 40);
    g.lineStyle(1, 0xf2a65a, 0.35);
    g.strokeCircle(x, y, 40);

    // Tiang + papan tanda
    const sg = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);
    sg.fillStyle(0x5c3a1e, 1);
    sg.fillRect(x - 2, y - 30, 4, 26);
    sg.fillStyle(0x8b6b3d, 1);
    sg.fillRoundedRect(x - 20, y - 44, 40, 14, 2);
    sg.lineStyle(1, 0x5c3a1e, 1);
    sg.strokeRoundedRect(x - 20, y - 44, 40, 14, 2);

    this.add.text(x, y - 37, label, {
      fontSize: '6px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);

    const iconTxt = this.add.text(x, y - 54, icon, {
      fontSize: '10px',
    }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);

    this.tweens.add({ targets: iconTxt, y: y - 58, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
