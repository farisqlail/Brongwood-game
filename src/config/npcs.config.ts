/**
 * NPC Configuration - All 10 townspeople of Brongwood.
 * Each has a unique position, personality, and dialogue.
 */

import { TEXTURE_KEYS } from './assets.manifest';
import { GAME_CONFIG } from './game.config';
import { DialogueDefinition } from '@/dialogue/DialogueTypes';

const ts = GAME_CONFIG.TILE_SIZE;

export interface NPCData {
  id: string;
  name: string;
  textureKey: string;
  x: number;
  y: number;
  wanderRadius: number;
  dialogue: DialogueDefinition;
}

export const TOWN_NPCS: NPCData[] = [
  {
    id: 'baker',
    name: 'Hana',
    textureKey: TEXTURE_KEYS.NPC_BAKER,
    x: ts * 3, y: ts * 3.5,
    wanderRadius: 30,
    dialogue: {
      id: 'baker_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'baker', speakerName: 'Hana', text: 'The bread is almost ready! The whole street smells like fresh wheat in the morning.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'baker', speakerName: 'Hana', text: 'Would you like to try some? I always make extra.', next: null },
      },
    },
  },
  {
    id: 'fisher',
    name: 'Old Taro',
    textureKey: TEXTURE_KEYS.NPC_FISHER,
    x: ts * 13, y: ts * 8.5,
    wanderRadius: 25,
    dialogue: {
      id: 'fisher_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'fisher', speakerName: 'Old Taro', text: 'The fish aren\'t biting today... but that\'s fine. I come here for the quiet.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'fisher', speakerName: 'Old Taro', text: 'Sometimes doing nothing is the best thing you can do, kid.', next: null },
      },
    },
  },
  {
    id: 'elder',
    name: 'Grandma Mei',
    textureKey: TEXTURE_KEYS.NPC_ELDER,
    x: ts * 8, y: ts * 2,
    wanderRadius: 20,
    dialogue: {
      id: 'elder_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'elder', speakerName: 'Grandma Mei', text: 'This town used to be so lively... Now it\'s just us old folks and the wind.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'elder', speakerName: 'Grandma Mei', text: 'But you know what? I think quiet has its own kind of beauty.', next: null },
      },
    },
  },
  {
    id: 'girl',
    name: 'Yuki',
    textureKey: TEXTURE_KEYS.NPC_GIRL,
    x: ts * 11, y: ts * 3,
    wanderRadius: 40,
    dialogue: {
      id: 'girl_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'girl', speakerName: 'Yuki', text: 'I found a ladybug today! It landed right on my nose!', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'girl', speakerName: 'Yuki', text: 'Do you think bugs have feelings? I hope it was happy.', next: null },
      },
    },
  },
  {
    id: 'boy',
    name: 'Kenta',
    textureKey: TEXTURE_KEYS.NPC_BOY,
    x: ts * 5, y: ts * 7,
    wanderRadius: 45,
    dialogue: {
      id: 'boy_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'boy', speakerName: 'Kenta', text: 'I\'m gonna explore the whole world someday! But first... I need to finish my homework.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'boy', speakerName: 'Kenta', text: 'Hey, do you know any cool places around here?', next: null },
      },
    },
  },
  {
    id: 'merchant',
    name: 'Mr. Sato',
    textureKey: TEXTURE_KEYS.NPC_MERCHANT,
    x: ts * 12, y: ts * 6,
    wanderRadius: 25,
    dialogue: {
      id: 'merchant_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'merchant', speakerName: 'Mr. Sato', text: 'Business is slow, but I can\'t complain. At least the view is free.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'merchant', speakerName: 'Mr. Sato', text: 'Let me know if you need anything. I\'ve got a bit of everything.', next: null },
      },
    },
  },
  {
    id: 'farmer',
    name: 'Daichi',
    textureKey: TEXTURE_KEYS.NPC_FARMER,
    x: ts * 2, y: ts * 7.5,
    wanderRadius: 35,
    dialogue: {
      id: 'farmer_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'farmer', speakerName: 'Daichi', text: 'The soil here is good. Rich and dark. Things grow well if you give them time.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'farmer', speakerName: 'Daichi', text: 'People are like that too, I think. Just need patience.', next: null },
      },
    },
  },
  {
    id: 'artist',
    name: 'Mio',
    textureKey: TEXTURE_KEYS.NPC_ARTIST,
    x: ts * 9, y: ts * 8,
    wanderRadius: 30,
    dialogue: {
      id: 'artist_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'artist', speakerName: 'Mio', text: 'I\'m trying to paint the sky but... it keeps changing. That\'s what makes it beautiful, I guess.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'artist', speakerName: 'Mio', text: 'Do you ever feel like the world is too pretty to capture?', next: null },
      },
    },
  },
  {
    id: 'postman',
    name: 'Jiro',
    textureKey: TEXTURE_KEYS.NPC_POSTMAN,
    x: ts * 6, y: ts * 5.5,
    wanderRadius: 50,
    dialogue: {
      id: 'postman_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'postman', speakerName: 'Jiro', text: 'No letters today. Honestly, nobody writes anymore. But I still walk the route.', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'postman', speakerName: 'Jiro', text: 'It\'s nice to have a reason to say hello to everyone.', next: null },
      },
    },
  },
  {
    id: 'librarian',
    name: 'Aoi',
    textureKey: TEXTURE_KEYS.NPC_LIBRARIAN,
    x: ts * 10, y: ts * 2.5,
    wanderRadius: 20,
    dialogue: {
      id: 'librarian_chat', startNode: 's1',
      nodes: {
        s1: { type: 'text', id: 's1', speaker: 'librarian', speakerName: 'Aoi', text: 'I just finished a book about a traveler who found home in a small town...', next: 's2' },
        s2: { type: 'text', id: 's2', speaker: 'librarian', speakerName: 'Aoi', text: 'Funny how stories always end where they begin, isn\'t it?', next: null },
      },
    },
  },
];
