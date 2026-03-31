import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import type { GameAction, GameSettings } from '../../../shared/types/game.js';
import type {
  MainToWorkerMessage,
  MainToWorkerRequest,
  WorkerToMainMessage,
  StartAssignment,
  WorkerPlayer,
} from '../workers/types.js';
import { Logger } from '../utils/helpers.js';

type PendingRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  roomId: string;
};

export class RoomWorkerManager {
  private static instance: RoomWorkerManager;
  private static readonly REQUEST_TIMEOUT_MS = 1000;
  private readonly workers = new Map<string, Worker>();
  private readonly pending = new Map<string, PendingRequest>();
  private io?: Server;

  private constructor() {}

  public static getInstance(): RoomWorkerManager {
    if (!RoomWorkerManager.instance) {
      RoomWorkerManager.instance = new RoomWorkerManager();
    }
    return RoomWorkerManager.instance;
  }

  public bindIo(io: Server): void {
    this.io = io;
  }

  public async initRoom(
    roomId: string,
    players: WorkerPlayer[],
    settings: GameSettings,
    assignments: StartAssignment[],
  ): Promise<void> {
    await this.sendRequest(roomId, {
      type: 'INIT_ROOM',
      roomId,
      players,
      settings,
      assignments,
    });
  }

  public async forwardPlayerInput(roomId: string, playerId: string, input: GameAction): Promise<void> {
    await this.sendRequest(roomId, {
      type: 'PLAYER_INPUT',
      roomId,
      playerId,
      input,
    });
  }

  public async stopRoom(roomId: string): Promise<void> {
    const worker = this.workers.get(roomId);
    if (!worker) return;

    try {
      await this.sendRequest(roomId, {
        type: 'STOP_ROOM',
        roomId,
      });
    } catch (error) {
      Logger.warn(`STOP_ROOM request failed for room ${roomId}:`, error);
    }

    await worker.terminate();
    this.workers.delete(roomId);
  }

  private async sendRequest(roomId: string, message: MainToWorkerRequest): Promise<void> {
    const requestId = randomUUID();
    const payload = { ...message, requestId } as MainToWorkerMessage;
    const worker = this.ensureWorker(roomId);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Worker timeout for ${message.type} in room ${roomId}`));
      }, RoomWorkerManager.REQUEST_TIMEOUT_MS);

      this.pending.set(requestId, {resolve, reject, timeout, roomId});
      worker.postMessage(payload);
    });
  }

  private ensureWorker(roomId: string): Worker {
    const existing = this.workers.get(roomId);
    if (existing) return existing;

    const worker = new Worker(new URL('../workers/room.worker.js', import.meta.url));

    worker.on('message', (msg: WorkerToMainMessage) => this.onWorkerMessage(msg));
    worker.on('error', (error) => {
      Logger.error(`Worker error for room ${roomId}`, error);
      this.rejectPendingForRoom(roomId, `Worker runtime error in room ${roomId}`);
    });
    worker.on('exit', (code) => {
      Logger.warn(`Worker exit for room ${roomId}, code=${code}`);
      this.workers.delete(roomId);
      this.rejectPendingForRoom(roomId, `Worker exited for room ${roomId} with code ${code}`);
    });

    this.workers.set(roomId, worker);
    return worker;
  }

  private onWorkerMessage(msg: WorkerToMainMessage): void {
    if ('requestId' in msg) {
      const pending = this.pending.get(msg.requestId);
      if (!pending) return;

      clearTimeout(pending.timeout);
      this.pending.delete(msg.requestId);
      if (msg.type === 'ERROR') pending.reject(new Error(msg.reason));
      else pending.resolve();
      return;
    }

    if (!this.io) return;

    if (msg.type === 'GAME_STATE_UPDATE') {
      this.io.to(msg.roomId).emit('GAME_STATE_UPDATE', msg.payload);
      return;
    }

    if (msg.type === 'GAME_ANIMATION') {
      this.io.to(msg.playerId).emit('GAME_ANIMATION', {
        type: msg.animationType,
        data: msg.data,
      });
      return;
    }

    if (msg.type === 'GAME_ENDED') {
      this.io.to(msg.roomId).emit('GAME_ENDED', { looserId: msg.loserId });
    }
  }

  private rejectPendingForRoom(roomId: string, reason: string): void {
    for (const [requestId, pending] of this.pending.entries()) {
      if (pending.roomId !== roomId) continue;
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
      this.pending.delete(requestId);
    }
  }
}
