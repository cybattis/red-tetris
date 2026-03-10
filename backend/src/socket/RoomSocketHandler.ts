import { JoinRoomEvent, LeaveRoomEvent, StartGameEvent, RestartGameEvent } from "@shared/types/room";
import { Player } from "../classes/Player";
import { GameManager } from "../managers/GameManager";
import { RoomManager } from "../managers/RoomManager";
import { Logger } from "../utils/helpers";
import { Server, Socket } from "socket.io";

export function wsRoomHandler(socket: Socket, io: Server) {
	const roomManager = RoomManager.getInstance();

	socket.on('JOIN_ROOM', (data: JoinRoomEvent) => {
		const { roomId, playerName } = data;

		// Create player with socket ID
		const player = new Player(socket.id);
		player.name = playerName;

		// Join room through RoomManager
		const result = roomManager.joinRoom(roomId, player, socket);

		if (!result.success) {
			// Send error to the requesting client
			socket.emit('ROOM_ERROR', result.error);
			return;
		}

		// Send room state to the joining player
		socket.emit('ROOM_STATE_UPDATE', result.roomUpdate);

		// Notify other players in the room about the new player
		if (result.playerJoined) {
			socket.to(roomId).emit('PLAYER_JOINED', result.playerJoined);
		}
	});

	socket.on('LEAVE_ROOM', (event: LeaveRoomEvent) => {
		const { roomId } = event;

		const result = roomManager.leaveRoom(socket.id, socket);
		if (!result.success) {
			socket.emit('ROOM_ERROR', result);
			return;
		}

		const data = result.data;

		if (data.roomDeleted) {
			// Confirm to the leaving player
			socket.emit('LEFT_ROOM', { roomId });
			return;
		}

		if (data.roomUpdated) {
			// Notify remaining players
			socket.to(roomId).emit('ROOM_STATE_UPDATE', data.roomUpdated);
		}

		if (data.playerLeft) {
			socket.to(roomId).emit('PLAYER_LEFT', data.playerLeft);
		}

		if (data.hostTransfer) {
			socket.to(roomId).emit('HOST_TRANSFER', data.hostTransfer);
		}

		// Confirm to the leaving player
		socket.emit('LEFT_ROOM', { roomId });
	});

	socket.on('START_GAME', (data: StartGameEvent) => {
		const { roomId, gameSettings } = data;

		Logger.debug(
			`[START_GAME] Received from socket ${socket.id} for room ${roomId} with settings:`,
			gameSettings,
		);

		const result = roomManager.startGame(roomId, socket.id, gameSettings);
		if (!result.success) {
			Logger.warn(`[START_GAME] Failed for room ${roomId}: ${result.error?.reason}`);
			socket.emit('ROOM_ERROR', result.error);
			return;
		}

		Logger.info(`[START_GAME] Success for room ${roomId}, created ${result.gameIds?.length} games`);

		// Set up socket connections for each created game
		if (result.gameIds && result.roomUpdate) {
			const room = roomManager.getRoom(roomId);
			if (room) {
				const gameManager = GameManager.getInstance();

				// Connect each game to its player's socket
				for (const gameId of result.gameIds) {
					const game = gameManager.getGame(gameId);
					if (game) {
						// Find the socket for this game's player
						const playerSocket = io.sockets.sockets.get(game.player.socketId);
						if (playerSocket) {
							game.setSocket(playerSocket);
							// Emit game started with the specific gameId to this player
							playerSocket.emit('GAME_STARTED', { gameId });
						}
					}
				}
			}

			// Broadcast room state update to all players
			io.to(roomId).emit('ROOM_STATE_UPDATE', result.roomUpdate);
		}
	});

	socket.on('RESTART_GAME', (data: RestartGameEvent) => {
		const { roomId } = data;

		const result = roomManager.resetGame(roomId, socket.id);

		if (!result.success) {
			socket.emit('ROOM_ERROR', result.error);
			return;
		}

		// Broadcast game reset to all players in room
		if (result.roomUpdate) {
			io.to(roomId).emit('ROOM_STATE_UPDATE', result.roomUpdate);
			io.to(roomId).emit('GAME_RESET', { roomId });
		}
	});

	// Handle ping/pong for latency measurement
	socket.on('ping', (timestamp: number) => {
		socket.emit('pong', timestamp);
	});

	// Legacy handlers for backward compatibility - can be removed later
	socket.on('room', (data: any) => {
		socket.emit('message', `Echo: ${data}`);
	});
}
