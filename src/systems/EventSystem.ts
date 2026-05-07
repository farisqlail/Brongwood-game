/**
 * EventSystem - Manages scripted game events and cutscenes.
 * 
 * WHY THIS EXISTS:
 * Scripted events are the emotional peaks of Brongwood.
 * They need to:
 * - Trigger based on complex conditions (time + location + relationship + flags)
 * - Lock the player (no walking away mid-cutscene)
 * - Control the camera (zoom, pan for cinematic feel)
 * - Sequence dialogue with actions
 * - Mark themselves as completed (don't repeat)
 * - Integrate with save system
 * 
 * ARCHITECTURE:
 * Events are registered with conditions. Every time the player enters
 * a trigger zone or the time changes, the system checks if any event
 * should fire. When conditions are met, the event takes control.
 * 
 * EVENT vs DIALOGUE:
 * - Dialogue: player-initiated (talk to NPC)
 * - Event: world-initiated (triggered by conditions)
 * Both use the DialogueSystem for text display, but events also
 * control camera, lighting, and player state.
 * 
 * FUTURE:
 * - Cutscene scripting (multi-step sequences with camera choreography)
 * - Timed events (happen at specific day + time regardless of player)
 * - Chain events (completing one unlocks the next)
 */

import { EventBus, TimePeriod } from '@/core/EventBus';
import { DialogueDefinition, DialogueCondition } from '@/dialogue/DialogueTypes';
import { DialogueSystem } from '@/dialogue/DialogueSystem';
import { gameManager } from '@/managers/GameManager';

// ============================================================
// TYPES
// ============================================================

export interface GameEvent {
  /** Unique event ID */
  id: string;
  /** Conditions required to trigger */
  conditions: EventConditions;
  /** The dialogue/cutscene to play */
  dialogue: DialogueDefinition;
  /** Whether this event can only trigger once */
  oneShot: boolean;
  /** Priority (higher = checked first when multiple events could trigger) */
  priority: number;
}

export interface EventConditions {
  /** Required time periods */
  timePeriods?: TimePeriod[];
  /** Required relationship conditions */
  relationship?: DialogueCondition['relationship'];
  /** Required game flags */
  requiredFlags?: string[];
  /** Flags that must NOT be set (prevents re-triggering) */
  blockedByFlags?: string[];
  /** Minimum day number */
  minDay?: number;
}

// ============================================================
// SYSTEM
// ============================================================

export class EventSystem {
  private registeredEvents: Map<string, GameEvent> = new Map();
  private completedEvents: Set<string> = new Set();
  private dialogueSystem: DialogueSystem | null = null;
  private activeEvent: string | null = null;

  constructor() {
    // Listen for dialogue end to clean up active event
    EventBus.on('dialogue:ended', this.onDialogueEnded, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Set the dialogue system reference (set by scene) */
  setDialogueSystem(system: DialogueSystem): void {
    this.dialogueSystem = system;
  }

  /** Register an event */
  register(event: GameEvent): void {
    this.registeredEvents.set(event.id, event);
  }

  /** Register multiple events */
  registerAll(events: GameEvent[]): void {
    for (const event of events) {
      this.register(event);
    }
  }

  /**
   * Check if any event should trigger given current conditions.
   * Call this when:
   * - Player enters a trigger zone
   * - Time period changes
   * - Player interacts with something
   * 
   * @returns true if an event was triggered
   */
  checkTriggers(): boolean {
    if (this.activeEvent) return false; // Already in an event
    if (this.dialogueSystem?.isActive) return false; // Dialogue active

    // Sort by priority (highest first)
    const events = Array.from(this.registeredEvents.values())
      .sort((a, b) => b.priority - a.priority);

    for (const event of events) {
      if (this.shouldTrigger(event)) {
        this.triggerEvent(event);
        return true;
      }
    }

    return false;
  }

  /** Manually trigger a specific event by ID */
  triggerById(eventId: string): boolean {
    const event = this.registeredEvents.get(eventId);
    if (!event) return false;
    if (this.activeEvent) return false;

    this.triggerEvent(event);
    return true;
  }

  /** Check if an event has been completed */
  isCompleted(eventId: string): boolean {
    return this.completedEvents.has(eventId);
  }

  /** Mark an event as completed (for save/load) */
  markCompleted(eventId: string): void {
    this.completedEvents.add(eventId);
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  serialize(): string[] {
    return Array.from(this.completedEvents);
  }

  deserialize(completedIds: string[]): void {
    this.completedEvents = new Set(completedIds);
  }

  /** Clean up */
  destroy(): void {
    EventBus.off('dialogue:ended', this.onDialogueEnded);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private shouldTrigger(event: GameEvent): boolean {
    // Check if already completed (one-shot events)
    if (event.oneShot && this.completedEvents.has(event.id)) return false;

    const conditions = event.conditions;
    const time = gameManager.time;

    // Time period check
    if (conditions.timePeriods && !conditions.timePeriods.includes(time.period)) {
      return false;
    }

    // Minimum day check
    if (conditions.minDay && time.day < conditions.minDay) {
      return false;
    }

    // Relationship check
    if (conditions.relationship) {
      const { npcId, ...relCondition } = conditions.relationship;
      if (npcId && !gameManager.relationships.meetsCondition(npcId, relCondition)) {
        return false;
      }
    }

    // Required flags check
    if (conditions.requiredFlags) {
      for (const flag of conditions.requiredFlags) {
        // Check both relationship flags and game flags
        // For simplicity, check if any NPC has this flag
        // In production, you'd specify which NPC
        let found = false;
        const rels = gameManager.relationships.serialize();
        for (const rel of Object.values(rels)) {
          if (rel.flags[flag]) { found = true; break; }
        }
        if (!found) return false;
      }
    }

    // Blocked flags check
    if (conditions.blockedByFlags) {
      for (const flag of conditions.blockedByFlags) {
        const rels = gameManager.relationships.serialize();
        for (const rel of Object.values(rels)) {
          if (rel.flags[flag]) return false;
        }
      }
    }

    return true;
  }

  private triggerEvent(event: GameEvent): void {
    this.activeEvent = event.id;

    EventBus.emit('event:triggered', { eventId: event.id });

    // Start the dialogue
    if (this.dialogueSystem) {
      this.dialogueSystem.start(event.dialogue);
    }
  }

  private onDialogueEnded = (): void => {
    if (this.activeEvent) {
      const event = this.registeredEvents.get(this.activeEvent);

      // Mark as completed if one-shot
      if (event?.oneShot) {
        this.completedEvents.add(this.activeEvent);
      }

      EventBus.emit('event:completed', { eventId: this.activeEvent });
      this.activeEvent = null;
    }
  };
}
