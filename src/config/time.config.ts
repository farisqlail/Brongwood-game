/**
 * Time System Configuration
 * 
 * WHY configurable time:
 * 1. Game feel tuning — too fast feels rushed, too slow feels boring
 * 2. Different areas might have different time speeds (dream sequences)
 * 3. Debug mode needs fast-forward
 * 4. Festivals/events might slow time for dramatic effect
 * 
 * TIME SCALE PHILOSOPHY:
 * Brongwood is a slow-life game. A full day should feel meaningful.
 * At 1 real second = 1 game minute:
 *   - Full day (24h) = 24 real minutes
 *   - Morning (6:00-12:00) = 6 real minutes
 *   - Evening (18:00-22:00) = 4 real minutes
 * 
 * This gives enough time to:
 *   - Walk around town (2-3 min)
 *   - Have a conversation (1-2 min)
 *   - Experience atmosphere transitions (gradual, not jarring)
 * 
 * PERIOD DEFINITIONS:
 * These drive lighting, music, NPC schedules, and dialogue availability.
 * The boundaries are chosen for emotional impact:
 *   - Dawn (5:00-7:00): quiet, hopeful, birds chirping
 *   - Morning (7:00-12:00): active, shops open, warm light
 *   - Afternoon (12:00-17:00): peak activity, bright
 *   - Evening (17:00-20:00): golden hour, shops closing, melancholic
 *   - Night (20:00-23:00): quiet streets, warm window glows, intimate
 *   - Late Night (23:00-5:00): lonely, deep blue, introspective
 */

import { TimePeriod, DayOfWeek } from '@/core/EventBus';

export const TIME_CONFIG = {
  /** How many real milliseconds = 1 game minute */
  MS_PER_GAME_MINUTE: 1000,

  /** Starting time for a new game (hour, minute) */
  START_HOUR: 8,
  START_MINUTE: 0,
  START_DAY: 1,

  /** Hours in a day */
  HOURS_IN_DAY: 24,
  /** Minutes in an hour */
  MINUTES_IN_HOUR: 60,
} as const;

/**
 * Time period boundaries.
 * Each period starts at the specified hour.
 * Order matters — checked from last to first.
 */
export const TIME_PERIODS: Array<{ period: TimePeriod; startHour: number }> = [
  { period: 'late_night', startHour: 23 },
  { period: 'night', startHour: 20 },
  { period: 'evening', startHour: 17 },
  { period: 'afternoon', startHour: 12 },
  { period: 'morning', startHour: 7 },
  { period: 'dawn', startHour: 5 },
];

/**
 * Day of week cycle (0-indexed from day 1).
 */
export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

/**
 * Get the time period for a given hour.
 */
export function getPeriodForHour(hour: number): TimePeriod {
  for (const entry of TIME_PERIODS) {
    if (hour >= entry.startHour) {
      return entry.period;
    }
  }
  // Before dawn (0:00-4:59)
  return 'late_night';
}

/**
 * Get the day of week for a given day number.
 */
export function getDayOfWeek(day: number): DayOfWeek {
  return DAYS_OF_WEEK[(day - 1) % 7];
}

/**
 * Format time as HH:MM string.
 */
export function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Format time as 12-hour with AM/PM.
 */
export function formatTime12h(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${minute.toString().padStart(2, '0')} ${period}`;
}
