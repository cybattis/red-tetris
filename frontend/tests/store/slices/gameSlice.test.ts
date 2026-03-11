import gameSlice, {
  initializeGame,
  updateGameState,
  updateOpponentSpectrum,
  eliminateOpponent,
  addPendingPenalty,
  clearPendingPenalty,
  setPaused,
  togglePause,
  gameOver,
  gameEnded,
  setClearingRows,
  clearClearingRows,
  setPenaltyRows,
  clearPenaltyRows,
  handleAnimation,
  clearLockedCells,
  clearHardDropTrail,
  resetGame,
  selectBoard,
  selectCurrentPiece,
  selectGhostPiece,
  selectNextPieces,
  selectScore,
  selectLevel,
  selectLinesCleared,
  selectTotalLinesCleared,
  selectIsPaused,
  selectIsGameOver,
  selectGameOverReason,
  selectOpponents,
  selectPendingPenaltyLines,
  selectBoardDimensions,
  selectClearingRows,
  selectPenaltyRows,
  selectLockedCells,
  selectHardDropTrail,
  GameState,
  PieceState,
  PlayerGameState,
  GameStateUpdate,
} from '../../../src/store/slices/gameSlice';

// Mock console.log to avoid test output noise
const originalConsole = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsole;
});

// Test data
const mockPiece: PieceState = {
  type: 1,
  position: { x: 4, y: 0 },
  shape: [
    [1, 1, 1, 1]
  ],
  rotation: 0,
};

const mockGhostPiece: PieceState = {
  type: 1,
  position: { x: 4, y: 18 },
  shape: [
    [1, 1, 1, 1]
  ],
  rotation: 0,
};

const mockOpponent1: PlayerGameState = {
  playerId: 'player-2',
  playerName: 'Alice',
  spectrum: [5, 3, 7, 2, 8, 1, 6, 4, 9, 0],
  score: 1500,
  isEliminated: false,
};

const mockOpponent2: PlayerGameState = {
  playerId: 'player-3',
  playerName: 'Bob',
  spectrum: [2, 4, 1, 8, 3, 9, 5, 7, 0, 6],
  score: 2000,
  isEliminated: false,
};

const mockBoard = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
];

const createEmptyBoard = (width: number, height: number): number[][] => {
  return Array.from({ length: height }, () => Array(width).fill(0));
};

