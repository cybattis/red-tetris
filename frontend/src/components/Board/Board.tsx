import {
  memo,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useReducer,
  type CSSProperties,
} from "react";
import styles from "./Board.module.css";
import { Cell } from "./Cell";
import { CELL_SIZE, CELL_GAP, getCellColor } from "@/utils";
import type { PieceState } from "@shared/types/piece.ts";
import type { LockedCell, Trail } from "@shared/types/game.ts";

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
  lockedCells?: LockedCell[];
  hardDropTrail?: Trail[];
}

interface Particle {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  type?: "explosion" | "trail" | "impact" | "firework";
  w?: number;
  h?: number;
  angle?: number;
}

type ParticleType = NonNullable<Particle["type"]>;

interface AnimationState {
  isPenaltyWarning: boolean;
  isLockImpact: boolean;
  particles: Particle[];
  lockFlashCells: Set<string>;
  clearingRowSet: Set<number>;
}

type AnimationAction =
  | { type: "RESET_ALL" }
  | { type: "SET_PENALTY_WARNING"; value: boolean }
  | { type: "SET_CLEARING_ROWS"; rows: number[] }
  | { type: "CLEAR_CLEARING_ROWS" }
  | {
      type: "MERGE_PARTICLES";
      particles: Particle[];
      removeTypes?: ParticleType[];
    }
  | { type: "REMOVE_PARTICLE_TYPES"; removeTypes: ParticleType[] }
  | { type: "START_LOCK_IMPACT"; cells: string[]; particles: Particle[] }
  | { type: "END_LOCK_IMPACT" };

const MAX_PARTICLES = 60;

const initialAnimationState: AnimationState = {
  isPenaltyWarning: false,
  isLockImpact: false,
  particles: [],
  lockFlashCells: new Set(),
  clearingRowSet: new Set(),
};

function animationReducer(
  state: AnimationState,
  action: AnimationAction,
): AnimationState {
  switch (action.type) {
    case "RESET_ALL":
      return initialAnimationState;
    case "SET_PENALTY_WARNING":
      return { ...state, isPenaltyWarning: action.value };
    case "SET_CLEARING_ROWS":
      return { ...state, clearingRowSet: new Set(action.rows) };
    case "CLEAR_CLEARING_ROWS":
      return { ...state, clearingRowSet: new Set() };
    case "MERGE_PARTICLES": {
      const base = action.removeTypes?.length
        ? state.particles.filter(
            (p) => !(p.type && action.removeTypes?.includes(p.type)),
          )
        : state.particles;
      return {
        ...state,
        particles: [...base, ...action.particles].slice(-MAX_PARTICLES),
      };
    }
    case "REMOVE_PARTICLE_TYPES":
      return {
        ...state,
        particles: state.particles.filter(
          (p) => !(p.type && action.removeTypes.includes(p.type)),
        ),
      };
    case "START_LOCK_IMPACT":
      return {
        ...state,
        isLockImpact: true,
        lockFlashCells: new Set(action.cells),
        particles: [...state.particles, ...action.particles].slice(
          -MAX_PARTICLES,
        ),
      };
    case "END_LOCK_IMPACT":
      return {
        ...state,
        isLockImpact: false,
        lockFlashCells: new Set(),
        particles: state.particles.filter((p) => p.type !== "impact"),
      };
    default:
      return state;
  }
}

