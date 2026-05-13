/**
 * Rika's Dialogue - Conversations available when talking to Rika.
 * 
 * Dialogue varies by:
 * - Time of day (morning greetings vs evening reflections)
 * - Relationship stage (stranger → acquaintance → friend)
 * - Whether specific events have happened
 */

import { RelationshipData, RelationshipStage } from '@/systems/RelationshipSystem';
import { DialogueDefinition } from './DialogueTypes';

export type RikaDialogueLocation = 'downtown' | 'flower_shop' | 'fishing';

export interface RikaDialogueContext {
  day: number;
  timePeriod: string;
  weather: string;
  location: RikaDialogueLocation;
  relationshipStage: RelationshipStage;
  relationship?: RelationshipData;
}

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

export const RIKA_FIRST_DAY_CHECKIN: DialogueDefinition = {
  id: 'rika_first_day_checkin',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Hari pertama biasanya aneh, ya? Semua jalan terasa seperti sedang menguji apakah kamu hafal arah pulang.',
      emotion: 'gentle_smile',
      typeSpeed: 0.65,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kalau Brongwood terasa terlalu pelan, jangan buru-buru menilai. Kota ini memang kenalannya pakai tempo lambat.',
      typeSpeed: 0.7,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Aku sedang mencoba membiasakan diri.',
          choiceId: 'settling_in',
          next: 'settling',
          effects: [{ type: 'add_trust', npcId: 'rika', amount: 4 }],
        },
        {
          text: 'Sejauh ini, aku suka tempat ini.',
          choiceId: 'like_town',
          next: 'likes_town',
          effects: [{ type: 'add_affection', npcId: 'rika', amount: 4 }],
        },
      ],
    },
    settling: {
      type: 'text',
      id: 'settling',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Pelan-pelan saja. Bahkan tanaman yang sok kuat pun butuh waktu sebelum akarnya percaya pada tanah baru.',
      emotion: 'warm',
      typeSpeed: 0.65,
      next: null,
    },
    likes_town: {
      type: 'text',
      id: 'likes_town',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Bagus. Nanti kalau kamu mulai mengeluh soal jalanan yang sama terus, berarti kamu resmi warga sini.',
      emotion: 'happy',
      typeSpeed: 0.7,
      next: null,
    },
  },
};

export const RIKA_RAINY_DAY: DialogueDefinition = {
  id: 'rika_rainy_day',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Hujan begini bikin semua warna kota jadi lebih jujur. Hijau jadi hijau beneran, atap jadi lebih tua.',
      emotion: 'melancholic',
      typeSpeed: 0.65,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku suka hujan, tapi kadang dia terlalu pintar mengingatkan hal-hal yang sudah lama pura-pura rapi.',
      typeSpeed: 0.65,
      next: 'memory',
    },
    memory: {
      type: 'action',
      id: 'memory',
      actions: [
        {
          type: 'create_memory',
          npcId: 'rika',
          memoryId: 'rika_rainy_small_talk',
          description: 'Talked with Rika while rain softened Brongwood.',
          tags: ['rainy', 'gentle'],
        },
        { type: 'add_trust', npcId: 'rika', amount: 3 },
      ],
      next: null,
    },
  },
};

export const RIKA_FLOWER_SHOP: DialogueDefinition = {
  id: 'rika_flower_shop',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Selamat datang di markas kecilku. Kalau ada bunga yang kelihatan menghakimi, abaikan. Mereka memang begitu.',
      emotion: 'happy',
      typeSpeed: 0.7,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Di toko, aku biasanya lebih cerewet. Mungkin karena di sini aku kalah jumlah sama pot tanaman.',
      typeSpeed: 0.7,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Tempat ini terasa seperti kamu.',
          choiceId: 'shop_feels_like_you',
          next: 'warm',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 6 },
            { type: 'add_trust', npcId: 'rika', amount: 2 },
          ],
        },
        {
          text: 'Bunga mana yang paling kamu suka?',
          choiceId: 'favorite_flower',
          next: 'favorite',
          effects: [{ type: 'add_trust', npcId: 'rika', amount: 4 }],
        },
      ],
    },
    warm: {
      type: 'text',
      id: 'warm',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Wah. Itu pujian yang licik, karena susah dibalas tanpa jadi malu sendiri.',
      emotion: 'warm',
      typeSpeed: 0.62,
      next: null,
    },
    favorite: {
      type: 'text',
      id: 'favorite',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Yang belum mekar. Ada sesuatu yang menenangkan dari hal kecil yang belum selesai, tapi tetap berusaha.',
      emotion: 'gentle_smile',
      typeSpeed: 0.62,
      next: null,
    },
  },
};

