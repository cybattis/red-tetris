import { Player } from './Player';
import { GameAction, GameMode, GameSettings, GameState } from '@shared/types/game';
import { randomUUID } from 'node:crypto';
import { PiecesSequence } from './PiecesSequence';
import { Piece } from './Piece';
import { Logger } from '../utils/helpers';
import { TETROMINO_DICTIONARY } from '../pieces/TetrominoFactory';
import type { Server } from 'socket.io';
import { EventEmitter } from 'node:events';
import type { Room } from './Room';
import { wsManager } from '../server';

export class Game extends EventEmitter {
  // Game state and public properties
  public readonly id: string;
  public readonly player: Player;
  public readonly settings: GameSettings;
  public readonly piecesSequence: PiecesSequence;
  public readonly room: Room;

  // Access the WebSocket server instance from GameManager
  private readonly io: Server = wsManager.io;

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

  // Store original gravity and current effective gravity for Sprint mode
  private readonly originalGravity: number;

  // Sprint mode constants - simplified approach using gravity acceleration
  private static readonly SPRINT_GRAVITY_INCREASE_PER_LINE = 0.05; // Gravity increases by 0.05 per line cleared
  private static readonly SPRINT_MAX_GRAVITY = 20; // Cap gravity at 20x the base value

  // Timing constants
  private static readonly TICK_RATE = 60;
  private static readonly TICK_INTERVAL_MS = 1000 / Game.TICK_RATE;
  private static readonly BASE_GRAVITY_INTERVAL_MS = 1000;

  private _gameLoop: NodeJS.Timeout | null = null;
  // Internal state
  private _lastTickAt = 0;
  private _gravityAccumulatorMs = 0;
  private _currentPiece: Piece;
  private _playerInput: GameAction = GameAction.NO_INPUT;
  private _starting: boolean = true; // Flag to indicate the first tick for proper initial piece spawning

  constructor(player: Player, seed: number, settings: GameSettings, room: Room) {
    super();
    this.id = randomUUID();
    this.player = player;
    this.settings = { ...settings }; // Create a copy to avoid modifying the original settings
    this.originalGravity = settings.gravity; // Store original gravity for restoration
    this.room = room;

    this.piecesSequence = new PiecesSequence(seed, 7);
    this.board = this.createEmptyBoard();
    this._currentPiece = this.getNextPiece();
    this.updateDropInterval();
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

    // Reset gravity to original value to prevent persistent effects
    this.settings.gravity = this.originalGravity;

    // Remove all event listeners from this EventEmitter
    this.removeAllListeners();

    Logger.info(`Game ${this.id} stopped and cleaned up`);
  }

  public setPlayerInput(input: GameAction): void {
    // Buffer player input to be processed in the gameloop
    this._playerInput = input;
  }

  // Game state serialization for frontend
  // ============================================
  public getGameState() {
    const gameState = {
      gameId: this.id,
      board: this.board,
      currentPiece: this._currentPiece
        ? {
          type: this._currentPiece.id,
          position: this._currentPiece.position,
          shape: this._currentPiece.shape,
        }
        : null,
      ghostPiece: this.settings.ghostPiece ? this.calculateGhostPiece() : null,
      nextPieces: this.getNextPiecesPreview(),
      score: this.score,
      level: 1,
      linesCleared: this.linesCleared,
      totalLinesCleared: this.lines,
      isPaused: this.state !== GameState.Playing,
      isGameOver: !this.isAlive,
      gameOverReason: this.isAlive ? null : 'Game Over',
      boardWidth: this.settings.boardWidth,
      boardHeight: this.settings.boardHeight,
      gameMode: this.settings.gameMode,
    };

    Logger.dump('Backend getGameState() returning:', {
      isAlive: this.isAlive,
      state: this.state,
      isGameOver: gameState.isGameOver,
      gameOverReason: gameState.gameOverReason,
      isPaused: gameState.isPaused,
      opponentsCount: this.room?.playerCount
    });

    return gameState;
  }

  /**
   * Calculate spectrum (column heights) for a board
   */
  private calculateSpectrum(board: number[][]): number[] {
    const width = board[0]?.length || 10;
    const spectrum: number[] = new Array(width).fill(0);

    for (let col = 0; col < width; col++) {
      for (let row = 0; row < board.length; row++) {
        if (board[row][col] !== 0) {
          spectrum[col] = board.length - row;
          break; // Found the highest block in this column
        }
      }
    }

    return spectrum;
  }

