import type { IPlayer, OpponentsGameState } from "./player.js";
import { ROOM_CONFIG } from "./room.js";
import type { PieceState } from "./piece.js";
import type { GameCreationData } from "./socket.js";

/**
 * Game-related type definitions for Red Tetris
 * Shared between frontend components and backend communication
 */
export enum GameType {
  Singleplayer = "singleplayer",
  Multiplayer = "multiplayer",
}

export enum GameMode {
  Classic = "classic",
  Sprint = "sprint",
  Invisible = "invisible",
}

export enum GameStatus {
  Waiting = "waiting",
  Starting = "starting",
  Playing = "playing",
  Ended = "ended",
}

export enum EndGameReason {
  Victory = "victory",
  Defeat = "defeat",
  BoardOverflow = "board_overflow",
}

export enum GameAction {
  NO_INPUT = "NO_INPUT",
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  SOFT_DROP = "SOFT_DROP",
  HARD_DROP = "HARD_DROP",
  ROTATE_CW = "ROTATE_CW",
  PAUSE = "PAUSE",
}

export interface GameSettings {
  gameMode: GameMode;
  gravity: number;
  ghostPiece: boolean;
  boardWidth: number;
  boardHeight: number;
  nextPieceCount: number;
}

// Game state interface for real-time updates
export interface GameStateUpdate {
  player: IPlayer;
  gameId: string;
  gameSettings: GameSettings;
  board: number[][];
  currentPiece: PieceState;
  ghostPiece: PieceState | null;
  nextPieces: number[];
  score: number;
  level: number;
  linesCleared: number;
  totalLinesCleared: number;
  isPaused: boolean;
  isGameOver: boolean;
  gameOverReason?: string;
  opponent?: OpponentsGameState; // Opponent data for multiplayer
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

// Helper functions for game data preparation and validation
export function prepareGameCreationData(
  roomId: string,
  gameMode: GameMode,
  settings: GameSettings,
  players: IPlayer[],
): GameCreationData {
  const hostPlayer = players.find((p) => p.isHost);
  if (!hostPlayer) {
    throw new Error("No host player found");
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

export function canStartGame(players: IPlayer[]): boolean {
  return players.length >= ROOM_CONFIG.MIN_PLAYERS;
}

export enum AnimationType {
  HARD_DROP = "HARD_DROP",
  LOCK_PIECE = "LOCK_PIECE",
  LINE_CLEAR = "LINE_CLEAR",
  PENALTY_LINES = "PENALTY_LINES",
  SPEED_BOOST = "SPEED_BOOST",
}

export type Trail = {
  x: number;
  startY: number;
  endY: number; // Piece type for color
  type: number; // For fading effect
};

export type LockedCell = {
  x: number;
  y: number;
  type: number; // Piece type for color
};

export type GameAnimationData = {
  timestamp: number;
  trails?: Trail[]; // Hard drop trails for visual effect
  multiplier?: number; // Speed boost
  cells?: LockedCell[]; // Piece lock
  rows?: number[]; // Lines cleared and penalty rows for multiplayer
  count?: number; // Number of penalty rows for multiplayer
};

export type GameHistory = {
  roomId: string;
  type: GameType;
  gameMode: GameMode;
  games: GameHistoryEntry[];
  startedAt: Date;
  endedAt: Date;
};

export type GameHistoryEntry = {
  gameId: string;
  player: IPlayer;
  score: number;
  level: number;
  linesCleared: number;
  totalLinesCleared: number;
  endGameReason: EndGameReason;
};

export type HistoryPayload = {
  recentGames: GameHistory[];
  topScores: GameHistoryEntry[];
};
