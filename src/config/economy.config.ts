export const STARTING_MONEY = 5_000_000;

export interface ShopItemConfig {
  id: string;
  price: number;
  label: string;
  description: string;
}

export interface ToolUpgradeConfig {
  id: 'hoe' | 'watering_can' | 'axe' | 'pickaxe' | 'fishing_rod';
  basePrice: number;
  label: string;
  description: string;
}

export const FARM_SUPPLY_SEED_ITEMS: ShopItemConfig[] = [
  {
    id: 'carrot_seed',
    price: 15000,
    label: 'Bibit Wortel',
    description: 'Benih wortel untuk petak kebun rumah.',
  },
  {
    id: 'red_onion_seed',
    price: 22000,
    label: 'Bibit Bawang Merah',
    description: 'Benih bawang merah untuk panen dapur dan jualan kecil.',
  },
  {
    id: 'garlic_seed',
    price: 18000,
    label: 'Bibit Bawang Putih',
    description: 'Benih bawang putih untuk kebun rempah rumah.',
  },
  {
    id: 'jasmine_seed',
    price: 26000,
    label: 'Bibit Melati',
    description: 'Bibit melati wangi untuk taman dan hasil bunga.',
  },
  {
    id: 'cabbage_seed',
    price: 20000,
    label: 'Bibit Kubis',
    description: 'Bibit kubis untuk panen sayur yang padat dan segar.',
  },
];

export const FARM_TOOL_UPGRADES: ToolUpgradeConfig[] = [
  {
    id: 'fishing_rod',
    basePrice: 35000,
    label: 'Upgrade Fishing Rod',
    description: 'Joran lebih stabil. Timing fishing jadi lebih ramah.',
  },
  {
    id: 'hoe',
    basePrice: 28000,
    label: 'Upgrade Hoe',
    description: 'Cangkul lebih tajam untuk pekerjaan kebun berikutnya.',
  },
  {
    id: 'watering_can',
    basePrice: 32000,
    label: 'Upgrade Watering Can',
    description: 'Penyiram lebih lega untuk rutinitas siram yang panjang.',
  },
  {
    id: 'axe',
    basePrice: 42000,
    label: 'Upgrade Axe',
    description: 'Kapak lebih mantap untuk resource dan pekerjaan berat nanti.',
  },
  {
    id: 'pickaxe',
    basePrice: 42000,
    label: 'Upgrade Pickaxe',
    description: 'Beliung diperkuat untuk batu dan area tambang ke depan.',
  },
];

export const FLOWER_SHOP_ITEMS: ShopItemConfig[] = [
  {
    id: 'flower',
    price: 12000,
    label: 'Bunga Potong',
    description: 'Bunga segar untuk hadiah kecil atau hiasan meja.',
  },
  {
    id: 'jasmine_seed',
    price: 26000,
    label: 'Bibit Melati',
    description: 'Bibit melati wangi yang juga disukai Rika.',
  },
  {
    id: 'coffee',
    price: 15000,
    label: 'Kopi Hangat',
    description: 'Hadiah sederhana untuk sore yang pelan.',
  },
  {
    id: 'flower_vase',
    price: 34000,
    label: 'Vas Kecil',
    description: 'Dekor mungil untuk rumah. Cantik di meja atau jendela.',
  },
  {
    id: 'wall_wreath',
    price: 48000,
    label: 'Karangan Dinding',
    description: 'Dekor dinding dari daun dan bunga kering.',
  },
  {
    id: 'table_plant',
    price: 39000,
    label: 'Tanaman Meja',
    description: 'Pot kecil yang bikin ruangan terasa lebih hidup.',
  },
];

export const FARM_SUPPLY_SHOP_ITEMS = FARM_SUPPLY_SEED_ITEMS;

export function formatRupiah(amount: number): string {
  const safe = Math.max(0, Math.floor(amount));
  return `Rp${safe.toLocaleString('id-ID')}`;
}
