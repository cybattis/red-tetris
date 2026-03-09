import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { printBoard, toStringFormat, Logger, LogLevel } from '../../src/utils/helpers';

describe('helpers', () => {
  let logSpy: ReturnType<typeof jest.spyOn>;
  let errorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger, 'write').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('PrintBoard logs board rows with visual formatting', () => {
    printBoard([
      [0, 1],
      [1, 0],
    ]);

    expect(logSpy).toHaveBeenNthCalledWith(1, LogLevel.DEBUG, '. 1');
    expect(logSpy).toHaveBeenNthCalledWith(2, LogLevel.DEBUG, '1 .');
  });

  it('ToStringFormat returns pretty JSON for valid values', () => {
    const value = { answer: 42 };

    expect(toStringFormat(value)).toBe(JSON.stringify(value, null, 2));
  });

  it('ToStringFormat returns void for circular values and logs error', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(toStringFormat(circular)).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
