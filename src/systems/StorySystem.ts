/**
 * StorySystem - Manages narrative progression and emotional story arcs.
 * 
 * WHY THIS EXISTS:
 * Brongwood isn't a sandbox — it has a story. But the story unfolds
 * ORGANICALLY through daily life, not through forced quest markers.
 * 
 * The player should feel like the story is happening TO them naturally,
 * not that they're following a checklist. This requires:
 * - Invisible progression tracking (no quest log)
 * - Condition-based unlocks (story advances when you live your life)
 * - Emotional pacing (don't rush — let moments breathe)
 * - Multiple paths (different play styles reach the same emotional beats)
 * 
 * STORY STRUCTURE:
 * The game is divided into CHAPTERS (emotional phases):
 * 
 * Chapter 1: "Arrival" (Days 1-3)
 *   - Player arrives in Brongwood
 *   - Meets Rika at the flower shop
 *   - Learns the town rhythm
 *   - Emotional tone: curiosity, mild loneliness
 * 
 * Chapter 2: "Routine" (Days 4-10)
 *   - Daily life establishes
 *   - Rika starts opening up
 *   - First vulnerable moment (Rainy Night event)
 *   - Emotional tone: comfort, growing connection
 * 
 * Chapter 3: "Connection" (Days 11-20)
 *   - Deeper conversations unlock
 *   - Phone messages become personal
 *   - Shared activities (fishing, cafe)
 *   - Emotional tone: warmth, intimacy, fear of loss
 * 
 * Chapter 4: "Truth" (Days 21-30)
 *   - Rika's backstory revealed
 *   - Player confronts their own reason for being here
 *   - Emotional climax
 *   - Emotional tone: vulnerability, catharsis
 * 
 * ARCHITECTURE:
 * - Chapters are defined as data (conditions + unlocks)
 * - The system checks progression every day
 * - Advancing a chapter unlocks new events, dialogue, and messages
 * - No explicit "chapter start" cutscene — it's seamless
 * 
 * MILESTONE SYSTEM:
 * Within each chapter, MILESTONES track specific emotional beats.
 * Milestones can be completed in any order within a chapter.
 * When enough milestones are complete, the next chapter unlocks.
 */

import { EventBus } from '@/core/EventBus';
import { gameManager } from '@/managers/GameManager';

// ============================================================
// TYPES
// ============================================================

export type ChapterId = 'arrival' | 'routine' | 'connection' | 'truth';

export interface StoryChapter {
  id: ChapterId;
  /** Display name (for save file / debug) */
  name: string;
  /** Conditions to unlock this chapter */
  unlockConditions: ChapterConditions;
  /** Milestones within this chapter */
  milestones: StoryMilestone[];
  /** How many milestones needed to advance to next chapter */
  milestonesRequired: number;
}

export interface ChapterConditions {
  /** Previous chapter must be complete */
  previousChapter?: ChapterId;
  /** Minimum day number */
  minDay?: number;
  /** Minimum relationship stage with any NPC */
  minRelationshipStage?: string;
}

export interface StoryMilestone {
  id: string;
  /** Description (for debug/save readability) */
  description: string;
  /** How this milestone is completed */
  completionType: MilestoneCompletionType;
}

export type MilestoneCompletionType =
  | { type: 'event_completed'; eventId: string }
  | { type: 'relationship_stage'; npcId: string; stage: string }
  | { type: 'memory_created'; npcId: string; memoryId: string }
  | { type: 'flag_set'; flag: string }
  | { type: 'day_reached'; day: number }
  | { type: 'phone_responded'; messageId: string };

