export enum PieceName {
  I = 'I',
  J = 'J',
  L = 'L',
  O = 'O',
  S = 'S',
  T = 'T',
  Z = 'Z',
}

export interface Piece {
  name: PieceName;
  shape: number[][]; // 3D array of shape blocks
}

const T_PIECE: number[][] = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 0]
];

const I_PIECE: number[][] = [
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0]
];

const J_PIECE: number[][] = [
  [1, 0, 0],
  [1, 1, 1],
  [0, 0, 0]
];

const L_PIECE: number[][] = [
  [0, 0, 1],
  [1, 1, 1],
  [0, 0, 0]
];

const O_PIECE: number[][] = [
  [1, 1],
  [1, 1]
];

const S_PIECE: number[][] = [
  [0, 1, 1],
  [1, 1, 0],
  [0, 0, 0]
];

const Z_PIECE: number[][] = [
  [1, 1, 0],
  [0, 1, 1],
  [0, 0, 0]
];


