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

export type GameRoomStatus = 'lobby' | 'countdown' | 'playing' | 'finished' | 'error';

export interface GameRoomState {
  roomId: string | null;
  roomStatus: GameRoomStatus;
  
  players: Player[];
  currentPlayerId: string | null;
  maxPlayers: number;
  
  gameMode: GameMode;
  settings: GameSettings;
  
  countdown: number | null;
  gameStarted: boolean;
  
  error: string | null;
  
  isJoiningRoom: boolean;
  isUpdatingSettings: boolean;
}

const initialState: GameRoomState = {
  roomId: null,
  roomStatus: 'lobby',
  players: [],
  currentPlayerId: null,
  maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
  gameMode: 'classic',
  settings: DEFAULT_SETTINGS,
  countdown: null,
  gameStarted: false,
  error: null,
  isJoiningRoom: false,
  isUpdatingSettings: false,
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
    
    joinRoomSuccess: (state, action: PayloadAction<{ players: Player[]; currentPlayerId: string; gameMode?: GameMode; settings?: GameSettings }>) => {
      state.isJoiningRoom = false;
      state.players = action.payload.players;
      state.currentPlayerId = action.payload.currentPlayerId;
      state.roomStatus = 'lobby';
      
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
    
    startGame: (state) => {
      state.gameStarted = true;
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
} = gameRoomSlice.actions;

export default gameRoomSlice.reducer;

export const selectGameRoom = (state: { gameRoom: GameRoomState }) => state.gameRoom;
export const selectRoomId = (state: { gameRoom: GameRoomState }) => state.gameRoom.roomId;
export const selectPlayers = (state: { gameRoom: GameRoomState }) => state.gameRoom.players;
export const selectCurrentPlayer = (state: { gameRoom: GameRoomState }) => {
  if (!state.gameRoom.currentPlayerId) return null;
  return state.gameRoom.players.find(p => p.id === state.gameRoom.currentPlayerId) || null;
};
export const selectIsHost = (state: { gameRoom: GameRoomState }) => {
  const currentPlayer = selectCurrentPlayer(state);
  return currentPlayer?.isHost ?? false;
};
export const selectGameMode = (state: { gameRoom: GameRoomState }) => state.gameRoom.gameMode;
export const selectGameSettings = (state: { gameRoom: GameRoomState }) => state.gameRoom.settings;
export const selectCanStartGame = (state: { gameRoom: GameRoomState }) => {
  return canStartGame(state.gameRoom.players);
};
export const selectCountdown = (state: { gameRoom: GameRoomState }) => state.gameRoom.countdown;
export const selectGameStarted = (state: { gameRoom: GameRoomState }) => state.gameRoom.gameStarted;
export const selectRoomStatus = (state: { gameRoom: GameRoomState }) => state.gameRoom.roomStatus;
export const selectError = (state: { gameRoom: GameRoomState }) => state.gameRoom.error;

export const selectGameCreationData = (state: { gameRoom: GameRoomState }): GameCreationData | null => {
  const { roomId, gameMode, settings, players } = state.gameRoom;
  if (!roomId) return null;
  
  try {
    return prepareGameCreationData(roomId, gameMode, settings, players);
  } catch (error) {
    console.error('Failed to prepare game creation data:', error);
    return null;
  }
};