  private getNextPiecesPreview(): number[] {
    const nextPieceTypes = this.piecesSequence.peekNextPieces(this.settings.nextPieceCount);

    return nextPieceTypes.map((pieceType) => {
      const pieceDef = TETROMINO_DICTIONARY[pieceType];
      return pieceDef.id;
    });
  }

  private broadcastGameState(): void {
    const gameState = this.getGameState();
    if (!this.io.to(this.room?.id!).emit('GAME_STATE_UPDATE', gameState)) {
      Logger.warn(`Failed to broadcast game state for game ${this.id} in room ${this.room?.id}`);
    }
  }

  private broadcastAnimation(animationType: string, data: any): void {
    if (!this.io.to(this.room?.id!).emit('GAME_ANIMATION', {
      type: animationType,
      data: data,
    })) {
      Logger.warn(`Failed to broadcast game animation for game ${this.id} in room ${this.room?.id}`);
    }
  }

  // Game logic methods
  // ============================================
  private gameloop(): void {
    if (!this.isAlive) {
      this.stopGame();
      return;
    }

    const now = Date.now();

    // Update timing
    const deltaTime = now - this._lastTickAt;
    this._lastTickAt = now;
    this._gravityAccumulatorMs += deltaTime;
    const hasInput = this._playerInput !== GameAction.NO_INPUT;

    // Player input first
    this.processPlayerInput();

    if (this._currentPiece.isLocked) {
      this.updateBoard();
      this.broadcastGameState();
      return;
    }

    // Handle gravity
    const gravityActivation = this._gravityAccumulatorMs >= this.dropInterval;
    if (gravityActivation) {
      this._gravityAccumulatorMs = 0;
      const gravityPos = {
        x: this._currentPiece.position.x,
        y: this._currentPiece.position.y + 1,
      };

      if (this.checkCollision(gravityPos.x, gravityPos.y)) {
        // lock piece only if procced by gravity
        if (!this._currentPiece.isLocked) {
          if (this._currentPiece.position.y <= 0) {
            this.GameOver();
            return;
          }

          this._currentPiece.isLocked = true;
        }
      } else {
        // Gravity move is valid
        this._currentPiece.position = gravityPos;
      }
    }

    // Update the board (handles piece placement and spawning if needed)
    this.updateBoard();

    if (hasInput || gravityActivation || this._starting) {
      this._starting = false; // Clear the starting flag after the first update
      // Broadcast game state to connected clients
      this.broadcastGameState();
    }
  }

