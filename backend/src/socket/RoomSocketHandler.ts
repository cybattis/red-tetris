import { JoinRoomEvent, LeaveRoomEvent, StartGameEvent, RestartGameEvent } from "@shared/types/room";
import { Player } from "../classes/Player";
import { GameManager } from "../managers/GameManager";
import { RoomManager } from "../managers/RoomManager";
import { Logger } from "../utils/helpers";
import { Server, Socket } from "socket.io";
import { wsManager } from "../server";

export function wsRoomHandler(playerSocket: Socket, io: Server) {
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

		// Send room state to the joining player
		playerSocket.emit('ROOM_STATE_UPDATE', result.roomUpdate);

		// Notify other players in the room about the new player
		if (result.playerJoined) {
			playerSocket.to(roomId).emit('PLAYER_JOINED', result.playerJoined);
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

		if (data.roomUpdated) {
			// Notify remaining players
			playerSocket.to(roomId).emit('ROOM_STATE_UPDATE', data.roomUpdated);
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

		for (const gameId of data.gameIds) {
			const playerSocketIds = wsManager.io.sockets.adapter.rooms.get(roomId);
			if (playerSocketIds) {
				for (const socketId of playerSocketIds) {
					const socket = wsManager.io.sockets.sockets.get(socketId);
					if (socket) {
						socket.emit('GAME_STARTED', { roomInfo: data.roomInfo, gameId });
					}
				}
			}
		}
	});
}
