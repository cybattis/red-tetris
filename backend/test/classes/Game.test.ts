import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Game } from '../../src/classes/Game';
import { Player } from '../../src/classes/Player';
import { Piece } from '../../src/classes/Piece';
import { Room } from '../../src/classes/Room';
import { GameAction, GameMode, GameSettings, GameState } from '../../../shared/types/game';
import { PieceType } from '../../src/types/IPiece';
import { TETROMINO_DICTIONARY } from '../../src/pieces/TetrominoFactory';
import { Logger } from '../../src/utils/helpers';

const settings: GameSettings = {
  gravity: 1,
  ghostPiece: true,
  boardWidth: 10,
  boardHeight: 20,
  nextPieceCount: 3,
  gameMode: GameMode.Classic,
};

function createGame(seed = 123): Game {
  const room = { id: 'test-room', playerCount: 1 } as unknown as Room;
  return new Game(new Player('socket-game'), seed, settings, room);
}

describe('Game', () => {
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('initializes default state and board from constructor', () => {
    const game = createGame();
    const currentPiece = (game as any)._currentPiece as Piece;

    expect(game.state).toBe(GameState.Waiting);
    expect(game.board).toHaveLength(settings.boardHeight);
    expect(game.board[0]).toHaveLength(settings.boardWidth);
    expect(currentPiece.position).toEqual({ x: Math.floor(settings.boardWidth / 2) - 1, y: 0 });
  });

  it('starts and stops game loop', () => {
    const game = createGame();

    game.start();
    expect(game.state).toBe(GameState.Playing);
    expect((game as any)._gameLoop).not.toBeNull();

    game.stopGame();
    expect((game as any)._gameLoop).toBeNull();
  });

  it('handles input buffer actions', () => {
    const game = createGame();
    const gameAny = game as any;
    gameAny._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.T]);
    gameAny._currentPiece.position = { x: 1, y: 0 };

    game.setPlayerInput(GameAction.MOVE_LEFT);
    gameAny.processPlayerInput();
    expect(gameAny._currentPiece.position.x).toBe(0);

    game.setPlayerInput(GameAction.MOVE_LEFT);
    gameAny.processPlayerInput();
    expect(gameAny._currentPiece.position.x).toBe(0);

    game.setPlayerInput(GameAction.ROTATE_CW);
    const beforeRotation = JSON.stringify(gameAny._currentPiece.shape);
    gameAny.processPlayerInput();
    expect(JSON.stringify(gameAny._currentPiece.shape)).not.toBe(beforeRotation);

    game.setPlayerInput(GameAction.SOFT_DROP);
    gameAny.processPlayerInput();
    expect(gameAny._currentPiece.position.y).toBe(1);
  });

  it('hard-drops piece until collision', () => {
    const game = createGame();
    const gameAny = game as any;
    gameAny._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.I]);
    gameAny._currentPiece.position = { x: 0, y: -1 };

    game.setPlayerInput(GameAction.HARD_DROP);
    gameAny.processPlayerInput();

    // After hard drop the piece should be locked at the bottom
    expect(gameAny._currentPiece.isLocked).toBe(true);
  });

  it('reports collisions on boundaries and occupied cells', () => {
    const game = createGame();

    expect((game as any).checkCollision(-1, 0)).toBe(true);
    expect((game as any).checkCollision(settings.boardWidth, 0)).toBe(true);
    expect((game as any).checkCollision(0, settings.boardHeight)).toBe(true);

    game.board[0][0] = 1;
    expect((game as any).checkCollision(0, 0)).toBe(true);
    expect((game as any).checkCollision(1, 1)).toBe(false);
  });

  it('adds fully filled penalty lines at the bottom while preserving board size', () => {
    const game = createGame();

    // Mark row 0 so we can verify it shifts up
    game.board[settings.boardHeight - 1][0] = 5;

    game.addPenaltyLines(2);

    expect(game.board).toHaveLength(settings.boardHeight);
    // Bottom 2 rows should be fully filled penalty lines (type 8) with no gaps
    for (let r = settings.boardHeight - 2; r < settings.boardHeight; r++) {
      const row = game.board[r];
      const eights = row.filter((c: number) => c === 8).length;
      expect(eights).toBe(settings.boardWidth); // Completely filled, no gaps
      expect(row.every((c: number) => c === 8)).toBe(true);
    }
    // The original bottom row content should have shifted up by 2
    expect(game.board[settings.boardHeight - 3][0]).toBe(5);
  });

  it('does nothing when adding 0 penalty lines', () => {
    const game = createGame();
    const boardBefore = JSON.stringify(game.board);

    game.addPenaltyLines(0);

    expect(JSON.stringify(game.board)).toBe(boardBefore);
  });

  it('broadcasts PENALTY_LINES animation when penalty lines are added', () => {
    const game = createGame();
    const animationSpy = jest.spyOn(game as any, 'broadcastAnimation');

    game.addPenaltyLines(2);

    expect(animationSpy).toHaveBeenCalledWith(
      'PENALTY_LINES',
      expect.objectContaining({ count: 2 }),
    );
  });

  it('adjusts current piece position upward when penalty lines are added', () => {
    const game = createGame();
    const gameAny = game as any;
    gameAny._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.T]);
    gameAny._currentPiece.position = { x: 3, y: 10 };
    gameAny._currentPiece.isLocked = false;

    game.addPenaltyLines(3);

    // Piece should shift up by 3 to compensate for the board shift
    expect(gameAny._currentPiece.position.y).toBe(7);
  });

  it('triggers game over when penalty lines cause collision with current piece', () => {
    const game = createGame();
    const gameAny = game as any;

    gameAny._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.O]);
    gameAny._currentPiece.position = { x: 1, y: 1 };
    gameAny._currentPiece.isLocked = false;
    gameAny.checkCollision = () => true;

    const gameOverSpy = jest.spyOn(gameAny, 'GameOver');

    game.addPenaltyLines(2);

    expect(gameOverSpy).toHaveBeenCalled();
  });

  it('emits penaltyLines event after clearing 2+ lines in multiplayer', () => {
    const game = createGame();
    const emit = jest.fn();
    (game as any)._socket = { emit };

    // Set up a mock room so the penalty event is emitted
    const mockRoom = { id: 'test-room' };
    (game as any).room = mockRoom;

    const eventSpy = jest.fn();
    game.on('penaltyLines', eventSpy);

    // Fill bottom 2 rows to trigger a double line clear
    game.board[settings.boardHeight - 1] = new Array(settings.boardWidth).fill(1);
    game.board[settings.boardHeight - 2] = new Array(settings.boardWidth).fill(1);

    (game as any).checkAndClearLines();

    // 2 lines cleared → penalty = 2 - 1 = 1
    expect(eventSpy).toHaveBeenCalledWith({
      fromPlayerId: game.player.id,
      count: 1,
    });
  });

  it('does not emit penaltyLines event when only 1 line is cleared', () => {
    const game = createGame();
    const emit = jest.fn();
    (game as any)._socket = { emit };

    const mockRoom = { id: 'test-room' };
    (game as any).room = mockRoom;

    const eventSpy = jest.fn();
    game.on('penaltyLines', eventSpy);

    // Fill only 1 row
    game.board[settings.boardHeight - 1] = new Array(settings.boardWidth).fill(1);

    (game as any).checkAndClearLines();

    // 1 line cleared → penalty = 1 - 1 = 0 → no event
    expect(eventSpy).not.toHaveBeenCalled();
  });

  it('emits penaltyLines event when clearing 2+ lines', () => {
    const game = createGame();
    const eventSpy = jest.fn();
    game.on('penaltyLines', eventSpy);

    // Fill bottom 3 rows
    game.board[settings.boardHeight - 1] = new Array(settings.boardWidth).fill(1);
    game.board[settings.boardHeight - 2] = new Array(settings.boardWidth).fill(1);
    game.board[settings.boardHeight - 3] = new Array(settings.boardWidth).fill(1);

    (game as any).checkAndClearLines();

    expect(eventSpy).toHaveBeenCalledWith({
      fromPlayerId: game.player.id,
      count: 2,
    });
  });

  it('does not clear penalty rows even when fully filled', () => {
    const game = createGame();
    const emit = jest.fn();
    (game as any)._socket = { emit };

    // Add a penalty line at the bottom (type 8, fully filled, no gaps)
    game.addPenaltyLines(1);

    // The bottom row should already be fully non-zero (all 8s)
    const bottomRow = game.board[settings.boardHeight - 1];
    expect(bottomRow.every((c: number) => c !== 0)).toBe(true);
    expect(bottomRow.every((c: number) => c === 8)).toBe(true);

    // checkAndClearLines should NOT clear this row because it contains penalty blocks
    (game as any).checkAndClearLines();

    // The penalty row should still be at the bottom, not cleared
    expect(game.board[settings.boardHeight - 1].every((c: number) => c === 8)).toBe(true);
  });

  it('marks game eliminated and emits gameOver event', () => {
    const game = createGame();
    const eventSpy = jest.fn();
    game.on('gameOver', eventSpy);

    (game as any).GameOver();

    expect(game.isAlive).toBe(false);
    expect(game.state).toBe(GameState.Ended);
    expect(eventSpy).toHaveBeenCalledWith({
      gameId: game.id,
      playerId: game.player.id,
    });
  });

  it('runs gameloop gravity and dead-player path', () => {
    const game = createGame();
    (game as any)._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.T]);
    (game as any)._currentPiece.position = { x: 0, y: 0 };
    (game as any)._lastTickAt = 0;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1001);
    (game as any).gameloop();
    expect((game as any)._currentPiece.position.y).toBe(1);
    nowSpy.mockRestore();

    const stopSpy = jest.spyOn(game, 'stopGame');
    game.isAlive = false;
    (game as any).gameloop();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('does not restart when already playing', () => {
    const game = createGame();
    const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);

    game.start();
    expect(game.state).toBe(GameState.Playing);

    game.start();
    expect(game.state).toBe(GameState.Playing);
    expect(warnSpy).toHaveBeenCalled();

    game.stopGame();
    warnSpy.mockRestore();
  });

  it('emits gameOver payload with game and player ids', () => {
    const game = createGame();
    const eventSpy = jest.fn();
    game.on('gameOver', eventSpy);

    (game as any).GameOver();

    expect(eventSpy).toHaveBeenCalledWith({
      gameId: game.id,
      playerId: game.player.id,
    });
  });

  it('detects spawn overlap and triggers game over', () => {
    const game = createGame();
    const gameAny = game as any;
    const gameOverSpy = jest.spyOn(gameAny, 'GameOver');

    gameAny._currentPiece = new Piece(TETROMINO_DICTIONARY[PieceType.O]);
    gameAny._currentPiece.position = { x: 0, y: 0 };
    gameAny._currentPiece.isLocked = true;

    gameAny.getNextPiece = () => {
      const next = new Piece(TETROMINO_DICTIONARY[PieceType.O]);
      next.position = { x: 0, y: 0 };
      return next;
    };

    gameAny.updateBoard();

    expect(gameOverSpy).toHaveBeenCalled();
  });

  it('clears lines and emits sprint speed boost when clearing 3+ lines', () => {
    const sprintSettings = { ...settings, gameMode: GameMode.Sprint };
    const room = { id: 'test-room', playerCount: 1 } as unknown as Room;
    const game = new Game(new Player('socket-sprint'), 123, sprintSettings, room);
    const animationSpy = jest.spyOn(game as any, 'broadcastAnimation');

    game.board = Array.from({ length: sprintSettings.boardHeight }, () =>
      new Array(sprintSettings.boardWidth).fill(0),
    );
    game.board[19] = new Array(sprintSettings.boardWidth).fill(1);
    game.board[18] = new Array(sprintSettings.boardWidth).fill(1);
    game.board[17] = new Array(sprintSettings.boardWidth).fill(1);

    (game as any).checkAndClearLines();

    expect(animationSpy).toHaveBeenCalledWith(
      'LINE_CLEAR',
      expect.objectContaining({ rows: [17, 18, 19] }),
    );
    expect(animationSpy).toHaveBeenCalledWith(
      'SPEED_BOOST',
      expect.objectContaining({ multiplier: 3 }),
    );
  });

  it('throttles broadcast and returns null ghost when piece missing', () => {
    const game = createGame();
    const broadcastSpy = jest.spyOn(game as any, 'broadcastGameState');

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    (game as any).broadcastGameState();
    (game as any).broadcastGameState();

    expect(broadcastSpy).toHaveBeenCalledTimes(2);

    (game as any)._currentPiece = null;
    expect((game as any).calculateGhostPiece()).toBeNull();

    nowSpy.mockRestore();
  });

  it('updates drop interval only for significant changes', () => {
    const game = createGame();
    const gameAny = game as any;

    const current = game.dropInterval;
    gameAny.calculateDropInterval = () => current + 1;
    gameAny.updateDropInterval();
    expect(game.dropInterval).toBe(current);

    gameAny.calculateDropInterval = () => current + 10;
    gameAny.updateDropInterval();
    expect(game.dropInterval).toBe(current + 10);
  });

  it('returns sprint gravity multiplier in sprint mode', () => {
    const sprintSettings = { ...settings, gameMode: GameMode.Sprint };
    const room = { id: 'test-room', playerCount: 1 } as unknown as Room;
    const game = new Game(new Player('socket-mult'), 123, sprintSettings, room);

    expect(game.getSprintGravityMultiplier()).toBe(1);

    game.lines = 10;
    expect(game.getSprintGravityMultiplier()).toBeGreaterThan(1);
  });
});
