import { TETROMINO_DICTIONARY } from '../pieces/TetrominoFactory';
import { PieceType } from '../types/piece';

export class Piece implements Piece {
  public type: PieceType;
  public shape: number[][]; // Current 2D shape

  constructor(type: PieceType) {
    this.type = type;
    this.shape = this.getInitialShape(type);
  }

  private cloneMatrix(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row]);
  }

  getInitialShape(type: PieceType): number[][] {
    const shape = TETROMINO_DICTIONARY[type];
    if (!shape) {
      throw new Error(`Invalid piece type: ${type}`);
    }
    return this.cloneMatrix(shape);
  }

  // Rotate the piece 90 degrees clockwise
  rotateClockwise(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = Array.from({ length: cols }, () =>
      Array(rows).fill(0),
    );

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = matrix[r][c];
      }
    }

    return rotated;
  }

  public getNextRotation() {
    if (this.type === PieceType.O) {
      return this.shape;
    }

    let nextShape: number[][];

    if (this.type === PieceType.I) {
      const isHorizontal = this.shape.some(
        (row) => row.reduce((sum, cell) => sum + cell, 0) > 1,
      );

      nextShape = isHorizontal
        ? this.rotateClockwise(
            this.rotateClockwise(this.rotateClockwise(this.shape)),
          )
        : this.rotateClockwise(this.shape);
    } else {
      nextShape = this.rotateClockwise(this.shape);
    }

    this.shape = nextShape;
    return this.shape;
  }

  public toString(): string {
    const rows = this.shape.map((row) =>
      row.map((cell) => (cell === 0 ? ' ' : cell.toString())).join(' '),
    );
    const width = rows[0]?.length ?? 0;
    const border = `+${'-'.repeat(width)}+`;
    return [border, ...rows.map((row) => `|${row}|`), border].join('\n');
  }
}
