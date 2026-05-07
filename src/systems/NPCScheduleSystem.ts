/**
 * NPCScheduleSystem - Drives NPC daily routines based on game time.
 * 
 * WHY THIS SYSTEM EXISTS:
 * NPCs that stand in one place forever feel dead. NPCs that move through
 * the world on a schedule feel ALIVE. The player starts to learn patterns:
 * "If I come here at 8pm, she'll be watching the ocean..."
 * 
 * This creates emotional anticipation and makes the world feel real.
 * 
 * ARCHITECTURE:
 * - Listens to TimeSystem events (hour changes, period changes)
 * - Looks up current schedule entry for each registered NPC
 * - Emits movement commands to NPC entities
 * - Does NOT handle pathfinding (that's the NPC entity's job)
 * - Does NOT handle animation (that's the AnimationSystem's job)
 * 
 * SEPARATION OF CONCERNS:
 * - ScheduleSystem: WHAT should the NPC do and WHERE should they be
 * - NPC Entity: HOW to get there (pathfinding, movement)
 * - AnimationSystem: HOW to look while doing it (idle, walk, work)
 * 
 * This means you can change schedules without touching movement code,
 * and change movement without touching schedule logic.
 */

import { EventBus, DayOfWeek } from '@/core/EventBus';
import { TimeSystem } from './TimeSystem';
import {
  NPCSchedule,
  ScheduleEntry,
  getCurrentScheduleEntry,
  SCHEDULE_REGISTRY,
} from '@config/schedules.config';
import { getDayOfWeek } from '@config/time.config';

/**
 * Represents the current state of an NPC as determined by the schedule.
 */
export interface NPCScheduleState {
  npcId: string;
  currentEntry: ScheduleEntry | null;
  previousEntry: ScheduleEntry | null;
  /** Whether the NPC is transitioning between activities */
  transitioning: boolean;
}

export class NPCScheduleSystem {
  private timeSystem: TimeSystem;
  private schedules: Map<string, NPCSchedule> = new Map();
  private states: Map<string, NPCScheduleState> = new Map();

  constructor(timeSystem: TimeSystem) {
    this.timeSystem = timeSystem;

    // Register all schedules from config
    for (const [npcId, schedule] of Object.entries(SCHEDULE_REGISTRY)) {
      this.registerNPC(npcId, schedule);
    }

    // Listen for time changes
    EventBus.on('time:minute-changed', this.onMinuteChanged, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Register an NPC with a schedule */
  registerNPC(npcId: string, schedule: NPCSchedule): void {
    this.schedules.set(npcId, schedule);
    this.states.set(npcId, {
      npcId,
      currentEntry: null,
      previousEntry: null,
      transitioning: false,
    });

    // Immediately evaluate current state
    this.evaluateNPC(npcId);
  }

  /** Get current schedule state for an NPC */
  getState(npcId: string): NPCScheduleState | undefined {
    return this.states.get(npcId);
  }

  /** Get current activity for an NPC */
  getCurrentActivity(npcId: string): string | null {
    return this.states.get(npcId)?.currentEntry?.activity ?? null;
  }

  /** Get current location waypoint for an NPC */
  getCurrentLocation(npcId: string): string | null {
    return this.states.get(npcId)?.currentEntry?.location ?? null;
  }

  /** Get available dialogue pool for an NPC at current time */
  getDialoguePool(npcId: string): string | null {
    return this.states.get(npcId)?.currentEntry?.dialoguePool ?? null;
  }

  /** Check if an NPC is interruptible right now */
  isInterruptible(npcId: string): boolean {
    return this.states.get(npcId)?.currentEntry?.interruptible ?? false;
  }

  /** Force-evaluate all NPCs (call after time skip or load) */
  evaluateAll(): void {
    for (const npcId of this.schedules.keys()) {
      this.evaluateNPC(npcId);
    }
  }

  /** Clean up event listeners */
  destroy(): void {
    EventBus.off('time:minute-changed', this.onMinuteChanged);
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  /** No persistent state needed — schedules are deterministic from time */
  serialize(): null {
    return null;
  }

  /** Re-evaluate all NPCs after load */
  deserialize(): void {
    this.evaluateAll();
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Called every game-minute to check for schedule changes */
  private onMinuteChanged = (payload: { hour: number; minute: number; day: number }): void => {
    // Only check on 15-minute boundaries for performance
    // (schedules rarely change more frequently than every 15 min)
    if (payload.minute % 5 === 0) {
      for (const npcId of this.schedules.keys()) {
        this.evaluateNPC(npcId);
      }
    }
  };

  /** Evaluate and update a single NPC's schedule state */
  private evaluateNPC(npcId: string): void {
    const schedule = this.schedules.get(npcId);
    const state = this.states.get(npcId);
    if (!schedule || !state) return;

    const { hour, minute, day } = this.timeSystem.state;
    const dayOfWeek = getDayOfWeek(day);

    const newEntry = getCurrentScheduleEntry(schedule, hour, minute, dayOfWeek);

    // Check if schedule entry changed
    if (newEntry !== state.currentEntry) {
      const previousEntry = state.currentEntry;
      state.previousEntry = previousEntry;
      state.currentEntry = newEntry;
      state.transitioning = true;

      // Emit event for NPC entities to react
      if (newEntry) {
        EventBus.emit('npc:schedule-changed', {
          npcId,
          activity: newEntry.activity,
          location: newEntry.location,
        });
      }
    }
  }
}
