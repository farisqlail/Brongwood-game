/**
 * RelationshipSystem - Tracks emotional bonds between player and NPCs.
 * 
 * WHY THIS ISN'T JUST A "HEART METER":
 * Simple affection points create shallow relationships.
 * Real emotional connection in games comes from:
 * - CONTEXT: visiting someone during rain feels different than sunshine
 * - MEMORY: the game remembers shared moments
 * - TRUST: built slowly through consistent presence, not gifts
 * - STAGES: the relationship evolves qualitatively, not just quantitatively
 * 
 * DESIGN PHILOSOPHY:
 * Brongwood's relationships are inspired by real human connection:
 * - You can't buy love with gifts (affection from gifts is capped)
 * - Being present matters (visiting regularly builds trust)
 * - Shared experiences create memories (rainy night conversations)
 * - Vulnerability unlocks deeper connection (late-night dialogue)
 * 
 * DATA MODEL:
 * - affection: How much the NPC likes the player (0-1000)
 * - trust: How much the NPC opens up (0-1000, grows slower)
 * - memories: Array of significant shared moments
 * - flags: Boolean markers for specific events/choices
 * - stage: Current relationship phase (stranger → acquaintance → friend → close → ...)
 * 
 * STAGE PROGRESSION:
 * Stages unlock new dialogue, events, and NPC behaviors.
 * They're not just affection thresholds — they require BOTH affection AND trust,
 * plus sometimes specific memories or flags.
 * 
 * SAVE COMPATIBILITY:
 * The entire relationship state is serializable to JSON.
 * Adding new fields in future versions won't break old saves (defaults applied).
 */

import { EventBus } from '@/core/EventBus';

// ============================================================
// TYPES
// ============================================================

/** Relationship stages — qualitative phases of connection */
export type RelationshipStage =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'confidant'
  | 'soulmate';

/** A memory of a shared moment */
export interface RelationshipMemory {
  /** Unique identifier for this memory */
  id: string;
  /** When it happened (game day) */
  day: number;
  /** What time period it happened in */
  timePeriod: string;
  /** Brief description (for save file readability) */
  description: string;
  /** Tags for conditional checks (e.g., 'rainy', 'night', 'vulnerable') */
  tags: string[];
}

/** Complete relationship state for one NPC */
export interface RelationshipData {
  npcId: string;
  affection: number;
  trust: number;
  stage: RelationshipStage;
  memories: RelationshipMemory[];
  flags: Record<string, boolean>;
  /** How many days since last interaction (for "missed you" dialogue) */
  daysSinceLastVisit: number;
  /** Total number of interactions */
  totalInteractions: number;
  /** Last interaction day */
  lastInteractionDay: number;
  /** Last day this NPC received a gift */
  lastGiftDay: number;
}

export type GiftReaction = 'loved' | 'liked' | 'neutral' | 'disliked';

interface GiftTasteProfile {
  loved: string[];
  liked: string[];
  disliked: string[];
}

const GIFT_TASTE_PROFILES: Record<string, GiftTasteProfile> = {
  rika: {
    loved: ['flower', 'jasmine_seed'],
    liked: ['berry', 'shell', 'coffee'],
    disliked: ['mushroom', 'meat_1', 'meat_2', 'meat_3', 'meat_4', 'meat_5'],
  },
};

const GIFT_REACTION_EFFECTS: Record<GiftReaction, { affection: number; trust: number }> = {
  loved: { affection: 20, trust: 4 },
  liked: { affection: 10, trust: 2 },
  neutral: { affection: 4, trust: 1 },
  disliked: { affection: -6, trust: 0 },
};

/** Requirements to advance to a relationship stage */
interface StageRequirement {
  minAffection: number;
  minTrust: number;
  requiredMemories?: string[];
  requiredFlags?: string[];
}

// ============================================================
// STAGE REQUIREMENTS
// ============================================================

const STAGE_REQUIREMENTS: Record<RelationshipStage, StageRequirement> = {
  stranger: { minAffection: 0, minTrust: 0 },
  acquaintance: { minAffection: 50, minTrust: 20 },
  friend: { minAffection: 150, minTrust: 80 },
  close_friend: { minAffection: 350, minTrust: 200 },
  confidant: {
    minAffection: 600,
    minTrust: 400,
    requiredMemories: ['shared_vulnerable_moment'],
  },
  soulmate: {
    minAffection: 900,
    minTrust: 700,
    requiredMemories: ['deep_confession'],
    requiredFlags: ['mutual_understanding'],
  },
};

