/**
 * CafeScene - Interior of the town cafe.
 * A warm, cozy indoor space with tables, counter, and an NPC barista.
 * Player enters from downtown and can exit back.
 */

import Phaser from 'phaser';
import { GAME_CONFIG, DEPTH, CAMERA_CONFIG } from '@config/game.config';
import { Player } from '@/entities/Player';
import { NPC } from '@/entities/NPC';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { DialogueSystem } from '@/dialogue/DialogueSystem';
import { DialogueDefinition } from '@/dialogue/DialogueTypes';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';

const CAFE_WIDTH = 10; // tiles
const CAFE_HEIGHT = 8; // tiles

export class CafeScene extends Phaser.Scene {
  private player!: Player;
  private barista!: NPC;
  private dialogueSystem!: DialogueSystem;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private promptText!: Phaser.GameObjects.Text;
  private nearbyNPC: NPC | null = null;
  private mobileControls!: MobileControls;
  private isTransitioning: boolean = false;

  constructor() {
    super({ key: 'CafeScene' });
  }

  create(): void {
    const ts = GAME_CONFIG.TILE_SIZE;
    const mapW = CAFE_WIDTH * ts;
    const mapH = CAFE_HEIGHT * ts;

    this.cameras.main.fadeIn(600, 0, 0, 0);

    // Spawn player first (needed for collision setup in drawCafeInterior)
    this.player = new Player(this, mapW / 2, mapH - ts * 1.5);
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // Draw cafe interior (sets up walls, tables, counter with collision)
    this.drawCafeInterior(ts, mapW, mapH);

    // Spawn barista NPC behind counter
    this.barista = new NPC(this, {
      id: 'barista',
      textureKey: TEXTURE_KEYS.NPC_BAKER,
      x: mapW / 2,
      y: ts * 2.5,
      scale: 0.9,
      direction: 'down',
      interactionRadius: 40,
    });

    // Camera
    this.cameras.main.startFollow(this.player.sprite, true);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setRoundPixels(true);

    // Dialogue
    this.dialogueSystem = new DialogueSystem(this);

    // Interaction
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactKey.on('down', () => {
      if (this.nearbyNPC && !this.dialogueSystem.isActive) {
        proceduralAudio.playClick();
        this.barista.freeze();
        this.barista.faceToward(this.player.x, this.player.y);
        this.dialogueSystem.start(BARISTA_DIALOGUE);
        this.promptText.setVisible(false);
      }
    });

    // Prompt
    this.promptText = this.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 20, '[E] Talk', {
      fontSize: '9px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    });
    this.promptText.setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI).setVisible(false);

    // Exit zone (near bottom, but inside world bounds so player can reach it)
    const exitZone = this.add.zone(mapW / 2, mapH - ts * 0.5, mapW * 0.4, ts * 0.8);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player.sprite, exitZone, () => this.exitCafe(), undefined, this);

    // Unfreeze barista on dialogue end
    EventBus.on('dialogue:ended', () => { this.barista.unfreeze(); }, this);

    // Mobile controls
    this.mobileControls = new MobileControls(this);

    // Audio
    proceduralAudio.stopBirds();
    proceduralAudio.stopWind();

