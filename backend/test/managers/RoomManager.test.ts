import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RoomManager } from '../../src/managers/RoomManager';
import { Player } from '../../src/classes/Player';
import { GameManager } from '../../src/managers/GameManager';
import { ROOM_CONFIG } from '../../../shared/types/room';

function makePlayer(id: string, name: string): Player {
  const player = new Player(id);
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

  beforeEach(() => {
    for (const room of manager.getAllRooms()) {
      manager.deleteRoom(room.id);
    }
  });

  afterEach(() => {
    for (const room of manager.getAllRooms()) {
      manager.deleteRoom(room.id);
    }
    GameManager.getInstance().stopAllGames();
  });

  it('joins a room, creates it if needed, and maps players', () => {
    const socket = makeSocket();
    const player = makePlayer('player-1', 'Alpha');

    const result = manager.joinRoom('room-1', player, socket);

    expect(result.success).toBe(true);
    expect(result.roomUpdate?.room.id).toBe('room-1');
    expect(result.playerJoined?.player.id).toBe(player.id);
    expect(socket.join).toHaveBeenCalledWith('room-1');

    const stats = manager.getRoomStats();
    expect(stats.totalRooms).toBe(1);
    expect(stats.activePlayers).toBe(1);
  });

  it('returns room state for same room and moves player to a new room', () => {
    const socket = makeSocket();
    const player = makePlayer('player-2', 'Beta');

    manager.joinRoom('room-a', player, socket);

    const sameRoom = manager.joinRoom('room-a', player, socket);
    expect(sameRoom.success).toBe(true);
    expect(sameRoom.roomUpdate?.room.id).toBe('room-a');

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
    expect(spectatorResult.playerJoined?.isSpectator).toBe(true);

    for (let i = 0; i < ROOM_CONFIG.MAX_SPECTATORS - 1; i += 1) {
      manager.joinRoom(roomId, makePlayer(`spec-${i}`, `Spec${i}`), socket);
    }

    const overflow = manager.joinRoom(roomId, makePlayer('spec-over', 'Overflow'), socket);
    expect(overflow.success).toBe(false);
    expect(overflow.error?.code).toBe('ROOM_FULL');
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
    expect(notHostStart.error?.code).toBe('NOT_HOST');

    const startResult = manager.startGame(roomId, host.id, undefined);
    expect(startResult.success).toBe(true);
    expect(startResult.roomUpdate?.room.id).toBe(roomId);

    const notHostReset = manager.resetGame(roomId, guest.id);
    expect(notHostReset.success).toBe(false);
    expect(notHostReset.error?.code).toBe('NOT_HOST');

    const room = manager.getRoom(roomId);
    room?.endGame();

    const resetResult = manager.resetGame(roomId, host.id);
    expect(resetResult.success).toBe(true);
  });

  it('returns errors for missing room and handles game end', () => {
    const missingStart = manager.startGame('missing-room', 'host', undefined);
    expect(missingStart.success).toBe(false);
    expect(missingStart.error?.code).toBe('ROOM_NOT_FOUND');

    const missingReset = manager.resetGame('missing-room', 'host');
    expect(missingReset.success).toBe(false);
    expect(missingReset.error?.code).toBe('ROOM_NOT_FOUND');

    const missingEnd = manager.handleGameEnd('missing-room', 'player', 'lost');
    expect(missingEnd.success).toBe(false);
    expect(missingEnd.error?.code).toBe('ROOM_NOT_FOUND');
  });

  it('parses room urls and finds rooms by player id', () => {
    expect(RoomManager.parseRoomUrl('/room123/player1')).toEqual({
      roomId: 'room123',
      playerName: 'player1',
    });
    expect(RoomManager.parseRoomUrl('/bad$/player')).toBeNull();
    expect(RoomManager.parseRoomUrl('/room/too/many')).toBeNull();

    const socket = makeSocket();
    const player = makePlayer('player-9', 'Gamma');
    manager.joinRoom('room-find', player, socket);

    const found = manager.findRoomByPlayerId(player.id);
    expect(found?.id).toBe('room-find');
    expect(manager.findRoomByPlayerId('missing')).toBeNull();

    const gameEnd = manager.handleGameEnd('room-find', player.id, 'lost');
    expect(gameEnd.success).toBe(true);
    expect(gameEnd.roomUpdate?.room.id).toBe('room-find');
  });

  it('cleans up empty rooms', () => {
    manager.createRoom('empty-room');
    manager.createRoom('empty-room-2');

    const cleaned = manager.cleanupEmptyRooms();
    expect(cleaned).toBe(2);
    expect(manager.getAllRooms().length).toBe(0);
  });
});
