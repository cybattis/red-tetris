/**
 * PlayerBoard Component
 * 
 * A complete game board unit for a single player, containing:
 * - Hold piece panel
 * - Game board (with current piece and ghost)
 * - Next pieces panel
 * - Score display
 * - Player info card
 * 
 * This component is reusable for both the local player and opponents
 * in multiplayer games.
 */

import { memo } from 'react';
import styles from './PlayerBoard.module.css';
import { Board } from '../Board';
import { NextPiece } from './NextPiece';
import { HoldPiece } from './HoldPiece';
import { ScoreDisplay } from './ScoreDisplay';
import type { PieceState } from '../../store/slices/gameSlice';

export interface PlayerBoardProps {
  /** Player's name */
  playerName: string;
  /** Whether this is the current player (you) */
  isCurrentPlayer?: boolean;
  /** Whether this player is the host */
  isHost?: boolean;
  
  // Board state
  /** The game board grid */
  board: number[][];
  /** Board width */
  width?: number;
  /** Board height */
  height?: number;
  /** Current falling piece */
  currentPiece?: PieceState | null;
  /** Ghost piece preview */
  ghostPiece?: PieceState | null;
  
  // Piece queue
  /** Next pieces in queue */
  nextPieces?: number[];
  /** How many next pieces to show */
  maxNextDisplay?: number;
  
  // Hold
  /** Currently held piece type */
  holdPiece?: number | null;
  /** Whether player can hold right now */
  canHold?: boolean;
  
  // Score
  /** Current score */
  score?: number;
  /** Current level */
  level?: number;
  /** Lines cleared */
  linesCleared?: number;
  
  // Game state
  /** Is the game paused */
  isPaused?: boolean;
  /** Is this player eliminated/game over */
  isGameOver?: boolean;
  
  // Layout options
  /** Size variant for the board */
  size?: 'normal' | 'small';
}

/**
 * PlayerBoard - A complete self-contained game board for one player
 */
export const PlayerBoard = memo(function PlayerBoard({
  playerName,
  isCurrentPlayer = false,
  isHost = false,
  
  board,
  width = 10,
  height = 20,
  currentPiece = null,
  ghostPiece = null,
  
  nextPieces = [],
  maxNextDisplay = 3,
  
  holdPiece = null,
  canHold = true,
  
  score = 0,
  level = 1,
  linesCleared = 0,
  
  isPaused = false,
  isGameOver = false,
  
  size = 'normal',
}: PlayerBoardProps) {
  const cellSize = size === 'small' ? 20 : 28;
  
  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.gameArea}>
        <aside className={styles.leftSidebar}>
          <HoldPiece pieceType={holdPiece} canHold={canHold} />
        </aside>

        <div className={styles.boardSection}>
          <Board
            board={board}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            width={width}
            height={height}
            cellSize={cellSize}
            isPaused={isPaused}
            isGameOver={isGameOver}
          />
        </div>

        <aside className={styles.rightSidebar}>
          <NextPiece pieces={nextPieces} maxDisplay={maxNextDisplay} />
          <ScoreDisplay score={score} level={level} linesCleared={linesCleared} />
        </aside>
      </div>

      <div className={`${styles.playerCard} ${isCurrentPlayer ? styles.currentPlayer : ''} ${isGameOver ? styles.eliminated : ''}`}>
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>{playerName}</span>
          <div className={styles.badges}>
            {isHost && <span className={styles.hostBadge}>Host</span>}
            {isCurrentPlayer && <span className={styles.youBadge}>You</span>}
          </div>
        </div>
        {isGameOver && (
          <span className={styles.gameOverBadge}>Game Over</span>
        )}
      </div>
    </div>
  );
});

export default PlayerBoard;
