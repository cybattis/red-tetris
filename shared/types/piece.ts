export type Position = {
  x: number;
  y: number;
};

export const enum PieceType {
  I = "I",
  J = "J",
  L = "L",
  O = "O",
  S = "S",
  T = "T",
  Z = "Z",
}

/**
 * PieceDefinition is the static data for each piece type, used for initialization and rotation logic.
 */
export interface PieceDefinition {
  type: PieceType;
  id: number;
  shape: number[][]; // 3D array of shape blocks
}

/**
 * IPiece is the dynamic instance of a piece in the game, with position and rotation state.
 */
export interface IPiece extends PieceDefinition {
  position: Position;
  rotation: number;
}

/**
 * PieceState send to clients
 */
export interface PieceState {
  type: number;
  position: Position;
  shape: number[][];
  rotation: number;
}
