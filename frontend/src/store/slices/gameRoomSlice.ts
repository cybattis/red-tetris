import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  Player, 
  GameMode, 
  GameSettings, 
  GameCreationData 
} from '../../types/game';
import { 
  DEFAULT_SETTINGS, 
  ROOM_CONFIG, 
  canStartGame, 
  prepareGameCreationData 
} from '../../types/game';
import type {
  RoomInfo,
  RoomState as BackendRoomState,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  HostTransferEvent,
  RoomErrorEvent
} from '../../../../shared/types/room';

export type GameRoomStatus = 'lobby' | 'countdown' | 'playing' | 'finished' | 'error';

export interface GameRoomState {
  roomId: string | null;
  roomStatus: GameRoomStatus;
  backendRoomState: BackendRoomState | null;
  
  players: Player[];
  spectators: Player[];
  currentPlayerId: string | null;
  hostId: string | null;
  maxPlayers: number;
  
  gameMode: GameMode;
  settings: GameSettings;
  
  countdown: number | null;
  gameStarted: boolean;
  gameId: string | null;
  
  error: string | null;
  
  isJoiningRoom: boolean;
  isUpdatingSettings: boolean;
  isHost: boolean;
  isSpectator: boolean;
}

const initialState: GameRoomState = {
  roomId: null,
  roomStatus: 'lobby',
  backendRoomState: null,
  players: [],
  spectators: [],
  currentPlayerId: null,
  hostId: null,
  maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
  gameMode: 'classic' as GameMode,
  settings: DEFAULT_SETTINGS,
  countdown: null,
  gameStarted: false,
  gameId: null,
  error: null,
  isJoiningRoom: false,
  isUpdatingSettings: false,
  isHost: false,
  isSpectator: false,
};

