import { PieceType } from '../types/piece';

export class PiecesSequence {
  private readonly _pieces: PieceType[] = [];
  private readonly _pieceTypes: PieceType[] = [
    PieceType.I,
    PieceType.J,
    PieceType.L,
    PieceType.O,
    PieceType.S,
    PieceType.T,
    PieceType.Z,
  ];
  private _rngState: number;
  private _currentIndex: number = 0;

  constructor(seed: number, initialSize: number = 1000) {
    this._rngState = (seed >>> 0) || 1;

    this._pieces.push(...this.generate(initialSize));
  }

  public get currentIndex(): number {
    return this._currentIndex;
  }

  private nextRandom(): number {
    this._rngState = (1664525 * this._rngState + 1013904223) >>> 0;
    return this._rngState / 0x100000000;
  }

  private generate(count: number): PieceType[] {
    const sequence: PieceType[] = [];
    if (this._pieceTypes.length === 0 || count <= 0) return sequence;

    while (sequence.length < count) {
      const bag = [...this._pieceTypes];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.nextRandom() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      sequence.push(...bag);
    }

    return sequence.slice(0, count);
  }

  public ensurePieceBuffer(minRemaining: number = 200, growBy: number = 1000): void {
    const remaining = this._pieces.length - this._currentIndex;
    if (remaining >= minRemaining) return;
    this._pieces.push(...this.generate(growBy));
  }

  public getNextPieceType(): PieceType {
    this.ensurePieceBuffer();
    if (this._currentIndex >= this._pieces.length) {
      throw new Error('No pieces available in sequence.');
    }
    return this._pieces[this._currentIndex++];
  }
}
