/**
 * PhoneUI — Full-screen phone overlay for reading/responding to messages.
 *
 * DESIGN:
 * - Opens with P key (or phone icon tap on mobile)
 * - Shows a phone-like interface with conversation threads
 * - Messages appear as chat bubbles (NPC left, player right)
 * - Response choices appear at the bottom when available
 * - Pauses game time while open (intimate reading moment)
 *
 * VISUAL STYLE:
 * - Dark semi-transparent backdrop
 * - Phone "frame" in center (narrow, tall)
 * - Warm colors matching game palette
 * - Scrollable message history
 * - Subtle animations for new messages
 */

import Phaser from 'phaser';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import { gameManager } from '@/managers/GameManager';
import { EventBus } from '@/core/EventBus';
import { InputGuard } from '@/ui/InputGuard';
import { PhoneMessage } from '@/systems/PhoneSystem';

// ─── Layout constants ──────────────────────────────────────────
const PHONE_W = 180;
const PHONE_H = 260;
const PHONE_X = (GAME_CONFIG.WIDTH - PHONE_W) / 2;
const PHONE_Y = (GAME_CONFIG.HEIGHT - PHONE_H) / 2;
const MSG_AREA_X = PHONE_X + 8;
const THREAD_TAB_Y = PHONE_Y + 27;
const MSG_AREA_Y = PHONE_Y + 42;
const MSG_AREA_W = PHONE_W - 16;
const MSG_AREA_H = PHONE_H - 84;
const RESPONSE_Y = PHONE_Y + PHONE_H - 38;
const MAX_VISIBLE_MSGS = 6;

// ─── Colors ────────────────────────────────────────────────────
const CLR_BACKDROP = 0x000000;
const CLR_PHONE_BG = 0x1a1a2e;
const CLR_PHONE_BORDER = 0x445566;
const CLR_HEADER_BG = 0x0d1117;
const CLR_MSG_NPC = 0x2a3a4a;
const CLR_MSG_PLAYER = 0x3a5a3a;
const CLR_RESPONSE_BG = 0x334455;
const CLR_RESPONSE_HOVER = 0x445566;
const CLR_NO_MSG = '#667788';

const UI_DEPTH = DEPTH.UI + 50;

export class PhoneUI {
  private scene: Phaser.Scene;
  private isOpen: boolean = false;

  // Container for all phone elements
  private backdrop!: Phaser.GameObjects.Rectangle;
  private phoneFrame!: Phaser.GameObjects.Graphics;
  private headerText!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Text;
  private noMsgText!: Phaser.GameObjects.Text;

  // Message display
  private msgObjects: Phaser.GameObjects.GameObject[] = [];
  private responseObjects: Phaser.GameObjects.GameObject[] = [];
  private threadTabObjects: Phaser.GameObjects.GameObject[] = [];

  // Scroll state
  private scrollOffset: number = 0;
  private currentThreadId: string = 'rika'; // Default to Rika's thread

  // Notification dot on HUD
  private notifDot!: Phaser.GameObjects.Arc;
  private phoneIcon!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildHUDIcon();
    this.buildPhoneOverlay();
    this.hidePhone();

    // Listen for new messages to pulse the notification
    EventBus.on('phone:message-received', this.onNewMessage, this);
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

    // Mark thread as read
    this.selectInitialThread();
    gameManager.phone.markThreadRead(this.currentThreadId);
    this.updateNotifDot();

    // Show overlay
    this.backdrop.setVisible(true);
    this.phoneFrame.setVisible(true);
    this.headerText.setVisible(true);
    this.closeBtn.setVisible(true);

    // Render messages
    this.updateHeaderText();
    this.renderMessages();

    // Emit phone opened event
    EventBus.emit('phone:opened', {});

    // Freeze player
    EventBus.emit('event:player-locked', { locked: true });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    this.hidePhone();
    this.clearMessages();
    this.clearThreadTabs();

    // Emit phone closed event
    EventBus.emit('phone:closed', {});