describe('gameSlice', () => {
  const initialState: GameState = {
    board: createEmptyBoard(10, 20),
    boardWidth: 10,
    boardHeight: 20,
    currentPiece: null,
    ghostPiece: null,
    nextPieces: [],
    score: 0,
    level: 1,
    linesCleared: 0,
    totalLinesCleared: 0,
    isPaused: false,
    isGameOver: false,
    gameOverReason: null,
    opponents: [],
    pendingPenaltyLines: 0,
    clearingRows: [],
    penaltyRows: [],
    lockedCells: [],
    hardDropTrail: [],
    lastAnimationTimestamp: {},
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(gameSlice(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should have correct default board dimensions', () => {
      const state = gameSlice(undefined, { type: 'unknown' });
      expect(state.boardWidth).toBe(10);
      expect(state.boardHeight).toBe(20);
      expect(state.board).toHaveLength(20);
      expect(state.board[0]).toHaveLength(10);
    });

    it('should initialize with empty board cells', () => {
      const state = gameSlice(undefined, { type: 'unknown' });
      state.board.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBe(0);
        });
      });
    });
  });

  describe('reducers', () => {
    describe('initializeGame', () => {
      it('should initialize game with custom board dimensions', () => {
        const result = gameSlice(initialState, initializeGame({
          boardWidth: 12,
          boardHeight: 25,
        }));

        expect(result.boardWidth).toBe(12);
        expect(result.boardHeight).toBe(25);
        expect(result.board).toHaveLength(25);
        expect(result.board[0]).toHaveLength(12);
      });

      it('should initialize with next pieces', () => {
        const nextPieces = [1, 2, 3, 4, 5];
        const result = gameSlice(initialState, initializeGame({
          boardWidth: 10,
          boardHeight: 20,
          nextPieces,
        }));

        expect(result.nextPieces).toEqual(nextPieces);
      });

      it('should reset all game state to initial values', () => {
        const gameInProgress = {
          ...initialState,
          currentPiece: mockPiece,
          score: 5000,
          level: 5,
          linesCleared: 10,
          totalLinesCleared: 25,
          isPaused: true,
          isGameOver: true,
          gameOverReason: 'Game Over',
          opponents: [mockOpponent1],
          pendingPenaltyLines: 3,
        };

        const result = gameSlice(gameInProgress, initializeGame({
          boardWidth: 10,
          boardHeight: 20,
        }));

        expect(result.currentPiece).toBeNull();
        expect(result.ghostPiece).toBeNull();
        expect(result.score).toBe(0);
        expect(result.level).toBe(1);
        expect(result.linesCleared).toBe(0);
        expect(result.totalLinesCleared).toBe(0);
        expect(result.isPaused).toBe(false);
        expect(result.isGameOver).toBe(false);
        expect(result.gameOverReason).toBeNull();
        expect(result.opponents).toEqual([]);
        expect(result.pendingPenaltyLines).toBe(0);
      });

      it('should create empty board with correct dimensions', () => {
        const result = gameSlice(initialState, initializeGame({
          boardWidth: 8,
          boardHeight: 15,
        }));

        expect(result.board).toHaveLength(15);
        result.board.forEach(row => {
          expect(row).toHaveLength(8);
          row.forEach(cell => expect(cell).toBe(0));
        });
      });
    });

    describe('updateGameState', () => {
      it('should update board state', () => {
        const update: GameStateUpdate = {
          board: mockBoard,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.board).toBe(mockBoard);
      });

      it('should update current piece', () => {
        const update: GameStateUpdate = {
          currentPiece: mockPiece,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.currentPiece).toEqual(mockPiece);
      });

      it('should update ghost piece', () => {
        const update: GameStateUpdate = {
          ghostPiece: mockGhostPiece,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.ghostPiece).toEqual(mockGhostPiece);
      });

      it('should update next pieces queue', () => {
        const nextPieces = [2, 4, 1, 3];
        const update: GameStateUpdate = {
          nextPieces,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.nextPieces).toEqual(nextPieces);
      });

      it('should update score and level', () => {
        const update: GameStateUpdate = {
          score: 12500,
          level: 8,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.score).toBe(12500);
        expect(result.level).toBe(8);
      });

      it('should update lines cleared', () => {
        const update: GameStateUpdate = {
          linesCleared: 4,
          totalLinesCleared: 50,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.linesCleared).toBe(4);
        expect(result.totalLinesCleared).toBe(50);
      });

      it('should update board dimensions', () => {
        const update: GameStateUpdate = {
          boardWidth: 12,
          boardHeight: 25,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.boardWidth).toBe(12);
        expect(result.boardHeight).toBe(25);
      });

      it('should update game over state', () => {
        const update: GameStateUpdate = {
          isGameOver: true,
          gameOverReason: 'Top out',
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.isGameOver).toBe(true);
        expect(result.gameOverReason).toBe('Top out');
      });

      it('should update pause state', () => {
        const update: GameStateUpdate = {
          isPaused: true,
        };

        const result = gameSlice(initialState, updateGameState(update));
        expect(result.isPaused).toBe(true);
      });

      it('should handle partial updates', () => {
        const stateWithData = {
          ...initialState,
          score: 1000,
          level: 2,
          board: mockBoard,
        };

        const update: GameStateUpdate = {
          score: 1500, // Only update score
        };

        const result = gameSlice(stateWithData, updateGameState(update));
        expect(result.score).toBe(1500);
        expect(result.level).toBe(2); // unchanged
        expect(result.board).toBe(mockBoard); // unchanged
      });

      it('should handle undefined values correctly', () => {
        const update: GameStateUpdate = {
          currentPiece: undefined,
          score: undefined,
          isPaused: undefined,
        };

        const result = gameSlice(initialState, updateGameState(update));
        // State should remain unchanged for undefined values
        expect(result).toEqual(initialState);
      });

      it('should handle null values correctly', () => {
        const stateWithPiece = { ...initialState, currentPiece: mockPiece };
        const update: GameStateUpdate = {
          currentPiece: null,
        };

        const result = gameSlice(stateWithPiece, updateGameState(update));
        expect(result.currentPiece).toBeNull();
      });
    });

    describe('updateOpponentSpectrum', () => {
      it('should add new opponent', () => {
        const result = gameSlice(initialState, updateOpponentSpectrum({
          playerId: 'player-2',
          playerName: 'Alice',
          spectrum: [1, 2, 3],
          score: 500,
        }));

        expect(result.opponents).toHaveLength(1);
        expect(result.opponents[0]).toEqual({
          playerId: 'player-2',
          playerName: 'Alice',
          spectrum: [1, 2, 3],
          score: 500,
          isEliminated: false,
        });
      });

      it('should update existing opponent', () => {
        const stateWithOpponent = {
          ...initialState,
          opponents: [mockOpponent1],
        };

        const result = gameSlice(stateWithOpponent, updateOpponentSpectrum({
          playerId: 'player-2',
          playerName: 'Alice Updated', // Name won't be updated for existing opponents
          spectrum: [5, 5, 5],
          score: 2500,
        }));

        expect(result.opponents).toHaveLength(1);
        expect(result.opponents[0].spectrum).toEqual([5, 5, 5]);
        expect(result.opponents[0].score).toBe(2500);
        expect(result.opponents[0].playerName).toBe('Alice'); // Name should remain unchanged
      });

      it('should handle multiple opponents', () => {
        let state = gameSlice(initialState, updateOpponentSpectrum({
          playerId: 'player-2',
          playerName: 'Alice',
          spectrum: [1, 2, 3],
          score: 500,
        }));

        state = gameSlice(state, updateOpponentSpectrum({
          playerId: 'player-3',
          playerName: 'Bob',
          spectrum: [4, 5, 6],
          score: 750,
        }));

        expect(state.opponents).toHaveLength(2);
        expect(state.opponents.find(o => o.playerId === 'player-2')).toBeDefined();
        expect(state.opponents.find(o => o.playerId === 'player-3')).toBeDefined();
      });
    });

    describe('eliminateOpponent', () => {
      it('should eliminate existing opponent', () => {
        const stateWithOpponents = {
          ...initialState,
          opponents: [mockOpponent1, mockOpponent2],
        };

        const result = gameSlice(stateWithOpponents, eliminateOpponent('player-2'));

        const eliminatedOpponent = result.opponents.find(o => o.playerId === 'player-2');
        const otherOpponent = result.opponents.find(o => o.playerId === 'player-3');

        expect(eliminatedOpponent?.isEliminated).toBe(true);
        expect(otherOpponent?.isEliminated).toBe(false);
      });

      it('should handle non-existent opponent', () => {
        const stateWithOpponents = {
          ...initialState,
          opponents: [mockOpponent1],
        };

        const result = gameSlice(stateWithOpponents, eliminateOpponent('non-existent'));

        expect(result.opponents).toEqual([mockOpponent1]);
        expect(result.opponents[0].isEliminated).toBe(false);
      });

      it('should work with empty opponents list', () => {
        const result = gameSlice(initialState, eliminateOpponent('player-2'));
        expect(result.opponents).toEqual([]);
      });
    });

    describe('penalty management', () => {
      describe('addPendingPenalty', () => {
        it('should add penalty lines', () => {
          const result = gameSlice(initialState, addPendingPenalty(2));
          expect(result.pendingPenaltyLines).toBe(2);
        });

        it('should accumulate penalty lines', () => {
          let state = gameSlice(initialState, addPendingPenalty(3));
          state = gameSlice(state, addPendingPenalty(2));

          expect(state.pendingPenaltyLines).toBe(5);
        });

        it('should handle zero penalty', () => {
          const result = gameSlice(initialState, addPendingPenalty(0));
          expect(result.pendingPenaltyLines).toBe(0);
        });
      });

      describe('clearPendingPenalty', () => {
        it('should clear penalty lines', () => {
          const stateWithPenalty = { ...initialState, pendingPenaltyLines: 5 };
          const result = gameSlice(stateWithPenalty, clearPendingPenalty());
          expect(result.pendingPenaltyLines).toBe(0);
        });

        it('should work when no penalty exists', () => {
          const result = gameSlice(initialState, clearPendingPenalty());
          expect(result.pendingPenaltyLines).toBe(0);
        });
      });
    });

    describe('pause management', () => {
      describe('setPaused', () => {
        it('should set pause state to true', () => {
          const result = gameSlice(initialState, setPaused(true));
          expect(result.isPaused).toBe(true);
        });

        it('should set pause state to false', () => {
          const pausedState = { ...initialState, isPaused: true };
          const result = gameSlice(pausedState, setPaused(false));
          expect(result.isPaused).toBe(false);
        });
      });

      describe('togglePause', () => {
        it('should toggle from false to true', () => {
          const result = gameSlice(initialState, togglePause());
          expect(result.isPaused).toBe(true);
        });

        it('should toggle from true to false', () => {
          const pausedState = { ...initialState, isPaused: true };
          const result = gameSlice(pausedState, togglePause());
          expect(result.isPaused).toBe(false);
        });

        it('should toggle multiple times correctly', () => {
          let state = gameSlice(initialState, togglePause());
          expect(state.isPaused).toBe(true);

          state = gameSlice(state, togglePause());
          expect(state.isPaused).toBe(false);

          state = gameSlice(state, togglePause());
          expect(state.isPaused).toBe(true);
        });
      });
    });

    describe('game over management', () => {
      describe('gameOver', () => {
        it('should set game over with reason', () => {
          const result = gameSlice(initialState, gameOver({ reason: 'Top out' }));

          expect(result.isGameOver).toBe(true);
          expect(result.gameOverReason).toBe('Top out');
        });

        it('should use default reason when not provided', () => {
          const result = gameSlice(initialState, gameOver({}));

          expect(result.isGameOver).toBe(true);
          expect(result.gameOverReason).toBe('Game Over');
        });

        it('should handle undefined reason', () => {
          const result = gameSlice(initialState, gameOver({ reason: undefined }));

          expect(result.isGameOver).toBe(true);
          expect(result.gameOverReason).toBe('Game Over');
        });
      });

      describe('gameEnded', () => {
        it('should end game and pause', () => {
          const result = gameSlice(initialState, gameEnded({
            gameId: 'game-123',
            reason: 'Player disconnected',
          }));

          expect(result.isGameOver).toBe(true);
          expect(result.gameOverReason).toBe('Player disconnected');
          expect(result.isPaused).toBe(true);
        });

        it('should work with different reasons', () => {
          const result = gameSlice(initialState, gameEnded({
            gameId: 'game-456',
            reason: 'Server error',
          }));

          expect(result.gameOverReason).toBe('Server error');
        });
      });
    });

    describe('animation management', () => {
      describe('row clearing animations', () => {
        describe('setClearingRows', () => {
          it('should set clearing rows', () => {
            const rows = [18, 19];
            const result = gameSlice(initialState, setClearingRows(rows));
            expect(result.clearingRows).toEqual(rows);
          });

          it('should replace existing clearing rows', () => {
            const stateWithRows = { ...initialState, clearingRows: [15, 16] };
            const newRows = [18, 19, 20];
            const result = gameSlice(stateWithRows, setClearingRows(newRows));
            expect(result.clearingRows).toEqual(newRows);
          });
        });

        describe('clearClearingRows', () => {
          it('should clear clearing rows', () => {
            const stateWithRows = { ...initialState, clearingRows: [18, 19] };
            const result = gameSlice(stateWithRows, clearClearingRows());
            expect(result.clearingRows).toEqual([]);
          });
        });
      });

      describe('penalty row animations', () => {
        describe('setPenaltyRows', () => {
          it('should set penalty rows', () => {
            const rows = [17, 18, 19];
            const result = gameSlice(initialState, setPenaltyRows(rows));
            expect(result.penaltyRows).toEqual(rows);
          });
        });

        describe('clearPenaltyRows', () => {
          it('should clear penalty rows', () => {
            const stateWithRows = { ...initialState, penaltyRows: [17, 18] };
            const result = gameSlice(stateWithRows, clearPenaltyRows());
            expect(result.penaltyRows).toEqual([]);
          });
        });
      });

      describe('handleAnimation', () => {
        const mockTimestamp = 1234567890;

        beforeEach(() => {
          // Mock Date.now() for consistent timestamps
          jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should handle PIECE_LOCK animation', () => {
          const animationData = {
            type: 'PIECE_LOCK',
            data: {
              timestamp: mockTimestamp,
              cells: [
                { x: 4, y: 18, type: 1 },
                { x: 5, y: 18, type: 1 },
              ],
            },
          };

          const result = gameSlice(initialState, handleAnimation(animationData));

          expect(result.lockedCells).toHaveLength(2);
          expect(result.lockedCells[0]).toEqual({
            x: 4, y: 18, type: 1,
            id: `lock-${mockTimestamp}-0`,
          });
          expect(result.lockedCells[1]).toEqual({
            x: 5, y: 18, type: 1,
            id: `lock-${mockTimestamp}-1`,
          });
          expect(result.lastAnimationTimestamp['PIECE_LOCK']).toBe(mockTimestamp);
        });

        it('should handle HARD_DROP animation', () => {
          const animationData = {
            type: 'HARD_DROP',
            data: {
              timestamp: mockTimestamp,
              trail: [
                { x: 4, startY: 2, endY: 18, type: 1 },
              ],
            },
          };

          const result = gameSlice(initialState, handleAnimation(animationData));

          expect(result.hardDropTrail).toHaveLength(1);
          expect(result.hardDropTrail[0]).toEqual({
            x: 4, startY: 2, endY: 18, type: 1,
            id: `trail-${mockTimestamp}-0`,
          });
          expect(result.lastAnimationTimestamp['HARD_DROP']).toBe(mockTimestamp);
        });

        it('should handle LINE_CLEAR animation', () => {
          const animationData = {
            type: 'LINE_CLEAR',
            data: {
              timestamp: mockTimestamp,
              rows: [18, 19],
            },
          };

          const result = gameSlice(initialState, handleAnimation(animationData));

          expect(result.clearingRows).toEqual([18, 19]);
          expect(result.lastAnimationTimestamp['LINE_CLEAR']).toBe(mockTimestamp);
        });

        it('should prevent duplicate animations', () => {
          const animationData = {
            type: 'PIECE_LOCK',
            data: {
              timestamp: mockTimestamp,
              cells: [{ x: 4, y: 18, type: 1 }],
            },
          };

          // First animation
          let state = gameSlice(initialState, handleAnimation(animationData));
          expect(state.lockedCells).toHaveLength(1);

          // Duplicate animation with same timestamp
          state = gameSlice(state, handleAnimation(animationData));
          expect(state.lockedCells).toHaveLength(1); // Should not duplicate
        });

        it('should clear existing animations before setting new ones', () => {
          const existingState = {
            ...initialState,
            lockedCells: [{ x: 1, y: 1, type: 2, id: 'old-1' }],
          };

          const animationData = {
            type: 'PIECE_LOCK',
            data: {
              timestamp: mockTimestamp,
              cells: [{ x: 4, y: 18, type: 1 }],
            },
          };

          const result = gameSlice(existingState, handleAnimation(animationData));

          expect(result.lockedCells).toHaveLength(1);
          expect(result.lockedCells[0].x).toBe(4); // New animation
          expect(result.lockedCells[0].id).toBe(`lock-${mockTimestamp}-0`);
        });

        it('should use Date.now() when timestamp not provided', () => {
          const animationData = {
            type: 'PIECE_LOCK',
            data: {
              cells: [{ x: 4, y: 18, type: 1 }],
            },
          };

          const result = gameSlice(initialState, handleAnimation(animationData));

          expect(result.lastAnimationTimestamp['PIECE_LOCK']).toBe(mockTimestamp);
        });
      });

      describe('clearLockedCells', () => {
        it('should clear locked cells', () => {
          const stateWithCells = {
            ...initialState,
            lockedCells: [
              { x: 4, y: 18, type: 1, id: 'lock-1' },
              { x: 5, y: 18, type: 1, id: 'lock-2' },
            ],
          };

          const result = gameSlice(stateWithCells, clearLockedCells());
          expect(result.lockedCells).toEqual([]);
        });
      });

      describe('clearHardDropTrail', () => {
        it('should clear hard drop trail', () => {
          const stateWithTrail = {
            ...initialState,
            hardDropTrail: [
              { x: 4, startY: 2, endY: 18, type: 1, id: 'trail-1' },
            ],
          };

          const result = gameSlice(stateWithTrail, clearHardDropTrail());
          expect(result.hardDropTrail).toEqual([]);
        });
      });
    });

    describe('resetGame', () => {
      it('should reset to initial state', () => {
        const modifiedState: GameState = {
          board: mockBoard,
          boardWidth: 15,
          boardHeight: 25,
          currentPiece: mockPiece,
          ghostPiece: mockGhostPiece,
          nextPieces: [1, 2, 3],
          score: 50000,
          level: 10,
          linesCleared: 4,
          totalLinesCleared: 100,
          isPaused: true,
          isGameOver: true,
          gameOverReason: 'Top out',
          opponents: [mockOpponent1],
          pendingPenaltyLines: 5,
          clearingRows: [18, 19],
          penaltyRows: [17],
          lockedCells: [{ x: 1, y: 1, type: 1 }],
          hardDropTrail: [{ x: 2, startY: 0, endY: 10, type: 2 }],
          lastAnimationTimestamp: { 'PIECE_LOCK': 123456 },
        };

        const result = gameSlice(modifiedState, resetGame());
        expect(result).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    const mockState = {
      game: {
        board: mockBoard,
        boardWidth: 12,
        boardHeight: 25,
        currentPiece: mockPiece,
        ghostPiece: mockGhostPiece,
        nextPieces: [2, 3, 4, 5],
        score: 15000,
        level: 8,
        linesCleared: 3,
        totalLinesCleared: 75,
        isPaused: true,
        isGameOver: true,
        gameOverReason: 'Time up',
        opponents: [mockOpponent1, mockOpponent2],
        pendingPenaltyLines: 2,
        clearingRows: [18, 19],
        penaltyRows: [17],
        lockedCells: [{ x: 4, y: 18, type: 1, id: 'lock-1' }],
        hardDropTrail: [{ x: 4, startY: 2, endY: 18, type: 1, id: 'trail-1' }],
        lastAnimationTimestamp: {},
      },
    };

    it('should select board', () => {
      expect(selectBoard(mockState)).toBe(mockBoard);
    });

    it('should select current piece', () => {
      expect(selectCurrentPiece(mockState)).toEqual(mockPiece);
    });

    it('should select ghost piece', () => {
      expect(selectGhostPiece(mockState)).toEqual(mockGhostPiece);
    });

    it('should select next pieces', () => {
      expect(selectNextPieces(mockState)).toEqual([2, 3, 4, 5]);
    });

    it('should select score', () => {
      expect(selectScore(mockState)).toBe(15000);
    });

    it('should select level', () => {
      expect(selectLevel(mockState)).toBe(8);
    });

    it('should select lines cleared', () => {
      expect(selectLinesCleared(mockState)).toBe(3);
    });

    it('should select total lines cleared', () => {
      expect(selectTotalLinesCleared(mockState)).toBe(75);
    });

    it('should select pause status', () => {
      expect(selectIsPaused(mockState)).toBe(true);
    });

    it('should select game over status', () => {
      expect(selectIsGameOver(mockState)).toBe(true);
    });

    it('should select game over reason', () => {
      expect(selectGameOverReason(mockState)).toBe('Time up');
    });

    it('should select opponents', () => {
      expect(selectOpponents(mockState)).toEqual([mockOpponent1, mockOpponent2]);
    });

    it('should select pending penalty lines', () => {
      expect(selectPendingPenaltyLines(mockState)).toBe(2);
    });

    it('should select clearing rows', () => {
      expect(selectClearingRows(mockState)).toEqual([18, 19]);
    });

    it('should select penalty rows', () => {
      expect(selectPenaltyRows(mockState)).toEqual([17]);
    });

    it('should select locked cells', () => {
      expect(selectLockedCells(mockState)).toEqual([{ x: 4, y: 18, type: 1, id: 'lock-1' }]);
    });

    it('should select hard drop trail', () => {
      expect(selectHardDropTrail(mockState)).toEqual([{ x: 4, startY: 2, endY: 18, type: 1, id: 'trail-1' }]);
    });

    describe('selectBoardDimensions', () => {
      it('should return memoized board dimensions', () => {
        const result1 = selectBoardDimensions(mockState);
        const result2 = selectBoardDimensions(mockState);

        expect(result1).toEqual({ width: 12, height: 25 });
        expect(result1).toBe(result2); // Should return same reference
      });

      it('should create new reference when dimensions change', () => {
        const state1 = { game: { ...mockState.game, boardWidth: 10, boardHeight: 20 } };
        const state2 = { game: { ...mockState.game, boardWidth: 12, boardHeight: 25 } };

        const result1 = selectBoardDimensions(state1);
        const result2 = selectBoardDimensions(state2);

        expect(result1).toEqual({ width: 10, height: 20 });
        expect(result2).toEqual({ width: 12, height: 25 });
        expect(result1).not.toBe(result2); // Different references
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete game initialization and play flow', () => {
      let state = initialState;

      // Initialize game
      state = gameSlice(state, initializeGame({
        boardWidth: 10,
        boardHeight: 20,
        nextPieces: [1, 2, 3],
      }));

      expect(state.boardWidth).toBe(10);
      expect(state.nextPieces).toEqual([1, 2, 3]);

      // Update game state during play
      state = gameSlice(state, updateGameState({
        currentPiece: mockPiece,
        score: 1000,
        level: 2,
      }));

      expect(state.currentPiece).toEqual(mockPiece);
      expect(state.score).toBe(1000);

      // Add opponents
      state = gameSlice(state, updateOpponentSpectrum({
        playerId: 'player-2',
        playerName: 'Alice',
        spectrum: [1, 2, 3],
        score: 500,
      }));

      expect(state.opponents).toHaveLength(1);

      // Game over
      state = gameSlice(state, gameOver({ reason: 'Top out' }));

      expect(state.isGameOver).toBe(true);
      expect(state.gameOverReason).toBe('Top out');
    });

    it('should handle animation sequence correctly', () => {
      let state = initialState;

      // Set clearing rows for line clear animation
      state = gameSlice(state, setClearingRows([18, 19]));
      expect(state.clearingRows).toEqual([18, 19]);

      // Handle piece lock animation
      state = gameSlice(state, handleAnimation({
        type: 'PIECE_LOCK',
        data: {
          timestamp: 123456,
          cells: [{ x: 4, y: 18, type: 1 }],
        },
      }));

      expect(state.lockedCells).toHaveLength(1);

      // Clear animations
      state = gameSlice(state, clearClearingRows());
      state = gameSlice(state, clearLockedCells());

      expect(state.clearingRows).toEqual([]);
      expect(state.lockedCells).toEqual([]);
    });

    it('should maintain immutability', () => {
      const state = { ...initialState };
      const newState = gameSlice(state, updateGameState({ score: 1000 }));

      expect(newState).not.toBe(state);
      expect(state.score).toBe(0); // original unchanged
      expect(newState.score).toBe(1000);
    });

    it('should handle penalty line management flow', () => {
      let state = initialState;

      // Add penalty lines
      state = gameSlice(state, addPendingPenalty(3));
      state = gameSlice(state, addPendingPenalty(2));
      expect(state.pendingPenaltyLines).toBe(5);

      // Set penalty row animation
      state = gameSlice(state, setPenaltyRows([17, 18, 19]));
      expect(state.penaltyRows).toEqual([17, 18, 19]);

      // Clear penalties
      state = gameSlice(state, clearPendingPenalty());
      state = gameSlice(state, clearPenaltyRows());

      expect(state.pendingPenaltyLines).toBe(0);
      expect(state.penaltyRows).toEqual([]);
    });
  });
});
