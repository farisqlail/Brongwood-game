/**
 * PauseMenuUI — Full-screen pause menu with Resume, Save, Load, Settings, Quit.
 *
 * DESIGN:
 * - Opens with ESC key
 * - Dark backdrop with centered menu panel
 * - Buttons stacked vertically
 * - Save/Load shows 3 slot sub-menu
 * - Settings shows volume/speed controls
 * - Quit returns to main menu
 * - Pauses game time while open
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG, SCENE_KEYS } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { InputGuard } from '@/ui/InputGuard';
import { proceduralAudio } from '@/audio/ProceduralAudio';

// ─── Layout ────────────────────────────────────────────────────
const MENU_W = 140;
const MENU_H = 200;
const MENU_X = (GAME_CONFIG.WIDTH - MENU_W) / 2;
const MENU_Y = (GAME_CONFIG.HEIGHT - MENU_H) / 2;
const BTN_W = 110;
const BTN_H = 18;
const BTN_GAP = 6;
const BTN_START_Y = MENU_Y + 40;

// ─── Colors ────────────────────────────────────────────────────
const CLR_BACKDROP = 0x000000;
const CLR_PANEL_BG = 0x1a1a2e;
const CLR_PANEL_BORDER = 0x445566;
const CLR_BTN_BG = 0x2a3a4a;
const CLR_BTN_HOVER = 0x3a5a6a;
const CLR_BTN_TEXT = '#e0e0e0';
const CLR_TITLE = '#f2a65a';
const CLR_SLOT_EMPTY = '#667788';
const CLR_SLOT_FILLED = '#aaddaa';
const CLR_DANGER = '#ff6666';

const UI_DEPTH = DEPTH.UI + 100; // Above everything

type MenuState = 'main' | 'save' | 'load' | 'settings';

export class PauseMenuUI {
  private scene: Phaser.Scene;
  private isOpen: boolean = false;
  private state: MenuState = 'main';

  // Containers
  private backdrop!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;

  // Dynamic elements (rebuilt per state)
  private elements: Phaser.GameObjects.GameObject[] = [];
  private readonly onOpenPauseMenu = () => {
    if (!this.scene.scene.isActive()) return;
    this.open();
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildBase();
    this.hide();
    EventBus.on('ui:open-pause-menu', this.onOpenPauseMenu);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  get opened(): boolean { return this.isOpen; }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.state = 'main';

    this.backdrop.setVisible(true);
    this.panel.setVisible(true);
    this.titleText.setVisible(true);

    this.renderState();

    // Pause gameplay
    gameManager.pauseGameplay();
    EventBus.emit('event:player-locked', { locked: true });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.hide();
    this.clearElements();

    // Resume gameplay
    gameManager.startGameplay();
    EventBus.emit('event:player-locked', { locked: false });
  }

  destroy(): void {
    EventBus.off('ui:open-pause-menu', this.onOpenPauseMenu);
    this.backdrop.destroy();
    this.panel.destroy();
    this.titleText.destroy();
    this.clearElements();
  }

  // ============================================================
  // PRIVATE: BUILD BASE
  // ============================================================

  private buildBase(): void {
    // Dark backdrop
    this.backdrop = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT,
      CLR_BACKDROP, 0.75
    );
    this.backdrop.setScrollFactor(0);
    this.backdrop.setDepth(UI_DEPTH);
    this.backdrop.setInteractive();
    this.backdrop.on('pointerdown', () => { InputGuard.consume(); });

    // Panel
    this.panel = this.scene.add.graphics();
    this.panel.setScrollFactor(0);
    this.panel.setDepth(UI_DEPTH + 1);
    this.drawPanel();

    // Title
    this.titleText = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, MENU_Y + 14,
      'PAUSED',
      { fontSize: '10px', color: CLR_TITLE, fontFamily: 'monospace', fontStyle: 'bold' }
    );
    this.titleText.setOrigin(0.5);
    this.titleText.setScrollFactor(0);
    this.titleText.setDepth(UI_DEPTH + 2);
  }

  private drawPanel(): void {
    const g = this.panel;
    g.clear();
    g.fillStyle(CLR_PANEL_BG, 0.95);
    g.fillRoundedRect(MENU_X, MENU_Y, MENU_W, MENU_H, 6);
    g.lineStyle(1, CLR_PANEL_BORDER, 0.8);
    g.strokeRoundedRect(MENU_X, MENU_Y, MENU_W, MENU_H, 6);
  }

  private hide(): void {
    this.backdrop.setVisible(false);
    this.panel.setVisible(false);
    this.titleText.setVisible(false);
  }

  // ============================================================
  // PRIVATE: RENDER STATES
  // ============================================================

  private renderState(): void {
    this.clearElements();

    switch (this.state) {
      case 'main': this.renderMainMenu(); break;
      case 'save': this.renderSaveSlots('save'); break;
      case 'load': this.renderSaveSlots('load'); break;
      case 'settings': this.renderSettings(); break;
    }
  }

  private renderMainMenu(): void {
    this.titleText.setText('PAUSED');

    const buttons = [
      { label: 'Resume', action: () => this.close() },
      { label: 'Save Game', action: () => { this.state = 'save'; this.renderState(); } },
      { label: 'Load Game', action: () => { this.state = 'load'; this.renderState(); } },
      { label: 'Settings', action: () => { this.state = 'settings'; this.renderState(); } },
      { label: 'Quit to Menu', action: () => this.quitToMenu(), color: CLR_DANGER },
    ];

    buttons.forEach((btn, i) => {
      this.createButton(
        GAME_CONFIG.WIDTH / 2,
        BTN_START_Y + i * (BTN_H + BTN_GAP),
        btn.label,
        btn.action,
        btn.color
      );
    });
  }

  private renderSaveSlots(mode: 'save' | 'load'): void {
    this.titleText.setText(mode === 'save' ? 'SAVE GAME' : 'LOAD GAME');

    const DELETE_BTN_W = 16;
    const SLOT_BTN_W = BTN_W - DELETE_BTN_W - 4;
    const slotBtnX = GAME_CONFIG.WIDTH / 2 - (DELETE_BTN_W + 4) / 2;
    const delBtnX = slotBtnX + SLOT_BTN_W / 2 + 4 + DELETE_BTN_W / 2;

    // 3 save slots
    for (let slot = 1; slot <= 3; slot++) {
      const info = gameManager.save.getSlotInfo(slot);
      const hasData = info !== null;
      const y = BTN_START_Y + (slot - 1) * (BTN_H + BTN_GAP);

      let label: string;
      let labelColor: string;

      if (hasData) {
        const playMins = Math.floor(info.playTime / 60);
        label = `Slot ${slot} - Day ${info.day} (${playMins}m)`;
        labelColor = CLR_SLOT_FILLED;
      } else {
        label = `Slot ${slot} - Empty`;
        labelColor = CLR_SLOT_EMPTY;
      }

      const slotIdx = slot;
      const action = () => {
        if (mode === 'save') {
          this.saveToSlot(slotIdx);
        } else {
          if (hasData) this.loadFromSlot(slotIdx);
        }
      };

      // Main slot button (slightly narrower to make room for delete btn)
      const btn = this.scene.add.rectangle(slotBtnX, y, SLOT_BTN_W, BTN_H, CLR_BTN_BG, 0.9);
      btn.setScrollFactor(0);
      btn.setDepth(UI_DEPTH + 2);
      btn.setInteractive({ useHandCursor: true });

      const txt = this.scene.add.text(slotBtnX, y, label, {
        fontSize: '7px',
        color: labelColor,
        fontFamily: 'monospace',
      });
      txt.setOrigin(0.5);
      txt.setScrollFactor(0);
      txt.setDepth(UI_DEPTH + 3);

      btn.on('pointerover', () => { btn.setFillStyle(CLR_BTN_HOVER, 1); });
      btn.on('pointerout', () => { btn.setFillStyle(CLR_BTN_BG, 0.9); });
      btn.on('pointerdown', () => { InputGuard.consume(); proceduralAudio.playClick(); action(); });

      this.elements.push(btn, txt);

      // Delete button — only shown for filled slots
      if (hasData) {
        const delBtn = this.scene.add.rectangle(delBtnX, y, DELETE_BTN_W, BTN_H, 0x5a2a2a, 0.9);
        delBtn.setScrollFactor(0);
        delBtn.setDepth(UI_DEPTH + 2);
        delBtn.setInteractive({ useHandCursor: true });

        const delTxt = this.scene.add.text(delBtnX, y, 'X', {
          fontSize: '7px', color: CLR_DANGER, fontFamily: 'monospace', fontStyle: 'bold',
        });
        delTxt.setOrigin(0.5);
        delTxt.setScrollFactor(0);
        delTxt.setDepth(UI_DEPTH + 3);

        delBtn.on('pointerover', () => { delBtn.setFillStyle(0x8a2a2a, 1); });
        delBtn.on('pointerout', () => { delBtn.setFillStyle(0x5a2a2a, 0.9); });
        delBtn.on('pointerdown', () => {
          InputGuard.consume();
          proceduralAudio.playClick();
          gameManager.save.deleteSave(slotIdx);
          this.showToast(`Slot ${slotIdx} deleted`);
          this.renderState();
        });

        this.elements.push(delBtn, delTxt);
      }
    }

    // Back button
    this.createButton(
      GAME_CONFIG.WIDTH / 2,
      BTN_START_Y + 3 * (BTN_H + BTN_GAP) + 10,
      'Back',
      () => { this.state = 'main'; this.renderState(); }
    );
  }

  private renderSettings(): void {
    this.titleText.setText('SETTINGS');

    let yPos = BTN_START_Y;

    // Game speed
    const speedLabel = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, yPos,
      `Game Speed: ${gameManager.time.speedMultiplier}x`,
      { fontSize: '7px', color: CLR_BTN_TEXT, fontFamily: 'monospace' }
    );
    speedLabel.setOrigin(0.5);
    speedLabel.setScrollFactor(0);
    speedLabel.setDepth(UI_DEPTH + 3);
    this.elements.push(speedLabel);

    yPos += 20;

    // Speed buttons
    const speeds = [1, 5, 10, 20];
    const speedBtnW = 24;
    const totalSpeedW = speeds.length * speedBtnW + (speeds.length - 1) * 4;
    let sx = GAME_CONFIG.WIDTH / 2 - totalSpeedW / 2;

    for (const spd of speeds) {
      const isActive = gameManager.time.speedMultiplier === spd;
      const btn = this.scene.add.rectangle(
        sx + speedBtnW / 2, yPos,
        speedBtnW, 14,
        isActive ? 0x4488aa : CLR_BTN_BG, 1
      );
      btn.setScrollFactor(0);
      btn.setDepth(UI_DEPTH + 2);
      btn.setInteractive({ useHandCursor: true });

      const txt = this.scene.add.text(sx + speedBtnW / 2, yPos, `${spd}x`, {
        fontSize: '6px', color: isActive ? '#ffffff' : CLR_BTN_TEXT, fontFamily: 'monospace',
      });
      txt.setOrigin(0.5);
      txt.setScrollFactor(0);
      txt.setDepth(UI_DEPTH + 3);

      btn.on('pointerdown', () => {
        InputGuard.consume();
        proceduralAudio.playClick();
        gameManager.time.setSpeed(spd);
        this.renderState();
      });
      btn.on('pointerover', () => { if (!isActive) btn.setFillStyle(CLR_BTN_HOVER, 1); });
      btn.on('pointerout', () => { if (!isActive) btn.setFillStyle(CLR_BTN_BG, 1); });

      this.elements.push(btn, txt);
      sx += speedBtnW + 4;
    }

    yPos += 30;

    // Volume (procedural audio)
    const volLabel = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, yPos,
      'Audio: ' + (proceduralAudio.initialized ? 'ON' : 'OFF'),
      { fontSize: '7px', color: CLR_BTN_TEXT, fontFamily: 'monospace' }
    );
    volLabel.setOrigin(0.5);
    volLabel.setScrollFactor(0);
    volLabel.setDepth(UI_DEPTH + 3);
    this.elements.push(volLabel);

    yPos += 20;

    // Audio toggle
    this.createButton(
      GAME_CONFIG.WIDTH / 2, yPos,
      proceduralAudio.initialized ? 'Mute Audio' : 'Enable Audio',
      () => {
        if (proceduralAudio.initialized) {
          proceduralAudio.stopAll();
        } else {
          proceduralAudio.init();
          proceduralAudio.resume();
        }
        this.renderState();
      }
    );

    yPos += BTN_H + BTN_GAP + 8;

    // BGM Volume
    const currentBgmVol = parseFloat(localStorage.getItem('brongwood_bgm_volume') ?? '0.4');
    const bgmPct = Math.round((isNaN(currentBgmVol) ? 0.4 : currentBgmVol) * 100);

    const bgmLabel = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, yPos,
      `BGM Volume: ${bgmPct}%`,
      { fontSize: '7px', color: CLR_BTN_TEXT, fontFamily: 'monospace' }
    );
    bgmLabel.setOrigin(0.5);
    bgmLabel.setScrollFactor(0);
    bgmLabel.setDepth(UI_DEPTH + 3);
    this.elements.push(bgmLabel);

    yPos += 12;

    const bgmSteps = [0, 0.25, 0.5, 0.75, 1.0];
    const bgmBtnW = 20;
    const totalBgmW = bgmSteps.length * bgmBtnW + (bgmSteps.length - 1) * 3;
    let bx = GAME_CONFIG.WIDTH / 2 - totalBgmW / 2;

    for (const vol of bgmSteps) {
      const isActive = Math.abs(currentBgmVol - vol) < 0.01;
      const bgmBtn = this.scene.add.rectangle(bx + bgmBtnW / 2, yPos, bgmBtnW, 13, isActive ? 0x4488aa : CLR_BTN_BG, 1);
      bgmBtn.setScrollFactor(0);
      bgmBtn.setDepth(UI_DEPTH + 2);
      bgmBtn.setInteractive({ useHandCursor: true });

      const bgmTxt = this.scene.add.text(bx + bgmBtnW / 2, yPos, `${Math.round(vol * 100)}`, {
        fontSize: '6px', color: isActive ? '#ffffff' : CLR_BTN_TEXT, fontFamily: 'monospace',
      });
      bgmTxt.setOrigin(0.5);
      bgmTxt.setScrollFactor(0);
      bgmTxt.setDepth(UI_DEPTH + 3);

      bgmBtn.on('pointerdown', () => {
        InputGuard.consume();
        proceduralAudio.playClick();
        localStorage.setItem('brongwood_bgm_volume', String(vol));
        gameManager.sceneSystems.audio?.setBGMVolume(vol);
        this.renderState();
      });
      bgmBtn.on('pointerover', () => { if (!isActive) bgmBtn.setFillStyle(CLR_BTN_HOVER, 1); });
      bgmBtn.on('pointerout', () => { if (!isActive) bgmBtn.setFillStyle(CLR_BTN_BG, 1); });

      this.elements.push(bgmBtn, bgmTxt);
      bx += bgmBtnW + 3;
    }

    yPos += 22;

    // Back button
    this.createButton(
      GAME_CONFIG.WIDTH / 2, yPos,
      'Back',
      () => { this.state = 'main'; this.renderState(); }
    );
  }

  // ============================================================
  // PRIVATE: ACTIONS
  // ============================================================

  private saveToSlot(slot: number): void {
    const scene = this.scene as Phaser.Scene & { player?: { x: number; y: number; sprite: { x: number; y: number } }; mapKey?: string };
    const playerX = scene.player?.sprite?.x ?? scene.player?.x ?? 0;
    const playerY = scene.player?.sprite?.y ?? scene.player?.y ?? 0;

    // Simpan scene key yang sedang aktif.
    // Jika WorldScene, gunakan mapKey internal (nama Tiled map).
    // Jika scene aktivitas (Fishing, Garden, dll.), gunakan scene.key langsung.
    const sceneKey = this.scene.scene.key;
    const mapKey = sceneKey === SCENE_KEYS.WORLD
      ? (scene.mapKey ?? 'downtown')
      : sceneKey;

    const success = gameManager.saveGame(slot, {
      x: playerX,
      y: playerY,
      mapKey,
      direction: 'down',
    });

    if (success) {
      this.showToast('Game saved!');
    } else {
      this.showToast('Save failed.');
    }

    // Refresh slot display
    this.renderState();
  }

  private loadFromSlot(slot: number): void {
    const data = gameManager.loadGame(slot);
    if (!data) {
      this.showToast('Load failed.');
      return;
    }

    this.showToast('Loading...');
    this.isOpen = false;
    this.hide();
    this.clearElements();

    this.scene.time.delayedCall(500, () => {
      PauseMenuUI.startSceneFromSave(this.scene, data.player.mapKey);
    });
  }

  /**
   * Tentukan scene mana yang harus distart berdasarkan mapKey tersimpan.
   * mapKey bisa berupa:
   *  - Tiled map key ('downtown') → start WorldScene dengan map itu
   *  - Scene key langsung ('FishingScene', 'GardenScene', dll.) → start scene itu
   */
  static startSceneFromSave(scene: Phaser.Scene, mapKey: string): void {
    const STANDALONE_SCENES = [
      'FishingScene', 'GardenScene', 'BenchScene', 'CafeScene', 'HomesteadScene',
      'PlayerHouseScene', 'HouseInteriorScene',
    ];

    if (STANDALONE_SCENES.includes(mapKey)) {
      scene.scene.start(mapKey);
    } else {
      scene.scene.start(SCENE_KEYS.WORLD, { map: mapKey });
    }
  }

  private quitToMenu(): void {
    this.isOpen = false;
    this.hide();
    this.clearElements();

    this.scene.cameras.main.fadeOut(500, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.scene.stop();
      this.scene.scene.start(SCENE_KEYS.MAIN_MENU);
    });
  }

  private showToast(text: string): void {
    const toast = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, MENU_Y + MENU_H - 16,
      text,
      { fontSize: '7px', color: '#f2a65a', fontFamily: 'monospace' }
    );
    toast.setOrigin(0.5);
    toast.setScrollFactor(0);
    toast.setDepth(UI_DEPTH + 10);
    this.elements.push(toast);

    this.scene.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => toast.destroy(),
    });
  }

  // ============================================================
  // PRIVATE: UI HELPERS
  // ============================================================

  private createButton(
    x: number, y: number,
    label: string,
    action: () => void,
    textColor?: string,
    labelColorOverride?: string
  ): void {
    const btn = this.scene.add.rectangle(x, y, BTN_W, BTN_H, CLR_BTN_BG, 0.9);
    btn.setScrollFactor(0);
    btn.setDepth(UI_DEPTH + 2);
    btn.setInteractive({ useHandCursor: true });

    const txt = this.scene.add.text(x, y, label, {
      fontSize: '7px',
      color: labelColorOverride ?? textColor ?? CLR_BTN_TEXT,
      fontFamily: 'monospace',
    });
    txt.setOrigin(0.5);
    txt.setScrollFactor(0);
    txt.setDepth(UI_DEPTH + 3);

    btn.on('pointerover', () => { btn.setFillStyle(CLR_BTN_HOVER, 1); });
    btn.on('pointerout', () => { btn.setFillStyle(CLR_BTN_BG, 0.9); });
    btn.on('pointerdown', () => {
      InputGuard.consume();
      proceduralAudio.playClick();
      action();
    });

    this.elements.push(btn, txt);
  }

  private clearElements(): void {
    for (const el of this.elements) el.destroy();
    this.elements = [];
  }
}
