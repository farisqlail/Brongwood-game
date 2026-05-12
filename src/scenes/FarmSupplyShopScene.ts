import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { Player } from '@/entities/Player';
import { MobileControls } from '@/ui/MobileControls';
import { SceneHUD } from '@/ui/SceneHUD';
import { SceneAtmosphere } from '@/systems/SceneAtmosphere';
import { gameManager } from '@/managers/GameManager';
import { AudioSystem } from '@/systems/AudioSystem';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { FARM_SUPPLY_SHOP_ITEMS, formatRupiah } from '@config/economy.config';
import { ITEM_DEFS } from '@/types/inventory';
import { InputGuard } from '@/ui/InputGuard';
import { FirstDayObjectiveUI } from '@/ui/FirstDayObjectiveUI';

const SHOP_W = 480;
const SHOP_H = 384;
const COUNTER_Y = 120;
const EXIT_GAP_X1 = 192;
const EXIT_GAP_X2 = 288;

export class FarmSupplyShopScene extends Phaser.Scene {
  private player!: Player;
  private mobileControls!: MobileControls;
  private hud!: SceneHUD;
  private pauseMenu!: PauseMenuUI;
  private atmosphere!: SceneAtmosphere;
  private ownedAudioSystem: AudioSystem | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text | null = null;
  private nearCounter = false;
  private shopOpen = false;
  private exiting = false;

  private shopBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private shopContainer: Phaser.GameObjects.Container | null = null;
  private shopListContainer: Phaser.GameObjects.Container | null = null;
  private shopListMaskShape: Phaser.GameObjects.Graphics | null = null;
  private shopListViewport = new Phaser.Geom.Rectangle();
  private moneyLabel: Phaser.GameObjects.Text | null = null;
  private buyButtons: Phaser.GameObjects.Rectangle[] = [];
  private buyButtonTexts: Phaser.GameObjects.Text[] = [];
  private closeButton: Phaser.GameObjects.Rectangle | null = null;
  private closeButtonText: Phaser.GameObjects.Text | null = null;
  private shopScrollOffset = 0;
  private shopScrollMin = 0;
  private draggingShopList = false;
  private lastDragY = 0;
  private objectiveUI!: FirstDayObjectiveUI;

  constructor() {
    super({ key: 'FarmSupplyShopScene' });
  }

