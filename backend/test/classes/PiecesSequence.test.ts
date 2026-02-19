import { describe, expect, it } from '@jest/globals';
import { PiecesSequence } from '../../src/classes/PiecesSequence';
import { PieceType } from '../../src/types/piece';

const allPieceTypes = Object.values(PieceType).filter(
  (value): value is PieceType => typeof value === 'string',
);

describe('PiecesSequence', () => {
  it('starts at index 0 and increments on getNextPiece()', () => {
    const sequence = new PiecesSequence(12345, 10);

    expect(sequence.currentIndex).toBe(0);
    const next = sequence.getNextPiece();
    expect(allPieceTypes).toContain(next);
    expect(sequence.currentIndex).toBe(1);
  });

  it('produces deterministic output for the same seed', () => {
    const a = new PiecesSequence(42, 14);
    const b = new PiecesSequence(42, 14);

    const drawsA = Array.from({ length: 50 }, () => a.getNextPiece());
    const drawsB = Array.from({ length: 50 }, () => b.getNextPiece());

    expect(drawsA).toEqual(drawsB);
  });

  it('emits each piece type exactly once per full bag', () => {
    const bagSize = allPieceTypes.length;
    const sequence = new PiecesSequence(7, bagSize * 2);

    const bag1 = Array.from({ length: bagSize }, () => sequence.getNextPiece());
    const bag2 = Array.from({ length: bagSize }, () => sequence.getNextPiece());

    expect(new Set(bag1)).toEqual(new Set(allPieceTypes));
    expect(new Set(bag2)).toEqual(new Set(allPieceTypes));
  });

  it('auto-grows buffer when remaining pieces are low', () => {
    const sequence = new PiecesSequence(99, 1);

    expect(() => {
      for (let i = 0; i < 500; i++) {
        sequence.getNextPiece();
      }
    }).not.toThrow();

    expect(sequence.currentIndex).toBe(500);
  });
});
