/**
 * SaveSystem - Persistent game state storage.
 * 
 * WHY THIS ARCHITECTURE:
 * 1. Version-safe: Old saves work with new game versions (migration support)
 * 2. Schema-typed: TypeScript enforces save data shape at compile time
 * 3. Modular: Each system serializes itself (SaveSystem just orchestrates)
 * 4. Future-proof: Adding new fields doesn't break existing saves (defaults)
 * 5. Storage-agnostic: Currently localStorage, easily swappable to IndexedDB/cloud
 * 
 * SAVE PHILOSOPHY:
 * We save the MINIMUM needed to reconstruct game state:
 * - Time (hour, minute, day) — everything time-dependent recalculates from this
 * - Player position + current map
 * - Relationship data (affection, trust, memories, flags)
 * - Event completion flags
 * - Dialogue history flags
 * 
 * We DON'T save:
 * - NPC positions (recalculated from time + schedule)
 * - Lighting state (recalculated from time)
 * - Animation states (transient)
 * - Audio state (recalculated from time + location)
 * 
 * VERSION MIGRATION:
 * Each save has a version number. When loading an older save,
 * migration functions upgrade it step by step:
 * v1 → v2 → v3 → current
 * This means saves NEVER become incompatible.
 */

import { EventBus } from '@/core/EventBus';
import { RelationshipData } from './RelationshipSystem';
import { STARTING_MONEY } from '@config/economy.config';
import { FIRST_DAY_FLAG } from '@config/firstDay.config';

// ============================================================
// SAVE SCHEMA
// ============================================================

/** Current save format version */
export const SAVE_VERSION = 1;

/** The complete save file structure */
export interface SaveData {
  /** Schema version for migration support */
  version: number;
  /** When this save was created (real timestamp) */
  savedAt: string;
  /** Total real play time in seconds */
  playTimeSeconds: number;

  /** Player state */
  player: {
    x: number;
    y: number;
    mapKey: string;
    direction: string;
  };

  /** Time state */
  time: {
    hour: number;
    minute: number;
    day: number;
  };

  /** Relationship states for all NPCs */
  relationships: Record<string, RelationshipData>;

  /** Completed event IDs */
  completedEvents: string[];

  /** Dialogue flags (which dialogues have been seen) */
  dialogueFlags: Record<string, boolean>;

  /** General game flags (misc state) */
  gameFlags: Record<string, boolean | number | string>;
}

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_PREFIX = 'brongwood_';
const SAVE_SLOTS = 3;

function getSlotKey(slot: number): string {
  return `${STORAGE_PREFIX}save_${slot}`;
}

function getSettingsKey(): string {
  return `${STORAGE_PREFIX}settings`;
}

// ============================================================
// SYSTEM
// ============================================================

export class SaveSystem {
  private playTimeAccumulator: number = 0;
  private totalPlayTime: number = 0;

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Save game state to a slot.
   * @param slot - Save slot (1-3)
   * @param data - Complete game state to save
   */
  save(slot: number, data: Omit<SaveData, 'version' | 'savedAt' | 'playTimeSeconds'>): boolean {
    if (slot < 1 || slot > SAVE_SLOTS) {
      console.error(`[SaveSystem] Invalid slot ${slot}. Use 1-${SAVE_SLOTS}.`);
      return false;
    }

    EventBus.emit('save:before-save', {});

    const saveData: SaveData = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      playTimeSeconds: this.totalPlayTime,
      ...data,
    };

    try {
      const json = JSON.stringify(saveData);
      localStorage.setItem(getSlotKey(slot), json);
      return true;
    } catch (e) {
      console.error('[SaveSystem] Failed to save:', e);
      return false;
    }
  }

  /**
   * Load game state from a slot.
   * @param slot - Save slot (1-3)
   * @returns Parsed save data, or null if slot is empty/corrupt
   */
  load(slot: number): SaveData | null {
    if (slot < 1 || slot > SAVE_SLOTS) return null;

    try {
      const json = localStorage.getItem(getSlotKey(slot));
      if (!json) return null;

      const data = JSON.parse(json) as SaveData;

      // Apply migrations if needed
      const migrated = this.migrate(data);

      this.totalPlayTime = migrated.playTimeSeconds;

      EventBus.emit('save:after-load', {});

      return migrated;
    } catch (e) {
      console.error('[SaveSystem] Failed to load:', e);
      return null;
    }
  }

  /**
   * Check if a save slot has data.
   */
  hasData(slot: number): boolean {
    return localStorage.getItem(getSlotKey(slot)) !== null;
  }

  /**
   * Get save metadata without loading full data (for save slot UI).
   */
  getSlotInfo(slot: number): { savedAt: string; day: number; playTime: number } | null {
    try {
      const json = localStorage.getItem(getSlotKey(slot));
      if (!json) return null;

      const data = JSON.parse(json) as SaveData;
      return {
        savedAt: data.savedAt,
        day: data.time.day,
        playTime: data.playTimeSeconds,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a save slot.
   */
  deleteSave(slot: number): void {
    localStorage.removeItem(getSlotKey(slot));
  }

  /**
   * Track play time (call every frame with delta in ms).
   */
  updatePlayTime(deltaMs: number): void {
    this.playTimeAccumulator += deltaMs;
    if (this.playTimeAccumulator >= 1000) {
      this.totalPlayTime += Math.floor(this.playTimeAccumulator / 1000);
      this.playTimeAccumulator %= 1000;
    }
  }

  /** Get total play time in seconds */
  getPlayTime(): number {
    return this.totalPlayTime;
  }

  // ============================================================
  // MIGRATION
  // ============================================================

  /**
   * Migrate save data from older versions to current.
   * Each migration step handles one version increment.
   */
  private migrate(data: SaveData): SaveData {
    let current = data;

    // Example: v1 → v2 migration (when we add new fields)
    // if (current.version === 1) {
    //   current = { ...current, newField: defaultValue, version: 2 };
    // }

    // Ensure version is current
    current.version = SAVE_VERSION;

    // Apply defaults for any missing fields (forward compatibility)
    current.completedEvents = current.completedEvents ?? [];
    current.dialogueFlags = current.dialogueFlags ?? {};
    current.gameFlags = current.gameFlags ?? {};
    current.relationships = current.relationships ?? {};

    return current;
  }

  // ============================================================
  // UTILITY
  // ============================================================

  /**
   * Create a fresh save data object with defaults.
   * Used for "New Game".
   */
  static createNewGameData(): Omit<SaveData, 'version' | 'savedAt' | 'playTimeSeconds'> {
    return {
      player: {
        x: 320,
        y: 240,
        mapKey: 'downtown',
        direction: 'down',
      },
      time: {
        hour: 8,
        minute: 0,
        day: 1,
      },
      relationships: {},
      completedEvents: [],
      dialogueFlags: {},
      gameFlags: {
        money: STARTING_MONEY,
        [FIRST_DAY_FLAG]: 'wake_up',
      },
    };
  }
}
