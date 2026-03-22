import { TETROMINO_DICTIONARY } from '../pieces/TetrominoFactory.js';
import { PieceType } from '../../../shared/types/piece.js';
import type { IPiece, PieceDefinition, PieceState, Position } from '../../../shared/types/piece.js';

export class Piece implements IPiece {
  public type: PieceType;
  public id: number;
  public shape: number[][]; // Current 2D shape
  public position: Position = { x: 0, y: 0 };
  public rotation: number = 0; // Rotation state (0-3)

  public width;
  public height;
  public isLocked = false;

  constructor(piece: PieceDefinition) {
    this.type = piece.type;
    this.id = piece.id;
    this.shape = this.getInitialShape(piece.type);
    this.width = this.getRealWidth();
    this.height = this.getRealHeight();
  }

  public getNextRotation() {
    if (this.type === PieceType.O) {
      return this.shape;
    }

    this.shape = this.rotateClockwise(this.shape);
    this.width = this.getRealWidth();
    this.height = this.getRealHeight();
    this.rotation = (this.rotation + 1) % 4;
    return this.shape;
  }

  public getOccupiedCells(): Position[] {
    const cells: Position[] = [];
    for (let r = 0; r < this.shape.length; r++) {
      for (let c = 0; c < this.shape[r].length; c++) {
        if (this.shape[r][c] === 1) {
          cells.push({ x: c, y: r });
        }
      }
    }
    return cells;
  }

  public getRealWidth(): number {
    // Check if first or last column is empty and adjust width accordingly
    let width = this.shape[0].length;
    const firstColEmpty = this.shape.every((row) => row[0] === 0);
    const lastColEmpty = this.shape.every((row) => row[row.length - 1] === 0);

    if (firstColEmpty) {
      width -= 1;
      // Don't mutate position here - let the caller handle position adjustments
    }
    if (lastColEmpty) {
      width -= 1;
    }

    return width;
  }

  public getTopMostOccupiedRow(): number {
    for (let r = 0; r < this.shape.length; r++) {
      if (this.shape[r].includes(1)) {
        return r;
      }
    }
    return 0; // Fallback if no occupied cells found
  }

  public getState(): PieceState {
    return {
      type: this.id,
      position: { ...this.position },
      shape: this.cloneMatrix(this.shape),
      rotation: 0,
    };
  }

  public toString(): string {
    const rows = this.shape.map((row) => row.map((cell) => (cell === 0 ? ' ' : cell.toString())).join(' '));
    const width = rows[0]?.length ?? 0;
    const border = `+${'-'.repeat(width)}+`;
    return [border, ...rows.map((row) => `|${row}|`), border].join('\n');
  }

  private cloneMatrix(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row]);
  }

  private getInitialShape(type: PieceType): number[][] {
    const piece = TETROMINO_DICTIONARY[type];
    if (!piece) {
      throw new Error(`Invalid piece type: ${type}`);
    }
    return this.cloneMatrix(piece.shape);
  }

  // Rotate the piece 90 degrees clockwise
  private rotateClockwise(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = matrix[r][c];
      }
    }

    return rotated;
  }

  private getRealHeight() {
    // Check if first or last row is empty and adjust height accordingly
    let height = this.shape.length;
    const firstRowEmpty = this.shape[0].every((cell) => cell === 0);
    const lastRowEmpty = this.shape[this.shape.length - 1].every((cell) => cell === 0);

    if (firstRowEmpty) {
      height -= 1;
      // Don't mutate position here - let the caller handle position adjustments
    }
    if (lastRowEmpty) {
      height -= 1;
    }

    return height;
  }
}