const gameRoomSlice = createSlice({
  name: 'gameRoom',
  initialState,
  reducers: {
    joinRoom: (state, action: PayloadAction<{ roomId: string; playerName: string }>) => {
      state.isJoiningRoom = true;
      state.error = null;
      state.roomId = action.payload.roomId;
    },
    
    // TODO: When backend is connected, roomId should come from the server via socket events.
    // The optional roomId parameter is a temporary workaround for local testing without a backend.
    // After backend integration, remove the optional roomId here - it should only be set by joinRoom action.
    joinRoomSuccess: (state, action: PayloadAction<{ roomId?: string; players: Player[]; currentPlayerId: string; gameMode?: GameMode; settings?: GameSettings }>) => {
      state.isJoiningRoom = false;
      state.players = action.payload.players;
      state.currentPlayerId = action.payload.currentPlayerId;
      state.roomStatus = 'lobby';
      
      // TODO: Remove this conditional after backend integration - roomId will be set by joinRoom action
      if (action.payload.roomId) {
        state.roomId = action.payload.roomId;
      }
      if (action.payload.gameMode) {
        state.gameMode = action.payload.gameMode;
      }
      if (action.payload.settings) {
        state.settings = action.payload.settings;
      }
    },
    
    joinRoomError: (state, action: PayloadAction<string>) => {
      state.isJoiningRoom = false;
      state.error = action.payload;
      state.roomStatus = 'error';
    },
    
    leaveRoom: () => {
      return initialState;
    },
    
    addPlayer: (state, action: PayloadAction<Player>) => {
      const existingPlayer = state.players.find(p => p.id === action.payload.id);
      if (!existingPlayer) {
        state.players.push(action.payload);
      }
    },
    
    removePlayer: (state, action: PayloadAction<string>) => {
      state.players = state.players.filter(p => p.id !== action.payload);
    },
    
    updatePlayerReady: (state, action: PayloadAction<{ playerId: string; isReady: boolean }>) => {
      const player = state.players.find(p => p.id === action.payload.playerId);
      if (player) {
        player.isReady = action.payload.isReady;
      }
    },
    
    updateGameMode: (state, action: PayloadAction<GameMode>) => {
      state.gameMode = action.payload;
    },
    
    updateSettings: (state, action: PayloadAction<Partial<GameSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    updateSetting: (state, action: PayloadAction<{ key: keyof GameSettings; value: number | boolean }>) => {
      const { key, value } = action.payload;
      state.settings[key] = value as never;
    },
    
    resetSettings: (state) => {
      state.settings = DEFAULT_SETTINGS;
    },
    
    startCountdown: (state) => {
      state.countdown = ROOM_CONFIG.COUNTDOWN_DURATION;
      state.roomStatus = 'countdown';
    },
    
    updateCountdown: (state, action: PayloadAction<number>) => {
      state.countdown = action.payload;
      if (action.payload <= 0) {
        state.countdown = null;
        state.gameStarted = true;
        state.roomStatus = 'playing';
      }
    },
    
    cancelCountdown: (state) => {
      state.countdown = null;
      state.roomStatus = 'lobby';
    },
    
    startGame: (state, action: PayloadAction<{ gameId?: string }>) => {
      state.gameStarted = true;
      state.gameId = action.payload?.gameId || null;
      state.countdown = null;
      state.roomStatus = 'playing';
    },
    
    endGame: (state) => {
      state.gameStarted = false;
      state.countdown = null;
      state.roomStatus = 'finished';
      state.players.forEach(player => {
        if (!player.isHost) {
          player.isReady = false;
        }
      });
    },
    
    resetToLobby: (state) => {
      state.gameStarted = false;
      state.countdown = null;
      state.roomStatus = 'lobby';
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.roomStatus = 'error';
    },
    
    clearError: (state) => {
      state.error = null;
      if (state.roomStatus === 'error') {
        state.roomStatus = 'lobby';
      }
    },
    
    setUpdatingSettings: (state, action: PayloadAction<boolean>) => {
      state.isUpdatingSettings = action.payload;
    },

    // New room management actions
    updateRoomState: (state, action: PayloadAction<RoomInfo>) => {
      const roomInfo = action.payload;
      console.log('Updating room state:', roomInfo);
      
      state.roomId = roomInfo.id;
      state.backendRoomState = roomInfo.state;
      state.hostId = roomInfo.hostId;
      state.maxPlayers = roomInfo.maxPlayers;
      
      // Convert backend players to frontend players
      state.players = roomInfo.players.filter(p => !p.isSpectator).map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
      }));
      
      console.log('Frontend players after conversion:', state.players);
      console.log('Current player ID:', state.currentPlayerId);
      
      state.spectators = roomInfo.spectators.map(p => ({
        id: p.id,
        name: p.name,
        isHost: false,
        isReady: false,
      }));
      
      // Update current player status
      if (state.currentPlayerId) {
        const currentRoomPlayer = [...roomInfo.players, ...roomInfo.spectators].find(p => p.id === state.currentPlayerId);
        if (currentRoomPlayer) {
          state.isHost = currentRoomPlayer.isHost;
          state.isSpectator = currentRoomPlayer.isSpectator;
          console.log('Updated current player status: isHost=', state.isHost, 'isSpectator=', state.isSpectator);
        }
      }
      
      // Update room status based on backend state
      if (roomInfo.state === 'waiting') {
        state.roomStatus = 'lobby';
        state.gameStarted = false;
      } else if (roomInfo.state === 'playing') {
        state.roomStatus = 'playing';
        state.gameStarted = true;
      } else if (roomInfo.state === 'ended') {
        state.roomStatus = 'finished';
        state.gameStarted = false;
      }
    },

    playerJoined: (state, action: PayloadAction<PlayerJoinedEvent>) => {
      const { player, isSpectator } = action.payload;
      const newPlayer: Player = {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        isReady: player.isReady,
      };

      if (isSpectator) {
        // Add to spectators if not already present
        if (!state.spectators.find(p => p.id === player.id)) {
          state.spectators.push(newPlayer);
        }
      } else {
        // Add to players if not already present
        if (!state.players.find(p => p.id === player.id)) {
          state.players.push(newPlayer);
        }
      }
    },

    playerLeft: (state, action: PayloadAction<PlayerLeftEvent>) => {
      const { playerId } = action.payload;
      
      // Remove from players or spectators
      state.players = state.players.filter(p => p.id !== playerId);
      state.spectators = state.spectators.filter(p => p.id !== playerId);
    },

    hostTransferred: (state, action: PayloadAction<HostTransferEvent>) => {
      const { newHostId } = action.payload;
      
      // Update host status for all players
      state.players.forEach(player => {
        player.isHost = player.id === newHostId;
      });
      
      state.hostId = newHostId;
      state.isHost = state.currentPlayerId === newHostId;
    },

    roomError: (state, action: PayloadAction<RoomErrorEvent>) => {
      state.error = action.payload.error;
      state.roomStatus = 'error';
      state.isJoiningRoom = false;
    },

    // Helper action to set current player ID
    setCurrentPlayerId: (state, action: PayloadAction<string>) => {
      state.currentPlayerId = action.payload;
    },
  },
});

