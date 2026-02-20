//
export function PrintBoard(board: number[][]): void {
  for (const row of board) {
    console.log(row.map((cell) => (cell === 1 ? 'X' : '.')).join(' '));
  }
}

export function ToStringFormat(value: unknown): string | void {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error('Unable to stringify value:', value, error);
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
  private static currentLevel: LogLevel = LogLevel.INFO;

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

  private static print(level: LogLevel, ...args: unknown[]): void {
    if (level < Logger.currentLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const color = Logger.getColor(level);

    const levelTag = `[${levelName}]`;
    const paddedLevelTag = levelTag.padEnd(7, ' ');

    console.log(
      `${colors.fg.cyan}[${timestamp}]${colors.reset} ${color}${paddedLevelTag}${colors.reset}`,
      ...args,
    );
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

  // Convenience method for single variable dump
  public static dump(label: string, value: unknown): void;
  public static dump(value: unknown): void;
  public static dump(arg1: unknown, arg2?: unknown): void {
    if (arg2 === undefined) {
      Logger.print(LogLevel.DEBUG, ToStringFormat(arg1));
    } else {
      Logger.print(LogLevel.DEBUG, `${arg1}:`, ToStringFormat(arg2));
    }
  }
}

// Backward compatibility or shortcut
export const Log = Logger.info.bind(Logger);
