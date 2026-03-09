import { afterEach, describe, expect, it } from '@jest/globals';
import { Room } from '../../src/classes/Room';
import { Player } from '../../src/classes/Player';
import { GameManager } from '../../src/managers/GameManager';

function makePlayer(id: string, name: string): Player {
  const player = new Player(id);
  player.name = name;
  return player;
}

describe('Room', () => {
  afterEach(() => {
    GameManager.getInstance().stopAllGames();
  });

  it('adds players, sets host, and adds spectators when full', () => {
    const room = new Room('room-add');
    const host = makePlayer('p1', 'Host');
    const guest = makePlayer('p2', 'Guest');
    const spectator = makePlayer('p3', 'Spec');

    expect(room.addPlayer(host).success).toBe(true);
    expect(room.hostId).toBe(host.id);

    expect(room.addPlayer(host).success).toBe(false);

    expect(room.addPlayer(guest).success).toBe(true);

    const spectatorResult = room.addPlayer(spectator);
    expect(spectatorResult.success).toBe(true);
    expect(spectatorResult.isSpectator).toBe(true);
    expect(room.spectatorCount).toBe(1);

    room.destroy();
  });

  it('transfers host and returns to waiting when one player remains during game', () => {
    const room = new Room('room-transfer');
    const host = makePlayer('p1', 'Host');
    const guest = makePlayer('p2', 'Guest');

    room.addPlayer(host);
    room.addPlayer(guest);

    const startResult = room.startGame();
    expect(startResult.success).toBe(true);
    expect(room.state).toBe('playing');

    const removeResult = room.removePlayer(host.id);
    expect(removeResult.wasHost).toBe(true);
    expect(removeResult.newHost?.id).toBe(guest.id);
    expect(room.hostId).toBe(guest.id);
    expect(room.state).toBe('waiting');

    expect(room.resetGame().success).toBe(true);
    room.destroy();
  });

  it('blocks start when empty or already playing and enforces reset rules', () => {
    const room = new Room('room-start');

    const emptyStart = room.startGame();
    expect(emptyStart.success).toBe(false);

    const host = makePlayer('p1', 'Host');
    room.addPlayer(host);

    const startResult = room.startGame();
    expect(startResult.success).toBe(true);

    const repeatStart = room.startGame();
    expect(repeatStart.success).toBe(false);

    const resetWhilePlaying = room.resetGame();
    expect(resetWhilePlaying.success).toBe(false);

    room.endGame();
    expect(room.resetGame().success).toBe(true);

    room.destroy();
  });

  it('handles player game end and returns to lobby', () => {
    const room = new Room('room-end');
    const host = makePlayer('p1', 'Host');

    room.addPlayer(host);
    room.startGame();

    const missing = room.handlePlayerGameEnd('missing', 'lost');
    expect(missing.success).toBe(false);

    const result = room.handlePlayerGameEnd(host.id, 'lost');
    expect(result.success).toBe(true);
    expect(room.state).toBe('waiting');

    expect(room.resetGame().success).toBe(true);
    room.destroy();
  });
});
