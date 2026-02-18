import {PieceName} from "../types/piece";


export class Piece {
  name: PieceName;
  shape: number[][]; // Current 2D shape

  constructor(name: PieceName, baseShape: number[][]) {
    this.name = name;
    this.shape = baseShape;
  }

  public getName() {
    return this.name;
  }

  public getShape() {
    return this.shape;
  }

  public getNextRotation(action: 'left' | 'right') {
    const rows = this.shape.length;
    const cols = this.shape[0].length;

    const newShape: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (action === 'right') {
          newShape[c][rows - 1 - r] = this.shape[r][c];
        } else {
          newShape[cols - 1 - c][r] = this.shape[r][c];
        }
      }
    }

    this.shape = newShape;
  }
}
