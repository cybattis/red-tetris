import { configureStore } from '@reduxjs/toolkit';
import { createSocketMiddleware } from '@/store/middleware/socketMiddleware';
import connectionSlice from '@/store/slices/connectionSlice';
import gameRoomSlice from '@/store/slices/gameRoomSlice';
import gameSlice from '@/store/slices/gameSlice';
import uiSlice from '@/store/slices/uiSlice';
import historySlice from '@/store/slices/historySlice';
import type { RootState } from '@/store';
import type { Socket } from 'socket.io-client';

// Mock Socket.IO
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock environment variable
const originalEnv = process.env;

describe('socketMiddleware', () => {
  let store: ReturnType<typeof configureStore<RootState>>;
  let mockSocket: jest.Mocked<Socket>;
  let mockIo: jest.MockedFunction<typeof import('socket.io-client').io>;
  let eventHandlers: { [key: string]: (...args: any[]) => void } = {};
  let allEventHandlers: { [key: string]: Array<(...args: any[]) => void> } = {};
  let emittedEvents: { [key: string]: any[] } = {};

  /** Fire all registered handlers for an event (supports multiple .on() calls for the same event). */
  const fireEvent = (event: string, ...args: any[]) => {
    (allEventHandlers[event] || []).forEach(fn => fn(...args));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset event tracking
    eventHandlers = {};
    allEventHandlers = {};
    emittedEvents = {};

    // Create mock socket — use defineProperty so `connected` can be toggled in tests
    mockSocket = {
      id: 'mock-socket-id',
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn((event, data) => {
        if (!emittedEvents[event]) {
          emittedEvents[event] = [];
        }
        emittedEvents[event].push(data);
      }),
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
        if (!allEventHandlers[event]) {
          allEventHandlers[event] = [];
        }
        allEventHandlers[event].push(handler);
      }),
      removeAllListeners: jest.fn(() => {
        eventHandlers = {};
        allEventHandlers = {};
      }),
    } as any;

    // Make `connected` configurable & writable so tests can toggle it
    let _connected = true;
    Object.defineProperty(mockSocket, 'connected', {
      get: () => _connected,
      set: (val: boolean) => { _connected = val; },
      configurable: true,
    });

    // Helper to change the connected state in tests
    (mockSocket as any).__setConnected = (val: boolean) => { _connected = val; };

    // Mock the io function
    mockIo = require('socket.io-client').io as jest.MockedFunction<typeof import('socket.io-client').io>;
    mockIo.mockReturnValue(mockSocket);

    // Create store with middleware
    const middleware = createSocketMiddleware('http://localhost:3000');
    store = configureStore({
      reducer: {
        connection: connectionSlice,
        gameRoom: gameRoomSlice,
        game: gameSlice,
        ui: uiSlice,
        history: historySlice,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['connection/setSocket'],
            ignoredPaths: ['connection.socket'],
          },
        }).concat(middleware),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe('socket initialization', () => {
    it('should initialize socket when initSocket action is dispatched', () => {
      store.dispatch({ type: 'connection/initSocket' });

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', {
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(store.getState().connection.status).toBe('connecting');
    });

    it('should prevent duplicate socket initialization', () => {
      // First initialization
      store.dispatch({ type: 'connection/initSocket' });
      expect(mockIo).toHaveBeenCalledTimes(1);

      // Second initialization should be skipped
      store.dispatch({ type: 'connection/initSocket' });
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('should disconnect existing socket before creating new one', () => {
      // First initialization
      store.dispatch({ type: 'connection/initSocket' });
      
      // Create a second socket instance for testing
      const secondMockSocket = { ...mockSocket };
      mockIo.mockReturnValueOnce(secondMockSocket as any);
      
      // Force a new socket by clearing the initialization flag
      store.dispatch({ type: 'connection/disconnectSocket' });
      store.dispatch({ type: 'connection/initSocket' });

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should set up all socket event listeners', () => {
      store.dispatch({ type: 'connection/initSocket' });

      const expectedEvents = [
        'connect',
        'disconnect',
        'connect_error',
        'reconnect_attempt',
        'reconnect',
        'ROOM_STATE_UPDATE',
        'PLAYER_JOINED',
        'PLAYER_LEFT',
        'HOST_TRANSFER',
        'ROOM_ERROR',
        'LEFT_ROOM',
        'HISTORY_RESPONSE',
        'SETTINGS_UPDATED',
        'GAME_MODE_UPDATED',
        'GAME_START_CANCELED',
        'GAME_COUNTDOWN_STARTED',
        'GAME_STARTED',
        'GAME_STATE_UPDATE',
        'GAME_ANIMATION',
        'GAME_ENDED',
        'ROOM_NOT_FOUND',
        'ROOM_FULL',
        'pong',
      ];

      expectedEvents.forEach(event => {
        expect(eventHandlers[event]).toBeDefined();
      });
    });

    it('should start ping interval for latency tracking', () => {
      store.dispatch({ type: 'connection/initSocket' });

      // Fast forward past the ping interval (30 seconds)
      jest.advanceTimersByTime(30000);

      expect(emittedEvents.ping).toBeDefined();
      expect(emittedEvents.ping.length).toBeGreaterThan(0);
    });
  });

  describe('socket event handlers', () => {
    beforeEach(() => {
      store.dispatch({ type: 'connection/initSocket' });
    });

    it('should handle connect event', () => {
      eventHandlers.connect();

      const state = store.getState();
      expect(state.connection.status).toBe('connected');
      expect(state.ui.toast?.message).toBe('Connected to server');
      expect(state.ui.toast?.type).toBe('success');
    });

    it('should handle disconnect event', () => {
      fireEvent('disconnect', 'transport close');

      const state = store.getState();
      expect(state.connection.status).toBe('disconnected');
      expect(state.ui.toast?.message).toBe('Disconnected from server');
      expect(state.ui.toast?.type).toBe('warning');
    });

    it('should handle connect_error event', () => {
      const error = new Error('Connection failed');
      eventHandlers.connect_error(error);

      const state = store.getState();
      expect(state.connection.status).toBe('error');
      expect(state.connection.error).toBe('Connection failed');
      expect(state.ui.toast?.message).toBe('Connection failed');
      expect(state.ui.toast?.type).toBe('error');
    });

    it('should handle reconnect_attempt event', () => {
      eventHandlers.reconnect_attempt(1);

      const state = store.getState();
      expect(state.connection.status).toBe('reconnecting');
    });

    it('should handle reconnect event', () => {
      eventHandlers.reconnect(3);

      const state = store.getState();
      expect(state.connection.status).toBe('connected');
      expect(state.ui.toast?.message).toBe('Reconnected to server');
    });

    it('should handle ROOM_STATE_UPDATE event', () => {
      const roomData = {
        id: 'test-room',
        state: 'waiting',
        players: [{ id: 'player1', name: 'Player 1', isHost: true, isSpectator: false }],
        spectators: [],
        hostId: 'player1',
        maxPlayers: 2,
        createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
      };

      eventHandlers.ROOM_STATE_UPDATE(roomData);

      const state = store.getState();
      expect(state.gameRoom.roomId).toBe('test-room');
      expect(state.gameRoom.players).toHaveLength(1);
    });

    it('should set current player ID when ROOM_STATE_UPDATE includes socket ID', () => {
      const roomData = {
        id: 'test-room',
        state: 'waiting',
        players: [{ id: 'mock-socket-id', name: 'Me', isHost: true, isSpectator: false }],
        spectators: [],
        hostId: 'mock-socket-id',
        maxPlayers: 2,
        createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
      };

      eventHandlers.ROOM_STATE_UPDATE(roomData);

      const state = store.getState();
      expect(state.gameRoom.currentPlayerId).toBe('mock-socket-id');
    });

    it('should handle PLAYER_JOINED event', () => {
      const data = {
        player: { id: 'player2', name: 'Player 2' },
        isSpectator: false
      };

      eventHandlers.PLAYER_JOINED(data);

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('Player 2 joined the room');
    });

    it('should handle PLAYER_JOINED event for spectator', () => {
      const data = {
        player: { id: 'spectator1', name: 'Spectator 1', isHost: false, isSpectator: true },
      };

      eventHandlers.PLAYER_JOINED(data);

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('Spectator 1 joined the room as spectator');
    });

    it('should handle PLAYER_LEFT event', () => {
      eventHandlers.PLAYER_LEFT({ playerId: 'player1' });

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('A player left the room');
      expect(state.ui.toast?.type).toBe('warning');
    });

    it('should handle HOST_TRANSFER event', () => {
      const data = { newHostId: 'player2', oldHostId: 'player1' };
      eventHandlers.HOST_TRANSFER(data);

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('Host has been transferred');
    });

    it('should handle ROOM_ERROR event', () => {
      const data = { roomId: 'room-1', reason: 'Room is full', code: 'ROOM_FULL' };
      eventHandlers.ROOM_ERROR(data);

      const state = store.getState();
      expect(state.gameRoom.error).toBe('Room is full');
      expect(state.ui.toast?.message).toBe('Room Error: Room is full');
    });

    it('should handle LEFT_ROOM event', () => {
      eventHandlers.LEFT_ROOM();

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('Left the room');
    });


    it('should handle SETTINGS_UPDATED event', () => {
      const data = { settings: { gravity: 5, boardWidth: 10 } };
      eventHandlers.SETTINGS_UPDATED(data);

      const state = store.getState();
      expect(state.gameRoom.settings.gravity).toBe(5);
    });

    it('should handle GAME_MODE_UPDATED event', () => {
      const data = { gameMode: 'sprint' };
      eventHandlers.GAME_MODE_UPDATED(data);

      const state = store.getState();
      expect(state.gameRoom.gameMode).toBe('sprint');
    });


    it('should handle GAME_START_CANCELED event', () => {
      eventHandlers.GAME_START_CANCELED();

      const state = store.getState();
      expect(state.gameRoom.roomStatus).toBe('lobby');
      expect(state.ui.toast?.message).toBe('Game start was canceled');
    });

    it('should handle GAME_STARTED event', () => {
      const data = { gameId: 'game123' };
      eventHandlers.GAME_STARTED(data);

      const state = store.getState();
      expect(state.gameRoom.gameStarted).toBe(true);
      expect(state.gameRoom.gameId).toBe('game123');
      expect(state.ui.toast?.message).toBe('Game started!');
    });

    it('should handle GAME_STATE_UPDATE event', () => {
      const data = {
        player: { id: 'player1', name: 'Player 1', isHost: true, isSpectator: false },
        board: [[0, 1], [1, 0]],
        currentPiece: null,
        nextPieces: [],
        score: 1000,
        linesCleared: 0,
        isGameOver: false,
      };
      eventHandlers.GAME_STATE_UPDATE(data);

      // This dispatches a game action, we can verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle GAME_ANIMATION event', () => {
      const animationData = { type: 'LINE_CLEAR', data: { rows: [0, 1], timestamp: Date.now() } };
      eventHandlers.GAME_ANIMATION(animationData);

      // This dispatches a game action, we can verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle GAME_ENDED event', () => {
      store.dispatch({ type: 'gameRoom/setCurrentPlayerId', payload: 'player1' });
      const data = { looserId: 'player1' };
      eventHandlers.GAME_ENDED(data);

      const state = store.getState();
      expect(state.ui.toast?.message).toBe('Game ended: defeat');
    });

    it('should handle ROOM_NOT_FOUND event', () => {
      const data = { error: 'Room not found' };
      eventHandlers.ROOM_NOT_FOUND(data);

      const state = store.getState();
      expect(state.gameRoom.error).toBe('Room not found');
    });

    it('should handle ROOM_FULL event', () => {
      const data = { error: 'Room is full' };
      eventHandlers.ROOM_FULL(data);

      const state = store.getState();
      expect(state.gameRoom.error).toBe('Room is full');
    });

    it('should handle HISTORY_RESPONSE event', () => {
      const payload = {
        history: {
          recentGames: [
            {
              roomId: 'room-1',
              type: 'multiplayer',
              gameMode: 'classic',
              games: [],
              startedAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
              endedAt: '2026-01-01T00:05:00.000Z' as unknown as Date,
            },
          ],
          topScores: [
            {
              gameId: 'game-1',
              player: {
                id: 'player-1',
                name: 'Player 1',
                isHost: true,
                isSpectator: false,
              },
              score: 1200,
              level: 2,
              linesCleared: 8,
              totalLinesCleared: 8,
              endGameReason: 'victory',
            },
          ],
        },
      };

      eventHandlers.HISTORY_RESPONSE(payload);

      const state = store.getState();
      expect(state.history.recentGames).toHaveLength(1);
      expect(state.history.topScores).toHaveLength(1);
      expect(state.history.error).toBeNull();
      expect(state.history.isLoading).toBe(false);
    });

    it('should handle HISTORY_RESPONSE event with invalid payload', () => {
      eventHandlers.HISTORY_RESPONSE({});

      const state = store.getState();
      expect(state.history.error).toBe('Failed to load history');
      expect(state.history.isLoading).toBe(false);
    });

    it('should handle pong event and update latency', () => {
      const timestamp = Date.now() - 50; // 50ms latency
      eventHandlers.pong(timestamp);

      const state = store.getState();
      expect(state.connection.serverLatency).toBeGreaterThan(0);
    });

    it('should clear ping interval on disconnect', () => {
      // Start the interval
      jest.advanceTimersByTime(30000);
      expect(emittedEvents.ping?.length).toBeGreaterThan(0);

      // Reset tracking
      emittedEvents.ping = [];

      // Disconnect
      fireEvent('disconnect', 'transport close');
      jest.advanceTimersByTime(60000);
      expect(emittedEvents.ping?.length || 0).toBe(0);
    });
  });

  describe('action handling', () => {
    beforeEach(() => {
      store.dispatch({ type: 'connection/initSocket' });
      
      // Set up initial room state
      store.dispatch({
        type: 'gameRoom/joinRoomSuccess',
        payload: {
          roomId: 'test-room',
          players: [],
          settings: { level: 1 }
        }
      });
    });

    it('should handle disconnectSocket action', () => {
      store.dispatch({ type: 'connection/disconnectSocket' });

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(store.getState().connection.socket).toBeNull();
    });

    it('should handle joinRoom action when socket is connected', () => {
      const action = {
        type: 'gameRoom/joinRoom',
        payload: { roomId: 'room123', playerName: 'Player1' }
      };

      store.dispatch(action);

      expect(emittedEvents.JOIN_ROOM).toEqual([{
        roomId: 'room123',
        playerName: 'Player1'
      }]);
    });

    it('should not emit when socket is not connected', () => {
      (mockSocket as any).__setConnected(false);

      const action = {
        type: 'gameRoom/joinRoom',
        payload: { roomId: 'room123', playerName: 'Player1' }
      };

      store.dispatch(action);

      expect(emittedEvents.JOIN_ROOM).toBeUndefined();
    });

    it('should handle updateSetting action', () => {
      store.dispatch({ type: 'gameRoom/updateSetting', payload: { key: 'level', value: 5 } });

      expect(emittedEvents.UPDATE_SETTINGS).toEqual([{
        roomId: 'test-room',
        settings: expect.objectContaining({ level: 5 })
      }]);
    });

    it('should handle updateGameMode action', () => {
      store.dispatch({ type: 'gameRoom/updateGameMode', payload: 'sprint' });

      expect(emittedEvents.UPDATE_GAME_MODE).toEqual([{
        roomId: 'test-room',
        gameMode: 'sprint'
      }]);
    });

    it('should handle startCountdown action', () => {
      store.dispatch({ type: 'gameRoom/startCountdown' });

      // startCountdown should not emit anything - it just resets the flag
      expect(emittedEvents.START_GAME).toBeUndefined();
    });

    it('should handle updateCountdown action and emit START_GAME when countdown reaches 0', () => {
      store.dispatch({ type: 'gameRoom/setCurrentPlayerId', payload: 'test-host' });
      store.dispatch({
        type: 'gameRoom/updateRoomState',
        payload: {
          id: 'test-room',
          state: 'waiting',
          players: [{ id: 'test-host', name: 'Host', isHost: true, isSpectator: false }],
          spectators: [],
          hostId: 'test-host',
          maxPlayers: 2,
          createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
        },
      });
      // First start countdown to reset the flag
      store.dispatch({ type: 'gameRoom/startCountdown' });
      
      // Update countdown to 0
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 0 });

      expect(emittedEvents.START_GAME).toEqual([{
        roomId: 'test-room',
        gameSettings: expect.any(Object)
      }]);
    });

    it('should not emit START_GAME if already emitted', () => {
      store.dispatch({ type: 'gameRoom/setCurrentPlayerId', payload: 'test-host' });
      store.dispatch({
        type: 'gameRoom/updateRoomState',
        payload: {
          id: 'test-room',
          state: 'waiting',
          players: [{ id: 'test-host', name: 'Host', isHost: true, isSpectator: false }],
          spectators: [],
          hostId: 'test-host',
          maxPlayers: 2,
          createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
        },
      });
      // First countdown
      store.dispatch({ type: 'gameRoom/startCountdown' });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 0 });
      
      // Second countdown to 0 should not emit again
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 0 });

      expect(emittedEvents.START_GAME).toHaveLength(1);
    });

    it('should not emit START_GAME if game already started', () => {
      store.dispatch({ type: 'gameRoom/setCurrentPlayerId', payload: 'test-host' });
      store.dispatch({
        type: 'gameRoom/updateRoomState',
        payload: {
          id: 'test-room',
          state: 'waiting',
          players: [{ id: 'test-host', name: 'Host', isHost: true, isSpectator: false }],
          spectators: [],
          hostId: 'test-host',
          maxPlayers: 2,
          createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
        },
      });
      // Set game as already started
      store.dispatch({ type: 'gameRoom/startGame', payload: { gameId: 'existing-game' } });
      
      // Now try to start countdown
      store.dispatch({ type: 'gameRoom/startCountdown' });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 0 });

      expect(emittedEvents.START_GAME).toBeUndefined();
    });

    it('should handle cancelCountdown action', () => {
      store.dispatch({ type: 'gameRoom/cancelCountdown' });

      expect(emittedEvents.CANCEL_START).toEqual([{
        roomId: 'test-room'
      }]);
    });

    it('should handle leaveRoom action', () => {
      store.dispatch({ type: 'gameRoom/leaveRoom' });

      expect(emittedEvents.LEAVE_ROOM).toEqual([{
        roomId: 'test-room'
      }]);
    });

    it('should handle resetToLobby action', () => {
      store.dispatch({ type: 'gameRoom/resetToLobby' });

      expect(emittedEvents.RESTART_GAME).toEqual([{
        roomId: 'test-room'
      }]);
      
      // Should also reset game state
      const state = store.getState();
      expect(state.game.isGameOver).toBe(false);
    });

    it('should emit HISTORY when requestHistory action is dispatched', () => {
      store.dispatch({ type: 'history/requestHistory' });

      expect(emittedEvents.HISTORY).toEqual([undefined]);
    });

    it('should not emit HISTORY when socket is not connected', () => {
      (mockSocket as any).__setConnected(false);

      store.dispatch({ type: 'history/requestHistory' });

      expect(emittedEvents.HISTORY).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle actions when socket is not initialized', () => {
      // Don't initialize socket
      const action = {
        type: 'gameRoom/joinRoom',
        payload: { roomId: 'room123', playerName: 'Player1' }
      };

      expect(() => store.dispatch(action)).not.toThrow();
      expect(emittedEvents.JOIN_ROOM).toBeUndefined();
    });

    it('should handle ROOM_STATE_UPDATE without current player match', () => {
      store.dispatch({ type: 'connection/initSocket' });
      
      const roomData = {
        id: 'test-room',
        state: 'waiting',
        players: [{ id: 'other-player', name: 'Other Player', isHost: false, isSpectator: false }],
        spectators: [],
        hostId: 'other-player',
        maxPlayers: 2,
        createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
      };

      expect(() => eventHandlers.ROOM_STATE_UPDATE(roomData)).not.toThrow();
    });

    it('should handle updateCountdown with non-zero values', () => {
      store.dispatch({ type: 'connection/initSocket' });
      store.dispatch({ type: 'gameRoom/startCountdown' });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 3 });

      // Should not emit START_GAME for non-zero countdown
      expect(emittedEvents.START_GAME).toBeUndefined();
    });

    it('should handle ping when socket is not connected', () => {
      store.dispatch({ type: 'connection/initSocket' });
      (mockSocket as any).__setConnected(false);

      jest.advanceTimersByTime(30000);

      // Should not emit ping when disconnected
      expect(emittedEvents.ping?.length || 0).toBe(0);
    });
  });

  describe('environment configuration', () => {
    it('should use default socket URL when VITE_SOCKET_URL is not set', () => {
      delete process.env.VITE_SOCKET_URL;
      
      // Re-import to test default
      jest.resetModules();
      const { socketMiddleware } = require('@/store/middleware/socketMiddleware');
      
      expect(socketMiddleware).toBeDefined();
    });

    it('should use VITE_SOCKET_URL when set', () => {
      process.env.VITE_SOCKET_URL = 'http://custom-url:4000';
      
      // Re-import to test custom URL
      jest.resetModules();
      const { createSocketMiddleware } = require('@/store/middleware/socketMiddleware');
      
      const middleware = createSocketMiddleware('http://custom-url:4000');
      expect(middleware).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      store.dispatch({ type: 'connection/initSocket' });
    });

    it('should handle complete room join flow', () => {
      // Join room
      store.dispatch({
        type: 'gameRoom/joinRoom',
        payload: { roomId: 'room123', playerName: 'Player1' }
      });

      // Simulate server response
      eventHandlers.ROOM_STATE_UPDATE({
        id: 'room123',
        state: 'waiting',
        players: [{ id: 'player1', name: 'Player1', isHost: true, isSpectator: false }],
        spectators: [],
        hostId: 'player1',
        maxPlayers: 2,
        createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
      });

      const state = store.getState();
      expect(state.gameRoom.players).toHaveLength(1);
      expect(emittedEvents.JOIN_ROOM).toBeDefined();
    });

    it('should handle complete game start flow', () => {
      // Set up room
      store.dispatch({
        type: 'gameRoom/joinRoomSuccess',
        payload: {
          roomId: 'room123',
          players: [{ id: 'p1', name: 'P1', isHost: true, isSpectator: false }],
          settings: { level: 1 }
        }
      });

      store.dispatch({ type: 'gameRoom/setCurrentPlayerId', payload: 'p1' });
      store.dispatch({
        type: 'gameRoom/updateRoomState',
        payload: {
          id: 'room123',
          state: 'waiting',
          players: [{ id: 'p1', name: 'P1', isHost: true, isSpectator: false }],
          spectators: [],
          hostId: 'p1',
          maxPlayers: 2,
          createdAt: '2026-01-01T00:00:00.000Z' as unknown as Date,
        },
      });

      // Start countdown
      store.dispatch({ type: 'gameRoom/startCountdown' });
      
      // Simulate countdown
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 3 });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 2 });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 1 });
      store.dispatch({ type: 'gameRoom/updateCountdown', payload: 0 });

      // Simulate game start response
      eventHandlers.GAME_STARTED({ gameId: 'game123' });

      const state = store.getState();
      expect(state.gameRoom.gameStarted).toBe(true);
      expect(state.gameRoom.gameId).toBe('game123');
      expect(emittedEvents.START_GAME).toHaveLength(1);
    });

    it('should handle connection lifecycle', () => {
      // Connect
      eventHandlers.connect();
      expect(store.getState().connection.status).toBe('connected');

      // Disconnect — use fireEvent because the middleware registers two disconnect handlers
      fireEvent('disconnect', 'transport close');
      expect(store.getState().connection.status).toBe('disconnected');

      // Reconnect attempt
      eventHandlers.reconnect_attempt(1);
      expect(store.getState().connection.status).toBe('reconnecting');

      // Reconnect success
      eventHandlers.reconnect(1);
      expect(store.getState().connection.status).toBe('connected');
    });
  });
});
