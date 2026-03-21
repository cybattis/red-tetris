import type {
  AnimationType,
  GameAction,
  GameAnimationData,
  GameSettings,
  GameStateUpdate,
} from '@shared/types/game';
import type { IPlayer } from '@shared/types/player';

export type WorkerPlayer = IPlayer & {
  socketId: string;
};

export type StartAssignment = {
  playerId: string;
  gameId: string;
};

export type MainToWorkerMessage =
  | {
      type: 'INIT_ROOM';
      requestId: string;
      roomId: string;
      players: WorkerPlayer[];
      settings: GameSettings;
      assignments: StartAssignment[];
    }
  | {
      type: 'PLAYER_INPUT';
      requestId: string;
      roomId: string;
      playerId: string;
      input: GameAction;
    }
  | {
      type: 'REMOVE_PLAYER';
      requestId: string;
      roomId: string;
      playerId: string;
    }
  | {
      type: 'STOP_ROOM';
      requestId: string;
      roomId: string;
    };

export type MainToWorkerRequest =
  | {
      type: 'INIT_ROOM';
      roomId: string;
      players: WorkerPlayer[];
      settings: GameSettings;
      assignments: StartAssignment[];
    }
  | {
      type: 'PLAYER_INPUT';
      roomId: string;
      playerId: string;
      input: GameAction;
    }
  | {
      type: 'REMOVE_PLAYER';
      roomId: string;
      playerId: string;
    }
  | {
      type: 'STOP_ROOM';
      roomId: string;
    };

export type WorkerToMainMessage =
  | {
      type: 'ACK';
      requestId: string;
      roomId: string;
    }
  | {
      type: 'ERROR';
      requestId: string;
      roomId: string;
      reason: string;
    }
  | {
      type: 'GAME_STATE_UPDATE';
      roomId: string;
      payload: GameStateUpdate;
    }
  | {
      type: 'GAME_ANIMATION';
      roomId: string;
      playerId: string;
      animationType: AnimationType;
      data: GameAnimationData;
    }
  | {
      type: 'GAME_ENDED';
      roomId: string;
      loserId: string;
    };