/** Stage progression order */
const STAGE_ORDER: RelationshipStage[] = [
  'stranger', 'acquaintance', 'friend', 'close_friend', 'confidant', 'soulmate',
];

// ============================================================
// SYSTEM
// ============================================================

export class RelationshipSystem {
  private relationships: Map<string, RelationshipData> = new Map();

  constructor() {
    // Listen for day changes to update "days since last visit"
    EventBus.on('time:day-changed', this.onDayChanged, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Initialize a relationship (call when NPC is first encountered) */
  initRelationship(npcId: string): void {
    if (this.relationships.has(npcId)) return;

    this.relationships.set(npcId, {
      npcId,
      affection: 0,
      trust: 0,
      stage: 'stranger',
      memories: [],
      flags: {},
      daysSinceLastVisit: 0,
      totalInteractions: 0,
      lastInteractionDay: 0,
      lastGiftDay: -1,
    });
  }

  /** Get relationship data for an NPC */
  get(npcId: string): RelationshipData | undefined {
    return this.relationships.get(npcId);
  }

  /** Get current stage */
  getStage(npcId: string): RelationshipStage {
    return this.relationships.get(npcId)?.stage ?? 'stranger';
  }

  /**
   * Add affection points.
   * Capped per interaction to prevent "gift spam" exploitation.
   */
  addAffection(npcId: string, amount: number, reason?: string): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    const capped = Math.min(amount, 30); // Max 30 per interaction
    data.affection = Math.min(1000, Math.max(0, data.affection + capped));

    this.checkStageProgression(npcId);
    this.emitPointsChanged(npcId);
  }

  /**
   * Add trust points.
   * Trust grows slower than affection — it requires consistency.
   */
  addTrust(npcId: string, amount: number): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    const capped = Math.min(amount, 15); // Trust grows slowly
    data.trust = Math.min(1000, Math.max(0, data.trust + capped));

    this.checkStageProgression(npcId);
    this.emitPointsChanged(npcId);
  }

  /**
   * Record an interaction (call when player talks to NPC).
   * Builds trust through consistent presence.
   */
  recordInteraction(npcId: string, currentDay: number): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    data.totalInteractions++;
    data.daysSinceLastVisit = 0;
    data.lastInteractionDay = currentDay;

