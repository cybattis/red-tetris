/**
 * Display Constants for Tetris Piece Rendering
 *
 * These are VISUAL constants only - not game logic.
 * The actual piece types and positions come from the server.
 */

/**
 * Tetrimino piece type IDs (standard Tetris naming)
 * These match the values the server sends in the board state
 */
export const enum PieceType {
  EMPTY = 0,
  I = 1,
  O = 2,
  T = 3,
  S = 4,
  Z = 5,
  J = 6,
  L = 7,
  PENALTY = 8, // Penalty/garbage lines in multiplayer
}

export type PieceTypeValue = PieceType;

export const PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00ffff', // Sharp Cyan
  [PieceType.O]: '#ffff00', // Sharp Yellow
  [PieceType.T]: '#aa00ff', // Sharp Purple
  [PieceType.S]: '#00ff44', // Sharp Green
  [PieceType.Z]: '#ff0066', // Sharp Red
  [PieceType.J]: '#0088ff', // Sharp Blue
  [PieceType.L]: '#ff8800', // Sharp Orange
  [PieceType.PENALTY]: '#666666', // Dark Gray
};

export const PIECE_GLOW_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: 'rgba(0, 255, 255, 0.60)', // Sharp Cyan glow
  [PieceType.O]: 'rgba(255, 255, 0, 0.60)', // Sharp Yellow glow
  [PieceType.T]: 'rgba(170, 0, 255, 0.60)', // Sharp Purple glow
  [PieceType.S]: 'rgba(0, 255, 68, 0.60)', // Sharp Green glow
  [PieceType.Z]: 'rgba(255, 0, 102, 0.60)', // Sharp Red glow
  [PieceType.J]: 'rgba(0, 136, 255, 0.60)', // Sharp Blue glow
  [PieceType.L]: 'rgba(255, 136, 0, 0.60)', // Sharp Orange glow
  [PieceType.PENALTY]: 'rgba(102, 102, 102, 0.35)',
};

export const GHOST_PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: 'rgba(0, 255, 255, 0.22)', // Sharp Cyan ghost
  [PieceType.O]: 'rgba(255, 255, 0, 0.22)', // Sharp Yellow ghost
  [PieceType.T]: 'rgba(170, 0, 255, 0.22)', // Sharp Purple ghost
  [PieceType.S]: 'rgba(0, 255, 68, 0.22)', // Sharp Green ghost
  [PieceType.Z]: 'rgba(255, 0, 102, 0.22)', // Sharp Red ghost
  [PieceType.J]: 'rgba(0, 136, 255, 0.22)', // Sharp Blue ghost
  [PieceType.L]: 'rgba(255, 136, 0, 0.22)', // Sharp Orange ghost
  [PieceType.PENALTY]: 'rgba(102, 102, 102, 0.18)',
};

export const PIECE_BORDER_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00ffff', // Sharp Cyan
  [PieceType.O]: '#ffff00', // Sharp Yellow
  [PieceType.T]: '#aa00ff', // Sharp Purple
  [PieceType.S]: '#00ff44', // Sharp Green
  [PieceType.Z]: '#ff0066', // Sharp Red
  [PieceType.J]: '#0088ff', // Sharp Blue
  [PieceType.L]: '#ff8800', // Sharp Orange
  [PieceType.PENALTY]: '#777777',
};

/**
 * Cell rendering dimensions (in pixels)
 */
export const CELL_SIZE = 28;
export const CELL_GAP = 1;
export const CELL_BORDER_RADIUS = 2;

/**
 * Board styling
 */
export const BOARD_BACKGROUND = 'rgba(0, 0, 0, 0.6)';
export const BOARD_BORDER_COLOR = 'rgba(0, 212, 255, 0.3)';
export const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.05)';

/**
 * Get the color for a cell based on its value
 */
export function getCellColor(
  value: number,
  isGhost: boolean = false
): string {
  const pieceValue = value as PieceTypeValue;
  if (isGhost) {
    return GHOST_PIECE_COLORS[pieceValue] ?? GHOST_PIECE_COLORS[PieceType.EMPTY];
  }
  return PIECE_COLORS[pieceValue] ?? PIECE_COLORS[PieceType.EMPTY];
}

/**
 * Get the border color for a cell
 */
export function getCellBorderColor(value: number): string {
  const pieceValue = value as PieceTypeValue;
  return PIECE_BORDER_COLORS[pieceValue] ?? PIECE_BORDER_COLORS[PieceType.EMPTY];
}

export function getCellGlowColor(value: number): string {
  const pieceValue = value as PieceTypeValue;
  return PIECE_GLOW_COLORS[pieceValue] ?? PIECE_GLOW_COLORS[PieceType.EMPTY];
}
