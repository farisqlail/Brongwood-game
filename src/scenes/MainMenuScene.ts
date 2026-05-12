import Phaser from 'phaser';
import { SCENE_KEYS, GAME_CONFIG, DEPTH } from '@config/game.config';
import { AUDIO_KEYS } from '@config/assets.manifest';
import { gameManager } from '@/managers/GameManager';
import { PauseMenuUI } from '@/ui/PauseMenuUI';

const CLR_BG = 0x1a1a2e;
const CLR_TITLE = '#f2a65a';
const CLR_SUBTITLE = '#8b8b8b';
const CLR_BTN_BG = 0x2a3a4a;
const CLR_BTN_SEL = 0x4488aa;
const CLR_BTN_TXT = '#e0e0e0';
const CLR_BTN_DIM = '#667788';
const CLR_VERSION = '#555555';
const CLR_PANEL = 0x111827;
const CLR_PANEL_BORDER = 0x58677a;
const CLR_SLIDER_TRACK = 0x24313f;
const CLR_SLIDER_FILL = 0xf2a65a;
const CLR_SLIDER_KNOB = 0xf5efe0;
const CLR_BACKDROP = 0x000000;

const MENU_BGM_STORAGE_KEY = 'brongwood_bgm_volume';

interface MenuItem {
  label: string;
  enabled: boolean;
  action: () => void;
}

export class MainMenuScene extends Phaser.Scene {
  private menuItems: MenuItem[] = [];
  private selectedIndex = 0;
  private btnRects: Phaser.GameObjects.Rectangle[] = [];
  private btnTexts: Phaser.GameObjects.Text[] = [];

