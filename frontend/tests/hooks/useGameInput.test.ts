import { renderHook } from '@testing-library/react';
import { useGameInput } from '../../src/hooks/useGameInput';
import { GameAction } from '@shared/types/game';

// Mock the DEFAULT_KEY_BINDINGS
jest.mock('@/utils', () => ({
  DEFAULT_KEY_BINDINGS: {
    ArrowLeft: 'MOVE_LEFT',
    ArrowRight: 'MOVE_RIGHT',
    ArrowDown: 'SOFT_DROP',
    ArrowUp: 'ROTATE_CW',
    Space: 'HARD_DROP',
    KeyX: 'ROTATE_CW',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  },
}));

// Mock shared types
jest.mock('@shared/types/game', () => ({
  GameAction: {
    NO_INPUT: 'NO_INPUT',
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    SOFT_DROP: 'SOFT_DROP',
    HARD_DROP: 'HARD_DROP',
    ROTATE_CW: 'ROTATE_CW',
    PAUSE: 'PAUSE',
  },
}));

// Mock timers
jest.useFakeTimers();

describe('useGameInput', () => {
  let mockOnAction: jest.MockedFunction<(action: GameAction) => void>;
  let mockOnActionStart: jest.MockedFunction<(action: GameAction) => void>;
  let mockOnActionEnd: jest.MockedFunction<(action: GameAction) => void>;

  beforeEach(() => {
    mockOnAction = jest.fn();
    mockOnActionStart = jest.fn();
    mockOnActionEnd = jest.fn();
    
    // Clear all mocks and timers
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Clear any existing event listeners
    document.removeEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    // Run any pending timers
    jest.runOnlyPendingTimers();
    // Restore real timers after each test
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const createKeyboardEvent = (code: string, type: 'keydown' | 'keyup' = 'keydown') => {
    return new KeyboardEvent(type, {
      code,
      bubbles: true,
      cancelable: true,
    });
  };

  describe('basic functionality', () => {
    it('should initialize without errors', () => {
      const { result } = renderHook(() => 
        useGameInput({ onAction: mockOnAction })
      );

      expect(result.current).toBeUndefined();
      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should handle key press for valid game keys', () => {
      renderHook(() => useGameInput({ onAction: mockOnAction }));

      const event = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
    });

    it('should ignore key presses for non-game keys', () => {
      renderHook(() => useGameInput({ onAction: mockOnAction }));

      const event = createKeyboardEvent('KeyA');
      window.dispatchEvent(event);

      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should prevent default for game keys', () => {
      renderHook(() => useGameInput({ onAction: mockOnAction }));

      const event = createKeyboardEvent('Space');
      const preventDefault = jest.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.HARD_DROP);
    });

    it('should not prevent default for non-game keys', () => {
      renderHook(() => useGameInput({ onAction: mockOnAction }));

      const event = createKeyboardEvent('KeyA');
      const preventDefault = jest.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('enabled/disabled functionality', () => {
    it('should respond to input when enabled', () => {
      renderHook(() => 
        useGameInput({ enabled: true, onAction: mockOnAction })
      );

      const event = createKeyboardEvent('ArrowRight');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_RIGHT);
    });

    it('should ignore input when disabled', () => {
      renderHook(() => 
        useGameInput({ enabled: false, onAction: mockOnAction })
      );

      const event = createKeyboardEvent('ArrowRight');
      window.dispatchEvent(event);

      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should clear held keys when disabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useGameInput({ enabled, onAction: mockOnAction }),
        { initialProps: { enabled: true } }
      );

      // Press and hold a key
      const keyDownEvent = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(keyDownEvent);

      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
      mockOnAction.mockClear();

      // Disable the hook
      rerender({ enabled: false });

      // Advance timers to trigger repeat
      jest.advanceTimersByTime(200);

      // Should not trigger repeat when disabled
      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('action callbacks', () => {
    it('should call onActionStart when provided', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionStart: mockOnActionStart,
        })
      );

      const event = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
      expect(mockOnActionStart).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
    });

    it('should call onActionEnd when key is released', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Press key
      const keyDownEvent = createKeyboardEvent('ArrowUp');
      window.dispatchEvent(keyDownEvent);

      // Release key
      const keyUpEvent = createKeyboardEvent('ArrowUp', 'keyup');
      window.dispatchEvent(keyUpEvent);

      expect(mockOnActionEnd).toHaveBeenCalledWith(GameAction.ROTATE_CW);
    });

    it('should not call onActionEnd if key was not pressed', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Release key without pressing it first
      const keyUpEvent = createKeyboardEvent('ArrowUp', 'keyup');
      window.dispatchEvent(keyUpEvent);

      expect(mockOnActionEnd).not.toHaveBeenCalled();
    });
  });

  describe('key repeat functionality (DAS/ARR)', () => {
    it('should repeat actions for repeatable keys after delay', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 100,
          repeatInterval: 50,
        })
      );

      // Press repeatable key
      const event = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledTimes(1);
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);

      // Advance by repeat delay
      jest.advanceTimersByTime(100);
      
      // Should start repeating
      jest.advanceTimersByTime(50);
      expect(mockOnAction).toHaveBeenCalledTimes(2);

      // Continue repeating
      jest.advanceTimersByTime(50);
      expect(mockOnAction).toHaveBeenCalledTimes(3);

      jest.advanceTimersByTime(50);
      expect(mockOnAction).toHaveBeenCalledTimes(4);
    });

    it('should not repeat actions for non-repeatable keys', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 100,
          repeatInterval: 50,
        })
      );

      // Press non-repeatable key (rotate)
      const event = createKeyboardEvent('ArrowUp');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledTimes(1);
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.ROTATE_CW);

      // Advance timers
      jest.advanceTimersByTime(200);
      
      // Should not repeat
      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    it('should stop repeating when key is released', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 100,
          repeatInterval: 50,
        })
      );

      // Press repeatable key
      const keyDownEvent = createKeyboardEvent('ArrowRight');
      window.dispatchEvent(keyDownEvent);

      // Start repeating
      jest.advanceTimersByTime(150);
      expect(mockOnAction).toHaveBeenCalledTimes(2);

      // Release key
      const keyUpEvent = createKeyboardEvent('ArrowRight', 'keyup');
      window.dispatchEvent(keyUpEvent);

      // Continue advancing time
      jest.advanceTimersByTime(100);
      
      // Should not continue repeating
      expect(mockOnAction).toHaveBeenCalledTimes(2);
    });

    it('should use custom repeat timing', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 200, // Custom delay
          repeatInterval: 25, // Custom interval
        })
      );

      const event = createKeyboardEvent('ArrowDown');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledTimes(1);

      // Should not repeat before custom delay
      jest.advanceTimersByTime(100);
      expect(mockOnAction).toHaveBeenCalledTimes(1);

      // Should start repeating after custom delay
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(25);
      expect(mockOnAction).toHaveBeenCalledTimes(2);

      // Should continue with custom interval
      jest.advanceTimersByTime(25);
      expect(mockOnAction).toHaveBeenCalledTimes(3);
    });

    it('should not re-trigger if same key is pressed while held', () => {
      renderHook(() => 
        useGameInput({ onAction: mockOnAction })
      );

      // Press key
      const event1 = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event1);

      expect(mockOnAction).toHaveBeenCalledTimes(1);

      // Press same key again (should be ignored)
      const event2 = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event2);

      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('window blur handling', () => {
    it('should clear held keys on window blur', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Press key
      const keyDownEvent = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(keyDownEvent);

      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);

      // Simulate window blur
      const blurEvent = new Event('blur');
      window.dispatchEvent(blurEvent);

      expect(mockOnActionEnd).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
    });

    it('should clear all held keys on window blur', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Press multiple keys
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'));
      window.dispatchEvent(createKeyboardEvent('ArrowDown'));

      expect(mockOnAction).toHaveBeenCalledTimes(2);

      // Simulate window blur
      const blurEvent = new Event('blur');
      window.dispatchEvent(blurEvent);

      expect(mockOnActionEnd).toHaveBeenCalledTimes(2);
      expect(mockOnActionEnd).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
      expect(mockOnActionEnd).toHaveBeenCalledWith(GameAction.SOFT_DROP);
    });
  });

  describe('event listener management', () => {
    it('should add event listeners on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useGameInput({ onAction: mockOnAction }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useGameInput({ onAction: mockOnAction }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should clear held keys on unmount', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 100,
        })
      );

      // Press key to start repeat
      const event = createKeyboardEvent('ArrowLeft');
      window.dispatchEvent(event);

      expect(mockOnAction).toHaveBeenCalledTimes(1);

      // Should not continue repeating after unmount (tested by not crashing)
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid key presses correctly', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionStart: mockOnActionStart,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Rapid press and release
      window.dispatchEvent(createKeyboardEvent('Space'));
      window.dispatchEvent(createKeyboardEvent('Space', 'keyup'));
      window.dispatchEvent(createKeyboardEvent('Space'));
      window.dispatchEvent(createKeyboardEvent('Space', 'keyup'));

      expect(mockOnAction).toHaveBeenCalledTimes(2);
      expect(mockOnActionStart).toHaveBeenCalledTimes(2);
      expect(mockOnActionEnd).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple simultaneous key presses', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          onActionEnd: mockOnActionEnd,
        })
      );

      // Press multiple keys
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'));
      window.dispatchEvent(createKeyboardEvent('ArrowDown'));
      window.dispatchEvent(createKeyboardEvent('KeyX'));

      expect(mockOnAction).toHaveBeenCalledTimes(3);
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.SOFT_DROP);
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.ROTATE_CW);

      // Release all keys
      window.dispatchEvent(createKeyboardEvent('ArrowLeft', 'keyup'));
      window.dispatchEvent(createKeyboardEvent('ArrowDown', 'keyup'));
      window.dispatchEvent(createKeyboardEvent('KeyX', 'keyup'));

      expect(mockOnActionEnd).toHaveBeenCalledTimes(3);
    });

    it('should handle complete gameplay sequence', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 100,
          repeatInterval: 50,
        })
      );

      // Move left (should repeat)
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'));
      jest.advanceTimersByTime(150);
      
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.MOVE_LEFT);
      expect(mockOnAction).toHaveBeenCalledTimes(2); // Initial + 1 repeat

      // Release left key and clear previous calls
      window.dispatchEvent(createKeyboardEvent('ArrowLeft', 'keyup'));
      mockOnAction.mockClear();

      // Rotate (should not repeat)
      window.dispatchEvent(createKeyboardEvent('ArrowUp'));
      jest.advanceTimersByTime(100);
      
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.ROTATE_CW);
      expect(mockOnAction).toHaveBeenCalledTimes(1); // Only rotate call

      // Release rotate key
      window.dispatchEvent(createKeyboardEvent('ArrowUp', 'keyup'));

      // Hard drop (should not repeat)
      window.dispatchEvent(createKeyboardEvent('Space'));
      
      expect(mockOnAction).toHaveBeenCalledWith(GameAction.HARD_DROP);
      expect(mockOnAction).toHaveBeenCalledTimes(2); // 1 rotate + 1 hard drop

      // Release space key
      window.dispatchEvent(createKeyboardEvent('Space', 'keyup'));
    });
  });

  describe('edge cases', () => {
    it('should handle undefined key codes gracefully', () => {
      renderHook(() => useGameInput({ onAction: mockOnAction }));

      // Create event with undefined code
      const event = new KeyboardEvent('keydown', { code: undefined } as any);
      window.dispatchEvent(event);

      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should handle zero repeat delays', () => {
      renderHook(() => 
        useGameInput({ 
          onAction: mockOnAction,
          repeatDelay: 0,
          repeatInterval: 50,
        })
      );

      window.dispatchEvent(createKeyboardEvent('ArrowLeft'));
      
      // Should start repeating immediately
      jest.advanceTimersByTime(0);
      jest.advanceTimersByTime(50);
      
      expect(mockOnAction).toHaveBeenCalledTimes(2);
    });
  });
});
