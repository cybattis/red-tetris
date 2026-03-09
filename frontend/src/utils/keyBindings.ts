import { GameAction } from "@shared/types/game";

/**
 * Keyboard Input Bindings
 *
 * Maps keyboard keys to game actions.
 * These actions are sent to the server - no game logic runs locally.
 */

/**
 * Default key bindings
 * Maps KeyboardEvent.code to game actions
 */
export const DEFAULT_KEY_BINDINGS: Record<string, GameAction> = {
  ArrowLeft: GameAction.MOVE_LEFT,
  ArrowRight: GameAction.MOVE_RIGHT,
  ArrowDown: GameAction.SOFT_DROP,
  ArrowUp: GameAction.ROTATE_CW,
  Space: GameAction.HARD_DROP,
  KeyX: GameAction.ROTATE_CW,
  Escape: GameAction.PAUSE,
  KeyP: GameAction.PAUSE,
};

/**
 * Alternative WASD key bindings (optional)
 */
export const WASD_KEY_BINDINGS: Record<string, GameAction> = {
  KeyA: GameAction.MOVE_LEFT,
  KeyD: GameAction.MOVE_RIGHT,
  KeyS: GameAction.SOFT_DROP,
  KeyW: GameAction.ROTATE_CW,
  Space: GameAction.HARD_DROP,
  Escape: GameAction.PAUSE,
};

/**
 * Keys that should prevent default browser behavior during gameplay
 */
export const PREVENTED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "Space",
]);

/**
 * Get the game action for a key code
 */
export function getActionForKey(
  keyCode: string,
  bindings: Record<string, GameAction> = DEFAULT_KEY_BINDINGS,
): GameAction | null {
  return bindings[keyCode] ?? null;
}

/**
 * Check if a key should prevent default behavior
 */
export function shouldPreventDefault(keyCode: string): boolean {
  return PREVENTED_KEYS.has(keyCode);
}
