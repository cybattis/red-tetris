import { GameHistory, GameHistoryEntry } from '@shared/types/game';
import { Logger } from '../utils/helpers';
import { Mutex } from 'async-mutex';

export class GameHistoryManager {
  private static _instance: GameHistoryManager | null = null;
  private readonly _mutex = new Mutex();

  private readonly _gameHistories: GameHistory[] = [];
  private _historyPerScoreCache: ReadonlyArray<GameHistoryEntry> | null = null;
  private _historyPerDateCache: ReadonlyArray<GameHistory> | null = null;

  private static readonly MAX_LAST_GAME: number = 20;

  private constructor() {
    Logger.info('GameHistoryManager initialized');
  }

  public static getInstance(): GameHistoryManager {
    GameHistoryManager._instance ??= new GameHistoryManager();
    return GameHistoryManager._instance;
  }

  public gameHistories(): Promise<ReadonlyArray<GameHistory>> {
    return this._mutex.runExclusive(() => [...(this._historyPerDateCache ?? [])]);
  }

  public gameHistoriesPerScore(): Promise<ReadonlyArray<GameHistoryEntry>> {
    return this._mutex.runExclusive(() => [...(this._historyPerScoreCache ?? [])]);
  }

  public async addGameHistory(gameHistory: GameHistory): Promise<void> {
    await this._mutex.runExclusive(() => {
      this._gameHistories.push(gameHistory);
      this._historyPerScoreCache = this.sortGameByScore();
      this._historyPerDateCache = this.getLastGames();

      Logger.info(
        'GameHistoryManager: Added new game history. Total histories: ' + this._gameHistories.length,
      );
      Logger.debug('GameHistoryManager: Current game histories: ' + JSON.stringify(gameHistory));
      Logger.debug(
        'GameHistoryManager: Current game histories (sorted by score): ' +
          JSON.stringify(this._historyPerScoreCache),
      );
      Logger.debug(
        'GameHistoryManager: Current game histories (sorted by date): ' +
          JSON.stringify(this._historyPerDateCache),
      );
    });
  }

  private getLastGames(): ReadonlyArray<GameHistory> {
    const count = this._gameHistories.length;
    return this._gameHistories.slice(count - GameHistoryManager.MAX_LAST_GAME, count);
  }

  private sortGameByScore(): ReadonlyArray<GameHistoryEntry> {
    const allGamesEntries = this._gameHistories.flatMap((history) => history.games);
    const filteredEntries = allGamesEntries.filter((entry) => entry.score > 0);

    return filteredEntries.sort((a, b) => b.score - a.score).slice(0, GameHistoryManager.MAX_LAST_GAME);
  }
}
