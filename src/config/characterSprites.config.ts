import { TEXTURE_KEYS } from '@config/assets.manifest';

export interface CharacterSpriteConfig {
  textureKey: string;
  idleFrame: number;
  scale: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyOffsetX: number;
  bodyOffsetY: number;
  depthOffset: number;
}

export const CHARACTER_SPRITE_CONFIGS = {
  lailGameplay: {
    textureKey: TEXTURE_KEYS.PLAYER,
    idleFrame: 16,
    scale: 0.12,
    bodyWidth: 180,
    bodyHeight: 80,
    bodyOffsetX: 90,
    bodyOffsetY: 610,
    depthOffset: 610,
  },
  lailPrologue: {
    textureKey: TEXTURE_KEYS.PLAYER,
    idleFrame: 16,
    scale: 0.1,
    bodyWidth: 180,
    bodyHeight: 80,
    bodyOffsetX: 90,
    bodyOffsetY: 610,
    depthOffset: 20,
  },
  rika: {
    textureKey: TEXTURE_KEYS.RIKA,
    idleFrame: 16,
    scale: 0.11,
    bodyWidth: 180,
    bodyHeight: 80,
    bodyOffsetX: 32,
    bodyOffsetY: 348,
    depthOffset: 380,
  },
  townNpc: {
    textureKey: '__town_npc__',
    idleFrame: 0,
    scale: 0.9,
    bodyWidth: 22,
    bodyHeight: 12,
    bodyOffsetX: 35,
    bodyOffsetY: 76,
    depthOffset: 10,
  },
} as const satisfies Record<string, CharacterSpriteConfig>;

export type CharacterSpriteProfileId = keyof typeof CHARACTER_SPRITE_CONFIGS;

export function getCharacterSpriteConfig(profileId: CharacterSpriteProfileId): CharacterSpriteConfig {
  return CHARACTER_SPRITE_CONFIGS[profileId];
}
