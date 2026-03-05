/**
 * Sprint Tetris Mode
 * Game speed increases over time based on lines cleared and score
 */

import { GameMode } from '../../../../shared/types/game.js';
import { GameModeStrategy } from '../GameModeStrategy.js';

export class SprintMode implements GameModeStrategy {
  readonly mode = GameMode.Sprint;
  
  // Speed increase factors
  private static readonly BASE_SPEED_MULTIPLIER = 1.0;
  private static readonly LINES_SPEED_FACTOR = 0.05; // 5% faster per 10 lines cleared
  private static readonly SCORE_SPEED_FACTOR = 0.00001; // Tiny speed increase per point
  private static readonly MAX_SPEED_MULTIPLIER = 10.0; // Cap at 10x speed
  private static readonly MIN_DROP_INTERVAL = 50; // Minimum 50ms drop interval

  // Cache for performance optimization
  private _lastCalculatedInterval: number = 1000;
  private _lastLinesCleared: number = 0;
  private _lastScore: number = 0;

  onPiecePlaced(board: number[][], lockedCells: Array<{ x: number; y: number; type: number }>): number[][] {
    // Sprint mode doesn't modify the board after piece placement
    return board;
  }

  calculateDropInterval(baseInterval: number, linesCleared: number, score: number): number {
    // Use cache if values haven't changed significantly
    if (linesCleared === this._lastLinesCleared && score === this._lastScore) {
      return this._lastCalculatedInterval;
    }

    // Only recalculate if there's a meaningful change
    const linesDiff = Math.abs(linesCleared - this._lastLinesCleared);
    const scoreDiff = Math.abs(score - this._lastScore);
    
    // Only recalculate if lines changed by 1+ or score changed by 100+ points
    if (linesDiff < 1 && scoreDiff < 100) {
      return this._lastCalculatedInterval;
    }

    // Calculate speed multiplier based on lines cleared and score
    const linesMultiplier = 1 + (Math.floor(linesCleared / 10) * SprintMode.LINES_SPEED_FACTOR);
    const scoreMultiplier = 1 + (score * SprintMode.SCORE_SPEED_FACTOR);
    
    // Combine multipliers but cap at maximum
    let totalMultiplier = linesMultiplier * scoreMultiplier;
    totalMultiplier = Math.min(totalMultiplier, SprintMode.MAX_SPEED_MULTIPLIER);
    
    // Apply multiplier to reduce drop interval (faster speed)
    const newInterval = Math.max(
      baseInterval / totalMultiplier,
      SprintMode.MIN_DROP_INTERVAL
    );
    
    // Cache the result
    this._lastCalculatedInterval = Math.floor(newInterval);
    this._lastLinesCleared = linesCleared;
    this._lastScore = score;
    
    return this._lastCalculatedInterval;
  }

  onLinesCleared(linesCount: number, board: number[][]): {
    animations?: Array<{ type: string; data: any }>;
    boardModifications?: number[][];
  } {
    // Sprint mode could add special visual effects for speed increases
    const animations = [];
    
    // Add speed boost animation for significant line clears
    if (linesCount >= 3) {
      animations.push({
        type: 'SPEED_BOOST',
        data: {
          multiplier: linesCount,
          timestamp: Date.now()
        }
      });
    }
    
    return { animations };
  }

  /**
   * Get the current speed multiplier for display purposes
   */
  getSpeedMultiplier(linesCleared: number, score: number): number {
    const linesMultiplier = 1 + (Math.floor(linesCleared / 10) * SprintMode.LINES_SPEED_FACTOR);
    const scoreMultiplier = 1 + (score * SprintMode.SCORE_SPEED_FACTOR);
    
    return Math.min(linesMultiplier * scoreMultiplier, SprintMode.MAX_SPEED_MULTIPLIER);
  }
}
