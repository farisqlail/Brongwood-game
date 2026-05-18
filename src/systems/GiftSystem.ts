import { gameManager } from '@/managers/GameManager';
import { InventoryItem } from '@/types/inventory';

export interface GiftAttemptResult {
  success: boolean;
  message: string;
  color: number;
}

const REACTION_COPY: Record<'loved' | 'liked' | 'neutral' | 'disliked', string> = {
  loved: 'Rika menyukainya sekali.',
  liked: 'Rika tampak senang menerimanya.',
  neutral: 'Rika menerimanya dengan lembut.',
  disliked: 'Rika menerimanya, tapi tampak canggung.',
};

export function tryGiveSelectedItemToNpc(npcId: string, currentDay: number): GiftAttemptResult {
  const selectedSlot = gameManager.inventory.getSelectedSlot();
  if (selectedSlot === -1) {
    return { success: false, message: 'Pilih item dulu', color: 0xffd36a };
  }

  const selectedItem = gameManager.inventory.getSlot(selectedSlot);
  if (!selectedItem) {
    return { success: false, message: 'Item tidak ditemukan', color: 0xff7a6a };
  }

  if (selectedItem.icon === 'tool') {
    return { success: false, message: 'Tool tidak bisa dijadikan hadiah', color: 0xff7a6a };
  }

  if (!gameManager.relationships.canReceiveGiftToday(npcId, currentDay)) {
    return { success: false, message: 'Hari ini sudah memberi hadiah', color: 0xffd36a };
  }

  const consumed = gameManager.inventory.consumeOneAtSlot(selectedSlot);
  if (!consumed) {
    return { success: false, message: 'Item tidak bisa diberikan', color: 0xff7a6a };
  }

  const result = gameManager.relationships.receiveGift(npcId, consumed.id, currentDay);
  if (!result.success) {
    restoreConsumedItem(consumed);
    return { success: false, message: 'Hadiah belum bisa diberikan', color: 0xff7a6a };
  }

  return {
    success: true,
    message: REACTION_COPY[result.reaction],
    color: result.reaction === 'disliked' ? 0xff9c8a : result.reaction === 'loved' ? 0xf8e36a : 0x8ff28a,
  };
}

function restoreConsumedItem(item: InventoryItem): void {
  gameManager.inventory.addItem({ ...item, quantity: 1 });
}
