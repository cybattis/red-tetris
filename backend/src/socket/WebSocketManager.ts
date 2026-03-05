import { SocketEvents, GameSettings, GameMode } from '../../../shared/types/game.js';
import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { Player } from '../classes/Player.js';
import { GameManager } from '../managers/GameManager.js';
import { RoomManager } from '../managers/RoomManager.js';
import { Logger, toStringFormat } from '../utils/helpers.js';
import { 
  JoinRoomEvent,
  LeaveRoomEvent,
  StartGameEvent,
  RestartGameEvent 
} from '../../../shared/types/room.js';

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
        const leaveResult = roomManager.leaveRoom(socket.id, socket);
        
        if (leaveResult.roomUpdate) {
          // Notify remaining players in room
          const roomId = leaveResult.playerLeft?.roomId;
          if (roomId) {
            socket.to(roomId).emit('ROOM_STATE_UPDATE', leaveResult.roomUpdate);
            socket.to(roomId).emit('PLAYER_LEFT', leaveResult.playerLeft);
            
            if (leaveResult.hostTransfer) {
              socket.to(roomId).emit('HOST_TRANSFER', leaveResult.hostTransfer);
            }
          }
        }
      });
    });
  }

  public close(done?: () => void): void {
    this.io.close(() => done?.());
  }
}

function wsRoomHandler(socket: Socket, io: Server) {
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
    
    Logger.info(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
  });

  socket.on('LEAVE_ROOM', (data: LeaveRoomEvent) => {
    const { roomId } = data;
    
    const result = roomManager.leaveRoom(socket.id, socket);
    
    if (result.roomUpdate) {
      // Notify remaining players
      socket.to(roomId).emit('ROOM_STATE_UPDATE', result.roomUpdate);
    }
    
    if (result.playerLeft) {
      socket.to(roomId).emit('PLAYER_LEFT', result.playerLeft);
    }
    
    if (result.hostTransfer) {
      socket.to(roomId).emit('HOST_TRANSFER', result.hostTransfer);
    }
    
    // Confirm to the leaving player
    socket.emit('LEFT_ROOM', { roomId });
  });

  socket.on('START_GAME', (data: StartGameEvent) => {
    const { roomId, gameSettings } = data;
    
    Logger.info(`[START_GAME] Received from socket ${socket.id} for room ${roomId} with settings:`, gameSettings);
    
    const result = roomManager.startGame(roomId, socket.id, gameSettings);
    
    if (!result.success) {
      Logger.warn(`[START_GAME] Failed for room ${roomId}: ${result.error?.error}`);
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
        console.log('Game ended, room state should be updated for room:', room.id);
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
        isReady 
      });
      socket.emit('PLAYER_READY_STATUS', { 
        playerId, 
        isReady 
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
