/**
 * ActivitySystem - Cozy daily activities (fishing, gardening, cafe).
 * 
 * WHY ACTIVITIES MATTER:
 * Activities in Brongwood aren't "gameplay mechanics" — they're emotional rituals.
 * - Fishing isn't about catching fish. It's about sitting quietly by the ocean.
 * - Gardening isn't about growing crops. It's about nurturing something alive.
 * - The cafe isn't about food. It's about being in a warm place.
 * 
 * These activities create:
 * - Daily rhythm (something to look forward to each day)
 * - Meditative moments (slow, peaceful, no pressure)
 * - NPC encounters (Rika might be at the cafe too)
 * - Relationship building (shared activities deepen bonds)
 * - Time passage (activities advance the clock naturally)
 * 
 * DESIGN PHILOSOPHY:
 * Activities should be:
 * - Simple (no complex minigames — this isn't an action game)
 * - Atmospheric (the experience IS the reward)
 * - Optional (never forced, always available)
 * - Socially meaningful (NPCs react to your activities)
 * 
 * ARCHITECTURE:
 * Each activity is a self-contained state machine:
 * 1. IDLE → player approaches activity zone
 * 2. PROMPT → "Press E to fish" / "Press E to sit"
 * 3. ACTIVE → activity is happening (time passes, atmosphere changes)
 * 4. RESULT → optional outcome (caught a fish, flower bloomed)
 * 5. END → return to normal gameplay
 * 
 * Activities are DATA-DRIVEN — adding a new activity = adding a config entry.
 */

import { EventBus } from '@/core/EventBus';
import { gameManager } from '@/managers/GameManager';

// ============================================================
// TYPES
// ============================================================

export type ActivityId = 'fishing' | 'gardening' | 'cafe_sit' | 'bench_sit' | 'stargazing';

export type ActivityState = 'idle' | 'prompt' | 'starting' | 'active' | 'ending';

export interface ActivityConfig {
  id: ActivityId;
  /** Display name */
  name: string;
  /** How long the activity takes (game minutes) */
  durationMinutes: number;
  /** Prompt text shown to player */
  promptText: string;
  /** Relationship bonus if NPC is nearby */
  npcBonus?: { npcId: string; affection: number; trust: number };
  /** Time advancement during activity */
  advancesTime: boolean;
  /** Camera zoom during activity */
  cameraZoom?: number;
  /** Whether player can cancel early */
  cancellable: boolean;
  /** Possible outcomes (for fishing, gardening) */
  outcomes?: ActivityOutcome[];
}

export interface ActivityOutcome {
  /** Outcome ID */
  id: string;
  /** Description shown to player */
  text: string;
  /** Probability (0-1) */
  chance: number;
  /** Relationship effects */
  effects?: Array<{ type: 'affection' | 'trust'; npcId: string; amount: number }>;
}

export interface ActiveActivity {
  config: ActivityConfig;
  state: ActivityState;
  startTime: number; // total game minutes when started
  elapsed: number; // real ms elapsed
  outcome: ActivityOutcome | null;
}

// ============================================================
// ACTIVITY CONFIGS
// ============================================================

export const ACTIVITY_CONFIGS: Record<ActivityId, ActivityConfig> = {
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    durationMinutes: 30,
    promptText: 'Fish by the ocean',
    npcBonus: { npcId: 'rika', affection: 5, trust: 3 },
    advancesTime: true,
    cameraZoom: 1.2,
    cancellable: true,
    outcomes: [
      { id: 'small_fish', text: 'You caught a small fish. The ocean is calm today.', chance: 0.4 },
      { id: 'nothing', text: 'Nothing bites. But the sound of waves is nice.', chance: 0.3 },
      { id: 'rare_fish', text: 'A beautiful blue fish! You\'ve never seen one like this.', chance: 0.1 },
      { id: 'peaceful', text: 'You didn\'t catch anything. But you feel at peace.', chance: 0.2 },
    ],
  },
  gardening: {
    id: 'gardening',
    name: 'Gardening',
    durationMinutes: 20,
    promptText: 'Tend the garden',
    advancesTime: true,
    cameraZoom: 1.15,
    cancellable: true,
    outcomes: [
      { id: 'flower_grew', text: 'A small bud appeared. It should bloom in a few days.', chance: 0.5 },
      { id: 'watered', text: 'The soil is moist. The plants look happy.', chance: 0.4 },
      { id: 'butterfly', text: 'A butterfly landed on your hand. A quiet moment.', chance: 0.1 },
    ],
  },
  cafe_sit: {
    id: 'cafe_sit',
    name: 'Sit at Cafe',
    durationMinutes: 15,
    promptText: 'Sit and have coffee',
    npcBonus: { npcId: 'rika', affection: 3, trust: 2 },
    advancesTime: true,
    cameraZoom: 1.1,
    cancellable: true,
    outcomes: [
      { id: 'warm', text: 'The coffee is warm. The cafe is quiet.', chance: 0.6 },
      { id: 'overheard', text: 'You overhear someone humming a familiar song.', chance: 0.3 },
      { id: 'rain_watch', text: 'You watch the rain through the window. Time slows down.', chance: 0.1 },
    ],
  },
  bench_sit: {
    id: 'bench_sit',
    name: 'Sit on Bench',
    durationMinutes: 10,
    promptText: 'Sit and rest',
    advancesTime: true,
    cancellable: true,
  },
  stargazing: {
    id: 'stargazing',
    name: 'Stargaze',
    durationMinutes: 20,
    promptText: 'Look at the stars',
    npcBonus: { npcId: 'rika', affection: 8, trust: 5 },
    advancesTime: true,
    cameraZoom: 0.9, // Zoom out to show sky
    cancellable: true,
    outcomes: [
      { id: 'shooting_star', text: 'A shooting star crosses the sky. You make a wish.', chance: 0.15 },
      { id: 'quiet', text: 'The stars are bright tonight. The world feels vast.', chance: 0.5 },
      { id: 'constellation', text: 'You trace a constellation with your eyes. It looks like a flower.', chance: 0.35 },
    ],
  },
};

