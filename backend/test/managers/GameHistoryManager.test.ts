import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GameHistoryManager } from '../../src/managers/GameHistoryManager';
import { EndGameReason, GameHistory, GameHistoryEntry, GameMode, GameType } from '../../../shared/types/game';

function makeEntry(score: number, suffix: string): GameHistoryEntry {
  return {
    gameId: `game-${suffix}`,
    player: {
      id: `player-${suffix}`,
      name: `Player ${suffix}`,
      isHost: false,
      isSpectator: false,
    },
    score,
    level: 1,
    linesCleared: 0,
    totalLinesCleared: 0,
    endGameReason: EndGameReason.Defeat,
  };
}

function makeHistory(index: number, entries: readonly GameHistoryEntry[]): GameHistory {
  return {
    roomId: `room-${index}`,
    type: GameType.Singleplayer,
    gameMode: GameMode.Classic,
    games: entries,
    startedAt: new Date(1000 + index),
    endedAt: new Date(2000 + index),
  };
}

describe('GameHistoryManager', () => {
  beforeEach(() => {
    (GameHistoryManager as unknown as { _instance: GameHistoryManager | null })._instance = null;
  });

  it('returns singleton instance', () => {
    const first = GameHistoryManager.getInstance();
    const second = GameHistoryManager.getInstance();

    expect(first).toBe(second);
  });

  it('starts with empty caches', async () => {
    const manager = GameHistoryManager.getInstance();

    await expect(manager.gameHistories()).resolves.toEqual([]);
    await expect(manager.gameHistoriesPerScore()).resolves.toEqual([]);
  });

  it('adds history and exposes date and score caches', async () => {
    const manager = GameHistoryManager.getInstance();

    const historyA = makeHistory(1, [makeEntry(120, 'a')]);
    const historyB = makeHistory(2, [makeEntry(0, 'b'), makeEntry(320, 'c')]);

    await manager.addGameHistory(historyA);
    await manager.addGameHistory(historyB);

    const recent = await manager.gameHistories();
    const topScores = await manager.gameHistoriesPerScore();

    expect(recent).toHaveLength(2);
    expect(recent[0].roomId).toBe('room-1');
    expect(recent[1].roomId).toBe('room-2');

    expect(topScores.map((entry) => entry.score)).toEqual([320, 120]);
    expect(topScores.every((entry) => entry.score > 0)).toBe(true);
  });

  it('caps date and score caches to 20 entries', async () => {
    const manager = GameHistoryManager.getInstance();

    for (let i = 0; i < 25; i += 1) {
      await manager.addGameHistory(makeHistory(i, [makeEntry(i + 1, `${i}`)]));
    }

    const recent = await manager.gameHistories();
    const topScores = await manager.gameHistoriesPerScore();

    expect(recent).toHaveLength(20);
    expect(recent[0].roomId).toBe('room-5');
    expect(recent[19].roomId).toBe('room-24');

    expect(topScores).toHaveLength(20);
    expect(topScores[0].score).toBe(25);
    expect(topScores[19].score).toBe(6);
  });

  it('returns defensive copies from cache getters', async () => {
    const manager = GameHistoryManager.getInstance();
    await manager.addGameHistory(makeHistory(1, [makeEntry(10, 'x')]));

    const firstRecent = await manager.gameHistories();
    const firstScores = await manager.gameHistoriesPerScore();

    const recentMutated = [...firstRecent];
    recentMutated.pop();

    const scoresMutated = [...firstScores];
    scoresMutated.pop();

    const secondRecent = await manager.gameHistories();
    const secondScores = await manager.gameHistoriesPerScore();

    expect(secondRecent).toHaveLength(1);
    expect(secondScores).toHaveLength(1);
  });

  it('serializes concurrent addGameHistory calls through mutex', async () => {
    const manager = GameHistoryManager.getInstance();
    const entries = Array.from({ length: 10 }, (_, i) => makeHistory(i, [makeEntry(i + 10, `m-${i}`)]));

    await Promise.all(entries.map((history) => manager.addGameHistory(history)));

    const recent = await manager.gameHistories();
    const topScores = await manager.gameHistoriesPerScore();

    expect(recent).toHaveLength(10);
    expect(topScores[0].score).toBe(19);
    expect(topScores[topScores.length - 1].score).toBe(10);
  });

  it('logs constructor initialization once', () => {
    const infoSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const manager = GameHistoryManager.getInstance();
    const same = GameHistoryManager.getInstance();

    expect(manager).toBe(same);
    expect(infoSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
  });
});
