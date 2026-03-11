import { GameMode, GameAction } from '@shared/types/game';

describe('Shared types import', () => {
  it('should import GameMode enum correctly', () => {
    expect(GameMode.Classic).toBe('classic');
    expect(GameMode.Sprint).toBe('sprint');
    expect(GameMode.Invisible).toBe('invisible');
  });

  it('should import GameAction enum correctly', () => {
    expect(GameAction.NO_INPUT).toBe('NO_INPUT');
    expect(GameAction.MOVE_LEFT).toBe('MOVE_LEFT');
    expect(GameAction.MOVE_RIGHT).toBe('MOVE_RIGHT');
    expect(GameAction.SOFT_DROP).toBe('SOFT_DROP');
    expect(GameAction.HARD_DROP).toBe('HARD_DROP');
    expect(GameAction.ROTATE_CW).toBe('ROTATE_CW');
  });
});