    // Unfreeze player
    EventBus.emit('event:player-locked', { locked: false });
  }

  update(): void {
    // Update notification dot visibility
    this.updateNotifDot();
  }

  destroy(): void {
    EventBus.off('phone:message-received', this.onNewMessage);
    this.backdrop.destroy();
    this.phoneFrame.destroy();
    this.headerText.destroy();
    this.closeBtn.destroy();
    this.noMsgText.destroy();
    this.notifDot.destroy();
    this.phoneIcon.destroy();
    this.clearMessages();
  }

  // ============================================================
  // PRIVATE: BUILD UI
  // ============================================================

  private buildHUDIcon(): void {
    // Phone icon in top-right area (below clock)
    this.phoneIcon = this.scene.add.text(
      GAME_CONFIG.WIDTH - 26, 54,
      '\u260E', // ☎ phone symbol
      {
        fontSize: '11px',
        color: '#4c2a12',
        fontFamily: 'monospace',
        backgroundColor: '#ffcc55',
        padding: { x: 3, y: 1 },
      }
    );
    this.phoneIcon.setScrollFactor(0);
    this.phoneIcon.setDepth(DEPTH.UI + 12);
    this.phoneIcon.setInteractive({ useHandCursor: true });
    this.phoneIcon.on('pointerdown', () => {
      InputGuard.consume();
      this.toggle();
    });

    // Notification dot
    this.notifDot = this.scene.add.circle(
      GAME_CONFIG.WIDTH - 13, 54, 3, 0xf25a5a
    );
    this.notifDot.setScrollFactor(0);
    this.notifDot.setDepth(DEPTH.UI + 13);
    this.notifDot.setVisible(false);
  }

  private buildPhoneOverlay(): void {
    // Dark backdrop
    this.backdrop = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
      GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT,
      CLR_BACKDROP, 0.7
    );
    this.backdrop.setScrollFactor(0);
    this.backdrop.setDepth(UI_DEPTH);
    this.backdrop.setInteractive(); // Block clicks through
    this.backdrop.on('pointerdown', () => { InputGuard.consume(); });

    // Phone frame (drawn with graphics)
    this.phoneFrame = this.scene.add.graphics();
    this.phoneFrame.setScrollFactor(0);
    this.phoneFrame.setDepth(UI_DEPTH + 1);
    this.drawPhoneFrame();

    // Header
    this.headerText = this.scene.add.text(
      PHONE_X + 10, PHONE_Y + 6,
      '\u260E Rika',
      { fontSize: '8px', color: '#f2a65a', fontFamily: 'monospace', fontStyle: 'bold' }
    );
    this.headerText.setScrollFactor(0);
    this.headerText.setDepth(UI_DEPTH + 2);

    // Close button
    this.closeBtn = this.scene.add.text(
      PHONE_X + PHONE_W - 16, PHONE_Y + 6,
      'X',
      { fontSize: '8px', color: '#ff6666', fontFamily: 'monospace', fontStyle: 'bold' }
    );
    this.closeBtn.setScrollFactor(0);
    this.closeBtn.setDepth(UI_DEPTH + 2);
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => {
      InputGuard.consume();
      this.close();
    });

    // No messages text
    this.noMsgText = this.scene.add.text(
      GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2,
      'No messages yet...',
      { fontSize: '7px', color: CLR_NO_MSG, fontFamily: 'monospace' }
    );
    this.noMsgText.setOrigin(0.5);
    this.noMsgText.setScrollFactor(0);
    this.noMsgText.setDepth(UI_DEPTH + 2);
    this.noMsgText.setVisible(false);
  }

  private drawPhoneFrame(): void {
    const g = this.phoneFrame;
    g.clear();

    // Phone body
    g.fillStyle(CLR_PHONE_BG, 0.95);
    g.fillRoundedRect(PHONE_X, PHONE_Y, PHONE_W, PHONE_H, 6);
    g.lineStyle(1, CLR_PHONE_BORDER, 0.8);
    g.strokeRoundedRect(PHONE_X, PHONE_Y, PHONE_W, PHONE_H, 6);

    // Header bar
    g.fillStyle(CLR_HEADER_BG, 1);
    g.fillRoundedRect(PHONE_X + 2, PHONE_Y + 2, PHONE_W - 4, 22, { tl: 5, tr: 5, bl: 0, br: 0 });

    // Separator line below header
    g.lineStyle(1, CLR_PHONE_BORDER, 0.5);
    g.lineBetween(PHONE_X + 4, PHONE_Y + 24, PHONE_X + PHONE_W - 4, PHONE_Y + 24);
  }

  // ============================================================
  // PRIVATE: RENDER MESSAGES
  // ============================================================

  private renderMessages(): void {
    this.clearMessages();
    this.renderThreadTabs();

    const thread = gameManager.phone.getThread(this.currentThreadId);
    const messages = thread.messages;

    if (messages.length === 0) {
      this.noMsgText.setVisible(true);
      return;
    }
    this.noMsgText.setVisible(false);

    // Show last N messages (scrollable)
    const startIdx = Math.max(0, messages.length - MAX_VISIBLE_MSGS + this.scrollOffset);
    const endIdx = Math.min(messages.length, startIdx + MAX_VISIBLE_MSGS);
    const visibleMsgs = messages.slice(startIdx, endIdx);

    let yPos = MSG_AREA_Y + 4;

    for (const msg of visibleMsgs) {
      yPos = this.renderBubble(msg, yPos);
      yPos += 4; // gap between messages
    }

    // Show response options for the last unresponded NPC message
    const lastNpcMsg = this.findLastUnrespondedMessage(messages);
    if (lastNpcMsg && lastNpcMsg.responses && !lastNpcMsg.responded) {
      this.renderResponses(lastNpcMsg);
    }

    // Scroll hint if there are more messages
    if (messages.length > MAX_VISIBLE_MSGS) {
      const scrollHint = this.scene.add.text(
        PHONE_X + PHONE_W / 2, MSG_AREA_Y - 2,
        '\u25B2 scroll',
        { fontSize: '5px', color: '#556677', fontFamily: 'monospace' }
      );
      scrollHint.setOrigin(0.5);
      scrollHint.setScrollFactor(0);
      scrollHint.setDepth(UI_DEPTH + 3);
      this.msgObjects.push(scrollHint);
    }
  }

  private renderBubble(msg: PhoneMessage, yPos: number): number {
    const isPlayer = msg.sender === 'player';
    const bubbleColor = isPlayer ? CLR_MSG_PLAYER : CLR_MSG_NPC;
    const textColor = '#e0e0e0';
    const maxTextW = MSG_AREA_W - 20;

    // Message text
    const text = this.scene.add.text(0, 0, msg.text, {
      fontSize: '6px',
      color: textColor,
      fontFamily: 'monospace',
      wordWrap: { width: maxTextW },
    });
    text.setScrollFactor(0);
    text.setDepth(UI_DEPTH + 4);

    const bubbleW = Math.min(text.width + 10, MSG_AREA_W - 8);
    const bubbleH = text.height + 8;
    const bubbleX = isPlayer ? (MSG_AREA_X + MSG_AREA_W - bubbleW - 4) : (MSG_AREA_X + 4);

    // Check if bubble would overflow message area
    if (yPos + bubbleH > MSG_AREA_Y + MSG_AREA_H) {
      text.destroy();
      return yPos;
    }

    // Bubble background
    const bg = this.scene.add.graphics();
    bg.setScrollFactor(0);
    bg.setDepth(UI_DEPTH + 3);
    bg.fillStyle(bubbleColor, 0.9);
    bg.fillRoundedRect(bubbleX, yPos, bubbleW, bubbleH, 3);

    // Position text inside bubble
    text.setPosition(bubbleX + 5, yPos + 4);

    // Timestamp (tiny, below bubble)
    const timeStr = `${String(msg.timestamp.hour).padStart(2, '0')}:${String(msg.timestamp.minute).padStart(2, '0')}`;
    const timeText = this.scene.add.text(
      isPlayer ? bubbleX + bubbleW - 2 : bubbleX + 2,
      yPos + bubbleH + 1,
      timeStr,
      { fontSize: '4px', color: '#556677', fontFamily: 'monospace' }
    );
    timeText.setOrigin(isPlayer ? 1 : 0, 0);
    timeText.setScrollFactor(0);
    timeText.setDepth(UI_DEPTH + 3);

    this.msgObjects.push(bg, text, timeText);

    return yPos + bubbleH + 6;
  }

  private renderResponses(msg: PhoneMessage): void {
    if (!msg.responses) return;

    const responses = msg.responses;
    let yPos = RESPONSE_Y;

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      const btnW = PHONE_W - 20;
      const btnH = 14;
      const btnX = PHONE_X + 10;
      const btnY = yPos;

      // Response button background
      const btn = this.scene.add.rectangle(
        btnX + btnW / 2, btnY + btnH / 2,
        btnW, btnH,
        CLR_RESPONSE_BG, 0.9
      );
      btn.setScrollFactor(0);
      btn.setDepth(UI_DEPTH + 3);
      btn.setInteractive({ useHandCursor: true });

      // Response text
      const btnText = this.scene.add.text(
        btnX + 5, btnY + 3,
        resp.text.length > 30 ? resp.text.substring(0, 28) + '...' : resp.text,
        { fontSize: '5px', color: '#ccddee', fontFamily: 'monospace' }
      );
      btnText.setScrollFactor(0);
      btnText.setDepth(UI_DEPTH + 4);

      // Hover effects
      btn.on('pointerover', () => { btn.setFillStyle(CLR_RESPONSE_HOVER, 1); });
      btn.on('pointerout', () => { btn.setFillStyle(CLR_RESPONSE_BG, 0.9); });

      // Click handler
      const responseIdx = i;
      btn.on('pointerdown', () => {
        InputGuard.consume();
        this.selectResponse(msg, responseIdx);
      });

      this.responseObjects.push(btn, btnText);
      yPos += btnH + 3;
    }
  }

  // ============================================================
  // PRIVATE: INTERACTION
  // ============================================================

  private selectResponse(msg: PhoneMessage, index: number): void {
    gameManager.phone.respond(this.currentThreadId, msg.id, index);

    // Re-render to show the player's response
    this.renderMessages();
  }

  private findLastUnrespondedMessage(messages: PhoneMessage[]): PhoneMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.sender !== 'player' && msg.responses && !msg.responded) {
        return msg;
      }
    }
    return null;
  }

  // ============================================================
  // PRIVATE: HELPERS
  // ============================================================

  private hidePhone(): void {
    this.backdrop.setVisible(false);
    this.phoneFrame.setVisible(false);
    this.headerText.setVisible(false);
    this.closeBtn.setVisible(false);
    this.noMsgText.setVisible(false);
    this.clearMessages();
    this.clearThreadTabs();
  }

  private clearMessages(): void {
    for (const obj of this.msgObjects) obj.destroy();
    for (const obj of this.responseObjects) obj.destroy();
    this.msgObjects = [];
    this.responseObjects = [];
  }

  private renderThreadTabs(): void {
    this.clearThreadTabs();

    const threads = gameManager.phone.getAllThreads();
    if (threads.length <= 1) return;

    let x = PHONE_X + 8;
    for (const thread of threads.slice(0, 4)) {
      const label = this.getThreadName(thread.npcId);
      const isActive = thread.npcId === this.currentThreadId;
      const tabW = Math.max(26, label.length * 5 + 8);

      const bg = this.scene.add.rectangle(
        x + tabW / 2,
        THREAD_TAB_Y + 5,
        tabW,
        10,
        isActive ? 0x5d6b7a : 0x263340,
        0.95,
      );
      bg.setScrollFactor(0);
      bg.setDepth(UI_DEPTH + 3);
      bg.setInteractive({ useHandCursor: true });

      const text = this.scene.add.text(x + 4, THREAD_TAB_Y + 2, label, {
        fontSize: '5px',
        color: thread.unreadCount > 0 ? '#ffd36a' : '#ccddee',
        fontFamily: 'monospace',
      });
      text.setScrollFactor(0);
      text.setDepth(UI_DEPTH + 4);

      bg.on('pointerdown', () => {
        InputGuard.consume();
        this.currentThreadId = thread.npcId;
        gameManager.phone.markThreadRead(this.currentThreadId);
        this.updateHeaderText();
        this.updateNotifDot();
        this.renderMessages();
      });

      this.threadTabObjects.push(bg, text);
      x += tabW + 4;
    }
  }

  private clearThreadTabs(): void {
    for (const obj of this.threadTabObjects) obj.destroy();
    this.threadTabObjects = [];
  }

  private selectInitialThread(): void {
    const unreadThread = gameManager.phone.getAllThreads().find(thread => thread.unreadCount > 0);
    if (unreadThread) {
      this.currentThreadId = unreadThread.npcId;
    }
  }

  private updateHeaderText(): void {
    this.headerText.setText(`\u260E ${this.getThreadName(this.currentThreadId)}`);
  }

  private getThreadName(npcId: string): string {
    switch (npcId) {
      case 'rika': return 'Rika';
      case 'fisher': return 'Pak Jaya';
      case 'elder': return 'Bu Sari';
      case 'farmer': return 'Pak Wira';
      default: return npcId;
    }
  }

  private updateNotifDot(): void {
    this.notifDot.setVisible(gameManager.phone.hasUnread);
  }

  private onNewMessage = (): void => {
    // Pulse the notification dot
    this.notifDot.setVisible(true);
    if (!this.isOpen) {
      this.scene.tweens.add({
        targets: this.notifDot,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    } else {
      // If phone is open, refresh messages
      gameManager.phone.markThreadRead(this.currentThreadId);
      this.renderMessages();
    }
  };

  /** Set visibility of the HUD icon (hide during dialogue etc.) */
  setVisible(visible: boolean): void {
    this.phoneIcon.setVisible(visible);
    this.notifDot.setVisible(visible && gameManager.phone.hasUnread);
  }
}
