export enum PieceType {
  I = 'I',
  J = 'J',
  L = 'L',
  O = 'O',
  S = 'S',
  T = 'T',
  Z = 'Z',
}

export interface Piece {
  type: PieceType;
  shape: number[][]; // 3D array of shape blocks
}