// ============================================================
// SYSTEM
// ============================================================

export class ActivitySystem {
  private _current: ActiveActivity | null = null;
  private _available: ActivityId | null = null;

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Currently active activity (null if none) */
  get current(): ActiveActivity | null { return this._current; }

  /** Currently available activity at player's location */
  get available(): ActivityId | null { return this._available; }

  /** Whether an activity is in progress */
  get isActive(): boolean { return this._current !== null; }

  /** Set which activity is available (called by zone overlap) */
  setAvailable(activityId: ActivityId | null): void {
    this._available = activityId;
  }

  /**
   * Start an activity.
   * Locks the player, adjusts camera, begins timer.
   */
  start(activityId: ActivityId): boolean {
    if (this._current) return false;

    const config = ACTIVITY_CONFIGS[activityId];
    if (!config) return false;

    this._current = {
      config,
      state: 'starting',
      startTime: gameManager.time.totalMinutes,
      elapsed: 0,
      outcome: null,
    };

    // Lock player
    EventBus.emit('event:player-locked', { locked: true });

    // Emit started event
    EventBus.emit('activity:started', { activityId });

    // Transition to active after brief pause
    this._current.state = 'active';

    return true;
  }

  /**
   * Update the activity (call every frame).
   * Handles duration tracking and completion.
   */
  update(delta: number): void {
    if (!this._current || this._current.state !== 'active') return;

    this._current.elapsed += delta;

    // Check if activity duration has passed
    const durationMs = this._current.config.durationMinutes * 1000; // Using game-time scale
    if (this._current.elapsed >= durationMs) {
      this.complete();
    }
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Complete the activity with an outcome */
  private complete(): void {
    if (!this._current) return;

    // Roll for outcome
    if (this._current.config.outcomes) {
      this._current.outcome = this.rollOutcome(this._current.config.outcomes);
    }

    // Apply NPC bonus if applicable
    if (this._current.config.npcBonus) {
      const bonus = this._current.config.npcBonus;
      gameManager.relationships.addAffection(bonus.npcId, bonus.affection);
      gameManager.relationships.addTrust(bonus.npcId, bonus.trust);
    }

    // Advance time if configured
    if (this._current.config.advancesTime) {
      gameManager.time.advanceTo(
        gameManager.time.hour,
        gameManager.time.minute + this._current.config.durationMinutes
      );
    }

    this._current.state = 'ending';

    // Emit completion event
    EventBus.emit('activity:completed', {
      activityId: this._current.config.id,
      outcomeId: this._current.outcome?.id,
    });

    // Brief pause before ending
    this.end();
  }

  /** End the activity and return to normal gameplay */
  private end(): void {
    this._current = null;
    EventBus.emit('event:player-locked', { locked: false });
  }

  /** Cancel the current activity early */
  cancel(): void {
    if (!this._current || !this._current.config.cancellable) return;

    // Emit cancellation event
    EventBus.emit('activity:cancelled', { activityId: this._current.config.id });

    this.end();
  }

  /** Roll a random outcome based on chances */
  private rollOutcome(outcomes: ActivityOutcome[]): ActivityOutcome | null {
    const roll = Math.random();
    let cumulative = 0;

    for (const outcome of outcomes) {
      cumulative += outcome.chance;
      if (roll <= cumulative) return outcome;
    }

    return outcomes[outcomes.length - 1] ?? null;
  }
}
