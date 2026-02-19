import { Player } from './Player';
import { GameSettings, GameState } from '@shared/types/game';
import { randomUUID } from 'node:crypto';
import { PiecesSequence } from './PiecesSequence';
import { Piece } from './Piece';

export class Game {
  private static readonly TICK_RATE = 60;
  private static readonly TICK_INTERVAL_MS = 1000 / Game.TICK_RATE;
  private static readonly GRAVITY_INTERVAL_MS = 1000;

  private readonly _id: string;
  private readonly _player: Player;
  private readonly _settings: GameSettings;
  private readonly _piecesSequence: PiecesSequence;

  private _gameLoop: NodeJS.Timeout | null = null;
  private _lastTickAt = 0;
  private _gravityAccumulatorMs = 0;

  // Minimal active-piece state
  private _currentPiece: Piece | null = null;

  // Game state
  public state: GameState = 'waiting';
  public board: number[][];
  public currentPieceIndex: number = 0;
  public isAlive: boolean = true;
  public score: number = 0;
  public linesCleared: number = 0;

  constructor(player: Player, settings: GameSettings, seed: number) {
    this._id = randomUUID();
    this._player = player;
    this._settings = settings;
    this._piecesSequence = new PiecesSequence(seed, 1000);
    this.board = this.createEmptyBoard();
  }

  // Game actions
  // ============================================
  public start(): void {
    if (this.state === 'playing') return;

    console.log(`Starting game for player ${this._player.name}`);
    this.state = 'playing';

    if (!this._currentPiece) {
      this.spawnNextPiece();
    }

    this._lastTickAt = Date.now();
    this._gameLoop = setInterval(() => {
      if (!this.isAlive) {
        this.stopGameLoop();
        return;
      }

      const now = Date.now();
      const deltaMs = now - this._lastTickAt;
      this._lastTickAt = now;

      this.gameloop(deltaMs);
    }, Game.TICK_INTERVAL_MS);
  }

  // Game logic methods
  // ============================================
  private gameloop(deltaMs: number): void {
    this._gravityAccumulatorMs += deltaMs;

    while (this._gravityAccumulatorMs >= Game.GRAVITY_INTERVAL_MS) {
      this.moveCurrentPieceDown();
      this._gravityAccumulatorMs -= Game.GRAVITY_INTERVAL_MS;
    }
  }

  private spawnNextPiece(): void {
    this._currentPiece = this.getNextPiece();
    console.log(`Spawned new piece at y=${this._currentPiece.position.y}`);
  }

  private moveCurrentPieceDown(): void {
    if (!this._currentPiece) {
      this.spawnNextPiece();
      return;
    }

    const bottomY = this._settings.boardHeight - 1;

    if (
      this.board[this._currentPiece.position.y + 1][
        this._currentPiece.position.x
      ] === 1
    ) {
      console.log(`Collision detected at y=${this._currentPiece.position.y}`);

      if (this._currentPiece.position.y === 0) {
        console.log(
          `Game over for player ${this._player.name} - piece cannot move down from the top`,
        );
        this.eliminate();
        return;
      }

      console.log(
        `Piece locked at x=${this._currentPiece.position.x}, y=${this._currentPiece.position.y}`,
      );
      return;
    }

    if (this._currentPiece.position.y < bottomY) {
      this._currentPiece.position.y += 1;
      console.log(`Piece moved down to y=${this._currentPiece.position.y}`);
      return;
    }

    this.spawnNextPiece();
  }

  private stopGameLoop(): void {
    if (this._gameLoop) {
      clearInterval(this._gameLoop);
      this._gameLoop = null;
    }
  }

  private getNextPiece(): Piece {
    const nextPiece = this._piecesSequence.getNextPiece();
    this.currentPieceIndex = this._piecesSequence.currentIndex;
    return new Piece(nextPiece);
  }

  private addPenaltyLines(count: number): void {
    console.log(`Adding ${count} penalty lines to player ${this._player.name}`);
    const penaltyLine = new Array(this._settings.boardWidth).fill(1);

    // Add penalty lines at the bottom
    for (let i = 0; i < count; i++) {
      this.board.pop(); // Remove top line
      this.board.unshift(penaltyLine); // Add penalty line at the bottom
    }
  }

  private updateBoard(board: number[][]): void {
    console.log(`Updating board for player ${this._player.name}`);
    this.board = board;
  }

  private eliminate(): void {
    console.log(`Player ${this._player.name} has been eliminated.`);
    this.isAlive = false;
    this.stopGameLoop();
  }

  // Helper methodes
  // ============================================
  private createEmptyBoard(): number[][] {
    return Array.from({ length: this._settings.boardHeight }, () =>
      new Array(this._settings.boardWidth).fill(0),
    );
  }
}
