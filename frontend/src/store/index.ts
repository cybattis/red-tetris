import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import gameRoomSlice from './slices/gameRoomSlice.js';
import connectionSlice from './slices/connectionSlice.js';
import uiSlice from './slices/uiSlice.js';

import { socketMiddleware } from './middleware/socketMiddleware.js';

export const store = configureStore({
  reducer: {
    gameRoom: gameRoomSlice,
    connection: connectionSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for socket connections
        ignoredActions: ['connection/setSocket'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.socket'],
        // Ignore these paths in the state
        ignoredPaths: ['connection.socket'],
      },
    }).concat(socketMiddleware),
  devTools: import.meta.env.DEV,
});

export type RootState = {
  gameRoom: ReturnType<typeof gameRoomSlice>;
  connection: ReturnType<typeof connectionSlice>;
  ui: ReturnType<typeof uiSlice>;
};
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
