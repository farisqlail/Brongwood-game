/**
 * DialogueSystem - Cinematic conversation engine.
 * 
 * WHY THIS DESIGN:
 * Dialogue in Brongwood isn't just text boxes — it's an emotional experience.
 * The system must support:
 * - Typewriter effect (characters appear one by one, creating anticipation)
 * - Emotional pacing (pauses, speed changes for dramatic moments)
 * - Branching choices (player agency in relationships)
 * - Camera integration (zoom in for intimate moments)
 * - Relationship effects (choices matter)
 * - Conditional content (different dialogue based on relationship stage)
 * 
 * ARCHITECTURE:
 * The DialogueSystem is a STATE MACHINE that processes dialogue nodes:
 * 1. Start dialogue → lock player, show UI
 * 2. Process nodes sequentially (text → text → choice → text → end)
 * 3. Handle player input (advance text, select choice)
 * 4. Execute actions (relationship changes, camera moves)
 * 5. End dialogue → unlock player, hide UI
 * 
 * RENDERING:
 * The system creates Phaser game objects for the dialogue UI:
 * - Background box (semi-transparent, bottom of screen)
 * - Speaker name label
 * - Text area with typewriter effect
 * - Choice buttons (when applicable)
 * - Portrait (when applicable)
 * 
 * All UI is created at DEPTH.UI and uses setScrollFactor(0) (camera-fixed).
 */

import Phaser from 'phaser';
import { EventBus } from '@/core/EventBus';
import { DEPTH, GAME_CONFIG } from '@config/game.config';
import {
  DialogueDefinition,
  DialogueNode,
  DialogueTextNode,
  DialogueChoiceNode,
  DialogueActionNode,
  DialogueBranchNode,
  DialogueAction,
  DialogueCondition,
  DialogueChoice,
} from './DialogueTypes';
import { gameManager } from '@/managers/GameManager';

// ============================================================
// CONSTANTS
// ============================================================

const BOX_HEIGHT = 56;
const BOX_MARGIN = 6;
const BOX_PADDING = 8;
const TEXT_SIZE = '9px';
const NAME_SIZE = '8px';
const CHOICE_SIZE = '8px';
const TYPE_SPEED_MS = 30; // ms per character (base)
const CHOICE_HIGHLIGHT_COLOR = '#f2a65a';
const TEXT_COLOR = '#ffffff';
const NAME_COLOR = '#f2a65a';
const BOX_COLOR = 0x1a1a2e;
const BOX_ALPHA = 0.92;

// ============================================================
// SYSTEM
// ============================================================

export class DialogueSystem {
  private scene: Phaser.Scene;

  // State
  private active: boolean = false;
  private currentDialogue: DialogueDefinition | null = null;
  private currentNodeId: string | null = null;
  private typing: boolean = false;
  private fullText: string = '';
  private displayedChars: number = 0;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private waitingForInput: boolean = false;
  private selectedChoice: number = 0;

  // UI Elements
  private container!: Phaser.GameObjects.Container;
  private box!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private continueIndicator!: Phaser.GameObjects.Text;

  // Input (event-based, no key capture)

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
    this.setupInput();
    this.hide();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /** Start a dialogue sequence */
  start(dialogue: DialogueDefinition): void {
    if (this.active) return;

    this.active = true;
    this.currentDialogue = dialogue;
    this.currentNodeId = dialogue.startNode;

    // Lock player movement
    EventBus.emit('event:player-locked', { locked: true });
    EventBus.emit('dialogue:started', { dialogueId: dialogue.id });

    // Pause time during dialogue
    gameManager.time.pause();

    // Show UI and process first node
    this.show();
    this.processCurrentNode();
  }

  /** Check if dialogue is currently active */
  get isActive(): boolean {
    return this.active;
  }

