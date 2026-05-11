/**
 * HouseInteriorScene — Interior rumah dengan layout dua zona:
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │      [GENTENG_1 — atap memanjang penuh lebar ruangan]       │  y: 0–85
 *  │  [TEMBOK][JENDELA][TEMBOK][JENDELA][TEMBOK]                 │  y: 85–155
 *  ├──────────────────────────┬──────────────────────────────────┤
 *  │   KAMAR TIDUR (kiri)     │   RUANG TAMU (kanan)            │
 *  │  [KASUR]  [LEMARI_BUKU]  │  [LEMARI/WARDROBE]  [BUFFET]   │  y: 155–310
 *  │                          │  [MEJA_H]  [BANGKU_SEMEN]       │
 *  │  [BUNGA]                 │  [BANGKU_TAMAN]                 │
 *  │  [TANAMAN]               │               [TANAMAN]         │  y: 310–355
 *  │            [PINTU_LORONG_2 — EXIT]                         │  y: 355–384
 *  └──────────────────────────┴──────────────────────────────────┘
 *
 * Asset dimensions (original px):
 *   genteng_1            224×156   genteng_horizontal_1  96×83
 *   genteng_kayu_tengah  24×83     tembok_kayu_1         138×72
 *   jendela_kaca_1       51×54     pintu_kayu_1          30×53
 *   pintu_lorong_1       45×62     pintu_lorong_2        48×84
 *   kasur_1              48×81     lemari_buku_1         48×69
 *   buffet_1             72×35     meja_kayu_horizontal  72×45
 *   meja_kayu_vertical   39×69     bangku_taman          87×48
 *   bangku_semen_1       45×18     tanaman_1             42×26
 *   tempat_bunga_kayu    42×17
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { Player } from '@/entities/Player';
import { MobileControls } from '@/ui/MobileControls';
import { SceneHUD } from '@/ui/SceneHUD';
import { SceneAtmosphere } from '@/systems/SceneAtmosphere';
import { gameManager } from '@/managers/GameManager';
import { AudioSystem } from '@/systems/AudioSystem';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { proceduralAudio } from '@/audio/ProceduralAudio';

// ─── Room dimensions ──────────────────────────────────────────
const ROOM_W = 480;
const ROOM_H = 384;

// Y di mana lantai mulai (bawah tembok)
const WALL_BOTTOM_Y = 155;

// Scale dasar untuk furnitur besar (2×)
const OBJ_SCALE = 2;

// Gap pintu di bawah (player keluar di sini)
const DOOR_GAP_X1 = 192;
const DOOR_GAP_X2 = 288;

export class HouseInteriorScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private hud!: SceneHUD;
  private pauseMenu!: PauseMenuUI;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private exiting = false;

  constructor() {
    super({ key: 'HouseInteriorScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.buildRoof();
    this.buildWalls();
    this.buildBedroom();
    this.buildLivingRoom();
    this.buildDecorations();
    this.buildDoor();

    // Pemain spawn di depan pintu
    this.player = new Player(this, ROOM_W / 2, ROOM_H - 48);
    this.player.sprite.setCollideWorldBounds(false);

    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.centerOn(ROOM_W / 2, ROOM_H / 2);

    this.createColliders();

    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.pauseMenu.toggle());

    this.hud = new SceneHUD(this, 'house_interior', ROOM_W, ROOM_H);
    this.atmosphere = new SceneAtmosphere(this, { weather: false, lighting: 'flower_shop' });
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);
    proceduralAudio.stopRain();

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
    }
    this.player.update();

    if (!this.exiting && this.player.sprite.y > ROOM_H - 14) {
      this.doExit();
    }
  }

  // ============================================================
  // ROOM BUILDING
  // ============================================================

  /** Lantai — dua warna untuk membagi kamar tidur dan ruang tamu */
  private buildBackground(): void {
    // Kamar tidur (kiri) — coklat tua hangat
    const floorLeft = this.add.rectangle(0, WALL_BOTTOM_Y, ROOM_W / 2, ROOM_H - WALL_BOTTOM_Y, 0x6b4c2a);
    floorLeft.setOrigin(0, 0).setDepth(DEPTH.GROUND - 1);

    // Ruang tamu (kanan) — coklat sedikit lebih terang
    const floorRight = this.add.rectangle(ROOM_W / 2, WALL_BOTTOM_Y, ROOM_W / 2, ROOM_H - WALL_BOTTOM_Y, 0x7a5938);
    floorRight.setOrigin(0, 0).setDepth(DEPTH.GROUND - 1);

    // Garis papan lantai horizontal
    for (let y = WALL_BOTTOM_Y; y < ROOM_H; y += 28) {
      const line = this.add.rectangle(0, y, ROOM_W, 1, 0x3d2610);
      line.setOrigin(0, 0).setDepth(DEPTH.GROUND).setAlpha(0.25);
    }

    // Pembatas visual dua zona (garis vertikal tipis)
    const divider = this.add.rectangle(ROOM_W / 2, WALL_BOTTOM_Y, 2, ROOM_H - WALL_BOTTOM_Y, 0x2a1a0a);
    divider.setOrigin(0.5, 0).setDepth(DEPTH.GROUND).setAlpha(0.3);

    // Atap/langit-langit gelap di atas tembok
    const ceiling = this.add.rectangle(0, 0, ROOM_W, WALL_BOTTOM_Y - 40, 0x1a120a);
    ceiling.setOrigin(0, 0).setDepth(DEPTH.GROUND - 1);
  }

  /** Atap — genteng_1 direntangkan penuh lebar + tepi horizontal */
  private buildRoof(): void {
    // Genteng utama (ridge V-shape) — direntangkan ke 480px
    const ridgeScale = ROOM_W / 224;
    this.placeObj(ROOM_W / 2, 38, 'house2-genteng', DEPTH.GROUND, ridgeScale);

    // Tepi kiri atap
    this.placeObj(48, 70, 'house2-genteng-horizontal', DEPTH.GROUND + 1, 1.0);

    // Pusat atap (strip kayu tengah)
    this.placeObj(ROOM_W / 2, 70, 'house2-genteng-kayu-tengah', DEPTH.GROUND + 1, 1.0);

    // Tepi kanan atap (flip horizontal)
    const roofRight = this.add.image(ROOM_W - 48, 70, 'house2-genteng-horizontal');
    roofRight.setScale(1.0).setFlipX(true).setDepth(DEPTH.GROUND + 1);
  }

  /**
   * Tembok belakang — susunan [TEMBOK][JENDELA][TEMBOK][JENDELA][TEMBOK]
   *
   * wallScale=0.95 → tembok=131px, jendela=48px
   * Total: 3×131 + 2×48 = 393+96 = 489 ≈ 480px ✓
   */
  private buildWalls(): void {
    const wallScale = 0.95;
    const wallY = 108;

    // Lebar masing-masing elemen di scale 0.95
    const tw = Math.round(138 * wallScale); // 131px
    const jw = Math.round(51 * wallScale);  // 48px

    // Posisi center: [tembok][jendela][tembok][jendela][tembok]
    const t1x = tw / 2;                       // ~65.5
    const j1x = tw + jw / 2;                  // ~155
    const t2x = tw + jw + tw / 2;             // ~248.5
    const j2x = tw + jw + tw + jw / 2;        // ~338.5
    const t3x = tw + jw + tw + jw + tw / 2;   // ~430

    this.placeObj(t1x, wallY, 'house2-tembok-kayu', DEPTH.GROUND + 1, wallScale);
    this.placeObj(j1x, wallY, 'house2-jendela-kaca', DEPTH.GROUND + 2, wallScale);
    this.placeObj(t2x, wallY, 'house2-tembok-kayu', DEPTH.GROUND + 1, wallScale);
    this.placeObj(j2x, wallY, 'house2-jendela-kaca', DEPTH.GROUND + 2, wallScale);
    this.placeObj(t3x, wallY, 'house2-tembok-kayu', DEPTH.GROUND + 1, wallScale);
  }

  // ============================================================
  // KAMAR TIDUR (sisi kiri, x: 0–240)
  // ============================================================

  private buildBedroom(): void {
    // Kasur — menempel ke tembok kiri-atas
    // kasur_1 di 2×: 96×162. center_x=55, top y=155 → center_y=236
    this.placeObj(55, 236, 'house2-kasur', DEPTH.ENTITIES, OBJ_SCALE);

    // Lemari buku — di sebelah kanan kasur, menempel tembok atas
    // lemari_buku di 2×: 96×138. center_y=155+69=224
    this.placeObj(160, 224, 'house2-lemari-buku', DEPTH.ENTITIES, OBJ_SCALE);

    // Pot bunga kecil — di samping lemari, di lantai
    this.placeObj(160, 305, 'house2-tempat-bunga', DEPTH.ENTITIES, OBJ_SCALE);

    // Label zona (debug visual, teks kecil)
    this.add.text(10, WALL_BOTTOM_Y + 2, 'Kamar Tidur', {
      fontSize: '5px', color: '#c8a06a', fontFamily: 'monospace', alpha: 0.6,
    }).setDepth(DEPTH.GROUND + 1);
  }

  // ============================================================
  // RUANG TAMU (sisi kanan, x: 240–480)
  // ============================================================

  private buildLivingRoom(): void {
    // Wardrobe/lemari pakaian — sudut kiri-atas ruang tamu
    // meja_kayu_vertical di 2×: 78×138. center_y=155+69=224
    this.placeObj(268, 224, 'house2-meja-vertical', DEPTH.ENTITIES, OBJ_SCALE);

    // Buffet — menempel ke tembok kanan-atas
    // buffet di 2×: 144×70. center_y=155+35=190
    this.placeObj(408, 190, 'house2-buffet', DEPTH.ENTITIES, OBJ_SCALE);

    // Meja makan horizontal — tengah ruang tamu
    // meja di 2×: 144×90. center=(370, 265)
    this.placeObj(370, 265, 'house2-meja-horizontal', DEPTH.ENTITIES, OBJ_SCALE);

    // Bangku semen — di atas meja (sisi belakang)
    // bangku_semen di 2×: 90×36. Tepat di atas meja: y=265-45-18=202
    this.placeObj(370, 213, 'house2-bangku-semen', DEPTH.ENTITIES, OBJ_SCALE);

    // Bangku taman — di depan meja (sisi depan)
    // bangku_taman di 2×: 174×96. y=265+45+48=358 → terlalu rendah, gunakan y=335
    this.placeObj(355, 332, 'house2-bangku-taman', DEPTH.ENTITIES, OBJ_SCALE);

    this.add.text(ROOM_W / 2 + 10, WALL_BOTTOM_Y + 2, 'Ruang Tamu', {
      fontSize: '5px', color: '#c8a06a', fontFamily: 'monospace', alpha: 0.6,
    }).setDepth(DEPTH.GROUND + 1);
  }

  // ============================================================
  // DEKORASI
  // ============================================================

  private buildDecorations(): void {
    // Tanaman pojok kiri
    this.placeObj(28, 322, 'house2-tanaman', DEPTH.ENTITIES, OBJ_SCALE);

    // Tanaman pojok kanan
    const plantRight = this.add.image(460, 322, 'house2-tanaman');
    plantRight.setScale(OBJ_SCALE).setFlipX(true).setDepth(DEPTH.ENTITIES);

    // Pot bunga dekoratif di sudut — kiri dekat pintu
    this.placeObj(70, 355, 'house2-tempat-bunga', DEPTH.ENTITIES, OBJ_SCALE);

    // Pot bunga kanan dekat pintu
    const potRight = this.add.image(415, 355, 'house2-tempat-bunga');
    potRight.setScale(OBJ_SCALE).setFlipX(true).setDepth(DEPTH.ENTITIES);

    // Tanaman tambahan — sebelah lemari buku
    this.placeObj(215, 175, 'house2-tanaman', DEPTH.ENTITIES, 1.2);
  }

  // ============================================================
  // PINTU EXIT
  // ============================================================

  private buildDoor(): void {
    // Kusen lorong besar (arch) — tengah bawah
    // pintu_lorong_2 di 2×: 96×168. center_x=240, center_y=370 (bawah)
    this.placeObj(ROOM_W / 2, 362, 'house2-pintu-lorong-2', DEPTH.GROUND_DECOR, OBJ_SCALE);
  }

  // ============================================================
  // COLLIDERS
  // ============================================================

  private createColliders(): void {
    const thick = 6;

    // Tembok atas (player tidak bisa masuk area tembok/atap)
    const top = this.physics.add.staticBody(0, WALL_BOTTOM_Y, ROOM_W, thick);
    this.physics.add.collider(this.player.sprite, top as unknown as Phaser.Physics.Arcade.StaticBody);

    // Tepi kiri
    const left = this.physics.add.staticBody(-thick, 0, thick, ROOM_H);
    this.physics.add.collider(this.player.sprite, left as unknown as Phaser.Physics.Arcade.StaticBody);

    // Tepi kanan
    const right = this.physics.add.staticBody(ROOM_W, 0, thick, ROOM_H);
    this.physics.add.collider(this.player.sprite, right as unknown as Phaser.Physics.Arcade.StaticBody);

    // Tepi bawah — dengan gap untuk pintu tengah
    const botL = this.physics.add.staticBody(0, ROOM_H, DOOR_GAP_X1, thick);
    this.physics.add.collider(this.player.sprite, botL as unknown as Phaser.Physics.Arcade.StaticBody);
    const botR = this.physics.add.staticBody(DOOR_GAP_X2, ROOM_H, ROOM_W - DOOR_GAP_X2, thick);
    this.physics.add.collider(this.player.sprite, botR as unknown as Phaser.Physics.Arcade.StaticBody);

    // ─── Furnitur colliders (x, y, w, h) ─────────────────────
    // Kasur (2×): center=(55,236), size=96×162
    this.addBox(55 - 48, 236 - 81, 96, 162);

    // Lemari buku (2×): center=(160,224), size=96×138
    this.addBox(160 - 48, 224 - 69, 96, 138);

    // Wardrobe/meja_vertical (2×): center=(268,224), size=78×138
    this.addBox(268 - 39, 224 - 69, 78, 138);

    // Buffet (2×): center=(408,190), size=144×70
    this.addBox(408 - 72, 190 - 35, 144, 70);

    // Meja makan (2×): center=(370,265), size=144×90
    this.addBox(370 - 72, 265 - 45, 144, 90);

    // Bangku taman (2×): center=(355,332), size=174×96
    this.addBox(355 - 87, 332 - 48, 174, 96);
  }

  private addBox(x: number, y: number, w: number, h: number): void {
    const body = this.physics.add.staticBody(x, y, w, h);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private placeObj(x: number, y: number, key: string, depth: number, scale: number): void {
    this.add.image(x, y, key).setScale(scale).setDepth(depth);
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
    proceduralAudio.stopRain();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    this.mobileControls.destroy();
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
