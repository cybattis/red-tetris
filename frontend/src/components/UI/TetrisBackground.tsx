import { memo, useMemo } from 'react';
import styles from './TetrisBackground.module.css';

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
type PieceType = typeof PIECE_TYPES[number];

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

const PIECE_SHAPES: Record<PieceType, number[][]> = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]], // 4 horizontal
  O: [[0, 0], [0, 1], [1, 0], [1, 1]], // 2x2 square
  T: [[0, 1], [1, 0], [1, 1], [1, 2]], // T shape
  S: [[0, 1], [0, 2], [1, 0], [1, 1]], // S shape
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]], // Z shape
  J: [[0, 0], [1, 0], [1, 1], [1, 2]], // J shape
  L: [[0, 2], [1, 0], [1, 1], [1, 2]], // L shape
};

interface FallingPiece {
  id: number;
  type: PieceType;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

function generatePieces(count: number): FallingPiece[] {
  const pieces: FallingPiece[] = [];
  
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      type: PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)],
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 8 + Math.random() * 25, // 8-33 seconds
      size: 15 + Math.random() * 30,
      opacity: 0.15 + Math.random() * 0.2,
    });
  }
  
  return pieces;
}

export interface TetrisBackgroundProps {
  pieceCount?: number;
  className?: string;
}

export const TetrisBackground = memo(function TetrisBackground({
  pieceCount = 25,
  className = '',
}: TetrisBackgroundProps) {
  const pieces = useMemo(() => generatePieces(pieceCount), [pieceCount]);
  
  return (
    <div className={`${styles.background} ${className}`} aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={`${styles.piece} ${styles[`piece${piece.type}`]}`}
          style={{
            '--piece-left': `${piece.left}%`,
            '--piece-delay': `${piece.delay}s`,
            '--piece-duration': `${piece.duration}s`,
            '--piece-size': `${piece.size}px`,
            '--piece-color': PIECE_COLORS[piece.type],
            '--piece-opacity': piece.opacity,
          } as React.CSSProperties}
        >
          {PIECE_SHAPES[piece.type].map(([row, col], idx) => (
            <span
              key={idx}
              className={styles.cell}
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export default TetrisBackground;
