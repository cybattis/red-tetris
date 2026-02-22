import fs, { WriteStream } from 'node:fs';
//
export function printBoard(board: number[][]): void {
  for (const row of board) {
    Logger.write(LogLevel.DEBUG, row.map((cell) => (cell === 0 ? '.' : cell.toString())).join(' '));
  }
}

export function toStringFormat(value: unknown): string | void {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    Logger.error('Unable to stringify value:', value, error);
  }
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const colors = {
  reset: '\x1b[0m',
  fg: {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  },
};

export class Logger {
  private static currentLevel: LogLevel = LogLevel.DEBUG;
  private static readonly streams: Map<LogLevel, WriteStream> = new Map();

  public static setLevel(level: LogLevel): void {
    Logger.currentLevel = level;
  }

  private static getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return colors.fg.gray;
      case LogLevel.INFO:
        return colors.fg.green;
      case LogLevel.WARN:
        return colors.fg.yellow;
      case LogLevel.ERROR:
        return colors.fg.red;
      default:
        return colors.reset;
    }
  }

  private static getTimestamp(): string {
    const now = new Date();
    const time = now.toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.mmm
    return `${colors.fg.gray}[${time}]${colors.reset}`;
  }

  private static formatLevel(level: LogLevel): string {
    const levelName = LogLevel[level];
    const color = Logger.getColor(level);
    const paddedName = levelName.padEnd(5, ' ');
    return `${color}[${paddedName}]${colors.reset}`;
  }

  private static getStream(level: LogLevel): WriteStream | null {
    if (Logger.streams.has(level)) {
      return Logger.streams.get(level)!;
    }

    let ttyPath: string | undefined;
    switch (level) {
      case LogLevel.DEBUG:
        ttyPath = process.env.LOG_TTY_DEBUG;
        break;
      case LogLevel.INFO:
        ttyPath = process.env.LOG_TTY_INFO;
        break;
      case LogLevel.WARN:
        ttyPath = process.env.LOG_TTY_WARN;
        break;
      case LogLevel.ERROR:
        ttyPath = process.env.LOG_TTY_ERROR;
        break;
    }

    // If global LOG_TTY is set and specific is missing, use global
    if (!ttyPath && process.env.LOG_TTY) {
      ttyPath = process.env.LOG_TTY;
    }

    if (ttyPath) {
      try {
        const stream = fs.createWriteStream(ttyPath, { flags: 'a' });
        stream.on('error', (err) => {
          console.error(`Error writing to TTY ${ttyPath} for level ${LogLevel[level]}:`, err);
          Logger.streams.delete(level);
        });
        Logger.streams.set(level, stream);
        return stream;
      } catch (error) {
        console.error(`Failed to open TTY ${ttyPath} for level ${LogLevel[level]}:`, error);
      }
    }

    return null;
  }

  private static print(level: LogLevel, ...args: unknown[]): void {
    if (level < Logger.currentLevel) return;

    const timestamp = Logger.getTimestamp();
    const levelTag = Logger.formatLevel(level);
    const padding = ' ';

    // If the first argument is a string, we print it normally.
    // If it's an object/array, we want to dump it.
    const validArgs = args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
    });

    const message = `${timestamp} ${levelTag}${padding} ${validArgs.join(' ')}\n`;
    const stream = Logger.getStream(level);

    if (stream) {
      stream.write(message);
    } else {
      console.log(`${timestamp} ${levelTag}${padding}`, ...validArgs);
    }
  }

  public static write(level: LogLevel, message: string): void {
    const stream = Logger.getStream(level);
    if (stream) {
      stream.write(message + '\n');
    } else {
      console.log(message);
    }
  }

  public static debug(...args: unknown[]): void {
    Logger.print(LogLevel.DEBUG, ...args);
  }

  public static info(...args: unknown[]): void {
    Logger.print(LogLevel.INFO, ...args);
  }

  public static warn(...args: unknown[]): void {
    Logger.print(LogLevel.WARN, ...args);
  }

  public static error(...args: unknown[]): void {
    Logger.print(LogLevel.ERROR, ...args);
  }

  // Convenience method specifically for dumping variables with label
  // Usage: Logger.dump('myVar', myVar) or Logger.dump(myVar)
  public static dump(arg1: unknown, arg2?: unknown): void {
    if (arg2 === undefined) {
      // Just dumping a value
      Logger.print(LogLevel.DEBUG, JSON.stringify(arg1, null, 2));
    } else {
      // Dumping label + value
      Logger.print(LogLevel.DEBUG, `${arg1}:`, JSON.stringify(arg2, null, 2));
    }
  }
}

// Backward compatibility or shortcut
export const Log = Logger.info.bind(Logger);
