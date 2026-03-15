import historySlice, {
  clearHistoryError,
  historyFailed,
  historyReceived,
  requestHistory,
  selectHistory,
  selectHistoryError,
  selectHistoryLoading,
  selectRecentGames,
  selectTopScores,
  type HistoryState,
} from '../../../src/store/slices/historySlice';
import { EndGameReason, GameMode, GameType, type HistoryPayload } from '@shared/types/game';

const makePayload = (): HistoryPayload => ({
  recentGames: [
    {
      roomId: 'room-1',
      type: GameType.Multiplayer,
      gameMode: GameMode.Classic,
      games: [
        {
          gameId: 'game-1',
          player: {
            id: 'p1',
            name: 'Player 1',
            isHost: true,
            isSpectator: false,
          },
          score: 1500,
          level: 3,
          linesCleared: 10,
          totalLinesCleared: 10,
          endGameReason: EndGameReason.Victory,
        },
      ],
      startedAt: new Date('2026-03-15T10:00:00.000Z'),
      endedAt: new Date('2026-03-15T10:10:00.000Z'),
    },
  ],
  topScores: [
    {
      gameId: 'game-1',
      player: {
        id: 'p1',
        name: 'Player 1',
        isHost: true,
        isSpectator: false,
      },
      score: 1500,
      level: 3,
      linesCleared: 10,
      totalLinesCleared: 10,
      endGameReason: EndGameReason.Victory,
    },
  ],
});

describe('historySlice', () => {
  const initialState: HistoryState = {
    recentGames: [],
    topScores: [],
    isLoading: false,
    error: null,
  };

  it('should return initial state', () => {
    expect(historySlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should set loading on requestHistory', () => {
    const state = historySlice(initialState, requestHistory());

    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should save payload on historyReceived', () => {
    const loadingState = { ...initialState, isLoading: true };
    const payload = makePayload();

    const state = historySlice(loadingState, historyReceived(payload));

    expect(state.recentGames).toEqual(payload.recentGames);
    expect(state.topScores).toEqual(payload.topScores);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set error on historyFailed', () => {
    const loadingState = { ...initialState, isLoading: true };

    const state = historySlice(loadingState, historyFailed('Request failed'));

    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Request failed');
  });

  it('should clear error on clearHistoryError', () => {
    const errorState = { ...initialState, error: 'boom' };

    const state = historySlice(errorState, clearHistoryError());

    expect(state.error).toBeNull();
  });

  it('should expose selectors', () => {
    const sliceState = {
      recentGames: makePayload().recentGames,
      topScores: makePayload().topScores,
      isLoading: true,
      error: 'network',
    } satisfies HistoryState;

    const rootState = { history: sliceState };

    expect(selectHistory(rootState)).toEqual(sliceState);
    expect(selectRecentGames(rootState)).toEqual(sliceState.recentGames);
    expect(selectTopScores(rootState)).toEqual(sliceState.topScores);
    expect(selectHistoryLoading(rootState)).toBe(true);
    expect(selectHistoryError(rootState)).toBe('network');
  });
});

