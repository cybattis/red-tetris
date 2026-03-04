import { Player } from './Player';
import { Game } from './Game';
import { Logger } from '../utils/helpers';
import { GameManager } from '../managers/GameManager';
import { GameSettings } from '../../../shared/types/game';
import { 
  RoomState, 
  RoomPlayer, 
  RoomInfo, 
  ROOM_CONFIG 
} from '../../../shared/types/room';

// Default game settings for rooms
const DEFAULT_GAME_SETTINGS: GameSettings = {
  gravity: 1,
  ghostPiece: true,
  boardWidth: 10,
  boardHeight: 20,
  nextPieceCount: 1,
};

export class Room {
  public readonly id: string;
  private _players: Map<string, Player> = new Map();
  private _spectators: Map<string, Player> = new Map();
  private _games: Map<string, Game> = new Map();
  private _hostId: string | null = null;
  private _state: RoomState = 'waiting';
  private _createdAt: Date;
  private _gameStartedAt?: Date;
  private _cleanupTimer?: NodeJS.Timeout;

  constructor(id: string) {
    this.id = id;
    this._createdAt = new Date();
    Logger.info(`Created room: ${this.id}`);
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

  get hostId(): string | null {
    return this._hostId;
  }

  get playerCount(): number {
    return this._players.size;
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

  // Player management
  public addPlayer(player: Player): { success: boolean; reason?: string; isSpectator?: boolean } {
    // Check if player already exists
    if (this._players.has(player.id) || this._spectators.has(player.id)) {
      return { success: false, reason: 'Player already in room' };
    }

    // Check if game is in progress (only allow spectators)
    if (this._state === 'playing') {
      return this.addSpectator(player);
    }

    // Check if room is full (add as spectator)
    if (this.isFull) {
      return this.addSpectator(player);
    }

    // Add as regular player
    this._players.set(player.id, player);
    
    // Set as host if first player
    if (this._hostId === null) {
      this._hostId = player.id;
      Logger.info(`Player ${player.name} became host of room ${this.id}`);
    }

    this.clearCleanupTimer();
    Logger.info(`Player ${player.name} joined room ${this.id} as player (${this._players.size}/${ROOM_CONFIG.MAX_PLAYERS})`);
    
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

  public removePlayer(playerId: string): { wasHost: boolean; newHost?: Player } {
    const wasHost = this._hostId === playerId;
    let newHost: Player | undefined;

    // Remove from players or spectators
    const removedFromPlayers = this._players.delete(playerId);
    const removedFromSpectators = this._spectators.delete(playerId);

    if (!removedFromPlayers && !removedFromSpectators) {
      return { wasHost: false };
    }

    // Clean up any associated games through GameManager
    const gameManager = GameManager.getInstance();
    const stoppedGames = gameManager.stopGamesByPlayerId(playerId);
    if (stoppedGames > 0) {
      Logger.info(`Stopped ${stoppedGames} game(s) for player ${playerId} leaving room ${this.id}`);
    }

    // Handle host transfer
    if (wasHost && this._players.size > 0) {
      const playersIterator = this._players.values();
      const nextPlayer = playersIterator.next().value;
      if (nextPlayer) {
        this._hostId = nextPlayer.id;
        newHost = nextPlayer;
        Logger.info(`Host transferred from ${playerId} to ${nextPlayer.name} in room ${this.id}`);
      }
    } else if (wasHost) {
      this._hostId = null;
    }

    // Handle room state transitions
    if (this._state === 'playing' && this._players.size === 0) {
      // No players left during a game - end the game and stop all associated games
      this._state = 'ended';
      this.endAllGames();
      Logger.info(`Room ${this.id} ended - no players remaining during game`);
    } else if (this._state === 'playing' && this._players.size === 1) {
      // Only one player left during a game - transition back to waiting and stop games
      this._state = 'waiting';
      this._gameStartedAt = undefined;
      this.endAllGames();
      Logger.info(`Room ${this.id} returned to waiting - only one player remaining during game`);
    }

    // Start cleanup timer if room is empty
    if (this.isEmpty) {
      this.startCleanupTimer();
    }

    Logger.info(`Player ${playerId} left room ${this.id}. Players: ${this._players.size}, Spectators: ${this._spectators.size}`);
    
    return { wasHost, newHost };
  }

  public getPlayer(playerId: string): Player | null {
    return this._players.get(playerId) || this._spectators.get(playerId) || null;
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
  public startGame(customSettings?: Partial<GameSettings>): { success: boolean; reason?: string; gameIds?: string[] } {
    if (this._state !== 'waiting') {
      return { success: false, reason: 'Game already in progress or ended' };
    }

    if (this._players.size === 0) {
      return { success: false, reason: 'No players in room' };
    }

    this._state = 'playing';
    this._gameStartedAt = new Date();

    // Merge custom settings with defaults
    const gameSettings: GameSettings = {
      ...DEFAULT_GAME_SETTINGS,
      ...customSettings
    };

    const gameIds: string[] = [];

    // Create games for each player using GameManager
    for (const player of this._players.values()) {
      try {
        // Generate a seed for the game (could be room-based for synchronized pieces in multiplayer)
        const seed = Date.now() + Math.random();
        
        // Create game using GameManager 
        const game = GameManager.getInstance().createGame(
          player,
          gameSettings,
          seed
          // socket will be set up separately if needed
        );

        // Start the game
        game.start();
        gameIds.push(game.id);
        
        Logger.info(`Created and started game ${game.id} for player ${player.name} in room ${this.id} with settings:`, gameSettings);
      } catch (error) {
        Logger.error(`Failed to create game for player ${player.name} in room ${this.id}:`, error);
        // Continue creating games for other players even if one fails
      }
    }

    Logger.info(`Game started in room ${this.id} with ${this._players.size} players`);
    return { success: true, gameIds };
  }

  public endGame(): void {
    this._state = 'ended';
    
    // Stop all games
    for (const game of this._games.values()) {
      game.stopGame();
    }
    this._games.clear();

    Logger.info(`Game ended in room ${this.id}`);
  }

  public resetGame(): { success: boolean; reason?: string } {
    if (this._state === 'playing') {
      return { success: false, reason: 'Cannot reset game while in progress' };
    }

    this._state = 'waiting';
    this._gameStartedAt = undefined;
    
    // Clean up any remaining games
    for (const game of this._games.values()) {
      game.stopGame();
    }
    this._games.clear();

    Logger.info(`Game reset in room ${this.id}`);
    return { success: true };
  }

  public getGame(playerId: string): Game | null {
    return this._games.get(playerId) || null;
  }

  // Room info serialization
  public toRoomInfo(): RoomInfo {
    const playerList: RoomPlayer[] = this.players.map(player => ({
      id: player.id,
      name: player.name,
      isHost: this.isHost(player.id),
      isReady: true, // TODO: Implement ready state
      isSpectator: false
    }));

    const spectatorList: RoomPlayer[] = this.spectators.map(player => ({
      id: player.id,
      name: player.name,
      isHost: false,
      isReady: false,
      isSpectator: true
    }));

    return {
      id: this.id,
      state: this._state,
      players: playerList,
      spectators: spectatorList,
      hostId: this._hostId || '',
      maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
      createdAt: this._createdAt,
      gameStartedAt: this._gameStartedAt
    };
  }

  // Cleanup management
  private startCleanupTimer(): void {
    this.clearCleanupTimer();
    this._cleanupTimer = setTimeout(() => {
      Logger.info(`Room ${this.id} cleanup timer expired`);
      // The RoomManager will handle the actual cleanup
    }, ROOM_CONFIG.CLEANUP_TIMEOUT_MS);
  }

  private clearCleanupTimer(): void {
    if (this._cleanupTimer) {
      clearTimeout(this._cleanupTimer);
      this._cleanupTimer = undefined;
    }
  }

  private endAllGames(): void {
    // End all games associated with this room's players
    for (const playerId of this._players.keys()) {
      GameManager.getInstance().stopGamesByPlayerId(playerId);
    }
  }

  public handlePlayerGameEnd(playerId: string, reason: string): { success: boolean; reason?: string } {
    if (!this.isPlayer(playerId)) {
      return { success: false, reason: 'Player not in room' };
    }

    Logger.info(`Player ${playerId} game ended in room ${this.id} - reason: ${reason}`);

    // Check if all players have finished their games
    const allPlayersFinished = this.checkAllPlayersFinished();
    
    if (allPlayersFinished) {
      // All players have finished, transition room back to waiting state
      this._state = 'waiting';
      this._gameStartedAt = undefined;
      Logger.info(`All players finished games in room ${this.id}, returning to lobby`);
    }

    return { success: true };
  }

  private checkAllPlayersFinished(): boolean {
    // In single player mode, if the only player finishes, all are finished
    // In multiplayer mode, we'd need to track individual player game states
    // For now, assume single player means game is finished when the one game ends
    return true;
  }

  public destroy(): void {
    this.clearCleanupTimer();
    
    // Stop all games
    for (const game of this._games.values()) {
      game.stopGame();
    }
    this._games.clear();
    this._players.clear();
    this._spectators.clear();

    Logger.info(`Room ${this.id} destroyed`);
  }
}