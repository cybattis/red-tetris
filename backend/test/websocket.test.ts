import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { server, wsManager } from '../src/server.js';
import { GameAction, GameMode, GameSettings } from '../../shared/types/game.js';
import { ROOM_CONFIG } from '../../shared/types/room.js';
import { RoomManager } from '../src/managers/RoomManager.js';
import { Logger } from '../src/utils/helpers.js';

describe('WebSocketManager Class', () => {
  let clientSocket: ClientSocket;
  let extraSockets: ClientSocket[];
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    port = (server.address() as AddressInfo).port;
    server.unref();
  });

  beforeEach(() => {
    extraSockets = [];
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
      if (clientSocket.connected) clientSocket.disconnect();
      clientSocket.close();
    }
    for (const socket of extraSockets) {
      socket.removeAllListeners();
      if (socket.connected) socket.disconnect();
      socket.close();
    }
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

  test('should respond to ping with pong', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const pingTimestamp = Date.now();

    clientSocket.on('connect', () => {
      clientSocket.emit('ping', pingTimestamp);
    });

    clientSocket.on('pong', (timestamp) => {
      expect(timestamp).toBe(pingTimestamp);
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
        gameId,
        playerId: clientSocket.id,
        input: GameAction.SOFT_DROP,
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

  test('should handle room leave and settings events', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const hostSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const guestSocket = Client(`http://localhost:${port}`, { reconnection: false });
    extraSockets.push(hostSocket, guestSocket);

    let hostJoined = false;
    let guestJoined = false;
    let guestJoinSent = false;
    let settingsReceived = false;
    let modeReceived = false;
    let leftRoomReceived = false;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      done(error);
    };

    const maybeLeave = () => {
      if (settingsReceived && modeReceived && guestJoined) {
        guestSocket.emit('LEAVE_ROOM', { roomId });
      }
    };

    const maybeDone = () => {
      if (settingsReceived && modeReceived && leftRoomReceived) {
        finish();
      }
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('JOIN_ROOM', { roomId, playerName: 'Host' });
    });

    guestSocket.on('connect', () => {
      if (hostJoined && !guestJoinSent) {
        guestJoinSent = true;
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    hostSocket.on('ROOM_STATE_UPDATE', () => {
      hostJoined = true;
      if (guestSocket.connected && !guestJoinSent) {
        guestJoinSent = true;
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('ROOM_STATE_UPDATE', () => {
      if (guestJoined) return;
      guestJoined = true;
      hostSocket.emit('UPDATE_SETTINGS', { roomId, settings: { gameMode: GameMode.Classic } });
      hostSocket.emit('UPDATE_GAME_MODE', { roomId, gameMode: GameMode.Classic });
    });

    guestSocket.on('SETTINGS_UPDATED', ({ settings }) => {
      expect(settings?.gameMode).toBe(GameMode.Classic);
      settingsReceived = true;
      maybeLeave();
      maybeDone();
    });

    guestSocket.on('GAME_MODE_UPDATED', ({ gameMode }) => {
      expect(gameMode).toBe(GameMode.Classic);
      modeReceived = true;
      maybeLeave();
      maybeDone();
    });

    guestSocket.on('LEFT_ROOM', ({ roomId: leftRoomId }) => {
      expect(leftRoomId).toBe(roomId);
      leftRoomReceived = true;
      maybeDone();
    });

    hostSocket.on('ROOM_ERROR', (error) => finish(new Error(error?.reason ?? 'ROOM_ERROR')));
    guestSocket.on('ROOM_ERROR', (error) => finish(new Error(error?.reason ?? 'ROOM_ERROR')));
    hostSocket.on('connect_error', (error) => finish(error));
    guestSocket.on('connect_error', (error) => finish(error));
  });

  test('should broadcast PLAYER_JOINED to existing room members', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const hostSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const guestSocket = Client(`http://localhost:${port}`, { reconnection: false });
    extraSockets.push(hostSocket, guestSocket);

    let hostReady = false;
    let guestReady = false;
    let guestJoinSent = false;
    let joinedEventReceived = false;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      done(error);
    };

    const maybeDone = () => {
      if (hostReady && guestReady && joinedEventReceived) {
        finish();
      }
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('JOIN_ROOM', { roomId, playerName: 'Host' });
    });

    hostSocket.on('ROOM_STATE_UPDATE', () => {
      hostReady = true;
      if (!guestSocket.connected || guestJoinSent) return;
      guestJoinSent = true;
      guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      maybeDone();
    });

    guestSocket.on('connect', () => {
      if (!hostReady || guestJoinSent) return;
      guestJoinSent = true;
      guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
    });

    guestSocket.on('ROOM_STATE_UPDATE', () => {
      guestReady = true;
      maybeDone();
    });

    hostSocket.on('PLAYER_JOINED', (payload) => {
      expect(payload?.player?.name).toBe('Guest');
      joinedEventReceived = true;
      maybeDone();
    });

    hostSocket.on('connect_error', (error) => finish(error));
    guestSocket.on('connect_error', (error) => finish(error));
  });

  test('should return ROOM_ERROR when non-host tries to start game', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const hostSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const guestSocket = Client(`http://localhost:${port}`, { reconnection: false });
    extraSockets.push(hostSocket, guestSocket);

    let hostReady = false;
    let guestJoined = false;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      done(error);
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('JOIN_ROOM', { roomId, playerName: 'Host' });
    });

    hostSocket.on('ROOM_STATE_UPDATE', () => {
      hostReady = true;
      if (guestSocket.connected && !guestJoined) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('connect', () => {
      if (hostReady) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('ROOM_STATE_UPDATE', () => {
      if (guestJoined) return;
      guestJoined = true;
      guestSocket.emit('START_GAME', { roomId, gameSettings: { gameMode: GameMode.Classic } });
    });

    guestSocket.on('ROOM_ERROR', (error) => {
      expect(error?.code).toBe('NOT_HOST');
      finish();
    });

    hostSocket.on('connect_error', (error) => finish(error));
    guestSocket.on('connect_error', (error) => finish(error));
  });

  test('should notify remaining player when another player leaves', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const hostSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const guestSocket = Client(`http://localhost:${port}`, { reconnection: false });
    extraSockets.push(hostSocket, guestSocket);

    let hostReady = false;
    let guestJoined = false;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      done(error);
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('JOIN_ROOM', { roomId, playerName: 'Host' });
    });

    hostSocket.on('ROOM_STATE_UPDATE', () => {
      hostReady = true;
      if (guestSocket.connected && !guestJoined) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('connect', () => {
      if (hostReady) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('ROOM_STATE_UPDATE', () => {
      if (guestJoined) return;
      guestJoined = true;
      guestSocket.emit('LEAVE_ROOM', { roomId });
    });

    hostSocket.on('PLAYER_LEFT', (payload) => {
      expect(typeof payload?.playerId).toBe('string');
      finish();
    });

    hostSocket.on('connect_error', (error) => finish(error));
    guestSocket.on('connect_error', (error) => finish(error));
  });

  test('should log an error when PLAYER_INPUT references a missing game', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const finish = (error?: Error) => {
      errorSpy.mockRestore();
      done(error);
    };

    clientSocket.on('connect', () => {
      clientSocket.emit('PLAYER_INPUT', {
        gameId: 'missing-game-id',
        playerId: clientSocket.id,
        input: GameAction.MOVE_LEFT,
      });

      setTimeout(() => {
        try {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('No active game found for player'),
            expect.objectContaining({ gameId: 'missing-game-id' }),
          );
          finish();
        } catch (error) {
          finish(error as Error);
        }
      }, 30);
    });

    clientSocket.on('connect_error', (error) => {
      finish(error);
    });
  });

  test('should emit HOST_TRANSFER when the host leaves', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const hostSocket = Client(`http://localhost:${port}`, { reconnection: false });
    const guestSocket = Client(`http://localhost:${port}`, { reconnection: false });
    extraSockets.push(hostSocket, guestSocket);

    let hostReady = false;
    let guestJoined = false;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      done(error);
    };

    hostSocket.on('connect', () => {
      hostSocket.emit('JOIN_ROOM', { roomId, playerName: 'Host' });
    });

    hostSocket.on('ROOM_STATE_UPDATE', () => {
      hostReady = true;
      if (guestSocket.connected && !guestJoined) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('connect', () => {
      if (hostReady && !guestJoined) {
        guestSocket.emit('JOIN_ROOM', { roomId, playerName: 'Guest' });
      }
    });

    guestSocket.on('ROOM_STATE_UPDATE', () => {
      if (guestJoined) return;
      guestJoined = true;
      hostSocket.emit('LEAVE_ROOM', { roomId });
    });

    guestSocket.on('HOST_TRANSFER', (payload) => {
      expect(payload?.newHostId).toBe(guestSocket.id);
      finish();
    });

    hostSocket.on('connect_error', (error) => finish(error));
    guestSocket.on('connect_error', (error) => finish(error));
  });

  test('should emit ROOM_ERROR when join fails because room is full', async () => {
    const roomId = `test-room-${Date.now()}`;
    const sockets: ClientSocket[] = [];

    const createClient = async () =>
      await new Promise<ClientSocket>((resolve, reject) => {
        const socket = Client(`http://localhost:${port}`, { reconnection: false });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (error) => reject(error));
      });

    const joinRoom = async (socket: ClientSocket, playerName: string) =>
      await new Promise<void>((resolve, reject) => {
        const onState = () => {
          socket.off('ROOM_ERROR', onError);
          resolve();
        };
        const onError = (error: { code?: string; reason?: string }) => {
          socket.off('ROOM_STATE_UPDATE', onState);
          reject(new Error(error?.code || error?.reason || 'ROOM_ERROR'));
        };
        socket.once('ROOM_STATE_UPDATE', onState);
        socket.once('ROOM_ERROR', onError);
        socket.emit('JOIN_ROOM', { roomId, playerName });
      });

    // 2 players
    for (let i = 0; i < ROOM_CONFIG.MAX_PLAYERS; i++) {
      const socket = await createClient();
      sockets.push(socket);
      extraSockets.push(socket);
      await joinRoom(socket, `Player${i + 1}`);
    }

    // 10 spectators
    for (let i = 0; i < ROOM_CONFIG.MAX_SPECTATORS; i++) {
      const socket = await createClient();
      sockets.push(socket);
      extraSockets.push(socket);
      await joinRoom(socket, `Spectator${i + 1}`);
    }

    // one extra should fail
    const overflowSocket = await createClient();
    sockets.push(overflowSocket);
    extraSockets.push(overflowSocket);

    await new Promise<void>((resolve, reject) => {
      overflowSocket.once('ROOM_STATE_UPDATE', () => {
        reject(new Error('Expected ROOM_ERROR but got ROOM_STATE_UPDATE'));
      });
      overflowSocket.once('ROOM_ERROR', (error: { code?: string }) => {
        try {
          expect(error?.code).toBe('ROOM_FULL');
          resolve();
        } catch (assertionError) {
          reject(assertionError as Error);
        }
      });

      overflowSocket.emit('JOIN_ROOM', { roomId, playerName: 'Overflow' });
    });
  });

  test('should acknowledge leave when last player removes the room', (done) => {
    const roomId = `test-room-${Date.now()}`;
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    const finish = (error?: Error) => done(error);

    clientSocket.on('connect', () => {
      clientSocket.emit('JOIN_ROOM', { roomId, playerName: 'Solo' });
    });

    clientSocket.on('ROOM_STATE_UPDATE', () => {
      clientSocket.emit('LEAVE_ROOM', { roomId });
    });

    clientSocket.on('LEFT_ROOM', (payload) => {
      expect(payload?.roomId).toBe(roomId);
      finish();
    });

    clientSocket.on('ROOM_ERROR', (error) => finish(new Error(error?.reason ?? 'ROOM_ERROR')));
    clientSocket.on('connect_error', (error) => finish(error));
  });

  test('should cleanup room on disconnect when it becomes empty', (done) => {
    const roomId = `test-room-${Date.now()}`;
    const roomManager = RoomManager.getInstance();
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    const finish = (error?: Error) => done(error);

    clientSocket.on('connect', () => {
      clientSocket.emit('JOIN_ROOM', { roomId, playerName: 'Solo' });
    });

    clientSocket.on('ROOM_STATE_UPDATE', () => {
      expect(roomManager.getRoom(roomId)).not.toBeNull();

      clientSocket.disconnect();
      clientSocket.close();

      setTimeout(() => {
        try {
          expect(roomManager.getRoom(roomId)).toBeNull();
          finish();
        } catch (error) {
          finish(error as Error);
        }
      }, 50);
    });

    clientSocket.on('connect_error', (error) => finish(error));
  });

  test('should resolve sockets via getSocketById', (done) => {
    clientSocket = Client(`http://localhost:${port}`, { reconnection: false });

    clientSocket.on('connect', () => {
      if (!clientSocket.id) {
        done(new Error('Expected connected socket id'));
        return;
      }

      const found = wsManager.getSocketById(clientSocket.id);
      expect(found?.id).toBe(clientSocket.id);
      expect(wsManager.getSocketById('missing-socket-id')).toBeUndefined();
      done();
    });

    clientSocket.on('connect_error', (error) => done(error));
  });
});
