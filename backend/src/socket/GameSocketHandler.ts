import { GameMode, GameSettings, SocketEvents } from "@shared/types/game";
import { Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { Logger } from "../utils/helpers";

export function wsGameHandler(socket: Socket) {
	const gameManager = GameManager.getInstance();

	socket.on('PLAYER_INPUT', (payload: SocketEvents<'PLAYER_INPUT'>) => {
		Logger.debug(`Received PLAYER_INPUT from ${socket.id}:`, payload.data);
		const { gameId, input } = payload.data;
		const game = gameManager.getGame(gameId);
		if (game) {
			game.setPlayerInput(input);
		} else {
			Logger.warn(`Game not found: ${gameId}`);
		}
	});

	// Additional socket event handlers for room management
	socket.on('UPDATE_SETTINGS', (data: { roomId: string; settings: GameSettings }) => {
		// TODO: Implement proper settings update logic with room management
		const { roomId, settings } = data;

		// For now, just broadcast the settings update to the room
		if (roomId && settings) {
			socket.to(roomId).emit('SETTINGS_UPDATED', { settings });
			socket.emit('SETTINGS_UPDATED', { settings });
		}
	});

	socket.on('UPDATE_GAME_MODE', (data: { roomId: string; gameMode: GameMode }) => {
		// TODO: Implement proper game mode update logic with room management
		const { roomId, gameMode } = data;

		// For now, just broadcast the game mode update to the room
		if (roomId && gameMode) {
			socket.to(roomId).emit('GAME_MODE_UPDATED', { gameMode });
			socket.emit('GAME_MODE_UPDATED', { gameMode });
		}
	});
}
