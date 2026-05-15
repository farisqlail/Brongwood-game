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
import { InventoryItem } from '@/types/inventory';
import { RIKA_MESSAGES } from '@/dialogue/messages/RikaMessages';
import { TOWN_NPCS } from '@config/npcs.config';
import { STARTING_MONEY } from '@config/economy.config';
import { FIRST_DAY_FLAG, FirstDayStage, getNextFirstDayStage } from '@config/firstDay.config';

export const MAX_STAMINA = 100;
const PASSIVE_STAMINA_DRAIN_INTERVAL_MINUTES = 60;
const PASSIVE_STAMINA_DRAIN_DAY = 1;
const PASSIVE_STAMINA_DRAIN_EVENING = 1;
const PASSIVE_STAMINA_DRAIN_LATE_NIGHT = 2;
const SHIPPING_VALUE_KEY = 'shippingBinValue';
const SHIPPING_COUNT_KEY = 'shippingBinCount';
const SHIPPING_PRICES: Record<string, number> = {
  carrot: 80,
  red_onion: 120,
  flower: 35,
  gem: 250,
  meat_1: 90,
  meat_2: 110,
  meat_3: 95,
  meat_4: 160,
  meat_5: 105,
  small_fish: 85,
  rare_fish: 320,
  coffee: 6000,
  cake: 9000,
  nasi_campur: 14000,
};

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
  private _lastPassiveStaminaDrainMinute: number = 0;
  public gameFlags: Record<string, boolean | number | string> = {};

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

    this.initializeRelationships();

    // Register Rika's phone messages
    this.phone.scheduleAll(RIKA_MESSAGES);
  }

  registerSceneSystems(systems: Partial<SceneSystems>): void {
    if ('atmosphere' in systems) this._sceneSystems.atmosphere = systems.atmosphere ?? null;
    if ('audio' in systems) this._sceneSystems.audio = systems.audio ?? null;
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
    this.updatePassiveStaminaDrain();
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
      phone: this.phone.serialize(),
      completedEvents: [],
      dialogueFlags: {},
      gameFlags: this.gameFlags,
    });
  }

  loadGame(slot: number): SaveData | null {
    const data = this.save.load(slot);
    if (!data) return null;

    this.time.deserialize(data.time);
    this._lastPassiveStaminaDrainMinute = this.time.totalMinutes;
    this.relationships.deserialize(data.relationships);
    this.phone.deserialize(data.phone);
    this.gameFlags = data.gameFlags ?? {};
    this.initializeRelationships();
    this.npcSchedules.evaluateAll();

    return data;
  }

  newGame(): void {
    const defaults = SaveSystem.createNewGameData();
    this.time.setTime(defaults.time.hour, defaults.time.minute, defaults.time.day);
    this._lastPassiveStaminaDrainMinute = this.time.totalMinutes;
    this.relationships.deserialize({});
    this.phone.deserialize({ threads: {}, delivered: [] });
    this.initializeRelationships();
    this.gameFlags = {
      money: STARTING_MONEY,
      stamina: MAX_STAMINA,
      [FIRST_DAY_FLAG]: 'wake_up',
    };
    this.npcSchedules.evaluateAll();
  }

  get money(): number {
    const value = this.gameFlags.money;
    return typeof value === 'number' ? value : STARTING_MONEY;
  }

  setMoney(amount: number): void {
    this.gameFlags.money = Math.max(0, Math.floor(amount));
  }

  get maxStamina(): number {
    return MAX_STAMINA;
  }

  get stamina(): number {
    const value = this.gameFlags.stamina;
    return typeof value === 'number' ? Math.max(0, Math.min(MAX_STAMINA, value)) : MAX_STAMINA;
  }

  get staminaRatio(): number {
    return this.stamina / MAX_STAMINA;
  }

  get isExhausted(): boolean {
    return this.stamina <= 0;
  }

  consumeStamina(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (cost <= 0) return true;
    if (this.stamina < cost) return false;
    this.gameFlags.stamina = this.stamina - cost;
    return true;
  }

  restoreStamina(amount: number): void {
    this.gameFlags.stamina = Math.min(MAX_STAMINA, this.stamina + Math.max(0, Math.floor(amount)));
  }

  resetStamina(): void {
    this.gameFlags.stamina = MAX_STAMINA;
    this._lastPassiveStaminaDrainMinute = this.time.totalMinutes;
  }

  get firstDayStage(): FirstDayStage {
    const value = this.gameFlags[FIRST_DAY_FLAG];
    return typeof value === 'string' ? value as FirstDayStage : 'complete';
  }

  isFirstDayActive(): boolean {
    return this.firstDayStage !== 'complete';
  }

  setFirstDayStage(stage: FirstDayStage): void {
    this.gameFlags[FIRST_DAY_FLAG] = stage;
  }

  advanceFirstDay(expectedStage?: FirstDayStage): FirstDayStage {
    const current = this.firstDayStage;
    if (current === 'complete') return current;
    if (expectedStage && current !== expectedStage) return current;

    const next = getNextFirstDayStage(current);
    this.setFirstDayStage(next);
    return next;
  }

  addMoney(amount: number): number {
    const next = this.money + Math.max(0, Math.floor(amount));
    this.setMoney(next);
    return this.money;
  }

  spendMoney(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (this.money < cost) return false;
    this.setMoney(this.money - cost);
    return true;
  }

  get shippingBinValue(): number {
    const value = this.gameFlags[SHIPPING_VALUE_KEY];
    return typeof value === 'number' ? Math.max(0, Math.floor(value)) : 0;
  }

  get shippingBinCount(): number {
    const value = this.gameFlags[SHIPPING_COUNT_KEY];
    return typeof value === 'number' ? Math.max(0, Math.floor(value)) : 0;
  }

  getShippingPrice(item: InventoryItem): number {
    if (item.icon === 'tool' || item.id.endsWith('_seed') || item.id === 'seed_bag') return 0;
    if (item.id === 'letter' || item.id === 'old_key' || item.id === 'book') return 0;

    const quality = item.id.match(/^(.*)_(silver|gold)$/);
    const baseId = quality?.[1] ?? item.id;
    const multiplier = quality?.[2] === 'gold' ? 2 : quality?.[2] === 'silver' ? 1.5 : 1;
    const basePrice = SHIPPING_PRICES[baseId] ?? 0;

    return Math.floor(basePrice * multiplier);
  }

  shipInventorySlot(slotIndex: number): { success: boolean; message: string; value: number; itemName?: string } {
    const item = this.inventory.getSlot(slotIndex);
    if (!item) return { success: false, message: 'Pilih item dulu', value: 0 };

    const value = this.getShippingPrice(item);
    if (value <= 0) {
      return { success: false, message: 'Item ini tidak bisa dijual', value: 0, itemName: item.name };
    }

    const shipped = this.inventory.consumeOneAtSlot(slotIndex);
    if (!shipped) return { success: false, message: 'Item tidak ditemukan', value: 0 };

    this.gameFlags[SHIPPING_VALUE_KEY] = this.shippingBinValue + value;
    this.gameFlags[SHIPPING_COUNT_KEY] = this.shippingBinCount + 1;

    return { success: true, message: `${shipped.name} masuk shipping bin`, value, itemName: shipped.name };
  }

  claimShippingBin(): number {
    const payout = this.shippingBinValue;
    if (payout <= 0) return 0;

    this.addMoney(payout);
    this.gameFlags[SHIPPING_VALUE_KEY] = 0;
    this.gameFlags[SHIPPING_COUNT_KEY] = 0;
    return payout;
  }

  private initializeRelationships(): void {
    this.relationships.initRelationship('rika');
    for (const npc of TOWN_NPCS) {
      this.relationships.initRelationship(npc.id);
    }
    if (typeof this.gameFlags.money !== 'number') {
      this.gameFlags.money = STARTING_MONEY;
    }
    if (typeof this.gameFlags.stamina !== 'number') {
      this.gameFlags.stamina = MAX_STAMINA;
    }
    if (typeof this.gameFlags[SHIPPING_VALUE_KEY] !== 'number') {
      this.gameFlags[SHIPPING_VALUE_KEY] = 0;
    }
    if (typeof this.gameFlags[SHIPPING_COUNT_KEY] !== 'number') {
      this.gameFlags[SHIPPING_COUNT_KEY] = 0;
    }
    if (this._lastPassiveStaminaDrainMinute <= 0) {
      this._lastPassiveStaminaDrainMinute = this.time.totalMinutes;
    }
  }

  private updatePassiveStaminaDrain(): void {
    const currentMinute = this.time.totalMinutes;

    if (this._lastPassiveStaminaDrainMinute <= 0) {
      this._lastPassiveStaminaDrainMinute = currentMinute;
      return;
    }

    const elapsedIntervals = Math.floor(
      (currentMinute - this._lastPassiveStaminaDrainMinute) / PASSIVE_STAMINA_DRAIN_INTERVAL_MINUTES,
    );
    if (elapsedIntervals <= 0 || this.stamina <= 0) return;

    const drain = this.getPassiveStaminaDrainAmount() * elapsedIntervals;
    this.gameFlags.stamina = Math.max(0, this.stamina - drain);
    this._lastPassiveStaminaDrainMinute += elapsedIntervals * PASSIVE_STAMINA_DRAIN_INTERVAL_MINUTES;
  }

  private getPassiveStaminaDrainAmount(): number {
    const hour = this.time.hour;

    if (hour >= 22 || hour < 5) {
      return PASSIVE_STAMINA_DRAIN_LATE_NIGHT;
    }

    if (hour >= 18) {
      return PASSIVE_STAMINA_DRAIN_EVENING;
    }

    return PASSIVE_STAMINA_DRAIN_DAY;
  }
}

export const gameManager = new GameManagerImpl();
