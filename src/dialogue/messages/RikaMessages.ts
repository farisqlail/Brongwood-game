/**
 * Rika's Phone Messages - Asynchronous emotional connection.
 * 
 * EMOTIONAL DESIGN:
 * These messages make the player feel thought about.
 * Rika texts at emotionally appropriate times:
 * - Morning: hopeful, gentle
 * - Evening: reflective, warm
 * - Night: vulnerable, intimate
 * - After events: processing, grateful
 * 
 * Messages progress with the relationship:
 * - Stranger: no messages
 * - Acquaintance: polite, surface-level
 * - Friend: personal, sharing thoughts
 * - Close friend: vulnerable, late-night confessions
 * 
 * PACING:
 * Messages don't spam. Minimum 6 hours between messages.
 * This creates anticipation — the player WAITS for the next one.
 */

import { ScheduledMessage } from '@/systems/PhoneSystem';

export const RIKA_MESSAGES: ScheduledMessage[] = [
  // ============================================================
  // ACQUAINTANCE STAGE
  // ============================================================
  {
    id: 'rika_msg_morning_1',
    message: {
      id: 'rika_msg_morning_1',
      sender: 'rika',
      text: 'Good morning! The sunflowers bloomed today. Thought you might want to see them if you pass by.',
      responses: [
        { text: 'I\'ll stop by later!', effects: [{ type: 'affection', npcId: 'rika', amount: 3 }] },
        { text: 'That sounds nice.', effects: [{ type: 'affection', npcId: 'rika', amount: 1 }] },
      ],
    },
    conditions: {
      timePeriods: ['morning'],
      minDay: 3,
      minStage: 'acquaintance',
      minHoursSinceLastMessage: 12,
    },
    priority: 10,
    oneShot: true,
  },
  {
    id: 'rika_msg_rain_1',
    message: {
      id: 'rika_msg_rain_1',
      sender: 'rika',
      text: 'It\'s raining again. I always forget my umbrella. Do you like the rain?',
      responses: [
        { text: 'I love it. It makes everything feel quiet.', effects: [{ type: 'trust', npcId: 'rika', amount: 3 }] },
        { text: 'Not really, but it\'s cozy inside.', effects: [{ type: 'affection', npcId: 'rika', amount: 2 }] },
      ],
    },
    conditions: {
      timePeriods: ['evening', 'night'],
      minDay: 4,
      minStage: 'acquaintance',
      minHoursSinceLastMessage: 8,
    },
    priority: 15,
    oneShot: true,
  },

  // ============================================================
  // FRIEND STAGE
  // ============================================================
  {
    id: 'rika_msg_evening_1',
    message: {
      id: 'rika_msg_evening_1',
      sender: 'rika',
      text: 'The sunset was really pretty today. Did you see it?',
      responses: [
        { text: 'Yeah, it was beautiful.', effects: [{ type: 'affection', npcId: 'rika', amount: 5 }] },
        { text: 'I missed it. Was busy.', effects: [{ type: 'trust', npcId: 'rika', amount: 2 }] },
      ],
    },
    conditions: {
      timePeriods: ['evening', 'night'],
      minDay: 8,
      minStage: 'friend',
      minHoursSinceLastMessage: 10,
    },
    priority: 20,
    oneShot: true,
  },
  {
    id: 'rika_msg_night_1',
    message: {
      id: 'rika_msg_night_1',
      sender: 'rika',
      text: 'Can\'t sleep. The ocean sounds louder at night. Do you ever feel like the world is too quiet?',
      responses: [
        { text: 'Sometimes. But quiet isn\'t always bad.', effects: [{ type: 'trust', npcId: 'rika', amount: 5 }, { type: 'affection', npcId: 'rika', amount: 3 }] },
        { text: 'Are you okay?', effects: [{ type: 'trust', npcId: 'rika', amount: 8 }] },
      ],
    },
    conditions: {
      timePeriods: ['late_night'],
      minDay: 10,
      minStage: 'friend',
      minHoursSinceLastMessage: 12,
    },
    priority: 25,
    oneShot: true,
  },
  {
    id: 'rika_msg_flower_1',
    message: {
      id: 'rika_msg_flower_1',
      sender: 'rika',
      text: 'I found a flower I\'ve never seen before today. It was growing between the cracks in the sidewalk. Isn\'t that kind of amazing?',
      responses: [
        { text: 'Life finds a way, even in hard places.', effects: [{ type: 'trust', npcId: 'rika', amount: 5 }, { type: 'affection', npcId: 'rika', amount: 5 }] },
        { text: 'You notice the small things. I like that about you.', effects: [{ type: 'affection', npcId: 'rika', amount: 8 }] },
      ],
    },
    conditions: {
      timePeriods: ['afternoon', 'evening'],
      minDay: 12,
      minStage: 'friend',
      minHoursSinceLastMessage: 14,
    },
    priority: 20,
    oneShot: true,
  },

  // ============================================================
  // CLOSE FRIEND STAGE
  // ============================================================
  {
    id: 'rika_msg_vulnerable_1',
    message: {
      id: 'rika_msg_vulnerable_1',
      sender: 'rika',
      text: 'I was thinking about what you said the other night. About every day having something worth noticing. I\'m trying to believe that.',
      responses: [
        { text: 'I believe it more when I\'m with you.', effects: [{ type: 'affection', npcId: 'rika', amount: 10 }, { type: 'trust', npcId: 'rika', amount: 5 }] },
        { text: 'It takes practice. But you\'re doing it.', effects: [{ type: 'trust', npcId: 'rika', amount: 8 }] },
      ],
    },
    conditions: {
      timePeriods: ['night', 'late_night'],
      minDay: 15,
      minStage: 'close_friend',
      minHoursSinceLastMessage: 16,
      requiredFlags: ['rika_opened_up'],
    },
    priority: 30,
    oneShot: true,
  },
  {
    id: 'rika_msg_late_night_1',
    message: {
      id: 'rika_msg_late_night_1',
      sender: 'rika',
      text: 'Sorry for texting so late. I just... wanted to talk to someone. To you, specifically.',
      responses: [
        { text: 'I\'m glad you texted. I\'m here.', effects: [{ type: 'trust', npcId: 'rika', amount: 10 }, { type: 'affection', npcId: 'rika', amount: 8 }] },
        { text: 'You can always text me. Anytime.', effects: [{ type: 'trust', npcId: 'rika', amount: 12 }] },
      ],
    },
    conditions: {
      timePeriods: ['late_night'],
      minDay: 18,
      minStage: 'close_friend',
      minHoursSinceLastMessage: 20,
    },
    priority: 35,
    oneShot: true,
  },
];

