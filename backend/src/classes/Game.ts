interface GameSettings {
  width: number;
  height: number;
}

export class Game {
  private readonly _id: string;
  private readonly _width: number;
  private readonly _height: number;
  private _board: number[][];
  private _nextPiece: number[][];
  private _currentPiece: number[][];
  private _score: number;
  private _linesCleared: number;
  private _level: number;
  private _gameOver: boolean;

  constructor(id: string, player: string, state: string, settings: GameSettings) {
    this._id = id;
    this._width = settings.width;
    this._height = settings.height;

    this._board = Array.from({ length: this._height }, () => Array(this._width).fill(0));
    this._nextPiece = Array.from({ length: 4 }, () => Array(4).fill(0));
    this._currentPiece = Array.from({ length: 4 }, () => Array(4).fill(0));
    this._score = 0;
    this._linesCleared = 0;
    this._level = 0;
    this._gameOver = false;
  }

  get id(): string {
    return this._id;
  }
}