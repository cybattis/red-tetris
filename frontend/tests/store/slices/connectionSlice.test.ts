import connectionSlice, {
  setSocket,
  setConnecting,
  setConnected,
  setDisconnected,
  setReconnecting,
  setConnectionError,
  clearConnectionError,
  updateLatency,
  resetConnection,
  selectConnection,
  selectSocket,
  selectConnectionStatus,
  selectIsConnected,
  selectConnectionError,
  selectServerLatency,
  ConnectionState,
  ConnectionStatus,
} from '../../../src/store/slices/connectionSlice';

// Mock socket for testing
const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as any;

describe('connectionSlice', () => {
  const initialState: ConnectionState = {
    socket: null,
    status: 'disconnected',
    error: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    serverLatency: null,
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(connectionSlice(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('reducers', () => {
    describe('setSocket', () => {
      it('should set the socket', () => {
        const result = connectionSlice(initialState, setSocket(mockSocket));
        expect(result.socket).toBe(mockSocket);
        expect(result.status).toBe('disconnected'); // status unchanged
      });

      it('should set socket to null', () => {
        const stateWithSocket = { ...initialState, socket: mockSocket };
        const result = connectionSlice(stateWithSocket, setSocket(null));
        expect(result.socket).toBeNull();
      });

      it('should replace existing socket', () => {
        const newSocket = { ...mockSocket, id: 'new-socket-id' };
        const stateWithSocket = { ...initialState, socket: mockSocket };
        const result = connectionSlice(stateWithSocket, setSocket(newSocket));
        expect(result.socket).toBe(newSocket);
      });
    });

    describe('setConnecting', () => {
      it('should set status to connecting and clear error', () => {
        const stateWithError = { ...initialState, error: 'Connection failed', status: 'error' as ConnectionStatus };
        const result = connectionSlice(stateWithError, setConnecting());
        expect(result.status).toBe('connecting');
        expect(result.error).toBeNull();
      });

      it('should work from disconnected state', () => {
        const result = connectionSlice(initialState, setConnecting());
        expect(result.status).toBe('connecting');
        expect(result.error).toBeNull();
      });
    });

    describe('setConnected', () => {
      it('should set status to connected and reset connection data', () => {
        const stateReconnecting = {
          ...initialState,
          status: 'reconnecting' as ConnectionStatus,
          error: 'Previous error',
          reconnectAttempts: 3,
        };
        
        const result = connectionSlice(stateReconnecting, setConnected());
        expect(result.status).toBe('connected');
        expect(result.error).toBeNull();
        expect(result.reconnectAttempts).toBe(0);
        expect(result.lastConnectedAt).toBeGreaterThan(0);
        expect(typeof result.lastConnectedAt).toBe('number');
      });

      it('should update lastConnectedAt timestamp', () => {
        const beforeTime = Date.now();
        const result = connectionSlice(initialState, setConnected());
        const afterTime = Date.now();
        
        expect(result.lastConnectedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(result.lastConnectedAt).toBeLessThanOrEqual(afterTime);
      });
    });

    describe('setDisconnected', () => {
      it('should reset to disconnected state', () => {
        const connectedState: ConnectionState = {
          ...initialState,
          status: 'connected',
          socket: mockSocket,
          serverLatency: 150,
          lastConnectedAt: Date.now(),
        };
        
        const result = connectionSlice(connectedState, setDisconnected());
        expect(result.status).toBe('disconnected');
        expect(result.socket).toBeNull();
        expect(result.serverLatency).toBeNull();
        expect(result.lastConnectedAt).toBe(connectedState.lastConnectedAt); // preserved
      });

      it('should preserve reconnectAttempts and error', () => {
        const stateWithData = {
          ...initialState,
          status: 'connected' as ConnectionStatus,
          socket: mockSocket,
          reconnectAttempts: 2,
          error: 'Previous error',
        };
        
        const result = connectionSlice(stateWithData, setDisconnected());
        expect(result.reconnectAttempts).toBe(2);
        expect(result.error).toBe('Previous error');
      });
    });

    describe('setReconnecting', () => {
      it('should increment reconnectAttempts and set status', () => {
        const result = connectionSlice(initialState, setReconnecting());
        expect(result.status).toBe('reconnecting');
        expect(result.reconnectAttempts).toBe(1);
      });

      it('should increment existing reconnectAttempts', () => {
        const stateWithAttempts = { ...initialState, reconnectAttempts: 2 };
        const result = connectionSlice(stateWithAttempts, setReconnecting());
        expect(result.status).toBe('reconnecting');
        expect(result.reconnectAttempts).toBe(3);
      });
    });

    describe('setConnectionError', () => {
      it('should set error status and message', () => {
        const errorMessage = 'Connection timeout';
        const result = connectionSlice(initialState, setConnectionError(errorMessage));
        expect(result.status).toBe('error');
        expect(result.error).toBe(errorMessage);
        expect(result.socket).toBeNull();
      });

      it('should clear socket when setting error', () => {
        const stateWithSocket = { ...initialState, socket: mockSocket };
        const result = connectionSlice(stateWithSocket, setConnectionError('Network error'));
        expect(result.socket).toBeNull();
        expect(result.error).toBe('Network error');
      });

      it('should handle empty error message', () => {
        const result = connectionSlice(initialState, setConnectionError(''));
        expect(result.status).toBe('error');
        expect(result.error).toBe('');
      });
    });

    describe('clearConnectionError', () => {
      it('should clear error and reset status from error to disconnected', () => {
        const errorState = {
          ...initialState,
          status: 'error' as ConnectionStatus,
          error: 'Connection failed',
        };
        
        const result = connectionSlice(errorState, clearConnectionError());
        expect(result.error).toBeNull();
        expect(result.status).toBe('disconnected');
      });

      it('should clear error without changing non-error status', () => {
        const connectedState = {
          ...initialState,
          status: 'connected' as ConnectionStatus,
          error: 'Some old error',
        };
        
        const result = connectionSlice(connectedState, clearConnectionError());
        expect(result.error).toBeNull();
        expect(result.status).toBe('connected'); // unchanged
      });

      it('should work when no error exists', () => {
        const result = connectionSlice(initialState, clearConnectionError());
        expect(result.error).toBeNull();
        expect(result.status).toBe('disconnected');
      });
    });

    describe('updateLatency', () => {
      it('should set server latency', () => {
        const latency = 125;
        const result = connectionSlice(initialState, updateLatency(latency));
        expect(result.serverLatency).toBe(latency);
      });

      it('should update existing latency', () => {
        const stateWithLatency = { ...initialState, serverLatency: 100 };
        const result = connectionSlice(stateWithLatency, updateLatency(75));
        expect(result.serverLatency).toBe(75);
      });

      it('should handle zero latency', () => {
        const result = connectionSlice(initialState, updateLatency(0));
        expect(result.serverLatency).toBe(0);
      });

      it('should handle high latency values', () => {
        const result = connectionSlice(initialState, updateLatency(9999));
        expect(result.serverLatency).toBe(9999);
      });
    });

    describe('resetConnection', () => {
      it('should reset to initial state', () => {
        const modifiedState: ConnectionState = {
          socket: mockSocket,
          status: 'connected',
          error: 'Some error',
          reconnectAttempts: 5,
          lastConnectedAt: Date.now(),
          serverLatency: 200,
        };
        
        const result = connectionSlice(modifiedState, resetConnection());
        expect(result).toEqual(initialState);
      });

      it('should work when already in initial state', () => {
        const result = connectionSlice(initialState, resetConnection());
        expect(result).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    const mockState = {
      connection: {
        socket: mockSocket,
        status: 'connected' as ConnectionStatus,
        error: 'Test error',
        reconnectAttempts: 2,
        lastConnectedAt: 1234567890,
        serverLatency: 150,
      },
    };

    describe('selectConnection', () => {
      it('should select the entire connection state', () => {
        const result = selectConnection(mockState);
        expect(result).toBe(mockState.connection);
      });
    });

    describe('selectSocket', () => {
      it('should select the socket', () => {
        const result = selectSocket(mockState);
        expect(result).toBe(mockSocket);
      });

      it('should return null when no socket', () => {
        const stateWithoutSocket = {
          connection: { ...mockState.connection, socket: null },
        };
        const result = selectSocket(stateWithoutSocket);
        expect(result).toBeNull();
      });
    });

    describe('selectConnectionStatus', () => {
      it('should select the connection status', () => {
        const result = selectConnectionStatus(mockState);
        expect(result).toBe('connected');
      });

      it('should work with different statuses', () => {
        const disconnectedState = {
          connection: { ...mockState.connection, status: 'disconnected' as ConnectionStatus },
        };
        const result = selectConnectionStatus(disconnectedState);
        expect(result).toBe('disconnected');
      });
    });

    describe('selectIsConnected', () => {
      it('should return true when connected', () => {
        const result = selectIsConnected(mockState);
        expect(result).toBe(true);
      });

      it('should return false when not connected', () => {
        const statuses: ConnectionStatus[] = ['disconnected', 'connecting', 'reconnecting', 'error'];
        
        statuses.forEach(status => {
          const testState = {
            connection: { ...mockState.connection, status },
          };
          const result = selectIsConnected(testState);
          expect(result).toBe(false);
        });
      });
    });

    describe('selectConnectionError', () => {
      it('should select the connection error', () => {
        const result = selectConnectionError(mockState);
        expect(result).toBe('Test error');
      });

      it('should return null when no error', () => {
        const stateWithoutError = {
          connection: { ...mockState.connection, error: null },
        };
        const result = selectConnectionError(stateWithoutError);
        expect(result).toBeNull();
      });
    });

    describe('selectServerLatency', () => {
      it('should select the server latency', () => {
        const result = selectServerLatency(mockState);
        expect(result).toBe(150);
      });

      it('should return null when no latency', () => {
        const stateWithoutLatency = {
          connection: { ...mockState.connection, serverLatency: null },
        };
        const result = selectServerLatency(stateWithoutLatency);
        expect(result).toBeNull();
      });
    });
  });

  describe('action creators', () => {
    it('should create correct action types', () => {
      expect(setSocket(mockSocket)).toEqual({
        type: 'connection/setSocket',
        payload: mockSocket,
      });

      expect(setConnecting()).toEqual({
        type: 'connection/setConnecting',
      });

      expect(setConnected()).toEqual({
        type: 'connection/setConnected',
      });

      expect(setConnectionError('test error')).toEqual({
        type: 'connection/setConnectionError',
        payload: 'test error',
      });

      expect(updateLatency(100)).toEqual({
        type: 'connection/updateLatency',
        payload: 100,
      });
    });
  });

  describe('edge cases and integration', () => {
    it('should handle multiple state transitions correctly', () => {
      let state = initialState;

      // Connect
      state = connectionSlice(state, setConnecting());
      expect(state.status).toBe('connecting');

      state = connectionSlice(state, setSocket(mockSocket));
      state = connectionSlice(state, setConnected());
      expect(state.status).toBe('connected');
      expect(state.socket).toBe(mockSocket);

      // Add latency
      state = connectionSlice(state, updateLatency(100));
      expect(state.serverLatency).toBe(100);

      // Disconnect and reconnect
      state = connectionSlice(state, setDisconnected());
      expect(state.status).toBe('disconnected');
      expect(state.socket).toBeNull();

      state = connectionSlice(state, setReconnecting());
      expect(state.status).toBe('reconnecting');
      expect(state.reconnectAttempts).toBe(1);

      // Error and recovery
      state = connectionSlice(state, setConnectionError('Network error'));
      expect(state.status).toBe('error');
      expect(state.error).toBe('Network error');

      state = connectionSlice(state, clearConnectionError());
      expect(state.status).toBe('disconnected');
      expect(state.error).toBeNull();

      // Reset
      state = connectionSlice(state, resetConnection());
      expect(state).toEqual(initialState);
    });

    it('should preserve immutability', () => {
      const state = { ...initialState };
      const newState = connectionSlice(state, setConnected());
      
      expect(newState).not.toBe(state);
      expect(state).toEqual(initialState); // original unchanged
    });
  });
});
