import { describe, expect, it, jest } from '@jest/globals';
import { Room } from '../../src/classes/Room';
import { Player } from '../../src/classes/Player';

function makePlayer(id: string, name: string): Player {
  const player = new Player(id, `socket-${id}`);
  player.name = name;
  return player;
}

describe('Room', () => {
  it('adds players, sets host, and adds spectators when full', () => {
    const room = new Room('room-add');
    const host = makePlayer('p1', 'Host');
    const guest = makePlayer('p2', 'Guest');
    const spectator = makePlayer('p3', 'Spec');

    expect(room.addPlayer(host).success).toBe(true);
    expect(room.toRoomInfo().hostId).toBe(host.id);

    expect(room.addPlayer(host).success).toBe(false);

    expect(room.addPlayer(guest).success).toBe(true);

    const spectatorResult = room.addPlayer(spectator);
    expect(spectatorResult.success).toBe(true);
    expect(spectatorResult.isSpectator).toBe(true);
    expect(room.spectatorCount).toBe(1);

    room.destroy();
  });

  it('rejects duplicate player names in the same room', () => {
    const room = new Room('room-duplicate-name');
    const playerOne = makePlayer('p1', 'Alpha');
    const playerTwo = makePlayer('p2', 'alpha');

    expect(room.addPlayer(playerOne).success).toBe(true);

    const duplicateNameResult = room.addPlayer(playerTwo);
    expect(duplicateNameResult.success).toBe(false);
    expect(duplicateNameResult.reason).toBe('Player name already in room');

    room.destroy();
  });

  it('exposes io instance and handles unknown removal/spectator checks', () => {
    const room = new Room('room-basics');
    const host = makePlayer('p1', 'Host');
    const guest = makePlayer('p2', 'Guest');
    const spectator = makePlayer('p3', 'Spec');

    room.addPlayer(host);
    room.addPlayer(guest);
    room.addPlayer(spectator);

    expect(room.io).toBeDefined();
    expect(room.isSpectator(spectator.id)).toBe(true);
    expect(room.removePlayer('missing-id')).toEqual({ wasHost: false, removedFromPlayers: false });

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
    expect(room.toRoomInfo().hostId).toBe(guest.id);
    expect(room.state).toBe('waiting');
    room.destroy();
  });

  it('blocks start when empty or already playing', () => {
    const room = new Room('room-start');

    const emptyStart = room.startGame();
    expect(emptyStart.success).toBe(false);

    const host = makePlayer('p1', 'Host');
    room.addPlayer(host);

    const startResult = room.startGame();
    expect(startResult.success).toBe(true);

    const repeatStart = room.startGame();
    expect(repeatStart.success).toBe(false);

    room.destroy();
  });

  it('relays penalty lines from one player to the opponent in 2-player mode', () => {
    const room = new Room('room-penalty');
    const player1 = makePlayer('p1', 'Player1');
    const player2 = makePlayer('p2', 'Player2');

    room.addPlayer(player1);
    room.addPlayer(player2);

    const startResult = room.startGame();
    expect(startResult.success).toBe(true);

    const games = (room as unknown as { _games: Map<string, any> })._games;
    const game1 = games.get(player1.id);
    const game2 = games.get(player2.id);
    expect(game1).not.toBeNull();
    expect(game2).not.toBeNull();

    // Store player2's board state before penalty
    const boardBefore = JSON.stringify(game2!.board);

    // Emit penalty event from game1 (simulates player1 clearing 3 lines → 2 penalty lines)
    game1!.emit('penaltyLines', { fromPlayerId: player1.id, count: 2 });

    // Player2's board should have changed (penalty lines added at the bottom)
    const boardAfter = JSON.stringify(game2!.board);
    expect(boardAfter).not.toBe(boardBefore);

    // Verify penalty lines at the bottom are fully filled with type 8 blocks (no gaps)
    const height = game2!.settings.boardHeight;
    for (let r = height - 2; r < height; r++) {
      const row = game2!.board[r];
      expect(row.every((c: number) => c === 8)).toBe(true);
    }

    // Player1's board should remain unchanged (no self-penalty)
    const game1Height = game1!.settings.boardHeight;
    const game1BottomRow = game1!.board[game1Height - 1];
    expect(game1BottomRow.every((c: number) => c === 0)).toBe(true);

    room.endGame();
    room.destroy();
  });

  it('does not relay penalty lines to eliminated opponents', () => {
    const room = new Room('room-penalty-elim');
    const player1 = makePlayer('p1', 'Player1');
    const player2 = makePlayer('p2', 'Player2');

    room.addPlayer(player1);
    room.addPlayer(player2);

    const startResult = room.startGame();
    expect(startResult.success).toBe(true);

    const games = (room as unknown as { _games: Map<string, any> })._games;
    const game2 = games.get(player2.id);
    expect(game2).not.toBeNull();

    // Mark player2 as eliminated
    game2!.isAlive = false;

    const boardBefore = JSON.stringify(game2!.board);

    // Emit penalty from player1
    const game1 = games.get(player1.id);
    game1!.emit('penaltyLines', { fromPlayerId: player1.id, count: 2 });

    // Player2's board should not change since they're eliminated
    expect(JSON.stringify(game2!.board)).toBe(boardBefore);

    room.endGame();
    room.destroy();
  });

  it('broadcasts GAME_ENDED and ends room when a game emits gameOver', () => {
    const room = new Room('room-game-over');
    const player = makePlayer('p1', 'Host');
    room.addPlayer(player);

    const emit = jest.fn(() => true);
    (room as any)._io = {
      to: () => ({ emit }),
    };

    const endGameSpy = jest.spyOn(room, 'endGame');
    const started = room.startGame();
    expect(started.success).toBe(true);

    const games = (room as unknown as { _games: Map<string, any> })._games;
    const game = games.get(player.id);
    expect(game).not.toBeNull();
    game!.emit('gameOver', { roomId: room.id, playerId: player.id });

    expect(emit).toHaveBeenCalledWith('GAME_ENDED', expect.objectContaining({ looserId: player.id }));
    expect(endGameSpy).toHaveBeenCalled();


    room.destroy();
  });

});
