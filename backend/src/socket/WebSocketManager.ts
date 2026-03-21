import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager.js';
import { Logger } from '../utils/helpers.js';
import { wsRoomHandler } from './RoomSocketHandler.js';
import { wsGameHandler } from './GameSocketHandler.js';
import { GameHistoryManager } from '../managers/GameHistoryManager';
import { HistoryPayload } from '@shared/types/game';

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

      wsRoomHandler(socket);
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
        const roomId = data?.roomInfo?.id || data?.roomId;
        if (!roomId) {
          return;
        }

        if (data.roomDeleted) {
          // Confirm to the leaving player
          socket.emit('LEFT_ROOM', { roomId });
          return;
        }

        if (data.roomInfo) {
          // Notify remaining players
          socket.to(roomId).emit('ROOM_STATE_UPDATE', data.roomInfo);
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

      // Handle ping/pong for latency measurement
      socket.on('ping', (timestamp: number) => {
        socket.emit('pong', timestamp);
      });

      socket.on('HISTORY', () => {
        Logger.debug(`Received HISTORY request from ${socket.id}`);
        // For now, just echo back the payload as a placeholder
        const gameHistories = GameHistoryManager.getInstance().gameHistories;
        const gamesPerScore = GameHistoryManager.getInstance().gameHistoriesPerScore;

        const payload: HistoryPayload = {
          recentGames: gameHistories,
          topScores: gamesPerScore,
        };

        socket.emit('HISTORY_RESPONSE', { history: payload });
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

  public getSocketById(socketId: string): Socket | undefined {
    return this.io.sockets.sockets.get(socketId);
  }
}
