import { PieceType } from '../types/piece';

export class Piece {
  public name: PieceType;
  public shape: number[][]; // Current 2D shape

  constructor(name: PieceType, baseShape: number[][]) {
    this.name = name;
    this.shape = baseShape;
  }
}
