import { SocketEvents } from '../../../shared/types/game.js';
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
    
    const result = roomManager.startGame(roomId, socket.id, gameSettings);
    
    if (!result.success) {
      socket.emit('ROOM_ERROR', result.error);
      return;
    }
    
    // Broadcast game start to all players in room
    if (result.roomUpdate) {
      io.to(roomId).emit('ROOM_STATE_UPDATE', result.roomUpdate);
      io.to(roomId).emit('GAME_STARTED', { roomId });
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
  socket.on('START_GAME', (data: SocketEvents<'START_GAME'>) => {
    const seed = Date.now(); // For example, use current timestamp as seed
    const player = new Player(socket.id);
    const game = GameManager.getInstance().createGame(
      player,
      {
        gravity: 1,
        gameSpeed: 1,
        ghostPiece: true,
        boardWidth: 10,
        boardHeight: 20,
        nextPieceCount: 5,
      },
      seed,
      socket // Pass the socket to the game
    );

    game.start();

    socket.emit('GAME_STARTED', { gameId: game.id });
  });

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
    const game = GameManager.getInstance().getGame(gameId)?.setPlayerInput(input);
    if (!game) {
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
  socket.on('UPDATE_SETTINGS', (data: SocketEvents<'UPDATE_SETTINGS'>) => {
    // TODO: Implement settings update logic
    socket.emit('SETTINGS_UPDATED', { settings: data.data.settings });
  });

  socket.on('UPDATE_GAME_MODE', (data: SocketEvents<'UPDATE_GAME_MODE'>) => {
    // TODO: Implement game mode update logic
    socket.emit('GAME_MODE_UPDATED', { gameMode: data.data.gameMode });
  });

  socket.on('PLAYER_READY', (data: SocketEvents<'PLAYER_READY'>) => {
    // TODO: Implement player ready logic
    socket.emit('PLAYER_READY_STATUS', { 
      playerId: data.data.playerId, 
      isReady: data.data.isReady 
    });
  });

  socket.on('CANCEL_START', (data: SocketEvents<'CANCEL_START'>) => {
    // TODO: Implement cancel start logic
    socket.emit('GAME_START_CANCELED', {});
  });
}
