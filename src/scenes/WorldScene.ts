/**
 * WorldScene - The main gameplay scene.
 * Now includes Rika NPC with interaction system.
 */

import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, CAMERA_CONFIG, DEPTH } from '@config/game.config';
import { MAP_REGISTRY } from '@config/maps.config';
import { Player } from '@/entities/Player';
import { NPC } from '@/entities/NPC';
import { TilemapManager } from '@/world/TilemapManager';
import { ParsedMapData } from '@/types/tilemap';
import { AtmosphereSystem } from '@/systems/AtmosphereSystem';
import { AudioSystem } from '@/systems/AudioSystem';
import { WeatherSystem } from '@/systems/WeatherSystem';
import { VegetationSystem } from '@/world/VegetationSystem';
import { EventSystem } from '@/systems/EventSystem';
import { DialogueSystem } from '@/dialogue/DialogueSystem';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { formatTime } from '@config/time.config';
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { RAINY_NIGHT_FLOWER_SHOP } from '@/dialogue/events/RainyNightFlowerShop';
import { getRikaDialogue } from '@/dialogue/RikaDialogue';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private mapData!: ParsedMapData;

  // NPCs
  private rika!: NPC;

  // Systems
  private atmosphereSystem!: AtmosphereSystem;
  private audioSystem!: AudioSystem;
  private weatherSystem!: WeatherSystem;
  private vegetationSystem!: VegetationSystem;
  private dialogueSystem!: DialogueSystem;
  private eventSystem!: EventSystem;

  // Interaction
  private interactKey!: Phaser.Input.Keyboard.Key;
  private promptText!: Phaser.GameObjects.Text;
  private nearbyNPC: NPC | null = null;

  // Map
  private mapKey: string = 'downtown';
  private spawnId?: string;

  constructor() {
    super({ key: SCENE_KEYS.WORLD });
  }

  init(data?: { map?: string; spawn?: string }): void {
    if (data?.map) this.mapKey = data.map;
    if (data?.spawn) this.spawnId = data.spawn;
  }

  create(): void {
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.loadMap();
    this.spawnPlayer();
    this.spawnNPCs();
    this.setupCamera();
    this.setupCollisions();
    this.setupZones();
    this.setupInteraction();
    this.initializeSystems();
    this.registerEvents();
    this.setupEventListeners();

    gameManager.startGameplay();
    this.createDebugUI();

    this.events.on('shutdown', this.onShutdown, this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);
    this.player.update();
    this.rika.update(delta);
    this.weatherSystem.update(delta);
    this.vegetationSystem.update(delta);

    // Check NPC proximity for interaction prompt
    this.checkNPCProximity();
  }

  // ============================================================
  // SETUP
  // ============================================================

  private loadMap(): void {
    const mapConfig = MAP_REGISTRY[this.mapKey];
    if (!mapConfig) return;
    this.mapData = TilemapManager.load(this, mapConfig);
    this.physics.world.setBounds(0, 0, this.mapData.widthInPixels, this.mapData.heightInPixels);
  }

  private spawnPlayer(): void {
    const spawn = TilemapManager.findPlayerSpawn(this.mapData.spawns, this.spawnId);
    const spawnX = spawn?.position.x ?? this.mapData.widthInPixels / 2;
    const spawnY = spawn?.position.y ?? this.mapData.heightInPixels / 2;
    this.player = new Player(this, spawnX, spawnY);
  }

  /**
   * Spawn Rika NPC at her position.
   * She stands near the flower shop area (top-left of map).
   */
  private spawnNPCs(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    this.rika = new NPC(this, {
      id: 'rika',
      textureKey: TEXTURE_KEYS.RIKA,
      x: ts * 7.5,
      y: ts * 5,
      scale: 0.7,
      direction: 'down',
      interactionRadius: 50,
    });

    // Enable natural wandering
    this.rika.enableWander(60);

    // Collide player with Rika
    this.physics.add.collider(this.player.sprite, this.rika.sprite);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.startFollow(this.player.sprite, true);
    camera.setLerp(CAMERA_CONFIG.LERP, CAMERA_CONFIG.LERP);
    camera.setDeadzone(CAMERA_CONFIG.DEADZONE_WIDTH, CAMERA_CONFIG.DEADZONE_HEIGHT);
    camera.setBounds(0, 0, this.mapData.widthInPixels, this.mapData.heightInPixels);
    camera.setRoundPixels(true);
  }

  private setupCollisions(): void {
    for (const collisionLayer of this.mapData.collisionLayers) {
      this.physics.add.collider(this.player.sprite, collisionLayer);
    }
    if (this.mapData.collisionBodies) {
      this.physics.add.collider(this.player.sprite, this.mapData.collisionBodies);
    }
  }

  private setupZones(): void {
    for (const zone of this.mapData.zones) {
      const zoneRect = this.add.zone(
        zone.bounds.x + zone.bounds.width / 2,
        zone.bounds.y + zone.bounds.height / 2,
        zone.bounds.width,
        zone.bounds.height
      );
      this.physics.add.existing(zoneRect, true);

      if (zone.type === 'scene_transition') {
        this.physics.add.overlap(
          this.player.sprite, zoneRect,
          () => this.handleSceneTransition(zone.targetScene, zone.spawnId),
          undefined, this
        );
      } else if (zone.type === 'event_trigger') {
        this.physics.add.overlap(
          this.player.sprite, zoneRect,
          () => this.eventSystem.checkTriggers(),
          undefined, this
        );
      }
    }
  }

  /**
   * Setup interaction input (E key) and prompt UI.
   */
  private setupInteraction(): void {
    // E key for interaction
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Prompt text (hidden by default)
    this.promptText = this.add.text(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30,
      '[E] Talk',
      {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#00000099',
        padding: { x: 8, y: 4 },
      }
    );
    this.promptText.setOrigin(0.5);
    this.promptText.setScrollFactor(0);
    this.promptText.setDepth(DEPTH.UI);
    this.promptText.setVisible(false);

    // Handle E key press
    this.interactKey.on('down', () => {
      if (this.nearbyNPC && !this.dialogueSystem.isActive) {
        this.startNPCDialogue(this.nearbyNPC);
      }
    });
  }

  private initializeSystems(): void {
    this.atmosphereSystem = new AtmosphereSystem(this, gameManager.time);
    this.audioSystem = new AudioSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.vegetationSystem = new VegetationSystem(this);
    this.dialogueSystem = new DialogueSystem(this);
    this.eventSystem = new EventSystem();
    this.eventSystem.setDialogueSystem(this.dialogueSystem);

    // All props have collision — player and NPCs can't walk through
    this.physics.add.collider(this.player.sprite, this.vegetationSystem.collisionGroup);
    this.physics.add.collider(this.rika.sprite, this.vegetationSystem.collisionGroup);

    gameManager.registerSceneSystems({
      atmosphere: this.atmosphereSystem,
      audio: this.audioSystem,
    });
  }

  private registerEvents(): void {
    // Rainy Night at Flower Shop event
    this.eventSystem.register({
      id: RAINY_NIGHT_FLOWER_SHOP.id,
      conditions: {
        timePeriods: ['night', 'late_night'],
        relationship: { npcId: 'rika', minStage: 'acquaintance' },
      },
      dialogue: RAINY_NIGHT_FLOWER_SHOP,
      oneShot: true,
      priority: 100,
    });
  }

  private setupEventListeners(): void {
    EventBus.on('event:player-locked', (payload) => {
      if (payload.locked) this.player.freeze();
      else this.player.unfreeze();
    }, this);

    EventBus.on('time:period-changed', () => {
      this.eventSystem.checkTriggers();
    }, this);
  }

  // ============================================================
  // NPC INTERACTION
  // ============================================================

  /**
   * Check if player is near any NPC and show/hide prompt.
   */
  private checkNPCProximity(): void {
    if (this.dialogueSystem.isActive) {
      this.promptText.setVisible(false);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.rika.sprite.x, this.rika.sprite.y
    );

    if (dist < 55) {
      this.nearbyNPC = this.rika;
      this.promptText.setVisible(true);
      this.rika.playerInRange = true;
    } else {
      this.nearbyNPC = null;
      this.promptText.setVisible(false);
      this.rika.playerInRange = false;
    }
  }

  /**
   * Start dialogue with an NPC.
   */
  private startNPCDialogue(npc: NPC): void {
    // Face each other
    npc.faceToward(this.player.x, this.player.y);

    // Record interaction for relationship
    gameManager.relationships.recordInteraction(npc.id, gameManager.time.day);

    // Get appropriate dialogue based on state
    const hasMetRika = gameManager.relationships.hasFlag('rika', 'met_rika');
    const dialogue = getRikaDialogue(hasMetRika, gameManager.time.period);

    // Check if rainy night event should trigger instead
    if (!hasMetRika || gameManager.time.period === 'night' || gameManager.time.period === 'late_night') {
      if (this.eventSystem.checkTriggers()) return; // Event took over
    }

    // Start normal dialogue
    this.dialogueSystem.start(dialogue);
    this.promptText.setVisible(false);
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

  private handleSceneTransition(targetScene?: string, spawnId?: string): void {
    if (!targetScene) return;
    this.player.freeze();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(targetScene, { spawn: spawnId });
    });
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  private onShutdown(): void {
    gameManager.clearSceneSystems();
    gameManager.pauseGameplay();
    this.eventSystem.destroy();
    this.dialogueSystem.destroy();
    this.weatherSystem.destroy();
    this.vegetationSystem.destroy();
    this.rika.destroy();
  }

  // ============================================================
  // DEBUG UI
  // ============================================================

  private createDebugUI(): void {
    const debugText = this.add.text(4, 4, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 2 },
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(DEPTH.UI);

    this.events.on('update', () => {
      const time = gameManager.time;
      const timeStr = formatTime(time.hour, time.minute);
      const weather = this.weatherSystem.isRaining ? 'Rain' : 'Clear';
      const rel = gameManager.relationships.get('rika');
      debugText.setText([
        `Day ${time.day} | ${timeStr} (${time.period}) | ${weather}`,
        `Pos: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
        `Rika: Aff=${rel?.affection ?? 0} Trust=${rel?.trust ?? 0} [${rel?.stage ?? '?'}]`,
      ].join('\n'));
    });
  }
}