// ============================================================
// CHAPTER DEFINITIONS
// ============================================================

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'arrival',
    name: 'Chapter 1: Arrival',
    unlockConditions: {},
    milestones: [
      {
        id: 'first_meeting',
        description: 'Met Rika at the flower shop',
        completionType: { type: 'flag_set', flag: 'met_rika' },
      },
      {
        id: 'explored_town',
        description: 'Visited all major areas of downtown',
        completionType: { type: 'flag_set', flag: 'explored_downtown' },
      },
      {
        id: 'first_night',
        description: 'Experienced the first nightfall',
        completionType: { type: 'day_reached', day: 2 },
      },
    ],
    milestonesRequired: 2,
  },
  {
    id: 'routine',
    name: 'Chapter 2: Routine',
    unlockConditions: {
      previousChapter: 'arrival',
      minDay: 4,
    },
    milestones: [
      {
        id: 'rainy_night_event',
        description: 'Shared a vulnerable moment with Rika in the rain',
        completionType: { type: 'event_completed', eventId: 'event_rainy_night_flower_shop' },
      },
      {
        id: 'rika_acquaintance',
        description: 'Became acquainted with Rika',
        completionType: { type: 'relationship_stage', npcId: 'rika', stage: 'acquaintance' },
      },
      {
        id: 'daily_routine',
        description: 'Established a daily routine (Day 7)',
        completionType: { type: 'day_reached', day: 7 },
      },
      {
        id: 'first_phone_message',
        description: 'Received first phone message from Rika',
        completionType: { type: 'flag_set', flag: 'rika_first_message' },
      },
    ],
    milestonesRequired: 3,
  },
  {
    id: 'connection',
    name: 'Chapter 3: Connection',
    unlockConditions: {
      previousChapter: 'routine',
      minDay: 11,
      minRelationshipStage: 'friend',
    },
    milestones: [
      {
        id: 'rika_friend',
        description: 'Became friends with Rika',
        completionType: { type: 'relationship_stage', npcId: 'rika', stage: 'friend' },
      },
      {
        id: 'shared_activity',
        description: 'Did an activity together with Rika',
        completionType: { type: 'flag_set', flag: 'shared_activity_rika' },
      },
      {
        id: 'rika_backstory_hint',
        description: 'Rika hinted at her past',
        completionType: { type: 'memory_created', npcId: 'rika', memoryId: 'backstory_hint' },
      },
    ],
    milestonesRequired: 2,
  },
  {
    id: 'truth',
    name: 'Chapter 4: Truth',
    unlockConditions: {
      previousChapter: 'connection',
      minDay: 21,
      minRelationshipStage: 'close_friend',
    },
    milestones: [
      {
        id: 'rika_confession',
        description: 'Rika shared her full story',
        completionType: { type: 'event_completed', eventId: 'event_rika_confession' },
      },
      {
        id: 'player_truth',
        description: 'Player confronted their own truth',
        completionType: { type: 'flag_set', flag: 'player_confession' },
      },
    ],
    milestonesRequired: 2,
  },
];

// ============================================================
// SYSTEM
// ============================================================

export class StorySystem {
  private currentChapter: ChapterId = 'arrival';
  private completedMilestones: Set<string> = new Set();
  private completedChapters: Set<ChapterId> = new Set();

