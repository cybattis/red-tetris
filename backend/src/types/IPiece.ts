export const enum PieceType {
  I = 'I',
  J = 'J',
  L = 'L',
  O = 'O',
  S = 'S',
  T = 'T',
  Z = 'Z',
}

export interface IPiece {
  type: PieceType;
  id: number;
  shape: number[][]; // 3D array of shape blocks
}

export type Position = {
  x: number;
  y: number;
};
