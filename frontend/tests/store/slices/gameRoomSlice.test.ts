import gameRoomSlice, {
  joinRoom,
  joinRoomSuccess,
  joinRoomError,
  leaveRoom,
  addPlayer,
  removePlayer,
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
  updateRoomState,
  playerJoined,
  playerLeft,
  hostTransferred,
  roomError,
  setCurrentPlayerId,
  selectGameRoom,
  selectRoomId,
  selectPlayers,
  selectSpectators,
  selectHostId,
  selectBackendRoomState,
  selectCurrentPlayer,
  selectIsHost,
  selectIsSpectator,
  selectGameMode,
  selectGameSettings,
  selectCanStartGame,
  selectCountdown,
  selectGameStarted,
  selectGameId,
  selectRoomStatus,
  selectError,
  selectGameCreationData,
  GameRoomState,
  GameRoomStatus,
} from '../../../src/store/slices/gameRoomSlice';
import { GameMode } from '@shared/types/game';
import type { 
  Player, 
  GameSettings 
} from '@types/game.ts';
import { 
  DEFAULT_SETTINGS, 
  ROOM_CONFIG 
} from '@types/game.ts';
import type {
  RoomInfo,
  RoomState as BackendRoomState,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  HostTransferEvent,
  RoomErrorEvent,
  RoomPlayer
} from '@shared/types/room';

// Mock console.log to avoid test output noise
const originalConsole = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsole;
});

// Mock console.error for specific test cases
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Test data
const mockPlayer1: Player = {
  id: 'player-1',
  name: 'Alice',
  isHost: true,
  isReady: true,
};

const mockPlayer2: Player = {
  id: 'player-2',
  name: 'Bob',
  isHost: false,
  isReady: false,
};

const mockPlayer3: Player = {
  id: 'player-3',
  name: 'Charlie',
  isHost: false,
  isReady: true,
};

const mockSettings: GameSettings = {
  gameMode: GameMode.Classic,
  gravity: 2,
  ghostPiece: false,
  boardWidth: 12,
  boardHeight: 22,
  nextPieceCount: 5,
};

const mockRoomPlayer1: RoomPlayer = {
  id: 'player-1',
  name: 'Alice',
  isHost: true,
  isReady: true,
  isSpectator: false,
};

const mockRoomPlayer2: RoomPlayer = {
  id: 'player-2',
  name: 'Bob',
  isHost: false,
  isReady: false,
  isSpectator: false,
};

const mockSpectator: RoomPlayer = {
  id: 'spectator-1',
  name: 'Spectator',
  isHost: false,
  isReady: false,
  isSpectator: true,
};

const mockRoomInfo: RoomInfo = {
  id: 'room-123',
  state: 'waiting' as BackendRoomState,
  players: [mockRoomPlayer1, mockRoomPlayer2],
  spectators: [mockSpectator],
  hostId: 'player-1',
  maxPlayers: 4,
  createdAt: new Date(),
};

