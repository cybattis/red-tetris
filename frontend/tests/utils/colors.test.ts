import { 
  PieceType, 
  PIECE_COLORS, 
  PIECE_BORDER_COLORS,
  getCellColor, 
  getCellBorderColor,
  CELL_SIZE,
  CELL_GAP
} from '../../src/utils/colors';

describe('Colors utility', () => {
  describe('PieceType enum', () => {
    it('should have correct values for piece types', () => {
      expect(PieceType.EMPTY).toBe(0);
      expect(PieceType.I).toBe(1);
      expect(PieceType.O).toBe(2);
      expect(PieceType.T).toBe(3);
      expect(PieceType.S).toBe(4);
      expect(PieceType.Z).toBe(5);
      expect(PieceType.J).toBe(6);
      expect(PieceType.L).toBe(7);
      expect(PieceType.PENALTY).toBe(8);
    });
  });

  describe('PIECE_COLORS mapping', () => {
    it('should have colors for all piece types', () => {
      expect(PIECE_COLORS[PieceType.EMPTY]).toBe('transparent');
      expect(PIECE_COLORS[PieceType.I]).toBeDefined();
      expect(PIECE_COLORS[PieceType.O]).toBeDefined();
      expect(PIECE_COLORS[PieceType.T]).toBeDefined();
      expect(PIECE_COLORS[PieceType.S]).toBeDefined();
      expect(PIECE_COLORS[PieceType.Z]).toBeDefined();
      expect(PIECE_COLORS[PieceType.J]).toBeDefined();
      expect(PIECE_COLORS[PieceType.L]).toBeDefined();
      expect(PIECE_COLORS[PieceType.PENALTY]).toBeDefined();
    });

    it('should have valid color values', () => {
      Object.values(PIECE_COLORS).forEach(color => {
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PIECE_BORDER_COLORS mapping', () => {
    it('should have border colors for all piece types', () => {
      expect(PIECE_BORDER_COLORS[PieceType.EMPTY]).toBe('transparent');
      expect(PIECE_BORDER_COLORS[PieceType.I]).toBeDefined();
      expect(PIECE_BORDER_COLORS[PieceType.PENALTY]).toBeDefined();
    });
  });

  describe('getCellColor function', () => {
    it('should return correct colors for valid piece types', () => {
      expect(getCellColor(PieceType.EMPTY)).toBe('transparent');
      expect(getCellColor(PieceType.I)).toBe(PIECE_COLORS[PieceType.I]);
      expect(getCellColor(PieceType.O)).toBe(PIECE_COLORS[PieceType.O]);
    });

    it('should handle ghost pieces', () => {
      const ghostColor = getCellColor(PieceType.I, true);
      const normalColor = getCellColor(PieceType.I, false);
      expect(ghostColor).toBeDefined();
      expect(normalColor).toBeDefined();
    });

    it('should handle invalid piece types gracefully', () => {
      expect(getCellColor(999)).toBe(PIECE_COLORS[PieceType.EMPTY]);
      expect(getCellColor(-1)).toBe(PIECE_COLORS[PieceType.EMPTY]);
    });
  });

  describe('getCellBorderColor function', () => {
    it('should return correct border colors', () => {
      expect(getCellBorderColor(PieceType.EMPTY)).toBe('transparent');
      expect(getCellBorderColor(PieceType.I)).toBe(PIECE_BORDER_COLORS[PieceType.I]);
    });

    it('should handle invalid piece types', () => {
      expect(getCellBorderColor(999)).toBe(PIECE_BORDER_COLORS[PieceType.EMPTY]);
    });
  });

  describe('Constants', () => {
    it('should have valid cell size constants', () => {
      expect(CELL_SIZE).toBeGreaterThan(0);
      expect(CELL_GAP).toBeGreaterThanOrEqual(0);
      expect(typeof CELL_SIZE).toBe('number');
      expect(typeof CELL_GAP).toBe('number');
    });
  });
});