  private settingsOpen = false;
  private settingsContainer: Phaser.GameObjects.Container | null = null;
  private settingsBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private volumeValue = 0.4;
  private volumeValueText: Phaser.GameObjects.Text | null = null;
  private volumeFill: Phaser.GameObjects.Rectangle | null = null;
  private volumeKnob: Phaser.GameObjects.Rectangle | null = null;
  private volumeSliderBounds: { left: number; width: number } | null = null;
  private menuBgm: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MAIN_MENU });
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    this.volumeValue = this.readSavedBgmVolume();

    this.add.rectangle(cx, cy, WIDTH, HEIGHT, CLR_BG);
    this.createStarfield();

    this.add.text(cx, cy - 70, 'BRONGWOOD', {
      fontSize: '20px',
      color: CLR_TITLE,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 48, 'A story of healing', {
      fontSize: '8px',
      color: CLR_SUBTITLE,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(WIDTH - 6, HEIGHT - 6, 'v0.1.0', {
      fontSize: '7px',
      color: CLR_VERSION,
      fontFamily: 'monospace',
    }).setOrigin(1, 1);

    this.buildMenuItems();
    this.renderMenu();
    this.createSettingsOverlay();
    this.setupInput();
    this.startMenuBgm();

    this.events.once('shutdown', () => {
      this.stopMenuBgm();
    });
  }

  private buildMenuItems(): void {
    const hasSave = [1, 2, 3].some((s) => gameManager.save.getSlotInfo(s) !== null);

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
      {
        label: 'Settings',
        enabled: true,
        action: () => this.openSettings(),
      },
    ];

    this.selectedIndex = hasSave ? 1 : 0;
  }

  private renderMenu(): void {
    for (const r of this.btnRects) r.destroy();
    for (const t of this.btnTexts) t.destroy();
    this.btnRects = [];
    this.btnTexts = [];

    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const cx = WIDTH / 2;
    const startY = HEIGHT / 2 - 10;
    const btnWidth = 120;
    const btnHeight = 20;
    const gap = 8;

    this.menuItems.forEach((item, i) => {
      const y = startY + i * (btnHeight + gap);
      const isSelected = i === this.selectedIndex;
      const bgColor = isSelected ? CLR_BTN_SEL : CLR_BTN_BG;
      const txtColor = item.enabled ? CLR_BTN_TXT : CLR_BTN_DIM;

      const rect = this.add.rectangle(cx, y, btnWidth, btnHeight, bgColor, item.enabled ? 0.9 : 0.5);
      rect.setInteractive({ useHandCursor: item.enabled });

      rect.on('pointerover', () => {
        if (!item.enabled || this.settingsOpen) return;
        this.selectedIndex = i;
        this.refreshHighlight();
      });
      rect.on('pointerdown', () => {
        if (!item.enabled || this.settingsOpen) return;
        item.action();
      });

      const txt = this.add.text(cx, y, item.label, {
        fontSize: '8px',
        color: txtColor,
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.btnRects.push(rect);
      this.btnTexts.push(txt);
    });
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-ENTER', this.activateSelected, this);
    this.input.keyboard!.on('keydown-SPACE', this.activateSelected, this);
    this.input.keyboard!.on('keydown-UP', this.moveUp, this);
    this.input.keyboard!.on('keydown-DOWN', this.moveDown, this);
    this.input.keyboard!.on('keydown-W', this.moveUp, this);
    this.input.keyboard!.on('keydown-S', this.moveDown, this);
    this.input.keyboard!.on('keydown-ESC', this.handleEscape, this);
  }

  private createSettingsOverlay(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const panelWidth = 188;
    const panelHeight = 124;
    const sliderWidth = 112;
    const sliderLeft = cx - sliderWidth / 2;
    const sliderY = cy + 4;

    this.settingsBackdrop = this.add.rectangle(cx, cy, WIDTH, HEIGHT, CLR_BACKDROP, 0.58);
    this.settingsBackdrop.setDepth(DEPTH.UI + 20);
    this.settingsBackdrop.setScrollFactor(0);
    this.settingsBackdrop.setInteractive();
    this.settingsBackdrop.on('pointerdown', () => this.closeSettings());

    const container = this.add.container(0, 0);
    container.setDepth(DEPTH.UI + 21);
    container.setScrollFactor(0);

    const panel = this.add.rectangle(cx, cy, panelWidth, panelHeight, CLR_PANEL, 0.96);
    panel.setStrokeStyle(1, CLR_PANEL_BORDER, 0.95);
    container.add(panel);

    const title = this.add.text(cx, cy - 42, 'SETTINGS', {
      fontSize: '10px',
      color: CLR_TITLE,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    const label = this.add.text(cx - 56, cy - 12, 'BGM Volume', {
      fontSize: '8px',
      color: CLR_BTN_TXT,
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    container.add(label);

    this.volumeValueText = this.add.text(cx + 56, cy - 12, '', {
      fontSize: '8px',
      color: CLR_SUBTITLE,
      fontFamily: 'monospace',
    }).setOrigin(1, 0.5);
    container.add(this.volumeValueText);

    const track = this.add.rectangle(cx, sliderY, sliderWidth, 8, CLR_SLIDER_TRACK, 1);
    track.setStrokeStyle(1, 0x4d5c6f, 0.85);
    container.add(track);

    this.volumeFill = this.add.rectangle(sliderLeft, sliderY, 0, 8, CLR_SLIDER_FILL, 1).setOrigin(0, 0.5);
    container.add(this.volumeFill);

    this.volumeKnob = this.add.rectangle(sliderLeft, sliderY, 10, 18, CLR_SLIDER_KNOB, 1).setOrigin(0.5);
    this.volumeKnob.setStrokeStyle(1, 0xb69763, 0.9);
    container.add(this.volumeKnob);

    const sliderHit = this.add.zone(cx, sliderY, sliderWidth + 16, 26);
    sliderHit.setInteractive({ useHandCursor: true, draggable: true });
    container.add(sliderHit);

    sliderHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateVolumeFromPointer(pointer);
    });
    sliderHit.on('drag', (pointer: Phaser.Input.Pointer) => {
      this.updateVolumeFromPointer(pointer);
    });

    const hint = this.add.text(cx, cy + 28, 'Drag the bar to adjust volume', {
      fontSize: '7px',
      color: CLR_SUBTITLE,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(hint);

    const closeBtn = this.add.rectangle(cx, cy + 48, 82, 18, CLR_BTN_BG, 0.95);
    closeBtn.setStrokeStyle(1, 0x5a6d80, 0.9);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(CLR_BTN_SEL, 1));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(CLR_BTN_BG, 0.95));
    closeBtn.on('pointerdown', () => this.closeSettings());
    container.add(closeBtn);

    const closeText = this.add.text(cx, cy + 48, 'Close', {
      fontSize: '8px',
      color: CLR_BTN_TXT,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(closeText);

    this.settingsBackdrop.setVisible(false);
    container.setVisible(false);

    this.settingsContainer = container;
    this.volumeSliderBounds = { left: sliderLeft, width: sliderWidth };
    this.refreshVolumeSlider();
  }

  private refreshHighlight(): void {
    this.btnRects.forEach((rect, i) => {
      const isSelected = i === this.selectedIndex;
      const item = this.menuItems[i];
      rect.setFillStyle(isSelected ? CLR_BTN_SEL : CLR_BTN_BG, item.enabled ? 0.9 : 0.5);
    });
  }

  private moveUp(): void {
    if (this.settingsOpen) return;

    let next = this.selectedIndex;
    do {
      next = (next - 1 + this.menuItems.length) % this.menuItems.length;
    } while (!this.menuItems[next].enabled && next !== this.selectedIndex);
    this.selectedIndex = next;
    this.refreshHighlight();
  }

  private moveDown(): void {
    if (this.settingsOpen) return;

    let next = this.selectedIndex;
    do {
      next = (next + 1) % this.menuItems.length;
    } while (!this.menuItems[next].enabled && next !== this.selectedIndex);
    this.selectedIndex = next;
    this.refreshHighlight();
  }

  private activateSelected(): void {
    if (this.settingsOpen) return;

    const item = this.menuItems[this.selectedIndex];
    if (item?.enabled) item.action();
  }

  private openSettings(): void {
    this.settingsOpen = true;
    this.settingsBackdrop?.setVisible(true);
    this.settingsContainer?.setVisible(true);
    this.refreshVolumeSlider();
  }

  private closeSettings(): void {
    this.settingsOpen = false;
    this.settingsBackdrop?.setVisible(false);
    this.settingsContainer?.setVisible(false);
  }

  private handleEscape(): void {
    if (this.settingsOpen) {
      this.closeSettings();
    }
  }

  private updateVolumeFromPointer(pointer: Phaser.Input.Pointer): void {
    const bounds = this.volumeSliderBounds;
    if (!bounds) return;

    const normalized = Phaser.Math.Clamp((pointer.x - bounds.left) / bounds.width, 0, 1);
    this.setMenuVolume(normalized);
  }

  private setMenuVolume(value: number): void {
    this.volumeValue = Phaser.Math.Clamp(value, 0, 1);
    localStorage.setItem(MENU_BGM_STORAGE_KEY, String(this.volumeValue));
    this.refreshVolumeSlider();

    if (this.menuBgm) {
      (this.menuBgm as Phaser.Sound.WebAudioSound).setVolume(this.volumeValue);
    }
  }

  private refreshVolumeSlider(): void {
    if (!this.volumeFill || !this.volumeKnob || !this.volumeValueText || !this.volumeSliderBounds) return;

    const { left, width } = this.volumeSliderBounds;
    const fillWidth = Math.max(0, width * this.volumeValue);
    const knobX = left + fillWidth;

    this.volumeFill.width = fillWidth;
    this.volumeKnob.x = knobX;
    this.volumeValueText.setText(`${Math.round(this.volumeValue * 100)}%`);
  }

  private readSavedBgmVolume(): number {
    const saved = parseFloat(localStorage.getItem(MENU_BGM_STORAGE_KEY) ?? '0.4');
    return Number.isNaN(saved) ? 0.4 : Phaser.Math.Clamp(saved, 0, 1);
  }

  private startMenuBgm(): void {
    const playTrack = () => {
      if (this.menuBgm || !this.cache.audio.exists(AUDIO_KEYS.BGM_MENU)) return;

      this.menuBgm = this.sound.add(AUDIO_KEYS.BGM_MENU, {
        loop: true,
        volume: this.volumeValue,
      });
      this.menuBgm.play();
    };

    if (this.sound.locked) {
      this.sound.once('unlocked', playTrack);
      return;
    }

    playTrack();
  }

  private stopMenuBgm(): void {
    if (!this.menuBgm) return;

    this.menuBgm.stop();
    this.menuBgm.destroy();
    this.menuBgm = null;
  }

  private startNewGame(): void {
    this.stopMenuBgm();
    gameManager.newGame();
    this.cameras.main.fadeOut(500, 0x1a, 0x1a, 0x2e);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.NEW_GAME_PROLOGUE);
    });
  }

  private continueGame(): void {
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

    this.stopMenuBgm();
    this.cameras.main.fadeOut(500, 0x1a, 0x1a, 0x2e);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      PauseMenuUI.startSceneFromSave(this, data.player.mapKey);
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
