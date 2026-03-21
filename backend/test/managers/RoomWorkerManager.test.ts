import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RoomWorkerManager } from '../../src/managers/RoomWorkerManager';
import { Logger } from '../../src/utils/helpers';

function makeWorker() {
  return {
    postMessage: jest.fn(),
    terminate: jest.fn(async () => 0),
    on: jest.fn(),
  };
}

describe('RoomWorkerManager', () => {
  beforeEach(() => {
    (RoomWorkerManager as unknown as { instance?: RoomWorkerManager }).instance = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the same singleton instance', () => {
    const first = RoomWorkerManager.getInstance();
    const second = RoomWorkerManager.getInstance();

    expect(first).toBe(second);
  });

  it('resolves initRoom when worker replies with ACK', async () => {
    const manager = RoomWorkerManager.getInstance() as any;
    const worker = makeWorker();
    manager.workers.set('room-ack', worker);

    const promise = manager.initRoom('room-ack', [], {
      gameMode: 'classic',
      gravity: 1,
      ghostPiece: true,
      boardWidth: 10,
      boardHeight: 20,
      nextPieceCount: 1,
    }, []);

    await Promise.resolve();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    const payload = worker.postMessage.mock.calls[0][0] as { type: string; requestId: string };
    expect(payload.type).toBe('INIT_ROOM');
    manager.onWorkerMessage({ type: 'ACK', requestId: payload.requestId, roomId: 'room-ack' });

    await expect(promise).resolves.toBeUndefined();
    expect(manager.pending.size).toBe(0);
  });

  it('rejects initRoom when worker replies with ERROR', async () => {
    const manager = RoomWorkerManager.getInstance() as any;
    const worker = makeWorker();
    manager.workers.set('room-error', worker);

    const promise = manager.initRoom('room-error', [], {
      gameMode: 'classic',
      gravity: 1,
      ghostPiece: true,
      boardWidth: 10,
      boardHeight: 20,
      nextPieceCount: 1,
    }, []);

    await Promise.resolve();
    const payload = worker.postMessage.mock.calls[0][0] as { requestId: string };
    manager.onWorkerMessage({
      type: 'ERROR',
      requestId: payload.requestId,
      roomId: 'room-error',
      reason: 'boom',
    });

    await expect(promise).rejects.toThrow('boom');
    expect(manager.pending.size).toBe(0);
  });

  it('rejects forwardPlayerInput on timeout', async () => {
    jest.useFakeTimers();
    const manager = RoomWorkerManager.getInstance() as any;
    const worker = makeWorker();
    manager.workers.set('room-timeout', worker);

    const promise = manager.forwardPlayerInput('room-timeout', 'player-1', 1 as never);
    await Promise.resolve();

    jest.advanceTimersByTime(1001);
    await expect(promise).rejects.toThrow('Worker timeout');
  });

  it('forwards worker events to socket.io rooms and players when io is bound', () => {
    const manager = RoomWorkerManager.getInstance() as any;
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));

    manager.bindIo({ to } as never);

    manager.onWorkerMessage({
      type: 'GAME_STATE_UPDATE',
      roomId: 'room-evt',
      payload: { gameId: 'g1' },
    });
    expect(to).toHaveBeenCalledWith('room-evt');
    expect(emit).toHaveBeenCalledWith('GAME_STATE_UPDATE', { gameId: 'g1' });

    manager.onWorkerMessage({
      type: 'GAME_ANIMATION',
      roomId: 'room-evt',
      playerId: 'player-evt',
      animationType: 'HARD_DROP',
      data: { trails: [], timestamp: 1 },
    });
    expect(to).toHaveBeenCalledWith('player-evt');
    expect(emit).toHaveBeenCalledWith('GAME_ANIMATION', {
      type: 'HARD_DROP',
      data: { trails: [], timestamp: 1 },
    });

    manager.onWorkerMessage({
      type: 'GAME_ENDED',
      roomId: 'room-evt',
      loserId: 'player-loser',
    });
    expect(to).toHaveBeenCalledWith('room-evt');
    expect(emit).toHaveBeenCalledWith('GAME_ENDED', { looserId: 'player-loser' });
  });

  it('ignores non-request worker events when io is not bound', () => {
    const manager = RoomWorkerManager.getInstance() as any;

    expect(() =>
      manager.onWorkerMessage({
        type: 'GAME_STATE_UPDATE',
        roomId: 'room-no-io',
        payload: { gameId: 'g-no-io' },
      }),
    ).not.toThrow();
  });

  it('ignores ACK for unknown request ids', () => {
    const manager = RoomWorkerManager.getInstance() as any;

    expect(() =>
      manager.onWorkerMessage({
        type: 'ACK',
        requestId: 'missing-request-id',
        roomId: 'room-missing',
      }),
    ).not.toThrow();
  });

  it('stopRoom sends STOP_ROOM, terminates worker, and removes it from map', async () => {
    const manager = RoomWorkerManager.getInstance() as any;
    const worker = makeWorker();
    manager.workers.set('room-stop', worker);

    const stopPromise = manager.stopRoom('room-stop');
    await Promise.resolve();

    const payload = worker.postMessage.mock.calls[0][0] as { type: string; requestId: string };
    expect(payload.type).toBe('STOP_ROOM');
    manager.onWorkerMessage({ type: 'ACK', requestId: payload.requestId, roomId: 'room-stop' });

    await stopPromise;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(manager.workers.has('room-stop')).toBe(false);
  });

  it('stopRoom still terminates worker when STOP_ROOM request times out', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    const manager = RoomWorkerManager.getInstance() as any;
    const worker = makeWorker();
    manager.workers.set('room-stop-timeout', worker);

    const stopPromise = manager.stopRoom('room-stop-timeout');
    await Promise.resolve();
    jest.advanceTimersByTime(1001);

    await stopPromise;
    expect(warnSpy).toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(manager.workers.has('room-stop-timeout')).toBe(false);
  });

  it('stopRoom is a no-op when no worker exists', async () => {
    const manager = RoomWorkerManager.getInstance() as any;

    await expect(manager.stopRoom('room-missing')).resolves.toBeUndefined();
  });

  it('rejectPendingForRoom rejects only matching room requests', () => {
    const manager = RoomWorkerManager.getInstance() as any;
    const rejectA = jest.fn();
    const rejectB = jest.fn();

    manager.pending.set('req-a', {
      resolve: jest.fn(),
      reject: rejectA,
      timeout: setTimeout(() => undefined, 10),
      roomId: 'room-a',
    });
    manager.pending.set('req-b', {
      resolve: jest.fn(),
      reject: rejectB,
      timeout: setTimeout(() => undefined, 10),
      roomId: 'room-b',
    });

    manager.rejectPendingForRoom('room-a', 'room-a failed');

    expect(rejectA).toHaveBeenCalledWith(expect.any(Error));
    expect(rejectB).not.toHaveBeenCalled();
    expect(manager.pending.has('req-a')).toBe(false);
    expect(manager.pending.has('req-b')).toBe(true);

    clearTimeout(manager.pending.get('req-b').timeout);
  });
});