export const {
  joinRoom,
  joinRoomSuccess,
  joinRoomError,
  leaveRoom,
  addPlayer,
  removePlayer,
  updatePlayerReady,
  updateGameMode,
  updateSettings,
  updateSetting,
  resetSettings,
  startCountdown,
  updateCountdown,
  cancelCountdown,
  startGame,
  endGame,
  resetToLobby,
  setError,
  clearError,
  setUpdatingSettings,
  // New room management actions
  updateRoomState,
  playerJoined,
  playerLeft,
  hostTransferred,
  roomError,
  setCurrentPlayerId,
} = gameRoomSlice.actions;

export default gameRoomSlice.reducer;

export const selectGameRoom = (state: { gameRoom: GameRoomState }) => state.gameRoom;
export const selectRoomId = (state: { gameRoom: GameRoomState }) => state.gameRoom.roomId;
export const selectPlayers = (state: { gameRoom: GameRoomState }) => state.gameRoom.players;
export const selectSpectators = (state: { gameRoom: GameRoomState }) => state.gameRoom.spectators;
export const selectHostId = (state: { gameRoom: GameRoomState }) => state.gameRoom.hostId;
export const selectBackendRoomState = (state: { gameRoom: GameRoomState }) => state.gameRoom.backendRoomState;
export const selectCurrentPlayer = (state: { gameRoom: GameRoomState }) => {
  if (!state.gameRoom.currentPlayerId) return null;
  return state.gameRoom.players.find(p => p.id === state.gameRoom.currentPlayerId) || null;
};
export const selectIsHost = (state: { gameRoom: GameRoomState }) => {
  return state.gameRoom.isHost;
};
export const selectIsSpectator = (state: { gameRoom: GameRoomState }) => {
  return state.gameRoom.isSpectator;
};
export const selectGameMode = (state: { gameRoom: GameRoomState }) => state.gameRoom.gameMode;
export const selectGameSettings = (state: { gameRoom: GameRoomState }) => state.gameRoom.settings;
export const selectCanStartGame = (state: { gameRoom: GameRoomState }) => {
  return state.gameRoom.isHost && canStartGame(state.gameRoom.players);
};
export const selectCountdown = (state: { gameRoom: GameRoomState }) => state.gameRoom.countdown;
export const selectGameStarted = (state: { gameRoom: GameRoomState }) => state.gameRoom.gameStarted;
export const selectGameId = (state: { gameRoom: GameRoomState }) => state.gameRoom.gameId;
export const selectRoomStatus = (state: { gameRoom: GameRoomState }) => state.gameRoom.roomStatus;
export const selectError = (state: { gameRoom: GameRoomState }) => state.gameRoom.error;

export const selectGameCreationData = (state: { gameRoom: GameRoomState }): GameCreationData | null => {
  const { roomId, gameMode, settings, players } = state.gameRoom;
  
  // Return null if room isn't ready or no players yet
  if (!roomId || players.length === 0) {
    return null;
  }
  
  // Check if there's actually a host player before calling prepareGameCreationData
  const hasHost = players.some(p => p.isHost);
  if (!hasHost) {
    // Don't log error for this case - it's normal during room initialization
    return null;
  }
  
  try {
    return prepareGameCreationData(roomId, gameMode, settings, players);
  } catch (error) {
    console.error('Failed to prepare game creation data:', error);
    return null;
  }
};