export const RIKA_FISHING_SPOT: DialogueDefinition = {
  id: 'rika_fishing_spot',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Pantai selalu terdengar seperti sedang menasihati orang, ya? Masalahnya, ombak ngomongnya muter-muter.',
      emotion: 'gentle_smile',
      typeSpeed: 0.7,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kalau kamu mancing di sini, jangan terlalu serius. Ikan bisa mencium ambisi. Mungkin.',
      typeSpeed: 0.72,
      next: null,
    },
  },
};

export const RIKA_FRIEND_DAY: DialogueDefinition = {
  id: 'rika_friend_day',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku mulai hafal suara langkahmu. Tenang, itu belum menyeramkan. Masih level observasi warga kecil.',
      emotion: 'warm',
      typeSpeed: 0.65,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aneh juga, ya. Dulu kamu orang baru. Sekarang kalau sehari tidak kelihatan, kota rasanya seperti ada kursi yang kosong.',
      typeSpeed: 0.62,
      next: null,
    },
  },
};

export const RIKA_CLOSE_FRIEND_NIGHT: DialogueDefinition = {
  id: 'rika_close_friend_night',
  startNode: 'start',
  nodes: {
    start: {
      type: 'text',
      id: 'start',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Malam membuat Brongwood terdengar lebih kecil. Seperti semua rumah menahan napas bersamaan.',
      emotion: 'melancholic',
      typeSpeed: 0.58,
      next: 'confide',
    },
    confide: {
      type: 'text',
      id: 'confide',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku senang kamu ada. Tidak perlu melakukan apa-apa. Kadang ditemani tanpa dibereskan itu cukup.',
      emotion: 'warm',
      typeSpeed: 0.55,
      next: 'memory',
    },
    memory: {
      type: 'action',
      id: 'memory',
      actions: [
        {
          type: 'create_memory',
          npcId: 'rika',
          memoryId: 'shared_vulnerable_moment',
          description: 'Rika admitted that quiet company is enough.',
          tags: ['shared_vulnerable_moment', 'night', 'vulnerable'],
        },
        { type: 'add_trust', npcId: 'rika', amount: 6 },
      ],
      next: null,
    },
  },
};

/**
 * Get the appropriate dialogue for Rika based on current game state.
 */
export function getRikaDialogue(
  hasMetRika: boolean,
  timePeriod: string,
  context?: Partial<RikaDialogueContext>
): DialogueDefinition {
  if (!hasMetRika) {
    return RIKA_FIRST_MEETING;
  }

  const stage = context?.relationshipStage ?? 'acquaintance';
  const location = context?.location ?? 'downtown';
  const weather = context?.weather ?? 'clear';
  const day = context?.day ?? 1;
  const interactions = context?.relationship?.totalInteractions ?? 0;

  if (location === 'flower_shop') {
    return RIKA_FLOWER_SHOP;
  }

  if (location === 'fishing') {
    return RIKA_FISHING_SPOT;
  }

  if (weather !== 'clear') {
    return RIKA_RAINY_DAY;
  }

  if (stage === 'close_friend' || stage === 'confidant' || stage === 'soulmate') {
    if (timePeriod === 'night' || timePeriod === 'late_night') {
      return RIKA_CLOSE_FRIEND_NIGHT;
    }
    return RIKA_FRIEND_DAY;
  }

  if (stage === 'friend' && interactions > 5) {
    return RIKA_FRIEND_DAY;
  }

  if (day === 1) {
    return RIKA_FIRST_DAY_CHECKIN;
  }

  if (timePeriod === 'morning' || timePeriod === 'dawn') {
    return RIKA_MORNING_GREETING;
  }

  return RIKA_EVENING;
}
