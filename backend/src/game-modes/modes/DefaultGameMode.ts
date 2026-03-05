/**
 * Default Game Mode
 * Standard Tetris gameplay without any special modifications
 * Used for Classic and Invisible modes (invisibility is handled frontend-side)
 */

import { GameMode } from '../../../../shared/types/game.js';
import { GameModeStrategy } from '../GameModeStrategy.js';

export class DefaultGameMode implements GameModeStrategy {
  constructor(public readonly mode: GameMode) {}

  onPiecePlaced(board: number[][], lockedCells: Array<{ x: number; y: number; type: number }>): number[][] {
    // Default mode doesn't modify the board after piece placement
    return board;
  }

  calculateDropInterval(baseInterval: number, linesCleared: number, score: number): number {
    // Default mode uses the base interval without modifications
    return baseInterval;
  }

  onLinesCleared(linesCount: number, board: number[][]): {
    animations?: Array<{ type: string; data: any }>;
    boardModifications?: number[][];
  } {
    // Default mode doesn't add any special effects for line clearing
    return {};
  }
}
