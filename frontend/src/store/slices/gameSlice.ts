/**
 * Game Slice
 *
 * Stores the game state received from the server.
 * This is a DISPLAY-ONLY slice - all game logic runs on the server.
 * We just store what the server sends us and render it.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Piece state as received from server
 */
export interface PieceState {
  type: number;
  position: { x: number; y: number };
  shape: number[][];
  rotation?: number;
}

/**
 * Player game state (for multiplayer - other players' states)
 */
export interface PlayerGameState {
  playerId: string;
  playerName: string;
  spectrum: number[]; // Column heights for spectrum display
  score: number;
  isEliminated: boolean;
}

/**
 * Main game state - all data comes from server
 */
export interface GameState {
  // Board state (from server)
  board: number[][];
  boardWidth: number;
  boardHeight: number;

  // Current piece (from server)
  currentPiece: PieceState | null;
  ghostPiece: PieceState | null;

  // Piece queue (from server)
  nextPieces: number[]; // Array of piece type IDs

  // Score and progress (from server)
  score: number;
  level: number;
  linesCleared: number;
  totalLinesCleared: number;

  // Game status
  isPaused: boolean;
  isGameOver: boolean;
  gameOverReason: string | null;

  // Multiplayer - other players' states
  opponents: PlayerGameState[];

  // Penalty lines pending (from server)
  pendingPenaltyLines: number;

  // Animation state (for visual effects)
  clearingRows: number[];  // Row indices currently being cleared
  penaltyRows: number[];   // Row indices that are penalty lines (for animation)
}

/**
 * Initial state - empty board until server sends data
 */
const createEmptyBoard = (width: number, height: number): number[][] => {
  return Array.from({ length: height }, () => Array(width).fill(0));
};

/**
 * Create a mock board with some placed pieces for testing
 */
const createMockBoard = (): number[][] => {
  const board = createEmptyBoard(10, 20);
  
  // Add some placed pieces at the bottom (simulating mid-game)
  // Row 19 (bottom) - almost complete line
  board[19] = [1, 2, 3, 4, 0, 5, 6, 7, 1, 2];
  // Row 18
  board[18] = [0, 1, 2, 0, 0, 0, 3, 4, 5, 6];
  // Row 17
  board[17] = [0, 0, 1, 0, 0, 0, 0, 2, 3, 4];
  // Row 16
  board[16] = [0, 0, 0, 0, 0, 0, 0, 1, 2, 0];
  
  return board;
};

const initialState: GameState = {
  board: createMockBoard(),
  boardWidth: 10,
  boardHeight: 20,

  // Mock current piece (T-piece falling) - type 3 = T piece (purple)
  currentPiece: {
    type: 3,
    position: { x: 4, y: 2 },
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    rotation: 0,
  },
  
  // Ghost piece (where it will land) - same type as current piece
  ghostPiece: {
    type: 3,
    position: { x: 4, y: 14 },
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    rotation: 0,
  },

  // Next pieces queue: I(1)
  nextPieces: [1, 5 , 4, 1, 2, 4, 7],

  score: 4850,
  level: 3,
  linesCleared: 2,
  totalLinesCleared: 12,

  isPaused: false,
  isGameOver: false,
  gameOverReason: null,

  // Mock opponent for testing 2-player layout (remove for production)
  opponents: [
    {
      playerId: 'opponent-1',
      playerName: 'Opponent',
      spectrum: [3, 5, 7, 4, 6, 8, 5, 3, 4, 6],
      score: 1250,
      isEliminated: false,
    },
  ],
  pendingPenaltyLines: 0,
  
  // Animation state
  clearingRows: [],
  penaltyRows: [],
};

/**
 * Game state update payload (from server)
 */
export interface GameStateUpdate {
  board?: number[][];
  currentPiece?: PieceState | null;
  ghostPiece?: PieceState | null;
  nextPieces?: number[];
  score?: number;
  level?: number;
  linesCleared?: number;
  totalLinesCleared?: number;
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    /**
     * Initialize game with settings from server
     */
    initializeGame: (
      state,
      action: PayloadAction<{
        boardWidth: number;
        boardHeight: number;
        nextPieces?: number[];
      }>
    ) => {
      const { boardWidth, boardHeight, nextPieces } = action.payload;
      state.boardWidth = boardWidth;
      state.boardHeight = boardHeight;
      state.board = createEmptyBoard(boardWidth, boardHeight);
      state.nextPieces = nextPieces ?? [];
      state.currentPiece = null;
      state.ghostPiece = null;
      state.score = 0;
      state.level = 1;
      state.linesCleared = 0;
      state.totalLinesCleared = 0;
      state.isPaused = false;
      state.isGameOver = false;
      state.gameOverReason = null;
      state.opponents = [];
      state.pendingPenaltyLines = 0;
    },

