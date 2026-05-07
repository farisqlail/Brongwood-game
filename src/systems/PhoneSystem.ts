/**
 * PhoneSystem - Asynchronous messaging between player and NPCs.
 * 
 * WHY THIS IS EMOTIONALLY POWERFUL:
 * The phone creates attachment BETWEEN interactions. Instead of only
 * connecting with Rika when you walk up to her, she texts you:
 * - "The sunset was really pretty today. Did you see it?"
 * - "I found a flower I've never seen before. Wish I could show you."
 * - "Can't sleep. The rain is nice though."
 * 
 * This makes the player feel:
 * - Thought about (someone is thinking of ME)
 * - Connected (even when apart)
 * - Curious (what will she say next?)
 * - Emotionally invested (I want to respond)
 * 
 * DESIGN PHILOSOPHY:
 * Messages are NOT instant. They arrive at emotionally appropriate times:
 * - Morning messages feel hopeful
 * - Evening messages feel intimate
 * - Late-night messages feel vulnerable
 * - Messages after events feel like processing
 * 
 * The player can choose to respond (limited choices) or just read.
 * Responses affect relationship subtly — it's about PRESENCE, not optimization.
 * 
 * ARCHITECTURE:
 * - Messages are queued based on conditions (time, day, relationship, events)
 * - A notification appears when a new message arrives
 * - Player opens phone UI to read/respond
 * - Message history is saved (creates a "memory" of the relationship)
 * - Messages unlock based on story progression
 * 
 * FUTURE:
 * - Group chats (town bulletin board)
 * - Photo messages (Rika sends a photo of flowers)
 * - Timed responses (some messages expire if you don't respond)
 */

import { EventBus, TimePeriod } from '@/core/EventBus';
import { gameManager } from '@/managers/GameManager';

// ============================================================
// TYPES
// ============================================================

/** A single message in a conversation */
export interface PhoneMessage {
  /** Unique message ID */
  id: string;
  /** Who sent it */
  sender: 'player' | string; // NPC ID
  /** Message text */
  text: string;
  /** When it was sent (game time) */
  timestamp: { day: number; hour: number; minute: number };
  /** Whether the player has read this message */
  read: boolean;
  /** Optional response choices (only for NPC messages) */
  responses?: PhoneResponse[];
  /** Whether a response was selected */
  responded: boolean;
  /** Which response was chosen (index) */
  chosenResponse?: number;
}

/** A response option for the player */
export interface PhoneResponse {
  text: string;
  /** Effects when chosen */
  effects?: PhoneResponseEffect[];
}

/** Effects of choosing a response */
export type PhoneResponseEffect =
  | { type: 'affection'; npcId: string; amount: number }
  | { type: 'trust'; npcId: string; amount: number }
  | { type: 'flag'; npcId: string; flag: string; value: boolean }
  | { type: 'unlock_message'; messageId: string; delay: number };

/** A scheduled message that will be delivered when conditions are met */
export interface ScheduledMessage {
  /** Unique ID */
  id: string;
  /** The message content */
  message: Omit<PhoneMessage, 'timestamp' | 'read' | 'responded'>;
  /** Conditions for delivery */
  conditions: MessageConditions;
  /** Priority (higher = delivered first if multiple are ready) */
  priority: number;
  /** Whether this can only be sent once */
  oneShot: boolean;
}

/** Conditions for message delivery */
export interface MessageConditions {
  /** Required time periods */
  timePeriods?: TimePeriod[];
  /** Minimum day number */
  minDay?: number;
  /** Required relationship stage */
  minStage?: string;
  /** Required flags */
  requiredFlags?: string[];
  /** Required completed events */
  requiredEvents?: string[];
  /** Minimum hours since last message from this sender */
  minHoursSinceLastMessage?: number;
  /** Blocked by flags (don't send if these are set) */
  blockedByFlags?: string[];
}

/** A conversation thread with one NPC */
export interface ConversationThread {
  npcId: string;
  messages: PhoneMessage[];
  unreadCount: number;
  lastMessageTime: { day: number; hour: number; minute: number } | null;
}

// ============================================================
// SYSTEM
// ============================================================

export class PhoneSystem {
  private threads: Map<string, ConversationThread> = new Map();
  private scheduledMessages: ScheduledMessage[] = [];
  private deliveredMessageIds: Set<string> = new Set();
  private _hasUnread: boolean = false;

