import { describe, expect, test } from '@jest/globals';
import { Piece } from '../../src/classes/Piece';
import { PieceType } from '../../src/types/IPiece';
import { I_PIECE, TETROMINO_DICTIONARY } from '../../src/pieces/TetrominoFactory';

describe('Piece Class', () => {
  const T_SHAPE = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ];

  const I_SHAPE = I_PIECE.shape;

  describe('Constructor', () => {
    test('should initialize with correct type and shape', () => {
      const piece = new Piece(TETROMINO_DICTIONARY[PieceType.T]);

      expect(piece).toBeDefined();
      expect(piece.type).toBe(PieceType.T);
      expect(piece.shape).toEqual(T_SHAPE);
    });

    test('should initialize with I piece correctly', () => {
      const piece = new Piece(TETROMINO_DICTIONARY[PieceType.I]);

      expect(piece.type).toBe(PieceType.I);
      expect(piece.shape).toEqual(I_SHAPE);
    });

    test('should throw error for invalid piece type request', () => {
      // Since we are now passing an object, we can't easily test 'invalid piece type'
      // in the same way if the type checking works.
      // Previously it might have been looking up by enum.
      // If the intention is to test that the Piece class handles bad data:
      expect(() => {
        // @ts-ignore
        new Piece({ type: 'INVALID', id: 99, shape: [] });
      }).toThrow();
    });
    // Or perhaps the previous test was checking if constructor threw when passed an enum not in dictionary?
    // The new constructor expects an IPiece, so it assumes the caller gives a valid piece definition.
    // However, inside constructor: this.shape = this.getInitialShape(piece.type);
    // And getInitialShape does: const piece = TETROMINO_DICTIONARY[type]; if (!piece) throw...
    // So we can pass a dummy object with an invalid type.
    test('should throw error for invalid piece type', () => {
      expect(() => {
        // @ts-ignore
        new Piece({ type: 'INVALID', id: 99, shape: [] });
      }).toThrow();
    });
  });

  describe('getNextRotation', () => {
    test('should rotate T piece clockwise', () => {
      const piece = new Piece(TETROMINO_DICTIONARY[PieceType.T]);
      const expectedRotation = [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ];
      piece.getNextRotation();
      expect(piece.shape).toEqual(expectedRotation);
    });

    test('should rotate I piece correctly', () => {
      const piece = new Piece(TETROMINO_DICTIONARY[PieceType.I]);
      piece.getNextRotation();

      const expectedHorizontal = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      expect(piece.shape).toEqual(expectedHorizontal);

      piece.getNextRotation();

      const expectedVertical = I_PIECE.shape;

      expect(piece.shape).toEqual(expectedVertical);
    });

    test('should not rotate O piece', () => {
      const oShape = [
        [1, 1],
        [1, 1],
      ];
      const piece = new Piece(TETROMINO_DICTIONARY[PieceType.O]);

      piece.getNextRotation();

      expect(piece.shape).toEqual(oShape);
    });
  });
});
