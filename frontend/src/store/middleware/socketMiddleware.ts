import type { Middleware } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import type { RootState, AppDispatch } from "@/store";
import {
  setSocket,
  setConnecting,
  setConnected,
  setDisconnected,
  setReconnecting,
  setConnectionError,
  updateLatency,
} from "../slices/connectionSlice";
import {
  joinRoomError,
  updateGameMode,
  updateSettings,
  cancelCountdown,
  startGame,
  // New room management actions
  updateRoomState,
  playerJoined,
  playerLeft,
  hostTransferred,
  roomError,
  setCurrentPlayerId,
} from "../slices/gameRoomSlice";
import { showToast } from "../slices/uiSlice";
import type { RoomErrorEvent, RoomInfo } from "@shared/types/room";
import { EndGameReason, type GameStateUpdate } from "@shared/types/game";
import type {
  GameModeUpdateEvent,
  GameOverEvent,
  HostTransferEvent,
  HistoryResponseEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
} from "@shared/types/socket.ts";
import { resetGame } from "@store/slices/gameSlice.ts";
import { historyFailed, historyReceived } from "../slices/historySlice.js";

export const createSocketMiddleware = (
  socketUrl: string,
): Middleware<object, RootState> => {
  type MiddlewareAction = {
    type: string;
    payload?: unknown;
    meta?: { fromSocket?: boolean };
  };

  // Track if socket has been initialized to prevent duplicate initialization
  let socketInitialized = false;
  // Track if START_GAME has been emitted for current countdown to prevent duplicates
  let startGameEmitted = false;

  return (store) => (next) => (rawAction: unknown) => {
    const action = rawAction as MiddlewareAction;
    // Get state BEFORE action is processed for certain checks
    const prevState = store.getState();

    const result = next(rawAction);
    const state = store.getState();
    const dispatch = store.dispatch as AppDispatch;
    const isSpectator = state.gameRoom.isSpectator;

    switch (action.type) {
      case "connection/initSocket": {
        // Prevent duplicate socket initialization
        if (socketInitialized && state.connection.socket) {
          console.log("[DEBUG] Socket already initialized, skipping");
          break;
        }

        if (state.connection.socket) {
          console.log("[DEBUG] Disconnecting existing socket");
          state.connection.socket.removeAllListeners();
          state.connection.socket.disconnect();
        }

        socketInitialized = true;
        console.log("[DEBUG] Initializing new socket");

        dispatch(setConnecting());

        const socket: Socket = io(socketUrl, {
          autoConnect: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
        });

        dispatch(setSocket(socket));

        socket.on("connect", () => {
          console.log("Connected to server");
          dispatch(setConnected());

          if (store.getState().history.isLoading) {
            socket.emit("HISTORY");
          }

          dispatch(
            showToast({ message: "Connected to server", type: "success" }),
          );
        });

        socket.on("disconnect", (reason) => {
          console.log("Disconnected from server:", reason);
          dispatch(setDisconnected());
          dispatch(
            showToast({ message: "Disconnected from server", type: "warning" }),
          );
        });

        socket.on("connect_error", (error) => {
          console.error("Connection error:", error);
          dispatch(setConnectionError(error.message));
          dispatch(showToast({ message: "Connection failed", type: "error" }));
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
          console.log("Reconnection attempt:", attemptNumber);
          dispatch(setReconnecting());
        });

        socket.on("reconnect", (attemptNumber) => {
          console.log("Reconnected after", attemptNumber, "attempts");
          dispatch(setConnected());
          dispatch(
            showToast({ message: "Reconnected to server", type: "success" }),
          );
        });

        // New room management event handlers
        socket.on("ROOM_STATE_UPDATE", (roomInfo: RoomInfo) => {
          dispatch(updateRoomState(roomInfo));

          // Set current player ID if not already set (when first joining)
          const currentState = store.getState();
          if (!currentState.gameRoom.currentPlayerId && socket.id) {
            console.log(
              "[DEBUG] Setting current player ID from socket ID:",
              socket.id,
            );
            // Find the player in the room data that matches our socket ID
            const currentPlayer = [
              ...roomInfo.players,
              ...roomInfo.spectators,
            ].find((p) => p.id === socket.id);
            if (currentPlayer) {
              dispatch(setCurrentPlayerId(socket.id));
            }
          }
        });

        socket.on("PLAYER_JOINED", (payload: PlayerJoinedEvent) => {
          console.log("Player joined:", payload);
          dispatch(playerJoined(payload));
          const player = payload.player;
          dispatch(
            showToast({
              message: `${player.name} joined the room${player.isSpectator ? " as spectator" : ""}`,
              type: "info",
            }),
          );
        });

        socket.on("PLAYER_LEFT", (payload: PlayerLeftEvent) => {
          dispatch(playerLeft(payload));
          dispatch(
            showToast({
              message: "A player left the room",
              type: "warning",
            }),
          );
        });

        socket.on("HOST_TRANSFER", (payload: HostTransferEvent) => {
          dispatch(hostTransferred(payload));
          dispatch(
            showToast({
              message: "Host has been transferred",
              type: "info",
            }),
          );
        });

        socket.on("ROOM_ERROR", (error: RoomErrorEvent) => {
          dispatch(roomError(error));
          dispatch(
            showToast({
              message: `Room Error: ${error.reason}`,
              type: "error",
            }),
          );
        });

        socket.on("LEFT_ROOM", () => {
          dispatch(
            showToast({
              message: "Left the room",
              type: "info",
            }),
          );
        });

        socket.on("HISTORY_RESPONSE", (payload: HistoryResponseEvent) => {
          if (!payload?.history) {
            dispatch(historyFailed("Failed to load history"));
            return;
          }

          dispatch(historyReceived(payload.history));
        });

        socket.on("SETTINGS_UPDATED", (data) => {
          dispatch(updateSettings({ ...data.settings, _fromSocket: true }));
        });

        socket.on("GAME_MODE_UPDATED", (payload: GameModeUpdateEvent) => {
          // Mark this action as coming from socket to prevent re-emission
          const socketAction = {
            ...updateGameMode(payload.gameMode),
            meta: { fromSocket: true },
          };
          dispatch(socketAction);
        });

        socket.on("GAME_START_CANCELED", () => {
          dispatch(cancelCountdown());
          dispatch(
            showToast({
              message: "Game start was canceled",
              type: "info",
            }),
          );
        });

        socket.on("GAME_STARTED", (data) => {
          console.log("[DEBUG] GAME_STARTED received:", data);
          // Reset game state before starting a new game to clear any leftover state
          dispatch(resetGame());
          dispatch(startGame({ gameId: data.gameId }));
          dispatch(
            showToast({
              message: "Game started!",
              type: "success",
            }),
          );
        });

        socket.on("GAME_STATE_UPDATE", (data: GameStateUpdate) => {
          console.log(
            "[GAME_STATE_UPDATE] Frontend received GAME_STATE_UPDATE:",
            data,
          );

          const playerId = store.getState().gameRoom.currentPlayerId;

          console.log(
            `[GAME_STATE_UPDATE] Current player ID: ${playerId}, Incoming game state player ID: ${data.player?.id}`,
          );

          if (data.player?.id === playerId || isSpectator) {
            console.log(
              "[GAME_STATE_UPDATE] Updating game state for current player",
            );
            dispatch({ type: "game/updateGameState", payload: data });
          } else {
            console.log("[GAME_STATE_UPDATE] Updating game state for opponent");
            dispatch({
              type: "game/updateGameState",
              payload: {
                opponent: {
                  player: data.player,
                  board: data.board,
                  currentPiece: data.currentPiece,
                  nextPieces: data.nextPieces,
                  score: data.score,
                  linesCleared: data.linesCleared,
                  isEliminated: data.isGameOver,
                },
              },
            });
          }
        });

        socket.on("GAME_ANIMATION", (animationData) => {
          // Handle game animations from server
          dispatch({ type: "game/handleAnimation", payload: animationData });
        });

        socket.on("GAME_ENDED", (payload: GameOverEvent) => {
          const currentPlayerId = store.getState().gameRoom.currentPlayerId;
          console.log(
            `[DEBUG] Current player ID: ${currentPlayerId}, Game ended player ID: ${payload.looserId}`,
          );

          const reason =
            payload.looserId === currentPlayerId
              ? EndGameReason.Defeat
              : EndGameReason.Victory;

          // Properly end the game in the frontend state
          dispatch({
            type: "game/gameEnded",
            payload: {
              reason: reason,
            },
          });

          // Show toast notification
          dispatch(
            showToast({
              message: `Game ended: ${reason}`,
              type: "info",
            }),
          );

          // Don't automatically end the game room - let the user choose via Game Over overlay buttons
        });

        socket.on("ROOM_NOT_FOUND", (data) => {
          dispatch(joinRoomError(data.error));
        });

        socket.on("ROOM_FULL", (data) => {
          dispatch(joinRoomError(data.error));
        });

        const pingInterval = setInterval(() => {
          if (socket.connected) {
            const start = Date.now();
            socket.emit("ping", start);
          }
        }, 30000); // Ping every 30 seconds

        socket.on("pong", (timestamp) => {
          const latency = Date.now() - timestamp;
          dispatch(updateLatency(latency));
        });

        socket.on("disconnect", () => {
          clearInterval(pingInterval);
        });

        socket.connect();
        break;
      }

      case "connection/disconnectSocket": {
        const socket = state.connection.socket;
        if (socket) {
          console.log("[DEBUG] Disconnecting socket and removing listeners");
          socket.removeAllListeners();
          socket.disconnect();
          dispatch(setSocket(null));
        }
        socketInitialized = false;
        break;
      }

      case "gameRoom/joinRoom": {
        const socket = state.connection.socket;
        if (socket?.connected) {
          const joinPayload = action.payload as {
            roomId: string;
            playerName: string;
          };

          socket.emit("JOIN_ROOM", {
            roomId: joinPayload.roomId,
            playerName: joinPayload.playerName,
          });
        }
        break;
      }

      case "gameRoom/updateSetting": {
        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("UPDATE_SETTINGS", {
            roomId: state.gameRoom.roomId,
            settings: state.gameRoom.settings,
          });
        }
        break;
      }

      case "gameRoom/updateSettings": {
        // Don't emit if this action came from a socket event (prevents infinite loop)
        const payload = action.payload as { _fromSocket?: boolean } | undefined;
        if (action.meta?.fromSocket || payload?._fromSocket) {
          break;
        }

        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("UPDATE_SETTINGS", {
            roomId: state.gameRoom.roomId,
            settings: state.gameRoom.settings,
          });
        }
        break;
      }

      case "gameRoom/updateGameMode": {
        // Don't emit if this action came from a socket event (prevents infinite loop)
        if (action.meta?.fromSocket) {
          break;
        }

        const socket = state.connection.socket;
        if (socket?.connected) {
          const gameMode = action.payload as RootState["gameRoom"]["gameMode"];
          socket.emit("UPDATE_GAME_MODE", {
            roomId: state.gameRoom.roomId,
            gameMode,
          });
        }
        break;
      }

      case "gameRoom/startCountdown": {
        // Reset the startGameEmitted flag when a new countdown starts
        startGameEmitted = false;
        // Don't emit START_GAME immediately - wait for countdown to finish
        // The countdown will trigger START_GAME when it reaches 0
        break;
      }

      case "gameRoom/updateCountdown": {
        const socket = state.connection.socket;
        // Only emit START_GAME when countdown reaches exactly 0
        // Use prevState to check gameStarted BEFORE the reducer updated it
        // Also use startGameEmitted flag to prevent duplicate emissions
        console.log(
          `[DEBUG] updateCountdown: payload=${action.payload as number}, prevGameStarted=${prevState.gameRoom.gameStarted}, startGameEmitted=${startGameEmitted}`,
        );
        const countdown = action.payload as number;
        if (
          socket &&
          socket.connected &&
          countdown === 0 &&
          !prevState.gameRoom.gameStarted &&
          !startGameEmitted
        ) {
          startGameEmitted = true;
          console.log(
            "[DEBUG] Countdown reached 0, emitting START_GAME with settings:",
            state.gameRoom.settings,
          );
          // Countdown finished - now start the game on the server
          socket.emit("START_GAME", {
            roomId: state.gameRoom.roomId,
            gameSettings: state.gameRoom.settings,
          });
        }
        break;
      }

      case "gameRoom/cancelCountdown": {
        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("CANCEL_START", {
            roomId: state.gameRoom.roomId,
          });
        }
        break;
      }

      case "gameRoom/leaveRoom": {
        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("LEAVE_ROOM", {
            roomId: prevState.gameRoom.roomId,
          });
        }
        break;
      }

      case "gameRoom/resetToLobby": {
        // Reset the game state when returning to lobby
        dispatch(resetGame());

        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("RESTART_GAME", {
            roomId: state.gameRoom.roomId,
          });
        }
        break;
      }

      case "history/requestHistory": {
        const socket = state.connection.socket;
        if (socket?.connected) {
          socket.emit("HISTORY");
        }
        break;
      }
    }

    return result;
  };
};

/**
 * Socket URL is injected via Vite's define (see vite.config.ts).
 * In Jest, it is set via the test setup (see tests/setup.ts).
 * Using a declared global avoids import.meta.env which ts-jest cannot compile.
 */
declare const __SOCKET_URL__: string | undefined;
const defaultSocketUrl: string =
  (__SOCKET_URL__ ?? undefined) || "http://localhost:3000";

export const socketMiddleware = createSocketMiddleware(defaultSocketUrl);
