/**
 * Game-related type definitions for Red Tetris
 * Shared between frontend components and backend communication
 */

// Import shared types
import type { Player, GameSettings as SharedGameSettings } from '../../../shared/types/game';
import { GameMode } from '../../../shared/types/game';

// Re-export shared types
export type GameSettings = SharedGameSettings;
export { GameMode };

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
      id: GameMode.Sprint,
      name: 'Sprint',
      description: 'Game speeds up over time',
    },
    {
      id: GameMode.Invisible,
      name: 'Invisible',
      description: 'Locked pieces disappear from view',
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
  const hasMinPlayers = players.length >= ROOM_CONFIG.MIN_PLAYERS;
  return hasMinPlayers;
}

export function validateGameSettings(settings: GameSettings): boolean {
  return (
    settings.gravity > 0 &&
    settings.boardWidth >= 4 && settings.boardWidth <= 40 && // Min 4 for I-piece, max 40 for sanity
    settings.boardHeight >= 4 && settings.boardHeight <= 50 && // Min 4 for pieces, max 50 for performance
    settings.nextPieceCount >= 0 && settings.nextPieceCount <= 10 // Max 10 next pieces for UI sanity
  );
}
