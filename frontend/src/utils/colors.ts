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

/**
 * Color mappings for each piece type
 * Used by Cell component to render the correct color
 */
export const PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00f0f0', // Cyan
  [PieceType.O]: '#f0f000', // Yellow
  [PieceType.T]: '#a000f0', // Purple
  [PieceType.S]: '#00f000', // Green
  [PieceType.Z]: '#f00000', // Red
  [PieceType.J]: '#0000f0', // Blue
  [PieceType.L]: '#f0a000', // Orange
  [PieceType.PENALTY]: '#808080', // Gray
};

/**
 * Lighter/translucent colors for ghost piece preview
 */
export const GHOST_PIECE_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: 'rgba(0, 240, 240, 0.3)',
  [PieceType.O]: 'rgba(240, 240, 0, 0.3)',
  [PieceType.T]: 'rgba(160, 0, 240, 0.3)',
  [PieceType.S]: 'rgba(0, 240, 0, 0.3)',
  [PieceType.Z]: 'rgba(240, 0, 0, 0.3)',
  [PieceType.J]: 'rgba(0, 0, 240, 0.3)',
  [PieceType.L]: 'rgba(240, 160, 0, 0.3)',
  [PieceType.PENALTY]: 'rgba(128, 128, 128, 0.3)',
};

/**
 * Border/glow colors for active pieces
 */
export const PIECE_BORDER_COLORS: Record<PieceTypeValue, string> = {
  [PieceType.EMPTY]: 'transparent',
  [PieceType.I]: '#00ffff',
  [PieceType.O]: '#ffff00',
  [PieceType.T]: '#bf00ff',
  [PieceType.S]: '#00ff00',
  [PieceType.Z]: '#ff0000',
  [PieceType.J]: '#0000ff',
  [PieceType.L]: '#ff8000',
  [PieceType.PENALTY]: '#a0a0a0',
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
