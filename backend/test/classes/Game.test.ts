import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Game } from '../../src/classes/Game';
import { Player } from '../../src/classes/Player';
import { Piece } from '../../src/classes/Piece';
import { GameAction, GameSettings, GameState } from '../../../shared/types/game';
import { PieceType } from '../../src/types/piece';

const settings: GameSettings = {
	gravity: 1,
	gameSpeed: 1,
	ghostPiece: true,
	boardWidth: 10,
	boardHeight: 20,
	nextPieceCount: 3,
};

function createGame(seed = 123): Game {
	return new Game(new Player('socket-game'), settings, seed);
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
		expect(currentPiece.position).toEqual({ x: Math.floor(settings.boardWidth / 2), y: -1 });
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
		(game as any)._currentPiece = new Piece(PieceType.T);
		(game as any)._currentPiece.position = { x: 1, y: 0 };

		game.setPlayerInput(GameAction.MOVE_LEFT);
		(game as any).playerInput();
		expect((game as any)._currentPiece.position.x).toBe(0);

		game.setPlayerInput(GameAction.MOVE_LEFT);
		(game as any).playerInput();
		expect((game as any)._currentPiece.position.x).toBe(0);

		game.setPlayerInput(GameAction.ROTATE_CW);
		const beforeRotation = JSON.stringify((game as any)._currentPiece.shape);
		(game as any).playerInput();
		expect(JSON.stringify((game as any)._currentPiece.shape)).not.toBe(beforeRotation);

		game.setPlayerInput(GameAction.SOFT_DROP);
		(game as any).playerInput();
		expect((game as any)._currentPiece.position.y).toBe(1);
	});

	it('hard-drops piece until collision', () => {
		const game = createGame();
		(game as any)._currentPiece = new Piece(PieceType.I);
		(game as any)._currentPiece.position = { x: 0, y: -1 };

		game.setPlayerInput(GameAction.HARD_DROP);
		(game as any).playerInput();

		expect((game as any)._currentPiece.position.y).toBe(settings.boardHeight - 1);
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

		(game as any).eliminate();

		expect(game.isAlive).toBe(false);
		expect(stopSpy).toHaveBeenCalled();
	});

	it('runs gameloop gravity and dead-player path', () => {
		const game = createGame();
		(game as any)._currentPiece = new Piece(PieceType.T);
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
});
