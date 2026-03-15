import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RoomManager } from '../../src/managers/RoomManager';
import { Player } from '../../src/classes/Player';
import { GameManager } from '../../src/managers/GameManager';
import { ROOM_CONFIG } from '../../../shared/types/room';

function makePlayer(id: string, name: string): Player {
  const player = new Player(id, `socket-${id}`);
  player.name = name;
  return player;
}

function makeSocket() {
  return {
    join: jest.fn(),
    leave: jest.fn(),
  } as any;
}

describe('RoomManager', () => {
  const manager = RoomManager.getInstance();

  const clearRooms = () => {
    const rooms = Array.from((manager as unknown as { _rooms: Map<string, unknown> })._rooms.values());
    for (const room of rooms) {
      manager.deleteRoom(room as any);
    }
  };

  beforeEach(() => {
    clearRooms();
  });

  afterEach(() => {
    clearRooms();
    GameManager.getInstance().stopAllGames();
  });

  it('joins a room, creates it if needed, and maps players', () => {
    const socket = makeSocket();
    const player = makePlayer('player-1', 'Alpha');

    const result = manager.joinRoom('room-1', player, socket);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('expected joinRoom success');
    }
    expect(result.data.roomInfo.id).toBe('room-1');
    expect(result.data.playerJoined?.player.id).toBe(player.id);
    expect(socket.join).toHaveBeenCalledWith('room-1');

    const stats = manager.getRoomStats();
    expect(stats.totalRooms).toBe(1);
    expect(stats.activePlayers).toBe(1);
  });

  it('returns the same room when createRoom is called twice with same id', () => {
    const first = manager.createRoom('room-same');
    const second = manager.createRoom('room-same');
    expect(first).toBe(second);
  });

  it('returns room state for same room and moves player to a new room', () => {
    const socket = makeSocket();
    const player = makePlayer('player-2', 'Beta');

    manager.joinRoom('room-a', player, socket);

    const sameRoom = manager.joinRoom('room-a', player, socket);
    expect(sameRoom.success).toBe(true);
    if (!sameRoom.success) {
      throw new Error('expected sameRoom success');
    }
    expect(sameRoom.data.roomInfo.id).toBe('room-a');

    const newRoom = manager.joinRoom('room-b', player, socket);
    expect(newRoom.success).toBe(true);
    expect(manager.getRoomForPlayer(player.id)?.id).toBe('room-b');
    expect(socket.leave).toHaveBeenCalledWith('room-a');
  });

  it('adds spectators when full and returns errors when spectator limit is reached', () => {
    const roomId = 'room-full';
    const socket = makeSocket();

    manager.joinRoom(roomId, makePlayer('p1', 'Host'), socket);
    manager.joinRoom(roomId, makePlayer('p2', 'Guest'), socket);

    const spectatorResult = manager.joinRoom(roomId, makePlayer('p3', 'Spec'), socket);
    expect(spectatorResult.success).toBe(true);
    if (!spectatorResult.success) {
      throw new Error('expected spectator join success');
    }
    expect(spectatorResult.data.playerJoined?.player.isSpectator).toBe(true);

    for (let i = 0; i < ROOM_CONFIG.MAX_SPECTATORS - 1; i += 1) {
      manager.joinRoom(roomId, makePlayer(`spec-${i}`, `Spec${i}`), socket);
    }

    const overflow = manager.joinRoom(roomId, makePlayer('spec-over', 'Overflow'), socket);
    expect(overflow.success).toBe(false);
    if (overflow.success) {
      throw new Error('expected overflow error');
    }
    expect(overflow.error.code).toBe('ROOM_FULL');
  });

  it('enforces host rules for start and reset', () => {
    const roomId = 'room-host';
    const socket = makeSocket();
    const host = makePlayer('host-1', 'Host');
    const guest = makePlayer('guest-1', 'Guest');

    manager.joinRoom(roomId, host, socket);
    manager.joinRoom(roomId, guest, socket);

    const notHostStart = manager.startGame(roomId, guest.id, undefined);
    expect(notHostStart.success).toBe(false);
    if (notHostStart.success) {
      throw new Error('expected notHostStart error');
    }
    expect(notHostStart.error.code).toBe('NOT_HOST');

    const startResult = manager.startGame(roomId, host.id, undefined);
    expect(startResult.success).toBe(true);
    if (!startResult.success) {
      throw new Error('expected startResult success');
    }
    expect(startResult.data.roomInfo.id).toBe(roomId);

    const notHostReset = manager.resetGame(roomId, guest.id);
    expect(notHostReset.success).toBe(false);
    if (notHostReset.success) {
      throw new Error('expected notHostReset error');
    }
    expect(notHostReset.error.code).toBe('NOT_HOST');

    const room = manager.getRoom(roomId);
    room?.endGame();

    const resetResult = manager.resetGame(roomId, host.id);
    expect(resetResult.success).toBe(true);
  });

  it('returns errors for missing room and handles game end', () => {
    const missingStart = manager.startGame('missing-room', 'host', undefined);
    expect(missingStart.success).toBe(false);
    if (missingStart.success) {
      throw new Error('expected missingStart error');
    }
    expect(missingStart.error.code).toBe('ROOM_NOT_FOUND');

    const missingReset = manager.resetGame('missing-room', 'host');
    expect(missingReset.success).toBe(false);
    if (missingReset.success) {
      throw new Error('expected missingReset error');
    }
    expect(missingReset.error.code).toBe('ROOM_NOT_FOUND');

    const missingEnd = manager.endGame('missing-room', 'player', 'lost');
    expect(missingEnd.success).toBe(false);
    if (missingEnd.success) {
      throw new Error('expected missingEnd error');
    }
    expect(missingEnd.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('propagates room-level start/end/reset failures with mapped error codes', () => {
    const roomId = 'room-errors';
    const socket = makeSocket();
    const host = makePlayer('host-err', 'Host');

    manager.joinRoom(roomId, host, socket);
    const room = manager.getRoom(roomId);
    if (!room) {
      throw new Error('expected room to exist');
    }

    const startSpy = jest.spyOn(room, 'startGame').mockReturnValue({
      success: false,
      error: {
        roomId,
        reason: 'Game already in progress',
        code: 'ALREADY_PLAYING',
      },
    });

    const startResult = manager.startGame(roomId, host.id, undefined);
    expect(startResult.success).toBe(false);
    if (startResult.success) {
      throw new Error('expected startResult failure');
    }
    expect(startResult.error.code).toBe('ALREADY_PLAYING');
    startSpy.mockRestore();

    const endSpy = jest.spyOn(room, 'handlePlayerGameEnd').mockReturnValue({
      success: false,
      reason: 'Player not found',
    });

    const endResult = manager.endGame(roomId, host.id, 'lost');
    expect(endResult.success).toBe(false);
    if (endResult.success) {
      throw new Error('expected endResult failure');
    }
    expect(endResult.error.code).toBe('ROOM_NOT_FOUND');
    endSpy.mockRestore();

    const resetSpy = jest.spyOn(room, 'resetGame').mockReturnValue({
      success: false,
      reason: 'Only host can reset the game',
    });

    const resetResult = manager.resetGame(roomId, host.id);
    expect(resetResult.success).toBe(false);
    if (resetResult.success) {
      throw new Error('expected resetResult failure');
    }
    expect(resetResult.error.code).toBe('NOT_HOST');
    resetSpy.mockRestore();
  });

  it('parses room urls and finds rooms by player id', () => {
    expect(RoomManager.parseRoomUrl('/room123/player1')).toEqual({
      roomId: 'room123',
      playerName: 'player1',
    });
    expect(RoomManager.parseRoomUrl('/bad$/player')).toBeNull();
    expect(RoomManager.parseRoomUrl('/room123/p$')).toBeNull();
    expect(RoomManager.parseRoomUrl('/room/too/many')).toBeNull();

    const socket = makeSocket();
    const player = makePlayer('player-9', 'Gamma');
    manager.joinRoom('room-find', player, socket);

    const found = manager.findRoomByPlayerId(player.id);
    expect(found?.id).toBe('room-find');
    expect(manager.findRoomByPlayerId('missing')).toBeNull();

    const gameEnd = manager.endGame('room-find', player.id, 'lost');
    expect(gameEnd.success).toBe(true);
    if (!gameEnd.success) {
      throw new Error('expected gameEnd success');
    }
    expect(gameEnd.data.roomInfo.id).toBe('room-find');
  });

  it('maps all known room error reasons to expected codes', () => {
    const managerAny = manager as unknown as { getErrorCode: (reason: string) => string };

    expect(managerAny.getErrorCode('room is full')).toBe('ROOM_FULL');
    expect(managerAny.getErrorCode('not found')).toBe('ROOM_NOT_FOUND');
    expect(managerAny.getErrorCode('already joined')).toBe('PLAYER_EXISTS');
    expect(managerAny.getErrorCode('in progress')).toBe('GAME_IN_PROGRESS');
    expect(managerAny.getErrorCode('only host')).toBe('NOT_HOST');
    expect(managerAny.getErrorCode('unknown reason')).toBe('ROOM_NOT_FOUND');
  });

  it('cleans up empty rooms', () => {
    manager.createRoom('empty-room');
    manager.createRoom('empty-room-2');

    const cleaned = manager.cleanupEmptyRooms();
    expect(cleaned).toBe(2);
    const remaining = Array.from((manager as unknown as { _rooms: Map<string, unknown> })._rooms.values());
    expect(remaining.length).toBe(0);
  });
});
