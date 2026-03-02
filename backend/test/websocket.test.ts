import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { server, wsManager, gameManager } from '../src/server.js';
import { GameAction } from '../../shared/types/game.js';

describe('WebSocketManager Class', () => {
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll((done) => {
    server.listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      if (clientSocket.connected) clientSocket.disconnect();
    }
  });

  afterAll((done) => {
    wsManager.close(() => {
      if (server.listening) {
        server.close(done);
      } else {
        done();
      }
    });
  });

  test('should accept WebSocket client connections', (done) => {
    clientSocket = Client(`http://localhost:${port}`);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should echo message events', (done) => {
    clientSocket = Client(`http://localhost:${port}`);
    const testMessage = 'Hello room';

    clientSocket.on('connect', () => {
      clientSocket.emit('room', testMessage);
    });

    clientSocket.on('message', (message) => {
      expect(message).toBe(`Echo: ${testMessage}`);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should start and stop a game through socket events', (done) => {
    clientSocket = Client(`http://localhost:${port}`);

    clientSocket.on('connect', () => {
      clientSocket.emit('START_GAME', { message: 'START_GAME', data: { roomId: 'room-1' } });
    });

    clientSocket.on('GAME_STARTED', ({ gameId }) => {
      expect(typeof gameId).toBe('string');
      expect(gameId.length).toBeGreaterThan(0);

      clientSocket.emit('PLAYER_INPUT', {
        message: 'PLAYER_INPUT',
        data: {
          gameId,
          playerId: clientSocket.id,
          input: GameAction.SOFT_DROP,
        },
      });

      clientSocket.emit('STOP_GAME', { message: 'STOP_GAME', data: { gameId } });
    });

    clientSocket.on('GAME_STOPPED', ({ gameId }) => {
      expect(gameManager.getGame(gameId)).toBeDefined();
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });
});
