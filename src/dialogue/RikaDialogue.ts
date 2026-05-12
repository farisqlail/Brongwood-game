/**
 * Rika's Dialogue - Conversations available when talking to Rika.
 * 
 * Dialogue varies by:
 * - Time of day (morning greetings vs evening reflections)
 * - Relationship stage (stranger → acquaintance → friend)
 * - Whether specific events have happened
 */

import { DialogueDefinition } from './DialogueTypes';

/**
 * First meeting dialogue (stranger stage).
 */
export const RIKA_FIRST_MEETING: DialogueDefinition = {
  id: 'rika_first_meeting',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Eh! Hai. Kamu baru, ya? Aku kayaknya belum pernah lihat kamu di sekitar sini.',
      typeSpeed: 0.55,
      next: 'intro',
    },
    intro: {
      type: 'text',
      id: 'intro',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku Rika. Yang jagain toko bunga itu aku. Awalnya hobi, terus kebablasan jadi kerjaan. Klasik banget.',
      typeSpeed: 0.55,
      next: 'question',
    },
    question: {
      type: 'text',
      id: 'question',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kamu baru pindah ke Brongwood? Kota ini jarang kedatangan orang baru. Biasanya cuma angin lewat, sok misterius.',
      typeSpeed: 0.55,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Iya, baru datang. Tempatnya tenang banget.',
          choiceId: 'new_here',
          next: 'response_new',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 5 },
            { type: 'add_trust', npcId: 'rika', amount: 3 },
          ],
        },
        {
          text: 'Bungamu cantik.',
          choiceId: 'flowers',
          next: 'response_flowers',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 8 },
          ],
        },
        {
          text: 'Cuma lewat saja.',
          choiceId: 'passing',
          next: 'response_passing',
          effects: [
            { type: 'add_trust', npcId: 'rika', amount: 2 },
          ],
        },
      ],
    },
    response_new: {
      type: 'text',
      id: 'response_new',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Tenang... iya, itu versi sopannya. Tapi nanti nagih kok. Sunyinya kayak teh hangat, awalnya biasa, tahu-tahu habis.',
      emotion: 'gentle_smile',
      typeSpeed: 0.7,
      next: 'end_action',
    },
    response_flowers: {
      type: 'text',
      id: 'response_flowers',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aduh, makasih! Aku memang kebanyakan ngobrol sama mereka. Bunga itu pendengar yang bagus, meski jawabannya cuma "..."',
      emotion: 'happy',
      typeSpeed: 0.7,
      next: 'end_action',
    },
    response_passing: {
      type: 'text',
      id: 'response_passing',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Oh, begitu. Kalau suatu saat mau singgah lebih lama, kota ini lumayan kok. Tidak menggigit. Biasanya.',
      emotion: 'neutral',
      typeSpeed: 0.8,
      next: 'end_action',
    },
    end_action: {
      type: 'action',
      id: 'end_action',
      actions: [
        { type: 'set_flag', npcId: 'rika', flag: 'met_rika', value: true },
        { type: 'add_trust', npcId: 'rika', amount: 5 },
      ],
      next: 'goodbye',
    },
    goodbye: {
      type: 'text',
      id: 'goodbye',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Pokoknya mampir saja kapan-kapan. Toko bungaku sering sepi, kecuali kalau bunga-bunga mulai drama.',
      emotion: 'warm',
      typeSpeed: 0.7,
      next: null,
    },
  },
};

/**
 * Daily greeting (acquaintance stage, morning).
 */
export const RIKA_MORNING_GREETING: DialogueDefinition = {
  id: 'rika_morning',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Pagi! Embun di kelopak hari ini cakep banget. Aku hampir bilang "fotogenik", padahal bunga nggak butuh validasi.',
      typeSpeed: 0.55,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Tidurmu nyenyak? Pagi di sini damai banget, sampai rasanya alarm pun harus minta izin dulu.',
      typeSpeed: 0.55,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Iya, enak bangun dalam suasana setenang ini.',
          choiceId: 'peaceful',
          next: 'response_peaceful',
          effects: [{ type: 'add_affection', npcId: 'rika', amount: 3 }],
        },
        {
          text: 'Sebenarnya aku kurang tidur.',
          choiceId: 'insomnia',
          next: 'response_insomnia',
          effects: [{ type: 'add_trust', npcId: 'rika', amount: 5 }],
        },
      ],
    },
    response_peaceful: {
      type: 'text',
      id: 'response_peaceful',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kan? Kadang aku buka toko lebih awal cuma buat menikmati sunyi sebelum dunia mulai berisik.',
      typeSpeed: 0.7,
      next: null,
    },
    response_insomnia: {
      type: 'text',
      id: 'response_insomnia',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aduh, aku paham. Malam di sini bisa panjang banget. Kalau butuh teman ngobrol, aku sering begadang juga. Bukan teladan, tapi berguna.',
      emotion: 'concerned',
      typeSpeed: 0.7,
      next: null,
    },
  },
};

/**
 * Evening dialogue (acquaintance stage).
 */
export const RIKA_EVENING: DialogueDefinition = {
  id: 'rika_evening',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Hei, masih keluyuran? Senja dari sini bagus, kan? Langitnya niat banget hari ini.',
      typeSpeed: 0.7,
      next: 'reflect',
    },
    reflect: {
      type: 'text',
      id: 'reflect',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku biasanya tutup toko jam segini. Ini bagian favoritku, saat bunga mulai diam dan aku pura-pura tidak lapar.',
      typeSpeed: 0.7,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Indah. Terima kasih sudah berbagi momen ini.',
          choiceId: 'share',
          next: 'response_share',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 5 },
            { type: 'add_trust', npcId: 'rika', amount: 3 },
          ],
        },
        {
          text: 'Kamu biasanya lihat senja sendirian?',
          choiceId: 'alone',
          next: 'response_alone',
          effects: [{ type: 'add_trust', npcId: 'rika', amount: 8 }],
        },
      ],
    },
    response_share: {
      type: 'text',
      id: 'response_share',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Berbagi, ya... iya. Rasanya memang jadi lebih bagus. Senjanya langsung naik level.',
      emotion: 'warm',
      typeSpeed: 0.6,
      next: null,
    },
    response_alone: {
      type: 'text',
      id: 'response_alone',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Biasanya iya. Tapi aku tidak keberatan kok. Atau... dulu kupikir aku tidak keberatan.',
      emotion: 'melancholic',
      typeSpeed: 0.6,
      next: null,
    },
  },
};

/**
 * Get the appropriate dialogue for Rika based on current game state.
 */
export function getRikaDialogue(
  hasMetRika: boolean,
  timePeriod: string
): DialogueDefinition {
  if (!hasMetRika) {
    return RIKA_FIRST_MEETING;
  }

  if (timePeriod === 'morning' || timePeriod === 'dawn') {
    return RIKA_MORNING_GREETING;
  }

  return RIKA_EVENING;
}
