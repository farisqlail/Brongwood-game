/**
 * NPC Schedule Configuration - Daily routines for all NPCs.
 * 
 * WHY SCHEDULES MATTER:
 * NPCs with schedules feel ALIVE. Without them, NPCs are furniture.
 * With them, the player discovers patterns:
 * - "Rika opens her shop at 8:00... I should visit in the morning"
 * - "She goes to the cafe at lunch... maybe I'll run into her there"
 * - "She's still at the shop at night... is she lonely too?"
 * 
 * These patterns create EMOTIONAL INVESTMENT. The player starts to
 * care about the NPC's routine, anticipate their movements, and
 * feel connected to the rhythm of the town.
 * 
 * DATA STRUCTURE:
 * Each schedule entry defines:
 * - startHour/startMinute: when this activity begins
 * - activity: what the NPC is doing (for dialogue/animation selection)
 * - location: where they should be (waypoint ID on the map)
 * - dialogue: which dialogue pool is available during this activity
 * - interruptible: can events/player override this schedule?
 * 
 * SCHEDULE RESOLUTION:
 * The NPC system checks the current time against the schedule.
 * It finds the LATEST entry that has started (not the next one).
 * This means entries don't need end times — they last until the next one starts.
 * 
 * FUTURE EXPANSION:
 * - Day-of-week variations (Rika takes Sundays off)
 * - Weather variations (stays inside when raining)
 * - Relationship-gated schedules (visits player's house at high affection)
 * - Festival overrides (everyone goes to the beach on Summer Festival)
 */

import { DayOfWeek } from '@/core/EventBus';

/**
 * A single schedule entry — one activity in an NPC's day.
 */
export interface ScheduleEntry {
  /** Hour this activity starts (0-23) */
  startHour: number;
  /** Minute this activity starts (0-59) */
  startMinute: number;
  /** What the NPC is doing (drives animation + dialogue) */
  activity: NPCActivity;
  /** Map waypoint ID where the NPC should be */
  location: string;
  /** Available dialogue pool during this activity */
  dialoguePool?: string;
  /** Can this be interrupted by events? */
  interruptible: boolean;
  /** Optional facing direction at destination */
  facingDirection?: 'up' | 'down' | 'left' | 'right';
}

/**
 * NPC activities — what they're doing at any given time.
 * Drives animation selection and interaction availability.
 */
export type NPCActivity =
  | 'sleeping'
  | 'waking_up'
  | 'working'
  | 'walking'
  | 'eating'
  | 'relaxing'
  | 'shopping'
  | 'closing_shop'
  | 'reading'
  | 'stargazing'
  | 'waiting'
  | 'idle';

/**
 * Complete daily schedule for an NPC.
 * Can have day-of-week variations.
 */
export interface NPCSchedule {
  /** NPC identifier */
  npcId: string;
  /** Default schedule (used when no day-specific override exists) */
  default: ScheduleEntry[];
  /** Optional day-specific overrides */
  overrides?: Partial<Record<DayOfWeek, ScheduleEntry[]>>;
}

// ============================================================
// NPC SCHEDULES
// ============================================================

/**
 * Rika's Daily Schedule
 * 
 * Rika runs the flower shop. She's dedicated but lonely.
 * Her schedule reveals her character:
 * - Early riser (opens shop at 8:00 — responsible)
 * - Takes a lunch break at the cafe (social, but alone)
 * - Works late (dedicated, maybe avoiding going home)
 * - Stargazes at night (romantic, introspective)
 * 
 * The player can find her at different times for different conversations.
 * Late-night encounters feel special and intimate.
 */
