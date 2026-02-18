import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export class WebSocketManager {
  public io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
      }
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
}

function wsRoomHandler(socket: Socket) {
  socket.on('room', (data: any) => {
    console.log(`Received room message: ${data}`);
    socket.emit('message', `Echo: ${data}`);
  });
}

function wsGameHandler(socket: Socket) {
  socket.on('game', (data: any) => {
    console.log(`Received game message: ${data}`);
    socket.emit('message', `Echo: ${data}`);
  });
}
