import type { PieceState } from "./piece.js";

export interface IPlayer {
  readonly id: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  isSpectator: boolean;
}

/**
 * Player game state (for multiplayer - other players' states)
 */
export interface OpponentsGameState {
  player: IPlayer;
  score: number;
  isEliminated: boolean;

  spectrum: number[]; // Column heights for spectrum display
  board?: number[][];
  nextPieces?: number[];
  currentPiece?: PieceState;
}
