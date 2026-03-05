/**
 * Game Mode Strategy Pattern Implementation
 * Defines different behaviors for various Tetris game modes
 */

import { GameMode } from '../../../shared/types/game.js';

export interface GameModeStrategy {
  readonly mode: GameMode;
  
  /**
   * Called when a piece is placed on the board (after locking)
   * @param board - The current game board
   * @param lockedCells - The cells that were just locked
   * @returns Modified board (for invisible mode) or original board
   */
  onPiecePlaced(board: number[][], lockedCells: Array<{ x: number; y: number; type: number }>): number[][];
  
  /**
   * Calculates the current drop interval based on game state
   * @param baseInterval - The base gravity interval
   * @param linesCleared - Total lines cleared in the game
   * @param score - Current score
   * @returns The modified drop interval in milliseconds
   */
  calculateDropInterval(baseInterval: number, linesCleared: number, score: number): number;
  
  /**
   * Called when lines are cleared to apply mode-specific effects
   * @param linesCount - Number of lines cleared
   * @param board - Current board state
   * @returns Any additional effects or animations to apply
   */
  onLinesCleared(linesCount: number, board: number[][]): {
    animations?: Array<{ type: string; data: any }>;
    boardModifications?: number[][];
  };
}
