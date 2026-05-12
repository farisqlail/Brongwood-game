/**
 * InventoryUI - 5-slot hotbar + bag popup with 10 extra slots.
 *
 * Hotbar layout:
 *   [ ] [ ] [ ] [ ] [ ] [Bag]
 *
 * Bag popup layout:
 *   [ ] [ ] [ ] [ ] [ ]
 *   [ ] [ ] [ ] [ ] [ ]
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { InventoryItem } from '@/types/inventory';
import { BAG_SLOTS, HOTBAR_SLOTS, InventorySystem, MAX_SLOTS } from '@/systems/InventorySystem';
import { InputGuard } from '@/ui/InputGuard';

const SLOT_SIZE = 30;
const SLOT_GAP = 5;
const HOTBAR_W = HOTBAR_SLOTS * SLOT_SIZE + (HOTBAR_SLOTS - 1) * SLOT_GAP;
const BUTTON_GAP = 10;
const BAG_BTN_SIZE = 30;
const TOTAL_W = HOTBAR_W + BUTTON_GAP + BAG_BTN_SIZE;
const START_X = (GAME_CONFIG.WIDTH - TOTAL_W) / 2;
const SLOT_Y = GAME_CONFIG.HEIGHT - SLOT_SIZE - 8;
const BAG_BTN_X = START_X + HOTBAR_W + BUTTON_GAP;
const BAG_BTN_Y = SLOT_Y;

const BAG_COLS = 5;
const BAG_ROWS = Math.ceil(BAG_SLOTS / BAG_COLS);
const BAG_GRID_W = BAG_COLS * SLOT_SIZE + (BAG_COLS - 1) * SLOT_GAP;
const BAG_GRID_H = BAG_ROWS * SLOT_SIZE + (BAG_ROWS - 1) * SLOT_GAP;
const BAG_PANEL_PAD = 10;
const BAG_PANEL_W = BAG_GRID_W + BAG_PANEL_PAD * 2;
const BAG_PANEL_H = BAG_GRID_H + BAG_PANEL_PAD * 2 + 12;
const BAG_PANEL_X = (GAME_CONFIG.WIDTH - BAG_PANEL_W) / 2;
const BAG_PANEL_Y = SLOT_Y - BAG_PANEL_H - 14;

const POP_W = 136;
const POP_H = 82;
const POP_PAD = 7;

const CLR_SLOT_BG = 0x1a1a2e;
const CLR_SLOT_BORDER = 0x445566;
const CLR_SLOT_HOVER = 0x334466;
const CLR_SLOT_SEL = 0x556688;
const CLR_POP_BG = 0x0d1117;
const CLR_BTN_USE = 0x2e6e3e;
const CLR_BTN_DROP = 0x6e2e2e;
const CLR_BTN_CLOSE = 0x334455;
const CLR_BAG_PANEL = 0x111827;
const CLR_BAG_BTN = 0x243242;
const CLR_BAG_BTN_ACTIVE = 0x37516b;

const POP_DEPTH = DEPTH.UI + 20;
const BAG_PANEL_DEPTH = DEPTH.UI + 15;

type SlotPosition = {
  x: number;
  y: number;
};

export class InventoryUI {
  private scene: Phaser.Scene;
  private inventory: InventorySystem;

  private slotBg: Phaser.GameObjects.Graphics;
  private slotHit: Phaser.GameObjects.Rectangle[] = [];
  private slotQtyText: Phaser.GameObjects.Text[] = [];
  private bagPanelBg: Phaser.GameObjects.Graphics;
  private bagButtonBg: Phaser.GameObjects.Graphics;
  private bagButtonHit: Phaser.GameObjects.Rectangle;
  private bagOpen = false;
  private uiVisible = true;

  private popBg!: Phaser.GameObjects.Graphics;
  private popName!: Phaser.GameObjects.Text;
  private popDesc!: Phaser.GameObjects.Text;
  private btnUse!: Phaser.GameObjects.Rectangle;
  private btnUseTxt!: Phaser.GameObjects.Text;
  private btnDrop!: Phaser.GameObjects.Rectangle;
  private btnDropTxt!: Phaser.GameObjects.Text;
  private btnClose!: Phaser.GameObjects.Rectangle;
  private btnCloseT!: Phaser.GameObjects.Text;

  private activeSlot = -1;

  onUse: (item: InventoryItem, slot: number) => void = () => {};
  onDrop: (item: InventoryItem, slot: number) => void = () => {};

  constructor(scene: Phaser.Scene, inventory: InventorySystem) {
    this.scene = scene;
    this.inventory = inventory;

    this.slotBg = scene.add.graphics();
    this.slotBg.setScrollFactor(0);
    this.slotBg.setDepth(DEPTH.UI + 10);

    this.bagPanelBg = scene.add.graphics();
    this.bagPanelBg.setScrollFactor(0);
    this.bagPanelBg.setDepth(BAG_PANEL_DEPTH);

    this.bagButtonBg = scene.add.graphics();
    this.bagButtonBg.setScrollFactor(0);
    this.bagButtonBg.setDepth(DEPTH.UI + 10);

    this.bagButtonHit = scene.add.rectangle(
      BAG_BTN_X + BAG_BTN_SIZE / 2,
      BAG_BTN_Y + BAG_BTN_SIZE / 2,
      BAG_BTN_SIZE,
      BAG_BTN_SIZE,
      0xffffff,
      0,
    );
    this.bagButtonHit.setScrollFactor(0);
    this.bagButtonHit.setDepth(DEPTH.UI + 11);
    this.bagButtonHit.setInteractive({ useHandCursor: true });
    this.bagButtonHit.on('pointerdown', () => {
      InputGuard.consume();
      this.toggleBag();
    });
    this.bagButtonHit.on('pointerover', () => {
      this.bagButtonHit.setFillStyle(0xffffff, 0.06);
    });
    this.bagButtonHit.on('pointerout', () => {
      this.bagButtonHit.setFillStyle(0xffffff, 0);
    });

    this.buildSlotHitAreas();
    this.buildSlotQtyTexts();
    this.buildPopup();
    this.hidePopup();
    this.redrawSlots();
  }

  redrawSlots(): void {
    this.drawHotbar();
    this.drawBagPanel();
    this.updateHitAreaVisibility();
  }

  setVisible(visible: boolean): void {
    this.uiVisible = visible;
    this.slotBg.setVisible(visible);
    this.bagPanelBg.setVisible(visible && this.bagOpen);
    this.bagButtonBg.setVisible(visible);
    this.bagButtonHit.setVisible(visible);
    this.bagButtonHit.setActive(visible);
    this.updateHitAreaVisibility();
    if (!visible) {
      this.hidePopup();
    }
  }

  destroy(): void {
    this.slotBg.destroy();
    this.bagPanelBg.destroy();
    this.bagButtonBg.destroy();
    this.bagButtonHit.destroy();
    for (const zone of this.slotHit) zone.destroy();
    for (const qty of this.slotQtyText) qty.destroy();
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

  private buildSlotHitAreas(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const pos = this.getSlotPosition(i);
      const rect = this.scene.add.rectangle(
        pos.x + SLOT_SIZE / 2,
        pos.y + SLOT_SIZE / 2,
        SLOT_SIZE,
        SLOT_SIZE,
        0xffffff,
        0,
      );
      rect.setScrollFactor(0);
      rect.setDepth(DEPTH.UI + 11);
      rect.setInteractive({ useHandCursor: true });

      const slotIdx = i;
      rect.on('pointerdown', () => {
        InputGuard.consume();
        this.onSlotClick(slotIdx);
      });
      rect.on('pointerover', () => {
        rect.setFillStyle(0xffffff, 0.06);
      });
      rect.on('pointerout', () => {
        rect.setFillStyle(0xffffff, 0);
      });

      this.slotHit.push(rect);
    }
  }

  private buildSlotQtyTexts(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const pos = this.getSlotPosition(i);
      const txt = this.scene.add.text(pos.x + SLOT_SIZE - 3, pos.y + SLOT_SIZE - 2, '', {
        fontSize: '6px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      });
      txt.setOrigin(1, 1);
      txt.setScrollFactor(0);
      txt.setDepth(DEPTH.UI + 12);
      this.slotQtyText.push(txt);
    }
  }

  private buildPopup(): void {
    this.popBg = this.scene.add.graphics();
    this.popBg.setScrollFactor(0);
    this.popBg.setDepth(POP_DEPTH);

    this.popName = this.scene.add.text(0, 0, '', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.popName.setScrollFactor(0).setDepth(POP_DEPTH + 1);

    this.popDesc = this.scene.add.text(0, 0, '', {
      fontSize: '6px',
      fontFamily: 'monospace',
      color: '#aabbcc',
      wordWrap: { width: POP_W - POP_PAD * 2 },
    });
    this.popDesc.setScrollFactor(0).setDepth(POP_DEPTH + 1);

    this.btnUse = this.scene.add.rectangle(0, 0, 48, 14, CLR_BTN_USE);
    this.btnUse.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnUse.setInteractive({ useHandCursor: true });

    this.btnUseTxt = this.scene.add.text(0, 0, 'Use', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#ccffcc',
    }).setOrigin(0.5);
    this.btnUseTxt.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    this.btnDrop = this.scene.add.rectangle(0, 0, 48, 14, CLR_BTN_DROP);
    this.btnDrop.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnDrop.setInteractive({ useHandCursor: true });

    this.btnDropTxt = this.scene.add.text(0, 0, 'Drop', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#ffcccc',
    }).setOrigin(0.5);
    this.btnDropTxt.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    this.btnClose = this.scene.add.rectangle(0, 0, 14, 14, CLR_BTN_CLOSE);
    this.btnClose.setScrollFactor(0).setDepth(POP_DEPTH + 1);
    this.btnClose.setInteractive({ useHandCursor: true });

    this.btnCloseT = this.scene.add.text(0, 0, 'X', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.btnCloseT.setScrollFactor(0).setDepth(POP_DEPTH + 2);

    this.btnUse.on('pointerdown', () => {
      InputGuard.consume();
      this.handleUse();
    });
    this.btnDrop.on('pointerdown', () => {
      InputGuard.consume();
      this.handleDrop();
    });
    this.btnClose.on('pointerdown', () => {
      InputGuard.consume();
      this.hidePopup();
    });

    this.btnUse.on('pointerover', () => this.btnUse.setFillStyle(0x3e9e5e));
    this.btnUse.on('pointerout', () => this.btnUse.setFillStyle(CLR_BTN_USE));
    this.btnDrop.on('pointerover', () => this.btnDrop.setFillStyle(0x9e3e3e));
    this.btnDrop.on('pointerout', () => this.btnDrop.setFillStyle(CLR_BTN_DROP));
  }

  private drawHotbar(): void {
    const g = this.slotBg;
    g.clear();

    const slots = this.inventory.getSlots();
    const barPad = 5;
    const barX = START_X - barPad;
    const barY = SLOT_Y - barPad;
    const barW = TOTAL_W + barPad * 2;
    const barH = SLOT_SIZE + barPad * 2;

    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(barX, barY, barW, barH, 4);
    g.lineStyle(1, 0x445566, 0.5);
    g.strokeRoundedRect(barX, barY, barW, barH, 4);

    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      this.drawSlot(g, i, slots[i], this.getSlotPosition(i));
    }

    const bagActive = this.bagOpen && this.activeSlot >= HOTBAR_SLOTS;
    g.fillStyle(bagActive ? CLR_BAG_BTN_ACTIVE : CLR_BAG_BTN, 1);
    g.fillRect(BAG_BTN_X, BAG_BTN_Y, BAG_BTN_SIZE, BAG_BTN_SIZE);
    g.lineStyle(1, bagActive ? 0x88aacc : CLR_SLOT_BORDER, 1);
    g.strokeRect(BAG_BTN_X, BAG_BTN_Y, BAG_BTN_SIZE, BAG_BTN_SIZE);

    this.bagButtonBg.clear();
    this.bagButtonBg.fillStyle(0xd8b47b, 1);
    this.bagButtonBg.fillRect(BAG_BTN_X + 8, BAG_BTN_Y + 9, 14, 12);
    this.bagButtonBg.lineStyle(1, 0x6b4f2d, 1);
    this.bagButtonBg.strokeRect(BAG_BTN_X + 8, BAG_BTN_Y + 9, 14, 12);
    this.bagButtonBg.lineBetween(BAG_BTN_X + 8, BAG_BTN_Y + 13, BAG_BTN_X + 22, BAG_BTN_Y + 13);
    this.bagButtonBg.lineBetween(BAG_BTN_X + 11, BAG_BTN_Y + 9, BAG_BTN_X + 11, BAG_BTN_Y + 6);
    this.bagButtonBg.lineBetween(BAG_BTN_X + 19, BAG_BTN_Y + 9, BAG_BTN_X + 19, BAG_BTN_Y + 6);
    this.bagButtonBg.lineBetween(BAG_BTN_X + 11, BAG_BTN_Y + 6, BAG_BTN_X + 19, BAG_BTN_Y + 6);
  }

  private drawBagPanel(): void {
    const g = this.bagPanelBg;
    g.clear();

    if (!this.bagOpen || !this.uiVisible) {
      return;
    }

    const slots = this.inventory.getSlots();
    g.fillStyle(CLR_BAG_PANEL, 0.95);
    g.fillRoundedRect(BAG_PANEL_X, BAG_PANEL_Y, BAG_PANEL_W, BAG_PANEL_H, 6);
    g.lineStyle(1, 0x556677, 0.8);
    g.strokeRoundedRect(BAG_PANEL_X, BAG_PANEL_Y, BAG_PANEL_W, BAG_PANEL_H, 6);

    g.fillStyle(0xffffff, 0.8);
    g.fillRect(BAG_PANEL_X + BAG_PANEL_PAD, BAG_PANEL_Y + 8, 18, 2);
    g.fillRect(BAG_PANEL_X + BAG_PANEL_PAD, BAG_PANEL_Y + 12, 18, 2);

    for (let i = HOTBAR_SLOTS; i < MAX_SLOTS; i++) {
      this.drawSlot(g, i, slots[i], this.getSlotPosition(i));
    }
  }

  private getSlotPosition(index: number): SlotPosition {
    if (index < HOTBAR_SLOTS) {
      return {
        x: START_X + index * (SLOT_SIZE + SLOT_GAP),
        y: SLOT_Y,
      };
    }

    const bagIndex = index - HOTBAR_SLOTS;
    const col = bagIndex % BAG_COLS;
    const row = Math.floor(bagIndex / BAG_COLS);
    return {
      x: BAG_PANEL_X + BAG_PANEL_PAD + col * (SLOT_SIZE + SLOT_GAP),
      y: BAG_PANEL_Y + BAG_PANEL_PAD + 12 + row * (SLOT_SIZE + SLOT_GAP),
    };
  }

  private updateHitAreaVisibility(): void {
    for (let i = 0; i < this.slotHit.length; i++) {
      const visible = this.uiVisible && (i < HOTBAR_SLOTS || this.bagOpen);
      this.slotHit[i].setVisible(visible);
      this.slotHit[i].setActive(visible);
      this.slotQtyText[i].setVisible(visible);
    }
  }

  private toggleBag(): void {
    this.bagOpen = !this.bagOpen;
    if (!this.bagOpen && this.activeSlot >= HOTBAR_SLOTS) {
      this.hidePopup();
      return;
    }
    this.redrawSlots();
  }

  private showPopup(slotIndex: number): void {
    const item = this.inventory.getSlot(slotIndex);
    if (!item) {
      this.hidePopup();
      return;
    }

    const slotPos = this.getSlotPosition(slotIndex);
    let px = slotPos.x - (POP_W - SLOT_SIZE) / 2;
    let py = slotPos.y - POP_H - 8;

    if (slotIndex >= HOTBAR_SLOTS) {
      py = slotPos.y + SLOT_SIZE + 6;
    }

    px = Phaser.Math.Clamp(px, 4, GAME_CONFIG.WIDTH - POP_W - 4);
    py = Phaser.Math.Clamp(py, 4, GAME_CONFIG.HEIGHT - POP_H - 4);

    const g = this.popBg;
    g.clear();
    g.fillStyle(CLR_POP_BG, 0.93);
    g.fillRoundedRect(px, py, POP_W, POP_H, 4);
    g.lineStyle(1, 0x556677, 0.8);
    g.strokeRoundedRect(px, py, POP_W, POP_H, 4);

    const iconX = px + POP_PAD + 14;
    const iconY = py + POP_PAD + 14;
    g.fillStyle(item.color, 0.25);
    g.fillCircle(iconX, iconY, 13);
    this.drawIcon(g, item, iconX, iconY, 1.6);

    const textX = px + POP_PAD + 32;
    this.popName.setPosition(textX, py + POP_PAD);
    this.popName.setText(item.name);
    this.btnUseTxt.setText(this.isSelectableSeed(item) ? 'Pilih' : 'Use');

    this.popDesc.setPosition(px + POP_PAD, py + POP_PAD + 18);
    this.popDesc.setText(item.description);

    const btnY = py + POP_H - 20;
    const btnGap = 6;
    const totalBtnW = 48 + btnGap + 48;
    const btnStartX = px + (POP_W - totalBtnW) / 2;

    this.btnUse.setPosition(btnStartX + 24, btnY);
    this.btnUseTxt.setPosition(btnStartX + 24, btnY);
    this.btnDrop.setPosition(btnStartX + 48 + btnGap + 24, btnY);
    this.btnDropTxt.setPosition(btnStartX + 48 + btnGap + 24, btnY);
    this.btnClose.setPosition(px + POP_W - 10, py + 8);
    this.btnCloseT.setPosition(px + POP_W - 10, py + 8);

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

  private onSlotClick(index: number): void {
    const item = this.inventory.getSlot(index);

    if (!item) {
      this.inventory.clearSelectedSlot();
      this.hidePopup();
      return;
    }

    this.inventory.selectSlot(index);

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

    if (this.isSelectableSeed(item)) {
      this.inventory.selectSlot(this.activeSlot);
      this.hidePopup();
      this.redrawSlots();
      return;
    }

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

  private isSelectableSeed(item: InventoryItem): boolean {
    return item.id.endsWith('_seed');
  }

  private drawSlot(
    graphics: Phaser.GameObjects.Graphics,
    index: number,
    item: InventoryItem | null,
    pos: SlotPosition,
  ): void {
    const isActive = index === this.activeSlot;
    const isSelected = index === this.inventory.getSelectedSlot();
    graphics.fillStyle(isActive || isSelected ? CLR_SLOT_SEL : (item ? CLR_SLOT_HOVER : CLR_SLOT_BG), 1);
    graphics.fillRect(pos.x, pos.y, SLOT_SIZE, SLOT_SIZE);
    graphics.lineStyle(1, isActive || isSelected ? 0x88aacc : CLR_SLOT_BORDER, 1);
    graphics.strokeRect(pos.x, pos.y, SLOT_SIZE, SLOT_SIZE);

    const qtyText = this.slotQtyText[index];
    qtyText.setPosition(pos.x + SLOT_SIZE - 3, pos.y + SLOT_SIZE - 2);

    if (item) {
      this.drawIcon(graphics, item, pos.x + SLOT_SIZE / 2, pos.y + SLOT_SIZE / 2);
      const quantity = item.quantity ?? 1;
      qtyText.setText(quantity > 1 ? String(quantity) : '');
    } else {
      qtyText.setText('');
    }
  }
}
