import { SocketEvents, GameSettings, GameMode } from '@shared/types/game';
import { Server as HttpServer } from 'node:http';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { GameManager } from '../managers/GameManager.js';
import { RoomManager } from '../managers/RoomManager.js';
import { Logger } from '../utils/helpers.js';
import { wsRoomHandler } from './RoomSocketHandler.js';

export class WebSocketManager {
  public io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
      },
    });
    Logger.info('WebSocket server initialized');

    this.io.on('connection', (socket: Socket) => {
      Logger.info(`Client connected: ${socket.id}`);

      wsRoomHandler(socket, this.io);
      wsGameHandler(socket);

      socket.on('disconnect', () => {
        Logger.info(`Client disconnected: ${socket.id}`);

        // Handle room cleanup on disconnect
        const roomManager = RoomManager.getInstance();
        const result = roomManager.leaveRoom(socket.id, socket);
        if (!result.success) {
          socket.emit('ROOM_ERROR', result);
          return;
        }

        const data = result.data;
        const roomId = data?.roomUpdated?.id || data?.playerLeft?.roomId;
        if (!roomId) {
          Logger.warn(`Could not determine room for disconnected socket: ${socket.id}`);
          return;
        }

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
    });
  }

  public close(done?: () => void): void {
    this.io
      .close(() => done?.())
      .then((r) => {
        Logger.info('WebSocket server closed');
      });
  }
}

function wsGameHandler(socket: Socket) {
  // Remove the START_GAME handler from here as it's now handled by wsRoomHandler
  // The room system manages game creation through rooms

  socket.on('STOP_GAME', (data: SocketEvents) => {
    const { gameId } = data.data as { gameId: string };
    const game = GameManager.getInstance().getGame(gameId);
    if (game) {
      game.stopGame();
      socket.emit('GAME_STOPPED', { gameId });
    } else {
      Logger.warn(`Game not found: ${gameId}`);
    }
  });

  socket.on('PLAYER_INPUT', (payload: SocketEvents<'PLAYER_INPUT'>) => {
    const { gameId, input } = payload.data;
    const game = GameManager.getInstance().getGame(gameId);
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
      const result = roomManager.handleGameEnd(room.id, data.playerId, data.reason);
      if (result.success && result.roomUpdate) {
        // Broadcast room state update to all players in the room
        // For now, we'll rely on the ROOM_STATE_UPDATE being sent elsewhere
        // TODO: Fix the io scope issue to enable proper broadcasting
        Logger.info('Game ended, room state should be updated for room:', room.id);
      }
    }

    // Clean up the game from GameManager
    GameManager.getInstance().removeGame(data.gameId);
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

  socket.on('PLAYER_READY', (data: { roomId: string; playerId: string; isReady: boolean }) => {
    // TODO: Implement proper player ready logic with room management
    const { roomId, playerId, isReady } = data;

    // For now, just broadcast the player ready status to the room
    if (roomId && playerId !== undefined && isReady !== undefined) {
      socket.to(roomId).emit('PLAYER_READY_STATUS', {
        playerId,
        isReady,
      });
      socket.emit('PLAYER_READY_STATUS', {
        playerId,
        isReady,
      });
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
