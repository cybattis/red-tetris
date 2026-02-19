import { memo } from 'react';
import styles from './HoldPiece.module.css';
import { Cell } from '../Board/Cell';
import { PIECE_SHAPES } from '../../utils/pieceShapes';

export interface HoldPieceProps {
  pieceType: number | null;
  canHold?: boolean;
  title?: string;
}

export const HoldPiece = memo(function HoldPiece({
  pieceType,
  canHold = true,
  title = 'Hold',
}: HoldPieceProps) {
  const shape = pieceType !== null ? (PIECE_SHAPES[pieceType] ?? null) : null;
  const cellSize = 18;

  return (
    <div className={`${styles.container} ${!canHold ? styles.locked : ''}`}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.pieceHolder}>
        {shape && pieceType !== null ? (
          <div
            className={styles.pieceGrid}
            style={{
              gridTemplateColumns: `repeat(${shape[0]?.length ?? 1}, ${cellSize}px)`,
            }}
          >
            {shape.map((row: number[], y: number) =>
              row.map((cell: number, x: number) => (
                <Cell
                  key={`${x}-${y}`}
                  value={cell ? pieceType : 0}
                  size={cellSize}
                />
              ))
            )}
          </div>
        ) : (
          <div className={styles.empty}>--</div>
        )}
      </div>
      {!canHold && <span className={styles.lockedLabel}>Locked</span>}
    </div>
  );
});

export default HoldPiece;
