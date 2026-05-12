import { InventoryItem } from '@/types/inventory';

export const HOTBAR_SLOTS = 5;
export const BAG_SLOTS = 10;
export const MAX_SLOTS = HOTBAR_SLOTS + BAG_SLOTS;

export class InventorySystem {
  private slots: (InventoryItem | null)[];
  private selectedSlot = -1;

  constructor() {
    this.slots = new Array(MAX_SLOTS).fill(null);
  }

  /** Add item to first empty slot. Returns slot index on success, -1 if full. */
  addItem(item: InventoryItem): number {
    const quantity = Math.max(1, item.quantity ?? 1);
    const existingIndex = this.findFirstSlotByItemId(item.id);
    if (existingIndex !== -1) {
      const existing = this.slots[existingIndex];
      if (existing) {
        existing.quantity = (existing.quantity ?? 1) + quantity;
        return existingIndex;
      }
    }

    const idx = this.slots.indexOf(null);
    if (idx === -1) return -1;
    this.slots[idx] = { ...item, quantity };
    return idx;
  }

  /** Remove and return item at slot index. */
  removeItem(slotIndex: number): InventoryItem | null {
    if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return null;
    const item = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    if (this.selectedSlot === slotIndex) {
      this.selectedSlot = -1;
    }
    return item;
  }

  getSlot(index: number): InventoryItem | null {
    return this.slots[index] ?? null;
  }

  findFirstSlotByItemId(itemId: string): number {
    return this.slots.findIndex((item) => item?.id === itemId);
  }

  hasItem(itemId: string): boolean {
    return this.findFirstSlotByItemId(itemId) !== -1;
  }

  countItem(itemId: string): number {
    return this.slots.reduce((total, item) => {
      if (item?.id !== itemId) return total;
      return total + (item.quantity ?? 1);
    }, 0);
  }

  removeFirstItemById(itemId: string): InventoryItem | null {
    const index = this.findFirstSlotByItemId(itemId);
    if (index === -1) return null;
    return this.consumeOneAtSlot(index);
  }

  getSlots(): ReadonlyArray<InventoryItem | null> {
    return this.slots;
  }

  getHotbarSlots(): ReadonlyArray<InventoryItem | null> {
    return this.slots.slice(0, HOTBAR_SLOTS);
  }

  getBagSlots(): ReadonlyArray<InventoryItem | null> {
    return this.slots.slice(HOTBAR_SLOTS);
  }

  getSelectedSlot(): number {
    if (this.selectedSlot < 0 || this.selectedSlot >= MAX_SLOTS) return -1;
    if (!this.slots[this.selectedSlot]) return -1;
    return this.selectedSlot;
  }

  getSelectedItem(): InventoryItem | null {
    const slot = this.getSelectedSlot();
    return slot === -1 ? null : this.slots[slot];
  }

  selectSlot(index: number): void {
    this.selectedSlot = this.slots[index] ? index : -1;
  }

  clearSelectedSlot(): void {
    this.selectedSlot = -1;
  }

  consumeOneAtSlot(slotIndex: number): InventoryItem | null {
    if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return null;
    const item = this.slots[slotIndex];
    if (!item) return null;

    const currentQty = item.quantity ?? 1;
    if (currentQty <= 1) {
      return this.removeItem(slotIndex);
    }

    item.quantity = currentQty - 1;
    return { ...item, quantity: 1 };
  }

  isFull(): boolean {
    return this.slots.every(s => s !== null);
  }

  isEmpty(): boolean {
    return this.slots.every(s => s === null);
  }
}
