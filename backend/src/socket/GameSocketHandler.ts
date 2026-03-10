import { GameMode, GameSettings, SocketEvents } from "@shared/types/game";
import { Socket } from "socket.io";
import { GameManager } from "../managers/GameManager";
import { RoomManager } from "../managers/RoomManager";
import { Logger } from "../utils/helpers";

export function wsGameHandler(socket: Socket) {
	const gameManager = GameManager.getInstance();
	// Remove the START_GAME handler from here as it's now handled by wsRoomHandler
	// The room system manages game creation through rooms

	socket.on('STOP_GAME', (data: SocketEvents) => {
		const { gameId } = data.data as { gameId: string };
		const game = gameManager.getGame(gameId);
		if (game) {
			game.stopGame();
			socket.emit('GAME_STOPPED', { gameId });
		} else {
			Logger.warn(`Game not found: ${gameId}`);
		}
	});

	socket.on('PLAYER_INPUT', (payload: SocketEvents<'PLAYER_INPUT'>) => {
		const { gameId, input } = payload.data;
		const game = gameManager.getGame(gameId);
		if (game) {
			game.setPlayerInput(input);
		} else {
			Logger.warn(`Game not found: ${gameId}`);
		}
	});

	// Handle game ended event (from Game class)
	socket.on('GAME_ENDED', (data: { gameId: string; playerId: string; reason: string }) => {
		Logger.info(`Game ended: ${data.gameId} for player ${data.playerId} - reason: ${data.reason}`);

		const roomManager = RoomManager.getInstance();

		// Find which room this player belongs to
		const room = roomManager.findRoomByPlayerId(data.playerId);
		if (room) {
			// Notify room that game ended
			const result = roomManager.endGame(room.id, data.playerId, data.reason);
			if (result.success && result.roomUpdate) {
				// Broadcast room state update to all players in the room
				// For now, we'll rely on the ROOM_STATE_UPDATE being sent elsewhere
				// TODO: Fix the io scope issue to enable proper broadcasting
				Logger.info('Game ended, room state should be updated for room:', room.id);
			}
		}

		// Clean up the game from GameManager
		gameManager.removeGame(data.gameId);
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

	socket.on('CANCEL_START', (data: { roomId: string }) => {
		// TODO: Implement proper cancel start logic with room management
		const { roomId } = data;

		// For now, just broadcast the game start cancellation to the room
		if (roomId) {
			socket.to(roomId).emit('GAME_START_CANCELED', {});
			socket.emit('GAME_START_CANCELED', {});
		}
	});
}
