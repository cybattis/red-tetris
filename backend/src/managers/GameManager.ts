import { Game } from '../classes/Game.js';
import { Player } from '../classes/Player.js';
import { GameSettings } from '@shared/types/game.js';
import { Logger } from '../utils/helpers';

export class GameManager {
  private static _instance: GameManager | null = null;
  private readonly _games = new Map<string, Game>();

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager._instance) {
      Logger.info('Creating new GameManager instance');
      GameManager._instance = new GameManager();
    }
    return GameManager._instance;
  }

  public createGame(player: Player, settings: GameSettings, seed: number = Date.now()): Game {
    Logger.debug(`Creating game for player ${player.name} with settings:`, settings);
    const game = new Game(player, seed, settings);
    this._games.set(game.id, game);
    return game;
  }

  public getGame(gameId: string): Game | undefined {
    return this._games.get(gameId);
  }

  public removeGame(gameId: string): boolean {
    return this._games.delete(gameId);
  }

  public getAllGames(): Game[] {
    return Array.from(this._games.values());
  }
}
