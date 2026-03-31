/**
 * Game Slice
 *
 * Stores the game state received from the server.
 * This is a DISPLAY-ONLY slice - all game logic runs on the server.
 * We just store what the server sends us and render it.
 */
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  AnimationType,
  type EndGameReason,
  type GameAnimationData,
  type GameStateUpdate,
  type LockedCell,
  type Trail,
} from "@shared/types/game";
import type { IPlayer, OpponentsGameState } from "@shared/types/player.ts";
import type { PieceState } from "@shared/types/piece.ts";

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
  endGameState: EndGameReason | null;

  // Penalty lines pending (from server)
  pendingPenaltyLines: number;

  // Animation state (for visual effects)
  clearingRows: number[]; // Row indices currently being cleared
  penaltyRows: number[]; // Row indices that are penalty lines (for animation)

  // Animation data from server
  lockedCells: LockedCell[];
  hardDropTrail: Trail[];

  // Animation deduplication
  lastAnimationTimestamp: { [key: string]: number };

  // Multiplayer - other players' states
  currentBoardPlayer: IPlayer | null;
  opponent: OpponentsGameState | null;
}

/**
 * Initial state - empty board until server sends data
 */
const createEmptyBoard = (width: number, height: number): number[][] => {
  return Array.from({ length: height }, () => new Array(width).fill(0));
};

const initialState: GameState = {
  board: createEmptyBoard(10, 20),
  boardWidth: 10,
  boardHeight: 20,
  isPaused: false,
  isGameOver: false,
  endGameState: null,

  currentPiece: null, // No pieces until game starts
  ghostPiece: null,
  nextPieces: [],
  score: 0,
  level: 1,
  linesCleared: 0,
  totalLinesCleared: 0,
  pendingPenaltyLines: 0,

  // Animation state
  clearingRows: [],
  penaltyRows: [],
  lockedCells: [],
  hardDropTrail: [],
  lastAnimationTimestamp: {}, // Animation deduplication

  currentBoardPlayer: null,
  opponent: null,
};

