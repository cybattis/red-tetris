import { SocketEvents } from '../../../shared/types/game.js';
import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { Player } from '../classes/Player.js';
import { GameManager } from '../managers/GameManager.js';
import { Logger, toStringFormat } from '../utils/helpers.js';

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
      });
    });
  }

  public close(done?: () => void): void {
    this.io.close(() => done?.());
  }
}

function wsRoomHandler(socket: Socket) {
  socket.on('JOIN_ROOM', (data: { roomId: string; playerName: string }) => {
    Logger.debug(`Player ${data.playerName} joining room: ${data.roomId}`);
    
    // For now, just join the socket room and acknowledge
    socket.join(data.roomId);
    
    // Emit success response with basic room data
    socket.emit('GAME_CREATED', {
      success: true,
      roomId: data.roomId,
      players: [{
        id: socket.id,
        name: data.playerName,
        isHost: true,
        isReady: true,
      }],
      currentPlayerId: socket.id,
      gameMode: 'classic',
      settings: {
        gravity: 1,
        gameSpeed: 1,
        ghostPiece: true,
        boardWidth: 10,
        boardHeight: 20,
        nextPieceCount: 3,
      }
    });
    
    Logger.info(`Player ${data.playerName} joined room ${data.roomId}`);
  });

  // Handle ping/pong for latency measurement
  socket.on('ping', (timestamp: number) => {
    socket.emit('pong', timestamp);
  });

  // Legacy room handler for testing
  socket.on('room', (data: any) => {
    Logger.debug(`Received room message: ${data}`);
    socket.emit('message', `Echo: ${data}`);
  });
}

function wsGameHandler(socket: Socket) {
  socket.on('START_GAME', (data: SocketEvents<'START_GAME'>) => {
    Logger.debug(`Received game message: ${toStringFormat(data)}`);

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
    Logger.debug('', toStringFormat(data));

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
    Logger.debug('', toStringFormat(payload));

    const { gameId, input } = payload.data;
    const game = GameManager.getInstance().getGame(gameId)?.setPlayerInput(input);
    if (!game) {
      Logger.warn(`Game not found: ${gameId}`);
    }
  });

  // Additional socket event handlers for room management
  socket.on('UPDATE_SETTINGS', (data: SocketEvents<'UPDATE_SETTINGS'>) => {
    Logger.debug(`Received UPDATE_SETTINGS: ${toStringFormat(data)}`);
    // TODO: Implement settings update logic
    socket.emit('SETTINGS_UPDATED', { settings: data.data.settings });
  });

  socket.on('UPDATE_GAME_MODE', (data: SocketEvents<'UPDATE_GAME_MODE'>) => {
    Logger.debug(`Received UPDATE_GAME_MODE: ${toStringFormat(data)}`);
    // TODO: Implement game mode update logic
    socket.emit('GAME_MODE_UPDATED', { gameMode: data.data.gameMode });
  });

  socket.on('PLAYER_READY', (data: SocketEvents<'PLAYER_READY'>) => {
    Logger.debug(`Received PLAYER_READY: ${toStringFormat(data)}`);
    // TODO: Implement player ready logic
    socket.emit('PLAYER_READY_STATUS', { 
      playerId: data.data.playerId, 
      isReady: data.data.isReady 
    });
  });

  socket.on('CANCEL_START', (data: SocketEvents<'CANCEL_START'>) => {
    Logger.debug(`Received CANCEL_START: ${toStringFormat(data)}`);
    // TODO: Implement cancel start logic
    socket.emit('GAME_START_CANCELED', {});
  });
}
