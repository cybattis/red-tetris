import { PieceType } from '../../../shared/types/piece.js';
import type { PieceDefinition } from '../../../shared/types/piece.js';

export const T_PIECE: PieceDefinition = {
  type: PieceType.T,
  id: 3,
  shape: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const I_PIECE: PieceDefinition = {
  type: PieceType.I,
  id: 1,
  shape: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
};

export const J_PIECE: PieceDefinition = {
  type: PieceType.J,
  id: 6,
  shape: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const L_PIECE: PieceDefinition = {
  type: PieceType.L,
  id: 7,
  shape: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const O_PIECE: PieceDefinition = {
  type: PieceType.O,
  id: 2,
  shape: [
    [1, 1],
    [1, 1],
  ],
};

export const S_PIECE: PieceDefinition = {
  type: PieceType.S,
  id: 4,
  shape: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
};

export const Z_PIECE: PieceDefinition = {
  type: PieceType.Z,
  id: 5,
  shape: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_DICTIONARY: Record<PieceType, PieceDefinition> = {
  [PieceType.T]: T_PIECE,
  [PieceType.I]: I_PIECE,
  [PieceType.J]: J_PIECE,
  [PieceType.L]: L_PIECE,
  [PieceType.O]: O_PIECE,
  [PieceType.S]: S_PIECE,
  [PieceType.Z]: Z_PIECE,
};
