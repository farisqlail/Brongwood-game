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
      text: 'Pagi! Bunga mataharinya mekar hari ini. Kalau lewat, mampir ya. Mereka lagi mode pamer.',
      responses: [
        { text: 'Nanti aku mampir!', effects: [{ type: 'affection', npcId: 'rika', amount: 3 }] },
        { text: 'Kedengarannya cantik.', effects: [{ type: 'affection', npcId: 'rika', amount: 1 }] },
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
      text: 'Hujan lagi. Aku tentu saja lupa payung, karena hidupku suka komedi kecil. Kamu suka hujan?',
      responses: [
        { text: 'Suka. Semuanya jadi lebih tenang.', effects: [{ type: 'trust', npcId: 'rika', amount: 3 }] },
        { text: 'Tidak terlalu, tapi enak kalau di dalam.', effects: [{ type: 'affection', npcId: 'rika', amount: 2 }] },
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
      text: 'Senja hari ini cakep banget. Kamu lihat nggak, atau kalah sama kesibukan dunia?',
      responses: [
        { text: 'Lihat. Indah banget.', effects: [{ type: 'affection', npcId: 'rika', amount: 5 }] },
        { text: 'Terlewat. Aku sibuk.', effects: [{ type: 'trust', npcId: 'rika', amount: 2 }] },
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
      text: 'Nggak bisa tidur. Suara laut malam-malam jadi lebih keras. Kamu pernah merasa dunia terlalu sunyi?',
      responses: [
        { text: 'Kadang. Tapi sunyi tidak selalu buruk.', effects: [{ type: 'trust', npcId: 'rika', amount: 5 }, { type: 'affection', npcId: 'rika', amount: 3 }] },
        { text: 'Kamu baik-baik saja?', effects: [{ type: 'trust', npcId: 'rika', amount: 8 }] },
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
      text: 'Aku nemu bunga yang belum pernah kulihat. Tumbuh di retakan trotoar. Kecil, nekat, keren. Iya kan?',
      responses: [
        { text: 'Hidup selalu cari jalan, bahkan di tempat sulit.', effects: [{ type: 'trust', npcId: 'rika', amount: 5 }, { type: 'affection', npcId: 'rika', amount: 5 }] },
        { text: 'Kamu perhatian pada hal kecil. Aku suka itu.', effects: [{ type: 'affection', npcId: 'rika', amount: 8 }] },
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
      text: 'Aku kepikiran omonganmu malam itu. Soal tiap hari punya hal kecil yang layak dilihat. Aku lagi coba percaya itu.',
      responses: [
        { text: 'Aku lebih percaya saat bersamamu.', effects: [{ type: 'affection', npcId: 'rika', amount: 10 }, { type: 'trust', npcId: 'rika', amount: 5 }] },
        { text: 'Butuh latihan. Tapi kamu sedang melakukannya.', effects: [{ type: 'trust', npcId: 'rika', amount: 8 }] },
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
      text: 'Maaf chat malam-malam. Aku cuma... pengin ngobrol sama seseorang. Lebih tepatnya sama kamu. Plot twist kecil.',
      responses: [
        { text: 'Aku senang kamu chat. Aku di sini.', effects: [{ type: 'trust', npcId: 'rika', amount: 10 }, { type: 'affection', npcId: 'rika', amount: 8 }] },
        { text: 'Kamu selalu boleh chat aku. Kapan saja.', effects: [{ type: 'trust', npcId: 'rika', amount: 12 }] },
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

