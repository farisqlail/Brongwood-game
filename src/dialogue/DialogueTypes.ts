/**
 * Dialogue Type Definitions - Data structures for the conversation system.
 * 
 * WHY DATA-DRIVEN DIALOGUE:
 * 1. Writers can create dialogue without touching code
 * 2. Branching logic is declarative (conditions in data, not if/else chains)
 * 3. Easy to add new features (portraits, camera moves) without refactoring
 * 4. Dialogue can be loaded from external files (future localization)
 * 5. Testable — you can validate dialogue trees without running the game
 * 
 * DIALOGUE STRUCTURE:
 * A dialogue is a sequence of NODES. Each node can be:
 * - text: A line of dialogue with speaker, portrait, and typewriter effect
 * - choice: Player selects from options (each option leads to another node)
 * - action: Triggers a game action (relationship change, flag set, camera move)
 * - branch: Conditional jump based on game state
 * 
 * This is essentially a state machine / directed graph.
 * Each node has an ID, and nodes reference other nodes by ID.
 * 
 * EMOTIONAL PACING:
 * The system supports:
 * - Typing speed variation (slower = more dramatic)
 * - Pauses between lines (... creates tension)
 * - Auto-advance (some lines don't wait for input)
 * - Camera events (zoom in for intimate moments)
 */

import { RelationshipCondition } from '@/systems/RelationshipSystem';
import { TimePeriod } from '@/core/EventBus';

// ============================================================
// DIALOGUE NODE TYPES
// ============================================================

/** A single line of dialogue text */
export interface DialogueTextNode {
  type: 'text';
  id: string;
  /** Who is speaking (NPC ID or 'narrator' or 'player') */
  speaker: string;
  /** Display name shown in dialogue box */
  speakerName?: string;
  /** The dialogue text (supports {variable} interpolation) */
  text: string;
  /** Portrait key to display (null = no portrait) */
  portrait?: string;
  /** Portrait emotion variant (e.g., 'sad', 'happy', 'neutral') */
  emotion?: string;
  /** Typing speed multiplier (1 = normal, 0.5 = slow/dramatic, 2 = fast) */
  typeSpeed?: number;
  /** Pause after this line before advancing (ms, 0 = wait for input) */
  autoAdvanceDelay?: number;
  /** Next node ID (null = end dialogue) */
  next?: string | null;
}

/** A choice presented to the player */
export interface DialogueChoiceNode {
  type: 'choice';
  id: string;
  /** Optional prompt text shown above choices */
  prompt?: string;
  /** Available choices */
  choices: DialogueChoice[];
}

/** A single choice option */
export interface DialogueChoice {
  /** Display text for this choice */
  text: string;
  /** Unique ID for this choice (for tracking) */
  choiceId: string;
  /** Node to jump to when selected */
  next: string;
  /** Condition required to show this choice (hidden if not met) */
  condition?: RelationshipCondition & { npcId?: string };
  /** Relationship effects when chosen */
  effects?: DialogueEffect[];
}

/** An action node (invisible, executes immediately) */
export interface DialogueActionNode {
  type: 'action';
  id: string;
  /** Actions to execute */
  actions: DialogueAction[];
  /** Next node after actions execute */
  next?: string | null;
}

/** A conditional branch node */
export interface DialogueBranchNode {
  type: 'branch';
  id: string;
  /** Conditions checked in order — first match wins */
  branches: DialogueBranch[];
  /** Fallback node if no conditions match */
  fallback: string;
}

/** A single branch condition */
export interface DialogueBranch {
  condition: DialogueCondition;
  next: string;
}

// ============================================================
// ACTIONS & EFFECTS
// ============================================================

/** Actions that can be triggered during dialogue */
export type DialogueAction =
  | { type: 'add_affection'; npcId: string; amount: number }
  | { type: 'add_trust'; npcId: string; amount: number }
  | { type: 'set_flag'; npcId: string; flag: string; value: boolean }
  | { type: 'create_memory'; npcId: string; memoryId: string; description: string; tags: string[] }
  | { type: 'set_game_flag'; flag: string; value: boolean | number | string }
  | { type: 'camera_zoom'; zoom: number; duration: number }
  | { type: 'camera_pan'; x: number; y: number; duration: number }
  | { type: 'camera_reset'; duration: number }
  | { type: 'play_sfx'; key: string }
  | { type: 'play_bgm'; key: string }
  | { type: 'screen_shake'; intensity: number; duration: number }
  | { type: 'wait'; duration: number }
  | { type: 'fade_out'; duration: number }
  | { type: 'fade_in'; duration: number };

/** Shorthand for effects on choices */
export type DialogueEffect = DialogueAction;

/** Conditions for branching */
export interface DialogueCondition {
  /** Relationship condition */
  relationship?: RelationshipCondition & { npcId: string };
  /** Time period condition */
  timePeriod?: TimePeriod[];
  /** Game flag condition */
  gameFlag?: { flag: string; value: boolean | number | string };
  /** Dialogue flag (has this dialogue been seen before?) */
  dialogueFlag?: string;
}

// ============================================================
// DIALOGUE DEFINITION
// ============================================================

/** A complete dialogue tree */
export interface DialogueDefinition {
  /** Unique dialogue ID */
  id: string;
  /** All nodes in this dialogue */
  nodes: Record<string, DialogueNode>;
  /** Starting node ID */
  startNode: string;
  /** Conditions required to trigger this dialogue */
  conditions?: DialogueCondition;
  /** Priority (higher = preferred when multiple dialogues are available) */
  priority?: number;
}

/** Union of all node types */
export type DialogueNode =
  | DialogueTextNode
  | DialogueChoiceNode
  | DialogueActionNode
  | DialogueBranchNode;
