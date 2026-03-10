import { GameSettings } from './game';

export type RoomState = 'waiting' | 'playing' | 'ended';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isSpectator: boolean;
}

export interface RoomInfo {
  id: string;
  state: RoomState;
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  hostId: string;
  maxPlayers: number;
  createdAt: Date;
  gameStartedAt?: Date;
}

// Socket event interfaces
export interface JoinRoomEvent {
  roomId: string;
  playerName: string;
}

export interface LeaveRoomEvent {
  roomId: string;
}

export interface StartGameEvent {
  roomId: string;
  gameSettings?: Partial<GameSettings>;
}

export interface RestartGameEvent {
  roomId: string;
}

export interface HostTransferEvent {
  roomId: string;
  newHostId: string;
}

export interface PlayerJoinedEvent {
  roomId: string;
  player: RoomPlayer;
}

export interface PlayerLeftEvent {
  roomId: string;
  playerId: string;
}

export interface RoomStateUpdateEvent {
  room: RoomInfo;
}

export interface RoomLeaveEvent {
  roomUpdated?: RoomInfo;
  playerLeft?: PlayerLeftEvent;
  hostTransfer?: HostTransferEvent;
  roomDeleted?: boolean;
}

export interface SpectatorJoinedEvent {
  roomId: string;
  spectator: RoomPlayer;
}

export interface RoomErrorEvent {
  roomId: string;
  reason: string;
  code: 'ROOM_FULL' | 'ROOM_NOT_FOUND' | 'PLAYER_EXISTS' | 'GAME_IN_PROGRESS' |
  'NOT_HOST' | 'NOT_READY' | 'UNKNOWN_ERROR';
}

// Room configuration
export const ROOM_CONFIG = {
  MAX_PLAYERS: 2,
  CLEANUP_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  MAX_SPECTATORS: 10,
} as const;

export type RoomResults<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: RoomErrorEvent;
};