export const RIKA_SCHEDULE: NPCSchedule = {
  npcId: 'rika',
  default: [
    {
      startHour: 6,
      startMinute: 0,
      activity: 'waking_up',
      location: 'rika_home',
      interruptible: false,
    },
    {
      startHour: 7,
      startMinute: 30,
      activity: 'walking',
      location: 'flower_shop_entrance',
      interruptible: true,
    },
    {
      startHour: 8,
      startMinute: 0,
      activity: 'working',
      location: 'flower_shop_counter',
      dialoguePool: 'rika_shop_morning',
      interruptible: true,
      facingDirection: 'down',
    },
    {
      startHour: 12,
      startMinute: 0,
      activity: 'walking',
      location: 'cafe_entrance',
      interruptible: true,
    },
    {
      startHour: 12,
      startMinute: 15,
      activity: 'eating',
      location: 'cafe_table_2',
      dialoguePool: 'rika_cafe_lunch',
      interruptible: true,
      facingDirection: 'left',
    },
    {
      startHour: 13,
      startMinute: 0,
      activity: 'walking',
      location: 'flower_shop_entrance',
      interruptible: true,
    },
    {
      startHour: 13,
      startMinute: 15,
      activity: 'working',
      location: 'flower_shop_counter',
      dialoguePool: 'rika_shop_afternoon',
      interruptible: true,
      facingDirection: 'down',
    },
    {
      startHour: 19,
      startMinute: 0,
      activity: 'closing_shop',
      location: 'flower_shop_counter',
      dialoguePool: 'rika_closing',
      interruptible: true,
    },
    {
      startHour: 19,
      startMinute: 30,
      activity: 'walking',
      location: 'ocean_path_bench',
      interruptible: true,
    },
    {
      startHour: 20,
      startMinute: 0,
      activity: 'stargazing',
      location: 'ocean_path_bench',
      dialoguePool: 'rika_evening',
      interruptible: true,
      facingDirection: 'down',
    },
    {
      startHour: 22,
      startMinute: 0,
      activity: 'walking',
      location: 'rika_home',
      interruptible: false,
    },
    {
      startHour: 22,
      startMinute: 30,
      activity: 'sleeping',
      location: 'rika_home',
      interruptible: false,
    },
  ],
  overrides: {
    sunday: [
      {
        startHour: 8,
        startMinute: 0,
        activity: 'waking_up',
        location: 'rika_home',
        interruptible: false,
      },
      {
        startHour: 9,
        startMinute: 0,
        activity: 'walking',
        location: 'ocean_path_bench',
        interruptible: true,
      },
      {
        startHour: 9,
        startMinute: 30,
        activity: 'reading',
        location: 'ocean_path_bench',
        dialoguePool: 'rika_sunday_morning',
        interruptible: true,
        facingDirection: 'down',
      },
      {
        startHour: 12,
        startMinute: 0,
        activity: 'walking',
        location: 'cafe_entrance',
        interruptible: true,
      },
      {
        startHour: 12,
        startMinute: 15,
        activity: 'eating',
        location: 'cafe_table_2',
        dialoguePool: 'rika_cafe_lunch',
        interruptible: true,
      },
      {
        startHour: 14,
        startMinute: 0,
        activity: 'relaxing',
        location: 'rika_home',
        dialoguePool: 'rika_sunday_afternoon',
        interruptible: true,
      },
      {
        startHour: 20,
        startMinute: 0,
        activity: 'stargazing',
        location: 'ocean_path_bench',
        dialoguePool: 'rika_evening',
        interruptible: true,
      },
      {
        startHour: 22,
        startMinute: 0,
        activity: 'sleeping',
        location: 'rika_home',
        interruptible: false,
      },
    ],
  },
};

// ============================================================
// SCHEDULE REGISTRY
// ============================================================

export const SCHEDULE_REGISTRY: Record<string, NPCSchedule> = {
  rika: RIKA_SCHEDULE,
};

/**
 * Get the current schedule entry for an NPC at a given time.
 * Returns the LATEST entry that has started (not the next one).
 */
export function getCurrentScheduleEntry(
  schedule: NPCSchedule,
  hour: number,
  minute: number,
  dayOfWeek: DayOfWeek
): ScheduleEntry | null {
  // Check for day-specific override first
  const entries = schedule.overrides?.[dayOfWeek] ?? schedule.default;

  const currentMinutes = hour * 60 + minute;

  // Find the latest entry that has started
  let active: ScheduleEntry | null = null;
  for (const entry of entries) {
    const entryMinutes = entry.startHour * 60 + entry.startMinute;
    if (entryMinutes <= currentMinutes) {
      active = entry;
    }
  }

  // If nothing has started yet today, use the last entry from "yesterday"
  // (wraps around — e.g., sleeping from 22:30 carries into early morning)
  if (!active && entries.length > 0) {
    active = entries[entries.length - 1];
  }

  return active;
}
