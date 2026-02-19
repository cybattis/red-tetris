/**
 * Piece Shapes for Preview Display
 *
 * These shapes are used ONLY for displaying piece previews
 * (next pieces, hold piece). The actual game pieces come from the server.
 */

import { PieceType } from './colors';

/**
 * Piece shapes for preview display
 * Each shape is a 2D array where 1 = filled, 0 = empty
 */
export const PIECE_SHAPES: Record<number, number[][]> = {
  [PieceType.I]: [
    [1, 1, 1, 1],
  ],
  [PieceType.O]: [
    [1, 1],
    [1, 1],
  ],
  [PieceType.T]: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [PieceType.S]: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [PieceType.Z]: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [PieceType.J]: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [PieceType.L]: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

/**
 * Get the shape for a piece type
 */
export function getPieceShape(pieceType: number): number[][] {
  return PIECE_SHAPES[pieceType] ?? [[1]];
}

/**
 * Get the dimensions of a piece shape
 */
export function getPieceDimensions(pieceType: number): { width: number; height: number } {
  const shape = getPieceShape(pieceType);
  return {
    width: shape[0]?.length ?? 1,
    height: shape.length,
  };
}