function createDisplayBoard(
  board: number[][],
  currentPiece: PieceState | null | undefined,
  ghostPiece: PieceState | null | undefined,
  isInvisible: boolean,
): {
  cells: number[][];
  ghostCells: Set<string>;
} {
  const height = board.length;
  const width = board[0]?.length ?? 10;

  // In invisible mode, start with an empty board (hide all locked pieces)
  // In normal mode, copy the existing board with locked pieces
  const cells = isInvisible
    ? Array.from({ length: height }, () => new Array(width).fill(0))
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
  cellSize: cellSizeProp,
  isPaused = false,
  isGameOver = false,
  isInvisible = false,
  clearingRows = [],
  penaltyRows = [],
  lockedCells = [],
  hardDropTrail = [],
}: BoardProps) {
  const boardHeight = height ?? board.length;
  const boardWidth = width ?? board[0]?.length ?? 10;

  const standardWidth = 10;
  const baseCellSize = cellSizeProp ?? CELL_SIZE;

  const widthRatio = boardWidth / standardWidth;

  let scaleFactor = 1;
  if (widthRatio < 1) {
    scaleFactor = Math.min(1.2, 1 + (1 - widthRatio) * 0.3);
  } else if (widthRatio > 1) {
    scaleFactor = Math.max(0.8, 1 - (widthRatio - 1) * 0.15);
  }

  const actualCellSize = Math.round(baseCellSize * scaleFactor);

  const [animationState, dispatchAnimation] = useReducer(
    animationReducer,
    initialAnimationState,
  );
  const {
    isPenaltyWarning,
    isLockImpact,
    particles,
    lockFlashCells,
    clearingRowSet,
  } = animationState;

  // Use refs for deduplication to avoid triggering re-renders
  const lastClearRowsRef = useRef<string>("");
  const lastBoardSignatureRef = useRef<string>("");

  // Use a ref for board data in particle generation to avoid recreating callbacks on every board change
  const boardRef = useRef(board);

  // Reset local state when a new game starts (detected by board becoming mostly empty)
  useEffect(() => {
    const filledCells = board.flat().filter((cell) => cell !== 0).length;
    const signature = `${boardWidth}x${boardHeight}:${filledCells}`;

    boardRef.current = board;

    // If board is nearly empty and we had content before, likely a new game
    if (
      filledCells <= 4 &&
      lastBoardSignatureRef.current &&
      lastBoardSignatureRef.current !== signature
    ) {
      // Reset all animation state
      dispatchAnimation({ type: "RESET_ALL" });
      lastClearRowsRef.current = "";
    }

    lastBoardSignatureRef.current = signature;
  }, [board, boardWidth, boardHeight]);

  const penaltyRowSet = useMemo(() => new Set(penaltyRows), [penaltyRows]);

  const generateLineClearParticles = useCallback(
    (_rows: number[]) => {
      const currentBoard = boardRef.current;
      const newParticles: Particle[] = [];

      const cellColors = _rows
        .flatMap(
          (row) =>
            currentBoard[row]?.map((cell) => getCellColor(cell, false)) ?? [],
        )
        .filter((c) => c !== "transparent");

      const sparkleColors = [
        "#ffffff",
        "#ffe7a0",
        "#a0e8ff",
        "#ff9de8",
        ...cellColors,
      ];

      const boardPixelWidth = boardWidth * (actualCellSize + CELL_GAP);

      const confettiCount = Math.min(30, 10 + _rows.length * 6);

      for (let i = 0; i < confettiCount; i++) {
        const color =
          sparkleColors[Math.floor(Math.random() * sparkleColors.length)] ||
          "#fff";

        const startX = Math.random() * boardPixelWidth;
        const startY = -4 - Math.random() * 10; // just above the board edge

        const dx = (Math.random() - 0.5) * 60;
        const dy = 80 + Math.random() * 140;

        const isElongated = Math.random() < 0.45;

        newParticles.push({
          id: `conf-${Date.now()}-${i}`,
          x: startX,
          y: startY,
          dx,
          dy,
          color,
          size: isElongated ? 3 : 2 + Math.random() * 3,
          w: isElongated ? 2 + Math.random() * 2 : undefined,
          h: isElongated ? 5 + Math.random() * 5 : undefined,
          angle: isElongated ? Math.random() * 360 : undefined,
          type: "firework",
        });
      }

      return newParticles;
    },
    [boardWidth, actualCellSize],
  );

  const generateHardDropParticles = useCallback(
    (
      trails: {
        x: number;
        startY: number;
        endY: number;
        type: number;
        id?: string;
      }[],
    ) => {
      const newParticles: Particle[] = [];
      const baseTimestamp = Date.now();

      trails.forEach((trail, trailIndex) => {
        const color = getCellColor(trail.type, false);
        const x = trail.x * (actualCellSize + CELL_GAP) + actualCellSize / 2;

        const distance = trail.endY - trail.startY;
        const particleCount = Math.min(distance * 2, 20);

        for (let i = 0; i < particleCount; i++) {
          const progress = i / particleCount;
          const y =
            (trail.startY + progress * distance) * (actualCellSize + CELL_GAP) +
            actualCellSize / 2;

          newParticles.push({
            id: `trail-${baseTimestamp}-${trailIndex}-${i}`,
            x,
            y,
            dx: (Math.random() - 0.5) * 30,
            dy: 20 + Math.random() * 40,
            color,
            size: 3 + Math.random() * 4,
            type: "trail",
          });
        }
      });

      return newParticles;
    },
    [actualCellSize],
  );

  const generateLockImpactParticles = useCallback(
    (cells: { x: number; y: number; type: number; id?: string }[]) => {
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
            type: "impact",
          });
        }
      });

      return newParticles;
    },
    [actualCellSize],
  );

  useEffect(() => {
    if (clearingRows.length > 0) {
      // Make a copy before sorting to avoid mutating the read-only array
      const clearKey = [...clearingRows].sort((a, b) => a - b).join(",");
      if (clearKey === lastClearRowsRef.current) {
        return; // Skip if this is the same line clear event
      }

      lastClearRowsRef.current = clearKey;

      dispatchAnimation({ type: "SET_CLEARING_ROWS", rows: clearingRows });

      const newParticles = generateLineClearParticles(clearingRows);
      dispatchAnimation({
        type: "MERGE_PARTICLES",
        particles: newParticles,
        removeTypes: ["explosion", "firework"],
      });

      const flashTimer = setTimeout(() => {
        dispatchAnimation({ type: "CLEAR_CLEARING_ROWS" });
      }, 250);

      const timer = setTimeout(() => {
        dispatchAnimation({
          type: "REMOVE_PARTICLE_TYPES",
          removeTypes: ["explosion", "firework"],
        });
        lastClearRowsRef.current = "";
      }, 2000);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(timer);
      };
    }
  }, [clearingRows, generateLineClearParticles]);

  useEffect(() => {
    if (hardDropTrail.length > 0) {
      dispatchAnimation({
        type: "MERGE_PARTICLES",
        particles: generateHardDropParticles(hardDropTrail),
      });

      const timer = setTimeout(() => {
        dispatchAnimation({
          type: "REMOVE_PARTICLE_TYPES",
          removeTypes: ["trail"],
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [hardDropTrail, generateHardDropParticles]);

  useEffect(() => {
    if (lockedCells.length > 0) {
      dispatchAnimation({
        type: "START_LOCK_IMPACT",
        cells: lockedCells.map((c) => `${c.x},${c.y}`),
        particles: generateLockImpactParticles(lockedCells),
      });

      const timer = setTimeout(() => {
        dispatchAnimation({ type: "END_LOCK_IMPACT" });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [lockedCells, generateLockImpactParticles]);

  useEffect(() => {
    if (penaltyRows.length > 0) {
      dispatchAnimation({ type: "SET_PENALTY_WARNING", value: true });

      const timer = setTimeout(() => {
        dispatchAnimation({ type: "SET_PENALTY_WARNING", value: false });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [penaltyRows]);

  const { cells, ghostCells } = useMemo(
    () => createDisplayBoard(board, currentPiece, ghostPiece, isInvisible),
    [board, currentPiece, ghostPiece, isInvisible],
  );

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${boardWidth}, ${actualCellSize}px)`,
    gridTemplateRows: `repeat(${boardHeight}, ${actualCellSize}px)`,
    gap: `${CELL_GAP}px`,
    backgroundSize: `${actualCellSize + CELL_GAP}px ${actualCellSize + CELL_GAP}px`,
  };

  const containerClasses = [
    styles.boardContainer,
    isPenaltyWarning ? styles.penaltyWarning : "",
    isLockImpact ? styles.lockImpact : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      <div className={styles.board} style={gridStyle}>
        {cells.map((row, y) =>
          row.map((cellValue, x) => {
            const key = `${x},${y}`;
            const isGhost = ghostCells.has(key);
            const isPenalty = penaltyRowSet.has(y);
            const isLocked = lockFlashCells.has(key);
            const isClearing = clearingRowSet.has(y);

            const displayValue =
              isGhost && ghostPiece ? ghostPiece.type : cellValue;

            return (
              <Cell
                key={key}
                value={displayValue}
                isGhost={isGhost}
                isClearing={isClearing}
                isPenalty={isPenalty}
                isLocked={isLocked}
                size={actualCellSize}
              />
            );
          }),
        )}

        {particles.length > 0 && (
          <div className={styles.particles}>
            {particles.map((particle) => {
              const isFirework = particle.type === "firework";
              return (
                <div
                  key={particle.id}
                  className={
                    isFirework ? styles.particleFirework : styles.particle
                  }
                  style={{
                    left: particle.x,
                    top: particle.y,
                    width: isFirework ? (particle.w ?? 2) : particle.size,
                    height: isFirework ? (particle.h ?? 6) : particle.size,
                    backgroundColor: particle.color,
                    boxShadow: isFirework
                      ? `0 0 4px ${particle.color}, 0 0 8px ${particle.color}`
                      : `0 0 3px ${particle.color}`,
                    ...(isFirework
                      ? ({
                          "--dx": `${particle.dx}px`,
                          "--dy": `${particle.dy}px`,
                          rotate: particle.angle
                            ? `${particle.angle}deg`
                            : undefined,
                        } as CSSProperties)
                      : {
                          transform: `translate(${particle.dx}px, ${particle.dy}px)`,
                        }),
                  }}
                />
              );
            })}
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
