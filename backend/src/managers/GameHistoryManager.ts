import { GameHistory, GameHistoryEntry } from '@shared/types/game';
import { Logger } from '../utils/helpers';

export class GameHistoryManager {
  private static _instance: GameHistoryManager | null = null;
  private readonly _gameHistories: GameHistory[] = [];
  private _historyPerScoreCache: GameHistoryEntry[] | null = null;
  private _historyPerDateCache: GameHistory[] | null = null;

  private static readonly MAX_LAST_GAME: number = 20;

  public get gameHistories(): GameHistory[] {
    return this._historyPerDateCache ?? [];
  }

  public get gameHistoriesPerScore(): GameHistoryEntry[] {
    return this._historyPerScoreCache ?? [];
  }

  private constructor() {}

  public static getInstance(): GameHistoryManager {
    GameHistoryManager._instance ??= new GameHistoryManager();
    return GameHistoryManager._instance;
  }

  public addGameHistory(gameHistory: GameHistory): void {
    this._gameHistories.push(gameHistory);
    this._historyPerScoreCache = this.sortGameByScore();
    this._historyPerDateCache = this.getLastGames();
    Logger.info('GameHistoryManager: Added new game history. Total histories: ' + this._gameHistories.length);
    Logger.debug('GameHistoryManager: Current game histories: ' + JSON.stringify(gameHistory));
    Logger.debug(
      'GameHistoryManager: Current game histories (sorted by score): ' +
        JSON.stringify(this._historyPerScoreCache),
    );
    Logger.debug(
      'GameHistoryManager: Current game histories (sorted by date): ' +
        JSON.stringify(this._historyPerDateCache),
    );
  }

  public getLastGames(): GameHistory[] {
    const count = this._gameHistories.length;
    return this._gameHistories.slice(count - 20, count);
  }

  public sortGameByScore(): GameHistoryEntry[] {
    const allGamesEntrie = this._gameHistories.flatMap((history) => history.games);
    const filteredEntries = allGamesEntrie.filter((entry) => entry.score > 0);

    return filteredEntries.sort((a, b) => b.score - a.score).slice(0, GameHistoryManager.MAX_LAST_GAME);
  }
}
