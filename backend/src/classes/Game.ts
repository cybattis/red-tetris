import { Player } from './Player';
import { GameAction, GameSettings, GameState } from '@shared/types/game';
import { randomUUID } from 'node:crypto';
import { PiecesSequence } from './PiecesSequence';
import { Piece } from './Piece';
import { Logger, printBoard } from 'src/utils/helpers';
import { TETROMINO_DICTIONARY } from '../pieces/TetrominoFactory';
import { Position } from '../types/IPiece';

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

  private _gameLoop: NodeJS.Timeout | null = null;
  // Internal state
  private _lastTickAt = 0;
  private _gravityAccumulatorMs = 0;
  private _gravityActivated = false;
  private _currentPiece: Piece;
  private _playerInput: GameAction = GameAction.NO_INPUT;

  constructor(player: Player, seed: number, settings: GameSettings) {
    this.id = randomUUID();
    this.player = player;
    this.settings = settings;
    this.piecesSequence = new PiecesSequence(seed, 7);
    this.board = this.createEmptyBoard();
    this._currentPiece = this.getNextPiece();
  }

  // Game actions
  // ============================================
  public start(): void {
    if (this.state === GameState.Playing) {
      Logger.warn(`Game for player ${this.player.name} is already in progress.`);
      return;
    }

    Logger.info(`Starting game for player ${this.player.name}...`);
    this.state = GameState.Playing;
    this.spawnNextPiece();
    this._lastTickAt = Date.now();

    // Start the game loop
    this._gameLoop = setInterval(() => {
      this.gameloop();
    }, Game.TICK_INTERVAL_MS);
  }

  public stopGame(): void {
    if (this._gameLoop) {
      clearInterval(this._gameLoop);
      this._gameLoop = null;
    }
  }

  public setPlayerInput(input: GameAction): void {
    // Buffer player input to be processed in the gameloop
    this._playerInput = input;
  }

  // Game logic methods
  // ============================================
  private gameloop(): void {
    if (!this.isAlive) {
      this.stopGame();
      return;
    }

    // Update timing
    const now = Date.now();
    const deltaTime = now - this._lastTickAt;
    this._lastTickAt = now;
    this._gravityAccumulatorMs += deltaTime;
    this._gravityActivated = false;

    let newPos = { ...this._currentPiece.position };

    // Handle gravity
    if (this._gravityAccumulatorMs >= Game.GRAVITY_INTERVAL_MS) {
      Logger.debug(`Applying gravity`);
      newPos.y += 1; // Move piece down by gravity
      this._gravityAccumulatorMs = 0;
      this._gravityActivated = true;
    }

    // Read player input and update piece position
    newPos = this.playerInput(newPos);

    if (this._currentPiece.checkPosition(newPos)) return;

    if (this.checkCollision(newPos.x, newPos.y)) {
      Logger.debug('Collision detected at x:', newPos.x, 'y:', newPos.y);
      // Check if Game Over condition is met (collision at spawn position)
      if (newPos.y < 0) {
        this.GameOver();
        return;
      }
    }

    Logger.debug(`Moving piece to x=${newPos.x} y=${newPos.y}`);
    this._currentPiece.position = newPos;
    this.updateBoard();
  }

  private spawnNextPiece(): void {
    this._currentPiece = this.getNextPiece();
    Logger.debug(
      `Spawned new piece at x=${this._currentPiece.position.x} y=${this._currentPiece.position.y}`,
    );
  }

  private moveCurrentPieceDown(): void {
    this._currentPiece.position.y += 1;
    Logger.debug(`Piece moved down to y=${this._currentPiece.position.y}`);
  }

  private getNextPiece(): Piece {
    const nextPieceType = this.piecesSequence.getNextPieceType();
    this.currentPieceIndex = this.piecesSequence.currentIndex;

    const pieceDef = TETROMINO_DICTIONARY[nextPieceType];
    const piece = new Piece(pieceDef);

    piece.position = { x: Math.floor(this.settings.boardWidth / 2), y: -1 };
    return piece;
  }

  private updateBoard(): void {
    Logger.info(`Updating board for player ${this.player.name}`);
    let newBoard = this.board.map((row) => row.slice()); // Deep copy of the board

    // Draw the current piece on the new board
    const shape = this._currentPiece.shape;
    Logger.dump(shape);
    const posX = this._currentPiece.position.x;
    const posY = this._currentPiece.position.y;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const boardX = posX + c;
          const boardY = posY + r;
          if (
            boardY >= 0 &&
            boardY < this.settings.boardHeight &&
            boardX >= 0 &&
            boardX < this.settings.boardWidth
          ) {
            newBoard[boardY][boardX] = this.currentPieceIndex + 1; // Use piece index + 1 to represent the piece on the board
          }
        }
      }
    }

    Logger.dump(newBoard);
    if (this._currentPiece.isLocked) {
      this.board = newBoard;
      this.spawnNextPiece();
    }

    printBoard(newBoard);
  }

  private playerInput(newPosition: Position): Position {
    const input = this._playerInput;
    if (input === GameAction.NO_INPUT) return newPosition; // No input to process

    Logger.debug(`Received player input: ${input}`);

    if (input === GameAction.ROTATE_CW) {
      // Handle rotating the piece, with appropriate checks for collisions and wall kicks
      this._currentPiece.getNextRotation();
      Logger.debug(`Rotate piece`);
    }

    // For example, if input is 'down', we can move the piece down immediately
    if (input === GameAction.SOFT_DROP && !this._gravityActivated) {
      // Handle moving the piece down immediately, bypassing gravity with delay animation
      newPosition.y += 1;
      this._gravityAccumulatorMs = 0;
    }

    if (input === GameAction.HARD_DROP) {
      // Handle hard drop - move piece down until it collides
      // newPosition.y += this._hardDropDistance(this._currentPiece, this.board, this.settings.boardHeight);
      // Logger.debug(`Hard drop to y=${this._currentPiece.position.y}`);
      Logger.warn('Hard drop Not implemented');
    }

    if (input === GameAction.MOVE_LEFT) {
      newPosition.x -= 1;
    }

    if (input === GameAction.MOVE_RIGHT) {
      newPosition.x += 1;
    }

    // Clear the buffered input after processing
    this._playerInput = GameAction.NO_INPUT;
    return newPosition;
  }

  private checkCollision(x: number, y: number): boolean {
    const width = this._currentPiece.width;
    const height = this._currentPiece.height;
    const shape = this._currentPiece.shape;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (shape[r][c] === 1) {
          const boardX = x + c;
          const boardY = y + r;

          // Check boundaries
          if (boardX < 0 || boardX >= this.settings.boardWidth) {
            Logger.warn('Collision with wall or floor at x:', boardX, 'y:', boardY);
            return true; // Collision with walls or floor
          }

          // Check collision with existing pieces on the board or floor
          if ((boardY >= 0 && boardY >= this.settings.boardHeight) || this.board[boardY][boardX] !== 0) {
            Logger.warn('Collision with existing piece at x:', boardX, 'y:', boardY);
            this._currentPiece.isLocked = true;
            return true; // Collision with existing pieces or floor
          }
        }
      }
    }

    return false; // No collision
  }

  // Game condition checks, line clears, scoring, and other game logic methods would go here
  // ============================================
  private GameWin(): void {
    Logger.debug(`Player ${this.player.name} has won the game!`);
    this.stopGame();
    // Send victory message to client here

    // End-of-game logic and cleanup here
  }

  private GameOver(): void {
    Logger.debug(`Player ${this.player.name} has been eliminated.`);
    this.isAlive = false;
    this.stopGame();
    // Send elimination message to client here

    // End-of-game logic and cleanup here
  }

  private addPenaltyLines(count: number): void {
    Logger.info(`Adding ${count} penalty lines to player ${this.player.name}`);
    const penaltyLine = new Array(this.settings.boardWidth).fill(1);

    // Add penalty lines at the bottom
    for (let i = 0; i < count; i++) {
      this.board.pop(); // Remove top line
      this.board.unshift(penaltyLine); // Add penalty line at the bottom
    }
  }

  private clearLines(lines: number[]): void {
    Logger.info(`Clearing lines ${lines} for player ${this.player.name}`);
    // Remove the cleared lines from the board
    for (const line of lines) {
      this.board.splice(line, 1); // Remove the cleared line
      this.board.unshift(new Array(this.settings.boardWidth).fill(0)); // Add an empty line at the top
    }
    this.linesCleared += lines.length;
    this.score += this.calculateScore(lines.length);
  }

  private calculateScore(linesCleared: number): number {
    const scoreTable = [0, 100, 300, 500, 800]; // Example scoring for 0-4 lines cleared
    return scoreTable[linesCleared] || 0;
  }

  // Helper methods
  // ============================================
  private createEmptyBoard(): number[][] {
    return Array.from({ length: this.settings.boardHeight }, () =>
      new Array(this.settings.boardWidth).fill(0),
    );
  }
}
