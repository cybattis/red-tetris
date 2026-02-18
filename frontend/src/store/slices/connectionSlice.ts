import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionState {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  serverLatency: number | null;
}

const initialState: ConnectionState = {
  socket: null,
  status: 'disconnected',
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  serverLatency: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setSocket: (state, action: PayloadAction<Socket | null>) => {
      return {
        ...state,
        socket: action.payload,
      };
    },
    
    setConnecting: (state) => {
      state.status = 'connecting';
      state.error = null;
    },
    
    setConnected: (state) => {
      state.status = 'connected';
      state.error = null;
      state.reconnectAttempts = 0;
      state.lastConnectedAt = Date.now();
    },
    
    setDisconnected: (state) => {
      state.status = 'disconnected';
      state.socket = null;
      state.serverLatency = null;
    },
    
    setReconnecting: (state) => {
      state.status = 'reconnecting';
      state.reconnectAttempts += 1;
    },
    
    setConnectionError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
      state.socket = null;
    },
    
    clearConnectionError: (state) => {
      state.error = null;
      if (state.status === 'error') {
        state.status = 'disconnected';
      }
    },
    
    updateLatency: (state, action: PayloadAction<number>) => {
      state.serverLatency = action.payload;
    },
    
    resetConnection: () => {
      return initialState;
    },
  },
});

export const {
  setSocket,
  setConnecting,
  setConnected,
  setDisconnected,
  setReconnecting,
  setConnectionError,
  clearConnectionError,
  updateLatency,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;

export const selectConnection = (state: { connection: ConnectionState }) => state.connection;
export const selectSocket = (state: { connection: ConnectionState }) => state.connection.socket;
export const selectConnectionStatus = (state: { connection: ConnectionState }) => state.connection.status;
export const selectIsConnected = (state: { connection: ConnectionState }) => state.connection.status === 'connected';
export const selectConnectionError = (state: { connection: ConnectionState }) => state.connection.error;
export const selectServerLatency = (state: { connection: ConnectionState }) => state.connection.serverLatency;
