/**
 * CafeScene - Interior of the town cafe.
 * Simple scene: player can walk around, talk to barista, and exit.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { Player } from '@/entities/Player';
import { NPC } from '@/entities/NPC';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { gameManager } from '@/managers/GameManager';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';
import { ITEM_DEFS } from '@/types/inventory';
import { CinematicLightingSystem } from '@/systems/CinematicLightingSystem';
import { formatRupiah } from '@config/economy.config';
import { InputGuard } from '@/ui/InputGuard';

const CAFE_W = 640; // pixels
const CAFE_H = 400; // pixels

const CAFE_TABLES = [
  { x: 170, y: 236, key: 'house2-meja-horizontal', scale: 1.15, collider: { w: 92, h: 44 } },
  { x: 470, y: 236, key: 'house2-meja-horizontal', scale: 1.15, collider: { w: 92, h: 44 } },
  { x: 92,  y: 154, key: 'house2-meja-vertical',   scale: 0.85, collider: { w: 36, h: 72 } },
  { x: 548, y: 154, key: 'house2-meja-vertical',   scale: 0.85, collider: { w: 36, h: 72 } },
] as const;

const CAFE_PRODUCTS = [
  { id: 'coffee', label: 'Kopi', price: 12000 },
  { id: 'cake', label: 'Cake Slice', price: 18000 },
  { id: 'nasi_campur', label: 'Nasi Campur', price: 28000 },
] as const;

export class CafeScene extends Phaser.Scene {
  private player!: Player;
  private barista!: NPC;
  private mobileControls!: MobileControls;
  private promptText!: Phaser.GameObjects.Text;
  private nearbyNPC: NPC | null = null;
  private lighting!: CinematicLightingSystem;
  private exiting: boolean = false;
  private productMenuOpen: boolean = false;
  private productBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private productObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'CafeScene' });
  }

  create(): void {
    this.exiting = false;

    this.buildInterior();
    this.lighting = new CinematicLightingSystem(this, 'flower_shop');

    // Player (no world bounds — free to walk to exit)
    this.player = new Player(this, CAFE_W / 2, CAFE_H - 80);
    this.player.sprite.setCollideWorldBounds(false);

    // Wall colliders (top, left, right only — bottom is open for exit)
    const wallTop = this.physics.add.staticBody(0, 0, CAFE_W, 40);
    const wallLeft = this.physics.add.staticBody(0, 0, 40, CAFE_H);
    const wallRight = this.physics.add.staticBody(CAFE_W - 40, 0, 40, CAFE_H);
    const counterBody = this.physics.add.staticBody(CAFE_W / 2 - 156, 82, 312, 44);

    this.physics.add.collider(this.player.sprite, wallTop as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, wallLeft as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, wallRight as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, counterBody as unknown as Phaser.Physics.Arcade.StaticBody);
    this.createTableColliders();

    // Barista
    this.barista = new NPC(this, {
      id: 'barista',
      textureKey: TEXTURE_KEYS.NPC_BAKER,
      x: CAFE_W / 2,
      y: 70,
      direction: 'down',
      interactionRadius: 50,
    });

    // Camera
    this.cameras.main.setBounds(0, 0, CAFE_W, CAFE_H);
    this.cameras.main.centerOn(CAFE_W / 2, CAFE_H / 2);

    // Interaction (E key)
    const eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    eKey.on('down', () => this.tryInteract());

    // Prompt
    this.promptText = this.add.text(CAFE_W / 2, CAFE_H - 50, '[E] Beli', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI).setVisible(false);

    // Mobile
    this.mobileControls = new MobileControls(this);

    // Stop outdoor audio
    proceduralAudio.stopBirds();
    proceduralAudio.stopWind();
    proceduralAudio.stopRain();

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.events.on('shutdown', () => {
      this.closeProductPopup(false);
      this.barista.destroy();
      this.mobileControls.destroy();
      this.lighting.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.exiting) return;
    this.lighting.update(delta);

    if (this.productMenuOpen) {
      this.player.sprite.setVelocity(0, 0);
      this.promptText.setVisible(false);
      return;
    }

    // Mobile joystick
    if (this.mobileControls.visible && !this.productMenuOpen) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.tryInteract();
    }

    this.player.update();
    this.barista.update(delta);

    // Proximity check
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.barista.sprite.x, this.barista.sprite.y
    );
    this.nearbyNPC = dist < 60 ? this.barista : null;
    this.promptText.setText('[E] Beli');
    this.promptText.setVisible(this.nearbyNPC !== null);

    // EXIT: if player walks past bottom edge
    if (this.player.y > CAFE_H - 10) {
      this.doExit();
    }
  }

  private tryInteract(): void {
    if (this.nearbyNPC && !this.productMenuOpen) {
      proceduralAudio.playClick();
      this.barista.freeze();
      this.barista.faceToward(this.player.x, this.player.y);
      this.openProductPopup();
      this.promptText.setVisible(false);
    }
  }

  private buildInterior(): void {
    this.add.rectangle(CAFE_W / 2, CAFE_H / 2, CAFE_W, CAFE_H, 0x5a4030).setDepth(DEPTH.GROUND);

    // Warm wooden floor planks.
    for (let y = 40; y < CAFE_H; y += 18) {
      this.add.rectangle(CAFE_W / 2, y, CAFE_W, 1, 0x3a2618, 0.24).setDepth(DEPTH.GROUND);
    }
    for (let x = 48; x < CAFE_W - 48; x += 52) {
      this.add.rectangle(x, CAFE_H / 2, 1, CAFE_H - 56, 0x6a5040, 0.18).setDepth(DEPTH.GROUND);
    }

    // Soft rugs / worn floor patches.
    const floorG = this.add.graphics().setDepth(DEPTH.GROUND);
    const patches = [
      { x: 160, y: 240, w: 132, h: 78, c: 0x70443a },
      { x: 470, y: 240, w: 132, h: 78, c: 0x70443a },
      { x: 320, y: 318, w: 170, h: 34, c: 0x3d3026 },
    ];
    for (const p of patches) {
      floorG.fillStyle(p.c, 0.24);
      floorG.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 6);
    }

    // Walls and trim.
    this.add.rectangle(CAFE_W / 2, 16, CAFE_W, 32, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(16, CAFE_H / 2, 32, CAFE_H, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(CAFE_W - 16, CAFE_H / 2, 32, CAFE_H, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(CAFE_W / 2, 42, CAFE_W - 64, 5, 0x7a5838).setDepth(DEPTH.GROUND_DECOR + 1);

    // Windows and wall decor.
    for (const x of [120, 520]) {
      this.add.rectangle(x, 29, 54, 20, 0x203858).setDepth(DEPTH.GROUND_DECOR + 2);
      this.add.rectangle(x, 29, 48, 14, 0x5fa8c8, 0.45).setDepth(DEPTH.GROUND_DECOR + 3);
      this.add.rectangle(x, 29, 2, 18, 0xe0c08a).setDepth(DEPTH.GROUND_DECOR + 4);
      this.add.rectangle(x, 29, 54, 2, 0xe0c08a).setDepth(DEPTH.GROUND_DECOR + 4);
    }

    this.add.rectangle(320, 31, 92, 18, 0x4a3020).setDepth(DEPTH.GROUND_DECOR + 2);
    this.add.text(320, 31, 'BRONGWOOD CAFE', {
      fontSize: '7px', color: '#f2a65a', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.GROUND_DECOR + 3);

    // Barista counter uses the wooden table object from the house tilemap.
    for (let i = 0; i < 4; i++) {
      const counter = this.add.image(206 + i * 76, 101, 'house2-meja-horizontal');
      counter.setScale(1.06);
      counter.setDepth(DEPTH.ENTITIES);
    }
    for (let x = 205; x <= 435; x += 46) {
      this.add.rectangle(x, 76, 24, 8, 0x2d2018).setDepth(DEPTH.GROUND_DECOR + 2);
      this.add.rectangle(x - 5, 70, 6, 8, 0xf0d0a0).setDepth(DEPTH.GROUND_DECOR + 3);
      this.add.rectangle(x + 5, 70, 6, 8, 0xd8e0e0).setDepth(DEPTH.GROUND_DECOR + 3);
    }

    // Tables from house tilemap assets.
    for (const table of CAFE_TABLES) {
      const img = this.add.image(table.x, table.y, table.key);
      img.setScale(table.scale);
      img.setDepth(table.y);
      this.addTableDetails(table.x, table.y);
      this.addTableChairs(table.x, table.y, table.key === 'house2-meja-horizontal');
    }
  }

  private addTableDetails(x: number, y: number): void {
    const g = this.add.graphics().setDepth(y + 1);

    // Cups/plates on top.
    g.fillStyle(0xf0e0c0, 0.95);
    g.fillCircle(x - 10, y - 7, 4);
    g.fillCircle(x + 11, y + 5, 4);
    g.fillStyle(0x7c3f2c, 0.9);
    g.fillCircle(x - 10, y - 7, 2);
  }

  private addTableChairs(x: number, y: number, horizontal: boolean): void {
    if (horizontal) {
      this.placeChair(x - 62, y - 6, 'utility-kursi-vertical', 0.9);
      this.placeChair(x + 62, y - 6, 'utility-kursi-vertical', 0.9);
      this.placeChair(x, y + 42, 'utility-kursi-horizontal', 0.9);
    } else {
      this.placeChair(x - 34, y - 22, 'utility-kursi-vertical', 0.82);
      this.placeChair(x + 34, y + 22, 'utility-kursi-vertical', 0.82);
    }
  }

  private placeChair(x: number, y: number, key: string, scale: number): void {
    const chair = this.add.image(x, y, key);
    chair.setScale(scale);
    chair.setDepth(y - 2);
  }

  private createTableColliders(): void {
    for (const table of CAFE_TABLES) {
      const x = table.x - table.collider.w / 2;
      const y = table.y - table.collider.h / 2;
      const body = this.physics.add.staticBody(x, y, table.collider.w, table.collider.h);
      this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);

      const horizontal = table.key === 'house2-meja-horizontal';
      const chairs = horizontal
        ? [
            { x: table.x - 70, y: table.y - 22, w: 16, h: 30 },
            { x: table.x + 54, y: table.y - 22, w: 16, h: 30 },
            { x: table.x - 10, y: table.y + 26, w: 20, h: 24 },
          ]
        : [
            { x: table.x - 42, y: table.y - 38, w: 18, h: 28 },
            { x: table.x + 24, y: table.y + 8, w: 18, h: 28 },
          ];

      for (const chair of chairs) {
        const chairBody = this.physics.add.staticBody(chair.x, chair.y, chair.w, chair.h);
        this.physics.add.collider(this.player.sprite, chairBody as unknown as Phaser.Physics.Arcade.StaticBody);
      }
    }
  }

  private openProductPopup(): void {
    if (this.productMenuOpen) return;

    this.productMenuOpen = true;
    this.player.freeze();
    this.mobileControls.setGameVisible(false);
    this.promptText.setVisible(false);

    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2;
    const panelW = 292;
    const panelH = 230;

    this.productBackdrop = this.add.rectangle(cx, cy, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 0x000000, 0.62)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 40);
    this.productObjects.push(this.productBackdrop);

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x111827, 0.96);
    panel.setStrokeStyle(1, 0x6b7a8c, 0.95).setScrollFactor(0).setDepth(DEPTH.UI + 41);
    this.productObjects.push(panel);

    this.productObjects.push(this.add.text(cx, cy - 94, 'Menu Cafe', {
      fontSize: '11px',
      color: '#f2a65a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 42));

    CAFE_PRODUCTS.forEach((product, index) => {
      const item = ITEM_DEFS[product.id];
      const rowY = cy - 48 + index * 56;
      const card = this.add.rectangle(cx, rowY, 250, 46, 0x1c2836, 0.95);
      card.setStrokeStyle(1, 0x3f5268, 0.8).setScrollFactor(0).setDepth(DEPTH.UI + 42);
      this.productObjects.push(card);

      const iconBg = this.add.rectangle(cx - 104, rowY, 34, 34, 0x101a24, 1);
      iconBg.setStrokeStyle(1, 0x4d6177, 0.9).setScrollFactor(0).setDepth(DEPTH.UI + 43);
      this.productObjects.push(iconBg);

      if (item.textureKey && this.textures.exists(item.textureKey)) {
        this.productObjects.push(this.add.image(cx - 104, rowY, item.textureKey)
          .setScale(0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH.UI + 44));
      } else {
        const cup = this.add.graphics();
        cup.fillStyle(item.color, 1);
        cup.fillRoundedRect(cx - 113, rowY - 9, 16, 18, 4);
        cup.fillStyle(0xf5efe0, 1);
        cup.fillRect(cx - 111, rowY - 12, 12, 3);
        cup.setScrollFactor(0).setDepth(DEPTH.UI + 44);
        this.productObjects.push(cup);
      }

      this.productObjects.push(this.add.text(cx - 80, rowY - 8, product.label, {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.UI + 44));

      this.productObjects.push(this.add.text(cx - 80, rowY + 8, formatRupiah(product.price), {
        fontSize: '7px',
        color: '#f3e59a',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.UI + 44));

      const buyBtn = this.add.rectangle(cx + 88, rowY, 56, 22, 0x2e6e3e, 0.95);
      buyBtn.setStrokeStyle(1, 0x68a66a, 0.8);
      buyBtn.setScrollFactor(0).setDepth(DEPTH.UI + 45);
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x3f9253, 1));
      buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x2e6e3e, 0.95));
      buyBtn.on('pointerdown', () => {
        InputGuard.consume();
        this.buyCafeProduct(product.id, product.price);
      });
      this.productObjects.push(buyBtn);

      const buyText = this.add.text(cx + 88, rowY, 'Beli', {
        fontSize: '8px',
        color: '#e9ffe6',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 46);
      buyText.setInteractive({ useHandCursor: true });
      buyText.on('pointerdown', () => {
        InputGuard.consume();
        this.buyCafeProduct(product.id, product.price);
      });
      this.productObjects.push(buyText);
    });

    const closeBtn = this.add.rectangle(cx + panelW / 2 - 16, cy - panelH / 2 + 16, 20, 20, 0x334455, 0.95);
    closeBtn.setScrollFactor(0).setDepth(DEPTH.UI + 45);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      InputGuard.consume();
      this.closeProductPopup();
    });
    this.productObjects.push(closeBtn);

    const closeText = this.add.text(closeBtn.x, closeBtn.y, 'X', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 46);
    closeText.setInteractive({ useHandCursor: true });
    closeText.on('pointerdown', () => {
      InputGuard.consume();
      this.closeProductPopup();
    });
    this.productObjects.push(closeText);
  }

  private closeProductPopup(unfreeze = true): void {
    if (!this.productMenuOpen && this.productObjects.length === 0) return;

    this.productMenuOpen = false;
    for (const obj of this.productObjects) obj.destroy();
    this.productObjects = [];
    this.productBackdrop = null;

    if (unfreeze && !this.exiting) {
      this.player.unfreeze();
      this.barista.unfreeze();
      this.mobileControls.setGameVisible(true);
    }
  }

  private buyCafeProduct(itemId: string, price: number): void {
    const item = ITEM_DEFS[itemId];
    if (!item) return;

    if (gameManager.inventory.isFull() && !gameManager.inventory.hasItem(itemId)) {
      this.showToast('Tas penuh.', 0xcc6655);
      return;
    }

    if (!gameManager.spendMoney(price)) {
      this.showToast('Uang tidak cukup.', 0xcc6655);
      return;
    }

    const slot = gameManager.inventory.addItem({ ...item });
    if (slot >= 0) {
      proceduralAudio.playClick();
      this.showToast(`${item.name} masuk ke inventori!`, 0xf2a65a);
      this.closeProductPopup();
    } else {
      gameManager.addMoney(price);
      this.showToast('Tas penuh.', 0xcc6655);
    }
  }

  private giveCoffee(): void {
    const inv = gameManager.inventory;
    const slot = inv.addItem(ITEM_DEFS.coffee);

    if (slot >= 0) {
      this.showToast('Kopi masuk ke inventori!', 0xf2a65a);
    } else {
      this.showToast('Inventory full — no room for coffee.', 0xcc6655);
    }
  }

  private showToast(message: string, color: number): void {
    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2 - 40;

    const bg = this.add.rectangle(cx, cy, message.length * 5.5 + 20, 20, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(DEPTH.UI + 50);

    const txt = this.add.text(cx, cy, message, {
      fontSize: '7px', fontFamily: 'monospace',
      color: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 51);

    // Float up then fade out
    this.tweens.add({
      targets: [bg, txt],
      y: `-=22`,
      alpha: 0,
      duration: 1800,
      ease: 'Cubic.Out',
      onComplete: () => { bg.destroy(); txt.destroy(); },
    });
  }

  private doExit(): void {
    this.exiting = true;
    this.player.freeze();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.wake('WorldScene');
    });
  }
}

