/**
 * Game-related type definitions for Red Tetris
 * Shared between frontend components and backend communication
 */

// Import shared types
import type { GameSettings as SharedGameSettings } from '../../../shared/types/game';
import { GameMode } from '../../../shared/types/game';

// Re-export shared types
export type GameSettings = SharedGameSettings;
export { GameMode };

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
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
  gameMode: GameMode.Classic,
  gravity: 1,
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
      id: GameMode.Classic,
      name: 'Classic',
      description: 'Traditional Tetris gameplay',
    },
    {
      id: GameMode.Invisible,
      name: 'Invisible',
      description: 'Pieces disappear after landing',
    },
    {
      id: GameMode.Sprint,
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
    settings.boardWidth >= 4 && settings.boardWidth <= 40 && // Min 4 for I-piece, max 40 for sanity
    settings.boardHeight >= 4 && settings.boardHeight <= 50 && // Min 4 for pieces, max 50 for performance
    settings.nextPieceCount >= 0 && settings.nextPieceCount <= 10 // Max 10 next pieces for UI sanity
  );
}
