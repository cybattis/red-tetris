import { describe, expect, it } from '@jest/globals';
import { Player } from '../../src/classes/Player';

describe('Player', () => {
  it('initializes id/socketId and name from constructor', () => {
    const socketId = 'socket-123';
    const player = new Player(socketId, 'PlayerOne');

    expect(player.id).toBe(socketId);

    expect(player.socketId).toBe(socketId);
    expect(player.name).toBe('PlayerOne');
  });

  it('toJSON returns public lobby-safe fields', () => {
    const player = new Player('socket-abc', 'PlayerTwo');
    player.name = 'Alex';

    expect(player.toJSON()).toEqual({
      id: player.id,
      name: 'Alex',
      isHost: false,
      isSpectator: false,
    });
  });

  it('toJSON does not expose socketId', () => {
    const player = new Player('private-socket', 'PlayerThree');
    const json = player.toJSON() as unknown as Record<string, unknown>;

    expect(json.socketId).toBeUndefined();
  });
});
