/**
 * InventoryUI — 5-slot hotbar at the bottom centre + item popup.
 *
 * Slot layout (bottom of screen, centred):
 *   [ ] [ ] [ ] [ ] [ ]
 *
 * Clicking a filled slot opens a popup with:
 *   ┌──────────────────┐
 *   │  Item Name       │
 *   │  Description…    │
 *   │  [Use]  [Drop]   │
 *   └──────────────────┘
 *
 * Clicking an empty slot or outside closes the popup.
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { InventoryItem } from '@/types/inventory';
import { InventorySystem, MAX_SLOTS } from '@/systems/InventorySystem';
import { InputGuard } from '@/ui/InputGuard';

// ─── Slot geometry ─────────────────────────────────────────────
const SLOT_SIZE  = 30;
const SLOT_GAP   = 5;
const TOTAL_W    = MAX_SLOTS * SLOT_SIZE + (MAX_SLOTS - 1) * SLOT_GAP;
const START_X    = (GAME_CONFIG.WIDTH - TOTAL_W) / 2;
const SLOT_Y     = GAME_CONFIG.HEIGHT - SLOT_SIZE - 8;

// ─── Popup geometry ────────────────────────────────────────────
const POP_W      = 136;
const POP_H      = 82;
const POP_PAD    = 7;

// ─── Colours ───────────────────────────────────────────────────
const CLR_SLOT_BG     = 0x1a1a2e;
const CLR_SLOT_BORDER = 0x445566;
const CLR_SLOT_HOVER  = 0x334466;
const CLR_SLOT_SEL    = 0x556688;
const CLR_POP_BG      = 0x0d1117;
const CLR_BTN_USE     = 0x2e6e3e;
const CLR_BTN_DROP    = 0x6e2e2e;
const CLR_BTN_CLOSE   = 0x334455;

const POP_DEPTH = DEPTH.UI + 20;

export class InventoryUI {
  private scene:     Phaser.Scene;
  private inventory: InventorySystem;

  // Slot visuals
  private slotBg:    Phaser.GameObjects.Graphics;
  private slotHit:   Phaser.GameObjects.Rectangle[] = [];

  // Popup visuals — standalone objects (NOT in a Container)
  private popBg:     Phaser.GameObjects.Graphics;
  private popName:   Phaser.GameObjects.Text;
  private popDesc:   Phaser.GameObjects.Text;
  private btnUse:    Phaser.GameObjects.Rectangle;
  private btnUseTxt: Phaser.GameObjects.Text;
  private btnDrop:   Phaser.GameObjects.Rectangle;
  private btnDropTxt:Phaser.GameObjects.Text;
  private btnClose:  Phaser.GameObjects.Rectangle;
  private btnCloseT: Phaser.GameObjects.Text;

  private activeSlot: number = -1;

  // Callbacks
  onUse:  (item: InventoryItem, slot: number) => void = () => {};
  onDrop: (item: InventoryItem, slot: number) => void = () => {};

  constructor(scene: Phaser.Scene, inventory: InventorySystem) {
    this.scene     = scene;
    this.inventory = inventory;

    this.slotBg = scene.add.graphics();
    this.slotBg.setScrollFactor(0);
    this.slotBg.setDepth(DEPTH.UI + 10);

    this.buildSlotHitAreas();
    this.buildPopup();
    this.hidePopup();
    this.redrawSlots();
  }

  /** Call every frame to keep visuals in sync with inventory data. */
  redrawSlots(): void {
    const g = this.slotBg;
    g.clear();

    const slots = this.inventory.getSlots();

    // Hotbar backdrop
    const barPad  = 5;
    const barX    = START_X - barPad;
    const barY    = SLOT_Y  - barPad;
    const barW    = TOTAL_W + barPad * 2;
    const barH    = SLOT_SIZE + barPad * 2;
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(barX, barY, barW, barH, 4);
    g.lineStyle(1, 0x445566, 0.5);
    g.strokeRoundedRect(barX, barY, barW, barH, 4);

    for (let i = 0; i < MAX_SLOTS; i++) {
      const sx = START_X + i * (SLOT_SIZE + SLOT_GAP);
      const sy = SLOT_Y;
      const isActive = i === this.activeSlot;
      const item = slots[i];

      // Slot background
      g.fillStyle(isActive ? CLR_SLOT_SEL : (item ? CLR_SLOT_HOVER : CLR_SLOT_BG), 1);
      g.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      // Slot border
      g.lineStyle(1, isActive ? 0x88aacc : CLR_SLOT_BORDER, 1);
      g.strokeRect(sx, sy, SLOT_SIZE, SLOT_SIZE);

      if (item) {
        this.drawIcon(g, item, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2);
      }
    }
  }

  /** Show or hide the entire inventory UI (e.g. during dialogue). */
  setVisible(visible: boolean): void {
    this.slotBg.setVisible(visible);
    for (const hit of this.slotHit) {
      hit.setVisible(visible);
      hit.setActive(visible);
    }
    if (!visible) this.hidePopup();
  }

  destroy(): void {
    this.slotBg.destroy();
    for (const z of this.slotHit) z.destroy();
    this.popBg.destroy();
    this.popName.destroy();
    this.popDesc.destroy();
    this.btnUse.destroy();
    this.btnUseTxt.destroy();
    this.btnDrop.destroy();
    this.btnDropTxt.destroy();
    this.btnClose.destroy();
    this.btnCloseT.destroy();
  }

  // ─────────────────────────────────────────────────────────────
  // Private — slot hit areas
  // ─────────────────────────────────────────────────────────────

  private buildSlotHitAreas(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const sx = START_X + i * (SLOT_SIZE + SLOT_GAP);
      const rect = this.scene.add.rectangle(
        sx + SLOT_SIZE / 2,
        SLOT_Y + SLOT_SIZE / 2,
        SLOT_SIZE,
        SLOT_SIZE,
        0xffffff, 0,
      );
      rect.setScrollFactor(0);
      rect.setDepth(DEPTH.UI + 11);
      rect.setInteractive({ useHandCursor: true });

      const slotIdx = i;
      rect.on('pointerdown', () => { InputGuard.consume(); this.onSlotClick(slotIdx); });
      rect.on('pointerover', () => { rect.setFillStyle(0xffffff, 0.06); });
      rect.on('pointerout',  () => { rect.setFillStyle(0xffffff, 0); });

      this.slotHit.push(rect);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private — popup (all standalone scene objects, no Container)
  // ─────────────────────────────────────────────────────────────

  private buildPopup(): void {
    // Background graphics
    this.popBg = this.scene.add.graphics();
    this.popBg.setScrollFactor(0);
    this.popBg.setDepth(POP_DEPTH);

    // Text labels
    this.popName = this.scene.add.text(0, 0, '', {
      fontSize: '8px', fontFamily: 'monospace', color: '#ffffff',
    });
    this.popName.setScrollFactor(0).setDepth(POP_DEPTH + 1);

    this.popDesc = this.scene.add.text(0, 0, '', {
      fontSize: '6px', fontFamily: 'monospace', color: '#aabbcc',
      wordWrap: { width: POP_W - POP_PAD * 2 },
    });
    this.popDesc.setScrollFactor(0).setDepth(POP_DEPTH + 1);

    // Use button
    this.btnUse = this.scene.add.rectangle(0, 0, 48, 14, CLR_BTN_USE);
    this.btnUse.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnUse.setInteractive({ useHandCursor: true });

    this.btnUseTxt = this.scene.add.text(0, 0, 'Use', {
      fontSize: '7px', fontFamily: 'monospace', color: '#ccffcc',
    }).setOrigin(0.5);
    this.btnUseTxt.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    // Drop button
    this.btnDrop = this.scene.add.rectangle(0, 0, 48, 14, CLR_BTN_DROP);
    this.btnDrop.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnDrop.setInteractive({ useHandCursor: true });

    this.btnDropTxt = this.scene.add.text(0, 0, 'Drop', {
      fontSize: '7px', fontFamily: 'monospace', color: '#ffcccc',
    }).setOrigin(0.5);
    this.btnDropTxt.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    // Close (×) button
    this.btnClose = this.scene.add.rectangle(0, 0, 14, 14, CLR_BTN_CLOSE);
    this.btnClose.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnClose.setInteractive({ useHandCursor: true });

    this.btnCloseT = this.scene.add.text(0, 0, '×', {
      fontSize: '8px', fontFamily: 'monospace', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.btnCloseT.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    // Events
    this.btnUse.on('pointerdown',   () => { InputGuard.consume(); this.handleUse(); });
    this.btnDrop.on('pointerdown',  () => { InputGuard.consume(); this.handleDrop(); });
    this.btnClose.on('pointerdown', () => { InputGuard.consume(); this.hidePopup(); });

    this.btnUse.on('pointerover',  () => this.btnUse.setFillStyle(0x3e9e5e));
    this.btnUse.on('pointerout',   () => this.btnUse.setFillStyle(CLR_BTN_USE));
    this.btnDrop.on('pointerover', () => this.btnDrop.setFillStyle(0x9e3e3e));
    this.btnDrop.on('pointerout',  () => this.btnDrop.setFillStyle(CLR_BTN_DROP));
  }

  private showPopup(slotIndex: number): void {
    const item = this.inventory.getSlot(slotIndex);
    if (!item) { this.hidePopup(); return; }

    // Anchor position (top-left of popup in screen coords)
    const sx = START_X + slotIndex * (SLOT_SIZE + SLOT_GAP);
    let px = sx - (POP_W - SLOT_SIZE) / 2;
    let py = SLOT_Y - POP_H - 8;
    px = Phaser.Math.Clamp(px, 4, GAME_CONFIG.WIDTH - POP_W - 4);
    py = Math.max(4, py);

    // Draw popup background
    const g = this.popBg;
    g.clear();
    g.fillStyle(CLR_POP_BG, 0.93);
    g.fillRoundedRect(px, py, POP_W, POP_H, 4);
    g.lineStyle(1, 0x556677, 0.8);
    g.strokeRoundedRect(px, py, POP_W, POP_H, 4);

    // Draw item icon in top-left of popup
    const iconX = px + POP_PAD + 14;
    const iconY = py + POP_PAD + 14;
    g.fillStyle(item.color, 0.25);
    g.fillCircle(iconX, iconY, 13);
    this.drawIcon(g, item, iconX, iconY, 1.6);

    // Text — positioned in absolute screen coords
    const textX = px + POP_PAD + 32;
    this.popName.setPosition(textX, py + POP_PAD);
    this.popName.setText(item.name);

    this.popDesc.setPosition(px + POP_PAD, py + POP_PAD + 18);
    this.popDesc.setText(item.description);

    // Buttons row — absolute screen coords
    const btnY      = py + POP_H - 20;
    const btnGap    = 6;
    const totalBtnW = 48 + btnGap + 48;
    const btnStartX = px + (POP_W - totalBtnW) / 2;

    this.btnUse.setPosition(btnStartX + 24, btnY);
    this.btnUseTxt.setPosition(btnStartX + 24, btnY);

    this.btnDrop.setPosition(btnStartX + 48 + btnGap + 24, btnY);
    this.btnDropTxt.setPosition(btnStartX + 48 + btnGap + 24, btnY);

    // Close button (top-right corner of popup)
    this.btnClose.setPosition(px + POP_W - 10, py + 8);
    this.btnCloseT.setPosition(px + POP_W - 10, py + 8);

    // Show all popup elements
    this.popBg.setVisible(true);
    this.popName.setVisible(true);
    this.popDesc.setVisible(true);
    this.btnUse.setVisible(true).setActive(true);
    this.btnUseTxt.setVisible(true);
    this.btnDrop.setVisible(true).setActive(true);
    this.btnDropTxt.setVisible(true);
    this.btnClose.setVisible(true).setActive(true);
    this.btnCloseT.setVisible(true);
  }

  private hidePopup(): void {
    this.popBg.setVisible(false);
    this.popName.setVisible(false);
    this.popDesc.setVisible(false);
    this.btnUse.setVisible(false).setActive(false);
    this.btnUseTxt.setVisible(false);
    this.btnDrop.setVisible(false).setActive(false);
    this.btnDropTxt.setVisible(false);
    this.btnClose.setVisible(false).setActive(false);
    this.btnCloseT.setVisible(false);
    this.activeSlot = -1;
    this.redrawSlots();
  }

  // ─────────────────────────────────────────────────────────────
  // Private — events
  // ─────────────────────────────────────────────────────────────

  private onSlotClick(index: number): void {
    const item = this.inventory.getSlot(index);

    if (index === this.activeSlot) {
      this.hidePopup();
      return;
    }

    this.activeSlot = index;
    this.redrawSlots();

    if (item) {
      this.showPopup(index);
    } else {
      this.hidePopup();
    }
  }

  private handleUse(): void {
    const item = this.inventory.getSlot(this.activeSlot);
    if (!item) return;
    this.inventory.removeItem(this.activeSlot);
    this.onUse(item, this.activeSlot);
    this.hidePopup();
    this.redrawSlots();
  }

  private handleDrop(): void {
    const item = this.inventory.getSlot(this.activeSlot);
    if (!item) return;
    this.inventory.removeItem(this.activeSlot);
    this.onDrop(item, this.activeSlot);
    this.hidePopup();
    this.redrawSlots();
  }

  // ─────────────────────────────────────────────────────────────
  // Private — pixel icon renderer
  // ─────────────────────────────────────────────────────────────

  private drawIcon(
    g: Phaser.GameObjects.Graphics,
    item: InventoryItem,
    cx: number,
    cy: number,
    scale: number = 1,
  ): void {
    const s = scale;
    const c = item.color;

    switch (item.icon) {
      case 'cup':
        g.fillStyle(c, 1);
        g.fillRect(cx - 5 * s, cy - 4 * s, 10 * s, 8 * s);
        g.lineStyle(1.5 * s, c, 1);
        g.strokeRect(cx + 4 * s, cy - 2 * s, 3 * s, 4 * s);
        g.lineStyle(1, 0xffffff, 0.4);
        g.lineBetween(cx - 2 * s, cy - 5 * s, cx - 1 * s, cy - 7 * s);
        g.lineBetween(cx + 2 * s, cy - 5 * s, cx + 3 * s, cy - 7 * s);
        break;

      case 'circle':
        g.fillStyle(c, 0.7);
        for (let angle = 0; angle < 360; angle += 60) {
          const rad = Phaser.Math.DegToRad(angle);
          g.fillCircle(cx + Math.cos(rad) * 5 * s, cy + Math.sin(rad) * 5 * s, 3 * s);
        }
        g.fillStyle(0xffee88, 1);
        g.fillCircle(cx, cy, 3 * s);
        break;

      case 'envelope':
        g.fillStyle(c, 1);
        g.fillRect(cx - 6 * s, cy - 4 * s, 12 * s, 8 * s);
        g.lineStyle(1, 0x888866, 0.8);
        g.lineBetween(cx - 6 * s, cy - 4 * s, cx, cy + 1 * s);
        g.lineBetween(cx + 6 * s, cy - 4 * s, cx, cy + 1 * s);
        break;

      case 'key':
        g.lineStyle(2 * s, c, 1);
        g.strokeCircle(cx - 4 * s, cy, 4 * s);
        g.lineStyle(2 * s, c, 1);
        g.lineBetween(cx, cy, cx + 7 * s, cy);
        g.lineBetween(cx + 4 * s, cy, cx + 4 * s, cy + 2 * s);
        g.lineBetween(cx + 6 * s, cy, cx + 6 * s, cy + 3 * s);
        break;

      case 'cake':
        g.fillStyle(c, 1);
        g.fillRect(cx - 6 * s, cy, 12 * s, 5 * s);
        g.fillStyle(0xfff0f0, 1);
        g.fillRect(cx - 5 * s, cy - 3 * s, 10 * s, 3 * s);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 2 * s, cy - 4 * s, 1.5 * s);
        g.fillCircle(cx + 2 * s, cy - 4 * s, 1.5 * s);
        g.fillStyle(0xffcc00, 0.8);
        g.fillRect(cx - 0.5 * s, cy - 8 * s, 1.5 * s, 4 * s);
        break;

      case 'book':
        g.fillStyle(c, 1);
        g.fillRect(cx - 6 * s, cy - 5 * s, 12 * s, 10 * s);
        g.fillStyle(0x000000, 0.3);
        g.fillRect(cx - 6 * s, cy - 5 * s, 2 * s, 10 * s);
        g.lineStyle(0.8, 0xffffff, 0.25);
        for (let line = -2; line <= 2; line++) {
          g.lineBetween(cx - 2 * s, cy + line * 2 * s, cx + 5 * s, cy + line * 2 * s);
        }
        break;

      case 'gem':
        g.fillStyle(c, 0.9);
        g.fillTriangle(cx, cy - 7 * s, cx - 5 * s, cy, cx + 5 * s, cy);
        g.fillTriangle(cx - 5 * s, cy, cx + 5 * s, cy, cx, cy + 5 * s);
        g.fillStyle(0xffffff, 0.5);
        g.fillTriangle(cx - 1 * s, cy - 5 * s, cx - 4 * s, cy - 1 * s, cx + 1 * s, cy - 3 * s);
        break;

      default:
        g.fillStyle(c, 1);
        g.fillRect(cx - 5 * s, cy - 5 * s, 10 * s, 10 * s);
    }
  }
}