  create(): void {
    this.exiting = false;
    this.shopOpen = false;
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildInterior();

    this.player = new Player(this, SHOP_W / 2, SHOP_H - 52);
    this.player.sprite.setCollideWorldBounds(false);

    this.cameras.main.setBounds(0, 0, SHOP_W, SHOP_H);
    this.cameras.main.centerOn(SHOP_W / 2, SHOP_H / 2);

    this.createColliders();

    this.promptText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 40, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 15).setVisible(false);

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => this.handleAction());

    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.shopOpen) this.closeShop();
      else this.pauseMenu.toggle();
    });

    this.hud = new SceneHUD(this, 'farm_shop', SHOP_W, SHOP_H);
    this.atmosphere = new SceneAtmosphere(this, { weather: false, lighting: 'flower_shop' });
    this.objectiveUI = new FirstDayObjectiveUI(this);
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);
    proceduralAudio.stopRain();

    this.buildShopOverlay();
    this.registerShopScrollInput();

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
      this.player.setJoystickInput(js.isActive && !this.shopOpen, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleAction();
    }

    if (!this.shopOpen) {
      this.player.update();
      this.checkCounterProximity();
      if (!this.exiting && this.player.sprite.y > SHOP_H - 14) {
        this.doExit();
      }
    } else {
      this.player.sprite.setVelocity(0, 0);
    }
  }

  private buildInterior(): void {
    this.add.rectangle(SHOP_W / 2, SHOP_H / 2, SHOP_W, SHOP_H, 0x6b4e31).setDepth(DEPTH.GROUND - 1);
    this.add.rectangle(SHOP_W / 2, 18, SHOP_W, 36, 0x4b321f).setDepth(DEPTH.GROUND);
    this.add.rectangle(SHOP_W / 2, 62, SHOP_W, 52, 0x8b6b3d).setDepth(DEPTH.GROUND);
    this.add.rectangle(SHOP_W / 2, COUNTER_Y, 300, 40, 0x5d3d24).setDepth(DEPTH.ENTITIES);
    this.add.rectangle(SHOP_W / 2, COUNTER_Y - 8, 286, 10, 0x7e5836).setDepth(DEPTH.ENTITIES + 1);

    for (const x of [126, 220, 314]) {
      this.add.rectangle(x, 84, 54, 16, 0x9d7446).setDepth(DEPTH.GROUND_DECOR + 1);
      this.add.image(x - 12, 78, 'farm-bibit_wortel').setScale(0.55).setDepth(DEPTH.GROUND_DECOR + 2);
      this.add.image(x + 12, 78, 'farm-bibit_bawang_merah').setScale(0.55).setDepth(DEPTH.GROUND_DECOR + 2);
    }

    this.add.text(SHOP_W / 2, 34, 'TOKO TANI', {
      fontSize: '10px',
      color: '#f4d7a1',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.GROUND_DECOR + 2);
  }

  private createColliders(): void {
    const top = this.physics.add.staticBody(0, 82, SHOP_W, 6);
    const left = this.physics.add.staticBody(-6, 0, 6, SHOP_H);
    const right = this.physics.add.staticBody(SHOP_W, 0, 6, SHOP_H);
    const botL = this.physics.add.staticBody(0, SHOP_H, EXIT_GAP_X1, 6);
    const botR = this.physics.add.staticBody(EXIT_GAP_X2, SHOP_H, SHOP_W - EXIT_GAP_X2, 6);
    const counter = this.physics.add.staticBody(SHOP_W / 2 - 150, COUNTER_Y - 20, 300, 40);

    for (const body of [top, left, right, botL, botR, counter]) {
      this.physics.add.collider(this.player.sprite, body as unknown as Phaser.Physics.Arcade.StaticBody);
    }
  }

  private buildShopOverlay(): void {
    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2;
    const panelW = 290;
    const panelH = 248;
    const listViewportX = cx - 125;
    const listViewportY = cy - 58;
    const listViewportW = 250;
    const listViewportH = 154;
    const listStartY = listViewportY + 18;
    const rowGap = 38;
    this.buyButtons = [];
    this.buyButtonTexts = [];
    this.shopListViewport = new Phaser.Geom.Rectangle(listViewportX, listViewportY, listViewportW, listViewportH);

    this.shopBackdrop = this.add.rectangle(cx, cy, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 0x000000, 0.62);
    this.shopBackdrop.setScrollFactor(0).setDepth(DEPTH.UI + 40).setVisible(false);
    this.shopBackdrop.setInteractive();
    this.shopBackdrop.on('pointerdown', () => {
      InputGuard.consume();
    });

    this.shopContainer = this.add.container(0, 0);
    this.shopContainer.setScrollFactor(0).setDepth(DEPTH.UI + 41).setVisible(false);

    this.shopListContainer = this.add.container(0, 0);
    this.shopListContainer.setScrollFactor(0).setDepth(DEPTH.UI + 41).setVisible(false);

    this.shopListMaskShape = this.add.graphics();
    this.shopListMaskShape.setScrollFactor(0);
    this.shopListMaskShape.setDepth(DEPTH.UI + 41);
    this.shopListMaskShape.fillStyle(0xffffff, 1);
    this.shopListMaskShape.fillRect(listViewportX, listViewportY, listViewportW, listViewportH);
    this.shopListMaskShape.setAlpha(0);
    this.shopListMaskShape.setVisible(false);
    this.shopListContainer.setMask(this.shopListMaskShape.createGeometryMask());

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x111827, 0.96);
    panel.setStrokeStyle(1, 0x5c7085, 0.95);
    this.shopContainer.add(panel);

    const title = this.add.text(cx, cy - 92, 'Kebutuhan Bertani', {
      fontSize: '10px',
      color: '#f2a65a',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.shopContainer.add(title);

    this.moneyLabel = this.add.text(cx, cy - 74, '', {
      fontSize: '8px',
      color: '#f3e59a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.shopContainer.add(this.moneyLabel);

    FARM_SUPPLY_SHOP_ITEMS.forEach((item, index) => {
      const itemDef = ITEM_DEFS[item.id];
      const cardY = listStartY + index * rowGap;
      const card = this.add.rectangle(cx, cardY, 258, 34, 0x1c2836, 0.95);
      card.setStrokeStyle(1, 0x3f5268, 0.8);
      this.shopListContainer!.add(card);

      const iconFrame = this.add.rectangle(cx - 104, cardY, 28, 28, 0x101a24, 1);
      iconFrame.setStrokeStyle(1, 0x4d6177, 0.9);
      this.shopListContainer!.add(iconFrame);

      if (itemDef?.textureKey && this.textures.exists(itemDef.textureKey)) {
        const icon = this.add.image(cx - 104, cardY, itemDef.textureKey);
        icon.setScale(0.42);
        this.shopListContainer!.add(icon);
      } else {
        const fallback = this.add.rectangle(cx - 104, cardY, 20, 20, itemDef?.color ?? 0xcccccc, 1);
        this.shopListContainer!.add(fallback);
      }

      const itemName = this.add.text(cx - 84, cardY, item.label, {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.shopListContainer!.add(itemName);

      const price = this.add.text(cx + 30, cardY, formatRupiah(item.price), {
        fontSize: '7px',
        color: '#f3e59a',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.shopListContainer!.add(price);

      const buyBtn = this.add.rectangle(cx + 92, cardY, 50, 18, 0x2e6e3e, 0.95);
      buyBtn.setScrollFactor(0).setDepth(DEPTH.UI + 42).setVisible(false);
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x3f9253, 1));
      buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x2e6e3e, 0.95));
      buyBtn.on('pointerdown', () => {
        InputGuard.consume();
        this.buyItem(item.id, item.price);
      });
      this.shopListContainer!.add(buyBtn);
      this.buyButtons.push(buyBtn);

      const buyText = this.add.text(cx + 92, cardY, 'Beli', {
        fontSize: '7px',
        color: '#e9ffe6',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 43).setVisible(false);
      buyText.setInteractive({ useHandCursor: true });
      buyText.on('pointerdown', () => {
        InputGuard.consume();
        this.buyItem(item.id, item.price);
      });
      buyText.on('pointerover', () => buyBtn.setFillStyle(0x3f9253, 1));
      buyText.on('pointerout', () => buyBtn.setFillStyle(0x2e6e3e, 0.95));
      this.shopListContainer!.add(buyText);
      this.buyButtonTexts.push(buyText);
    });
    this.shopScrollMin = Math.min(0, listViewportH - (FARM_SUPPLY_SHOP_ITEMS.length * rowGap + 16));
    this.updateShopListScroll(0);

    this.closeButton = this.add.rectangle(cx + panelW / 2 - 16, cy - panelH / 2 + 16, 20, 20, 0x334455, 0.95);
    this.closeButton.setScrollFactor(0).setDepth(DEPTH.UI + 42).setVisible(false);
    this.closeButton.setInteractive({ useHandCursor: true });
    this.closeButton.on('pointerover', () => this.closeButton?.setFillStyle(0x44607a, 1));
    this.closeButton.on('pointerout', () => this.closeButton?.setFillStyle(0x334455, 0.95));
    this.closeButton.on('pointerdown', () => {
      InputGuard.consume();
      this.closeShop();
    });

    this.closeButtonText = this.add.text(cx + panelW / 2 - 16, cy - panelH / 2 + 16, 'X', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 43).setVisible(false);
    this.closeButtonText.setInteractive({ useHandCursor: true });
    this.closeButtonText.on('pointerdown', () => {
      InputGuard.consume();
      this.closeShop();
    });
    this.closeButtonText.on('pointerover', () => this.closeButton?.setFillStyle(0x44607a, 1));
    this.closeButtonText.on('pointerout', () => this.closeButton?.setFillStyle(0x334455, 0.95));
  }

  private handleAction(): void {
    if (this.shopOpen) return;
    if (this.nearCounter) {
      this.openShop();
    }
  }

  private registerShopScrollInput(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
      if (!this.shopOpen) return;
      this.updateShopListScroll(this.shopScrollOffset - dy * 0.25);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.shopOpen) return;
      if (!this.shopListViewport.contains(pointer.x, pointer.y)) return;
      this.draggingShopList = true;
      this.lastDragY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.shopOpen || !this.draggingShopList || !pointer.isDown) return;
      const delta = pointer.y - this.lastDragY;
      this.lastDragY = pointer.y;
      this.updateShopListScroll(this.shopScrollOffset + delta);
    });

    this.input.on('pointerup', () => {
      this.draggingShopList = false;
    });
  }

  private updateShopListScroll(nextOffset: number): void {
    this.shopScrollOffset = Phaser.Math.Clamp(nextOffset, this.shopScrollMin, 0);
    if (this.shopListContainer) {
      this.shopListContainer.y = this.shopScrollOffset;
    }
  }

  private checkCounterProximity(): void {
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, SHOP_W / 2, COUNTER_Y + 26);
    this.nearCounter = dist < 56;
    this.promptText.setText(this.nearCounter ? '[E] Belanja bibit' : '');
    this.promptText.setVisible(this.nearCounter);
  }

  private openShop(): void {
    this.shopOpen = true;
    this.draggingShopList = false;
    this.updateShopListScroll(0);
    this.player.freeze();
    this.promptText.setVisible(false);
    this.shopBackdrop?.setVisible(true);
    this.shopContainer?.setVisible(true);
    this.shopListContainer?.setVisible(true);
    for (const btn of this.buyButtons) btn.setVisible(true);
    for (const txt of this.buyButtonTexts) txt.setVisible(true);
    this.closeButton?.setVisible(true);
    this.closeButtonText?.setVisible(true);
    this.refreshMoneyLabel();
  }

  private closeShop(): void {
    this.shopOpen = false;
    this.draggingShopList = false;
    this.player.unfreeze();
    this.shopBackdrop?.setVisible(false);
    this.shopContainer?.setVisible(false);
    this.shopListContainer?.setVisible(false);
    for (const btn of this.buyButtons) btn.setVisible(false);
    for (const txt of this.buyButtonTexts) txt.setVisible(false);
    this.closeButton?.setVisible(false);
    this.closeButtonText?.setVisible(false);
  }

  private buyItem(itemId: string, price: number): void {
    const item = ITEM_DEFS[itemId];
    if (!item) return;

    if (gameManager.inventory.isFull()) {
      this.showToast('Tas penuh.');
      return;
    }

    if (!gameManager.spendMoney(price)) {
      this.showToast('Uang tidak cukup.');
      return;
    }

    const slot = gameManager.inventory.addItem({ ...item });
    if (slot === -1) {
      gameManager.addMoney(price);
      this.showToast('Tas penuh.');
      return;
    }

    proceduralAudio.playClick();
    this.refreshMoneyLabel();
    this.showToast(`${item.name} dibeli.`);
    if (gameManager.firstDayStage === 'buy_seed') {
      gameManager.advanceFirstDay('buy_seed');
    }
  }

  private refreshMoneyLabel(): void {
    this.moneyLabel?.setText(`Saldo: ${formatRupiah(gameManager.money)}`);
  }

  private showToast(message: string): void {
    this.toastText?.destroy();
    const y = this.shopOpen ? GAME_CONFIG.HEIGHT / 2 + 92 : GAME_CONFIG.HEIGHT - 72;
    this.toastText = this.add.text(GAME_CONFIG.WIDTH / 2, y, message, {
      fontSize: '7px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI + 50);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      y: y - 12,
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
    this.mobileControls.destroy();
    this.pauseMenu.destroy();
    this.hud.destroy();
    this.objectiveUI.destroy();
    this.atmosphere.destroy();
    this.promptText.destroy();
    this.toastText?.destroy();
    this.shopListContainer?.destroy();
    this.shopListMaskShape?.destroy();
    for (const btn of this.buyButtons) btn.destroy();
    for (const txt of this.buyButtonTexts) txt.destroy();
    this.closeButton?.destroy();
    this.closeButtonText?.destroy();
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
