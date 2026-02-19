import { PieceType } from '../types/piece';

export const T_PIECE: number[][] = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 0],
];

export const I_PIECE: number[][] = [
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
];

export const J_PIECE: number[][] = [
  [1, 0, 0],
  [1, 1, 1],
  [0, 0, 0],
];

export const L_PIECE: number[][] = [
  [0, 0, 1],
  [1, 1, 1],
  [0, 0, 0],
];

export const O_PIECE: number[][] = [
  [1, 1],
  [1, 1],
];

export const S_PIECE: number[][] = [
  [0, 1, 1],
  [1, 1, 0],
  [0, 0, 0],
];

export const Z_PIECE: number[][] = [
  [1, 1, 0],
  [0, 1, 1],
  [0, 0, 0],
];

export const TETROMINO_DICTIONARY: Record<PieceType, number[][]> = {
  [PieceType.T]: T_PIECE,
  [PieceType.I]: I_PIECE,
  [PieceType.J]: J_PIECE,
  [PieceType.L]: L_PIECE,
  [PieceType.O]: O_PIECE,
  [PieceType.S]: S_PIECE,
  [PieceType.Z]: Z_PIECE,
};