    // Consistent visits build trust naturally
    if (data.totalInteractions % 3 === 0) {
      this.addTrust(npcId, 5);
    }
  }

  /**
   * Create a memory of a shared moment.
   * Memories can unlock relationship stages and special dialogue.
   */
  createMemory(npcId: string, memory: RelationshipMemory): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    // Don't duplicate memories
    if (data.memories.some(m => m.id === memory.id)) return;

    data.memories.push(memory);

    EventBus.emit('relationship:memory-created', {
      npcId,
      memoryId: memory.id,
    });

    // Memories often advance the relationship
    this.checkStageProgression(npcId);
  }

  /** Set a relationship flag */
  setFlag(npcId: string, flag: string, value: boolean = true): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    data.flags[flag] = value;
    this.checkStageProgression(npcId);
  }

  /** Check if a flag is set */
  hasFlag(npcId: string, flag: string): boolean {
    return this.relationships.get(npcId)?.flags[flag] ?? false;
  }

  /** Check if a memory exists */
  hasMemory(npcId: string, memoryId: string): boolean {
    return this.relationships.get(npcId)?.memories.some(m => m.id === memoryId) ?? false;
  }

  /** Check if NPC has a memory with a specific tag */
  hasMemoryWithTag(npcId: string, tag: string): boolean {
    return this.relationships.get(npcId)?.memories.some(m => m.tags.includes(tag)) ?? false;
  }

  canReceiveGiftToday(npcId: string, currentDay: number): boolean {
    const data = this.relationships.get(npcId);
    if (!data) return false;
    return data.lastGiftDay !== currentDay;
  }

  getGiftReaction(npcId: string, itemId: string): GiftReaction {
    const profile = GIFT_TASTE_PROFILES[npcId];
    if (!profile) return 'neutral';
    if (profile.loved.includes(itemId)) return 'loved';
    if (profile.liked.includes(itemId)) return 'liked';
    if (profile.disliked.includes(itemId)) return 'disliked';
    return 'neutral';
  }

  receiveGift(
    npcId: string,
    itemId: string,
    currentDay: number,
  ): { success: boolean; reaction: GiftReaction; affectionDelta: number; trustDelta: number } {
    const data = this.relationships.get(npcId);
    if (!data || !this.canReceiveGiftToday(npcId, currentDay)) {
      return { success: false, reaction: 'neutral', affectionDelta: 0, trustDelta: 0 };
    }

    const reaction = this.getGiftReaction(npcId, itemId);
    const effects = GIFT_REACTION_EFFECTS[reaction];
    data.lastGiftDay = currentDay;

    if (effects.affection !== 0) {
      this.addAffection(npcId, effects.affection);
    }
    if (effects.trust !== 0) {
      this.addTrust(npcId, effects.trust);
    }

    return {
      success: true,
      reaction,
      affectionDelta: effects.affection,
      trustDelta: effects.trust,
    };
  }

  // ============================================================
  // CONDITIONAL CHECKS (for dialogue/event gating)
  // ============================================================

  /** Check if relationship meets a condition */
  meetsCondition(npcId: string, condition: RelationshipCondition): boolean {
    const data = this.relationships.get(npcId);
    if (!data) return false;

    if (condition.minAffection !== undefined && data.affection < condition.minAffection) return false;
    if (condition.minTrust !== undefined && data.trust < condition.minTrust) return false;
    if (condition.minStage !== undefined) {
      const currentIdx = STAGE_ORDER.indexOf(data.stage);
      const requiredIdx = STAGE_ORDER.indexOf(condition.minStage);
      if (currentIdx < requiredIdx) return false;
    }
    if (condition.requiredFlags) {
      for (const flag of condition.requiredFlags) {
        if (!data.flags[flag]) return false;
      }
    }
    if (condition.requiredMemories) {
      for (const memId of condition.requiredMemories) {
        if (!data.memories.some(m => m.id === memId)) return false;
      }
    }
    if (condition.requiredMemoryTags) {
      for (const tag of condition.requiredMemoryTags) {
        if (!data.memories.some(m => m.tags.includes(tag))) return false;
      }
    }

    return true;
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  serialize(): Record<string, RelationshipData> {
    const result: Record<string, RelationshipData> = {};
    for (const [npcId, data] of this.relationships) {
      result[npcId] = { ...data };
    }
    return result;
  }

  deserialize(data: Record<string, RelationshipData>): void {
    this.relationships.clear();
    for (const [npcId, relData] of Object.entries(data)) {
      this.relationships.set(npcId, {
        ...relData,
        lastGiftDay: typeof relData.lastGiftDay === 'number' ? relData.lastGiftDay : -1,
      });
    }
  }

  /** Clean up */
  destroy(): void {
    EventBus.off('time:day-changed', this.onDayChanged);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Check if NPC should advance to next relationship stage */
  private checkStageProgression(npcId: string): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    const currentIdx = STAGE_ORDER.indexOf(data.stage);
    if (currentIdx >= STAGE_ORDER.length - 1) return; // Already max stage

    const nextStage = STAGE_ORDER[currentIdx + 1];
    const requirements = STAGE_REQUIREMENTS[nextStage];

    // Check all requirements
    if (data.affection < requirements.minAffection) return;
    if (data.trust < requirements.minTrust) return;

    if (requirements.requiredMemories) {
      for (const memId of requirements.requiredMemories) {
        if (!data.memories.some(m => m.tags.includes(memId))) return;
      }
    }

    if (requirements.requiredFlags) {
      for (const flag of requirements.requiredFlags) {
        if (!data.flags[flag]) return;
      }
    }

    // All requirements met — advance!
    const previousStage = data.stage;
    data.stage = nextStage;

    EventBus.emit('relationship:stage-changed', {
      npcId,
      stage: nextStage,
      previousStage,
    });
  }

  /** Emit points changed event */
  private emitPointsChanged(npcId: string): void {
    const data = this.relationships.get(npcId);
    if (!data) return;

    EventBus.emit('relationship:points-changed', {
      npcId,
      affection: data.affection,
      trust: data.trust,
    });
  }

  /** Update days since last visit for all NPCs */
  private onDayChanged = (): void => {
    for (const data of this.relationships.values()) {
      data.daysSinceLastVisit++;
    }
  };
}

// ============================================================
// CONDITION TYPE (used by dialogue/event systems)
// ============================================================

export interface RelationshipCondition {
  minAffection?: number;
  minTrust?: number;
  minStage?: RelationshipStage;
  requiredFlags?: string[];
  requiredMemories?: string[];
  requiredMemoryTags?: string[];
}
