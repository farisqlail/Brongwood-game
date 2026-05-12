/**
 * "Rainy Night at the Flower Shop" - First Emotional Event
 * 
 * SCENE DESCRIPTION:
 * It's a rainy night. The player walks past the flower shop.
 * The light is still on — Rika is inside, alone.
 * When the player approaches, a cutscene triggers:
 * Rika asks a vulnerable question about the monotony of life.
 * 
 * EMOTIONAL DESIGN:
 * This is the first moment where the game reveals its emotional depth.
 * The player should feel:
 * - Surprise (an NPC being vulnerable)
 * - Connection (shared loneliness)
 * - Warmth (being trusted with someone's feelings)
 * - Melancholy (the question itself is sad)
 * 
 * TRIGGER CONDITIONS:
 * - Time: night or late_night (20:00-02:00)
 * - Relationship: at least 'acquaintance' stage with Rika
 * - Weather: raining (future) OR always available for now
 * - Not already completed
 * 
 * RELATIONSHIP EFFECTS:
 * - Creates memory: "rainy_night_confession"
 * - Adds significant trust (+20)
 * - Adds affection (+15)
 * - Sets flag: "rika_opened_up"
 * - Tags: 'night', 'rain', 'vulnerable', 'shared_vulnerable_moment'
 */

import { DialogueDefinition } from '../DialogueTypes';

export const RAINY_NIGHT_FLOWER_SHOP: DialogueDefinition = {
  id: 'event_rainy_night_flower_shop',
  startNode: 'start',
  conditions: {
    timePeriod: ['night', 'late_night'],
    relationship: {
      npcId: 'rika',
      minStage: 'acquaintance',
    },
  },
  priority: 100,
  nodes: {
    // --- Opening: atmospheric setup ---
    start: {
      type: 'text',
      id: 'start',
      speaker: 'narrator',
      text: 'Lampu toko bunga masih menyala. Dari balik jendela yang basah hujan, terlihat seseorang di dalam.',
      typeSpeed: 0.7,
      next: 'approach',
    },

    approach: {
      type: 'action',
      id: 'approach',
      actions: [
        { type: 'camera_zoom', zoom: 1.3, duration: 1500 },
      ],
      next: 'rika_notice',
    },

    rika_notice: {
      type: 'text',
      id: 'rika_notice',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Eh... kamu masih di luar? Hujan-hujanan begini? Kamu kuat atau cuma nekat?',
      emotion: 'surprised',
      typeSpeed: 0.8,
      next: 'rika_pause',
    },

    rika_pause: {
      type: 'text',
      id: 'rika_pause',
      speaker: 'rika',
      speakerName: 'Rika',
      text: '...',
      typeSpeed: 0.3,
      autoAdvanceDelay: 1500,
      next: 'rika_question',
    },

    rika_question: {
      type: 'text',
      id: 'rika_question',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kamu pernah capek nggak, menjalani hari yang rasanya itu-itu saja?',
      emotion: 'melancholic',
      typeSpeed: 0.6,
      next: 'player_choice',
    },

    // --- Player response ---
    player_choice: {
      type: 'choice',
      id: 'player_choice',
      choices: [
        {
          text: 'Iya... kadang rasanya tidak ada yang berubah.',
          choiceId: 'empathize',
          next: 'rika_empathy_response',
          effects: [
            { type: 'add_trust', npcId: 'rika', amount: 10 },
            { type: 'add_affection', npcId: 'rika', amount: 10 },
          ],
        },
        {
          text: 'Menurutku tiap hari punya hal kecil yang layak diperhatikan.',
          choiceId: 'hopeful',
          next: 'rika_hopeful_response',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 15 },
            { type: 'add_trust', npcId: 'rika', amount: 5 },
          ],
        },
        {
          text: 'Kenapa kamu tanya begitu?',
          choiceId: 'curious',
          next: 'rika_curious_response',
          effects: [
            { type: 'add_trust', npcId: 'rika', amount: 8 },
          ],
        },
      ],
    },

    // --- Response branches ---
    rika_empathy_response: {
      type: 'text',
      id: 'rika_empathy_response',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Kan? Bangun, buka toko, tutup toko. Terus besok ulang lagi. Rasanya hidup lagi copy-paste.',
      emotion: 'sad',
      typeSpeed: 0.7,
      next: 'rika_smile',
    },

    rika_hopeful_response: {
      type: 'text',
      id: 'rika_hopeful_response',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Hal kecil yang layak diperhatikan...',
      emotion: 'thoughtful',
      typeSpeed: 0.6,
      next: 'rika_hopeful_2',
    },

    rika_hopeful_2: {
      type: 'text',
      id: 'rika_hopeful_2',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Aku suka itu. Mungkin aku cuma lupa cara melihat. Waduh, terdengar puitis. Jangan bilang bunga-bunga, nanti mereka besar kepala.',
      emotion: 'gentle_smile',
      typeSpeed: 0.7,
      next: 'rika_smile',
    },

    rika_curious_response: {
      type: 'text',
      id: 'rika_curious_response',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Entahlah. Malam hujan bikin otakku buka rapat tanpa izin.',
      emotion: 'embarrassed',
      typeSpeed: 0.7,
      next: 'rika_smile',
    },

    // --- Convergence: all paths lead here ---
    rika_smile: {
      type: 'text',
      id: 'rika_smile',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Maaf, ya. Aneh banget ngomong begini ke orang yang belum terlalu kukenal.',
      emotion: 'embarrassed',
      typeSpeed: 0.8,
      next: 'rika_thanks',
    },

    rika_thanks: {
      type: 'text',
      id: 'rika_thanks',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Tapi... makasih sudah dengar. Lumayan rasanya tidak sendirian sama isi kepala sendiri.',
      emotion: 'warm',
      typeSpeed: 0.7,
      next: 'closing_action',
    },

    // --- Closing: relationship effects ---
    closing_action: {
      type: 'action',
      id: 'closing_action',
      actions: [
        { type: 'add_trust', npcId: 'rika', amount: 10 },
        {
          type: 'create_memory',
          npcId: 'rika',
          memoryId: 'rainy_night_confession',
          description: 'Rika terbuka tentang rasa terjebak dalam rutinitas pada malam hujan.',
          tags: ['night', 'rain', 'vulnerable', 'shared_vulnerable_moment'],
        },
        { type: 'set_flag', npcId: 'rika', flag: 'rika_opened_up', value: true },
        { type: 'camera_reset', duration: 1000 },
      ],
      next: 'narrator_close',
    },

    narrator_close: {
      type: 'text',
      id: 'narrator_close',
      speaker: 'narrator',
      text: 'Hujan masih turun. Tapi entah bagaimana, malam terasa sedikit lebih hangat.',
      typeSpeed: 0.6,
      next: null, // End of dialogue
    },
  },
};
