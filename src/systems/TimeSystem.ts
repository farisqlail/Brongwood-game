/**
 * TimeSystem - The heartbeat of Brongwood's living world.
 * 
 * WHY THIS IS THE MOST IMPORTANT SYSTEM:
 * Time drives EVERYTHING in a daily-life game:
 * - Lighting changes (dawn → morning → evening → night)
 * - NPC schedules (Rika opens shop at 8:00, goes home at 21:00)
 * - Dialogue availability (some conversations only happen at night)
 * - Music/ambience transitions (cicadas at dusk, rain at night)
 * - Event triggers (special scenes at specific times)
 * - Player emotional rhythm (mornings feel hopeful, nights feel lonely)
 * 
 * ARCHITECTURE:
 * - Accumulator pattern: real delta time accumulates until 1 game-minute passes
 * - Event-driven: emits typed events that other systems listen to
 * - Pausable: cutscenes/dialogue can freeze time
 * - Serializable: save/load compatible (just hour + minute + day)
 * - Configurable speed: can be changed at runtime (debug, dream sequences)
 * 
 * WHY NOT USE PHASER'S BUILT-IN TIMER:
 * - Phaser timers are scene-scoped (destroyed on scene change)
 * - We need time to persist across scene transitions
 * - We need precise control over accumulation and pausing
 * - We need to emit our own typed events
 * 
 * UPDATE PATTERN:
 * Called every frame from the active gameplay scene.
 * Accumulates real time → when enough passes, advances game clock.
 * Emits events at minute, hour, and period boundaries.
 */

import { EventBus, TimePeriod, DayOfWeek } from '@/core/EventBus';
import {
  TIME_CONFIG,
  getPeriodForHour,
  getDayOfWeek,
  formatTime,
} from '@config/time.config';

export interface TimeState {
  hour: number;
  minute: number;
  day: number;
  period: TimePeriod;
  dayOfWeek: DayOfWeek;
  paused: boolean;
  /** Total minutes elapsed since game start (for comparison/math) */
  totalMinutes: number;
}

export class TimeSystem {
  // --- Current state ---
  private _hour: number;
  private _minute: number;
  private _day: number;
  private _period: TimePeriod;
  private _paused: boolean = false;

  // --- Accumulator ---
  private accumulator: number = 0;
  private _msPerMinute: number;

  // --- Speed multiplier (for debug/events) ---
  private _speedMultiplier: number = 1;

  constructor() {
    this._hour = TIME_CONFIG.START_HOUR;
    this._minute = TIME_CONFIG.START_MINUTE;
    this._day = TIME_CONFIG.START_DAY;
    this._period = getPeriodForHour(this._hour);
    this._msPerMinute = TIME_CONFIG.MS_PER_GAME_MINUTE;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Get current time state (read-only snapshot) */
  get state(): TimeState {
    return {
      hour: this._hour,
      minute: this._minute,
      day: this._day,
      period: this._period,
      dayOfWeek: getDayOfWeek(this._day),
      paused: this._paused,
      totalMinutes: this.totalMinutes,
    };
  }

  get hour(): number { return this._hour; }
  get minute(): number { return this._minute; }
  get day(): number { return this._day; }
  get period(): TimePeriod { return this._period; }
  get paused(): boolean { return this._paused; }

  /** Total minutes since day 1, 00:00 (useful for comparisons) */
  get totalMinutes(): number {
    return ((this._day - 1) * 24 * 60) + (this._hour * 60) + this._minute;
  }

  /** Formatted time string "HH:MM" */
  get timeString(): string {
    return formatTime(this._hour, this._minute);
  }

  /** Progress through current period (0.0 to 1.0) — used by lighting */
  get periodProgress(): number {
    return this.calculatePeriodProgress();
  }

  // ============================================================
  // UPDATE (called every frame)
  // ============================================================

  /**
   * Advance the game clock based on real elapsed time.
   * 
   * @param delta - Milliseconds since last frame (from Phaser's update)
   * 
   * WHY accumulator pattern:
   * - Frame rate varies (16ms at 60fps, 33ms at 30fps)
   * - We need consistent time advancement regardless of frame rate
   * - Accumulate real time → when enough passes, tick one game-minute
   * - This prevents time from running faster on high-FPS machines
   */
  update(delta: number): void {
    if (this._paused) return;

    this.accumulator += delta * this._speedMultiplier;

    // Process all accumulated minutes
    while (this.accumulator >= this._msPerMinute) {
      this.accumulator -= this._msPerMinute;
      this.advanceMinute();
    }

    // Emit tick event every frame (for smooth interpolation by listeners)
    EventBus.emit('time:tick', {
      hour: this._hour,
      minute: this._minute,
      day: this._day,
      totalMinutes: this.totalMinutes,
    });
  }

  // ============================================================
  // CONTROL
  // ============================================================

  /** Pause time (for cutscenes, dialogue, menus) */
  pause(): void {
    if (this._paused) return;
    this._paused = true;
    EventBus.emit('time:paused', { paused: true });
  }

  /** Resume time */
  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this.accumulator = 0; // Reset accumulator to prevent time jump
    EventBus.emit('time:paused', { paused: false });
  }

