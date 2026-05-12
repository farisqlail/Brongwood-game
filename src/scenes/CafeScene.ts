/**
 * CafeScene - Interior of the town cafe.
 * Simple scene: player can walk around, talk to barista, and exit.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH } from '@config/game.config';
import { Player } from '@/entities/Player';
import { NPC } from '@/entities/NPC';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { DialogueSystem } from '@/dialogue/DialogueSystem';
import { DialogueDefinition } from '@/dialogue/DialogueTypes';
import { gameManager } from '@/managers/GameManager';
import { EventBus, GameEvents } from '@/core/EventBus';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';
import { ITEM_DEFS } from '@/types/inventory';
import { CinematicLightingSystem } from '@/systems/CinematicLightingSystem';

const CAFE_W = 640; // pixels
const CAFE_H = 400; // pixels

const CAFE_TABLES = [
  { x: 170, y: 236, key: 'house2-meja-horizontal', scale: 1.15, collider: { w: 92, h: 44 } },
  { x: 470, y: 236, key: 'house2-meja-horizontal', scale: 1.15, collider: { w: 92, h: 44 } },
  { x: 92,  y: 154, key: 'house2-meja-vertical',   scale: 0.85, collider: { w: 36, h: 72 } },
  { x: 548, y: 154, key: 'house2-meja-vertical',   scale: 0.85, collider: { w: 36, h: 72 } },
] as const;

export class CafeScene extends Phaser.Scene {
  private player!: Player;
  private barista!: NPC;
  private dialogueSystem!: DialogueSystem;
  private mobileControls!: MobileControls;
  private promptText!: Phaser.GameObjects.Text;
  private nearbyNPC: NPC | null = null;
  private lighting!: CinematicLightingSystem;
  private exiting: boolean = false;
  private coffeeOrdered: boolean = false;

  private readonly onPlayerLocked = (payload: { locked: boolean }) => {
    if (payload.locked) this.player.freeze();
    else this.player.unfreeze();
  };

  private readonly onDialogueStarted = () => {
    this.mobileControls.setGameVisible(false);
    this.promptText.setVisible(false);
  };

  // Named handlers so we can remove them from EventBus on shutdown
  private readonly onChoiceMade = (p: GameEvents['dialogue:choice-made']) => {
    if (p.dialogueId === 'barista_chat' && p.choiceId === 'coffee') {
      this.coffeeOrdered = true;
    }
  };

  private readonly onDialogueEnded = () => {
    this.barista.unfreeze();
    this.mobileControls.setGameVisible(true);
    if (this.coffeeOrdered) {
      this.coffeeOrdered = false;
      this.giveCoffee();
    }
  };

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

    // Dialogue
    this.dialogueSystem = new DialogueSystem(this);

    // Interaction (E key)
    const eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    eKey.on('down', () => this.tryInteract());

    // Prompt
    this.promptText = this.add.text(CAFE_W / 2, CAFE_H - 50, '[E] Talk', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI).setVisible(false);

    // Mobile
    this.mobileControls = new MobileControls(this);

    // Dialogue events
    EventBus.on('event:player-locked', this.onPlayerLocked, this);
    EventBus.on('dialogue:started', this.onDialogueStarted, this);
    EventBus.on('dialogue:choice-made', this.onChoiceMade, this);
    EventBus.on('dialogue:ended',       this.onDialogueEnded, this);

    // Stop outdoor audio
    proceduralAudio.stopBirds();
    proceduralAudio.stopWind();
    proceduralAudio.stopRain();

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.events.on('shutdown', () => {
      EventBus.off('event:player-locked', this.onPlayerLocked);
      EventBus.off('dialogue:started', this.onDialogueStarted);
      EventBus.off('dialogue:choice-made', this.onChoiceMade);
      EventBus.off('dialogue:ended',       this.onDialogueEnded);
      this.dialogueSystem.destroy();
      this.barista.destroy();
      this.mobileControls.destroy();
      this.lighting.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.exiting) return;
    this.lighting.update(delta);

    // Mobile joystick
    if (this.mobileControls.visible && !this.dialogueSystem.isActive) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);
      if (this.mobileControls.actionPressed) this.tryInteract();
    }

    this.player.update();
    this.barista.update(delta);

    // Proximity check
    if (!this.dialogueSystem.isActive) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.barista.sprite.x, this.barista.sprite.y
      );
      this.nearbyNPC = dist < 60 ? this.barista : null;
      this.promptText.setVisible(this.nearbyNPC !== null);
    } else {
      this.promptText.setVisible(false);
    }

    // EXIT: if player walks past bottom edge
    if (this.player.y > CAFE_H - 10) {
      this.doExit();
    }
  }

  private tryInteract(): void {
    if (this.nearbyNPC && !this.dialogueSystem.isActive) {
      proceduralAudio.playClick();
      this.barista.freeze();
      this.barista.faceToward(this.player.x, this.player.y);
      this.dialogueSystem.start(BARISTA_DIALOGUE);
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

  private giveCoffee(): void {
    const inv = gameManager.inventory;
    const slot = inv.addItem(ITEM_DEFS.coffee);

    if (slot >= 0) {
      this.showToast('Coffee added to inventory!', 0xf2a65a);
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

// ============================================================
// BARISTA DIALOGUE
// ============================================================

const BARISTA_DIALOGUE: DialogueDefinition = {
  id: 'barista_chat',
  startNode: 's1',
  nodes: {
    s1: {
      type: 'text', id: 's1',
      speaker: 'barista', speakerName: 'Hana (Barista)',
      text: 'Welcome! What can I get you? We have fresh coffee and homemade cake today.',
      next: 'choice',
    },
    choice: {
      type: 'choice', id: 'choice',
      choices: [
        { text: 'Coffee, please.', choiceId: 'coffee', next: 'coffee' },
        { text: 'Just looking around.', choiceId: 'look', next: 'look' },
        { text: 'This place is cozy.', choiceId: 'cozy', next: 'cozy' },
      ],
    },
    coffee: {
      type: 'text', id: 'coffee',
      speaker: 'barista', speakerName: 'Hana (Barista)',
      text: 'Coming right up! Take a seat anywhere. The window table has the best view.',
      next: null,
    },
    look: {
      type: 'text', id: 'look',
      speaker: 'barista', speakerName: 'Hana (Barista)',
      text: 'Take your time! We\'re open until late. It gets quiet and nice in the evening.',
      next: null,
    },
    cozy: {
      type: 'text', id: 'cozy',
      speaker: 'barista', speakerName: 'Hana (Barista)',
      text: 'Thank you! I tried to make it feel like home. Everyone needs a warm place to rest.',
      next: null,
    },
  },
};
