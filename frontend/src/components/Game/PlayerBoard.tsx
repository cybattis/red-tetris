import { memo } from 'react';
import styles from './PlayerBoard.module.css';
import { Board } from '../Board';
import { NextPiece } from './NextPiece';
import { ScoreDisplay } from './ScoreDisplay';
import type { PieceState } from '../../store/slices/gameSlice';

export interface PlayerBoardProps {
  playerName: string;
  isCurrentPlayer?: boolean;
  isHost?: boolean;
  board: number[][];
  width?: number;
  height?: number;
  currentPiece?: PieceState | null;
  ghostPiece?: PieceState | null;
  nextPieces?: number[];
  maxNextDisplay?: number;
  score?: number;
  level?: number;
  linesCleared?: number;
  isPaused?: boolean;
  isGameOver?: boolean;
  size?: 'normal' | 'small';
  clearingRows?: number[];
  penaltyRows?: number[];
  lockedCells?: { x: number; y: number; type: number }[];
  hardDropTrail?: { x: number; startY: number; endY: number; type: number }[];
}

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
  
  score = 0,
  level = 1,
  linesCleared = 0,
  
  isPaused = false,
  isGameOver = false,
  
  size = 'normal',
  
  clearingRows = [],
  penaltyRows = [],
  lockedCells = [],
  hardDropTrail = [],
}: PlayerBoardProps) {
  const cellSize = size === 'small' ? 20 : 28;
  
  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.gameArea}>
        <div className={styles.boardColumn}>
          <Board
            board={board}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            width={width}
            height={height}
            cellSize={cellSize}
            isPaused={isPaused}
            isGameOver={isGameOver}
            clearingRows={clearingRows}
            penaltyRows={penaltyRows}
            lockedCells={lockedCells}
            hardDropTrail={hardDropTrail}
          />

          <div className={`${styles.playerCard} ${isCurrentPlayer ? styles.currentPlayer : ''} ${isGameOver ? styles.eliminated : ''}`}>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>{playerName}</span>
              {isGameOver && (
                <span className={styles.gameOverBadge}>Game Over</span>
              )}
            </div>
            <div className={styles.badges}>
              {isHost && <span className={styles.hostBadge}>Host</span>}
              {isCurrentPlayer && <span className={styles.youBadge}>You</span>}
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <NextPiece pieces={nextPieces} maxDisplay={maxNextDisplay} />
          <ScoreDisplay score={score} level={level} linesCleared={linesCleared} />
        </aside>
      </div>
    </div>
  );
});

export default PlayerBoard;
