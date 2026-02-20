import { describe, expect, it } from '@jest/globals';
import { GameManager } from '../../src/managers/GameManager';
import { Player } from '../../src/classes/Player';
import { GameSettings } from '../../../shared/types/game';

const settings: GameSettings = {
	gravity: 1,
	gameSpeed: 1,
	ghostPiece: true,
	boardWidth: 10,
	boardHeight: 20,
	nextPieceCount: 3,
};

describe('GameManager', () => {
	it('returns the same singleton instance', () => {
		const first = GameManager.getInstance();
		const second = GameManager.getInstance();

		expect(first).toBe(second);
	});

	it('creates, fetches, lists, and removes games', () => {
		const manager = GameManager.getInstance();
		const player = new Player('socket-game-manager');

		const game = manager.createGame(player, settings, 1234);

		expect(manager.getGame(game.id)).toBe(game);
		expect(manager.getAllGames()).toContain(game);

		expect(manager.removeGame(game.id)).toBe(true);
		expect(manager.getGame(game.id)).toBeUndefined();
		expect(manager.removeGame(game.id)).toBe(false);
	});
});
