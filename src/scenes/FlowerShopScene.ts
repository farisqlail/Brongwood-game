import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { Player } from '@/entities/Player';
import { NPC } from '@/entities/NPC';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { DialogueSystem } from '@/dialogue/DialogueSystem';
import { getRikaDialogue } from '@/dialogue/RikaDialogue';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { MobileControls } from '@/ui/MobileControls';
import { SceneHUD } from '@/ui/SceneHUD';
import { SceneAtmosphere } from '@/systems/SceneAtmosphere';
import { AudioSystem } from '@/systems/AudioSystem';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { tryGiveSelectedItemToNpc } from '@/systems/GiftSystem';
import { FLOWER_SHOP_ITEMS, formatRupiah } from '@config/economy.config';
import { ITEM_DEFS } from '@/types/inventory';
import { InputGuard } from '@/ui/InputGuard';

const SHOP_W = 480;
const SHOP_H = 384;
const FLOOR_X = 16;
const FLOOR_Y = 16;
const FLOOR_W = 448;
const FLOOR_H = 352;
const EXIT_GAP_X1 = 192;
const EXIT_GAP_X2 = 288;

export class FlowerShopScene extends Phaser.Scene {
  private player!: Player;
  private rika!: NPC;
  private dialogueSystem!: DialogueSystem;
  private mobileControls!: MobileControls;
  private hud!: SceneHUD;
  private pauseMenu!: PauseMenuUI;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text | null = null;
  private nearRika = false;
  private nearCounter = false;
  private shopOpen = false;
  private exiting = false;
  private shopBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private shopContainer: Phaser.GameObjects.Container | null = null;
  private moneyLabel: Phaser.GameObjects.Text | null = null;
  private buyButtons: Phaser.GameObjects.Rectangle[] = [];
  private buyButtonTexts: Phaser.GameObjects.Text[] = [];
  private closeButton: Phaser.GameObjects.Rectangle | null = null;
  private closeButtonText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'FlowerShopScene' });
  }

  create(): void {
    this.exiting = false;
    this.cameras.main.fadeIn(450, 0, 0, 0);

    this.buildInterior();

    this.player = new Player(this, SHOP_W / 2, SHOP_H - 48);
    this.player.sprite.setCollideWorldBounds(false);

    this.rika = new NPC(this, {
      id: 'rika',
      textureKey: TEXTURE_KEYS.RIKA,
      x: SHOP_W / 2,
      y: 116,
      direction: 'down',
      interactionRadius: 54,
    });
    this.rika.enableWander(14);

    this.cameras.main.setBounds(0, 0, SHOP_W, SHOP_H);
    this.cameras.main.centerOn(SHOP_W / 2, SHOP_H / 2);

    this.createColliders();
    this.physics.add.collider(this.player.sprite, this.rika.sprite);

    this.dialogueSystem = new DialogueSystem(this);
    this.promptText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 56, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 20).setVisible(false);

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => this.handleAction());
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G).on('down', () => this.handleGift());

    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.shopOpen) this.closeShop();
      else if (!this.dialogueSystem.isActive) this.pauseMenu.toggle();
    });

    this.hud = new SceneHUD(this, 'flower_shop', SHOP_W, SHOP_H);
    this.atmosphere = new SceneAtmosphere(this, { weather: false, lighting: 'flower_shop' });
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);
    proceduralAudio.stopRain();
    this.buildShopOverlay();

    EventBus.on('event:player-locked', this.onPlayerLocked, this);
    EventBus.on('dialogue:started', this.onDialogueStarted, this);
    EventBus.on('dialogue:ended', this.onDialogueEnded, this);

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
      this.player.setJoystickInput(js.isActive && !this.dialogueSystem.isActive && !this.shopOpen, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleAction();
    }

    if (!this.dialogueSystem.isActive && !this.shopOpen) {
      this.player.update();
      this.rika.update(delta);
      this.updatePrompt();
    } else {
      this.player.sprite.setVelocity(0, 0);
      this.promptText.setVisible(false);
    }

    if (!this.exiting && this.player.sprite.y > SHOP_H - 14) {
      this.doExit();
    }
  }

  private buildInterior(): void {
    this.add.rectangle(SHOP_W / 2, SHOP_H / 2, SHOP_W, SHOP_H, 0x141316).setDepth(DEPTH.GROUND - 2);
    this.buildWoodPanelFloor();
    this.buildSideDisplays();
    this.buildTopFlowers();
    this.buildShopCounter();
  }

  private buildWoodPanelFloor(): void {
    const g = this.add.graphics().setDepth(DEPTH.GROUND);
    g.fillStyle(0x9b6231, 1);
    g.fillRect(FLOOR_X, FLOOR_Y, FLOOR_W, FLOOR_H);
    g.lineStyle(4, 0x2a1c14, 1);
    g.strokeRect(FLOOR_X, FLOOR_Y, FLOOR_W, FLOOR_H);

    const cols = 4;
    const rows = 4;
    const panelW = FLOOR_W / cols;
    const panelH = FLOOR_H / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = FLOOR_X + col * panelW;
        const y = FLOOR_Y + row * panelH;
        const shade = (row + col) % 2 === 0 ? 0xa66a35 : 0x965d30;
        g.fillStyle(shade, 1);
        g.fillRect(x + 1, y + 1, panelW - 2, panelH - 2);
        g.lineStyle(2, 0x3a2418, 0.9);
        g.strokeRect(x, y, panelW, panelH);
        g.lineStyle(1, 0xd08a4a, 0.22);
        g.lineBetween(x + 10, y + 20, x + panelW - 16, y + 20);
        g.lineBetween(x + 18, y + 46, x + panelW - 28, y + 46);
        g.lineStyle(1, 0x4b2e1c, 0.35);
        g.lineBetween(x + panelW * 0.5, y + 4, x + panelW * 0.5, y + panelH - 4);
      }
    }

    for (const y of [FLOOR_Y + 116, FLOOR_Y + 204, FLOOR_Y + 292]) {
      g.lineStyle(5, 0x2d1c13, 0.9);
      g.lineBetween(FLOOR_X + 24, y, FLOOR_X + FLOOR_W - 24, y);
      g.lineStyle(2, 0xd29152, 0.25);
      g.lineBetween(FLOOR_X + 28, y - 3, FLOOR_X + FLOOR_W - 28, y - 3);
    }
  }

  private buildSideDisplays(): void {
    for (const side of [
      { x: 46, key: 'tile-pot-tangga-1', flipX: true },
      { x: SHOP_W - 46, key: 'tile-pot-tangga-2', flipX: false },
    ]) {
      for (const y of [164, 246, 328]) {
        this.add.image(side.x, y, side.key).setScale(0.9).setFlipX(side.flipX).setDepth(y);
        this.add.image(side.x, y - 18, 'tile-rumput-3').setScale(0.0).setDepth(y + 2);
      }
    }
  }

  private buildTopFlowers(): void {
    for (const x of [58, 106, 154, 326, 374, 422]) {
      this.add.image(x, 64, 'tile-rumput-besar-2').setScale(0.72).setDepth(106);
      this.add.image(x + 4, 42, 'tile-bunga-3').setScale(0.72).setDepth(112);
    }

    for (const x of [86, 134, 346, 394]) {
      this.add.image(x, 108, 'tile-rumput-besar-2').setScale(0.64).setDepth(122);
      this.add.image(x + 8, 86, 'tile-bunga-3').setScale(0.66).setDepth(128);
    }

    const buffet = this.add.image(SHOP_W / 2, 116, 'house2-buffet');
    buffet.setScale(1.45).setDepth(138);

    for (const x of [SHOP_W / 2 - 118, SHOP_W / 2 + 118]) {
      this.add.image(x, 126, 'tile-rumput-besar-2').setScale(0.82).setDepth(142);
      this.add.image(x + 8, 100, 'tile-bunga-3').setScale(0.78).setDepth(148);
    }
  }

  private buildShopCounter(): void {
    this.add.rectangle(146, 228, 86, 26, 0x6c4b2f).setDepth(218);
    this.add.rectangle(146, 220, 76, 8, 0x8c6540).setDepth(226);
    this.add.image(126, 208, 'tile-bunga-3').setScale(0.72).setDepth(230);
    this.add.image(146, 210, 'tile-rumput-besar-2').setScale(0.58).setDepth(228);
    this.add.image(166, 208, 'tile-bunga-3').setScale(0.72).setDepth(230);
    this.add.text(146, 246, 'DEKOR', {
      fontSize: '7px',
      color: '#f6e2b8',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(246);
  }

  private placeChair(x: number, y: number, key: string, scale: number): void {
    this.add.image(x, y, key).setScale(scale).setDepth(y - 2);
  }

  private createColliders(): void {
    const bodies = [
      this.physics.add.staticBody(FLOOR_X, FLOOR_Y - 10, FLOOR_W, 10),
      this.physics.add.staticBody(-8, 0, 8, SHOP_H),
      this.physics.add.staticBody(SHOP_W, 0, 8, SHOP_H),
      this.physics.add.staticBody(0, SHOP_H, EXIT_GAP_X1, 8),
      this.physics.add.staticBody(EXIT_GAP_X2, SHOP_H, SHOP_W - EXIT_GAP_X2, 8),
      this.physics.add.staticBody(24, 28, 180, 116),
      this.physics.add.staticBody(276, 28, 180, 116),
      this.physics.add.staticBody(SHOP_W / 2 - 92, 88, 184, 62),
      this.physics.add.staticBody(12, 132, 80, 224),
      this.physics.add.staticBody(SHOP_W - 92, 132, 80, 224),
      this.physics.add.staticBody(103, 214, 86, 22),
    ];

    for (const body of bodies) {
      this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
    }
  }

  private addBox(x: number, y: number, w: number, h: number): void {
    const body = this.physics.add.staticBody(x, y, w, h);
    this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
  }

  private updatePrompt(): void {
    const counterDist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, 146, 254);
    this.nearCounter = counterDist < 52;
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.rika.sprite.x, this.rika.sprite.y);
    this.nearRika = dist < 62;
    const prompt = this.nearCounter
      ? '[E] Belanja bunga'
      : this.nearRika
        ? '[E] Bicara  [G] Hadiah'
        : '';
    this.promptText.setText(prompt);
    this.promptText.setVisible(Boolean(prompt));
  }

  private handleAction(): void {
    if (this.shopOpen || this.dialogueSystem.isActive || this.pauseMenu.opened) return;
    if (this.nearCounter) {
      this.openShop();
      return;
    }
    if (!this.nearRika) return;
    proceduralAudio.playClick();
    this.rika.freeze();
    this.rika.faceToward(this.player.sprite.x, this.player.sprite.y);
    gameManager.relationships.recordInteraction('rika', gameManager.time.day);
    const hasMetRika = gameManager.relationships.hasFlag('rika', 'met_rika');
    const relationship = gameManager.relationships.get('rika');
    this.dialogueSystem.start(getRikaDialogue(hasMetRika, gameManager.time.period, {
      day: gameManager.time.day,
      timePeriod: gameManager.time.period,
      weather: this.atmosphere.weatherState,
      location: 'flower_shop',
      relationshipStage: relationship?.stage ?? 'stranger',
      relationship,
    }));
  }

  private handleGift(): void {
    if (!this.nearRika || this.shopOpen || this.dialogueSystem.isActive || this.pauseMenu.opened) return;
    this.rika.faceToward(this.player.sprite.x, this.player.sprite.y);
    const result = tryGiveSelectedItemToNpc('rika', gameManager.time.day);
    this.showGiftToast(result.message, result.color);
    if (result.success) proceduralAudio.playClick();
  }

  private showGiftToast(message: string, color: number): void {
    const toast = this.add.text(this.player.sprite.x, this.player.sprite.y - 44, message, {
      fontSize: '8px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(DEPTH.UI + 22);

    this.tweens.add({
      targets: toast,
      y: toast.y - 18,
      alpha: 0,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  private readonly onDialogueStarted = () => {
    this.mobileControls.setGameVisible(false);
    this.hud.setVisible(false);
    this.promptText.setVisible(false);
  };

  private readonly onDialogueEnded = () => {
    this.rika.unfreeze();
    this.mobileControls.setGameVisible(true);
    this.hud.setVisible(true);
  };

  private buildShopOverlay(): void {
    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2;
    const panelW = 292;
    const panelH = 246;
    this.buyButtons = [];
    this.buyButtonTexts = [];

    this.shopBackdrop = this.add.rectangle(cx, cy, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 0x000000, 0.62)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 40)
      .setVisible(false)
      .setInteractive();
    this.shopBackdrop.on('pointerdown', () => {
      InputGuard.consume();
    });

    this.shopContainer = this.add.container(0, 0);
    this.shopContainer.setScrollFactor(0).setDepth(DEPTH.UI + 41).setVisible(false);

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x111827, 0.96);
    panel.setStrokeStyle(1, 0x6d5978, 0.95);
    const title = this.add.text(cx, cy - 92, 'Pilihan Rika', {
      fontSize: '10px',
      color: '#f0b8d8',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.moneyLabel = this.add.text(cx, cy - 74, '', {
      fontSize: '8px',
      color: '#f3e59a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.shopContainer.add([panel, title, this.moneyLabel]);

    FLOWER_SHOP_ITEMS.forEach((item, index) => {
      const rowY = cy - 46 + index * 32;
      const rowBg = this.add.rectangle(cx, rowY, 248, 26, 0x1f2430, 0.92)
        .setStrokeStyle(1, 0x47394e, 0.8);
      const nameText = this.add.text(cx - 114, rowY - 6, item.label, {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const descText = this.add.text(cx - 114, rowY + 7, item.description, {
        fontSize: '6px',
        color: '#cdbcd6',
        fontFamily: 'monospace',
        wordWrap: { width: 146 },
      }).setOrigin(0, 0.5);
      const priceText = this.add.text(cx + 26, rowY, formatRupiah(item.price), {
        fontSize: '7px',
        color: '#f3e59a',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      const buyButton = this.add.rectangle(cx + 92, rowY, 56, 20, 0x7a3f62, 0.95)
        .setInteractive({ useHandCursor: true });
      const buyText = this.add.text(cx + 92, rowY, 'Beli', {
        fontSize: '7px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      buyButton.on('pointerdown', () => {
        InputGuard.consume();
        this.buyShopItem(item.id, item.price);
      });
      buyText.setInteractive({ useHandCursor: true });
      buyText.on('pointerdown', () => {
        InputGuard.consume();
        this.buyShopItem(item.id, item.price);
      });

      this.buyButtons.push(buyButton);
      this.buyButtonTexts.push(buyText);
      this.shopContainer?.add([rowBg, nameText, descText, priceText, buyButton, buyText]);
    });

    this.closeButton = this.add.rectangle(cx + panelW / 2 - 16, cy - panelH / 2 + 16, 20, 20, 0x4f4058, 0.95)
      .setScrollFactor(0)
      .setDepth(DEPTH.UI + 42)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.closeButton.on('pointerover', () => this.closeButton?.setFillStyle(0x695171, 1));
    this.closeButton.on('pointerout', () => this.closeButton?.setFillStyle(0x4f4058, 0.95));
    this.closeButton.on('pointerdown', () => {
      InputGuard.consume();
      this.closeShop();
    });

    this.closeButtonText = this.add.text(cx + panelW / 2 - 16, cy - panelH / 2 + 16, 'X', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 43).setVisible(false).setInteractive({ useHandCursor: true });
    this.closeButtonText.on('pointerdown', () => {
      InputGuard.consume();
      this.closeShop();
    });
    this.closeButtonText.on('pointerover', () => this.closeButton?.setFillStyle(0x695171, 1));
    this.closeButtonText.on('pointerout', () => this.closeButton?.setFillStyle(0x4f4058, 0.95));
  }

  private openShop(): void {
    this.shopOpen = true;
    this.player.freeze();
    this.promptText.setVisible(false);
    this.refreshMoneyLabel();
    this.shopBackdrop?.setVisible(true);
    this.shopContainer?.setVisible(true);
    this.closeButton?.setVisible(true);
    this.closeButtonText?.setVisible(true);
  }

  private closeShop(): void {
    this.shopOpen = false;
    this.player.unfreeze();
    this.shopBackdrop?.setVisible(false);
    this.shopContainer?.setVisible(false);
    this.closeButton?.setVisible(false);
    this.closeButtonText?.setVisible(false);
  }

  private buyShopItem(itemId: string, price: number): void {
    const item = ITEM_DEFS[itemId];
    if (!item) return;

    if (gameManager.inventory.isFull() && !gameManager.inventory.hasItem(itemId)) {
      this.showShopToast('Tas penuh.');
      return;
    }

    if (!gameManager.spendMoney(price)) {
      this.showShopToast('Uang tidak cukup.');
      return;
    }

    const slot = gameManager.inventory.addItem({ ...item });
    if (slot === -1) {
      gameManager.addMoney(price);
      this.showShopToast('Tas penuh.');
      return;
    }

    proceduralAudio.playClick();
    this.refreshMoneyLabel();
    this.showShopToast(`${item.name} dibeli.`);
  }

  private refreshMoneyLabel(): void {
    this.moneyLabel?.setText(`Saldo: ${formatRupiah(gameManager.money)}`);
  }

  private showShopToast(message: string): void {
    this.toastText?.destroy();
    this.toastText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 94, message, {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 50);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      y: GAME_CONFIG.HEIGHT / 2 + 82,
      duration: 1000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.toastText?.destroy();
        this.toastText = null;
      },
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
    this.closeShop();
    this.player.unfreeze();
    proceduralAudio.stopRain();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private onShutdown(): void {
    EventBus.off('event:player-locked', this.onPlayerLocked);
    EventBus.off('dialogue:started', this.onDialogueStarted);
    EventBus.off('dialogue:ended', this.onDialogueEnded);
    this.dialogueSystem.destroy();
    this.rika.destroy();
    this.mobileControls.destroy();
    this.hud.destroy();
    this.pauseMenu.destroy();
    this.atmosphere.destroy();
    this.promptText.destroy();
    this.toastText?.destroy();
    this.shopBackdrop?.destroy();
    this.shopContainer?.destroy();
    this.closeButton?.destroy();
    this.closeButtonText?.destroy();
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
