import { Piece } from './Piece';
import { PieceName } from '../types/piece';

interface GameSettings {
  width: number;
  height: number;
}

export class Game {
  private readonly _id: string;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _board: number[][];
  private readonly _seed: number;
  private readonly _pieces: PieceName[] = [];
  private readonly _nextPieces: PieceName[];
  // private readonly _currentPiece: Piece;

  private readonly _score: number;
  private readonly _linesCleared: number;
  private readonly _level: number;
  private readonly _gameOver: boolean;

  constructor(
    id: string,
    player: string,
    state: string,
    settings: GameSettings,
  ) {
    this._id = id;
    this._width = settings.width;
    this._height = settings.height;
    this._board = Array.from({ length: this._height }, () =>
      new Array(this._width).fill(0),
    );
    this._seed = Math.floor(Math.random() * 1000000);
    this._pieces = []; // InitBag
    // this._currentPiece =
    this._nextPieces = [];

    this._score = 0;
    this._linesCleared = 0;
    this._level = 0;
    this._gameOver = false;
  }

  get id(): string {
    return this._id;
  }
}
