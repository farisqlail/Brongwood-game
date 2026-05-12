export const FIRST_DAY_FLAG = 'firstDayStage';

export type FirstDayStage =
  | 'wake_up'
  | 'leave_house'
  | 'meet_npc'
  | 'buy_seed'
  | 'plant_crop'
  | 'sleep'
  | 'complete';

export const FIRST_DAY_SEQUENCE: readonly FirstDayStage[] = [
  'wake_up',
  'leave_house',
  'meet_npc',
  'buy_seed',
  'plant_crop',
  'sleep',
  'complete',
] as const;

export const FIRST_DAY_OBJECTIVES: Record<FirstDayStage, string> = {
  wake_up: 'Bangun pagi dan bersiap memulai hari.',
  leave_house: 'Keluar rumah dan lihat suasana Brongwood.',
  meet_npc: 'Kenalan dengan salah satu warga di kota.',
  buy_seed: 'Beli bibit di Toko Tani sebelah kiri cafe.',
  plant_crop: 'Pulang ke halaman rumah dan tanam 1 bibit.',
  sleep: 'Kembali ke kasur dan tidur untuk mengakhiri hari.',
  complete: 'Hari pertama selesai.',
};

export function getNextFirstDayStage(stage: FirstDayStage): FirstDayStage {
  const index = FIRST_DAY_SEQUENCE.indexOf(stage);
  if (index === -1 || index >= FIRST_DAY_SEQUENCE.length - 1) {
    return 'complete';
  }
  return FIRST_DAY_SEQUENCE[index + 1];
}

