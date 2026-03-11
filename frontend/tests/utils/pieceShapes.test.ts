import { 
  PIECE_SHAPES,
  getPieceShape,
  getPieceDimensions
} from '../../src/utils/pieceShapes';
import { PieceType } from '../../src/utils/colors';

describe('PieceShapes utility', () => {
  describe('PIECE_SHAPES', () => {
    it('should have shapes for all piece types', () => {
      expect(PIECE_SHAPES[PieceType.I]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.O]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.T]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.S]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.Z]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.J]).toBeDefined();
      expect(PIECE_SHAPES[PieceType.L]).toBeDefined();
    });

    it('should have valid shape arrays', () => {
      Object.values(PIECE_SHAPES).forEach(shape => {
        expect(Array.isArray(shape)).toBe(true);
        expect(shape.length).toBeGreaterThan(0);
        
        shape.forEach(row => {
          expect(Array.isArray(row)).toBe(true);
          expect(row.length).toBeGreaterThan(0);
          
          row.forEach(cell => {
            expect(typeof cell).toBe('number');
            expect([0, 1]).toContain(cell);
          });
        });
      });
    });

    it('should have correct I piece shape', () => {
      expect(PIECE_SHAPES[PieceType.I]).toEqual([
        [1, 1, 1, 1]
      ]);
    });

    it('should have correct O piece shape', () => {
      expect(PIECE_SHAPES[PieceType.O]).toEqual([
        [1, 1],
        [1, 1]
      ]);
    });

    it('should have correct T piece shape', () => {
      expect(PIECE_SHAPES[PieceType.T]).toEqual([
        [0, 1, 0],
        [1, 1, 1]
      ]);
    });
  });

  describe('getPieceShape', () => {
    it('should return correct shape for valid piece types', () => {
      expect(getPieceShape(PieceType.I)).toEqual(PIECE_SHAPES[PieceType.I]);
      expect(getPieceShape(PieceType.O)).toEqual(PIECE_SHAPES[PieceType.O]);
      expect(getPieceShape(PieceType.T)).toEqual(PIECE_SHAPES[PieceType.T]);
    });

    it('should return fallback shape for invalid piece types', () => {
      expect(getPieceShape(999)).toEqual([[1]]);
      expect(getPieceShape(-1)).toEqual([[1]]);
    });

    it('should handle undefined piece type', () => {
      expect(getPieceShape(undefined as any)).toEqual([[1]]);
    });
  });

  describe('getPieceDimensions', () => {
    it('should return correct dimensions for I piece', () => {
      const dimensions = getPieceDimensions(PieceType.I);
      expect(dimensions.width).toBe(4);
      expect(dimensions.height).toBe(1);
    });

    it('should return correct dimensions for O piece', () => {
      const dimensions = getPieceDimensions(PieceType.O);
      expect(dimensions.width).toBe(2);
      expect(dimensions.height).toBe(2);
    });

    it('should return correct dimensions for T piece', () => {
      const dimensions = getPieceDimensions(PieceType.T);
      expect(dimensions.width).toBe(3);
      expect(dimensions.height).toBe(2);
    });

    it('should handle invalid piece types', () => {
      const dimensions = getPieceDimensions(999);
      expect(dimensions.width).toBe(1);
      expect(dimensions.height).toBe(1);
    });

    it('should handle undefined/null piece types', () => {
      const dimensions = getPieceDimensions(undefined as any);
      expect(dimensions.width).toBe(1);
      expect(dimensions.height).toBe(1);
    });
  });
});
