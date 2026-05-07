export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  /** Hex colour used to draw the slot icon */
  color: number;
  /** Shape hint for the mini icon renderer */
  icon: 'cup' | 'circle' | 'envelope' | 'key' | 'cake' | 'book' | 'gem' | 'box';
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
};
