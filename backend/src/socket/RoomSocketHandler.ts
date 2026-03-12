import { JoinRoomEvent, LeaveRoomEvent, StartGameEvent } from "@shared/types/room";
import { Player } from "../classes/Player";
import { RoomManager } from "../managers/RoomManager";
import { Logger } from "../utils/helpers";
import { Socket } from "socket.io";
import { wsManager } from "../server";

export function wsRoomHandler(playerSocket: Socket) {
	const roomManager = RoomManager.getInstance();

	playerSocket.on('JOIN_ROOM', (payload: JoinRoomEvent) => {
		const { roomId, playerName } = payload;

		// Create player with socket ID
		const player = new Player(playerSocket.id);
		player.name = playerName;

		// Join room through RoomManager
		const result = roomManager.joinRoom(roomId, player, playerSocket);
		if (!result.success) {
			// Send error to the requesting client
			playerSocket.emit('ROOM_ERROR', result.error);
			return;
		}

		const data = result.data;
		// Send room state to the joining player
		playerSocket.emit('ROOM_STATE_UPDATE', data.roomInfo);

		// Notify other players in the room about the new player
		if (data.playerJoined) {
			playerSocket.to(roomId).emit('PLAYER_JOINED', data.playerJoined);
		}
	});

	playerSocket.on('LEAVE_ROOM', (payload: LeaveRoomEvent) => {
		const { roomId } = payload;

		const result = roomManager.leaveRoom(playerSocket.id, playerSocket);
		if (!result.success) {
			playerSocket.emit('ROOM_ERROR', result);
			return;
		}

		const data = result.data;

		if (data.roomDeleted) {
			// Confirm to the leaving player
			playerSocket.emit('LEFT_ROOM', { roomId });
			return;
		}

		if (data.roomInfo) {
			// Notify remaining players
			playerSocket.to(roomId).emit('ROOM_STATE_UPDATE', data.roomInfo);
		}

		if (data.playerLeft) {
			playerSocket.to(roomId).emit('PLAYER_LEFT', data.playerLeft);
		}

		if (data.hostTransfer) {
			playerSocket.to(roomId).emit('HOST_TRANSFER', data.hostTransfer);
		}

		// Confirm to the leaving player
		playerSocket.emit('LEFT_ROOM', { roomId });
	});

	playerSocket.on('START_GAME', (payload: StartGameEvent) => {
		const { roomId, gameSettings } = payload;

		Logger.debug(
			`[START_GAME] Received from socket ${playerSocket.id} for room ${roomId} with settings:`,
			gameSettings,
		);

		const result = roomManager.startGame(roomId, playerSocket.id, gameSettings);
		if (!result.success) {
			Logger.warn(`[START_GAME] Failed for room ${roomId}: ${result.error?.reason}`);
			playerSocket.emit('ROOM_ERROR', result.error);
			return;
		}

		const data = result.data;
		Logger.info(`[START_GAME] Success for room ${roomId}`);

		const playerSocketIds = wsManager.io.sockets.adapter.rooms.get(roomId);
		if (!playerSocketIds) {
			Logger.error(`[START_GAME] No players found in room ${roomId} after starting game`);
			return;
		}

		const gameIds = result.data.gameIds;

		for (let i = 0; i < playerSocketIds.size; i++) {
			const gameId = gameIds[i];
			const socketId = Array.from(playerSocketIds)[i];
			Logger.debug(`[START_GAME] Emitting GAME_STARTED to socket ${socketId} for game ${gameId}`);
			const socket = wsManager.io.sockets.sockets.get(socketId);
			if (socket) {
				socket.emit('GAME_STARTED', { roomInfo: data.roomInfo, gameId });
			}
		}
	});
}
