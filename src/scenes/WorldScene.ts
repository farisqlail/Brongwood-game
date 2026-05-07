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
import { TOWN_NPCS } from '@config/npcs.config';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';
import { ParticleSystem } from '@/systems/ParticleSystem';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private mapData!: ParsedMapData;

  // NPCs
  private rika!: NPC;
  private townNPCs: NPC[] = [];

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

  // Audio
  private footstepTimer: number = 0;
  private wasRaining: boolean = false;

  // Mobile controls
  private mobileControls!: MobileControls;
  private particleSystem!: ParticleSystem;

  // Map
  private mapKey: string = 'downtown';
  private spawnId?: string;
  private isTransitioning: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.WORLD });
  }

  init(data?: { map?: string; spawn?: string }): void {
    this.mapKey = data?.map ?? 'downtown';
    this.spawnId = data?.spawn;
    this.isTransitioning = false;
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

    // Speed up time for testing (10x — 1 real second = 10 game minutes)
    gameManager.time.setSpeed(10);

    // Mobile controls (joystick + action button)
    this.mobileControls = new MobileControls(this);

    // Ambient particles (leaves, dust, fireflies at night)
    this.particleSystem = new ParticleSystem(this);

    // Initialize audio on first click (browser requires user gesture)
    this.input.once('pointerdown', () => {
      proceduralAudio.init();
      proceduralAudio.resume();
      proceduralAudio.startWind(0.3);
      proceduralAudio.startBirds();
    });

    this.createClockUI();
    this.createDebugUI();

    this.events.on('shutdown', this.onShutdown, this);
  }

  update(_time: number, delta: number): void {
    gameManager.update(delta);

    // Feed mobile joystick into player movement
    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);

      // Mobile action button = interact
      if (this.mobileControls.actionPressed && this.nearbyNPC && !this.dialogueSystem.isActive) {
        proceduralAudio.playClick();
        this.startNPCDialogue(this.nearbyNPC);
      }
    }

    this.player.update();
    this.rika.update(delta);
    for (const npc of this.townNPCs) npc.update(delta);
    this.weatherSystem.update(delta);
    this.vegetationSystem.update(delta);
    this.particleSystem.update(delta);

    // Check NPC proximity for interaction prompt
    this.checkNPCProximity();

    // Audio: footsteps when walking
    if (this.player.isMoving && proceduralAudio.initialized) {
      this.footstepTimer += delta;
      if (this.footstepTimer > 350) {
        this.footstepTimer = 0;
        proceduralAudio.playFootstep();
      }
    } else {
      this.footstepTimer = 0;
    }

    // Audio: sync rain sound with weather system
    if (proceduralAudio.initialized) {
      const isRaining = this.weatherSystem.isRaining;
      if (isRaining && !this.wasRaining) {
        proceduralAudio.startRain(0.5);
      } else if (!isRaining && this.wasRaining) {
        proceduralAudio.stopRain();
      }
      this.wasRaining = isRaining;

      // Birds only during day (stop at night)
      const period = gameManager.time.period;
      if (period === 'night' || period === 'late_night') {
        proceduralAudio.stopBirds();
      }
    }
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
   * Spawn all NPCs — Rika + 10 townspeople.
   */
  private spawnNPCs(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    // Rika (main NPC) — random spawn position away from player
    const rikaSpawnX = Phaser.Math.Between(ts * 2, ts * 13);
    const rikaSpawnY = Phaser.Math.Between(ts * 2, ts * 8);
    // Make sure she doesn't spawn on the road (rows 4-5)
    const rikaY = (rikaSpawnY >= ts * 4 && rikaSpawnY <= ts * 6) ? ts * 7 : rikaSpawnY;

    this.rika = new NPC(this, {
      id: 'rika',
      textureKey: TEXTURE_KEYS.RIKA,
      x: rikaSpawnX,
      y: rikaY,
      scale: 0.7,
      direction: 'down',
      interactionRadius: 50,
    });
    this.rika.enableWander(60);
    this.physics.add.collider(this.player.sprite, this.rika.sprite);

    // 10 Town NPCs
    for (const npcData of TOWN_NPCS) {
      const npc = new NPC(this, {
        id: npcData.id,
        textureKey: npcData.textureKey,
        x: npcData.x,
        y: npcData.y,
        scale: 0.9,
        direction: 'down',
        interactionRadius: 40,
      });
      npc.enableWander(npcData.wanderRadius);
      this.physics.add.collider(this.player.sprite, npc.sprite);
      this.townNPCs.push(npc);
    }
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
        proceduralAudio.playClick();
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
    for (const npc of this.townNPCs) {
      this.physics.add.collider(npc.sprite, this.vegetationSystem.collisionGroup);
    }

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

    // Unfreeze all NPCs when dialogue ends
    EventBus.on('dialogue:ended', () => {
      this.rika.unfreeze();
      for (const npc of this.townNPCs) npc.unfreeze();
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

    // Check Rika first
    const allNPCs: NPC[] = [this.rika, ...this.townNPCs];
    let closest: NPC | null = null;
    let closestDist = Infinity;

    for (const npc of allNPCs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.sprite.x, npc.sprite.y
      );
      if (dist < 55 && dist < closestDist) {
        closest = npc;
        closestDist = dist;
      }
    }

    if (closest) {
      this.nearbyNPC = closest;
      this.promptText.setVisible(true);
      closest.playerInRange = true;
    } else {
      if (this.nearbyNPC) this.nearbyNPC.playerInRange = false;
      this.nearbyNPC = null;
      this.promptText.setVisible(false);
    }
  }

  /**
   * Start dialogue with an NPC.
   */
  private startNPCDialogue(npc: NPC): void {
    // Face each other
    npc.faceToward(this.player.x, this.player.y);

    // Freeze NPC during conversation
    npc.freeze();

    // Hide prompt
    this.promptText.setVisible(false);

    // If it's Rika, use her special dialogue system
    if (npc.id === 'rika') {
      gameManager.relationships.recordInteraction('rika', gameManager.time.day);

      const hasMetRika = gameManager.relationships.hasFlag('rika', 'met_rika');
      const dialogue = getRikaDialogue(hasMetRika, gameManager.time.period);

      // Check if rainy night event should trigger
      if (!hasMetRika || gameManager.time.period === 'night' || gameManager.time.period === 'late_night') {
        if (this.eventSystem.checkTriggers()) return;
      }

      this.dialogueSystem.start(dialogue);
      return;
    }

    // For town NPCs, find their dialogue from config
    const npcData = TOWN_NPCS.find(n => n.id === npc.id);
    if (npcData) {
      this.dialogueSystem.start(npcData.dialogue);
    }
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

  private handleSceneTransition(targetScene?: string, spawnId?: string): void {
    if (!targetScene || this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.freeze();
    // Go through PreloadScene to ensure clean reload
    this.scene.start(SCENE_KEYS.PRELOAD, {
      nextScene: targetScene,
      nextData: { spawn: spawnId },
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
    this.particleSystem.destroy();
    this.rika.destroy();
    for (const npc of this.townNPCs) npc.destroy();
    this.mobileControls.destroy();
    proceduralAudio.stopAll();
  }

  // ============================================================
  // CLOCK UI (visible to player)
  // ============================================================

  private createClockUI(): void {
    const w = GAME_CONFIG.WIDTH;

    // Background panel
    const clockBg = this.add.rectangle(w - 52, 14, 96, 24, 0x000000, 0.55);
    clockBg.setStrokeStyle(1, 0xffffff, 0.15);
    clockBg.setScrollFactor(0);
    clockBg.setDepth(DEPTH.UI);

    // Time text
    const clockText = this.add.text(w - 52, 9, '', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    clockText.setOrigin(0.5);
    clockText.setScrollFactor(0);
    clockText.setDepth(DEPTH.UI + 1);

    // Weather/period indicator
    const weatherText = this.add.text(w - 52, 19, '', {
      fontSize: '6px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    weatherText.setOrigin(0.5);
    weatherText.setScrollFactor(0);
    weatherText.setDepth(DEPTH.UI + 1);

    this.events.on('update', () => {
      const time = gameManager.time;
      const timeStr = formatTime(time.hour, time.minute);
      clockText.setText(`Day ${time.day}  ${timeStr}`);

      // Weather + period info
      const weather = this.weatherSystem.isRaining ? '~ Rain' : '';
      const periodName = time.period.replace('_', ' ');
      weatherText.setText(`${periodName} ${weather}`);

      // Color based on period
      if (time.period === 'night' || time.period === 'late_night') {
        clockText.setColor('#8899cc');
        weatherText.setColor('#6677aa');
      } else if (time.period === 'evening') {
        clockText.setColor('#f2a65a');
        weatherText.setColor('#c08040');
      } else if (time.period === 'dawn') {
        clockText.setColor('#f0b8a0');
        weatherText.setColor('#c09080');
      } else {
        clockText.setColor('#ffffff');
        weatherText.setColor('#aaaaaa');
      }
    });
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
