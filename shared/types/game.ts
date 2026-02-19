/**
 * Game-related type definitions for Red Tetris
 * Shared between frontend components and backend communication
 */

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export type GameMode = 'classic' | 'invisible' | 'sprint';

export type GameState = 'waiting' | 'starting' | 'in-progress' | 'ended';

export interface GameSettings {
  gravity: number;
  gameSpeed: number;
  ghostPiece: boolean;
  boardWidth: number;
  boardHeight: number;
  nextPieceCount: number;
}

// Backend communication interface for game creation
export interface GameCreationData {
  roomId: string;
  hostPlayerId: string;
  gameMode: GameMode;
  settings: GameSettings;
  players: Player[];
  maxPlayers: number;
  timestamp: number;
}

// Socket event types for backend communication
export interface SocketEvents {
  // Outgoing events (client -> server)
  CREATE_GAME: GameCreationData;
  UPDATE_SETTINGS: { roomId: string; settings: GameSettings };
  UPDATE_GAME_MODE: { roomId: string; gameMode: GameMode };
  PLAYER_READY: { roomId: string; playerId: string; isReady: boolean };
  START_GAME: { roomId: string };
  CANCEL_START: { roomId: string };
  JOIN_ROOM: { roomId: string; playerName: string };
  LEAVE_ROOM: { roomId: string; playerId: string };

  // Incoming events (server -> client)
  GAME_CREATED: { success: boolean; roomId: string; error?: string };
  SETTINGS_UPDATED: { settings: GameSettings };
  GAME_MODE_UPDATED: { gameMode: GameMode };
  PLAYER_JOINED: { player: Player };
  PLAYER_LEFT: { playerId: string };
  PLAYER_READY_STATUS: { playerId: string; isReady: boolean };
  GAME_STARTING: { countdown: number };
  GAME_START_CANCELED: {};
  GAME_STARTED: { gameId: string };
  ROOM_NOT_FOUND: { error: string };
  ROOM_FULL: { error: string };
}

// Game constants
export const DEFAULT_SETTINGS: GameSettings = {
  gravity: 1,
  gameSpeed: 1,
  ghostPiece: true,
  boardWidth: 10,
  boardHeight: 20,
  nextPieceCount: 3,
};

export const GAME_MODES: Array<{
  id: GameMode;
  name: string;
  description: string;
}> = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Tetris gameplay',
  },
  {
    id: 'invisible',
    name: 'Invisible',
    description: 'Pieces disappear after landing',
  },
  {
    id: 'sprint',
    name: 'Sprint',
    description: 'Game speeds up over time',
  },
];

// Room configuration
export const ROOM_CONFIG = {
  MAX_PLAYERS: 2,
  MIN_PLAYERS: 1,
  COUNTDOWN_DURATION: 3,
} as const;

// Helper functions for game data preparation and validation
export function prepareGameCreationData(
  roomId: string,
  gameMode: GameMode,
  settings: GameSettings,
  players: Player[]
): GameCreationData {
  const hostPlayer = players.find(p => p.isHost);
  if (!hostPlayer) {
    throw new Error('No host player found');
  }

  return {
    roomId,
    hostPlayerId: hostPlayer.id,
    gameMode,
    settings,
    players,
    maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
    timestamp: Date.now(),
  };
}

export function canStartGame(players: Player[]): boolean {
  const allPlayersReady = players.every(p => p.isHost || p.isReady); // Host is always ready
  const hasMinPlayers = players.length >= ROOM_CONFIG.MIN_PLAYERS;
  return allPlayersReady && hasMinPlayers;
}

export function validateGameSettings(settings: GameSettings): boolean {
  return (
    settings.gravity > 0 &&
    settings.gameSpeed > 0 &&
    settings.boardWidth > 0 &&
    settings.boardHeight > 0 &&
    settings.nextPieceCount >= 0
  );
}
