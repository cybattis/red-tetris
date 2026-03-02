import { IPiece, PieceType } from '../types/IPiece';

export const T_PIECE: IPiece = {
  type: PieceType.T,
  id: 1,
  shape: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const I_PIECE: IPiece = {
  type: PieceType.I,
  id: 2,
  shape: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
};

export const J_PIECE: IPiece = {
  type: PieceType.J,
  id: 3,
  shape: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const L_PIECE: IPiece = {
  type: PieceType.L,
  id: 4,
  shape: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const O_PIECE: IPiece = {
  type: PieceType.O,
  id: 5,
  shape: [
    [1, 1],
    [1, 1],
  ],
};

export const S_PIECE: IPiece = {
  type: PieceType.S,
  id: 6,
  shape: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
};

export const Z_PIECE: IPiece = {
  type: PieceType.Z,
  id: 7,
  shape: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_DICTIONARY: Record<PieceType, IPiece> = {
  [PieceType.T]: T_PIECE,
  [PieceType.I]: I_PIECE,
  [PieceType.J]: J_PIECE,
  [PieceType.L]: L_PIECE,
  [PieceType.O]: O_PIECE,
  [PieceType.S]: S_PIECE,
  [PieceType.Z]: Z_PIECE,
};
