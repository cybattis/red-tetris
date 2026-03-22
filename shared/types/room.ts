import type { IPlayer } from "./player.js";

export type RoomState = "waiting" | "playing" | "ended";

export interface RoomInfo {
  id: string;
  state: RoomState;
  players: IPlayer[];
  spectators: IPlayer[];
  hostId: string;
  maxPlayers: number;
  createdAt: Date;
  gameStartedAt?: Date;
}

export interface RoomErrorEvent {
  roomId: string;
  reason: string;
  code:
    | "ROOM_FULL"
    | "ROOM_NOT_FOUND"
    | "PLAYER_EXISTS"
    | "GAME_IN_PROGRESS"
    | "NOT_HOST"
    | "NOT_READY"
    | "UNKNOWN_ERROR"
    | "ALREADY_PLAYING";
}

// Room configuration
export const ROOM_CONFIG = {
  MAX_PLAYERS: 2,
  MIN_PLAYERS: 1,
  CLEANUP_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  MAX_SPECTATORS: 10,
  COUNTDOWN_DURATION: 3, // seconds
} as const;

export type RoomResults<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: RoomErrorEvent;
    };