  constructor() {
    // Check progression on day change and event completion
    EventBus.on('time:day-changed', this.checkProgression, this);
    EventBus.on('event:completed', this.onEventCompleted, this);
    EventBus.on('relationship:stage-changed', this.checkProgression, this);
    EventBus.on('relationship:memory-created', this.onMemoryCreated, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  get chapter(): ChapterId { return this.currentChapter; }

  /** Check if a milestone is completed */
  isMilestoneComplete(milestoneId: string): boolean {
    return this.completedMilestones.has(milestoneId);
  }

  /** Check if a chapter is completed */
  isChapterComplete(chapterId: ChapterId): boolean {
    return this.completedChapters.has(chapterId);
  }

  /** Manually complete a milestone (for flag-based milestones) */
  completeMilestone(milestoneId: string): void {
    if (this.completedMilestones.has(milestoneId)) return;
    this.completedMilestones.add(milestoneId);
    this.checkProgression();
  }

  /** Get progress for current chapter */
  getChapterProgress(): { completed: number; required: number; total: number } {
    const chapter = STORY_CHAPTERS.find(c => c.id === this.currentChapter);
    if (!chapter) return { completed: 0, required: 0, total: 0 };

    const completed = chapter.milestones.filter(m => this.completedMilestones.has(m.id)).length;
    return {
      completed,
      required: chapter.milestonesRequired,
      total: chapter.milestones.length,
    };
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  serialize(): { chapter: ChapterId; milestones: string[]; chapters: ChapterId[] } {
    return {
      chapter: this.currentChapter,
      milestones: Array.from(this.completedMilestones),
      chapters: Array.from(this.completedChapters),
    };
  }

  deserialize(data: { chapter: ChapterId; milestones: string[]; chapters: ChapterId[] }): void {
    this.currentChapter = data.chapter;
    this.completedMilestones = new Set(data.milestones);
    this.completedChapters = new Set(data.chapters);
  }

  destroy(): void {
    EventBus.off('time:day-changed', this.checkProgression);
    EventBus.off('event:completed', this.onEventCompleted);
    EventBus.off('relationship:stage-changed', this.checkProgression);
    EventBus.off('relationship:memory-created', this.onMemoryCreated);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private checkProgression = (): void => {
    // Check current chapter milestones
    const chapter = STORY_CHAPTERS.find(c => c.id === this.currentChapter);
    if (!chapter) return;

    // Auto-complete day-reached milestones
    for (const milestone of chapter.milestones) {
      if (this.completedMilestones.has(milestone.id)) continue;

      if (milestone.completionType.type === 'day_reached') {
        if (gameManager.time.day >= milestone.completionType.day) {
          this.completedMilestones.add(milestone.id);
        }
      }

      if (milestone.completionType.type === 'relationship_stage') {
        const stage = gameManager.relationships.getStage(milestone.completionType.npcId);
        const stageOrder = ['stranger', 'acquaintance', 'friend', 'close_friend', 'confidant', 'soulmate'];
        if (stageOrder.indexOf(stage) >= stageOrder.indexOf(milestone.completionType.stage)) {
          this.completedMilestones.add(milestone.id);
        }
      }
    }

    // Check if chapter is complete
    const completedCount = chapter.milestones.filter(m => this.completedMilestones.has(m.id)).length;
    if (completedCount >= chapter.milestonesRequired && !this.completedChapters.has(chapter.id)) {
      this.advanceChapter(chapter.id);
    }
  };

  private advanceChapter(completedChapterId: ChapterId): void {
    this.completedChapters.add(completedChapterId);

    // Find next chapter
    const chapterIndex = STORY_CHAPTERS.findIndex(c => c.id === completedChapterId);
    if (chapterIndex < STORY_CHAPTERS.length - 1) {
      const nextChapter = STORY_CHAPTERS[chapterIndex + 1];

      // Check if next chapter's conditions are met
      if (this.meetsChapterConditions(nextChapter.unlockConditions)) {
        this.currentChapter = nextChapter.id;
      }
    }
  }

  private meetsChapterConditions(conditions: ChapterConditions): boolean {
    if (conditions.previousChapter && !this.completedChapters.has(conditions.previousChapter)) {
      return false;
    }
    if (conditions.minDay && gameManager.time.day < conditions.minDay) {
      return false;
    }
    return true;
  }

  private onEventCompleted = (payload: { eventId: string }): void => {
    const chapter = STORY_CHAPTERS.find(c => c.id === this.currentChapter);
    if (!chapter) return;

    for (const milestone of chapter.milestones) {
      if (milestone.completionType.type === 'event_completed' &&
          milestone.completionType.eventId === payload.eventId) {
        this.completedMilestones.add(milestone.id);
      }
    }
    this.checkProgression();
  };

  private onMemoryCreated = (payload: { npcId: string; memoryId: string }): void => {
    const chapter = STORY_CHAPTERS.find(c => c.id === this.currentChapter);
    if (!chapter) return;

    for (const milestone of chapter.milestones) {
      if (milestone.completionType.type === 'memory_created' &&
          milestone.completionType.npcId === payload.npcId &&
          milestone.completionType.memoryId === payload.memoryId) {
        this.completedMilestones.add(milestone.id);
      }
    }
    this.checkProgression();
  };
}
