import { describe, expect, test } from '@jest/globals';
import { Piece, PieceName } from '../../src/classes/Piece';

describe('Piece Class', () => {
  const T_SHAPE = [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ];

  const I_SHAPE = [
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 0, 0]
  ];

  describe('Constructor', () => {
    test('should initialize with correct name and shape', () => {
      const piece = new Piece(PieceName.T, T_SHAPE);

      expect(piece).toBeDefined();
      expect(piece.getName()).toBe(PieceName.T);
      expect(piece.getShape()).toEqual(T_SHAPE);
    });

    test('should initialize I piece correctly', () => {
      const piece = new Piece(PieceName.I, I_SHAPE);
      expect(piece.getName()).toBe(PieceName.I);
      expect(piece.getShape()).toEqual(I_SHAPE);
    });
  });

  describe('getNextRotation', () => {
    test('should rotate right (clockwise)', () => {
      const piece = new Piece(PieceName.T, T_SHAPE);
      /*
        Original T:
        [0, 1, 0]
        [1, 1, 1]
        [0, 0, 0]

        Right Rotation:
        [0, 1, 0]
        [0, 1, 1]
        [0, 1, 0]
      */
      const expectedRight = [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0]
      ];

      piece.getNextRotation('right');
      expect(piece.getShape()).toEqual(expectedRight);
    });

    test('should rotate left (counter-clockwise)', () => {
      const piece = new Piece(PieceName.T, T_SHAPE);
      /*
        Original T:
        [0, 1, 0]
        [1, 1, 1]
        [0, 0, 0]

        Left Rotation:
        [0, 1, 0]
        [1, 1, 0]
        [0, 1, 0]
      */
      const expectedLeft = [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0]
      ];

      piece.getNextRotation('left');
      expect(piece.getShape()).toEqual(expectedLeft);
    });

    test('should rotate left (counter-clockwise)', () => {
      const piece = new Piece(PieceName.T, T_SHAPE);
      /*
        Original T:
        [0, 1, 0]
        [1, 1, 1]
        [0, 0, 0]

        Left Rotation:
        [0, 0, 0]
        [1, 1, 1]
        [0, 1, 0]
      */
      const expectedLeft = [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]
      ];

      piece.getNextRotation('left');
      piece.getNextRotation('left');
      expect(piece.getShape()).toEqual(expectedLeft);
    });

    test('should return 4x4 rotation correctly for I piece', () => {
      const piece = new Piece(PieceName.I, I_SHAPE);
      /*
        Original I:
        [0, 1, 0, 0]
        [0, 1, 0, 0]
        [0, 1, 0, 0]
        [0, 1, 0, 0]

        Right Rotation (Flat line):
        [0, 0, 0, 0]
        [1, 1, 1, 1]
        [0, 0, 0, 0]
        [0, 0, 0, 0]
      */
      const expectedRight = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ];

      piece.getNextRotation('right');
      expect(piece.getShape()).toEqual(expectedRight);
    });

    test('should return 4x4 rotation correctly for I piece', () => {
      const piece = new Piece(PieceName.I, I_SHAPE);
      /*
        Original I:
        [0, 1, 0, 0]
        [0, 1, 0, 0]
        [0, 1, 0, 0]
        [0, 1, 0, 0]

        Two Right Rotations (Back to vertical):
        [0, 0, 1, 0]
        [0, 0, 1, 0]
        [0, 0, 1, 0]
        [0, 0, 1, 0]
      */
      const expectedRight = [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0]
      ];

      piece.getNextRotation('left');
      piece.getNextRotation('left');
      expect(piece.getShape()).toEqual(expectedRight);
    });

    test('should preserve original shape when calling getNextRotation', () => {
      const piece = new Piece(PieceName.T, T_SHAPE);
      const originalShapeCopy = JSON.parse(JSON.stringify(T_SHAPE));

      piece.getNextRotation('right');
      piece.getNextRotation('left');
      expect(piece.getShape()).toEqual(originalShapeCopy);
    });
  });
});

