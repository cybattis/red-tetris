import { Game } from '../classes/Game.js';
import { Player } from '../classes/Player.js';
import { GameSettings } from '../../../shared/types/game.js';
import { Logger } from '../utils/helpers';
import type { Socket } from 'socket.io';

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

  public createGame(player: Player, settings: GameSettings, seed: number = Date.now(), socket?: Socket): Game {
    const game = new Game(player, seed, settings, socket);
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

  public getGamesByPlayerId(playerId: string): Game[] {
    return this.getAllGames().filter(game => game.player.id === playerId);
  }

  public stopGamesByPlayerId(playerId: string): number {
    const playerGames = this.getGamesByPlayerId(playerId);
    let stoppedCount = 0;
    
    for (const game of playerGames) {
      game.stopGame();
      this._games.delete(game.id);
      stoppedCount++;
      Logger.info(`Stopped and removed game ${game.id} for player ${playerId}`);
    }
    
    return stoppedCount;
  }

  public stopAllGames(): number {
    let stoppedCount = 0;
    
    for (const game of this._games.values()) {
      game.stopGame();
      stoppedCount++;
    }
    
    this._games.clear();
    Logger.info(`Stopped and removed all ${stoppedCount} games`);
    
    return stoppedCount;
  }
}
