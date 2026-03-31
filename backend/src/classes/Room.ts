import { Player } from './Player.js';
import { Game, type GameRoomContext} from './Game.js';
import { Logger } from '../utils/helpers.js';
import { AnimationType, GameAction, GameMode, GameType } from '../../../shared/types/game.js';
import type {
  GameAnimationData,
  GameHistory,
  GameSettings,
  GameStateUpdate,
} from '../../../shared/types/game.js';
import { ROOM_CONFIG } from '../../../shared/types/room.js';
import type { RoomInfo, RoomResults, RoomState } from '../../../shared/types/room.js';
import { Server } from 'socket.io';
import { wsManager } from '../server.js';
import type { IPlayer } from '../../../shared/types/player.js';
import type { GameOverEvent } from '../../../shared/types/socket.js';
import { GameHistoryManager } from '../managers/GameHistoryManager.js';

// Default game settings for rooms
const DEFAULT_GAME_SETTINGS: GameSettings = {
  gameMode: GameMode.Classic,
  gravity: 1,
  ghostPiece: true,
  boardWidth: 10,
  boardHeight: 20,
  nextPieceCount: 1,
};

export class Room {
  public readonly id: string;
  private readonly _players: Map<string, Player> = new Map();
  private readonly _spectators: Map<string, Player> = new Map();
  private readonly _games: Map<string, Game> = new Map();
  private readonly _createdAt: Date;

  private _hostId: string | null = null;
  private _state: RoomState = 'waiting';
  private _gameStartedAt?: Date;

  private readonly _io: Server = wsManager.io;

  constructor(id: string) {
    this.id = id;
    this._createdAt = new Date();
    Logger.info(`Room ${this.id} created at ${this._createdAt.toISOString()}`);
  }

  // Getters
  get state(): RoomState {
    return this._state;
  }

  get players(): Player[] {
    return Array.from(this._players.values());
  }

  get spectators(): Player[] {
    return Array.from(this._spectators.values());
  }

  get spectatorCount(): number {
    return this._spectators.size;
  }

  get isEmpty(): boolean {
    return this._players.size === 0 && this._spectators.size === 0;
  }

  get isFull(): boolean {
    return this._players.size >= ROOM_CONFIG.MAX_PLAYERS;
  }

  get io(): Server {
    return this._io;
  }

