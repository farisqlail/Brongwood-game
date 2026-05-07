import { InventoryItem } from '@/types/inventory';

export const MAX_SLOTS = 5;

export class InventorySystem {
  private slots: (InventoryItem | null)[];

  constructor() {
    this.slots = new Array(MAX_SLOTS).fill(null);
  }

  /** Add item to first empty slot. Returns slot index on success, -1 if full. */
  addItem(item: InventoryItem): number {
    const idx = this.slots.indexOf(null);
    if (idx === -1) return -1;
    this.slots[idx] = item;
    return idx;
  }

  /** Remove and return item at slot index. */
  removeItem(slotIndex: number): InventoryItem | null {
    if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return null;
    const item = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    return item;
  }

  getSlot(index: number): InventoryItem | null {
    return this.slots[index] ?? null;
  }

  getSlots(): ReadonlyArray<InventoryItem | null> {
    return this.slots;
  }

  isFull(): boolean {
    return this.slots.every(s => s !== null);
  }

  isEmpty(): boolean {
    return this.slots.every(s => s === null);
  }
}
