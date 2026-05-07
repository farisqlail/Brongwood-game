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
      text: 'Oh! Hi there. I haven\'t seen you around before.',
      typeSpeed: 0.8,
      next: 'intro',
    },
    intro: {
      type: 'text',
      id: 'intro',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'I\'m Rika. I run the flower shop here. Well... it\'s more of a hobby that got out of hand.',
      typeSpeed: 0.8,
      next: 'question',
    },
    question: {
      type: 'text',
      id: 'question',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Are you new in town? Brongwood doesn\'t get many visitors.',
      typeSpeed: 0.8,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Yeah, just arrived. It\'s a quiet place.',
          choiceId: 'new_here',
          next: 'response_new',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 5 },
            { type: 'add_trust', npcId: 'rika', amount: 3 },
          ],
        },
        {
          text: 'Your flowers are beautiful.',
          choiceId: 'flowers',
          next: 'response_flowers',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 8 },
          ],
        },
        {
          text: 'Just passing through.',
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
      text: 'Quiet... yeah. That\'s one way to put it. But it grows on you. The quiet, I mean.',
      emotion: 'gentle_smile',
      typeSpeed: 0.7,
      next: 'end_action',
    },
    response_flowers: {
      type: 'text',
      id: 'response_flowers',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Oh! Thank you... I spend way too much time with them. They\'re better listeners than most people.',
      emotion: 'happy',
      typeSpeed: 0.7,
      next: 'end_action',
    },
    response_passing: {
      type: 'text',
      id: 'response_passing',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Ah, I see. Well... if you ever want to stay a while, the town\'s not so bad.',
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
      text: 'Anyway... feel free to stop by anytime. It gets lonely here sometimes.',
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
      text: 'Good morning! The dew on the petals is really pretty today.',
      typeSpeed: 0.8,
      next: 'follow',
    },
    follow: {
      type: 'text',
      id: 'follow',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Did you sleep well? Mornings here are so peaceful...',
      typeSpeed: 0.8,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'Yeah, it\'s nice waking up to this quiet.',
          choiceId: 'peaceful',
          next: 'response_peaceful',
          effects: [{ type: 'add_affection', npcId: 'rika', amount: 3 }],
        },
        {
          text: 'I couldn\'t sleep much, actually.',
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
      text: 'Right? Sometimes I open the shop early just to enjoy the silence before anyone comes.',
      typeSpeed: 0.7,
      next: null,
    },
    response_insomnia: {
      type: 'text',
      id: 'response_insomnia',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'Oh... I know that feeling. The nights can be long here. If you ever need company, I\'m usually up late too.',
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
      text: 'Hey... still out? The sunset is nice from here, isn\'t it?',
      typeSpeed: 0.7,
      next: 'reflect',
    },
    reflect: {
      type: 'text',
      id: 'reflect',
      speaker: 'rika',
      speakerName: 'Rika',
      text: 'I always close the shop around this time. It\'s my favorite part of the day.',
      typeSpeed: 0.7,
      next: 'choice',
    },
    choice: {
      type: 'choice',
      id: 'choice',
      choices: [
        {
          text: 'It is beautiful. Thanks for sharing it with me.',
          choiceId: 'share',
          next: 'response_share',
          effects: [
            { type: 'add_affection', npcId: 'rika', amount: 5 },
            { type: 'add_trust', npcId: 'rika', amount: 3 },
          ],
        },
        {
          text: 'Do you always watch the sunset alone?',
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
      text: '...Sharing it. Yeah. That makes it better, somehow.',
      emotion: 'warm',
      typeSpeed: 0.6,
      next: null,
    },
    response_alone: {
      type: 'text',
      id: 'response_alone',
      speaker: 'rika',
      speakerName: 'Rika',
      text: '...Usually, yeah. But I don\'t mind it. Or... I didn\'t used to mind it.',
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
