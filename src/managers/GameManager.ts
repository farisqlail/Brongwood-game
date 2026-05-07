/**
 * GameManager - Top-level orchestrator that owns and coordinates all game systems.
 * 
 * SYSTEM OWNERSHIP:
 * Persistent (survive scene transitions):
 *   - TimeSystem: game clock
 *   - RelationshipSystem: NPC bonds
 *   - NPCScheduleSystem: daily routines
 *   - PhoneSystem: async messages
 *   - StorySystem: narrative progression
 *   - SaveSystem: persistence
 * 
 * Scene-dependent (recreated per scene):
 *   - AtmosphereSystem: lighting overlay
 *   - AudioSystem: BGM + ambience
 *   - WeatherSystem: rain particles
 *   - DialogueSystem: conversation UI
 *   - EventSystem: scripted triggers
 *   - ActivitySystem: fishing/gardening/cafe
 *   - HUDSystem: minimal UI
 */

import { TimeSystem } from '@/systems/TimeSystem';
import { RelationshipSystem } from '@/systems/RelationshipSystem';
import { NPCScheduleSystem } from '@/systems/NPCScheduleSystem';
import { PhoneSystem } from '@/systems/PhoneSystem';
import { StorySystem } from '@/systems/StorySystem';
import { SaveSystem, SaveData } from '@/systems/SaveSystem';
import { InventorySystem } from '@/systems/InventorySystem';
import { RIKA_MESSAGES } from '@/dialogue/messages/RikaMessages';

/**
 * Scene-dependent systems that need a Phaser scene reference.
 */
export interface SceneSystems {
  atmosphere: import('@/systems/AtmosphereSystem').AtmosphereSystem | null;
  audio: import('@/systems/AudioSystem').AudioSystem | null;
}

class GameManagerImpl {
  // --- Persistent systems ---
  public readonly time: TimeSystem;
  public readonly relationships: RelationshipSystem;
  public readonly npcSchedules: NPCScheduleSystem;
  public readonly phone: PhoneSystem;
  public readonly story: StorySystem;
  public readonly save: SaveSystem;
  public readonly inventory: InventorySystem;

  // --- Scene-dependent systems ---
  private _sceneSystems: SceneSystems = {
    atmosphere: null,
    audio: null,
  };

  // --- State ---
  private _initialized: boolean = false;
  private _gameplayActive: boolean = false;

  constructor() {
    this.time = new TimeSystem();
    this.relationships = new RelationshipSystem();
    this.npcSchedules = new NPCScheduleSystem(this.time);
    this.phone = new PhoneSystem();
    this.story = new StorySystem();
    this.save = new SaveSystem();
    this.inventory = new InventorySystem();
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    // Initialize relationships
    this.relationships.initRelationship('rika');

    // Register Rika's phone messages
    this.phone.scheduleAll(RIKA_MESSAGES);
  }

  registerSceneSystems(systems: Partial<SceneSystems>): void {
    if (systems.atmosphere) this._sceneSystems.atmosphere = systems.atmosphere;
    if (systems.audio) this._sceneSystems.audio = systems.audio;
  }

  clearSceneSystems(): void {
    this._sceneSystems.atmosphere?.destroy();
    this._sceneSystems.audio?.destroy();
    this._sceneSystems = { atmosphere: null, audio: null };
  }

  get sceneSystems(): SceneSystems {
    return this._sceneSystems;
  }

  startGameplay(): void {
    this._gameplayActive = true;
    this.time.resume();
  }

  pauseGameplay(): void {
    this._gameplayActive = false;
    this.time.pause();
  }

  // ============================================================
  // UPDATE
  // ============================================================

  update(delta: number): void {
    if (!this._gameplayActive) return;

    this.time.update(delta);
    this._sceneSystems.atmosphere?.update();
    this.save.updatePlayTime(delta);
  }

  // ============================================================
  // SAVE / LOAD
  // ============================================================

  saveGame(slot: number, playerState: { x: number; y: number; mapKey: string; direction: string }): boolean {
    return this.save.save(slot, {
      player: playerState,
      time: this.time.serialize(),
      relationships: this.relationships.serialize(),
      completedEvents: [],
      dialogueFlags: {},
      gameFlags: {},
    });
  }

  loadGame(slot: number): SaveData | null {
    const data = this.save.load(slot);
    if (!data) return null;

    this.time.deserialize(data.time);
    this.relationships.deserialize(data.relationships);
    this.npcSchedules.evaluateAll();

    return data;
  }

  newGame(): void {
    const defaults = SaveSystem.createNewGameData();
    this.time.setTime(defaults.time.hour, defaults.time.minute, defaults.time.day);
    this.relationships.initRelationship('rika');
    this.npcSchedules.evaluateAll();
  }
}

export const gameManager = new GameManagerImpl();
