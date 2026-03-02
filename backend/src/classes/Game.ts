import { Player } from './Player';
import { GameAction, GameSettings, GameState, GameStateUpdate } from '../../../shared/types/game.js';
import { randomUUID } from 'node:crypto';
import { PiecesSequence } from './PiecesSequence';
import { Piece } from './Piece';
import { Logger, printBoard } from '../utils/helpers';
import { TETROMINO_DICTIONARY } from '../pieces/TetrominoFactory';
import { Position } from '../types/IPiece';
import type { Socket } from 'socket.io';

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
  public lines: number = 0;
  public level: number = 1;

  // Game timing
  public dropInterval: number = 1000; // milliseconds

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
  private _socket: Socket | null = null;

  constructor(player: Player, seed: number, settings: GameSettings, socket?: Socket) {
    this.id = randomUUID();
    this.player = player;
    this.settings = settings;
    this._socket = socket || null;
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
    // Don't spawn a new piece here - we already have one from the constructor
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

  // Game state serialization for frontend
  // ============================================
  public getGameState() {
    return {
      gameId: this.id,
      board: this.board,
      currentPiece: this._currentPiece
        ? {
            type: this._currentPiece.id,
            position: this._currentPiece.position,
            shape: this._currentPiece.shape,
          }
        : null,
      ghostPiece: this.calculateGhostPiece(),
      nextPieces: this.getNextPiecesPreview(),
      score: this.score,
      level: Math.floor(this.linesCleared / 10) + 1, // Simple level calculation
      linesCleared: this.linesCleared,
      totalLinesCleared: this.linesCleared,
      isPaused: this.state !== GameState.Playing,
      isGameOver: !this.isAlive,
      gameOverReason: !this.isAlive ? 'Game Over' : null,
      boardWidth: this.settings.boardWidth,
      boardHeight: this.settings.boardHeight,
    };
  }

  private getNextPiecesPreview(): number[] {
    // Get next few pieces for preview - use a simple approach for now
    const preview = [];
    const maxPreview = Math.min(this.settings.nextPieceCount, 5);
    
    // For now, just return the current piece sequence
    // TODO: Implement proper peek functionality in PiecesSequence
    for (let i = 0; i < maxPreview; i++) {
      preview.push(i + 1); // Temporary: just return sequential numbers
    }
    return preview;
  }

  // Socket communication methods
  // ============================================
  public setSocket(socket: Socket): void {
    this._socket = socket;
  }

  private broadcastGameState(): void {
    if (this._socket) {
      const gameState = this.getGameState();
      this._socket.emit('GAME_STATE_UPDATE', gameState);
      Logger.debug(`Broadcasting game state for game ${this.id}`);
    }
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
    if (this._gravityAccumulatorMs >= this.dropInterval) {
      Logger.debug(`Applying gravity`);
      newPos.y += 1; // Move piece down by gravity
      this._gravityAccumulatorMs = 0;
      this._gravityActivated = true;
    }

    // Read player input and update piece position
    newPos = this.playerInput(newPos);

    // Check if the new position is valid
    if (this.checkCollision(newPos.x, newPos.y)) {
      Logger.debug('Collision detected at x:', newPos.x, 'y:', newPos.y);
      
      // If this was a gravity-induced movement, handle piece locking
      if (this._gravityActivated) {
        // Check if Game Over condition is met (piece can't move down from spawn area)
        if (this._currentPiece.position.y <= 0) {
          this.GameOver();
          return;
        }
        
        // Lock the piece when gravity causes a collision
        this._currentPiece.isLocked = true;
        Logger.debug('Piece locked due to gravity collision');
      }
      // If collision wasn't from gravity, just ignore the movement (don't update position)
    } else {
      // No collision, update the piece position
      Logger.debug(`Moving piece to x=${newPos.x} y=${newPos.y}`);
      this._currentPiece.position = newPos;
    }
    
    // Update the board (handles piece placement and spawning if needed)
    this.updateBoard();
    
    // Broadcast game state to connected clients
    this.broadcastGameState();
  }

  private spawnNextPiece(): void {
    this._currentPiece = this.getNextPiece();
    
    // Check if the piece can be placed at spawn position by checking if any part would overlap
    const spawnX = this._currentPiece.position.x;
    const spawnY = this._currentPiece.position.y;
    
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = spawnX + cell.x;
      const boardY = spawnY + cell.y;
      
      // Check if spawn position overlaps with existing pieces
      if (boardY >= 0 && boardX >= 0 && boardX < this.settings.boardWidth && 
          boardY < this.settings.boardHeight && this.board[boardY][boardX] !== 0) {
        Logger.warn('Game over: Cannot spawn new piece - board is full');
        this.state = GameState.Ended;
        this.isAlive = false;
        this.stopGame();
        return;
      }
    }

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
    
    // If piece is locked, place it permanently on the board and spawn next piece
    if (this._currentPiece.isLocked) {
      this.placePieceOnBoard();
      this.spawnNextPiece();
      return;
    }

    // Otherwise, just show the current piece position for display (temporary visualization)
    this.displayCurrentBoard();
  }

  private placePieceOnBoard(): void {
    Logger.debug(`Placing locked piece on board at x=${this._currentPiece.position.x} y=${this._currentPiece.position.y}`);
    
    const posX = this._currentPiece.position.x;
    const posY = this._currentPiece.position.y;

    // Place the piece permanently on the board
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = posX + cell.x;
      const boardY = posY + cell.y;
      if (
        boardY >= 0 &&
        boardY < this.settings.boardHeight &&
        boardX >= 0 &&
        boardX < this.settings.boardWidth
      ) {
        this.board[boardY][boardX] = this._currentPiece.id + 1;
      }
    }

    // Check for completed lines and clear them
    this.checkAndClearLines();
    
    Logger.debug('Piece placed on board');
  }

  private displayCurrentBoard(): void {
    // Create a temporary board for display that includes the current falling piece
    let displayBoard = this.board.map((row) => row.slice()); // Deep copy of the board

    const posX = this._currentPiece.position.x;
    const posY = this._currentPiece.position.y;

    // Add current piece to display board (temporarily)
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = posX + cell.x;
      const boardY = posY + cell.y;
      if (
        boardY >= 0 &&
        boardY < this.settings.boardHeight &&
        boardX >= 0 &&
        boardX < this.settings.boardWidth
      ) {
        displayBoard[boardY][boardX] = this._currentPiece.id + 1;
      }
    }

    printBoard(displayBoard);
  }

  private checkAndClearLines(): void {
    const linesToClear: number[] = [];
    
    // Check each row for completed lines
    for (let y = 0; y < this.settings.boardHeight; y++) {
      if (this.board[y].every(cell => cell !== 0)) {
        linesToClear.push(y);
      }
    }

    if (linesToClear.length > 0) {
      this.clearLines(linesToClear);
    }
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
      const dropDistance = this.calculateHardDropDistance();
      newPosition.y += dropDistance;
      this._currentPiece.isLocked = true; // Immediately lock the piece after hard drop
      Logger.debug(`Hard drop: moved piece down ${dropDistance} positions to y=${newPosition.y}`);
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
    Logger.debug(`Checking collision for piece at x=${x} y=${y}`);
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = x + cell.x;
      const boardY = y + cell.y;

      // Check wall collisions
      if (boardX < 0 || boardX >= this.settings.boardWidth) {
        Logger.warn('Collision with wall at x:', boardX, 'y:', boardY);
        return true;
      }

      // Check floor collision
      if (boardY >= this.settings.boardHeight) {
        Logger.warn('Collision with floor at x:', boardX, 'y:', boardY);
        return true;
      }

      // Check collision with existing pieces (only for valid board positions)
      if (boardY >= 0 && boardX >= 0 && boardX < this.settings.boardWidth && this.board[boardY][boardX] !== 0) {
        Logger.warn('Collision with existing piece at x:', boardX, 'y:', boardY);
        return true;
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

  private clearLines(linesToClear: number[]): void {
    Logger.info(`Clearing ${linesToClear.length} lines: ${linesToClear.join(', ')}`);
    
    // Remove cleared lines and add empty lines at the top
    for (let i = linesToClear.length - 1; i >= 0; i--) {
      const lineIndex = linesToClear[i];
      this.board.splice(lineIndex, 1);
      this.board.unshift(new Array(this.settings.boardWidth).fill(0));
    }
    
    // Update score based on lines cleared
    this.updateScore(linesToClear.length);
  }

  private updateScore(linesCleared: number): void {
    const points = [0, 40, 100, 300, 1200];
    const scoreIncrease = points[linesCleared] * this.level;
    this.score += scoreIncrease;
    
    // Update lines and level
    this.lines += linesCleared;
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      // Speed up the game (reduce drop interval)
      this.dropInterval = Math.max(50, 1000 - (this.level - 1) * 100);
    }
    
    Logger.info(`Score updated: +${scoreIncrease} points (total: ${this.score}), Level: ${this.level}`);
  }

  private calculateScore(linesCleared: number): number {
    const scoreTable = [0, 100, 300, 500, 800]; // Example scoring for 0-4 lines cleared
    return scoreTable[linesCleared] || 0;
  }

  private calculateHardDropDistance(): number {
    // Calculate how far down the current piece can fall before hitting something
    let maxDropDistance = 0;
    const currentX = this._currentPiece.position.x;
    const currentY = this._currentPiece.position.y;

    // Test each position downward until we hit something
    for (let dropY = currentY + 1; dropY < this.settings.boardHeight; dropY++) {
      if (this.checkCollision(currentX, dropY)) {
        // We hit something, so the max drop distance is the previous position
        maxDropDistance = dropY - currentY - 1;
        break;
      }
      // If we reach the last testable position without collision
      maxDropDistance = dropY - currentY;
    }

    return Math.max(0, maxDropDistance);
  }

  private calculateGhostPiece() {
    if (!this._currentPiece) return null;
    
    const dropDistance = this.calculateHardDropDistance();
    const ghostPosition = {
      x: this._currentPiece.position.x,
      y: this._currentPiece.position.y + dropDistance
    };

    return {
      type: this._currentPiece.id,
      position: ghostPosition,
      shape: this._currentPiece.shape
    };
  }

  // Helper methods
  // ============================================
  private createEmptyBoard(): number[][] {
    return Array.from({ length: this.settings.boardHeight }, () =>
      new Array(this.settings.boardWidth).fill(0),
    );
  }
}
