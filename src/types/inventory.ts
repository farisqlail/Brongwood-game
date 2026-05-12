export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity?: number;
  /** Hex colour used to draw the slot icon */
  color: number;
  /** Shape hint for the mini icon renderer */
  icon: 'cup' | 'circle' | 'envelope' | 'key' | 'cake' | 'book' | 'gem' | 'box' | 'meat';
  /** Optional texture key for image-based icons */
  textureKey?: string;
}

export const ITEM_DEFS: Record<string, InventoryItem> = {
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    description: 'A warm cup from the cafe.\nComforting on a cold morning.',
    color: 0x8b4513,
    icon: 'cup',
  },
  cake: {
    id: 'cake',
    name: 'Cake Slice',
    description: 'Homemade cake by Hana.\nSmells amazing.',
    color: 0xf0a0c0,
    icon: 'cake',
  },
  flower: {
    id: 'flower',
    name: 'Wild Flower',
    description: 'A small flower from the roadside.\nMaybe someone would like this.',
    color: 0xff6eb4,
    icon: 'circle',
  },
  letter: {
    id: 'letter',
    name: 'Letter',
    description: 'A hand-written note.\nSlightly crumpled at the corner.',
    color: 0xf5e6c0,
    icon: 'envelope',
  },
  old_key: {
    id: 'old_key',
    name: 'Old Key',
    description: 'A worn iron key.\nYou wonder what it opens.',
    color: 0xdaa520,
    icon: 'key',
  },
  book: {
    id: 'book',
    name: 'Notebook',
    description: 'A small notebook with\nsketches on every page.',
    color: 0x6a8fa0,
    icon: 'book',
  },
  gem: {
    id: 'gem',
    name: 'Blue Gem',
    description: 'Smooth, translucent stone.\nFound near the shore.',
    color: 0x4488cc,
    icon: 'gem',
  },
  carrot: {
    id: 'carrot',
    name: 'Wortel',
    description: 'Wortel segar dari kebun rumah.',
    color: 0xe87524,
    icon: 'circle',
    textureKey: 'farm-wortel',
  },
  red_onion: {
    id: 'red_onion',
    name: 'Bawang Merah',
    description: 'Bawang merah matang dari petak kebun.',
    color: 0xc73357,
    icon: 'circle',
    textureKey: 'farm-bawang_merah_7',
  },
  carrot_seed: {
    id: 'carrot_seed',
    name: 'Bibit Wortel',
    description: 'Benih wortel siap tanam untuk petak kebun.',
    color: 0xf39a3a,
    icon: 'box',
    textureKey: 'farm-karung_wortel',
  },
  red_onion_seed: {
    id: 'red_onion_seed',
    name: 'Bibit Bawang Merah',
    description: 'Benih bawang merah untuk musim tanam berikutnya.',
    color: 0xb84b73,
    icon: 'box',
    textureKey: 'farm-karung_bawang_merah',
  },
  garlic_seed: {
    id: 'garlic_seed',
    name: 'Bibit Bawang Putih',
    description: 'Benih bawang putih untuk kebun rempah dan dapur.',
    color: 0xd9cfac,
    icon: 'box',
    textureKey: 'farm-karung_bawang_putih',
  },
  jasmine_seed: {
    id: 'jasmine_seed',
    name: 'Bibit Melati',
    description: 'Bibit melati wangi untuk ditanam di halaman rumah.',
    color: 0xf2f0df,
    icon: 'box',
    textureKey: 'farm-karung_melati',
  },
  cabbage_seed: {
    id: 'cabbage_seed',
    name: 'Bibit Kubis',
    description: 'Benih kubis untuk hasil panen sayur yang padat.',
    color: 0x7bbd5a,
    icon: 'box',
    textureKey: 'farm-karung_kubis',
  },

  // === Meats ===
  meat_1: {
    id: 'meat_1',
    name: 'Raw Steak',
    description: 'A fresh cut of red meat.\nPerfect for grilling.',
    color: 0xcc3333,
    icon: 'meat',
    textureKey: 'meat_1',
  },
  meat_2: {
    id: 'meat_2',
    name: 'Pork Chop',
    description: 'A thick pork chop.\nNeeds seasoning and heat.',
    color: 0xe8a090,
    icon: 'meat',
    textureKey: 'meat_2',
  },
  meat_3: {
    id: 'meat_3',
    name: 'Chicken Leg',
    description: 'A plump chicken drumstick.\nGreat for roasting.',
    color: 0xf5c882,
    icon: 'meat',
    textureKey: 'meat_3',
  },
  meat_4: {
    id: 'meat_4',
    name: 'Meat Roast',
    description: 'A large piece of roast meat.\nCould feed a family.',
    color: 0x8b4513,
    icon: 'meat',
    textureKey: 'meat_4',
  },
  meat_5: {
    id: 'meat_5',
    name: 'Sausage',
    description: 'A handmade sausage link.\nSmoked and savory.',
    color: 0xb5651d,
    icon: 'meat',
    textureKey: 'meat_5',
  },
};
