import { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
  isInvisible?: boolean;
  clearingRows?: number[];
  penaltyRows?: number[];
  lockedCells?: { x: number; y: number; type: number; id?: string }[];
  hardDropTrail?: { x: number; startY: number; endY: number; type: number; id?: string }[];
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
  ghostPiece: PieceState | null | undefined,
  isInvisible: boolean
): {
  cells: number[][];
  ghostCells: Set<string>;
} {
  const height = board.length;
  const width = board[0]?.length ?? 10;

  // In invisible mode, start with an empty board (hide all locked pieces)
  // In normal mode, copy the existing board with locked pieces
  const cells = isInvisible
    ? Array.from({ length: height }, () => Array(width).fill(0))
    : board.map((row) => [...row]);
    
  const ghostCells = new Set<string>();

  // Add ghost piece
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

  // Add current falling piece
  if (currentPiece?.shape) {
    for (let py = 0; py < currentPiece.shape.length; py++) {
      for (let px = 0; px < currentPiece.shape[py].length; px++) {
        if (currentPiece.shape[py][px] !== 0) {
          const boardX = currentPiece.position.x + px;
          const boardY = currentPiece.position.y + py;
          if (boardY >= 0 && boardY < height && boardX >= 0 && boardX < width) {
            cells[boardY][boardX] = currentPiece.type;
            ghostCells.delete(`${boardX},${boardY}`);
          }
        }
      }
    }
  }

  return { cells, ghostCells };
}

