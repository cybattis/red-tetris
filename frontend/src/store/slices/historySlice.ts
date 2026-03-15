import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HistoryPayload } from '@shared/types/game.ts';

export interface HistoryState {
  recentGames: HistoryPayload['recentGames'];
  topScores: HistoryPayload['topScores'];
  isLoading: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  recentGames: [],
  topScores: [],
  isLoading: false,
  error: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    requestHistory: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    historyReceived: (state, action: PayloadAction<HistoryPayload>) => {
      state.recentGames = action.payload.recentGames;
      state.topScores = action.payload.topScores;
      state.isLoading = false;
      state.error = null;
    },
    historyFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearHistoryError: (state) => {
      state.error = null;
    },
  },
});

export const { requestHistory, historyReceived, historyFailed, clearHistoryError } = historySlice.actions;

export default historySlice.reducer;

export const selectHistory = (state: { history: HistoryState }) => state.history;
export const selectRecentGames = (state: { history: HistoryState }) => state.history.recentGames;
export const selectTopScores = (state: { history: HistoryState }) => state.history.topScores;
export const selectHistoryLoading = (state: { history: HistoryState }) => state.history.isLoading;
export const selectHistoryError = (state: { history: HistoryState }) => state.history.error;

