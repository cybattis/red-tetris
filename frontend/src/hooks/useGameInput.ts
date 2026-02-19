import { useEffect, useCallback, useRef } from 'react';
import { DEFAULT_KEY_BINDINGS, GameAction, type GameActionType } from '../utils/keyBindings';

interface UseGameInputOptions {
  /** Whether input capture is enabled */
  enabled?: boolean;
  /** Callback when a game action is triggered */
  onAction: (action: GameActionType) => void;
  /** Callback for continuous actions (move left/right) while key is held */
  onActionStart?: (action: GameActionType) => void;
  /** Callback when a continuous action key is released */
  onActionEnd?: (action: GameActionType) => void;
  /** Delay before key repeat starts (ms) */
  repeatDelay?: number;
  /** Interval between repeated actions (ms) */
  repeatInterval?: number;
}

interface HeldKeyState {
  action: GameActionType;
  timeoutId: ReturnType<typeof setTimeout> | null;
  intervalId: ReturnType<typeof setInterval> | null;
}

/**
 * Hook to capture game input and send actions to server
 * 
 * Features:
 * - Maps keyboard keys to game actions
 * - Supports key repeat for movement (DAS - Delayed Auto Shift)
 * - Prevents default browser behavior for game keys
 * - Only active when enabled prop is true
 */
export function useGameInput({
  enabled = true,
  onAction,
  onActionStart,
  onActionEnd,
  repeatDelay = 170,  // DAS delay
  repeatInterval = 50,  // ARR (Auto Repeat Rate)
}: UseGameInputOptions): void {
  // Track held keys for repeat functionality
  const heldKeysRef = useRef<Map<string, HeldKeyState>>(new Map());

  // Actions that support key repeat (holding)
  const repeatableActions = new Set<GameActionType>([
    GameAction.MOVE_LEFT,
    GameAction.MOVE_RIGHT,
    GameAction.SOFT_DROP,
  ]);

  const clearKeyRepeat = useCallback((key: string) => {
    const state = heldKeysRef.current.get(key);
    if (state) {
      if (state.timeoutId) clearTimeout(state.timeoutId);
      if (state.intervalId) clearInterval(state.intervalId);
      heldKeysRef.current.delete(key);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const action = DEFAULT_KEY_BINDINGS[event.code];
    if (!action) return;

    // Prevent default browser behavior for game keys
    event.preventDefault();

    // Check if key is already held (don't re-trigger)
    if (heldKeysRef.current.has(event.code)) {
      return;
    }

    // Fire the action immediately
    onAction(action);
    onActionStart?.(action);

    // Set up key repeat for repeatable actions
    if (repeatableActions.has(action)) {
      const timeoutId = setTimeout(() => {
        // Start repeating after delay
        const intervalId = setInterval(() => {
          onAction(action);
        }, repeatInterval);

        // Update the state with interval ID
        const state = heldKeysRef.current.get(event.code);
        if (state) {
          state.intervalId = intervalId;
        }
      }, repeatDelay);

      heldKeysRef.current.set(event.code, {
        action,
        timeoutId,
        intervalId: null,
      });
    } else {
      // Track non-repeatable keys too (for onActionEnd)
      heldKeysRef.current.set(event.code, {
        action,
        timeoutId: null,
        intervalId: null,
      });
    }
  }, [enabled, onAction, onActionStart, repeatDelay, repeatInterval, repeatableActions]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const state = heldKeysRef.current.get(event.code);
    if (state) {
      clearKeyRepeat(event.code);
      onActionEnd?.(state.action);
    }
  }, [clearKeyRepeat, onActionEnd]);

  // Handle window blur (clear all held keys when window loses focus)
  const handleBlur = useCallback(() => {
    heldKeysRef.current.forEach((state, key) => {
      clearKeyRepeat(key);
      onActionEnd?.(state.action);
    });
  }, [clearKeyRepeat, onActionEnd]);

  useEffect(() => {
    if (!enabled) {
      // Clear any held keys when disabled
      heldKeysRef.current.forEach((_, key) => clearKeyRepeat(key));
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      // Cleanup: clear all intervals and remove listeners
      heldKeysRef.current.forEach((_, key) => clearKeyRepeat(key));
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleBlur, clearKeyRepeat]);
}

export default useGameInput;