  /**
   * Process player input independently from gravity.
   * Horizontal moves are validated on their own so a wall collision
   * cannot be confused with a downward collision.
   */
  private processPlayerInput(): void {
    const input = this._playerInput;
    if (input === GameAction.NO_INPUT) return;

    // Clear the buffered input immediately to prevent re-processing
    this._playerInput = GameAction.NO_INPUT;

    if (input === GameAction.ROTATE_CW) {
      this.attemptRotation();
      return;
    }

    if (input === GameAction.HARD_DROP) {
      const dropDistance = this.calculateHardDropDistance();
      const startY = this._currentPiece.position.y;
      const endY = startY + dropDistance;

      const hardDropBonus = dropDistance + 1;
      this.addHardDropBonus(hardDropBonus);

      // Create hard drop trail data for each column of the piece
      const trailData = [];
      for (const cell of this._currentPiece.getOccupiedCells()) {
        trailData.push({
          x: this._currentPiece.position.x + cell.x,
          startY: startY + cell.y,
          endY: endY + cell.y,
          type: this._currentPiece.id,
        });
      }

      this.broadcastAnimation('HARD_DROP', {
        trail: trailData,
        timestamp: Date.now(),
      });

      this._currentPiece.position.y += dropDistance;
      this._currentPiece.isLocked = true;
      return;
    }

    if (input === GameAction.SOFT_DROP) {
      // Soft drop: move down by one
      const softDropPos = {
        x: this._currentPiece.position.x,
        y: this._currentPiece.position.y + 1,
      };
      this._gravityAccumulatorMs = 0;

      if (this.checkCollision(softDropPos.x, softDropPos.y)) {
        // Soft drop hit something
        if (!this._currentPiece.isLocked) {
          if (this._currentPiece.position.y <= 0) {
            this.GameOver();
            return;
          }
          this._currentPiece.isLocked = true;
        }
      } else {
        this._currentPiece.position = softDropPos;
      }
      return;
    }

    // Horizontal movement independent from vertical movement
    if (input === GameAction.MOVE_LEFT || input === GameAction.MOVE_RIGHT) {
      const dx = input === GameAction.MOVE_LEFT ? -1 : 1;
      const movePos = {
        x: this._currentPiece.position.x + dx,
        y: this._currentPiece.position.y,
      };

      if (!this.checkCollision(movePos.x, movePos.y)) {
        this._currentPiece.position = movePos;
      }
      // If collision, simply ignore the horizontal move (no locking!)
    }
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
      if (
        boardY >= 0 &&
        boardX >= 0 &&
        boardX < this.settings.boardWidth &&
        boardY < this.settings.boardHeight &&
        this.board[boardY][boardX] !== 0
      ) {
        Logger.warn('Game over: Cannot spawn new piece - board is full');
        this.GameOver();
        return;
      }
    }
  }

  private getNextPiece(): Piece {
    const nextPieceType = this.piecesSequence.getNextPieceType();
    this.currentPieceIndex = this.piecesSequence.currentIndex;

    const pieceDef = TETROMINO_DICTIONARY[nextPieceType];
    const piece = new Piece(pieceDef);

    const realWidth = piece.getRealWidth();
    const spawnX = Math.floor((this.settings.boardWidth - realWidth) / 2);

    const topMostRow = piece.getTopMostOccupiedRow();
    const spawnY = 0 - topMostRow;

    piece.position = { x: spawnX, y: spawnY };
    return piece;
  }

  private updateBoard(): void {
    if (this._currentPiece.isLocked) {
      this.placePieceOnBoard();
      this.spawnNextPiece();
      return;
    }

    this.displayCurrentBoard();
  }

  private placePieceOnBoard(): void {
    const posX = this._currentPiece.position.x;
    const posY = this._currentPiece.position.y;
    const lockedCells = [];

    // Place the piece permanently on the board and collect locked cell positions
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = posX + cell.x;
      const boardY = posY + cell.y;
      if (
        boardY >= 0 &&
        boardY < this.settings.boardHeight &&
        boardX >= 0 &&
        boardX < this.settings.boardWidth
      ) {
        this.board[boardY][boardX] = this._currentPiece.id;
        lockedCells.push({
          x: boardX,
          y: boardY,
          type: this._currentPiece.id,
        });
      }
    }

    this.broadcastAnimation('PIECE_LOCK', {
      cells: lockedCells,
      timestamp: Date.now(),
    });

    // All game modes use standard piece placement logic

    this.checkAndClearLines();
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
        displayBoard[boardY][boardX] = this._currentPiece.id;
      }
    }

    // printBoard(displayBoard); // Commented out to reduce log spam
  }

  private checkAndClearLines(): void {
    const linesToClear: number[] = [];

    // Check each row for completed lines
    // Penalty rows (containing type 8 blocks) are indestructible and cannot be cleared
    for (let y = 0; y < this.settings.boardHeight; y++) {
      const row = this.board[y];
      const isFull = row.every((cell) => cell !== 0);
      const isPenaltyRow = row.some((cell) => cell === 8);
      if (isFull && !isPenaltyRow) {
        linesToClear.push(y);
      }
    }

    if (linesToClear.length > 0) {
      this.clearLines(linesToClear);
    }
  }



  private checkCollision(x: number, y: number): boolean {
    for (const cell of this._currentPiece.getOccupiedCells()) {
      const boardX = x + cell.x;
      const boardY = y + cell.y;

      // Check wall collisions
      if (boardX < 0 || boardX >= this.settings.boardWidth) {
        return true;
      }

      // Check floor collision
      if (boardY >= this.settings.boardHeight) {
        return true;
      }

      // Check collision with existing pieces (only for valid board positions)
      if (
        boardY >= 0 &&
        boardX >= 0 &&
        boardX < this.settings.boardWidth &&
        this.board[boardY][boardX] !== 0
      ) {
        return true;
      }
    }

    return false; // No collision
  }

  // Game condition checks, line clears, scoring, and other game logic methods would go here
  // ============================================
  private Victory(): void {
    this.stopGame();
    // Send victory message to client here

    // End-of-game logic and cleanup here
  }

  private GameOver(): void {
    this.isAlive = false;
    this.state = GameState.Ended;

    Logger.info('Backend GameOver() - current state:', {
      isAlive: this.isAlive,
      state: this.state,
    });

    // Broadcast final game state to the client
    this.broadcastGameState();

    this.room.io.to(this.room?.id!).emit('GAME_OVER', {
      gameId: this.id,
      playerId: this.player.id,
      reason: 'Game Over',
    });

    this.stopGame();

    Logger.info(`Game ${this.id} ended for player ${this.player.name}`);
  }

  /**
   * Add indestructible penalty lines at the bottom of the board.
   * Each penalty line is completely filled with a special block value (8 = PENALTY) — no gaps.
   * Existing rows shift upward; top rows are removed to keep board size constant.
   * If the displaced rows cause the current piece to overlap, the game ends.
   */
  public addPenaltyLines(count: number): void {
    if (count <= 0) return;
    Logger.info(`Adding ${count} penalty lines to player ${this.player.name}`);

    const penaltyRowIndices: number[] = [];

    for (let i = 0; i < count; i++) {
      // Create a fully filled penalty line with indestructible blocks (type 8 = PENALTY)
      // No gaps — penalty lines are completely solid and unclearable
      const penaltyLine = new Array(this.settings.boardWidth).fill(8);

      // Remove the top row (shift everything up)
      this.board.shift();
      // Add penalty line at the bottom
      this.board.push([...penaltyLine]); // Push a copy to avoid any reference issues
    }

    // Adjust current piece position upward to compensate for board shift
    // Without this, the piece would be "count" rows lower relative to the board content
    if (this._currentPiece && !this._currentPiece.isLocked) {
      this._currentPiece.position.y -= count;
    }

    // Collect penalty row indices (bottom N rows)
    for (let i = 0; i < count; i++) {
      penaltyRowIndices.push(this.settings.boardHeight - 1 - i);
    }

    // Broadcast penalty animation to this player so they see the warning flash
    this.broadcastAnimation('PENALTY_LINES', {
      rows: penaltyRowIndices,
      count,
      timestamp: Date.now(),
    });

    // Check if penalty lines pushed existing content into spawn area causing game over
    if (this._currentPiece && !this._currentPiece.isLocked) {
      if (this.checkCollision(this._currentPiece.position.x, this._currentPiece.position.y)) {
        Logger.warn(`Penalty lines caused collision for player ${this.player.name} — Game Over`);
        this.GameOver();
      }
    }
  }

  private clearLines(linesToClear: number[]): void {
    const timestamp = Date.now();
    this.broadcastAnimation('LINE_CLEAR', {
      rows: linesToClear,
      timestamp: timestamp,
    });

    // Create a new board by filtering out the cleared lines
    const newBoard: number[][] = [];

    // Add empty lines at the top for each cleared line
    for (const _ of linesToClear) {
      newBoard.push(new Array(this.settings.boardWidth).fill(0));
    }

    // Add all non-cleared lines to the new board
    for (let i = 0; i < this.board.length; i++) {
      if (!linesToClear.includes(i)) {
        newBoard.push([...this.board[i]]); // Create a copy of the row
      }
    }

    // Replace the board with the new one
    this.board = newBoard;

    // Apply Sprint mode specific effects for line clearing
    if (this.settings.gameMode === GameMode.Sprint && linesToClear.length >= 3) {
      // Add speed boost animation for significant line clears in Sprint mode
      this.broadcastAnimation('SPEED_BOOST', {
        multiplier: linesToClear.length,
        timestamp: Date.now(),
      });
    }

    // Update score based on lines cleared
    this.updateScore(linesToClear.length);

    // Update drop interval after clearing lines (for speed-based modes like Sprint)
    this.updateDropInterval();

    // Emit penalty event for multiplayer: opponents receive (n - 1) indestructible lines
    const penaltyCount = Math.max(0, linesToClear.length - 1);
    if (penaltyCount > 0 && this.room) {
      this.emit('penaltyLines', {
        fromPlayerId: this.player.id,
        count: penaltyCount,
      });
    }
  }

  private addHardDropBonus(bonus: number): void {
    this.score += bonus;
    // Reduce logging for performance - only log significant events
    // Logger.info(`Hard drop bonus: +${bonus} points (total: ${this.score})`);
  }

  private updateScore(linesCleared: number): void {
    // Calculate and add score (simplified for single level)
    const points = [0, 40, 100, 300, 1200];
    const scoreIncrease = points[linesCleared];
    this.score += scoreIncrease;

    this.lines += linesCleared;

    // Reduce logging for performance - only log significant scoring events
    if (linesCleared >= 3) {
      // Only log for triple+ line clears
      Logger.info(`Score updated: +${scoreIncrease} points (total: ${this.score}), Lines: ${this.lines}`);
    }
  }

  private calculateHardDropDistance(isGhostCalculation = false): number {
    // Calculate how far down the current piece can fall before hitting something
    const currentX = this._currentPiece.position.x;
    const currentY = this._currentPiece.position.y;

    // Test each position downward until we hit something
    for (let dropY = currentY + 1; dropY <= this.settings.boardHeight; dropY++) {
      if (this.checkCollision(currentX, dropY)) {
        // We hit something, so the max drop distance is the previous position
        return dropY - currentY - 1;
      }
    }

    return this.settings.boardHeight - currentY - 1;
  }

  private calculateGhostPiece() {
    if (!this._currentPiece) return null;

    const dropDistance = this.calculateHardDropDistance(true); // Pass true to indicate ghost piece calculation
    const ghostPosition = {
      x: this._currentPiece.position.x,
      y: this._currentPiece.position.y + dropDistance,
    };

    return {
      type: this._currentPiece.id,
      position: ghostPosition,
      shape: this._currentPiece.shape,
    };
  }

  private calculateDropInterval(): number {
    // Use the current effective gravity (which includes Sprint modifications)
    const effectiveGravity =
      this.settings.gameMode === GameMode.Sprint ? this.getCurrentSprintGravity() : this.originalGravity;

    return Math.max(50, Game.BASE_GRAVITY_INTERVAL_MS / effectiveGravity);
  }

  private getCurrentSprintGravity(): number {
    // Calculate current gravity for Sprint mode without modifying settings
    const gravityIncrease = this.lines * Game.SPRINT_GRAVITY_INCREASE_PER_LINE;
    return Math.min(this.originalGravity + gravityIncrease, Game.SPRINT_MAX_GRAVITY);
  }

  /**
   * Get the current gravity multiplier for Sprint mode (useful for display purposes)
   */
  public getSprintGravityMultiplier(): number {
    if (this.settings.gameMode !== GameMode.Sprint) {
      return 1;
    }

    return this.getCurrentSprintGravity() / this.originalGravity;
  }

  private updateDropInterval(): void {
    const newDropInterval = this.calculateDropInterval();

    // Only update if the change is significant (> 5ms difference)
    // This prevents excessive interval updates that can cause lag
    if (Math.abs(newDropInterval - this.dropInterval) > 5) {
      this.dropInterval = newDropInterval;
    }
  }

  // Helper methods
  // ============================================
  private createEmptyBoard(): number[][] {
    return Array.from({ length: this.settings.boardHeight }, () =>
      new Array(this.settings.boardWidth).fill(0),
    );
  }

  private attemptRotation(): void {
    // Save current state
    const originalShape = this._currentPiece.shape.map((row) => [...row]);
    const originalWidth = this._currentPiece.width;
    const originalHeight = this._currentPiece.height;

    // Try rotation
    this._currentPiece.getNextRotation();

    // Wall kick offsets to try (standard SRS wall kicks)
    const wallKickOffsets = [
      { x: 0, y: 0 }, // No kick (original position)
      { x: -1, y: 0 }, // Left kick
      { x: 1, y: 0 }, // Right kick
      { x: -2, y: 0 }, // Left kick 2
      { x: 2, y: 0 }, // Right kick 2
      { x: 0, y: -1 }, // Up kick
      { x: -1, y: -1 }, // Left-up kick
      { x: 1, y: -1 }, // Right-up kick
    ];

    // Try each wall kick offset
    for (const offset of wallKickOffsets) {
      const testX = this._currentPiece.position.x + offset.x;
      const testY = this._currentPiece.position.y + offset.y;

      if (!this.checkCollision(testX, testY)) {
        // This position works - apply the wall kick
        this._currentPiece.position.x = testX;
        this._currentPiece.position.y = testY;
        return;
      }
    }

    // No valid position found - revert rotation
    this._currentPiece.shape = originalShape;
    this._currentPiece.width = originalWidth;
    this._currentPiece.height = originalHeight;
  }
}
