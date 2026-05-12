export const STARTING_MONEY = 5_000_000;

export interface ShopItemConfig {
  id: string;
  price: number;
  label: string;
  description: string;
}

export const FARM_SUPPLY_SHOP_ITEMS: ShopItemConfig[] = [
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

export function formatRupiah(amount: number): string {
  const safe = Math.max(0, Math.floor(amount));
  return `Rp${safe.toLocaleString('id-ID')}`;
}
