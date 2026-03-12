import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import { printBoard, toStringFormat, Logger, LogLevel } from '../../src/utils/helpers';

describe('helpers', () => {
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    Logger.setLevel(LogLevel.DEBUG);
    (Logger as unknown as { streams: Map<LogLevel, unknown> }).streams.clear();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    delete process.env.LOG_TTY;
    delete process.env.LOG_TTY_DEBUG;
    delete process.env.LOG_TTY_INFO;
    delete process.env.LOG_TTY_WARN;
    delete process.env.LOG_TTY_ERROR;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('PrintBoard logs board rows with visual formatting', () => {
    const writeSpy = jest.spyOn(Logger, 'write').mockImplementation(() => undefined);

    printBoard([
      [0, 1],
      [1, 0],
    ]);

    expect(writeSpy).toHaveBeenNthCalledWith(1, LogLevel.DEBUG, '. 1');
    expect(writeSpy).toHaveBeenNthCalledWith(2, LogLevel.DEBUG, '1 .');
    writeSpy.mockRestore();
  });

  it('ToStringFormat returns pretty JSON for valid values', () => {
    const value = { answer: 42 };

    expect(toStringFormat(value)).toBe(JSON.stringify(value, null, 2));
  });

  it('ToStringFormat returns void for circular values and logs error', () => {
    const loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(toStringFormat(circular)).toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });

  it('respects log level filtering', () => {
    Logger.setLevel(LogLevel.ERROR);

    Logger.debug('debug');
    Logger.info('info');
    Logger.warn('warn');
    Logger.error('error');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('routes warn and error through dedicated console methods', () => {
    Logger.warn('warn-message');
    Logger.error('error-message');

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('stringifies circular values in debug logs without throwing', () => {
    const circular: Record<string, unknown> = { label: 'circular' };
    circular.self = circular;

    expect(() => Logger.debug('payload', circular)).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('write falls back to console when no stream exists', () => {
    Logger.write(LogLevel.INFO, 'fallback');
    expect(consoleLogSpy).toHaveBeenCalledWith('fallback');
  });

  it('dump handles value-only and labeled modes', () => {
    Logger.dump({ ok: true });
    Logger.dump('payload', { ok: true });

    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
  });

  it('creates and uses configured tty stream', () => {
    const write = jest.fn();
    const on = jest.fn();
    const stream = { write, on };

    process.env.LOG_TTY_INFO = '/tmp/fake-tty-info';
    jest.spyOn(fs, 'createWriteStream').mockReturnValue(stream as any);

    Logger.info('to-stream');

    expect(write).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('falls back to global LOG_TTY when level-specific variable is missing', () => {
    const write = jest.fn();
    const on = jest.fn();
    const stream = { write, on };

    process.env.LOG_TTY = '/tmp/fake-tty-global';
    jest.spyOn(fs, 'createWriteStream').mockReturnValue(stream as any);

    Logger.debug('global-stream');

    expect(write).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('handles stream open failures without crashing', () => {
    process.env.LOG_TTY_ERROR = '/tmp/fake-tty-error';
    jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
      throw new Error('open failed');
    });

    Logger.error('fallback-error');

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('removes stream on write errors and logs failure', () => {
    const handlers: Record<string, (err: Error) => void> = {};
    const write = jest.fn();
    const on = jest.fn((event: string, cb: (err: Error) => void) => {
      handlers[event] = cb;
    });

    process.env.LOG_TTY_WARN = '/tmp/fake-tty-warn';
    jest.spyOn(fs, 'createWriteStream').mockReturnValue({ write, on } as any);

    Logger.warn('first');
    handlers.error?.(new Error('stream failed'));
    Logger.warn('second');

    expect(write).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
