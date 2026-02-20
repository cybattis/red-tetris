import { SocketEvents } from '@shared/types/game';
import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { Player } from 'src/classes/Player';
import { gameManager } from 'src/server';
import { ToStringFormat } from 'src/utils/helpers';

export class WebSocketManager {
  public io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
      },
    });
    console.log('WebSocket server initialized');

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      wsRoomHandler(socket);
      wsGameHandler(socket);

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public close(done?: () => void): void {
    this.io.close(() => done?.());
  }
}

function wsRoomHandler(socket: Socket) {
  socket.on('room', (data: any) => {
    console.log(`Received room message: ${data}`);
    socket.emit('message', `Echo: ${data}`);
  });
}

function wsGameHandler(socket: Socket) {
  socket.on('START_GAME', (data: SocketEvents<'START_GAME'>) => {
    console.log(`Received game message: ${ToStringFormat(data)}`);

    const seed = Date.now(); // For example, use current timestamp as seed
    const player = new Player(socket.id);
    const game = gameManager.createGame(player, {
      gravity: 1,
      gameSpeed: 1,
      ghostPiece: true,
      boardWidth: 10,
      boardHeight: 20,
      nextPieceCount: 5,
    }, seed);

    game.start();

    socket.emit('GAME_STARTED', { gameId: game.id });
  });

  socket.on('STOP_GAME', (data: SocketEvents) => {
    console.log(ToStringFormat(data));

    const { gameId } = data.data as { gameId: string };
    const game = gameManager.getGame(gameId);
    if (game) {
      game.stopGame();
      socket.emit('GAME_STOPPED', { gameId });
    } else {
      console.warn(`Game not found: ${gameId}`);
    }
  });

  socket.on('PLAYER_INPUT', (payload: SocketEvents<'PLAYER_INPUT'>) => {
    console.log(ToStringFormat(payload));

    const { gameId, input } = payload.data;
    const game = gameManager.getGame(gameId)?.setPlayerInput(input);
    if (!game) {
      console.warn(`Game not found: ${gameId}`);
    }
  });
}
