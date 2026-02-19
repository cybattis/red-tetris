/**
 * Keyboard Input Bindings
 *
 * Maps keyboard keys to game actions.
 * These actions are sent to the server - no game logic runs locally.
 */

/**
 * Game actions that can be sent to the server
 */
export const GameAction = {
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  SOFT_DROP: 'SOFT_DROP',
  HARD_DROP: 'HARD_DROP',
  ROTATE_CW: 'ROTATE_CW', // Clockwise
  ROTATE_CCW: 'ROTATE_CCW', // Counter-clockwise
  HOLD: 'HOLD',
  PAUSE: 'PAUSE',
} as const;

export type GameActionType = (typeof GameAction)[keyof typeof GameAction];

/**
 * Default key bindings
 * Maps KeyboardEvent.code to game actions
 */
export const DEFAULT_KEY_BINDINGS: Record<string, GameActionType> = {
  ArrowLeft: GameAction.MOVE_LEFT,
  ArrowRight: GameAction.MOVE_RIGHT,
  ArrowDown: GameAction.SOFT_DROP,
  ArrowUp: GameAction.ROTATE_CW,
  Space: GameAction.HARD_DROP,
  KeyZ: GameAction.ROTATE_CCW,
  KeyX: GameAction.ROTATE_CW,
  KeyC: GameAction.HOLD,
  ShiftLeft: GameAction.HOLD,
  ShiftRight: GameAction.HOLD,
  Escape: GameAction.PAUSE,
  KeyP: GameAction.PAUSE,
};

/**
 * Alternative WASD key bindings (optional)
 */
export const WASD_KEY_BINDINGS: Record<string, GameActionType> = {
  KeyA: GameAction.MOVE_LEFT,
  KeyD: GameAction.MOVE_RIGHT,
  KeyS: GameAction.SOFT_DROP,
  KeyW: GameAction.ROTATE_CW,
  Space: GameAction.HARD_DROP,
  KeyQ: GameAction.ROTATE_CCW,
  KeyE: GameAction.HOLD,
  Escape: GameAction.PAUSE,
};

/**
 * Keys that should prevent default browser behavior during gameplay
 */
export const PREVENTED_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  'ArrowUp',
  'Space',
]);

/**
 * Get the game action for a key code
 */
export function getActionForKey(
  keyCode: string,
  bindings: Record<string, GameActionType> = DEFAULT_KEY_BINDINGS
): GameActionType | null {
  return bindings[keyCode] ?? null;
}

/**
 * Check if a key should prevent default behavior
 */
export function shouldPreventDefault(keyCode: string): boolean {
  return PREVENTED_KEYS.has(keyCode);
}
