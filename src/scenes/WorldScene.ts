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
import { TEXTURE_KEYS } from '@config/assets.manifest';
import { RAINY_NIGHT_FLOWER_SHOP } from '@/dialogue/events/RainyNightFlowerShop';
import { getRikaDialogue } from '@/dialogue/RikaDialogue';
import { TOWN_NPCS } from '@config/npcs.config';
import { proceduralAudio } from '@/audio/ProceduralAudio';
import { MobileControls } from '@/ui/MobileControls';
import { ParticleSystem } from '@/systems/ParticleSystem';
import { MinimapSystem } from '@/ui/MinimapSystem';
import { InventoryUI } from '@/ui/InventoryUI';
import { PhoneUI } from '@/ui/PhoneUI';
import { ActivityZoneUI, ActivityZoneConfig } from '@/ui/ActivityZoneUI';
import { ActivitySystem } from '@/systems/ActivitySystem';
import { PauseMenuUI } from '@/ui/PauseMenuUI';
import { bootstrapGameplayAudio } from '@/systems/SceneAudioBootstrap';

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
  private minimapSystem!: MinimapSystem;

  // Inventory UI (data lives in gameManager.inventory)
  private inventoryUI!: InventoryUI;

  // Phone UI
  private phoneUI!: PhoneUI;

  // Activity system + zones
  private activitySystem!: ActivitySystem;
  private activityZoneUI!: ActivityZoneUI;

  // Pause menu
  private pauseMenu!: PauseMenuUI;

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
    this.townNPCs = [];
    this.nearbyNPC = null;
  }

  create(): void {
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.loadMap();
    this.spawnPlayer();
    this.spawnNPCs();
    this.setupCamera();
    this.setupCollisions();
    this.setupZones();
    this.setupPlayerHouseEntrance();
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

    // Minimap (top-left corner)
    this.minimapSystem = new MinimapSystem(this, this.mapData.widthInPixels, this.mapData.heightInPixels);

    // Inventory UI — data is stored in gameManager.inventory (persists across scenes)
    this.inventoryUI = new InventoryUI(this, gameManager.inventory);
    this.inventoryUI.redrawSlots();

    // Phone UI — visual interface for reading Rika's messages
    this.phoneUI = new PhoneUI(this);

    // Activity system + zones (fishing, bench, garden, stargazing)
    this.activitySystem = new ActivitySystem();
    this.activityZoneUI = new ActivityZoneUI(this, this.activitySystem);
    this.setupActivityZones();

    // Pause menu (ESC key + minimap click)
    this.pauseMenu = new PauseMenuUI(this);

    bootstrapGameplayAudio(this);
    proceduralAudio.startWind(0.3);
    proceduralAudio.startBirds();

    this.events.on('shutdown', this.onShutdown, this);
    this.events.on('wake', this.onWake, this);
  }

  update(_time: number, delta: number): void {
    // Skip all updates when pause menu is open
    if (this.pauseMenu.opened) return;

    gameManager.update(delta);

    // ─── Edge transitions ke activity maps ───────────────────
    if (!this.isTransitioning && this.mapData) {
      const px = this.player.sprite.x;
      const py = this.player.sprite.y;
      const mw = this.mapData.widthInPixels;
      const mh = this.mapData.heightInPixels;

      if (px > mw - 50)      this.transitionToActivityMap('FishingScene');
      else if (py < 50)      this.transitionToActivityMap('GardenScene');
      else if (px < 50)      this.transitionToActivityMap('HomesteadScene');
      else if (py > mh - 50) this.transitionToActivityMap('BenchScene'); // fallback bawah
    }

    // Feed mobile joystick into player movement
    if (this.mobileControls.visible) {
      const js = this.mobileControls.joystickState;
      this.player.setJoystickInput(js.isActive, js.forceX, js.forceY);

      // Mobile action button = interact
      if (this.mobileControls.actionPressed && !this.dialogueSystem.isActive && !this.phoneUI.opened) {
        if (this.activityZoneUI.isActivityActive) {
          this.activityZoneUI.cancelActivity();
        } else if (this.activityZoneUI.isInZone && !this.nearbyNPC) {
          proceduralAudio.playClick();
          this.activityZoneUI.startActivity();
        } else if (this.nearbyNPC) {
          proceduralAudio.playClick();
          this.startNPCDialogue(this.nearbyNPC);
        }
      }
    }

    this.player.update();
    this.rika.update(delta);
    for (const npc of this.townNPCs) npc.update(delta);
    this.weatherSystem.update(delta);
    this.vegetationSystem.update(delta);
    this.particleSystem.update(delta);
    this.minimapSystem.update(this.player.x, this.player.y, this.rika, this.townNPCs, this.weatherSystem.isRaining);
    this.inventoryUI.redrawSlots();
    this.phoneUI.update();
    this.activitySystem.update(delta);
    this.activityZoneUI.update(delta);

    // Check NPC proximity for interaction prompt (skip if phone is open or activity running)
    if (!this.phoneUI.opened && !this.activityZoneUI.isActivityActive) {
      this.checkNPCProximity();
      // Hide NPC prompt if player is in activity zone (activity prompt takes priority when no NPC nearby)
      if (!this.nearbyNPC && this.activityZoneUI.isInZone) {
        this.promptText.setVisible(false);
      }
    } else {
      this.promptText.setVisible(false);
    }

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
   * Setup the player's house entrance in the world.
   * House is at bottom-left area (tile 4, row 8) — one of the existing house positions.
   */
  private setupPlayerHouseEntrance(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    // House entrance position (bottom-left house area)
    const houseX = ts * 4;
    const houseY = ts * 8;
    const doorW = ts * 1.2;
    const doorH = ts * 0.6;

    // Overlap zone for entering the house
    const enterZone = this.add.zone(houseX, houseY, doorW, doorH);
    this.physics.add.existing(enterZone, true);
    this.physics.add.overlap(
      this.player.sprite, enterZone,
      () => this.enterPlayerHouse(),
      undefined, this
    );
  }

  private enterPlayerHouse(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.freeze();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep();
      this.scene.run('PlayerHouseScene');
    });
  }

  /**
   * Setup interaction input (E key) and prompt UI.
   */
  private setupInteraction(): void {
    // E key for interaction
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Prompt text (hidden by default)
    // Position above the inventory bar (SLOT_Y = HEIGHT - 38, bar starts ~HEIGHT - 43)
    this.promptText = this.add.text(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 55,
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
    this.promptText.setDepth(DEPTH.UI + 15);  // above inventory (UI+10)
    this.promptText.setVisible(false);

    // Handle E key press
    this.interactKey.on('down', () => {
      // If an activity is running, E cancels it
      if (this.activityZoneUI.isActivityActive) {
        this.activityZoneUI.cancelActivity();
        return;
      }

      // If player is in an activity zone, start the activity
      if (this.activityZoneUI.isInZone && !this.dialogueSystem.isActive && !this.phoneUI.opened) {
        proceduralAudio.playClick();
        this.activityZoneUI.startActivity();
        return;
      }

      // Otherwise, interact with NPC
      if (this.nearbyNPC && !this.dialogueSystem.isActive && !this.phoneUI.opened) {
        proceduralAudio.playClick();
        this.startNPCDialogue(this.nearbyNPC);
      }
    });

    // P key to toggle phone
    const phoneKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    phoneKey.on('down', () => {
      if (!this.dialogueSystem.isActive && !this.activityZoneUI.isActivityActive && !this.pauseMenu.opened) {
        proceduralAudio.playClick();
        this.phoneUI.toggle();
      }
    });

    // ESC key to toggle pause menu
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on('down', () => {
      // Close phone first if open
      if (this.phoneUI.opened) {
        this.phoneUI.close();
        return;
      }
      proceduralAudio.playClick();
      this.pauseMenu.toggle();
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

    // Hide inventory + mobile controls during dialogue
    EventBus.on('dialogue:started', () => {
      this.inventoryUI.setVisible(false);
      this.mobileControls.setGameVisible(false);
      this.phoneUI.setVisible(false);
    }, this);

    // Unfreeze all NPCs when dialogue ends, restore UI
    EventBus.on('dialogue:ended', () => {
      this.rika.unfreeze();
      for (const npc of this.townNPCs) npc.unfreeze();
      this.inventoryUI.setVisible(true);
      this.mobileControls.setGameVisible(true);
      this.phoneUI.setVisible(true);
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
      gameManager.relationships.recordInteraction(npc.id, gameManager.time.day);
      this.dialogueSystem.start(npcData.dialogue);
    }
  }

  // ============================================================
  // ACTIVITY ZONES
  // ============================================================

  /**
   * Setup activity zones dan edge transitions.
   *
   * Fishing, Garden, Bench → maps terpisah (dicapai lewat tepi peta).
   * Stargazing → tetap sebagai activity zone di dalam downtown.
   */
  private setupActivityZones(): void {
    const ts = GAME_CONFIG.TILE_SIZE;

    // Hanya stargazing yang tersisa di dalam downtown
    const zoneConfigs: ActivityZoneConfig[] = [
      {
        id: 'stargazing',
        x: ts * 11,
        y: ts * 1,
        width: ts * 2,
        height: ts * 2,
      },
    ];

    this.activityZoneUI.createZones(this.player.sprite, zoneConfigs);

    // Minimap markers
    const minimapMarkers = zoneConfigs.map(z => ({
      id: z.id,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      color: this.getSignInfo(z.id).color,
      icon: this.getSignInfo(z.id).icon,
    }));

    minimapMarkers.push({
      id: 'house',
      x: ts * 3.5,
      y: ts * 7.5,
      width: ts * 1.2,
      height: ts * 0.6,
      color: 0xffaa44,
      icon: '\u{1F3E0}',
    });

    this.minimapSystem.setZoneMarkers(minimapMarkers);
  }

  /**
   * Buat tanda panah di tepi peta untuk memberi tahu player
   * bahwa mereka bisa berjalan ke sana menuju activity map.
   */
  private createEdgeIndicators(): void {
    if (!this.mapData) return;
    const mw = this.mapData.widthInPixels;
    const mh = this.mapData.heightInPixels;

    const indicators: Array<{ x: number; y: number; label: string; icon: string; arrow: string }> = [
      { x: mw - 24, y: mh / 2,  label: 'Pantai',  icon: '🎣', arrow: '→' },
      { x: mw / 2,  y: 24,      label: 'Kebun',   icon: '🌱', arrow: '↑' },
      { x: 24,      y: mh / 2,  label: 'Taman',   icon: '🪑', arrow: '←' },
    ];

    for (const ind of indicators) {
      const g = this.add.graphics().setDepth(DEPTH.ENTITIES - 1);
      g.fillStyle(0x8b6b3d, 0.85);
      g.fillRoundedRect(ind.x - 26, ind.y - 12, 52, 24, 3);
      g.lineStyle(1, 0xf2a65a, 0.7);
      g.strokeRoundedRect(ind.x - 26, ind.y - 12, 52, 24, 3);

      this.add.text(ind.x, ind.y - 3, `${ind.arrow} ${ind.label}`, {
        fontSize: '5px', color: '#f2e8d0', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);

      this.add.text(ind.x, ind.y + 7, ind.icon, {
        fontSize: '8px',
      }).setOrigin(0.5).setDepth(DEPTH.ENTITIES);
    }
  }

  /**
   * Draw visible sign posts at each activity zone so players can find them.
   * Each sign has a wooden post + board with the activity name.
   */
  private createZoneMarkers(zones: ActivityZoneConfig[]): void {
    for (const zone of zones) {
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;

      // Draw a sign post (wooden post + sign board)
      this.createSignPost(cx, cy - 24, zone.id);

      // Ground glow circle to highlight the zone area
      const glowGraphics = this.add.graphics();
      glowGraphics.setDepth(DEPTH.GROUND_DECOR);
      glowGraphics.fillStyle(0xf2a65a, 0.08);
      glowGraphics.fillCircle(cx, cy, Math.max(zone.width, zone.height) / 2);
      glowGraphics.lineStyle(1, 0xf2a65a, 0.3);
      glowGraphics.strokeCircle(cx, cy, Math.max(zone.width, zone.height) / 2);
    }
  }

  /**
   * Create a pixel-art style sign post at the given position.
   */
  private createSignPost(x: number, y: number, activityId: string): void {
    const signInfo = this.getSignInfo(activityId);

    // Sign post (wooden pole)
    const postGraphics = this.add.graphics();
    postGraphics.setDepth(DEPTH.ENTITIES - 1);
    postGraphics.fillStyle(0x5c3a1e, 1); // dark wood
    postGraphics.fillRect(x - 2, y, 4, 28); // vertical pole
    // Pole base
    postGraphics.fillStyle(0x3d2510, 1);
    postGraphics.fillRect(x - 4, y + 26, 8, 4);

    // Sign board (rectangle behind text)
    const boardW = 40;
    const boardH = 16;
    const boardX = x - boardW / 2;
    const boardY = y - boardH + 2;

    const boardGraphics = this.add.graphics();
    boardGraphics.setDepth(DEPTH.ENTITIES - 1);
    // Board background
    boardGraphics.fillStyle(0x8b6b3d, 1); // light wood
    boardGraphics.fillRoundedRect(boardX, boardY, boardW, boardH, 2);
    // Board border
    boardGraphics.lineStyle(1, 0x5c3a1e, 1);
    boardGraphics.strokeRoundedRect(boardX, boardY, boardW, boardH, 2);
    // Board highlight (top edge)
    boardGraphics.lineStyle(1, 0xb8956a, 0.5);
    boardGraphics.lineBetween(boardX + 2, boardY + 1, boardX + boardW - 2, boardY + 1);

    // Sign text (activity name)
    const nameText = this.add.text(x, boardY + boardH / 2, signInfo.name, {
      fontSize: '6px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(DEPTH.ENTITIES);

    // Icon above the sign board
    const iconText = this.add.text(x, boardY - 8, signInfo.icon, {
      fontSize: '10px',
      fontFamily: 'monospace',
    });
    iconText.setOrigin(0.5);
    iconText.setDepth(DEPTH.ENTITIES);

    // Subtle floating animation on the icon
    this.tweens.add({
      targets: iconText,
      y: boardY - 11,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private getSignInfo(id: string): { name: string; icon: string; color: number } {
    switch (id) {
      case 'fishing':    return { name: 'Fishing',    icon: '\u{1F3A3}', color: 0x4488cc };
      case 'bench_sit':  return { name: 'Bench',      icon: '\u{1F4BA}', color: 0x88aa66 };
      case 'gardening':  return { name: 'Garden',     icon: '\u{1F331}', color: 0x66bb66 };
      case 'animal_care': return { name: 'Animals',    icon: '\u{1F404}', color: 0xc49a6c };
      case 'stargazing': return { name: 'Stargaze',   icon: '\u2B50',    color: 0xccaa44 };
      default:           return { name: '???',        icon: '?',         color: 0xaaaaaa };
    }
  }

  // ============================================================
  // TRANSITIONS
  // ============================================================

  private handleSceneTransition(targetScene?: string, spawnId?: string): void {
    if (!targetScene || this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.freeze();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep();
      this.scene.run(targetScene, { spawn: spawnId });
    });
  }

  private transitionToActivityMap(sceneKey: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.player.freeze();

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep();
      this.scene.run(sceneKey);
    });
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  private onWake(): void {
    this.player.unfreeze();
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Clamp player away from map edges so edge-transition check
    // doesn't fire again immediately after returning from an activity map.
    if (this.mapData) {
      const margin = 80;
      const mw = this.mapData.widthInPixels;
      const mh = this.mapData.heightInPixels;
      const cx = Phaser.Math.Clamp(this.player.sprite.x, margin, mw - margin);
      const cy = Phaser.Math.Clamp(this.player.sprite.y, margin, mh - margin);
      this.player.sprite.setPosition(cx, cy);
    }

    // Allow re-entering zones after a short delay
    this.time.delayedCall(600, () => { this.isTransitioning = false; });
  }

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
    this.minimapSystem.destroy();
    this.inventoryUI.destroy();
    this.phoneUI.destroy();
    this.activityZoneUI.destroy();
    this.pauseMenu.destroy();
    proceduralAudio.stopAll();
  }

}
