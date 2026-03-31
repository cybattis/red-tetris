import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

import gameRoomSlice from "./slices/gameRoomSlice";
import gameSlice from "./slices/gameSlice";
import connectionSlice from "./slices/connectionSlice";
import uiSlice from "./slices/uiSlice";
import historySlice from "./slices/historySlice";

import { socketMiddleware } from "./middleware/socketMiddleware";

export const store = configureStore({
  reducer: {
    gameRoom: gameRoomSlice,
    game: gameSlice,
    connection: connectionSlice,
    ui: uiSlice,
    history: historySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for socket connections
        ignoredActions: ["connection/setSocket"],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ["meta.arg", "payload.socket"],
        // Ignore these paths in the state
        ignoredPaths: ["connection.socket"],
      },
    }).concat(socketMiddleware),
    devTools: import.meta.env.DEV,
});

export type RootState = {
  gameRoom: ReturnType<typeof gameRoomSlice>;
  game: ReturnType<typeof gameSlice>;
  connection: ReturnType<typeof connectionSlice>;
  ui: ReturnType<typeof uiSlice>;
  history: ReturnType<typeof historySlice>;
};
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
