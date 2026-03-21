import { parentPort } from 'node:worker_threads';
import { Player } from '../classes/Player.js';
import { Game } from '../classes/Game.js';
import { Logger } from '../utils/helpers.js';
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  WorkerPlayer,
  StartAssignment,
} from './types.js';
import type { GameSettings } from '@shared/types/game';

if (!parentPort) {
  throw new Error('room.worker.ts must run in worker_threads context');
}

type Runtime = {
  roomId: string;
  players: Map<string, Player>;
  games: Map<string, Game>;
  settings: GameSettings;
  assignments: Map<string, string>;
};

const runtimes = new Map<string, Runtime>();

const post = (message: WorkerToMainMessage): void => {
  parentPort!.postMessage(message);
};

const makeRuntime = (
  roomId: string,
  players: WorkerPlayer[],
  settings: GameSettings,
  assignments: StartAssignment[],
): Runtime => {
  const mappedPlayers = new Map<string, Player>();
  for (const p of players) {
    const player = new Player(p.socketId, p.name);
    player.isHost = p.isHost;
    player.isSpectator = p.isSpectator;
    mappedPlayers.set(player.id, player);
  }

  return {
    roomId,
    players: mappedPlayers,
    games: new Map<string, Game>(),
    settings,
    assignments: new Map(assignments.map((a) => [a.playerId, a.gameId])),
  };
};

const startGames = (runtime: Runtime): void => {
  const seed = Date.now() + Math.random();

  for (const [playerId, player] of runtime.players.entries()) {
    if (player.isSpectator) continue;
    const forcedGameId = runtime.assignments.get(playerId);
    if (!forcedGameId) continue;

    const game = new Game(
      player,
      seed,
      runtime.settings,
      { id: runtime.roomId, playerCount: runtime.players.size },
      { forcedGameId },
    );

    game.on('stateUpdate', (payload) => {
      post({ type: 'GAME_STATE_UPDATE', roomId: runtime.roomId, payload });
    });

    game.on('animation', (evt) => {
      post({
        type: 'GAME_ANIMATION',
        roomId: runtime.roomId,
        playerId: evt.playerId,
        animationType: evt.animationType,
        data: evt.data,
      });
    });

    game.on('penaltyLines', ({ fromPlayerId, count }) => {
      for (const [targetId, targetGame] of runtime.games.entries()) {
        if (targetId === fromPlayerId || !targetGame.isAlive) continue;
        targetGame.addPenaltyLines(count);
      }
    });

    game.once('gameOver', ({ playerId: loserId }) => {
      post({ type: 'GAME_ENDED', roomId: runtime.roomId, loserId });
      for (const g of runtime.games.values()) g.stopGame();
      runtime.games.clear();
    });

    runtime.games.set(playerId, game);
    game.start();
  }
};

parentPort.on('message', (msg: MainToWorkerMessage) => {
  try {
    switch (msg.type) {
      case 'INIT_ROOM': {
        const runtime = makeRuntime(msg.roomId, msg.players, msg.settings, msg.assignments);
        runtimes.set(msg.roomId, runtime);
        startGames(runtime);
        post({ type: 'ACK', requestId: msg.requestId, roomId: msg.roomId });
        return;
      }
      case 'PLAYER_INPUT': {
        const runtime = runtimes.get(msg.roomId);
        const game = runtime?.games.get(msg.playerId);
        if (!runtime || !game) {
          post({
            type: 'ERROR',
            requestId: msg.requestId,
            roomId: msg.roomId,
            reason: 'Game not found',
          });
          return;
        }
        game.setPlayerInput(msg.input);
        post({ type: 'ACK', requestId: msg.requestId, roomId: msg.roomId });
        return;
      }
      case 'REMOVE_PLAYER': {
        const runtime = runtimes.get(msg.roomId);
        if (runtime) {
          const game = runtime.games.get(msg.playerId);
          if (game) {
            game.stopGame();
            runtime.games.delete(msg.playerId);
          }
          runtime.players.delete(msg.playerId);
        }
        post({ type: 'ACK', requestId: msg.requestId, roomId: msg.roomId });
        return;
      }
      case 'STOP_ROOM': {
        const runtime = runtimes.get(msg.roomId);
        if (runtime) {
          for (const g of runtime.games.values()) g.stopGame();
          runtime.games.clear();
          runtimes.delete(msg.roomId);
        }
        post({ type: 'ACK', requestId: msg.requestId, roomId: msg.roomId });
        return;
      }
    }
  } catch (error) {
    Logger.error('room.worker unhandled error:', error);
    post({
      type: 'ERROR',
      requestId: msg.requestId,
      roomId: msg.roomId,
      reason: error instanceof Error ? error.message : 'Unknown worker error',
    });
  }
});

