/**
 * EventBus - Typed global event system for inter-system communication.
 * 
 * WHY THIS EXISTS:
 * In a game with many systems (time, weather, NPCs, dialogue, relationships),
 * systems need to react to each other WITHOUT importing each other directly.
 * 
 * Without EventBus:
 *   TimeSystem imports LightingSystem, NPCScheduler, AudioManager, DialogueSystem...
 *   = tight coupling, circular dependencies, untestable spaghetti
 * 
 * With EventBus:
 *   TimeSystem emits 'time:period-changed' → anyone who cares listens
 *   = loose coupling, each system is independent, testable, removable
 * 
 * DESIGN DECISIONS:
 * - Singleton pattern: ONE bus for the entire game (simple, predictable)
 * - Typed events: TypeScript enforces correct payload shapes
 * - Namespace convention: 'system:event-name' (e.g., 'time:hour-changed')
 * - Supports once() for one-shot listeners (cutscene triggers)
 * - Supports off() for cleanup (scene transitions)
 * 
 * PERFORMANCE:
 * - Event dispatch is O(n) where n = listeners for that event
 * - For a narrative RPG with <100 listeners total, this is negligible
 * - No allocation on emit (reuses listener arrays)
 * 
 * FUTURE:
 * - Could add priority ordering for listeners
 * - Could add event history for debugging/replay
 * - Could add async event support for loading screens
 */

// ============================================================
// EVENT TYPE DEFINITIONS
// ============================================================

/**
 * All game events and their payload types.
 * Adding a new event = adding one line here.
 * TypeScript then enforces correct usage everywhere.
 */
export interface GameEvents {
  // --- Time System ---
  'time:tick': { hour: number; minute: number; day: number; totalMinutes: number };
  'time:minute-changed': { hour: number; minute: number; day: number };
  'time:hour-changed': { hour: number; day: number; period: TimePeriod };
  'time:period-changed': { period: TimePeriod; previousPeriod: TimePeriod; hour: number };
  'time:day-changed': { day: number; dayOfWeek: DayOfWeek };
  'time:paused': { paused: boolean };

  // --- Atmosphere / Lighting ---
  'atmosphere:transition-start': { from: TimePeriod; to: TimePeriod };
  'atmosphere:transition-complete': { period: TimePeriod };

  // --- NPC System ---
  'npc:schedule-changed': { npcId: string; activity: string; location: string };
  'npc:arrived': { npcId: string; waypointId: string };
  'npc:interaction-start': { npcId: string };
  'npc:interaction-end': { npcId: string };

  // --- Relationship System ---
  'relationship:points-changed': { npcId: string; affection: number; trust: number };
  'relationship:stage-changed': { npcId: string; stage: string; previousStage: string };
  'relationship:memory-created': { npcId: string; memoryId: string };

  // --- Dialogue System ---
  'dialogue:started': { dialogueId: string; npcId?: string };
  'dialogue:choice-made': { dialogueId: string; choiceIndex: number; choiceId: string };
  'dialogue:ended': { dialogueId: string };

  // --- Event/Cutscene System ---
  'event:triggered': { eventId: string };
  'event:completed': { eventId: string };
  'event:player-locked': { locked: boolean };

  // --- Audio ---
  'audio:bgm-changed': { trackKey: string };
  'audio:ambience-changed': { layers: string[] };

  // --- Phone System ---
  'phone:message-received': { npcId: string; messageId: string };
  'phone:opened': Record<string, never>;
  'phone:closed': Record<string, never>;

  // --- Weather ---
  'weather:changed': { state: string; previous: string };

  // --- Activity System ---
  'activity:started': { activityId: string };
  'activity:completed': { activityId: string; outcomeId?: string };
  'activity:cancelled': { activityId: string };

  // --- Story System ---
  'story:chapter-advanced': { chapter: string; previous: string };
  'story:milestone-completed': { milestoneId: string };

  // --- Save System ---
  'save:before-save': Record<string, never>;
  'save:after-load': Record<string, never>;

  // --- Scene ---
  'scene:transition-start': { from: string; to: string };
  'scene:ready': { sceneKey: string };
}

/** Time periods that drive atmosphere, schedules, and dialogue */
export type TimePeriod = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

/** Days of the week for schedule variation */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// ============================================================
// EVENT BUS IMPLEMENTATION
// ============================================================

type EventCallback<T> = (payload: T) => void;

interface Listener<T> {
  callback: EventCallback<T>;
  once: boolean;
  context?: unknown;
}

class EventBusImpl {
  private listeners: Map<string, Listener<unknown>[]> = new Map();

  /**
   * Subscribe to an event.
   * @param event - Event name (e.g., 'time:hour-changed')
   * @param callback - Function to call when event fires
   * @param context - Optional 'this' context for the callback
   */
  on<K extends keyof GameEvents>(
    event: K,
    callback: EventCallback<GameEvents[K]>,
    context?: unknown
  ): void {
    const list = this.listeners.get(event) || [];
    list.push({ callback: callback as EventCallback<unknown>, once: false, context });
    this.listeners.set(event, list);
  }

  /**
   * Subscribe to an event ONCE (auto-removes after first fire).
   * Perfect for cutscene triggers, one-time reactions.
   */
  once<K extends keyof GameEvents>(
    event: K,
    callback: EventCallback<GameEvents[K]>,
    context?: unknown
  ): void {
    const list = this.listeners.get(event) || [];
    list.push({ callback: callback as EventCallback<unknown>, once: true, context });
    this.listeners.set(event, list);
  }

  /**
   * Unsubscribe from an event.
   * IMPORTANT: Call this during scene cleanup to prevent memory leaks.
   */
  off<K extends keyof GameEvents>(
    event: K,
    callback: EventCallback<GameEvents[K]>
  ): void {
    const list = this.listeners.get(event);
    if (!list) return;

    const filtered = list.filter(l => l.callback !== callback);
    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  /**
   * Emit an event to all listeners.
   * @param event - Event name
   * @param payload - Typed payload data
   */
  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return;

    // Process listeners (copy array to handle removal during iteration)
    const toRemove: Listener<unknown>[] = [];

    for (const listener of list) {
      listener.callback.call(listener.context, payload);
      if (listener.once) {
        toRemove.push(listener);
      }
    }

    // Remove one-shot listeners
    if (toRemove.length > 0) {
      const remaining = list.filter(l => !toRemove.includes(l));
      if (remaining.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, remaining);
      }
    }
  }

  /**
   * Remove ALL listeners for a specific event.
   * Use during scene transitions to prevent stale references.
   */
  removeAll(event: keyof GameEvents): void {
    this.listeners.delete(event);
  }

  /**
   * Remove ALL listeners entirely.
   * Nuclear option — use only on full game reset.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Debug: get listener count for an event.
   */
  listenerCount(event: keyof GameEvents): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

/**
 * Global singleton event bus.
 * Import this anywhere: import { EventBus } from '@/core/EventBus';
 */
export const EventBus = new EventBusImpl();