  /** Set time speed multiplier (1 = normal, 2 = double, 0.5 = half) */
  setSpeed(multiplier: number): void {
    this._speedMultiplier = Math.max(0, multiplier);
  }

  /** Get current speed multiplier */
  get speedMultiplier(): number {
    return this._speedMultiplier;
  }

  /**
   * Set time directly (for save/load, debug, or event triggers).
   * Emits all appropriate events for the new time.
   */
  setTime(hour: number, minute: number, day?: number): void {
    const prevPeriod = this._period;

    this._hour = Math.max(0, Math.min(23, hour));
    this._minute = Math.max(0, Math.min(59, minute));
    if (day !== undefined) this._day = Math.max(1, day);

    this._period = getPeriodForHour(this._hour);
    this.accumulator = 0;

    // Emit events for the new state
    EventBus.emit('time:minute-changed', {
      hour: this._hour,
      minute: this._minute,
      day: this._day,
    });

    EventBus.emit('time:hour-changed', {
      hour: this._hour,
      day: this._day,
      period: this._period,
    });

    if (this._period !== prevPeriod) {
      EventBus.emit('time:period-changed', {
        period: this._period,
        previousPeriod: prevPeriod,
        hour: this._hour,
      });
    }
  }

  /**
   * Advance to a specific time (fast-forward).
   * Useful for sleep mechanics or time-skip events.
   * Emits day-changed if crossing midnight.
   */
  advanceTo(targetHour: number, targetMinute: number = 0): void {
    const targetTotal = targetHour * 60 + targetMinute;
    const currentTotal = this._hour * 60 + this._minute;

    if (targetTotal <= currentTotal) {
      // Target is tomorrow — advance day
      this._day++;
      EventBus.emit('time:day-changed', {
        day: this._day,
        dayOfWeek: getDayOfWeek(this._day),
      });
    }

    this.setTime(targetHour, targetMinute);
  }

  // ============================================================
  // SAVE/LOAD
  // ============================================================

  /** Serialize for save file */
  serialize(): { hour: number; minute: number; day: number } {
    return {
      hour: this._hour,
      minute: this._minute,
      day: this._day,
    };
  }

  /** Restore from save file */
  deserialize(data: { hour: number; minute: number; day: number }): void {
    this.setTime(data.hour, data.minute, data.day);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Advance clock by one game-minute */
  private advanceMinute(): void {
    this._minute++;

    if (this._minute >= TIME_CONFIG.MINUTES_IN_HOUR) {
      this._minute = 0;
      this.advanceHour();
    }

    EventBus.emit('time:minute-changed', {
      hour: this._hour,
      minute: this._minute,
      day: this._day,
    });
  }

  /** Advance clock by one hour */
  private advanceHour(): void {
    const prevPeriod = this._period;
    this._hour++;

    if (this._hour >= TIME_CONFIG.HOURS_IN_DAY) {
      this._hour = 0;
      this._day++;
      EventBus.emit('time:day-changed', {
        day: this._day,
        dayOfWeek: getDayOfWeek(this._day),
      });
    }

    // Check for period change
    this._period = getPeriodForHour(this._hour);

    EventBus.emit('time:hour-changed', {
      hour: this._hour,
      day: this._day,
      period: this._period,
    });

    if (this._period !== prevPeriod) {
      EventBus.emit('time:period-changed', {
        period: this._period,
        previousPeriod: prevPeriod,
        hour: this._hour,
      });
    }
  }

  /**
   * Calculate how far through the current period we are (0.0 to 1.0).
   * Used by the lighting system for smooth color interpolation.
   * 
   * Example: If evening is 17:00-20:00 and current time is 18:30,
   * progress = (18.5 - 17) / (20 - 17) = 0.5
   */
  private calculatePeriodProgress(): number {
    const currentMinutes = this._hour * 60 + this._minute;

    // Find current period boundaries
    const periods = [
      { period: 'dawn', start: 5 * 60, end: 7 * 60 },
      { period: 'morning', start: 7 * 60, end: 12 * 60 },
      { period: 'afternoon', start: 12 * 60, end: 17 * 60 },
      { period: 'evening', start: 17 * 60, end: 20 * 60 },
      { period: 'night', start: 20 * 60, end: 23 * 60 },
      { period: 'late_night', start: 23 * 60, end: 29 * 60 }, // wraps past midnight
    ];

    const current = periods.find(p => p.period === this._period);
    if (!current) return 0;

    let adjustedCurrent = currentMinutes;
    if (this._period === 'late_night' && currentMinutes < current.start) {
      adjustedCurrent += 24 * 60; // Handle wrap past midnight
    }

    const duration = current.end - current.start;
    if (duration <= 0) return 0;

    return Math.max(0, Math.min(1, (adjustedCurrent - current.start) / duration));
  }
}
