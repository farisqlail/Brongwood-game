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

interface TownDialogueProfile {
  id: string;
  speakerName: string;
  morning: [string, string];
  afternoon: [string, string];
  evening: [string, string];
  night: [string, string];
  friend: [string, string, string];
  prompt: string;
  warmChoice: string;
  warmReply: string;
  thoughtfulChoice: string;
  thoughtfulReply: string;
}

function createTownDialogue(profile: TownDialogueProfile): DialogueDefinition {
  const speaker = profile.id;
  const name = profile.speakerName;

  const textNode = (id: string, text: string, next: string | null) => ({
    type: 'text' as const,
    id,
    speaker,
    speakerName: name,
    text,
    next,
  });

  return {
    id: `${profile.id}_chat`,
    startNode: 'start',
    nodes: {
      start: {
        type: 'branch',
        id: 'start',
        branches: [
          { condition: { relationship: { npcId: profile.id, minStage: 'acquaintance' } }, next: 'friend_1' },
        ],
        fallback: 'time_branch',
      },
      time_branch: {
        type: 'branch',
        id: 'time_branch',
        branches: [
          { condition: { timePeriod: ['dawn', 'morning'] }, next: 'morning_1' },
          { condition: { timePeriod: ['afternoon'] }, next: 'afternoon_1' },
          { condition: { timePeriod: ['evening'] }, next: 'evening_1' },
          { condition: { timePeriod: ['night', 'late_night'] }, next: 'night_1' },
        ],
        fallback: 'afternoon_1',
      },
      morning_1: textNode('morning_1', profile.morning[0], 'morning_2'),
      morning_2: textNode('morning_2', profile.morning[1], 'choice'),
      afternoon_1: textNode('afternoon_1', profile.afternoon[0], 'afternoon_2'),
      afternoon_2: textNode('afternoon_2', profile.afternoon[1], 'choice'),
      evening_1: textNode('evening_1', profile.evening[0], 'evening_2'),
      evening_2: textNode('evening_2', profile.evening[1], 'choice'),
      night_1: textNode('night_1', profile.night[0], 'night_2'),
      night_2: textNode('night_2', profile.night[1], 'choice'),
      friend_1: textNode('friend_1', profile.friend[0], 'friend_2'),
      friend_2: textNode('friend_2', profile.friend[1], 'friend_3'),
      friend_3: textNode('friend_3', profile.friend[2], 'friend_bond'),
      friend_bond: {
        type: 'action',
        id: 'friend_bond',
        actions: [
          { type: 'add_affection', npcId: profile.id, amount: 3 },
          { type: 'add_trust', npcId: profile.id, amount: 1 },
        ],
        next: null,
      },
      choice: {
        type: 'choice',
        id: 'choice',
        prompt: profile.prompt,
        choices: [
          {
            text: profile.warmChoice,
            choiceId: 'warm',
            next: 'warm_reply',
            effects: [{ type: 'add_affection', npcId: profile.id, amount: 5 }],
          },
          {
            text: profile.thoughtfulChoice,
            choiceId: 'thoughtful',
            next: 'thoughtful_reply',
            effects: [{ type: 'add_trust', npcId: profile.id, amount: 3 }],
          },
        ],
      },
      warm_reply: textNode('warm_reply', profile.warmReply, null),
      thoughtful_reply: textNode('thoughtful_reply', profile.thoughtfulReply, null),
    },
  };
}

