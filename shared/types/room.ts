import { GameSettings } from './game';

export type RoomState = 'waiting' | 'playing' | 'ended';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
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
  isSpectator: boolean;
}

export interface PlayerLeftEvent {
  roomId: string;
  playerId: string;
}

export interface RoomStateUpdateEvent {
  room: RoomInfo;
}

export interface SpectatorJoinedEvent {
  roomId: string;
  spectator: RoomPlayer;
}

export interface RoomErrorEvent {
  roomId: string;
  error: string;
  code: 'ROOM_FULL' | 'ROOM_NOT_FOUND' | 'PLAYER_EXISTS' | 'GAME_IN_PROGRESS' | 'NOT_HOST';
}

// Room configuration
export const ROOM_CONFIG = {
  MAX_PLAYERS: 2,
  CLEANUP_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  MAX_SPECTATORS: 10,
} as const;