import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';

const CLR_BG       = 0x1a1a2e;
const CLR_TITLE    = '#f2a65a';
const CLR_SUBTITLE = '#8b8b8b';
const CLR_BTN_BG   = 0x2a3a4a;
const CLR_BTN_SEL  = 0x4488aa;
const CLR_BTN_TXT  = '#e0e0e0';
const CLR_BTN_DIM  = '#667788';
const CLR_VERSION  = '#555555';

interface MenuItem {
  label: string;
  enabled: boolean;
  action: () => void;
}

export class MainMenuScene extends Phaser.Scene {
  private menuItems: MenuItem[] = [];
  private selectedIndex: number = 0;
  private btnRects: Phaser.GameObjects.Rectangle[] = [];
  private btnTexts: Phaser.GameObjects.Text[] = [];
  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU });
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    this.add.rectangle(cx, cy, WIDTH, HEIGHT, CLR_BG);
    this.createStarfield();

    // Title
    this.add.text(cx, cy - 70, 'BRONGWOOD', {
      fontSize: '20px', color: CLR_TITLE,
      fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 48, 'A story of healing', {
      fontSize: '8px', color: CLR_SUBTITLE, fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(WIDTH - 6, HEIGHT - 6, 'v0.1.0', {
      fontSize: '7px', color: CLR_VERSION, fontFamily: 'monospace',
    }).setOrigin(1, 1);

    this.buildMenuItems();
    this.renderMenu();

    this.input.keyboard!.on('keydown-ENTER', this.activateSelected, this);
    this.input.keyboard!.on('keydown-SPACE', this.activateSelected, this);
    this.input.keyboard!.on('keydown-UP', this.moveUp, this);
    this.input.keyboard!.on('keydown-DOWN', this.moveDown, this);
    this.input.keyboard!.on('keydown-W', this.moveUp, this);
    this.input.keyboard!.on('keydown-S', this.moveDown, this);
  }

  private buildMenuItems(): void {
    const hasSave = [1, 2, 3].some(s => gameManager.save.getSlotInfo(s) !== null);

    this.menuItems = [
      {
        label: 'New Game',
        enabled: true,
        action: () => this.startNewGame(),
      },
      {
        label: 'Continue',
        enabled: hasSave,
        action: () => this.continueGame(),
      },
    ];

    // Default selection to Continue if saves exist
    this.selectedIndex = hasSave ? 1 : 0;
  }

  private renderMenu(): void {
    // Clear previous
    for (const r of this.btnRects) r.destroy();
    for (const t of this.btnTexts) t.destroy();
    this.btnRects = [];
    this.btnTexts = [];

    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const cx = WIDTH / 2;
    const startY = HEIGHT / 2 - 10;
    const BTN_W = 120;
    const BTN_H = 20;
    const GAP = 8;

    this.menuItems.forEach((item, i) => {
      const y = startY + i * (BTN_H + GAP);
      const isSelected = i === this.selectedIndex;
      const bgColor = isSelected ? CLR_BTN_SEL : CLR_BTN_BG;
      const txtColor = item.enabled ? CLR_BTN_TXT : CLR_BTN_DIM;

      const rect = this.add.rectangle(cx, y, BTN_W, BTN_H, bgColor, item.enabled ? 0.9 : 0.5);
      rect.setInteractive({ useHandCursor: item.enabled });

      rect.on('pointerover', () => {
        if (!item.enabled) return;
        this.selectedIndex = i;
        this.refreshHighlight();
      });
      rect.on('pointerdown', () => {
        if (!item.enabled) return;
        item.action();
      });

      const txt = this.add.text(cx, y, item.label, {
        fontSize: '8px', color: txtColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.btnRects.push(rect);
      this.btnTexts.push(txt);
    });
  }

  private refreshHighlight(): void {
    this.btnRects.forEach((rect, i) => {
      const isSelected = i === this.selectedIndex;
      const item = this.menuItems[i];
      rect.setFillStyle(isSelected ? CLR_BTN_SEL : CLR_BTN_BG, item.enabled ? 0.9 : 0.5);
    });
  }

  private moveUp(): void {
    let next = this.selectedIndex;
    do {
      next = (next - 1 + this.menuItems.length) % this.menuItems.length;
    } while (!this.menuItems[next].enabled && next !== this.selectedIndex);
    this.selectedIndex = next;
    this.refreshHighlight();
  }

  private moveDown(): void {
    let next = this.selectedIndex;
    do {
      next = (next + 1) % this.menuItems.length;
    } while (!this.menuItems[next].enabled && next !== this.selectedIndex);
    this.selectedIndex = next;
    this.refreshHighlight();
  }

  private activateSelected(): void {
    const item = this.menuItems[this.selectedIndex];
    if (item?.enabled) item.action();
  }

  private startNewGame(): void {
    this.cameras.main.fadeOut(500, 0x1a, 0x1a, 0x2e);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.WORLD);
    });
  }

  private continueGame(): void {
    // Find the most recently saved slot
    let latestSlot = 1;
    let latestTime = '';
    for (let s = 1; s <= 3; s++) {
      const info = gameManager.save.getSlotInfo(s);
      if (info && info.savedAt > latestTime) {
        latestTime = info.savedAt;
        latestSlot = s;
      }
    }

    const data = gameManager.loadGame(latestSlot);
    if (!data) {
      this.startNewGame();
      return;
    }

    this.cameras.main.fadeOut(500, 0x1a, 0x1a, 0x2e);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.WORLD, {
        map: data.player.mapKey,
        spawn: undefined,
      });
    });
  }

  private createStarfield(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const graphics = this.add.graphics();
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.6);
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillRect(x, y, 1, 1);
    }
  }
}
