import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Game } from '../../src/classes/Game';
import { Player } from '../../src/classes/Player';
import { Piece } from '../../src/classes/Piece';
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
  return new Game(new Player('socket-game'), seed, settings);
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

  it('adds penalty lines while preserving board size', () => {
    const game = createGame();

    (game as any).addPenaltyLines(2);

    expect(game.board).toHaveLength(settings.boardHeight);
    expect(game.board[0]).toEqual(new Array(settings.boardWidth).fill(1));
    expect(game.board[1]).toEqual(new Array(settings.boardWidth).fill(1));
  });

  it('marks game eliminated and stops loop', () => {
    const game = createGame();
    const stopSpy = jest.spyOn(game, 'stopGame');

    (game as any).GameOver();

    expect(game.isAlive).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
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

  it('broadcasts game over to socket when available', () => {
    const game = createGame();
    const emit = jest.fn();
    (game as any)._socket = { emit };

    (game as any).GameOver();

    expect(emit).toHaveBeenCalledWith('GAME_ENDED', {
      gameId: game.id,
      playerId: game.player.id,
      reason: 'Game Over',
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
    const game = new Game(new Player('socket-sprint'), 123, sprintSettings);
    const emit = jest.fn();
    (game as any)._socket = { emit };

    game.board = Array.from({ length: sprintSettings.boardHeight }, () =>
      new Array(sprintSettings.boardWidth).fill(0),
    );
    game.board[19] = new Array(sprintSettings.boardWidth).fill(1);
    game.board[18] = new Array(sprintSettings.boardWidth).fill(1);
    game.board[17] = new Array(sprintSettings.boardWidth).fill(1);

    (game as any).checkAndClearLines();

    expect(emit).toHaveBeenCalledWith('GAME_ANIMATION', expect.objectContaining({ type: 'LINE_CLEAR' }));
    expect(emit).toHaveBeenCalledWith('GAME_ANIMATION', expect.objectContaining({ type: 'SPEED_BOOST' }));
  });

  it('throttles broadcast and returns null ghost when piece missing', () => {
    const game = createGame();
    const emit = jest.fn();
    (game as any)._socket = { emit };

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    (game as any).broadcastGameState();
    (game as any).broadcastGameState();

    expect(emit).toHaveBeenCalledTimes(1);

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
    const game = new Game(new Player('socket-mult'), 123, sprintSettings);

    expect(game.getSprintGravityMultiplier()).toBe(1);

    game.lines = 10;
    expect(game.getSprintGravityMultiplier()).toBeGreaterThan(1);
  });
});
