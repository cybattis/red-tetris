import {
  GameAction,
  GameMode,
  type GameSettings,
  type HistoryPayload,
} from "./game";
import type { IPlayer } from "./player";
import type { RoomInfo } from "./room";

export type PlayerInputEvent = {
  playerId: string;
  input: GameAction;
};

// Socket event interfaces
export interface JoinRoomEvent {
  roomId: string;
  playerName: string;
}

export interface LeaveRoomEvent {
  roomId: string;
  playerName: string;
}

export interface StartGameEvent {
  roomId: string;
  gameSettings?: Partial<GameSettings>;
}

export interface HostTransferEvent {
  newHostId: string;
}

export interface PlayerJoinedEvent {
  player: IPlayer;
}

export interface PlayerLeftEvent {
  playerId: string;
}

export interface RoomLeaveEvent {
  roomInfo?: RoomInfo;
  roomId?: string;
  playerLeft?: PlayerLeftEvent;
  hostTransfer?: HostTransferEvent;
  roomDeleted?: boolean;
}

export interface SpectatorJoinedEvent {
  roomId: string;
  spectator: IPlayer;
}

export interface GameModeUpdateEvent {
  roomId: string;
  gameMode: GameMode;
}

export interface GameSettingsUpdateEvent {
  roomId: string;
  settings: GameSettings;
}

export interface GameCreationData {
  roomId: string;
  hostPlayerId: string;
  gameMode: GameMode;
  settings: GameSettings;
  players: IPlayer[];
  maxPlayers: number;
  timestamp: number;
}

export type GameOverEvent = {
  looserId: string;
};

export interface HistoryResponseEvent {
  history: HistoryPayload;
}

