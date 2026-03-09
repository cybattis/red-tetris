import { afterAll, afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { server, wsManager } from '../src/server.js';
import { GameAction, GameMode, GameSettings } from '../../shared/types/game.js';
import { RoomManager } from '../src/managers/RoomManager.js';
import { GameManager } from '../src/managers/GameManager.js';

describe('WebSocketManager Class', () => {
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    port = (server.address() as AddressInfo).port;
    server.unref();
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      if (clientSocket.connected) clientSocket.disconnect();
      clientSocket.close();
    }
    GameManager.getInstance().stopAllGames();
  });

  afterAll(async () => {
    wsManager.io.disconnectSockets(true);
    await new Promise<void>((resolve) => {
      wsManager.close(() => resolve());
    });
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  test('should accept WebSocket client connections', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should echo message events', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });
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

  test('should start a game through socket events', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    const roomId = `test-room-${Date.now()}`;
    let startRequested = false;

    const gameSettings: GameSettings = {
      gameMode: GameMode.Classic,
      gravity: 1,
      ghostPiece: true,
      boardWidth: 10,
      boardHeight: 20,
      nextPieceCount: 3,
    };

    clientSocket.on('connect', () => {
      clientSocket.emit('JOIN_ROOM', { roomId, playerName: 'Tester' });
    });

    clientSocket.on('ROOM_STATE_UPDATE', () => {
      if (startRequested) return;
      startRequested = true;
      clientSocket.emit('START_GAME', { roomId, gameSettings });
    });

    clientSocket.on('GAME_STARTED', ({ gameId }) => {
      expect(typeof gameId).toBe('string');
      expect(gameId.length).toBeGreaterThan(0);

      clientSocket.emit('PLAYER_INPUT', {
        message: 'PLAYER_INPUT',
        data: {
          gameId,
          input: GameAction.SOFT_DROP,
        },
      });

      done();
    });

    clientSocket.on('ROOM_ERROR', (error) => {
      done(new Error(error?.error ?? 'ROOM_ERROR'));
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should handle room leave and misc events', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    const roomId = `test-room-${Date.now()}`;
    const roomManager = RoomManager.getInstance();
    const expectedEvents = new Set([
      'LEFT_ROOM',
      'pong',
      'SETTINGS_UPDATED',
      'GAME_MODE_UPDATED',
      'PLAYER_READY_STATUS',
      'GAME_START_CANCELED',
    ]);
    const receivedEvents = new Set<string>();
    let finished = false;
    const pingTimestamp = Date.now();

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      roomManager.deleteRoom(roomId);
      done(error);
    };

    const maybeDone = () => {
      if (receivedEvents.size === expectedEvents.size) {
        finish();
      }
    };

    clientSocket.on('connect', () => {
      clientSocket.emit('JOIN_ROOM', { roomId, playerName: 'Tester' });
    });

    clientSocket.on('ROOM_STATE_UPDATE', () => {
      clientSocket.emit('LEAVE_ROOM', { roomId });
    });

    clientSocket.on('LEFT_ROOM', () => {
      receivedEvents.add('LEFT_ROOM');

      clientSocket.emit('ping', pingTimestamp);
      clientSocket.emit('UPDATE_SETTINGS', { roomId, settings: { gameMode: GameMode.Classic } });
      clientSocket.emit('UPDATE_GAME_MODE', { roomId, gameMode: GameMode.Classic });
      clientSocket.emit('PLAYER_READY', { roomId, playerId: 'tester', isReady: true });
      clientSocket.emit('CANCEL_START', { roomId });
      clientSocket.emit('STOP_GAME', { message: 'STOP_GAME', data: { gameId: 'missing' } });
      clientSocket.emit('PLAYER_INPUT', {
        message: 'PLAYER_INPUT',
        data: { gameId: 'missing', input: GameAction.SOFT_DROP },
      });
      clientSocket.emit('GAME_ENDED', { gameId: 'missing', playerId: 'missing', reason: 'lost' });

      maybeDone();
    });

    clientSocket.on('pong', (timestamp) => {
      expect(timestamp).toBe(pingTimestamp);
      receivedEvents.add('pong');
      maybeDone();
    });

    clientSocket.on('SETTINGS_UPDATED', ({ settings }) => {
      expect(settings?.gameMode).toBe(GameMode.Classic);
      receivedEvents.add('SETTINGS_UPDATED');
      maybeDone();
    });

    clientSocket.on('GAME_MODE_UPDATED', ({ gameMode }) => {
      expect(gameMode).toBe(GameMode.Classic);
      receivedEvents.add('GAME_MODE_UPDATED');
      maybeDone();
    });

    clientSocket.on('PLAYER_READY_STATUS', ({ playerId, isReady }) => {
      expect(playerId).toBe('tester');
      expect(isReady).toBe(true);
      receivedEvents.add('PLAYER_READY_STATUS');
      maybeDone();
    });

    clientSocket.on('GAME_START_CANCELED', () => {
      receivedEvents.add('GAME_START_CANCELED');
      maybeDone();
    });

    clientSocket.on('ROOM_ERROR', (error) => {
      finish(new Error(error?.error ?? 'ROOM_ERROR'));
    });

    clientSocket.on('connect_error', (error) => {
      finish(error);
    });
  });
});