export const TOWN_NPCS: NPCData[] = [
  {
    id: 'baker',
    name: 'Hana',
    textureKey: TEXTURE_KEYS.NPC_BAKER,
    x: ts * 3, y: ts * 3.5,
    wanderRadius: 30,
    dialogue: createTownDialogue({
      id: 'baker',
      speakerName: 'Hana',
      morning: ['The first batch is always the honest one. If the dough is sulking, the whole day knows it.', 'Today it rose beautifully, so I am choosing to take that as a good sign.'],
      afternoon: ['Afternoons are for sweet bread and tired feet.', 'People come in asking for food, but most of them really want a place to breathe.'],
      evening: ['I save the crusty loaves for soup at night. Waste feels rude when flour takes so much patience.', 'If you smell cinnamon, that means I gave in and made something comforting.'],
      night: ['The ovens are sleeping now, but the bricks stay warm for hours.', 'Sometimes I sit here after closing and listen to the town settle down.'],
      friend: ['I kept a small roll aside for you. Not because you asked, just because I guessed you would pass by.', 'You have that look again, the one people get when they are carrying too many thoughts.', 'Eat first. Worries are less convincing on a full stomach.'],
      prompt: 'Hana wipes flour from her hands and smiles.',
      warmChoice: 'The bakery makes town feel alive.',
      warmReply: 'That is the kind of thing that keeps a baker awake before dawn. Thank you.',
      thoughtfulChoice: 'You notice people closely.',
      thoughtfulReply: 'Bread teaches that. Everyone softens differently when given warmth.',
    }),
  },
  {
    id: 'fisher',
    name: 'Old Taro',
    textureKey: TEXTURE_KEYS.NPC_FISHER,
    x: ts * 13, y: ts * 8.5,
    wanderRadius: 25,
    dialogue: createTownDialogue({
      id: 'fisher',
      speakerName: 'Old Taro',
      morning: ['Morning water tells the truth before people start making noise.', 'If the gulls stay low, the tide will be generous. If not, we still get a fine view.'],
      afternoon: ['The fish are ignoring me with impressive discipline.', 'That is all right. A person should learn how to be refused by nature politely.'],
      evening: ['Evening is when the sea starts talking like an old friend.', 'It never says anything new, but somehow I still need to hear it.'],
      night: ['Night fishing is mostly listening. The line, the wind, your own bones.', 'Do not rush home if your heart is still noisy. Let the dark rinse it a little.'],
      friend: ['There you are. I was starting to think the town had swallowed you whole.', 'I brought two cups of tea today. One was optimism. The other can be yours.', 'Sit a minute. Silence is easier when shared.'],
      prompt: 'Old Taro checks the line without looking away from the water.',
      warmChoice: 'The quiet here is nice.',
      warmReply: 'Aye. Quiet is not empty. It is full of things that stopped shouting.',
      thoughtfulChoice: 'Do you ever get lonely out here?',
      thoughtfulReply: 'Of course. But lonely and peaceful can sit in the same boat.',
    }),
  },
  {
    id: 'elder',
    name: 'Grandma Mei',
    textureKey: TEXTURE_KEYS.NPC_ELDER,
    x: ts * 8, y: ts * 2,
    wanderRadius: 20,
    dialogue: createTownDialogue({
      id: 'elder',
      speakerName: 'Grandma Mei',
      morning: ['I wake before the sun out of habit. Old bones keep old schedules.', 'The town looks young in the morning, before footprints remind it of yesterday.'],
      afternoon: ['I used to complain about slow afternoons. Now I think they are a gift with plain wrapping.', 'Sit too long and you hear the houses creak like they are remembering names.'],
      evening: ['Evening light is kind to old streets.', 'It hides the cracks but leaves the stories. I like that bargain.'],
      night: ['At night, I count lit windows. It is an old woman\'s way of checking that everyone made it home.', 'Do not laugh. Someone should keep count.'],
      friend: ['Ah, good. I was hoping you would come by.', 'I remembered a story today, but stories spoil if no one hears them.', 'When you have time, I will tell you how this town survived its first great storm.'],
      prompt: 'Grandma Mei studies you with bright, patient eyes.',
      warmChoice: 'I like hearing your stories.',
      warmReply: 'Then I will keep some polished for you, dear.',
      thoughtfulChoice: 'Does the town feel different now?',
      thoughtfulReply: 'Different, yes. Gone, no. Places change clothes, not souls.',
    }),
  },
  {
    id: 'girl',
    name: 'Yuki',
    textureKey: TEXTURE_KEYS.NPC_GIRL,
    x: ts * 11, y: ts * 3,
    wanderRadius: 40,
    dialogue: createTownDialogue({
      id: 'girl',
      speakerName: 'Yuki',
      morning: ['I found three shiny stones before breakfast. That means today is probably important.', 'One looked like a tiny moon, but I put it back because maybe the ground needed it.'],
      afternoon: ['The grass near the big road has secret paths in it.', 'I think ants are building a city. Their mayor is very busy.'],
      evening: ['The sky turned peach again. I asked it why, but it was being mysterious.', 'Grown-ups say sunset is normal. I think normal things can still be magic.'],
      night: ['I am not supposed to wander far at night, but I can still see fireflies from here.', 'They look like little stars that changed their minds.'],
      friend: ['I saved you a lucky leaf. It has a bite mark, so it already survived an adventure.', 'If you carry it, maybe you will too.', 'But if it gets lonely, put it near a plant. Leaves like company.'],
      prompt: 'Yuki bounces on her heels, waiting for your answer.',
      warmChoice: 'That sounds magical.',
      warmReply: 'I knew it! You can see it too.',
      thoughtfulChoice: 'Maybe small things have big lives.',
      thoughtfulReply: 'Exactly. That is why we should be gentle when walking.',
    }),
  },
  {
    id: 'boy',
    name: 'Kenta',
    textureKey: TEXTURE_KEYS.NPC_BOY,
    x: ts * 5, y: ts * 7,
    wanderRadius: 45,
    dialogue: createTownDialogue({
      id: 'boy',
      speakerName: 'Kenta',
      morning: ['I mapped the town in my notebook, but I had to erase part of it because Grandma Mei said fences count.', 'Cartography is harder when adults keep owning things.'],
      afternoon: ['I am training for my future expedition. Today I crossed the square without stepping on cracks.', 'That is basically mountain climbing if you use imagination.'],
      evening: ['When the lamps turn on, the town looks like a dungeon entrance.', 'A cozy dungeon. With snacks. But still.'],
      night: ['Night makes every alley look twice as long.', 'I am not scared. I am strategically cautious. There is a difference.'],
      friend: ['When I leave town someday, I am putting you in the dedication of my explorer journal.', 'Not the first page. That is for maps. But definitely the second.', 'You can be Chief Consultant of Not Getting Lost.'],
      prompt: 'Kenta lowers his voice like he is sharing classified information.',
      warmChoice: 'You will be a great explorer.',
      warmReply: 'Obviously. But it is good that someone else noticed.',
      thoughtfulChoice: 'Start by learning this town well.',
      thoughtfulReply: 'That is actually smart. Every legendary explorer needs a first map.',
    }),
  },
  {
    id: 'merchant',
    name: 'Mr. Sato',
    textureKey: TEXTURE_KEYS.NPC_MERCHANT,
    x: ts * 12, y: ts * 6,
    wanderRadius: 25,
    dialogue: createTownDialogue({
      id: 'merchant',
      speakerName: 'Mr. Sato',
      morning: ['Morning customers buy practical things: salt, thread, lamp oil.', 'By afternoon they remember what they actually wanted. That is when the sweets sell.'],
      afternoon: ['Business is slow, but slow lets you notice patterns.', 'People buy umbrellas before they admit they are worried about rain.'],
      evening: ['I count coins at dusk and always find one more story than profit.', 'That is not good accounting, but it is good living.'],
      night: ['The shop is closed, technically. But if someone needs medicine or batteries, I hear the bell.', 'A town is only small if people stop answering.'],
      friend: ['I set aside a few sturdy seeds from a supplier passing through.', 'No charge today. Call it an investment in seeing your garden succeed.', 'Come back and tell me which ones take root. I like knowing where things end up.'],
      prompt: 'Mr. Sato taps the counter thoughtfully.',
      warmChoice: 'You keep the town supplied.',
      warmReply: 'I try. A shelf is just a shelf until someone needs what is on it.',
      thoughtfulChoice: 'You know everyone\'s habits.',
      thoughtfulReply: 'A merchant learns what people ask for, and what they are too shy to ask for.',
    }),
  },
  {
    id: 'farmer',
    name: 'Daichi',
    textureKey: TEXTURE_KEYS.NPC_FARMER,
    x: ts * 2, y: ts * 7.5,
    wanderRadius: 35,
    dialogue: createTownDialogue({
      id: 'farmer',
      speakerName: 'Daichi',
      morning: ['Morning is for checking leaves. Plants complain quietly, so you have to look close.', 'A little droop, a pale edge, soil cracking. All of it means something.'],
      afternoon: ['The sun is doing half my work and twice my sweating.', 'If you are planting, water before the soil gets proud and hard.'],
      evening: ['Evening watering settles the roots.', 'People settle better then too. Less noise, less pretending.'],
      night: ['I do not work the field at night unless weather forces me.', 'Roots need darkness. Maybe people do too.'],
      friend: ['Your hands are starting to look like you actually know soil.', 'That is a compliment. Clean hands are fine, but dirt remembers effort.', 'If a crop fails, do not take it personally. Just learn its language.'],
      prompt: 'Daichi brushes soil from his palms.',
      warmChoice: 'Your farm advice helps.',
      warmReply: 'Good. Advice should be useful, not decorative.',
      thoughtfulChoice: 'Plants sound complicated.',
      thoughtfulReply: 'They are alive. Complicated comes with the territory.',
    }),
  },
  {
    id: 'artist',
    name: 'Mio',
    textureKey: TEXTURE_KEYS.NPC_ARTIST,
    x: ts * 9, y: ts * 8,
    wanderRadius: 30,
    dialogue: createTownDialogue({
      id: 'artist',
      speakerName: 'Mio',
      morning: ['Morning colors are too honest. They show up before I am ready.', 'I keep trying to paint that first pale gold, but my brush gets sentimental.'],
      afternoon: ['Afternoon shadows have sharp elbows.', 'They make buildings look more certain than people.'],
      evening: ['Evening is unfair. Everything becomes beautiful right when the light is leaving.', 'Maybe that is why I keep painting it. I am bad at letting things go.'],
      night: ['At night I sketch windows instead of faces.', 'A lit window tells you someone is there without demanding to be understood.'],
      friend: ['I started drawing you into the edge of town scenes.', 'Not as a portrait. More like proof that someone was listening to the place.', 'Do not look so nervous. I made your hair behave better than usual.'],
      prompt: 'Mio tilts her sketchbook away, half shy and half amused.',
      warmChoice: 'I want to see it someday.',
      warmReply: 'Someday, then. When I stop arguing with the shadows.',
      thoughtfulChoice: 'Maybe unfinished art is still true.',
      thoughtfulReply: 'That is annoyingly beautiful. I may steal it.',
    }),
  },
  {
    id: 'postman',
    name: 'Jiro',
    textureKey: TEXTURE_KEYS.NPC_POSTMAN,
    x: ts * 6, y: ts * 5.5,
    wanderRadius: 50,
    dialogue: createTownDialogue({
      id: 'postman',
      speakerName: 'Jiro',
      morning: ['Morning route starts with empty pockets and high hopes.', 'Bills are heavier than letters, emotionally speaking. Physically too, sometimes.'],
      afternoon: ['By afternoon I know who is home by which curtains moved.', 'Do not worry, I am not nosy. Professionally observant.'],
      evening: ['Evening deliveries feel different. People open doors softer.', 'Maybe news lands better when the day is already tired.'],
      night: ['I do not deliver at night unless it is urgent.', 'Some messages should wait for daylight. Some should not. Knowing which is the job.'],
      friend: ['I saw your name on a parcel list once and almost got excited on your behalf.', 'It was for someone else with similar handwriting. Tragic, really.', 'Still, I will keep an eye out. Everyone deserves a good letter.'],
      prompt: 'Jiro adjusts his satchel strap.',
      warmChoice: 'Your route keeps people connected.',
      warmReply: 'That is the hope. Even a boring notice says, "The world remembered you."',
      thoughtfulChoice: 'Do you miss real letters?',
      thoughtfulReply: 'Every day. Messages are faster now, but letters knew how to arrive.',
    }),
  },
  {
    id: 'librarian',
    name: 'Aoi',
    textureKey: TEXTURE_KEYS.NPC_LIBRARIAN,
    x: ts * 10, y: ts * 2.5,
    wanderRadius: 20,
    dialogue: createTownDialogue({
      id: 'librarian',
      speakerName: 'Aoi',
      morning: ['I shelve returns in the morning because books seem calmer then.', 'That probably sounds strange. Librarians are allowed one strange belief per shelf.'],
      afternoon: ['Someone borrowed the town history again.', 'Either curiosity is spreading, or the same person keeps forgetting they already know chapter three.'],
      evening: ['Evening is best for stories with lanterns, kitchens, and people almost saying what they mean.', 'I have a weakness for almost. It makes pages turn.'],
      night: ['At night, every book sounds louder when it closes.', 'The library teaches you that quiet can still have punctuation.'],
      friend: ['I found a book I think you would like.', 'It is about rebuilding a neglected home, but really it is about forgiving yourself slowly.', 'I put it aside. No due date pressure. Some books should wait politely.'],
      prompt: 'Aoi holds a finger between pages to keep her place.',
      warmChoice: 'Your recommendations are thoughtful.',
      warmReply: 'Books are easier to match when you pay attention to the reader.',
      thoughtfulChoice: 'Why do stories matter so much?',
      thoughtfulReply: 'Because life happens once, but stories let us practice feeling it.',
    }),
  },
];
