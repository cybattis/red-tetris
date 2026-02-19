import { memo, useMemo } from 'react';
import styles from './Board.module.css';
import { Cell } from './Cell';
import { CELL_SIZE, CELL_GAP } from '../../utils/colors';

export interface PieceState {
  type: number;
  position: { x: number; y: number };
  shape: number[][];
}

export interface BoardProps {
  board: number[][];
  currentPiece?: PieceState | null;
  ghostPiece?: PieceState | null;
  width?: number;
  height?: number;
  cellSize?: number;
  isPaused?: boolean;
  isGameOver?: boolean;
}

function createDisplayBoard(
  board: number[][],
  currentPiece: PieceState | null | undefined,
  ghostPiece: PieceState | null | undefined
): {
  cells: number[][];
  activeCells: Set<string>;
  ghostCells: Set<string>;
} {
  const height = board.length;
  const width = board[0]?.length ?? 10;

  const cells = board.map((row) => [...row]);
  const activeCells = new Set<string>();
  const ghostCells = new Set<string>();

  if (ghostPiece?.shape) {
    for (let py = 0; py < ghostPiece.shape.length; py++) {
      for (let px = 0; px < ghostPiece.shape[py].length; px++) {
        if (ghostPiece.shape[py][px] !== 0) {
          const boardX = ghostPiece.position.x + px;
          const boardY = ghostPiece.position.y + py;
          if (boardY >= 0 && boardY < height && boardX >= 0 && boardX < width) {
            ghostCells.add(`${boardX},${boardY}`);
          }
        }
      }
    }
  }

  if (currentPiece?.shape) {
    for (let py = 0; py < currentPiece.shape.length; py++) {
      for (let px = 0; px < currentPiece.shape[py].length; px++) {
        if (currentPiece.shape[py][px] !== 0) {
          const boardX = currentPiece.position.x + px;
          const boardY = currentPiece.position.y + py;
          if (boardY >= 0 && boardY < height && boardX >= 0 && boardX < width) {
            cells[boardY][boardX] = currentPiece.type;
            activeCells.add(`${boardX},${boardY}`);
            ghostCells.delete(`${boardX},${boardY}`);
          }
        }
      }
    }
  }

  return { cells, activeCells, ghostCells };
}

export const Board = memo(function Board({
  board,
  currentPiece,
  ghostPiece,
  width,
  height,
  cellSize = CELL_SIZE,
  isPaused = false,
  isGameOver = false,
}: BoardProps) {
  const boardHeight = height ?? board.length;
  const boardWidth = width ?? (board[0]?.length ?? 10);

  const { cells, activeCells, ghostCells } = useMemo(
    () => createDisplayBoard(board, currentPiece, ghostPiece),
    [board, currentPiece, ghostPiece]
  );

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${boardWidth}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${boardHeight}, ${cellSize}px)`,
    gap: `${CELL_GAP}px`,
  };

  return (
    <div className={styles.boardContainer}>
      <div className={styles.board} style={gridStyle}>
        {cells.map((row, y) =>
          row.map((cellValue, x) => {
            const key = `${x},${y}`;
            const isActive = activeCells.has(key);
            const isGhost = ghostCells.has(key);

            const displayValue = isGhost && ghostPiece ? ghostPiece.type : cellValue;

            return (
              <Cell
                key={key}
                value={displayValue}
                isActive={isActive}
                isGhost={isGhost}
                size={cellSize}
              />
            );
          })
        )}
      </div>

      {isPaused && (
        <div className={styles.overlay}>
          <span className={styles.overlayText}>PAUSED</span>
        </div>
      )}

      {isGameOver && (
        <div className={`${styles.overlay} ${styles.gameOver}`}>
          <span className={styles.overlayText}>GAME OVER</span>
        </div>
      )}
    </div>
  );
});

export default Board;