    this.events.on('shutdown', () => {
      this.dialogueSystem.destroy();
      this.barista.destroy();
    });
  }

  update(_time: number, delta: number): void {
    // Mobile joystick
    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);

      if (this.mobileControls.actionPressed && this.nearbyNPC && !this.dialogueSystem.isActive) {
        proceduralAudio.playClick();
        this.barista.freeze();
        this.barista.faceToward(this.player.x, this.player.y);
        this.dialogueSystem.start(BARISTA_DIALOGUE);
        this.promptText.setVisible(false);
      }
    }

    this.player.update();
    this.barista.update(delta);

    // Proximity check
    if (!this.dialogueSystem.isActive) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.barista.sprite.x, this.barista.sprite.y
      );
      if (dist < 50) {
        this.nearbyNPC = this.barista;
        this.promptText.setVisible(true);
      } else {
        this.nearbyNPC = null;
        this.promptText.setVisible(false);
      }
    } else {
      this.promptText.setVisible(false);
    }

    // Footsteps
    if (this.player.isMoving && proceduralAudio.initialized) {
      // handled by main scene pattern — simplified here
    }
  }

  private exitCafe(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.freeze();
    // Direct scene switch (fade-in handled by WorldScene)
    this.scene.start('WorldScene', { map: 'downtown', spawn: 'from_cafe' });
  }

  // ============================================================
  // DRAW CAFE INTERIOR (procedural — no tilemap needed)
  // ============================================================

  private drawCafeInterior(ts: number, mapW: number, mapH: number): void {
    // Floor
    const floor = this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x5a4030);
    floor.setDepth(DEPTH.GROUND);

    // Lighter floor tiles pattern
    for (let x = 0; x < CAFE_WIDTH; x++) {
      for (let y = 0; y < CAFE_HEIGHT; y++) {
        if ((x + y) % 2 === 0) {
          const tile = this.add.rectangle(x * ts + ts / 2, y * ts + ts / 2, ts - 1, ts - 1, 0x6a5040, 0.5);
          tile.setDepth(DEPTH.GROUND);
        }
      }
    }

    // Walls (top and sides)
    const wallColor = 0x3a2820;
    this.add.rectangle(mapW / 2, ts / 2, mapW, ts, wallColor).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(ts / 2, mapH / 2, ts, mapH, wallColor).setDepth(DEPTH.GROUND_DECOR);
    this.add.rectangle(mapW - ts / 2, mapH / 2, ts, mapH, wallColor).setDepth(DEPTH.GROUND_DECOR);

    // Counter (horizontal bar near top)
    const counter = this.add.rectangle(mapW / 2, ts * 3.5, mapW * 0.6, ts * 0.4, 0x8a6040);
    counter.setDepth(DEPTH.ENTITIES);

    // Counter collision
    const counterBody = this.physics.add.staticImage(mapW / 2, ts * 3.5, undefined as unknown as string);
    counterBody.setVisible(false);
    counterBody.body!.setSize(mapW * 0.6, ts * 0.4);
    this.physics.add.collider(this.player.sprite, counterBody);

    // Tables (2 tables with chairs)
    this.drawTable(ts * 3, ts * 5.5, ts);
    this.drawTable(ts * 7, ts * 5.5, ts);

    // Wall collisions
    const wallTop = this.physics.add.staticImage(mapW / 2, 0, undefined as unknown as string);
    wallTop.setVisible(false);
    wallTop.body!.setSize(mapW, ts);
    this.physics.add.collider(this.player.sprite, wallTop);

    const wallLeft = this.physics.add.staticImage(0, mapH / 2, undefined as unknown as string);
    wallLeft.setVisible(false);
    wallLeft.body!.setSize(ts, mapH);
    this.physics.add.collider(this.player.sprite, wallLeft);

    const wallRight = this.physics.add.staticImage(mapW, mapH / 2, undefined as unknown as string);
    wallRight.setVisible(false);
    wallRight.body!.setSize(ts, mapH);
    this.physics.add.collider(this.player.sprite, wallRight);

    // Door indicator at bottom
    this.add.rectangle(mapW / 2, mapH - ts * 0.5, ts * 2, ts * 0.5, 0xf2a65a, 0.4).setDepth(DEPTH.GROUND_DECOR);
    const exitLabel = this.add.text(mapW / 2, mapH - ts * 0.8, '[ EXIT ]', {
      fontSize: '7px', color: '#f2a65a', fontFamily: 'monospace',
    });
    exitLabel.setOrigin(0.5).setDepth(DEPTH.UI);
    this.tweens.add({ targets: exitLabel, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
  }

  private drawTable(x: number, y: number, ts: number): void {
    // Table top
    const table = this.add.rectangle(x, y, ts * 1.2, ts * 0.8, 0x7a5838);
    table.setDepth(y);

    // Table collision
    const tableBody = this.physics.add.staticImage(x, y, undefined as unknown as string);
    tableBody.setVisible(false);
    tableBody.body!.setSize(ts * 1.2, ts * 0.8);
    this.physics.add.collider(this.player.sprite, tableBody);

    // Chairs (small squares)
    const chairColor = 0x5a4028;
    this.add.rectangle(x - ts * 0.5, y, ts * 0.3, ts * 0.3, chairColor).setDepth(y - 1);
    this.add.rectangle(x + ts * 0.5, y, ts * 0.3, ts * 0.3, chairColor).setDepth(y - 1);
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
