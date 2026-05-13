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
  private nearRika = false;
  private exiting = false;

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

    this.mobileControls = new MobileControls(this);
    this.pauseMenu = new PauseMenuUI(this);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (!this.dialogueSystem.isActive) this.pauseMenu.toggle();
    });

    this.hud = new SceneHUD(this, 'flower_shop', SHOP_W, SHOP_H);
    this.atmosphere = new SceneAtmosphere(this, { weather: false, lighting: 'flower_shop' });
    gameManager.startGameplay();
    this.ownedAudioSystem = bootstrapGameplayAudio(this);
    proceduralAudio.stopRain();

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
      this.player.setJoystickInput(js.isActive && !this.dialogueSystem.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.handleAction();
    }

    if (!this.dialogueSystem.isActive) {
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
    const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.rika.sprite.x, this.rika.sprite.y);
    this.nearRika = dist < 62;
    this.promptText.setText(this.nearRika ? '[E] Bicara dengan Rika' : '');
    this.promptText.setVisible(this.nearRika);
  }

  private handleAction(): void {
    if (!this.nearRika || this.dialogueSystem.isActive || this.pauseMenu.opened) return;
    proceduralAudio.playClick();
    this.rika.freeze();
    this.rika.faceToward(this.player.sprite.x, this.player.sprite.y);
    gameManager.relationships.recordInteraction('rika', gameManager.time.day);
    const hasMetRika = gameManager.relationships.hasFlag('rika', 'met_rika');
    this.dialogueSystem.start(getRikaDialogue(hasMetRika, gameManager.time.period));
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
    this.ownedAudioSystem?.destroy();
    if (this.ownedAudioSystem) {
      gameManager.registerSceneSystems({ audio: null });
      this.ownedAudioSystem = null;
    }
  }
}
