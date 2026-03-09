import { describe, expect, it } from '@jest/globals';
import { Player } from '../../src/classes/Player';

describe('Player', () => {
  it('initializes with generated id, socketId, and default flags', () => {
    const socketId = 'socket-123';
    const player = new Player(socketId);

    expect(player.id).toBeDefined();
    expect(typeof player.id).toBe('string');
    expect(player.id.length).toBeGreaterThan(0);

    expect(player.socketId).toBe(socketId);
    expect(player.name).toBe('');
    expect(player.isHost).toBe(false);
    expect(player.isReady).toBe(false);
  });

  it('toJSON returns only public lobby-safe fields', () => {
    const player = new Player('socket-abc');
    player.name = 'Alex';
    player.isHost = true;
    player.isReady = true;

    expect(player.toJSON()).toEqual({
      id: player.id,
      name: 'Alex',
      isHost: true,
      isReady: true,
    });
  });

  it('toJSON does not expose socketId', () => {
    const player = new Player('private-socket');
    const json = player.toJSON() as Record<string, unknown>;

    expect(json.socketId).toBeUndefined();
  });
});