  constructor() {
    // Check for new messages every game-hour
    EventBus.on('time:hour-changed', this.checkScheduledMessages, this);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Whether there are unread messages */
  get hasUnread(): boolean { return this._hasUnread; }

  /** Get total unread count across all threads */
  get unreadCount(): number {
    let count = 0;
    for (const thread of this.threads.values()) {
      count += thread.unreadCount;
    }
    return count;
  }

  /** Get a conversation thread */
  getThread(npcId: string): ConversationThread {
    if (!this.threads.has(npcId)) {
      this.threads.set(npcId, {
        npcId,
        messages: [],
        unreadCount: 0,
        lastMessageTime: null,
      });
    }
    return this.threads.get(npcId)!;
  }

  /** Get all threads with messages */
  getAllThreads(): ConversationThread[] {
    return Array.from(this.threads.values()).filter(t => t.messages.length > 0);
  }

  /** Register a scheduled message */
  scheduleMessage(msg: ScheduledMessage): void {
    this.scheduledMessages.push(msg);
  }

  /** Register multiple scheduled messages */
  scheduleAll(messages: ScheduledMessage[]): void {
    this.scheduledMessages.push(...messages);
  }

  /**
   * Deliver a message immediately (for event-triggered messages).
   */
  deliverMessage(npcId: string, text: string, responses?: PhoneResponse[]): void {
    const time = gameManager.time;
    const thread = this.getThread(npcId);

    const message: PhoneMessage = {
      id: `msg_${npcId}_${Date.now()}`,
      sender: npcId,
      text,
      timestamp: { day: time.day, hour: time.hour, minute: time.minute },
      read: false,
      responses,
      responded: false,
    };

    thread.messages.push(message);
    thread.unreadCount++;
    thread.lastMessageTime = message.timestamp;
    this._hasUnread = true;

    // Emit notification event (for UI to show notification)
    EventBus.emit('phone:message-received' as keyof import('@/core/EventBus').GameEvents, {
      npcId,
      messageId: message.id,
    } as never);
  }

  /**
   * Mark a message as read.
   */
  markRead(npcId: string, messageId: string): void {
    const thread = this.getThread(npcId);
    const msg = thread.messages.find(m => m.id === messageId);
    if (msg && !msg.read) {
      msg.read = true;
      thread.unreadCount = Math.max(0, thread.unreadCount - 1);
      this._hasUnread = this.unreadCount > 0;
    }
  }

  /** Mark all messages in a thread as read */
  markThreadRead(npcId: string): void {
    const thread = this.getThread(npcId);
    for (const msg of thread.messages) {
      msg.read = true;
    }
    thread.unreadCount = 0;
    this._hasUnread = this.unreadCount > 0;
  }

  /**
   * Respond to a message.
   */
  respond(npcId: string, messageId: string, responseIndex: number): void {
    const thread = this.getThread(npcId);
    const msg = thread.messages.find(m => m.id === messageId);
    if (!msg || !msg.responses || msg.responded) return;

    const response = msg.responses[responseIndex];
    if (!response) return;

    msg.responded = true;
    msg.chosenResponse = responseIndex;

    // Add player's response as a message
    const time = gameManager.time;
    thread.messages.push({
      id: `msg_player_${Date.now()}`,
      sender: 'player',
      text: response.text,
      timestamp: { day: time.day, hour: time.hour, minute: time.minute },
      read: true,
      responded: false,
    });

    // Apply effects
    if (response.effects) {
      for (const effect of response.effects) {
        this.applyEffect(effect);
      }
    }
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  serialize(): { threads: Record<string, ConversationThread>; delivered: string[] } {
    const threads: Record<string, ConversationThread> = {};
    for (const [npcId, thread] of this.threads) {
      threads[npcId] = thread;
    }
    return { threads, delivered: Array.from(this.deliveredMessageIds) };
  }

  deserialize(data: { threads: Record<string, ConversationThread>; delivered: string[] }): void {
    this.threads.clear();
    for (const [npcId, thread] of Object.entries(data.threads)) {
      this.threads.set(npcId, thread);
    }
    this.deliveredMessageIds = new Set(data.delivered);
    this._hasUnread = this.unreadCount > 0;
  }

  /** Clean up */
  destroy(): void {
    EventBus.off('time:hour-changed', this.checkScheduledMessages);
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /** Check if any scheduled messages should be delivered */
  private checkScheduledMessages = (): void => {
    for (const scheduled of this.scheduledMessages) {
      if (scheduled.oneShot && this.deliveredMessageIds.has(scheduled.id)) continue;
      if (!this.meetsConditions(scheduled.conditions, scheduled.message.sender as string)) continue;

      // Deliver the message
      this.deliverMessage(
        scheduled.message.sender as string,
        scheduled.message.text,
        scheduled.message.responses
      );

      this.deliveredMessageIds.add(scheduled.id);
    }
  };

  /** Check if message conditions are met */
  private meetsConditions(conditions: MessageConditions, npcId: string): boolean {
    const time = gameManager.time;

    if (conditions.timePeriods && !conditions.timePeriods.includes(time.period)) return false;
    if (conditions.minDay && time.day < conditions.minDay) return false;

    if (conditions.minStage) {
      const stage = gameManager.relationships.getStage(npcId);
      const stageOrder = ['stranger', 'acquaintance', 'friend', 'close_friend', 'confidant', 'soulmate'];
      if (stageOrder.indexOf(stage) < stageOrder.indexOf(conditions.minStage as never)) return false;
    }

    if (conditions.minHoursSinceLastMessage) {
      const thread = this.threads.get(npcId);
      if (thread?.lastMessageTime) {
        const lastTotal = (thread.lastMessageTime.day - 1) * 24 + thread.lastMessageTime.hour;
        const currentTotal = (time.day - 1) * 24 + time.hour;
        if (currentTotal - lastTotal < conditions.minHoursSinceLastMessage) return false;
      }
    }

    return true;
  }

  /** Apply a response effect */
  private applyEffect(effect: PhoneResponseEffect): void {
    switch (effect.type) {
      case 'affection':
        gameManager.relationships.addAffection(effect.npcId, effect.amount);
        break;
      case 'trust':
        gameManager.relationships.addTrust(effect.npcId, effect.amount);
        break;
      case 'flag':
        gameManager.relationships.setFlag(effect.npcId, effect.flag, effect.value);
        break;
      case 'unlock_message':
        // Schedule a follow-up message after delay
        break;
    }
  }
}
