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
export const PieceType = {
  EMPTY: 0,
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
  PENALTY: 8, // Penalty/garbage lines in multiplayer
} as const;

export type PieceTypeValue = (typeof PieceType)[keyof typeof PieceType];

export const PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00ffff', // Neon Cyan
  [PieceType.O]: '#ffff00', // Neon Yellow
  [PieceType.T]: '#ff00ff', // Neon Magenta
  [PieceType.S]: '#39ff14', // Neon Green
  [PieceType.Z]: '#ff073a', // Neon Red
  [PieceType.J]: '#4d4dff', // Neon Blue
  [PieceType.L]: '#ff6600', // Neon Orange
  [PieceType.PENALTY]: '#666666', // Dark Gray
};

/**
 * Lighter/translucent colors for ghost piece preview
 */
export const GHOST_PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: 'rgba(0, 255, 255, 0.25)',
  [PieceType.O]: 'rgba(255, 255, 0, 0.25)',
  [PieceType.T]: 'rgba(255, 0, 255, 0.25)',
  [PieceType.S]: 'rgba(57, 255, 20, 0.25)',
  [PieceType.Z]: 'rgba(255, 7, 58, 0.25)',
  [PieceType.J]: 'rgba(77, 77, 255, 0.25)',
  [PieceType.L]: 'rgba(255, 102, 0, 0.25)',
  [PieceType.PENALTY]: 'rgba(102, 102, 102, 0.25)',
};

/**
 * Border/glow colors for active pieces
 */
export const PIECE_BORDER_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00ffff',
  [PieceType.O]: '#ffff00',
  [PieceType.T]: '#ff00ff',
  [PieceType.S]: '#39ff14',
  [PieceType.Z]: '#ff073a',
  [PieceType.J]: '#4d4dff',
  [PieceType.L]: '#ff6600',
  [PieceType.PENALTY]: '#888888',
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
