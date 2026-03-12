import { describe, expect, it } from '@jest/globals';
import { Player } from '../../src/classes/Player';

describe('Player', () => {
  it('initializes id/socketId and default name', () => {
    const socketId = 'socket-123';
    const player = new Player(socketId);

    expect(player.id).toBe(socketId);

    expect(player.socketId).toBe(socketId);
    expect(player.name).toBe('');
  });

  it('toJSON returns only public lobby-safe fields', () => {
    const player = new Player('socket-abc');
    player.name = 'Alex';

    expect(player.toJSON()).toEqual({
      id: player.id,
      name: 'Alex',
    });
  });

  it('toJSON does not expose socketId', () => {
    const player = new Player('private-socket');
    const json = player.toJSON() as Record<string, unknown>;

    expect(json.socketId).toBeUndefined();
  });
});

