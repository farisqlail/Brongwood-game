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

const CAFE_W = 640; // pixels
const CAFE_H = 400; // pixels

export class CafeScene extends Phaser.Scene {
  private player!: Player;
  private barista!: NPC;
  private dialogueSystem!: DialogueSystem;
  private mobileControls!: MobileControls;
  private promptText!: Phaser.GameObjects.Text;
  private nearbyNPC: NPC | null = null;
  private exiting: boolean = false;
  private coffeeOrdered: boolean = false;

  // Named handlers so we can remove them from EventBus on shutdown
  private readonly onChoiceMade = (p: GameEvents['dialogue:choice-made']) => {
    if (p.dialogueId === 'barista_chat' && p.choiceId === 'coffee') {
      this.coffeeOrdered = true;
    }
  };

  private readonly onDialogueEnded = () => {
    this.barista.unfreeze();
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

    // Background
    this.add.rectangle(CAFE_W / 2, CAFE_H / 2, CAFE_W, CAFE_H, 0x5a4030).setDepth(DEPTH.GROUND);

    // Floor pattern
    for (let x = 0; x < CAFE_W; x += 32) {
      for (let y = 0; y < CAFE_H; y += 32) {
        if ((x / 32 + y / 32) % 2 === 0) {
          this.add.rectangle(x + 16, y + 16, 31, 31, 0x6a5040, 0.4).setDepth(DEPTH.GROUND);
        }
      }
    }

    // Walls
    this.add.rectangle(CAFE_W / 2, 16, CAFE_W, 32, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(16, CAFE_H / 2, 32, CAFE_H, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(CAFE_W - 16, CAFE_H / 2, 32, CAFE_H, 0x3a2820).setDepth(DEPTH.GROUND_DECOR);

    // Counter
    this.add.rectangle(CAFE_W / 2, 100, 300, 16, 0x8a6040).setDepth(DEPTH.ENTITIES);

    // Tables
    this.add.rectangle(180, 240, 60, 40, 0x7a5838).setDepth(DEPTH.ENTITIES);
    this.add.rectangle(460, 240, 60, 40, 0x7a5838).setDepth(DEPTH.ENTITIES);

    // Exit indicator
    const exitLabel = this.add.text(CAFE_W / 2, CAFE_H - 20, '[ EXIT - walk down ]', {
      fontSize: '8px', color: '#f2a65a', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH.UI);
    this.tweens.add({ targets: exitLabel, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Player (no world bounds — free to walk to exit)
    this.player = new Player(this, CAFE_W / 2, CAFE_H - 80);
    this.player.sprite.setCollideWorldBounds(false);

    // Wall colliders (top, left, right only — bottom is open for exit)
    const wallTop = this.physics.add.staticBody(0, 0, CAFE_W, 40);
    const wallLeft = this.physics.add.staticBody(0, 0, 40, CAFE_H);
    const wallRight = this.physics.add.staticBody(CAFE_W - 40, 0, 40, CAFE_H);
    const counterBody = this.physics.add.staticBody(CAFE_W / 2 - 150, 92, 300, 16);

    this.physics.add.collider(this.player.sprite, wallTop as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, wallLeft as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, wallRight as unknown as Phaser.Physics.Arcade.StaticBody);
    this.physics.add.collider(this.player.sprite, counterBody as unknown as Phaser.Physics.Arcade.StaticBody);

    // Barista
    this.barista = new NPC(this, {
      id: 'barista',
      textureKey: TEXTURE_KEYS.NPC_BAKER,
      x: CAFE_W / 2,
      y: 70,
      scale: 0.9,
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
    EventBus.on('dialogue:choice-made', this.onChoiceMade, this);
    EventBus.on('dialogue:ended',       this.onDialogueEnded, this);

    // Stop outdoor audio
    proceduralAudio.stopBirds();
    proceduralAudio.stopWind();

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.events.on('shutdown', () => {
      EventBus.off('dialogue:choice-made', this.onChoiceMade);
      EventBus.off('dialogue:ended',       this.onDialogueEnded);
      this.dialogueSystem.destroy();
      this.barista.destroy();
      this.mobileControls.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.exiting) return;

    // Mobile joystick
    if (this.mobileControls.visible) {
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