  /**
   * Convert the Room instance to a RoomInfo object for client consumption
   * This includes player/spectator lists, room state, host info, and timestamps
   */
  public toRoomInfo(): RoomInfo {
    const playerList: IPlayer[] = this.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: this.isHost(player.id),
      isSpectator: false,
    }));

    const spectatorList: IPlayer[] = this.spectators.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: false,
      isSpectator: true,
    }));

    return {
      id: this.id,
      state: this._state,
      players: playerList,
      spectators: spectatorList,
      hostId: this._hostId || '',
      maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
      createdAt: this._createdAt,
      gameStartedAt: this._gameStartedAt,
    };
  }

  // Player management
  // --------------------------------------------------------------
  public addPlayer(player: Player): { success: boolean; reason?: string; isSpectator?: boolean } {
    // Check if player already exists
    if (this._players.has(player.id) || this._spectators.has(player.id)) {
      return { success: false, reason: 'Player already in room' };
    }

    // Check if game is in progress or room is full - add as spectator
    if (this._state === 'playing' || this.isFull) {
      return this.addSpectator(player);
    }

    // Add as regular player
    this._players.set(player.id, player);

    // Set as host if first player
    if (this._hostId === null) {
      this._hostId = player.id;
      Logger.info(`Player ${player.name} became host of room ${this.id}`);
    }

    Logger.info(
      `Player ${player.name} joined room ${this.id} as player (${this._players.size}/${ROOM_CONFIG.MAX_PLAYERS})`,
    );

    return { success: true, isSpectator: false };
  }

  private addSpectator(player: Player): { success: boolean; reason?: string; isSpectator?: boolean } {
    if (this._spectators.size >= ROOM_CONFIG.MAX_SPECTATORS) {
      return { success: false, reason: 'Too many spectators' };
    }

    this._spectators.set(player.id, player);
    Logger.info(`Player ${player.name} joined room ${this.id} as spectator`);

    return { success: true, isSpectator: true };
  }

  public removePlayer(playerId: string): {
    wasHost: boolean;
    newHost?: Player;
    removedFromPlayers: boolean;
  } {
    const wasHost = this._hostId === playerId;
    let newHost: Player | undefined;

    // Remove from players or spectators
    const removedFromPlayers = this._players.delete(playerId);
    const removedFromSpectators = this._spectators.delete(playerId);

    if (!removedFromPlayers && !removedFromSpectators) {
      return { wasHost: false, removedFromPlayers: false };
    }

    // Clean up any associated games through GameManager
    if (removedFromPlayers) {
      const stoppedGames = this._games.get(playerId)?.stopGame();
      if (stoppedGames) {
        Logger.info(`Stopped ${stoppedGames} game(s) for player ${playerId} leaving room ${this.id}`);
      }
    }

    // Handle host transfer
    if (wasHost && this._players.size > 0) {
      const playersIterator = this._players.values();
      const nextPlayer = playersIterator.next().value;
      if (nextPlayer && nextPlayer instanceof Player) {
        this._hostId = nextPlayer.id;
        newHost = nextPlayer;
        Logger.info(`Host transferred from ${playerId} to ${nextPlayer.name} in room ${this.id}`);
      }
    } else if (wasHost) {
      this._hostId = null;
    }

    // Handle room state transitions
    if (removedFromPlayers && this._state === 'playing' && this._players.size === 0) {
      // No players left during a game - end the game and stop all associated games
      this._state = 'ended';
      this.cleanupGames();
      Logger.info(`Room ${this.id} ended - no players remaining during game`);
    } else if (removedFromPlayers && this._state === 'playing' && this._players.size === 1) {
      // Only one player left during a game - transition back to waiting and stop games
      this._state = 'waiting';
      this._gameStartedAt = undefined;
      this.cleanupGames();
      Logger.info(`Room ${this.id} returned to waiting - only one player remaining during game`);
    }

    Logger.info(
      `Player ${playerId} left room ${this.id}. Players: ${this._players.size}, Spectators: ${this._spectators.size}`,
    );

    return { wasHost, newHost, removedFromPlayers };
  }

  public isHost(playerId: string): boolean {
    return this._hostId === playerId;
  }

  public isPlayer(playerId: string): boolean {
    return this._players.has(playerId);
  }

  public isSpectator(playerId: string): boolean {
    return this._spectators.has(playerId);
  }

  // Game management
  // --------------------------------------------------------------

  public markGameStarted(): void {
    this._state = 'playing';
    this._gameStartedAt = new Date();
  }

  /**
   * Create a new game instance for a player.
   */
  private createGame(player: Player, settings: GameSettings, seed: number, room: GameRoomContext): Game {
    const game = new Game(player, seed, settings, room);
    Logger.info(`GameManager: Created game ${game.id} for player ${player.name}.`);
    return game;
  }

  /**
   * Start the game for all players in the room. This will create individual game instances for each player
   * @param customSettings
   */
  public startGame(
    customSettings?: Partial<GameSettings>,
  ): RoomResults<{ gameIds: string[]; roomInfo: RoomInfo }> {
    if (this._state === 'playing') {
      Logger.info(`Cannot start game - already playing`);
      return {
        success: false,
        error: {
          reason: 'Game already in progress',
          roomId: this.id,
          code: 'ALREADY_PLAYING',
        },
      };
    }

    if (this._players.size === 0) {
      Logger.error(`Cannot start game - no players`);
      return {
        success: false,
        error: {
          reason: 'No players in room',
          roomId: this.id,
          code: 'ROOM_NOT_FOUND',
        },
      };
    }

    Logger.info(`Room ${this.id} ready to start game with ${this._players.size} players`);

    const gameIds: string[] = [];
    // Merge custom settings with defaults
    const gameSettings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      ...customSettings,
    };

    this._state = 'playing';
    this._gameStartedAt = new Date();

    // Generate a seed for the game (could be room-based for synchronized pieces in multiplayer)
    const seed = Date.now() + Math.random();

    const roomContext: GameRoomContext = {
      id: this.id,
      playerCount: this._players.size,
    };

    // Create games for each player using GameManager
    for (const player of this._players.values()) {
      try {
        // Create game using GameManager
        const game = this.createGame(
          player,
          gameSettings,
          seed,
          roomContext
        );

        // Store game in Room's map for tracking
        this._games.set(player.id, game);

        game.on('stateUpdate', (payload: GameStateUpdate) => {
          this.io.to(this.id).emit('GAME_STATE_UPDATE', payload);
        });

        game.on(
          'animation',
          (evt: { playerId: string; animationType: AnimationType; data: GameAnimationData }) => {
            this.io.to(evt.playerId).emit('GAME_ANIMATION', {
              type: evt.animationType,
              data: evt.data,
            });
          },
        );

        // Listen for game ended event to update room state
        game.once('gameOver', (data: { roomId: string; playerId: string }) => {
          Logger.info(`Game ended in room ${this.id} for player ${player.name}`);

          const payload: GameOverEvent = { looserId: data.playerId };
          const roomId = this.id;
          if (!this.io.to(roomId).emit('GAME_ENDED', payload)) {
            Logger.warn(`Failed to broadcast game state for game ${this.id} in room ${this?.id}`);
          }

          // Stop games for all players in the room when one game ends (for multiplayer)
          this.endGame().then(() => {
            Logger.info(`All games ended in room ${this.id} after game over event`);
          });
        });

        // Listen for penalty lines event (multiplayer: n-1 lines sent to opponents)
        game.on('penaltyLines', (data: { fromPlayerId: string; count: number }) => {
          this.relayPenaltyLines(data.fromPlayerId, data.count);
        });

        // Start the game
        game.start();
        gameIds.push(game.id);

        Logger.info(
          `Created and started game ${game.id} for player ${player.name} in room ${this.id} with settings:`,
          gameSettings,
        );
      } catch (error) {
        Logger.error(`Failed to create game for player ${player.name} in room ${this.id}:`, error);
        // Continue creating games for other players even if one fails
      }
    }

    Logger.info(`Game started in room ${this.id} with ${this._players.size} players`);
    return { success: true, data: { gameIds, roomInfo: this.toRoomInfo() } };
  }

  public handlePlayerInput(playerId: string, input: GameAction) {
    const game = this._games.get(playerId);
    if (!game) {
      Logger.error(`No active game found for player ${playerId} in room ${this.id} when processing input:`, {
        playerId,
        input,
      });
      return false;
    }

    game.setPlayerInput(input);
    return true;
  }

  /**
   * Relay penalty lines from one player to all other alive opponents.
   * Called when a player clears n lines — opponents receive (n - 1) indestructible lines.
   * Only active in multiplayer (2+ players).
   */
  private relayPenaltyLines(fromPlayerId: string, count: number): void {
    if (count <= 0 || this._players.size < 2) return;

    Logger.info(
      `Relaying ${count} penalty lines from player ${fromPlayerId} to opponents in room ${this.id}`,
    );

    for (const [playerId, game] of this._games.entries()) {
      // Skip the player who cleared the lines and any eliminated players
      if (playerId === fromPlayerId || !game.isAlive) {
        continue;
      }

      game.addPenaltyLines(count);
      Logger.info(`Applied ${count} penalty lines to player ${playerId} in room ${this.id}`);
    }
  }

  public async endGame(): Promise<void> {
    Logger.info(
      `🏁 Room.endGame() called for room ${this.id}, changing state from '${this._state}' to 'ended'`,
    );
    this._state = 'ended';

    const games = Array.from(this._games.values());
    const gamesHistoryEntries = games.map((game) => game.toGameHistoryEntry());

    // Save results, update stats, etc. (not implemented here)
    const results: GameHistory = {
      roomId: this.id,
      type: games.length > 1 ? GameType.Multiplayer : GameType.Singleplayer,
      gameMode: games[0]?.settings.gameMode || GameMode.Classic,
      games: gamesHistoryEntries,
      startedAt: this._createdAt,
      endedAt: new Date(),
    };

    const historyManager = GameHistoryManager.getInstance();
    await historyManager.addGameHistory(results);

    // Clean up all games properly
    this.cleanupGames();

    Logger.info(`Game ended in room ${this.id}`);
  }

  /**
   * Clean up all games for players in this room
   * This ensures no orphaned game loops or memory leaks
   */
  private cleanupGames(): void {
    // Stop and remove games from Room's map
    for (const game of this._games.values()) {
      Logger.info(`Cleaning up game ${game.id} for room ${this.id}`);
      game.stopGame();
    }
    this._games.clear();
  }

  /**
   * Destroy the room and clean up all resources.
   */
  public destroy(): void {
    // Stop all games
    this.cleanupGames();
    this._players.clear();
    this._spectators.clear();

    Logger.info(`Room ${this.id} destroyed`);
  }
}