    /**
     * Update game state from server
     * This is the main action - server sends full or partial state updates
     */
    updateGameState: (state, action: PayloadAction<GameStateUpdate>) => {
      const update = action.payload;

      if (update.board !== undefined) state.board = update.board;
      if (update.currentPiece !== undefined) state.currentPiece = update.currentPiece;
      if (update.ghostPiece !== undefined) state.ghostPiece = update.ghostPiece;
      if (update.nextPieces !== undefined) state.nextPieces = update.nextPieces;
      if (update.score !== undefined) state.score = update.score;
      if (update.level !== undefined) state.level = update.level;
      if (update.linesCleared !== undefined) state.linesCleared = update.linesCleared;
      if (update.totalLinesCleared !== undefined)
        state.totalLinesCleared = update.totalLinesCleared;
    },

    /**
     * Update opponent spectrum (for multiplayer display)
     */
    updateOpponentSpectrum: (
      state,
      action: PayloadAction<{
        playerId: string;
        playerName: string;
        spectrum: number[];
        score: number;
      }>
    ) => {
      const { playerId, playerName, spectrum, score } = action.payload;
      const existingIndex = state.opponents.findIndex((o) => o.playerId === playerId);

      if (existingIndex >= 0) {
        state.opponents[existingIndex].spectrum = spectrum;
        state.opponents[existingIndex].score = score;
      } else {
        state.opponents.push({
          playerId,
          playerName,
          spectrum,
          score,
          isEliminated: false,
        });
      }
    },

    /**
     * Mark opponent as eliminated
     */
    eliminateOpponent: (state, action: PayloadAction<string>) => {
      const opponent = state.opponents.find((o) => o.playerId === action.payload);
      if (opponent) {
        opponent.isEliminated = true;
      }
    },

    /**
     * Add pending penalty lines (from server)
     */
    addPendingPenalty: (state, action: PayloadAction<number>) => {
      state.pendingPenaltyLines += action.payload;
    },

    /**
     * Clear pending penalty (after applied)
     */
    clearPendingPenalty: (state) => {
      state.pendingPenaltyLines = 0;
    },

    /**
     * Pause/unpause game
     */
    setPaused: (state, action: PayloadAction<boolean>) => {
      state.isPaused = action.payload;
    },

    /**
     * Toggle pause
     */
    togglePause: (state) => {
      state.isPaused = !state.isPaused;
    },

    /**
     * Game over (from server)
     */
    gameOver: (state, action: PayloadAction<{ reason?: string }>) => {
      state.isGameOver = true;
      state.gameOverReason = action.payload.reason ?? 'Game Over';
    },

    /**
     * Set rows that are being cleared (for line clear animation)
     */
    setClearingRows: (state, action: PayloadAction<number[]>) => {
      state.clearingRows = action.payload;
    },

    /**
     * Clear the clearing rows animation state
     */
    clearClearingRows: (state) => {
      state.clearingRows = [];
    },

    /**
     * Set penalty rows (for penalty line animation)
     */
    setPenaltyRows: (state, action: PayloadAction<number[]>) => {
      state.penaltyRows = action.payload;
    },

    /**
     * Clear penalty rows animation state
     */
    clearPenaltyRows: (state) => {
      state.penaltyRows = [];
    },

    /**
     * Reset game state
     */
    resetGame: () => {
      return initialState;
    },
  },
});

export const {
  initializeGame,
  updateGameState,
  updateOpponentSpectrum,
  eliminateOpponent,
  addPendingPenalty,
  clearPendingPenalty,
  setPaused,
  togglePause,
  gameOver,
  setClearingRows,
  clearClearingRows,
  setPenaltyRows,
  clearPenaltyRows,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;

// Selectors
export const selectBoard = (state: { game: GameState }) => state.game.board;
export const selectCurrentPiece = (state: { game: GameState }) => state.game.currentPiece;
export const selectGhostPiece = (state: { game: GameState }) => state.game.ghostPiece;
export const selectNextPieces = (state: { game: GameState }) => state.game.nextPieces;
export const selectScore = (state: { game: GameState }) => state.game.score;
export const selectLevel = (state: { game: GameState }) => state.game.level;
export const selectLinesCleared = (state: { game: GameState }) => state.game.linesCleared;
export const selectTotalLinesCleared = (state: { game: GameState }) =>
  state.game.totalLinesCleared;
export const selectIsPaused = (state: { game: GameState }) => state.game.isPaused;
export const selectIsGameOver = (state: { game: GameState }) => state.game.isGameOver;
export const selectGameOverReason = (state: { game: GameState }) => state.game.gameOverReason;
export const selectOpponents = (state: { game: GameState }) => state.game.opponents;
export const selectPendingPenaltyLines = (state: { game: GameState }) =>
  state.game.pendingPenaltyLines;
export const selectBoardDimensions = (state: { game: GameState }) => ({
  width: state.game.boardWidth,
  height: state.game.boardHeight,
});
export const selectClearingRows = (state: { game: GameState }) => state.game.clearingRows;
export const selectPenaltyRows = (state: { game: GameState }) => state.game.penaltyRows;