describe('gameRoomSlice', () => {
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

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(gameRoomSlice(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('reducers', () => {
    describe('joinRoom', () => {
      it('should set joining state and room info', () => {
        const result = gameRoomSlice(initialState, joinRoom({ 
          roomId: 'room-123', 
          playerName: 'Alice' 
        }));
        
        expect(result.isJoiningRoom).toBe(true);
        expect(result.error).toBeNull();
        expect(result.roomId).toBe('room-123');
      });

      it('should clear previous error', () => {
        const stateWithError = { ...initialState, error: 'Previous error' };
        const result = gameRoomSlice(stateWithError, joinRoom({ 
          roomId: 'room-123', 
          playerName: 'Alice' 
        }));
        
        expect(result.error).toBeNull();
      });
    });

    describe('joinRoomSuccess', () => {
      it('should set room data and clear joining state', () => {
        const joiningState = { 
          ...initialState, 
          isJoiningRoom: true, 
          roomId: 'room-123' 
        };
        
        const result = gameRoomSlice(joiningState, joinRoomSuccess({
          players: [mockPlayer1, mockPlayer2],
          currentPlayerId: 'player-1',
        }));
        
        expect(result.isJoiningRoom).toBe(false);
        expect(result.players).toEqual([mockPlayer1, mockPlayer2]);
        expect(result.currentPlayerId).toBe('player-1');
        expect(result.roomStatus).toBe('lobby');
      });

      it('should handle optional parameters', () => {
        const result = gameRoomSlice(initialState, joinRoomSuccess({
          roomId: 'new-room-123',
          players: [mockPlayer1],
          currentPlayerId: 'player-1',
          gameMode: GameMode.Sprint,
          settings: mockSettings,
        }));
        
        expect(result.roomId).toBe('new-room-123');
        expect(result.gameMode).toBe(GameMode.Sprint);
        expect(result.settings).toEqual(mockSettings);
      });

      it('should work with minimal payload', () => {
        const result = gameRoomSlice(initialState, joinRoomSuccess({
          players: [],
          currentPlayerId: 'player-1',
        }));
        
        expect(result.players).toEqual([]);
        expect(result.currentPlayerId).toBe('player-1');
        expect(result.roomStatus).toBe('lobby');
      });
    });

    describe('joinRoomError', () => {
      it('should set error state', () => {
        const joiningState = { ...initialState, isJoiningRoom: true };
        const result = gameRoomSlice(joiningState, joinRoomError('Room not found'));
        
        expect(result.isJoiningRoom).toBe(false);
        expect(result.error).toBe('Room not found');
        expect(result.roomStatus).toBe('error');
      });
    });

    describe('leaveRoom', () => {
      it('should reset to initial state', () => {
        const modifiedState: GameRoomState = {
          ...initialState,
          roomId: 'room-123',
          players: [mockPlayer1],
          gameStarted: true,
          error: 'Some error',
        };
        
        const result = gameRoomSlice(modifiedState, leaveRoom());
        expect(result).toEqual(initialState);
      });
    });

    describe('addPlayer', () => {
      it('should add new player', () => {
        const result = gameRoomSlice(initialState, addPlayer(mockPlayer1));
        expect(result.players).toContain(mockPlayer1);
        expect(result.players).toHaveLength(1);
      });

      it('should not add duplicate player', () => {
        const stateWithPlayer = { ...initialState, players: [mockPlayer1] };
        const result = gameRoomSlice(stateWithPlayer, addPlayer(mockPlayer1));
        expect(result.players).toHaveLength(1);
        expect(result.players[0]).toBe(mockPlayer1);
      });

      it('should add multiple different players', () => {
        let state = gameRoomSlice(initialState, addPlayer(mockPlayer1));
        state = gameRoomSlice(state, addPlayer(mockPlayer2));
        
        expect(state.players).toHaveLength(2);
        expect(state.players).toContain(mockPlayer1);
        expect(state.players).toContain(mockPlayer2);
      });
    });

    describe('removePlayer', () => {
      it('should remove player by id', () => {
        const stateWithPlayers = { 
          ...initialState, 
          players: [mockPlayer1, mockPlayer2] 
        };
        
        const result = gameRoomSlice(stateWithPlayers, removePlayer('player-1'));
        expect(result.players).toHaveLength(1);
        expect(result.players[0]).toBe(mockPlayer2);
      });

      it('should handle removing non-existent player', () => {
        const stateWithPlayers = { 
          ...initialState, 
          players: [mockPlayer1] 
        };
        
        const result = gameRoomSlice(stateWithPlayers, removePlayer('non-existent'));
        expect(result.players).toEqual([mockPlayer1]);
      });

      it('should handle empty player list', () => {
        const result = gameRoomSlice(initialState, removePlayer('player-1'));
        expect(result.players).toEqual([]);
      });
    });

    describe('updatePlayerReady', () => {
      it('should update player ready status', () => {
        const stateWithPlayers = { 
          ...initialState, 
          players: [mockPlayer1, mockPlayer2] 
        };
        
        const result = gameRoomSlice(stateWithPlayers, updatePlayerReady({
          playerId: 'player-2',
          isReady: true,
        }));
        
        const updatedPlayer = result.players.find(p => p.id === 'player-2');
        expect(updatedPlayer?.isReady).toBe(true);
      });

      it('should handle non-existent player', () => {
        const stateWithPlayers = { 
          ...initialState, 
          players: [mockPlayer1] 
        };
        
        const result = gameRoomSlice(stateWithPlayers, updatePlayerReady({
          playerId: 'non-existent',
          isReady: true,
        }));
        
        expect(result.players).toEqual([mockPlayer1]);
      });

      it('should toggle ready status', () => {
        const stateWithPlayers = { 
          ...initialState, 
          players: [{ ...mockPlayer2, isReady: true }] 
        };
        
        const result = gameRoomSlice(stateWithPlayers, updatePlayerReady({
          playerId: 'player-2',
          isReady: false,
        }));
        
        const updatedPlayer = result.players.find(p => p.id === 'player-2');
        expect(updatedPlayer?.isReady).toBe(false);
      });
    });

    describe('updateGameMode', () => {
      it('should update game mode and settings', () => {
        const result = gameRoomSlice(initialState, updateGameMode(GameMode.Sprint));
        
        expect(result.gameMode).toBe(GameMode.Sprint);
        expect(result.settings.gameMode).toBe(GameMode.Sprint);
      });

      it('should change from one mode to another', () => {
        const stateWithMode = { 
          ...initialState, 
          gameMode: GameMode.Classic,
          settings: { ...DEFAULT_SETTINGS, gameMode: GameMode.Classic }
        };
        
        const result = gameRoomSlice(stateWithMode, updateGameMode(GameMode.Invisible));
        
        expect(result.gameMode).toBe(GameMode.Invisible);
        expect(result.settings.gameMode).toBe(GameMode.Invisible);
      });
    });

    describe('updateSettings', () => {
      it('should merge partial settings', () => {
        const result = gameRoomSlice(initialState, updateSettings({
          gravity: 3,
          boardWidth: 15,
        }));
        
        expect(result.settings.gravity).toBe(3);
        expect(result.settings.boardWidth).toBe(15);
        expect(result.settings.ghostPiece).toBe(DEFAULT_SETTINGS.ghostPiece); // unchanged
      });

      it('should override existing settings', () => {
        const stateWithCustomSettings = {
          ...initialState,
          settings: { ...DEFAULT_SETTINGS, gravity: 5, ghostPiece: false }
        };
        
        const result = gameRoomSlice(stateWithCustomSettings, updateSettings({
          gravity: 1,
          ghostPiece: true,
        }));
        
        expect(result.settings.gravity).toBe(1);
        expect(result.settings.ghostPiece).toBe(true);
      });
    });

    describe('updateSetting', () => {
      it('should update single setting by key', () => {
        const result = gameRoomSlice(initialState, updateSetting({
          key: 'gravity',
          value: 4,
        }));
        
        expect(result.settings.gravity).toBe(4);
      });

      it('should update boolean setting', () => {
        const result = gameRoomSlice(initialState, updateSetting({
          key: 'ghostPiece',
          value: false,
        }));
        
        expect(result.settings.ghostPiece).toBe(false);
      });

      it('should preserve other settings', () => {
        const result = gameRoomSlice(initialState, updateSetting({
          key: 'boardWidth',
          value: 8,
        }));
        
        expect(result.settings.boardWidth).toBe(8);
        expect(result.settings.gravity).toBe(DEFAULT_SETTINGS.gravity);
        expect(result.settings.ghostPiece).toBe(DEFAULT_SETTINGS.ghostPiece);
      });
    });

    describe('resetSettings', () => {
      it('should reset to default settings', () => {
        const stateWithCustomSettings = {
          ...initialState,
          settings: mockSettings
        };
        
        const result = gameRoomSlice(stateWithCustomSettings, resetSettings());
        expect(result.settings).toEqual(DEFAULT_SETTINGS);
      });

      it('should work when already at defaults', () => {
        const result = gameRoomSlice(initialState, resetSettings());
        expect(result.settings).toEqual(DEFAULT_SETTINGS);
      });
    });

    describe('countdown actions', () => {
      describe('startCountdown', () => {
        it('should start countdown with default duration', () => {
          const result = gameRoomSlice(initialState, startCountdown());
          
          expect(result.countdown).toBe(ROOM_CONFIG.COUNTDOWN_DURATION);
          expect(result.roomStatus).toBe('countdown');
        });
      });

      describe('updateCountdown', () => {
        it('should update countdown value', () => {
          const countdownState = { 
            ...initialState, 
            countdown: 3, 
            roomStatus: 'countdown' as GameRoomStatus 
          };
          
          const result = gameRoomSlice(countdownState, updateCountdown(2));
          expect(result.countdown).toBe(2);
          expect(result.roomStatus).toBe('countdown');
        });

        it('should start game when countdown reaches zero', () => {
          const countdownState = { 
            ...initialState, 
            countdown: 1, 
            roomStatus: 'countdown' as GameRoomStatus 
          };
          
          const result = gameRoomSlice(countdownState, updateCountdown(0));
          expect(result.countdown).toBeNull();
          expect(result.gameStarted).toBe(true);
          expect(result.roomStatus).toBe('playing');
        });

        it('should start game when countdown goes negative', () => {
          const countdownState = { 
            ...initialState, 
            countdown: 1, 
            roomStatus: 'countdown' as GameRoomStatus 
          };
          
          const result = gameRoomSlice(countdownState, updateCountdown(-1));
          expect(result.countdown).toBeNull();
          expect(result.gameStarted).toBe(true);
          expect(result.roomStatus).toBe('playing');
        });
      });

      describe('cancelCountdown', () => {
        it('should cancel countdown and return to lobby', () => {
          const countdownState = { 
            ...initialState, 
            countdown: 2, 
            roomStatus: 'countdown' as GameRoomStatus 
          };
          
          const result = gameRoomSlice(countdownState, cancelCountdown());
          expect(result.countdown).toBeNull();
          expect(result.roomStatus).toBe('lobby');
        });
      });
    });

    describe('game lifecycle actions', () => {
      describe('startGame', () => {
        it('should start game with optional game ID', () => {
          const result = gameRoomSlice(initialState, startGame({ gameId: 'game-123' }));
          
          expect(result.gameStarted).toBe(true);
          expect(result.gameId).toBe('game-123');
          expect(result.countdown).toBeNull();
          expect(result.roomStatus).toBe('playing');
        });

        it('should start game without game ID', () => {
          const result = gameRoomSlice(initialState, startGame({}));
          
          expect(result.gameStarted).toBe(true);
          expect(result.gameId).toBeNull();
          expect(result.roomStatus).toBe('playing');
        });
      });

      describe('endGame', () => {
        it('should end game and reset non-host players ready status', () => {
          const gameState = {
            ...initialState,
            gameStarted: true,
            gameId: 'game-123',
            countdown: null,
            roomStatus: 'playing' as GameRoomStatus,
            players: [
              { ...mockPlayer1, isReady: true }, // host
              { ...mockPlayer2, isReady: true }, // non-host
              { ...mockPlayer3, isReady: true }, // non-host
            ]
          };
          
          const result = gameRoomSlice(gameState, endGame());
          
          expect(result.gameStarted).toBe(false);
          expect(result.countdown).toBeNull();
          expect(result.roomStatus).toBe('finished');
          
          const hostPlayer = result.players.find(p => p.isHost);
          const nonHostPlayers = result.players.filter(p => !p.isHost);
          
          expect(hostPlayer?.isReady).toBe(true); // host stays ready
          nonHostPlayers.forEach(player => {
            expect(player.isReady).toBe(false); // non-hosts reset to not ready
          });
        });
      });

      describe('resetToLobby', () => {
        it('should reset game state to lobby', () => {
          const gameState = {
            ...initialState,
            gameStarted: true,
            countdown: 2,
            roomStatus: 'playing' as GameRoomStatus,
          };
          
          const result = gameRoomSlice(gameState, resetToLobby());
          
          expect(result.gameStarted).toBe(false);
          expect(result.countdown).toBeNull();
          expect(result.roomStatus).toBe('lobby');
        });
      });
    });

    describe('error handling', () => {
      describe('setError', () => {
        it('should set error message and status', () => {
          const result = gameRoomSlice(initialState, setError('Connection failed'));
          
          expect(result.error).toBe('Connection failed');
          expect(result.roomStatus).toBe('error');
        });
      });

      describe('clearError', () => {
        it('should clear error and reset status from error to lobby', () => {
          const errorState = {
            ...initialState,
            error: 'Network error',
            roomStatus: 'error' as GameRoomStatus,
          };
          
          const result = gameRoomSlice(errorState, clearError());
          
          expect(result.error).toBeNull();
          expect(result.roomStatus).toBe('lobby');
        });

        it('should clear error without changing non-error status', () => {
          const playingState = {
            ...initialState,
            error: 'Old error',
            roomStatus: 'playing' as GameRoomStatus,
          };
          
          const result = gameRoomSlice(playingState, clearError());
          
          expect(result.error).toBeNull();
          expect(result.roomStatus).toBe('playing');
        });
      });
    });

    describe('setUpdatingSettings', () => {
      it('should set updating settings flag', () => {
        const result = gameRoomSlice(initialState, setUpdatingSettings(true));
        expect(result.isUpdatingSettings).toBe(true);
      });

      it('should clear updating settings flag', () => {
        const updatingState = { ...initialState, isUpdatingSettings: true };
        const result = gameRoomSlice(updatingState, setUpdatingSettings(false));
        expect(result.isUpdatingSettings).toBe(false);
      });
    });

    describe('room management actions', () => {
      describe('updateRoomState', () => {
        it('should update room state from backend', () => {
          const stateWithCurrentPlayer = {
            ...initialState,
            currentPlayerId: 'player-1',
          };
          
          const result = gameRoomSlice(stateWithCurrentPlayer, updateRoomState(mockRoomInfo));
          
          expect(result.roomId).toBe('room-123');
          expect(result.backendRoomState).toBe('waiting');
          expect(result.hostId).toBe('player-1');
          expect(result.maxPlayers).toBe(4);
          expect(result.roomStatus).toBe('lobby');
          expect(result.gameStarted).toBe(false);
          expect(result.isHost).toBe(true);
          expect(result.isSpectator).toBe(false);
        });

        it('should convert backend players to frontend players', () => {
          const result = gameRoomSlice(initialState, updateRoomState(mockRoomInfo));
          
          expect(result.players).toHaveLength(2);
          expect(result.players[0]).toEqual({
            id: 'player-1',
            name: 'Alice',
            isHost: true,
            isReady: true,
          });
          expect(result.players[1]).toEqual({
            id: 'player-2',
            name: 'Bob',
            isHost: false,
            isReady: false,
          });
        });

        it('should convert spectators correctly', () => {
          const result = gameRoomSlice(initialState, updateRoomState(mockRoomInfo));
          
          expect(result.spectators).toHaveLength(1);
          expect(result.spectators[0]).toEqual({
            id: 'spectator-1',
            name: 'Spectator',
            isHost: false,
            isReady: false,
          });
        });

        it('should handle different backend states', () => {
          const playingRoomInfo = {
            ...mockRoomInfo,
            state: 'playing' as BackendRoomState,
          };
          
          const result = gameRoomSlice(initialState, updateRoomState(playingRoomInfo));
          
          expect(result.roomStatus).toBe('playing');
          expect(result.gameStarted).toBe(true);
        });

        it('should handle ended state', () => {
          const endedRoomInfo = {
            ...mockRoomInfo,
            state: 'ended' as BackendRoomState,
          };
          
          const result = gameRoomSlice(initialState, updateRoomState(endedRoomInfo));
          
          expect(result.roomStatus).toBe('finished');
          expect(result.gameStarted).toBe(false);
        });
      });

      describe('playerJoined', () => {
        it('should add player to players list', () => {
          const joinEvent: PlayerJoinedEvent = {
            roomId: 'room-123',
            player: mockRoomPlayer2,
            isSpectator: false,
          };
          
          const result = gameRoomSlice(initialState, playerJoined(joinEvent));
          
          expect(result.players).toHaveLength(1);
          expect(result.players[0]).toEqual({
            id: 'player-2',
            name: 'Bob',
            isHost: false,
            isReady: false,
          });
        });

        it('should add spectator to spectators list', () => {
          const joinEvent: PlayerJoinedEvent = {
            roomId: 'room-123',
            player: mockSpectator,
            isSpectator: true,
          };
          
          const result = gameRoomSlice(initialState, playerJoined(joinEvent));
          
          expect(result.spectators).toHaveLength(1);
          expect(result.spectators[0]).toEqual({
            id: 'spectator-1',
            name: 'Spectator',
            isHost: false,
            isReady: false,
          });
        });

        it('should not add duplicate player', () => {
          const stateWithPlayer = {
            ...initialState,
            players: [{ id: 'player-2', name: 'Bob', isHost: false, isReady: false }],
          };
          
          const joinEvent: PlayerJoinedEvent = {
            roomId: 'room-123',
            player: mockRoomPlayer2,
            isSpectator: false,
          };
          
          const result = gameRoomSlice(stateWithPlayer, playerJoined(joinEvent));
          
          expect(result.players).toHaveLength(1);
        });
      });

      describe('playerLeft', () => {
        it('should remove player from players list', () => {
          const stateWithPlayers = {
            ...initialState,
            players: [
              { id: 'player-1', name: 'Alice', isHost: true, isReady: true },
              { id: 'player-2', name: 'Bob', isHost: false, isReady: false },
            ],
          };
          
          const leftEvent: PlayerLeftEvent = {
            roomId: 'room-123',
            playerId: 'player-2',
          };
          
          const result = gameRoomSlice(stateWithPlayers, playerLeft(leftEvent));
          
          expect(result.players).toHaveLength(1);
          expect(result.players[0].id).toBe('player-1');
        });

        it('should remove spectator from spectators list', () => {
          const stateWithSpectators = {
            ...initialState,
            spectators: [
              { id: 'spectator-1', name: 'Spec1', isHost: false, isReady: false },
              { id: 'spectator-2', name: 'Spec2', isHost: false, isReady: false },
            ],
          };
          
          const leftEvent: PlayerLeftEvent = {
            roomId: 'room-123',
            playerId: 'spectator-1',
          };
          
          const result = gameRoomSlice(stateWithSpectators, playerLeft(leftEvent));
          
          expect(result.spectators).toHaveLength(1);
          expect(result.spectators[0].id).toBe('spectator-2');
        });
      });

      describe('hostTransferred', () => {
        it('should update host status for all players', () => {
          const stateWithPlayers = {
            ...initialState,
            players: [
              { id: 'player-1', name: 'Alice', isHost: true, isReady: true },
              { id: 'player-2', name: 'Bob', isHost: false, isReady: false },
            ],
            currentPlayerId: 'player-2',
          };
          
          const transferEvent: HostTransferEvent = {
            roomId: 'room-123',
            newHostId: 'player-2',
          };
          
          const result = gameRoomSlice(stateWithPlayers, hostTransferred(transferEvent));
          
          expect(result.hostId).toBe('player-2');
          expect(result.isHost).toBe(true);
          
          const oldHost = result.players.find(p => p.id === 'player-1');
          const newHost = result.players.find(p => p.id === 'player-2');
          
          expect(oldHost?.isHost).toBe(false);
          expect(newHost?.isHost).toBe(true);
        });
      });

      describe('roomError', () => {
        it('should set error from room error event', () => {
          const joiningState = { ...initialState, isJoiningRoom: true };
          
          const errorEvent: RoomErrorEvent = {
            roomId: 'room-123',
            error: 'Room is full',
            code: 'ROOM_FULL',
          };
          
          const result = gameRoomSlice(joiningState, roomError(errorEvent));
          
          expect(result.error).toBe('Room is full');
          expect(result.roomStatus).toBe('error');
          expect(result.isJoiningRoom).toBe(false);
        });
      });

      describe('setCurrentPlayerId', () => {
        it('should set current player ID', () => {
          const result = gameRoomSlice(initialState, setCurrentPlayerId('player-123'));
          expect(result.currentPlayerId).toBe('player-123');
        });
      });
    });
  });

  describe('selectors', () => {
    const mockState = {
      gameRoom: {
        ...initialState,
        roomId: 'room-123',
        players: [mockPlayer1, mockPlayer2],
        spectators: [{ id: 'spectator-1', name: 'Spectator', isHost: false, isReady: false }],
        currentPlayerId: 'player-1',
        hostId: 'player-1',
        isHost: true,
        isSpectator: false,
        gameMode: GameMode.Sprint,
        settings: mockSettings,
        countdown: 3,
        gameStarted: true,
        gameId: 'game-456',
        roomStatus: 'playing' as GameRoomStatus,
        error: 'Test error',
        backendRoomState: 'playing' as BackendRoomState,
      },
    };

    it('should select entire game room state', () => {
      const result = selectGameRoom(mockState);
      expect(result).toBe(mockState.gameRoom);
    });

    it('should select room ID', () => {
      expect(selectRoomId(mockState)).toBe('room-123');
    });

    it('should select players', () => {
      expect(selectPlayers(mockState)).toEqual([mockPlayer1, mockPlayer2]);
    });

    it('should select spectators', () => {
      expect(selectSpectators(mockState)).toHaveLength(1);
    });

    it('should select host ID', () => {
      expect(selectHostId(mockState)).toBe('player-1');
    });

    it('should select backend room state', () => {
      expect(selectBackendRoomState(mockState)).toBe('playing');
    });

    it('should select current player', () => {
      const result = selectCurrentPlayer(mockState);
      expect(result).toEqual(mockPlayer1);
    });

    it('should return null for current player when not found', () => {
      const stateWithoutCurrentPlayer = {
        gameRoom: { ...mockState.gameRoom, currentPlayerId: null },
      };
      expect(selectCurrentPlayer(stateWithoutCurrentPlayer)).toBeNull();
    });

    it('should select host status', () => {
      expect(selectIsHost(mockState)).toBe(true);
    });

    it('should select spectator status', () => {
      expect(selectIsSpectator(mockState)).toBe(false);
    });

    it('should select game mode', () => {
      expect(selectGameMode(mockState)).toBe(GameMode.Sprint);
    });

    it('should select game settings', () => {
      expect(selectGameSettings(mockState)).toEqual(mockSettings);
    });

    it('should select countdown', () => {
      expect(selectCountdown(mockState)).toBe(3);
    });

    it('should select game started status', () => {
      expect(selectGameStarted(mockState)).toBe(true);
    });

    it('should select game ID', () => {
      expect(selectGameId(mockState)).toBe('game-456');
    });

    it('should select room status', () => {
      expect(selectRoomStatus(mockState)).toBe('playing');
    });

    it('should select error', () => {
      expect(selectError(mockState)).toBe('Test error');
    });

    describe('selectCanStartGame', () => {
      it('should return true when host and all players ready', () => {
        const readyState = {
          gameRoom: {
            ...initialState,
            isHost: true,
            players: [
              { ...mockPlayer1, isReady: true },
              { ...mockPlayer2, isReady: true },
            ],
          },
        };
        
        expect(selectCanStartGame(readyState)).toBe(true);
      });

      it('should return false when not host', () => {
        const nonHostState = {
          gameRoom: {
            ...initialState,
            isHost: false,
            players: [mockPlayer1, mockPlayer2],
          },
        };
        
        expect(selectCanStartGame(nonHostState)).toBe(false);
      });
    });

    describe('selectGameCreationData', () => {
      it('should return game creation data when valid', () => {
        const validState = {
          gameRoom: {
            ...initialState,
            roomId: 'room-123',
            gameMode: GameMode.Classic,
            settings: DEFAULT_SETTINGS,
            players: [mockPlayer1],
          },
        };
        
        const result = selectGameCreationData(validState);
        expect(result).not.toBeNull();
        expect(result?.roomId).toBe('room-123');
        expect(result?.hostPlayerId).toBe('player-1');
      });

      it('should return null when no room ID', () => {
        const stateWithoutRoom = {
          gameRoom: {
            ...initialState,
            roomId: null,
            players: [mockPlayer1],
          },
        };
        
        expect(selectGameCreationData(stateWithoutRoom)).toBeNull();
      });

      it('should return null when no players', () => {
        const stateWithoutPlayers = {
          gameRoom: {
            ...initialState,
            roomId: 'room-123',
            players: [],
          },
        };
        
        expect(selectGameCreationData(stateWithoutPlayers)).toBeNull();
      });

      it('should return null when no host player', () => {
        const stateWithoutHost = {
          gameRoom: {
            ...initialState,
            roomId: 'room-123',
            players: [{ ...mockPlayer2, isHost: false }],
          },
        };
        
        expect(selectGameCreationData(stateWithoutHost)).toBeNull();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete room join and setup flow', () => {
      let state = initialState;
      
      // Join room
      state = gameRoomSlice(state, joinRoom({ roomId: 'room-123', playerName: 'Alice' }));
      expect(state.isJoiningRoom).toBe(true);
      
      // Join success
      state = gameRoomSlice(state, joinRoomSuccess({
        players: [mockPlayer1],
        currentPlayerId: 'player-1',
      }));
      expect(state.isJoiningRoom).toBe(false);
      expect(state.players).toHaveLength(1);
      
      // Update settings
      state = gameRoomSlice(state, updateGameMode(GameMode.Sprint));
      expect(state.gameMode).toBe(GameMode.Sprint);
      
      // Start countdown
      state = gameRoomSlice(state, startCountdown());
      expect(state.roomStatus).toBe('countdown');
      
      // Complete countdown and start game
      state = gameRoomSlice(state, updateCountdown(0));
      expect(state.gameStarted).toBe(true);
      expect(state.roomStatus).toBe('playing');
      
      // End game
      state = gameRoomSlice(state, endGame());
      expect(state.gameStarted).toBe(false);
      expect(state.roomStatus).toBe('finished');
      
      // Leave room
      state = gameRoomSlice(state, leaveRoom());
      expect(state).toEqual(initialState);
    });

    it('should handle error recovery flow', () => {
      let state = initialState;
      
      // Join room
      state = gameRoomSlice(state, joinRoom({ roomId: 'room-123', playerName: 'Alice' }));
      
      // Join fails
      state = gameRoomSlice(state, joinRoomError('Room not found'));
      expect(state.roomStatus).toBe('error');
      expect(state.error).toBe('Room not found');
      
      // Clear error and retry
      state = gameRoomSlice(state, clearError());
      expect(state.roomStatus).toBe('lobby');
      expect(state.error).toBeNull();
    });

    it('should maintain immutability', () => {
      const state = { ...initialState };
      const newState = gameRoomSlice(state, addPlayer(mockPlayer1));
      
      expect(newState).not.toBe(state);
      expect(state).toEqual(initialState); // original unchanged
      expect(newState.players).toContain(mockPlayer1);
    });
  });

  afterEach(() => {
    mockConsoleError.mockClear();
  });
});
