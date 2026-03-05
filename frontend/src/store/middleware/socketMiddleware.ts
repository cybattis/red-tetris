import type { Middleware } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import type { RootState, AppDispatch } from '../index.js';
import {
  setSocket,
  setConnecting,
  setConnected,
  setDisconnected,
  setReconnecting,
  setConnectionError,
  updateLatency,
} from '../slices/connectionSlice.js';
import { resetGame } from '../slices/gameSlice.js';
import {
  joinRoomSuccess,
  joinRoomError,
  updatePlayerReady,
  updateGameMode,
  updateSettings,
  startCountdown,
  updateCountdown,
  cancelCountdown,
  startGame,
  // New room management actions
  updateRoomState,
  playerJoined,
  playerLeft,
  hostTransferred,
  roomError,
  setCurrentPlayerId,
} from '../slices/gameRoomSlice.js';
import { showToast } from '../slices/uiSlice.js';

export const createSocketMiddleware = (socketUrl: string): Middleware<{}, RootState> => {
  // Track if socket has been initialized to prevent duplicate initialization
  let socketInitialized = false;
  // Track if START_GAME has been emitted for current countdown to prevent duplicates
  let startGameEmitted = false;
  
  return (store) => (next) => (action: any) => {
    // Get state BEFORE action is processed for certain checks
    const prevState = store.getState();
    
    const result = next(action);
    const state = store.getState();
    const dispatch = store.dispatch as AppDispatch;

    switch (action.type) {
      case 'connection/initSocket': {
        // Prevent duplicate socket initialization
        if (socketInitialized && state.connection.socket) {
          console.log('[DEBUG] Socket already initialized, skipping');
          break;
        }
        
        if (state.connection.socket) {
          console.log('[DEBUG] Disconnecting existing socket');
          state.connection.socket.removeAllListeners();
          state.connection.socket.disconnect();
        }
        
        socketInitialized = true;
        console.log('[DEBUG] Initializing new socket');

        dispatch(setConnecting());
        
        const socket: Socket = io(socketUrl, {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
        });

        dispatch(setSocket(socket));

        socket.on('connect', () => {
          console.log('Connected to server');
          dispatch(setConnected());
          dispatch(showToast({ message: 'Connected to server', type: 'success' }));
        });

        socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
          dispatch(setDisconnected());
          dispatch(showToast({ message: 'Disconnected from server', type: 'warning' }));
        });

        socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          dispatch(setConnectionError(error.message));
          dispatch(showToast({ message: 'Connection failed', type: 'error' }));
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('Reconnection attempt:', attemptNumber);
          dispatch(setReconnecting());
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected after', attemptNumber, 'attempts');
          dispatch(setConnected());
          dispatch(showToast({ message: 'Reconnected to server', type: 'success' }));
        });

        // New room management event handlers
        socket.on('ROOM_STATE_UPDATE', (data) => {
          dispatch(updateRoomState(data.room));
          
          // Set current player ID if not already set (when first joining)
          const currentState = store.getState();
          if (!currentState.gameRoom.currentPlayerId && socket.id) {
            // Find the player in the room data that matches our socket ID
            const currentPlayer = [...data.room.players, ...data.room.spectators].find(p => p.id === socket.id);
            if (currentPlayer) {
              dispatch(setCurrentPlayerId(socket.id));
            }
          }
        });

        socket.on('PLAYER_JOINED', (data) => {
          dispatch(playerJoined(data));
          dispatch(showToast({ 
            message: `${data.player.name} joined the room${data.isSpectator ? ' as spectator' : ''}`, 
            type: 'info' 
          }));
        });

        socket.on('PLAYER_LEFT', (data) => {
          dispatch(playerLeft(data));
          dispatch(showToast({ 
            message: 'A player left the room', 
            type: 'warning' 
          }));
        });

        socket.on('HOST_TRANSFER', (data) => {
          dispatch(hostTransferred(data));
          dispatch(showToast({ 
            message: 'Host has been transferred', 
            type: 'info' 
          }));
        });

        socket.on('ROOM_ERROR', (data) => {
          dispatch(roomError(data));
          dispatch(showToast({ 
            message: `Room Error: ${data.error}`, 
            type: 'error' 
          }));
        });

        socket.on('LEFT_ROOM', () => {
          dispatch(showToast({ 
            message: 'Left the room', 
            type: 'info' 
          }));
        });

        // Legacy room event handlers (keeping for backward compatibility)
        socket.on('GAME_CREATED', (data) => {
          if (data.success) {
            dispatch(joinRoomSuccess({
              players: data.players || [],
              currentPlayerId: data.currentPlayerId || '',
              gameMode: data.gameMode,
              settings: data.settings,
            }));
          } else {
            dispatch(joinRoomError(data.error || 'Failed to create game'));
          }
        });

        socket.on('PLAYER_READY_STATUS', (data) => {
          dispatch(updatePlayerReady({
            playerId: data.playerId,
            isReady: data.isReady,
          }));
        });

        socket.on('SETTINGS_UPDATED', (data) => {
          dispatch(updateSettings(data.settings));
        });

        socket.on('GAME_MODE_UPDATED', (data) => {
          dispatch(updateGameMode(data.gameMode));
        });

        socket.on('GAME_STARTING', (data) => {
          dispatch(startCountdown());
          dispatch(updateCountdown(data.countdown));
        });

        socket.on('GAME_START_CANCELED', () => {
          dispatch(cancelCountdown());
          dispatch(showToast({ 
            message: 'Game start was canceled', 
            type: 'info' 
          }));
        });

        socket.on('GAME_STARTED', (data) => {
          console.log('[DEBUG] GAME_STARTED received:', data);
          // Reset game state before starting a new game to clear any leftover state
          dispatch(resetGame());
          dispatch(startGame({ gameId: data.gameId }));
          dispatch(showToast({ 
            message: 'Game started!', 
            type: 'success' 
          }));
        });

        socket.on('GAME_STATE_UPDATE', (gameState) => {
          // Update the game slice with the new state from server
          dispatch({ type: 'game/updateGameState', payload: gameState });
        });

        socket.on('GAME_ANIMATION', (animationData) => {
          // Handle game animations from server
          dispatch({ type: 'game/handleAnimation', payload: animationData });
        });

        socket.on('GAME_ENDED', (data: { gameId: string; playerId: string; reason: string }) => {
          console.log(`Game ended: ${data.gameId} for player ${data.playerId} - reason: ${data.reason}`);
          
          // Properly end the game in the frontend state
          dispatch({ type: 'game/gameEnded', payload: { 
            gameId: data.gameId, 
            reason: data.reason 
          }});
          
          // End the game in the room state (stops input)
          dispatch({ type: 'gameRoom/endGame' });
          
          // Show toast notification
          dispatch(showToast({ 
            message: `Game ended: ${data.reason}`, 
            type: 'info' 
          }));
        });

        socket.on('ROOM_NOT_FOUND', (data) => {
          dispatch(joinRoomError(data.error));
        });

        socket.on('ROOM_FULL', (data) => {
          dispatch(joinRoomError(data.error));
        });

        const pingInterval = setInterval(() => {
          if (socket.connected) {
            const start = Date.now();
            socket.emit('ping', start);
          }
        }, 30000); // Ping every 30 seconds

        socket.on('pong', (timestamp) => {
          const latency = Date.now() - timestamp;
          dispatch(updateLatency(latency));
        });

        socket.on('disconnect', () => {
          clearInterval(pingInterval);
        });

        socket.connect();
        break;
      }

      case 'connection/disconnectSocket': {
        const socket = state.connection.socket;
        if (socket) {
          console.log('[DEBUG] Disconnecting socket and removing listeners');
          socket.removeAllListeners();
          socket.disconnect();
          dispatch(setSocket(null));
        }
        socketInitialized = false;
        break;
      }

      case 'gameRoom/joinRoom': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('JOIN_ROOM', {
            roomId: action.payload.roomId,
            playerName: action.payload.playerName,
          });
        }
        break;
      }

      case 'gameRoom/updateSetting': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('UPDATE_SETTINGS', {
            roomId: state.gameRoom.roomId,
            settings: state.gameRoom.settings,
          });
        }
        break;
      }

      case 'gameRoom/updateGameMode': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('UPDATE_GAME_MODE', {
            roomId: state.gameRoom.roomId,
            gameMode: action.payload,
          });
        }
        break;
      }

      case 'gameRoom/updatePlayerReady': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('PLAYER_READY', {
            roomId: state.gameRoom.roomId,
            playerId: action.payload.playerId,
            isReady: action.payload.isReady,
          });
        }
        break;
      }

      case 'gameRoom/startCountdown': {
        // Reset the startGameEmitted flag when a new countdown starts
        startGameEmitted = false;
        // Don't emit START_GAME immediately - wait for countdown to finish
        // The countdown will trigger START_GAME when it reaches 0
        break;
      }

      case 'gameRoom/updateCountdown': {
        const socket = state.connection.socket;
        // Only emit START_GAME when countdown reaches exactly 0
        // Use prevState to check gameStarted BEFORE the reducer updated it
        // Also use startGameEmitted flag to prevent duplicate emissions
        console.log(`[DEBUG] updateCountdown: payload=${action.payload}, prevGameStarted=${prevState.gameRoom.gameStarted}, startGameEmitted=${startGameEmitted}`);
        if (socket && socket.connected && action.payload === 0 && !prevState.gameRoom.gameStarted && !startGameEmitted) {
          startGameEmitted = true;
          console.log('[DEBUG] Countdown reached 0, emitting START_GAME with settings:', state.gameRoom.settings);
          // Countdown finished - now start the game on the server
          socket.emit('START_GAME', {
            roomId: state.gameRoom.roomId,
            gameSettings: state.gameRoom.settings,
          });
        }
        break;
      }

      case 'gameRoom/cancelCountdown': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('CANCEL_START', {
            roomId: state.gameRoom.roomId,
          });
        }
        break;
      }

      case 'gameRoom/leaveRoom': {
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('LEAVE_ROOM', {
            roomId: state.gameRoom.roomId,
          });
        }
        break;
      }

      case 'gameRoom/resetToLobby': {
        // Reset the game state when returning to lobby
        dispatch(resetGame());
        
        const socket = state.connection.socket;
        if (socket && socket.connected) {
          socket.emit('RESTART_GAME', {
            roomId: state.gameRoom.roomId,
          });
        }
        break;
      }
    }

    return result;
  };
};

const defaultSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socketMiddleware = createSocketMiddleware(defaultSocketUrl);
