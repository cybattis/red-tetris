import { v4 as uuidv4 } from 'uuid';

export class Player {
  public readonly id: string;
  public readonly socketId: string;
  public name: string = '';
  public isHost: boolean;

  // Game state
  public board: number[][];
  public currentPieceIndex: number;
  public isAlive: boolean;
  public score: number;
  public linesCleared: number;

  constructor(socketId: string, name: string) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.name = name;
    this.isHost = false;

    this.isAlive = true;
    this.board = this.createEmptyBoard();
    this.currentPieceIndex = 0;
    this.score = 0;
    this.linesCleared = 0;
  }

  private createEmptyBoard(): number[][] {
    return Array.from({ length: 20 }, () => Array(10).fill(0));
  }

  public getSpectrum(): number[] {
    // Calculate column heights for spectrum display
    const spectrum: number[] = new Array(10).fill(0);
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r < 20; r++) {
        if (this.board[r][c] !== 0) {
          spectrum[c] = 20 - r;
          break;
        }
      }
    }
    return spectrum;
  }

  public addPenaltyLines(count: number): void {
    // Add garbage lines at bottom
  }

  public updateBoard(board: number[][]): void {
    this.board = board;
  }

  public eliminate(): void {
    this.isAlive = false;
  }

  public reset(): void {
    this.isAlive = true;
    this.score = 0;
    this.board = this.createEmptyBoard();
    this.currentPieceIndex = 0;
  }

  public toJSON() { // PlayerInfo
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isAlive: this.isAlive,
      score: this.score,
    };
  }
}
