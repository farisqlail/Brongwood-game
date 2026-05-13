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
    id: 'rika_msg_first_quiet',
    message: {
      id: 'rika_msg_first_quiet',
      sender: 'rika',
      text: 'Ini Rika. Aku simpan nomormu tadi. Tidak perlu dibalas cepat. Cuma... selamat datang lagi di Brongwood.',
      responses: [
        { text: 'Makasih. Pesan ini menenangkan.', effects: [{ type: 'trust', npcId: 'rika', amount: 4 }] },
        { text: 'Aku senang kamu mengirim pesan.', effects: [{ type: 'affection', npcId: 'rika', amount: 4 }] },
      ],
    },
    conditions: {
      timePeriods: ['evening', 'night'],
      minDay: 1,
      minStage: 'acquaintance',
      minInteractions: 1,
      requiredFlags: ['met_rika'],
      minHoursSinceLastMessage: 8,
    },
    priority: 30,
    oneShot: true,
  },
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
      requiredFlags: ['met_rika'],
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
      requiredMemoryTags: ['rainy'],
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
      requiredMemoryTags: ['shared_vulnerable_moment'],
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

  // ============================================================
  // TOWN WHISPERS - rare, gentle signs that the town is noticing you
  // ============================================================
  {
    id: 'fisher_msg_first_catch',
    message: {
      id: 'fisher_msg_first_catch',
      sender: 'fisher',
      text: 'Anak baru, kalau ke pantai pagi-pagi jangan lupa lihat warna air. Kalau hijau tua, ikan lagi malas. Kita hormati kemalasan mereka.',
      responses: [
        { text: 'Terima kasih, Pak. Akan kuingat.', effects: [{ type: 'trust', npcId: 'fisher', amount: 3 }] },
        { text: 'Ikan malas terdengar masuk akal.', effects: [{ type: 'affection', npcId: 'fisher', amount: 2 }] },
      ],
    },
    conditions: {
      timePeriods: ['morning'],
      minDay: 3,
      minHoursSinceLastMessage: 20,
    },
    priority: 5,
    oneShot: true,
  },
  {
    id: 'elder_msg_town_lights',
    message: {
      id: 'elder_msg_town_lights',
      sender: 'elder',
      text: 'Lampu rumahmu terlihat dari jalan kecil tadi malam. Aneh ya, satu lampu baru bisa membuat kota tua terasa tidak terlalu kosong.',
      responses: [
        { text: 'Aku juga mulai merasa tidak terlalu sendiri.', effects: [{ type: 'trust', npcId: 'elder', amount: 4 }] },
        { text: 'Terima kasih sudah memperhatikan.', effects: [{ type: 'affection', npcId: 'elder', amount: 2 }] },
      ],
    },
    conditions: {
      timePeriods: ['night'],
      minDay: 5,
      minHoursSinceLastMessage: 30,
    },
    priority: 6,
    oneShot: true,
  },
  {
    id: 'farmer_msg_seed_patience',
    message: {
      id: 'farmer_msg_seed_patience',
      sender: 'farmer',
      text: 'Kalau tanamanmu belum tumbuh, jangan langsung curiga pada bibit. Kadang hidup cuma sedang bekerja di bawah tanah.',
      responses: [
        { text: 'Aku butuh mendengar itu hari ini.', effects: [{ type: 'trust', npcId: 'farmer', amount: 3 }] },
        { text: 'Baik, aku akan sabar.', effects: [{ type: 'affection', npcId: 'farmer', amount: 2 }] },
      ],
    },
    conditions: {
      timePeriods: ['afternoon', 'evening'],
      minDay: 7,
      minHoursSinceLastMessage: 30,
    },
    priority: 5,
    oneShot: true,
  },
];

