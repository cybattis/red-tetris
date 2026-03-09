import { 
  DEFAULT_KEY_BINDINGS,
  WASD_KEY_BINDINGS,
  PREVENTED_KEYS,
  getActionForKey,
  shouldPreventDefault
} from '../../src/utils/keyBindings';
import { GameAction } from '@shared/types/game';

describe('KeyBindings utility', () => {
  describe('DEFAULT_KEY_BINDINGS', () => {
    it('should map arrow keys correctly', () => {
      expect(DEFAULT_KEY_BINDINGS.ArrowLeft).toBe(GameAction.MOVE_LEFT);
      expect(DEFAULT_KEY_BINDINGS.ArrowRight).toBe(GameAction.MOVE_RIGHT);
      expect(DEFAULT_KEY_BINDINGS.ArrowDown).toBe(GameAction.SOFT_DROP);
      expect(DEFAULT_KEY_BINDINGS.ArrowUp).toBe(GameAction.ROTATE_CW);
    });

    it('should map space key to hard drop', () => {
      expect(DEFAULT_KEY_BINDINGS.Space).toBe(GameAction.HARD_DROP);
    });

    it('should map X key to rotate', () => {
      expect(DEFAULT_KEY_BINDINGS.KeyX).toBe(GameAction.ROTATE_CW);
    });

    it('should map pause keys', () => {
      expect(DEFAULT_KEY_BINDINGS.Escape).toBe(GameAction.PAUSE);
      expect(DEFAULT_KEY_BINDINGS.KeyP).toBe(GameAction.PAUSE);
    });
  });

  describe('WASD_KEY_BINDINGS', () => {
    it('should map WASD keys correctly', () => {
      expect(WASD_KEY_BINDINGS.KeyA).toBe(GameAction.MOVE_LEFT);
      expect(WASD_KEY_BINDINGS.KeyD).toBe(GameAction.MOVE_RIGHT);
      expect(WASD_KEY_BINDINGS.KeyS).toBe(GameAction.SOFT_DROP);
      expect(WASD_KEY_BINDINGS.KeyW).toBe(GameAction.ROTATE_CW);
    });

    it('should include space and escape keys', () => {
      expect(WASD_KEY_BINDINGS.Space).toBe(GameAction.HARD_DROP);
      expect(WASD_KEY_BINDINGS.Escape).toBe(GameAction.PAUSE);
    });
  });

  describe('PREVENTED_KEYS', () => {
    it('should contain arrow keys', () => {
      expect(PREVENTED_KEYS.has('ArrowLeft')).toBe(true);
      expect(PREVENTED_KEYS.has('ArrowRight')).toBe(true);
      expect(PREVENTED_KEYS.has('ArrowDown')).toBe(true);
      expect(PREVENTED_KEYS.has('ArrowUp')).toBe(true);
    });

    it('should contain space key', () => {
      expect(PREVENTED_KEYS.has('Space')).toBe(true);
    });

    it('should not contain non-game keys', () => {
      expect(PREVENTED_KEYS.has('KeyA')).toBe(false);
      expect(PREVENTED_KEYS.has('Enter')).toBe(false);
    });
  });

  describe('getActionForKey', () => {
    it('should return correct action for valid keys with default bindings', () => {
      expect(getActionForKey('ArrowLeft')).toBe(GameAction.MOVE_LEFT);
      expect(getActionForKey('Space')).toBe(GameAction.HARD_DROP);
    });

    it('should return null for invalid keys', () => {
      expect(getActionForKey('InvalidKey')).toBe(null);
      expect(getActionForKey('KeyZ')).toBe(null);
    });

    it('should work with custom bindings', () => {
      const customBindings = {
        KeyQ: GameAction.ROTATE_CW,
      };
      expect(getActionForKey('KeyQ', customBindings)).toBe(GameAction.ROTATE_CW);
      expect(getActionForKey('ArrowLeft', customBindings)).toBe(null);
    });

    it('should work with WASD bindings', () => {
      expect(getActionForKey('KeyA', WASD_KEY_BINDINGS)).toBe(GameAction.MOVE_LEFT);
      expect(getActionForKey('KeyW', WASD_KEY_BINDINGS)).toBe(GameAction.ROTATE_CW);
    });
  });

  describe('shouldPreventDefault', () => {
    it('should return true for prevented keys', () => {
      expect(shouldPreventDefault('ArrowLeft')).toBe(true);
      expect(shouldPreventDefault('ArrowRight')).toBe(true);
      expect(shouldPreventDefault('ArrowDown')).toBe(true);
      expect(shouldPreventDefault('ArrowUp')).toBe(true);
      expect(shouldPreventDefault('Space')).toBe(true);
    });

    it('should return false for non-prevented keys', () => {
      expect(shouldPreventDefault('KeyA')).toBe(false);
      expect(shouldPreventDefault('Enter')).toBe(false);
      expect(shouldPreventDefault('Escape')).toBe(false);
    });
  });
});