  /** Clean up */
  destroy(): void {
    this.container?.destroy();
    this.typeTimer?.destroy();

    // Remove keyboard event listeners
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown-ENTER', this.handleConfirm, this);
      this.scene.input.keyboard.off('keydown-SPACE', this.handleConfirm, this);
      this.scene.input.keyboard.off('keydown-Z', this.handleConfirm, this);
      this.scene.input.keyboard.off('keydown-UP', this.handleChoiceUp, this);
      this.scene.input.keyboard.off('keydown-DOWN', this.handleChoiceDown, this);
    }
  }

  // ============================================================
  // NODE PROCESSING
  // ============================================================

  private processCurrentNode(): void {
    if (!this.currentDialogue || !this.currentNodeId) {
      this.end();
      return;
    }

    const node = this.currentDialogue.nodes[this.currentNodeId];
    if (!node) {
      console.warn(`[Dialogue] Node "${this.currentNodeId}" not found`);
      this.end();
      return;
    }

    switch (node.type) {
      case 'text':
        this.processTextNode(node);
        break;
      case 'choice':
        this.processChoiceNode(node);
        break;
      case 'action':
        this.processActionNode(node);
        break;
      case 'branch':
        this.processBranchNode(node);
        break;
    }
  }

  private processTextNode(node: DialogueTextNode): void {
    // Update speaker name
    this.nameText.setText(node.speakerName ?? node.speaker ?? '');
    this.nameText.setVisible(!!node.speaker && node.speaker !== 'narrator');

    // Clear choices
    this.clearChoices();

    // Start typewriter effect
    this.fullText = node.text;
    this.displayedChars = 0;
    this.dialogueText.setText('');
    this.typing = true;
    this.waitingForInput = false;
    this.continueIndicator.setVisible(false);

    const speed = TYPE_SPEED_MS / (node.typeSpeed ?? 1);

    this.typeTimer = this.scene.time.addEvent({
      delay: speed,
      repeat: this.fullText.length - 1,
      callback: () => {
        this.displayedChars++;
        this.dialogueText.setText(this.fullText.substring(0, this.displayedChars));

        // Finished typing
        if (this.displayedChars >= this.fullText.length) {
          this.typing = false;

          if (node.autoAdvanceDelay && node.autoAdvanceDelay > 0) {
            // Auto-advance after delay
            this.scene.time.delayedCall(node.autoAdvanceDelay, () => {
              this.advanceToNode(node.next ?? null);
            });
          } else {
            // Wait for player input
            this.waitingForInput = true;
            this.continueIndicator.setVisible(true);
          }
        }
      },
    });

    // Store next node for when player advances
    this.currentNodeId = node.next ?? null;
  }

  private processChoiceNode(node: DialogueChoiceNode): void {
    // Show prompt if present
    if (node.prompt) {
      this.nameText.setText('');
      this.dialogueText.setText(node.prompt);
    }

    // Filter choices by conditions
    const availableChoices = node.choices.filter(choice => {
      if (!choice.condition) return true;
      return gameManager.relationships.meetsCondition(
        choice.condition.npcId ?? '',
        choice.condition
      );
    });

    // Display choices
    this.clearChoices();
    this.selectedChoice = 0;
    this.typing = false;
    this.waitingForInput = false;
    this.continueIndicator.setVisible(false);

    const startY = BOX_PADDING + 16;
    availableChoices.forEach((choice, index) => {
      const choiceText = this.scene.add.text(
        BOX_PADDING + 8,
        startY + index * 14,
        `${index === 0 ? '>' : ' '} ${choice.text}`,
        {
          fontSize: CHOICE_SIZE,
          color: index === 0 ? CHOICE_HIGHLIGHT_COLOR : TEXT_COLOR,
          fontFamily: 'monospace',
        }
      );
      this.container.add(choiceText);
      this.choiceTexts.push(choiceText);
    });

    // Store choices for selection handling
    (this as unknown as { _availableChoices: DialogueChoice[] })._availableChoices = availableChoices;
  }

  private processActionNode(node: DialogueActionNode): void {
    // Execute all actions
    for (const action of node.actions) {
      this.executeAction(action);
    }

    // Immediately advance to next node
    this.currentNodeId = node.next ?? null;
    this.processCurrentNode();
  }

  private processBranchNode(node: DialogueBranchNode): void {
    // Check conditions in order
    for (const branch of node.branches) {
      if (this.checkCondition(branch.condition)) {
        this.currentNodeId = branch.next;
        this.processCurrentNode();
        return;
      }
    }

    // No condition matched — use fallback
    this.currentNodeId = node.fallback;
    this.processCurrentNode();
  }

  // ============================================================
  // INPUT HANDLING
  // ============================================================

  private setupInput(): void {
    if (!this.scene.input.keyboard) return;

    // Use event-based input instead of addKey() to avoid capturing
    // arrow keys that the MovementSystem's createCursorKeys() also uses.
    // addKey() can interfere with cursor keys by resetting key state.
    this.scene.input.keyboard.on('keydown-ENTER', this.handleConfirm, this);
    this.scene.input.keyboard.on('keydown-SPACE', this.handleConfirm, this);
    this.scene.input.keyboard.on('keydown-Z', this.handleConfirm, this);
    this.scene.input.keyboard.on('keydown-UP', this.handleChoiceUp, this);
    this.scene.input.keyboard.on('keydown-DOWN', this.handleChoiceDown, this);
  }

  private handleConfirm = (): void => {
    if (!this.active) return;

    if (this.typing) {
      this.skipTypewriter();
    } else if (this.waitingForInput) {
      this.advanceToNode(this.currentNodeId);
    } else if (this.choiceTexts.length > 0) {
      this.confirmChoice();
    }
  };

  private handleChoiceUp = (): void => {
    if (!this.active) return;
    if (this.choiceTexts.length > 0) this.moveChoice(-1);
  };

  private handleChoiceDown = (): void => {
    if (!this.active) return;
    if (this.choiceTexts.length > 0) this.moveChoice(1);
  };

  private skipTypewriter(): void {
    this.typeTimer?.destroy();
    this.displayedChars = this.fullText.length;
    this.dialogueText.setText(this.fullText);
    this.typing = false;
    this.waitingForInput = true;
    this.continueIndicator.setVisible(true);
  }

  private moveChoice(direction: number): void {
    const choices = (this as unknown as { _availableChoices: DialogueChoice[] })._availableChoices;
    if (!choices) return;

    // Update selection
    this.selectedChoice = Math.max(0, Math.min(choices.length - 1, this.selectedChoice + direction));

    // Update visual
    this.choiceTexts.forEach((text, i) => {
      const prefix = i === this.selectedChoice ? '>' : ' ';
      text.setText(`${prefix} ${choices[i].text}`);
      text.setColor(i === this.selectedChoice ? CHOICE_HIGHLIGHT_COLOR : TEXT_COLOR);
    });
  }

  private confirmChoice(): void {
    const choices = (this as unknown as { _availableChoices: DialogueChoice[] })._availableChoices;
    if (!choices || choices.length === 0) return;

    const selected = choices[this.selectedChoice];

    // Execute choice effects
    if (selected.effects) {
      for (const effect of selected.effects) {
        this.executeAction(effect);
      }
    }

    // Emit choice event
    EventBus.emit('dialogue:choice-made', {
      dialogueId: this.currentDialogue?.id ?? '',
      choiceIndex: this.selectedChoice,
      choiceId: selected.choiceId,
    });

    // Advance to choice's target node
    this.clearChoices();
    this.advanceToNode(selected.next);
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  private advanceToNode(nodeId: string | null | undefined): void {
    if (!nodeId) {
      this.end();
      return;
    }

    this.currentNodeId = nodeId;
    this.processCurrentNode();
  }

  private end(): void {
    this.active = false;
    this.currentDialogue = null;
    this.currentNodeId = null;
    this.hide();

    // Unlock player
    EventBus.emit('event:player-locked', { locked: false });
    EventBus.emit('dialogue:ended', { dialogueId: '' });

    // Resume time
    gameManager.time.resume();
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  private executeAction(action: DialogueAction): void {
    const time = gameManager.time;

    switch (action.type) {
      case 'add_affection':
        gameManager.relationships.addAffection(action.npcId, action.amount);
        break;
      case 'add_trust':
        gameManager.relationships.addTrust(action.npcId, action.amount);
        break;
      case 'set_flag':
        gameManager.relationships.setFlag(action.npcId, action.flag, action.value);
        break;
      case 'create_memory':
        gameManager.relationships.createMemory(action.npcId, {
          id: action.memoryId,
          day: time.day,
          timePeriod: time.period,
          description: action.description,
          tags: action.tags,
        });
        break;
      case 'camera_zoom':
        this.scene.cameras.main.zoomTo(action.zoom, action.duration);
        break;
      case 'camera_reset':
        this.scene.cameras.main.zoomTo(1, action.duration);
        break;
      case 'play_sfx':
        // Will work once audio assets exist
        break;
      case 'screen_shake':
        this.scene.cameras.main.shake(action.duration, action.intensity / 1000);
        break;
      default:
        break;
    }
  }

  // ============================================================
  // CONDITIONS
  // ============================================================

  private checkCondition(condition: DialogueCondition): boolean {
    if (condition.relationship) {
      const { npcId, ...relCondition } = condition.relationship;
      if (!gameManager.relationships.meetsCondition(npcId, relCondition)) return false;
    }

    if (condition.timePeriod) {
      if (!condition.timePeriod.includes(gameManager.time.period)) return false;
    }

    return true;
  }

  // ============================================================
  // UI
  // ============================================================

  private createUI(): void {
    const boxY = GAME_CONFIG.HEIGHT - BOX_HEIGHT - BOX_MARGIN;

    this.container = this.scene.add.container(0, boxY);
    this.container.setScrollFactor(0);
    this.container.setDepth(DEPTH.UI + 10);

    // Background box
    this.box = this.scene.add.rectangle(
      GAME_CONFIG.WIDTH / 2,
      BOX_HEIGHT / 2,
      GAME_CONFIG.WIDTH - BOX_MARGIN * 2,
      BOX_HEIGHT,
      BOX_COLOR,
      BOX_ALPHA
    );
    this.box.setStrokeStyle(1, 0xf2a65a, 0.5);
    this.container.add(this.box);

    // Speaker name
    this.nameText = this.scene.add.text(BOX_PADDING + BOX_MARGIN, 4, '', {
      fontSize: NAME_SIZE,
      color: NAME_COLOR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.container.add(this.nameText);

    // Dialogue text
    this.dialogueText = this.scene.add.text(
      BOX_PADDING + BOX_MARGIN,
      16,
      '',
      {
        fontSize: TEXT_SIZE,
        color: TEXT_COLOR,
        fontFamily: 'monospace',
        wordWrap: { width: GAME_CONFIG.WIDTH - BOX_MARGIN * 2 - BOX_PADDING * 2 - 16 },
        lineSpacing: 2,
      }
    );
    this.container.add(this.dialogueText);

    // Continue indicator (blinking arrow)
    this.continueIndicator = this.scene.add.text(
      GAME_CONFIG.WIDTH - BOX_MARGIN * 2 - 16,
      BOX_HEIGHT - 14,
      'v',
      {
        fontSize: '8px',
        color: CHOICE_HIGHLIGHT_COLOR,
        fontFamily: 'monospace',
      }
    );
    this.container.add(this.continueIndicator);

    // Blink the continue indicator
    this.scene.tweens.add({
      targets: this.continueIndicator,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private show(): void {
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
    });
  }

  private hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  private clearChoices(): void {
    for (const text of this.choiceTexts) {
      text.destroy();
    }
    this.choiceTexts = [];
    (this as unknown as { _availableChoices: DialogueChoice[] | undefined })._availableChoices = undefined;
  }
}