export const Board = memo(function Board({
  board,
  currentPiece,
  ghostPiece,
  width,
  height,
  isPaused = false,
  isGameOver = false,
  isInvisible = false,
  clearingRows = [],
  penaltyRows = [],
  lockedCells = [],
  hardDropTrail = [],
}: BoardProps) {
  const boardHeight = height ?? board.length;
  const boardWidth = width ?? (board[0]?.length ?? 10);

  const standardWidth = 10;
  const standardCellSize = CELL_SIZE;
  
  const widthRatio = boardWidth / standardWidth;
  
  let scaleFactor = 1;
  if (widthRatio < 1) {
    scaleFactor = Math.min(1.2, 1 + (1 - widthRatio) * 0.3);
  } else if (widthRatio > 1) {
    scaleFactor = Math.max(0.8, 1 - (widthRatio - 1) * 0.15);
  }
  
  const actualCellSize = Math.round(standardCellSize * scaleFactor);

  const [isPenaltyWarning, setIsPenaltyWarning] = useState(false);
  const [isLockImpact, setIsLockImpact] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lockFlashCells, setLockFlashCells] = useState<Set<string>>(new Set());
  
  // Use refs for deduplication to avoid triggering re-renders
  const lastClearRowsRef = useRef<string>('');
  const lastBoardSignatureRef = useRef<string>('');

  // Maximum concurrent particles to prevent performance degradation
  const MAX_PARTICLES = 40;

  // Reset local state when a new game starts (detected by board becoming mostly empty)
  useEffect(() => {
    const filledCells = board.flat().filter(cell => cell !== 0).length;
    const signature = `${boardWidth}x${boardHeight}:${filledCells}`;
    
    // If board is nearly empty and we had content before, likely a new game
    if (filledCells <= 4 && lastBoardSignatureRef.current && lastBoardSignatureRef.current !== signature) {
      // Reset all animation state
      setParticles([]);
      setLockFlashCells(new Set());
      lastClearRowsRef.current = '';
      setIsPenaltyWarning(false);
      setIsLockImpact(false);
    }
    
    lastBoardSignatureRef.current = signature;
  }, [board, boardWidth, boardHeight]);

  const penaltyRowSet = useMemo(() => new Set(penaltyRows), [penaltyRows]);

  // Use a ref for board data in particle generation to avoid recreating callbacks on every board change
  const boardRef = useRef(board);
  boardRef.current = board;

  const generateLineClearParticles = useCallback((rows: number[]) => {
    const currentBoard = boardRef.current;
    const newParticles: Particle[] = [];
    
    const colors = rows.flatMap(row => 
      currentBoard[row]?.map(cell => getCellColor(cell, false)) ?? []
    ).filter(c => c !== 'transparent');
    
    const sparkleColors = ['#fff', '#ffff00', '#00ffff', '#ff00ff', ...colors];
    
    rows.forEach((row, rowIndex) => {
      const rowY = row * (actualCellSize + CELL_GAP) + actualCellSize / 2;
      
      for (let cellX = 0; cellX < boardWidth; cellX += 2) {  // Every other cell for performance
        const cellValue = currentBoard[row]?.[cellX];
        if (cellValue && cellValue !== 0) { // Only create particles from filled cells
          const cellCenterX = cellX * (actualCellSize + CELL_GAP) + actualCellSize / 2;
          const cellColor = getCellColor(cellValue, false);
          
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 50;
          const dx = Math.cos(angle) * speed;
          const dy = Math.sin(angle) * speed;
          
          newParticles.push({
            id: `lineclear-${Date.now()}-${rowIndex}-${cellX}`,
            x: cellCenterX,
            y: rowY,
            dx,
            dy,
            color: Math.random() < 0.7 ? cellColor : sparkleColors[Math.floor(Math.random() * sparkleColors.length)] || '#fff',
            size: 3 + Math.random() * 2,
            type: 'explosion',
          });
        }
      }
    });
    
    for (let i = 0; i < 3; i++) {
      const row = rows[Math.floor(Math.random() * rows.length)];
      const rowY = row * (actualCellSize + CELL_GAP) + actualCellSize / 2;
      
      newParticles.push({
        id: `sparkle-${Date.now()}-${i}`,
        x: Math.random() * boardWidth * (actualCellSize + CELL_GAP),
        y: rowY,
        dx: (Math.random() - 0.5) * 120,
        dy: (Math.random() - 0.5) * 120,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)] || '#fff',
        size: 3 + Math.random() * 4,
        type: 'explosion',
      });
    }
    
    return newParticles;
  }, [boardWidth, actualCellSize]);

  const generateHardDropParticles = useCallback((trails: { x: number; startY: number; endY: number; type: number; id?: string }[]) => {
    const newParticles: Particle[] = [];
    const baseTimestamp = Date.now();
    
    trails.forEach((trail, trailIndex) => {
      const color = getCellColor(trail.type, false);
      const x = trail.x * (actualCellSize + CELL_GAP) + actualCellSize / 2;
      
      const distance = trail.endY - trail.startY;
      const particleCount = Math.min(distance * 2, 20);
      
      for (let i = 0; i < particleCount; i++) {
        const progress = i / particleCount;
        const y = (trail.startY + progress * distance) * (actualCellSize + CELL_GAP) + actualCellSize / 2;
        
        newParticles.push({
          id: `trail-${baseTimestamp}-${trailIndex}-${i}`,
          x,
          y,
          dx: (Math.random() - 0.5) * 30,
          dy: 20 + Math.random() * 40,
          color,
          size: 3 + Math.random() * 4,
          type: 'trail',
        });
      }
    });
    
    return newParticles;
  }, [actualCellSize]);

  const generateLockImpactParticles = useCallback((cells: { x: number; y: number; type: number; id?: string }[]) => {
    const newParticles: Particle[] = [];
    const baseTimestamp = Date.now();
    
    cells.forEach((cell, cellIndex) => {
      const color = getCellColor(cell.type, false);
      const x = cell.x * (actualCellSize + CELL_GAP) + actualCellSize / 2;
      const y = cell.y * (actualCellSize + CELL_GAP) + actualCellSize / 2;
      
      // Reduced from 6 to 3 particles per cell for performance
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 30 + Math.random() * 50;
        
        newParticles.push({
          id: `impact-${baseTimestamp}-${cellIndex}-${i}`,
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          color,
          size: 2 + Math.random() * 3,
          type: 'impact',
        });
      }
    });
    
    return newParticles;
  }, [actualCellSize]);

  useEffect(() => {
    if (clearingRows.length > 0) {
      // Make a copy before sorting to avoid mutating the read-only array
      const clearKey = [...clearingRows].sort((a, b) => a - b).join(',');
      if (clearKey === lastClearRowsRef.current) {
        return; // Skip if this is the same line clear event
      }
      
      lastClearRowsRef.current = clearKey;
      
      const newParticles = generateLineClearParticles(clearingRows);
      setParticles(prev => {
        // Clear any existing line clear particles first
        const filteredParticles = prev.filter(p => !p.id.startsWith('lineclear-') && !p.id.startsWith('sparkle-'));
        const combined = [...filteredParticles, ...newParticles];
        // Cap total particles to prevent performance degradation
        return combined.slice(-MAX_PARTICLES);
      });
      
      const timer = setTimeout(() => {
        setParticles(prev => prev.filter(p => p.type !== 'explosion'));
        lastClearRowsRef.current = '';
      }, 800);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [clearingRows, generateLineClearParticles]);

  useEffect(() => {
    if (hardDropTrail.length > 0) {
      setParticles(prev => {
        const combined = [...prev, ...generateHardDropParticles(hardDropTrail)];
        return combined.slice(-MAX_PARTICLES);
      });
      
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
      setParticles(prev => {
        const combined = [...prev, ...generateLockImpactParticles(lockedCells)];
        return combined.slice(-MAX_PARTICLES);
      });
      
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

  const { cells, ghostCells } = useMemo(
    () => createDisplayBoard(board, currentPiece, ghostPiece, isInvisible),
    [board, currentPiece, ghostPiece, isInvisible]
  );

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${boardWidth}, ${actualCellSize}px)`,
    gridTemplateRows: `repeat(${boardHeight}, ${actualCellSize}px)`,
    gap: `${CELL_GAP}px`,
    backgroundSize: `${actualCellSize + CELL_GAP}px ${actualCellSize + CELL_GAP}px`,
  };

  const containerClasses = [
    styles.boardContainer,
    isPenaltyWarning ? styles.penaltyWarning : '',
    isLockImpact ? styles.lockImpact : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.board} style={gridStyle}>
        {cells.map((row, y) =>
          row.map((cellValue, x) => {
            const key = `${x},${y}`;
            const isGhost = ghostCells.has(key);
            const isPenalty = penaltyRowSet.has(y);
            const isLocked = lockFlashCells.has(key);

            // Display logic is now handled entirely in createDisplayBoard
            const displayValue = isGhost && ghostPiece ? ghostPiece.type : cellValue;

            return (
              <Cell
                key={key}
                value={displayValue}
                isGhost={isGhost}
                isClearing={false}
                isPenalty={isPenalty}
                isLocked={isLocked}
                size={actualCellSize}
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
                  transform: `translate(${particle.dx}px, ${particle.dy}px)`,
                }}
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