const gameSlice = createSlice({
  name: "game",
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
      }>,
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
      state.endGameState = null;
      state.pendingPenaltyLines = 0;
      state.currentBoardPlayer = null;
      state.opponent = null;
      state.clearingRows = [];
      state.penaltyRows = [];
      state.lockedCells = [];
      state.hardDropTrail = [];
      state.lastAnimationTimestamp = {};
    },

    /**
     * Update game state from server
     * This is the main action - server sends full or partial state updates
     */
    updateGameState: (state, action: PayloadAction<GameStateUpdate>) => {
      const update = action.payload;
      console.log(" Redux updateGameState called with:", update);

      if (update.board !== undefined) state.board = update.board;
      if (update.currentPiece !== undefined)
        state.currentPiece = update.currentPiece;
      if (update.ghostPiece !== undefined) state.ghostPiece = update.ghostPiece;
      if (update.nextPieces !== undefined) state.nextPieces = update.nextPieces;
      if (update.score !== undefined) state.score = update.score;
      if (update.level !== undefined) state.level = update.level;
      if (update.linesCleared !== undefined)
        state.linesCleared = update.linesCleared;
      if (update.totalLinesCleared !== undefined)
        state.totalLinesCleared = update.totalLinesCleared;
      if (update.player !== undefined) state.currentBoardPlayer = update.player;

      const gameSettings = update.gameSettings;
      if (gameSettings) {
        if (update.gameSettings.boardWidth !== undefined)
          state.boardWidth = gameSettings.boardWidth;
        if (update.gameSettings.boardHeight !== undefined)
          state.boardHeight = gameSettings.boardHeight;
      }

      if (update.isGameOver !== undefined) {
        console.log(" Setting isGameOver to:", update.isGameOver);
        state.isGameOver = update.isGameOver;
      }
      if (update.gameOverReason !== undefined) {
        state.endGameState = update.gameOverReason as EndGameReason;
      }
      if (update.isPaused !== undefined) {
        console.log("⏸ Setting isPaused to:", update.isPaused);
        state.isPaused = update.isPaused;
      }
      if (update.opponent !== undefined) {
        console.log(" Setting opponent to:", update.opponent);
        state.opponent = update.opponent;
      }

      console.log(" Final Redux state after updateGameState:", {
        isGameOver: state.isGameOver,
        gameOverReason: state.endGameState,
        isPaused: state.isPaused,
        opponent: state.opponent,
      });
    },

    /**
     * Update opponent spectrum (for multiplayer display)
     */
    updateOpponentSpectrum: (
      state,
      action: PayloadAction<OpponentsGameState>,
    ) => {
      state.opponent = action.payload;
    },

    /**
     * Mark opponent as eliminated
     */
    eliminateOpponent: (state, action: PayloadAction<string>) => {
      if (state.opponent?.player.id === action.payload) {
        state.opponent.isEliminated = true;
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
    gameOver: (state, action: PayloadAction<{ reason: EndGameReason }>) => {
      state.isGameOver = true;
      state.endGameState = action.payload.reason;
    },

    /**
     * Handle game ended from server - stops input and cleans up state
     */
    gameEnded: (state, action: PayloadAction<{ reason: EndGameReason }>) => {
      state.isGameOver = true;
      state.endGameState = action.payload.reason;
      state.isPaused = true; // Stop the game loop
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
     * Handle game animations from server
     */
    handleAnimation: (
      state,
      action: PayloadAction<{ type: string; data: GameAnimationData }>,
    ) => {
      const { type, data } = action.payload;
      const timestamp = data.timestamp || Date.now();

      // Prevent duplicate animations by checking timestamp
      if (state.lastAnimationTimestamp[type] === timestamp) {
        return; // Skip duplicate animation
      }

      state.lastAnimationTimestamp[type] = timestamp;

      switch (type) {
        case AnimationType.LOCK_PIECE:
          // Clear any existing lock animation first
          state.lockedCells = [];
          if (!data.cells) break;

          // Show piece lock animation with unique timestamp-based keys
          state.lockedCells = data.cells.map(
            (cell: LockedCell, index: number) => ({
              ...cell,
              id: `lock-${timestamp}-${index}`,
            }),
          );
          break;

        case AnimationType.HARD_DROP:
          // Clear any existing trail animation first
          state.hardDropTrail = [];
          if (!data.trails) break;

          // Show hard drop trail animation with unique timestamp-based keys
          state.hardDropTrail = data.trails.map(
            (trail: Trail, index: number) => ({
              ...trail,
              id: `trail-${timestamp}-${index}`,
            }),
          );
          break;

        case AnimationType.LINE_CLEAR:
          // Show line clear animation (only set once, don't clear first)
          state.clearingRows = data.rows!;
          break;

        case AnimationType.PENALTY_LINES:
          // Show penalty line warning animation at the bottom rows
          state.penaltyRows = data.rows!;
          break;
      }
    },

    /**
     * Clear locked cells animation
     */
    clearLockedCells: (state) => {
      state.lockedCells = [];
    },

    /**
     * Clear hard drop trail animation
     */
    clearHardDropTrail: (state) => {
      state.hardDropTrail = [];
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
  gameEnded,
  setClearingRows,
  clearClearingRows,
  setPenaltyRows,
  clearPenaltyRows,
  handleAnimation,
  clearLockedCells,
  clearHardDropTrail,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;

// Selectors
export const selectBoard = (state: { game: GameState }) => state.game.board;
export const selectCurrentPiece = (state: { game: GameState }) =>
  state.game.currentPiece;
export const selectGhostPiece = (state: { game: GameState }) =>
  state.game.ghostPiece;
export const selectNextPieces = (state: { game: GameState }) =>
  state.game.nextPieces;
export const selectScore = (state: { game: GameState }) => state.game.score;
export const selectLevel = (state: { game: GameState }) => state.game.level;
export const selectLinesCleared = (state: { game: GameState }) =>
  state.game.linesCleared;
export const selectTotalLinesCleared = (state: { game: GameState }) =>
  state.game.totalLinesCleared;
export const selectIsPaused = (state: { game: GameState }) =>
  state.game.isPaused;
export const selectIsGameOver = (state: { game: GameState }) =>
  state.game.isGameOver;
export const selectGameOverReason = (state: { game: GameState }) =>
  state.game.endGameState;
export const selectOpponent = (state: { game: GameState }) =>
  state.game.opponent;
export const selectCurrentBoardPlayer = (state: { game: GameState }) =>
  state.game.currentBoardPlayer;
export const selectPendingPenaltyLines = (state: { game: GameState }) =>
  state.game.pendingPenaltyLines;

// Memoized selector: returns a stable reference unless width/height actually change
let _lastBoardWidth = 0;
let _lastBoardHeight = 0;
let _lastBoardDimensions = { width: 0, height: 0 };
export const selectBoardDimensions = (state: { game: GameState }) => {
  const w = state.game.boardWidth;
  const h = state.game.boardHeight;
  if (w !== _lastBoardWidth || h !== _lastBoardHeight) {
    _lastBoardWidth = w;
    _lastBoardHeight = h;
    _lastBoardDimensions = { width: w, height: h };
  }
  return _lastBoardDimensions;
};

export const selectClearingRows = (state: { game: GameState }) =>
  state.game.clearingRows;
export const selectPenaltyRows = (state: { game: GameState }) =>
  state.game.penaltyRows;
export const selectLockedCells = (state: { game: GameState }) =>
  state.game.lockedCells;
export const selectHardDropTrail = (state: { game: GameState }) =>
  state.game.hardDropTrail;
