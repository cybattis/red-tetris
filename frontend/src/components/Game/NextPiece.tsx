import { memo } from 'react';
import styles from './NextPiece.module.css';
import { Cell } from '../Board/Cell';
import { PIECE_SHAPES } from '../../utils/pieceShapes';

export interface NextPieceProps {
  pieces: number[];
  maxDisplay?: number;
  title?: string;
}

export const NextPiece = memo(function NextPiece({
  pieces,
  maxDisplay = 3,
  title = 'Next',
}: NextPieceProps) {
  const displayPieces = pieces.slice(0, maxDisplay);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.pieceList}>
        {displayPieces.length === 0 ? (
          <div className={styles.empty}>--</div>
        ) : (
          displayPieces.map((pieceType, index) => (
            <PiecePreview key={index} pieceType={pieceType} isFirst={index === 0} />
          ))
        )}
      </div>
    </div>
  );
});

interface PiecePreviewProps {
  pieceType: number;
  isFirst?: boolean;
}

const PiecePreview = memo(function PiecePreview({ pieceType, isFirst }: PiecePreviewProps) {
  const shape = PIECE_SHAPES[pieceType] ?? [[1]];
  const cellSize = isFirst ? 20 : 16;

  return (
    <div className={`${styles.piecePreview} ${isFirst ? styles.first : ''}`}>
      <div
        className={styles.pieceGrid}
        style={{
          gridTemplateColumns: `repeat(${shape[0]?.length ?? 1}, ${cellSize}px)`,
        }}
      >
        {shape.map((row, y) =>
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              value={cell ? pieceType : 0}
              size={cellSize}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default NextPiece;
