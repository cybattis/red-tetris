import { describe, expect, test } from '@jest/globals';
import { Piece } from '../../src/classes/Piece';
import { PieceType } from '../../src/types/piece';
import { S_PIECE } from '../../src/pieces/TetrominoFactory';

describe('Piece Class', () => {
  const T_SHAPE = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ];

  const I_SHAPE = [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
  ];

  describe('Constructor', () => {
    test('should initialize with correct type and shape', () => {
      const piece = new Piece(PieceType.T);

      expect(piece).toBeDefined();
      expect(piece.type).toBe(PieceType.T);
      expect(piece.shape).toEqual(T_SHAPE);
    });

    test('should initialize I piece correctly', () => {
      const piece = new Piece(PieceType.I);

      expect(piece.type).toBe(PieceType.I);
      expect(piece.shape).toEqual(I_SHAPE);
    });

    test('should initialize S piece from dictionary correctly', () => {
      const piece = new Piece(PieceType.S);

      expect(piece.type).toBe(PieceType.S);
      expect(piece.shape).toEqual(S_PIECE);
    });
  });

  describe('getNextRotation', () => {
    test('should return clockwise rotation for T piece', () => {
      const piece = new Piece(PieceType.T);

      const expected = [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ];

      expect(piece.getNextRotation()).toEqual(expected);
    });

    test('should return correct down shape after two rotations', () => {
      const piece = new Piece(PieceType.T);
      piece.getNextRotation();

      const expected = [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];

      piece.getNextRotation();
      expect(piece.shape).toEqual(expected);
    });

    test('should return correct right shape after three rotations', () => {
      const piece = new Piece(PieceType.T);
      piece.getNextRotation();
      piece.getNextRotation();

      const expected = [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ];

      piece.getNextRotation();
      expect(piece.shape).toEqual(expected);
    });

    test('should return correct up shape after four rotations', () => {
      const piece = new Piece(PieceType.T);
      piece.getNextRotation();
      piece.getNextRotation();
      piece.getNextRotation();

      const expected = T_SHAPE;

      piece.getNextRotation();
      expect(piece.shape).toEqual(expected);
    });

    test('should return horizontal rotation for I piece', () => {
      const piece = new Piece(PieceType.I);

      const expected = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      expect(piece.getNextRotation()).toEqual(expected);
    });

    test('should return vertical rotation for I piece', () => {
      const piece = new Piece(PieceType.I);

      // Rotate twice to get back to vertical
      piece.getNextRotation(); // horizontal
      piece.getNextRotation(); // vertical

      const expected = [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ];

      expect(piece.shape).toEqual(expected);
    });

    test('should return same shape for O piece', () => {
      const oShape = [
        [1, 1],
        [1, 1],
      ];
      const piece = new Piece(PieceType.O);

      expect(piece.getNextRotation()).toEqual(oShape);
    });
  });
});
