import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import styles from './Board.module.css';
import { Cell } from './Cell';
import { CELL_SIZE, CELL_GAP, getCellColor } from '../../utils/colors';

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
  clearingRows?: number[];
  penaltyRows?: number[];
  lockedCells?: { x: number; y: number; type: number }[];
  hardDropTrail?: { x: number; startY: number; endY: number; type: number }[];
}

interface Particle {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  type?: 'explosion' | 'trail' | 'impact';
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
  clearingRows = [],
  penaltyRows = [],
  lockedCells = [],
  hardDropTrail = [],
}: BoardProps) {
  const boardHeight = height ?? board.length;
  const boardWidth = width ?? (board[0]?.length ?? 10);

  const [isShaking, setIsShaking] = useState(false);
  const [isPenaltyWarning, setIsPenaltyWarning] = useState(false);
  const [isLockImpact, setIsLockImpact] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lockFlashCells, setLockFlashCells] = useState<Set<string>>(new Set());

  const clearingRowSet = useMemo(() => new Set(clearingRows), [clearingRows]);
  const penaltyRowSet = useMemo(() => new Set(penaltyRows), [penaltyRows]);

  const generateLineClearParticles = useCallback((rows: number[]) => {
    const newParticles: Particle[] = [];
    const colors = rows.flatMap(row => 
      board[row]?.map(cell => getCellColor(cell, false)) ?? []
    ).filter(c => c !== 'transparent');
    
    const sparkleColors = ['#fff', '#ffff00', '#00ffff', '#ff00ff', ...colors];
    
    const burstCount = rows.length * 3; // 3 bursts per row
    
    for (let burst = 0; burst < burstCount; burst++) {
      const row = rows[Math.floor(burst / 3)];
      const rowY = row * (cellSize + CELL_GAP) + cellSize / 2;
      const burstX = (burst % 3 + 0.5) * (boardWidth * (cellSize + CELL_GAP)) / 3;
      
      const particlesPerBurst = 12;
      for (let i = 0; i < particlesPerBurst; i++) {
        const angle = (i / particlesPerBurst) * Math.PI * 2;
        const speed = 80 + Math.random() * 120;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        
        newParticles.push({
          id: `${Date.now()}-${burst}-${i}`,
          x: burstX,
          y: rowY,
          dx,
          dy,
          color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)] || '#fff',
          size: 3 + Math.random() * 5,
          type: 'explosion',
        });
      }
    }
    
    for (let i = 0; i < 20; i++) {
      const row = rows[Math.floor(Math.random() * rows.length)];
      const rowY = row * (cellSize + CELL_GAP);
      
      newParticles.push({
        id: `sparkle-${Date.now()}-${i}`,
        x: Math.random() * boardWidth * (cellSize + CELL_GAP),
        y: rowY + Math.random() * cellSize,
        dx: (Math.random() - 0.5) * 200,
        dy: (Math.random() - 0.5) * 200,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)] || '#fff',
        size: 2 + Math.random() * 4,
        type: 'explosion',
      });
    }
    
    return newParticles;
  }, [board, boardWidth, cellSize]);

  const generateHardDropParticles = useCallback((trails: { x: number; startY: number; endY: number; type: number }[]) => {
    const newParticles: Particle[] = [];
    
    for (const trail of trails) {
      const color = getCellColor(trail.type, false);
      const x = trail.x * (cellSize + CELL_GAP) + cellSize / 2;
      
      const distance = trail.endY - trail.startY;
      const particleCount = Math.min(distance * 2, 20);
      
      for (let i = 0; i < particleCount; i++) {
        const progress = i / particleCount;
        const y = (trail.startY + progress * distance) * (cellSize + CELL_GAP) + cellSize / 2;
        
        newParticles.push({
          id: `trail-${Date.now()}-${trail.x}-${i}`,
          x,
          y,
          dx: (Math.random() - 0.5) * 30,
          dy: 20 + Math.random() * 40,
          color,
          size: 3 + Math.random() * 4,
          type: 'trail',
        });
      }
    }
    
    return newParticles;
  }, [cellSize]);

  const generateLockImpactParticles = useCallback((cells: { x: number; y: number; type: number }[]) => {
    const newParticles: Particle[] = [];
    
    for (const cell of cells) {
      const color = getCellColor(cell.type, false);
      const x = cell.x * (cellSize + CELL_GAP) + cellSize / 2;
      const y = cell.y * (cellSize + CELL_GAP) + cellSize / 2;
      
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 30 + Math.random() * 50;
        
        newParticles.push({
          id: `impact-${Date.now()}-${cell.x}-${cell.y}-${i}`,
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color,
          size: 2 + Math.random() * 3,
          type: 'impact',
        });
      }
    }
    
    return newParticles;
  }, [cellSize]);

  useEffect(() => {
    if (clearingRows.length > 0) {
      setIsShaking(true);
      setParticles(prev => [...prev, ...generateLineClearParticles(clearingRows)]);
      
      const timer = setTimeout(() => {
        setIsShaking(false);
        setParticles([]);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [clearingRows, generateLineClearParticles]);

  useEffect(() => {
    if (hardDropTrail.length > 0) {
      setParticles(prev => [...prev, ...generateHardDropParticles(hardDropTrail)]);
      
      const timer = setTimeout(() => {
        setParticles(prev => prev.filter(p => p.type !== 'trail'));
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [hardDropTrail, generateHardDropParticles]);

  useEffect(() => {
    if (lockedCells.length > 0) {
      setIsLockImpact(true);
      setLockFlashCells(new Set(lockedCells.map(c => `${c.x},${c.y}`)));
      setParticles(prev => [...prev, ...generateLockImpactParticles(lockedCells)]);
      
      const timer = setTimeout(() => {
        setIsLockImpact(false);
        setLockFlashCells(new Set());
        setParticles(prev => prev.filter(p => p.type !== 'impact'));
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [lockedCells, generateLockImpactParticles]);

  useEffect(() => {
    if (penaltyRows.length > 0) {
      setIsPenaltyWarning(true);
      
      const timer = setTimeout(() => {
        setIsPenaltyWarning(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [penaltyRows]);

  const { cells, activeCells, ghostCells } = useMemo(
    () => createDisplayBoard(board, currentPiece, ghostPiece),
    [board, currentPiece, ghostPiece]
  );

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${boardWidth}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${boardHeight}, ${cellSize}px)`,
    gap: `${CELL_GAP}px`,
  };

  const containerClasses = [
    styles.boardContainer,
    isShaking ? styles.shaking : '',
    isPenaltyWarning ? styles.penaltyWarning : '',
    isLockImpact ? styles.lockImpact : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.board} style={gridStyle}>
        {cells.map((row, y) =>
          row.map((cellValue, x) => {
            const key = `${x},${y}`;
            const isActive = activeCells.has(key);
            const isGhost = ghostCells.has(key);
            const isClearing = clearingRowSet.has(y);
            const isPenalty = penaltyRowSet.has(y);
            const isLocked = lockFlashCells.has(key);

            const displayValue = isGhost && ghostPiece ? ghostPiece.type : cellValue;

            return (
              <Cell
                key={key}
                value={displayValue}
                isActive={isActive}
                isGhost={isGhost}
                isClearing={isClearing}
                isPenalty={isPenalty}
                isLocked={isLocked}
                size={cellSize}
              />
            );
          })
        )}

        {particles.length > 0 && (
          <div className={styles.particles}>
            {particles.map((particle) => (
              <div
                key={particle.id}
                className={styles.particle}
                style={{
                  left: particle.x,
                  top: particle.y,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 ${particle.size}px ${particle.color}`,
                  '--dx': `${particle.dx}px`,
                  '--dy': `${particle.dy}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
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
