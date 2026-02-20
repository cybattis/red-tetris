import { Player } from './Player';
import { GameSettings, GameState } from '@shared/types/game';
import { randomUUID } from 'node:crypto';
import { PiecesSequence } from './PiecesSequence';
import { Piece } from './Piece';
import { PrintBoard as printBoard } from 'src/utils/helpers';

export class Game {
  // Game state and public properties
  public readonly id: string;
  public readonly player: Player;
  public readonly settings: GameSettings;
  public readonly piecesSequence: PiecesSequence;

  public state: GameState = GameState.Waiting;
  public board: number[][];
  public currentPieceIndex: number = 0;
  public isAlive: boolean = true;
  public score: number = 0;
  public linesCleared: number = 0;

  // Timing constants
  private static readonly TICK_RATE = 60;
  private static readonly TICK_INTERVAL_MS = 1000 / Game.TICK_RATE;
  private static readonly GRAVITY_INTERVAL_MS = 1000;

  // Internal state
  private _gameLoop: NodeJS.Timeout | null = null;
  private _lastTickAt = 0;
  private _gravityAccumulatorMs = 0;
  private _currentPiece: Piece;


  constructor(player: Player, settings: GameSettings, seed: number) {
    this.id = randomUUID();
    this.player = player;
    this.settings = settings;
    this.piecesSequence = new PiecesSequence(seed, 1000);
    this.board = this.createEmptyBoard();
    printBoard(this.board);
    this._currentPiece = this.getNextPiece();
  }

  // Game actions
  // ============================================
  public start(): void {
    if (this.state === 'playing') {
      console.log(`Game for player ${this.player.name} is already in progress.`);
      return;
    }

    console.log(`Starting game for player ${this.player.name}`);
    this.state = GameState.Playing;

    if (!this._currentPiece) {
      this.spawnNextPiece();
    }

    this._lastTickAt = Date.now();
    this._gameLoop = setInterval(() => {
      this.gameloop();
    }, Game.TICK_INTERVAL_MS);
  }

  // Game logic methods
  // ============================================
  private gameloop(): void {
    if (!this.isAlive) {
      this.stopGameLoop();
      return;
    }

    const now = Date.now();
    const deltaTime = now - this._lastTickAt;
    this._lastTickAt = now;

    this._gravityAccumulatorMs += deltaTime;

    // Handle gravity
    if (this._gravityAccumulatorMs >= Game.GRAVITY_INTERVAL_MS) {
      console.log(`Applying gravity`);
      this.moveCurrentPieceDown();
      this._gravityAccumulatorMs = 0;
    }

    // Read player input and update piece position here
    this.playerInput("");

    // Check for line clears, update score, and handle game over conditions here
    // this.handleGameConditions();

    // Update the board state
    this.updateBoard();

    // send updated game state to client here
    // this.sendGameStateToClient();
  }

  private spawnNextPiece(): void {
    this._currentPiece = this.getNextPiece();
    console.log(`Spawned new piece at y=${this._currentPiece.position.y}`);
  }

  private moveCurrentPieceDown(): void {
    this._currentPiece.position.y += 1;
    console.log(`Piece moved down to y=${this._currentPiece.position.y}`);
  }

  private stopGameLoop(): void {
    if (this._gameLoop) {
      clearInterval(this._gameLoop);
      this._gameLoop = null;
    }
  }

  private getNextPiece(): Piece {
    const nextPiece = this.piecesSequence.getNextPieceType();
    this.currentPieceIndex = this.piecesSequence.currentIndex;
    const piece = new Piece(nextPiece);
    piece.position = { x: Math.floor(this.settings.boardWidth / 2), y: -1 };
    return piece;
  }

  private addPenaltyLines(count: number): void {
    console.log(`Adding ${count} penalty lines to player ${this.player.name}`);
    const penaltyLine = new Array(this.settings.boardWidth).fill(1);

    // Add penalty lines at the bottom
    for (let i = 0; i < count; i++) {
      this.board.pop(); // Remove top line
      this.board.unshift(penaltyLine); // Add penalty line at the bottom
    }
  }

  private updateBoard(): void {
    console.log(`Updating board for player ${this.player.name}`);
    let newBoard = this.board.map(row => row.slice()); // Deep copy of the board

    // Draw the current piece on the new board
    const shape = this._currentPiece.shape;
    const posX = this._currentPiece.position.x;
    const posY = this._currentPiece.position.y;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const boardX = posX + c;
          const boardY = posY + r;
          if (boardY >= 0 && boardY < this.settings.boardHeight && boardX >= 0 && boardX < this.settings.boardWidth) {
            newBoard[boardY][boardX] = 1;
          }
        }
      }
    }

    if (this.checkCollision(posX, posY)) {
      console.log(`Collision detected after updating board, locking piece in place`);
      this.board = newBoard.map(row => row.slice()); // Update the actual board with the new state
      this.spawnNextPiece();
    }

    printBoard(newBoard);
  }

  private eliminate(): void {
    console.log(`Player ${this.player.name} has been eliminated.`);
    this.isAlive = false;
    this.stopGameLoop();
  }

  private playerInput(input: string): void {
    // Handle player input to move or rotate the piece
    // This is a placeholder for actual input handling logic
    console.log(`Received player input: ${input}`);

    // For example, if input is 'down', we can move the piece down immediately
    if (input === 'down') {
      // Handle moving the piece down immediately, bypassing gravity with delay animation
    }

    if (input === 'rotate') {
      // Handle rotating the piece, with appropriate checks for collisions and wall kicks
      this._currentPiece.getNextRotation();
      console.log(`Rotated piece to new shape: ${JSON.stringify(this._currentPiece.shape)}`);
    }

    if (input === 'left' || input === 'right') {
      // Handle moving the piece left or right, with collision checks
      const direction = input === 'left' ? -1 : 1;
      const nextX = this._currentPiece.position.x + direction;

      if (nextX >= 0 && nextX < this.settings.boardWidth) {
        this._currentPiece.position.x = nextX;
        console.log(`Moved piece ${input} to x=${this._currentPiece.position.x}`);
      } else {
        console.log(`Cannot move piece ${input}, out of bounds at x=${nextX}`);
      }
    }
  }

  private checkCollision(x: number, y: number): boolean {
    if (y >= this.settings.boardHeight || x < 0 || x >= this.settings.boardWidth) {
      console.log(`Collision detected at { x: ${x} y: ${y} } - reached board boundary`);
      return true; // Out of bounds
    }

    if (y >= 0 && this.board[y][x] === 1) {
      console.log(`Collision detected at { x: ${x} y: ${y} }`);
      return true; // Collision with existing blocks
    }

    return false; // No collision
  }

  // Helper methodes
  // ============================================
  private createEmptyBoard(): number[][] {
    return Array.from({ length: this.settings.boardHeight }, () =>
      new Array(this.settings.boardWidth).fill(0),
    );
  }
}
