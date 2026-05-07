/**
 * InputGuard — one-shot flag that UI elements set so the game's
 * global pointer handler (MobileControls) knows to skip that frame.
 *
 * Usage:
 *   UI side:    InputGuard.consume()   ← call in pointerdown handler
 *   Game side:  if (InputGuard.check()) return;  ← early-out in onPointerDown
 *
 * Works because Phaser fires game-object interactive events
 * BEFORE the scene-level input.on('pointerdown') in the same tick.
 */
export const InputGuard = {
  _consumed: false,

  /** Mark that a UI element has handled this pointer event. */
  consume(): void {
    this._consumed = true;
  },

  /** Returns true (and resets) if a UI element already consumed the event. */
  check(): boolean {
    if (this._consumed) {
      this._consumed = false;
      return true;
    }
    return false;
  },
};
