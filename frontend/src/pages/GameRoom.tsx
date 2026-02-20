import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./GameRoom.module.css";
import type { GameMode, GameSettings } from "../types/game";

// Redux imports
import { useAppDispatch, useAppSelector } from "../store/index.js";
import {
  joinRoomSuccess,
  addPlayer,
  leaveRoom,
  updatePlayerReady,
  updateGameMode,
  updateSetting,
  resetSettings,
  startCountdown,
  updateCountdown,
  cancelCountdown,
  resetToLobby,
  selectPlayers,
  selectCurrentPlayer,
  selectIsHost,
  selectGameMode,
  selectGameSettings,
  selectCanStartGame,
  selectCountdown,
  selectGameStarted,
  selectError,
  selectGameCreationData,
} from "../store/slices/gameRoomSlice.js";

import { Button, Panel } from "../components/UI";
import {
  PlayerList,
  GameModeSelector,
  GameSettingsPanel,
  CountdownOverlay,
} from "../components/Lobby";
import { GameView } from "../components/Game";
import { useGameInput } from "../hooks";
import type { GameAction } from "../utils/keyBindings";

export function GameRoom() {
  const { room, playerName } = useParams<{
    room: string;
    playerName: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state selectors
  const players = useAppSelector(selectPlayers);
  const currentPlayer = useAppSelector(selectCurrentPlayer);
  const isHost = useAppSelector(selectIsHost);
  const gameMode = useAppSelector(selectGameMode);
  const settings = useAppSelector(selectGameSettings);
  const canStartGameNow = useAppSelector(selectCanStartGame);
  const countdown = useAppSelector(selectCountdown);
  const gameStarted = useAppSelector(selectGameStarted);
  const gameCreationData = useAppSelector(selectGameCreationData);
  const error = useAppSelector(selectError);

  // Derived state
  const isSoloGame = players.length === 1;

  useEffect(() => {
    if (room && playerName) {
      // TEMPORARY: Local initialization for testing without backend.
      // When backend is ready, this will be replaced with socket-based room joining.
      // The roomId is passed here as a workaround since joinRoom (which sets roomId)
      // requires an active socket connection to the backend.
      dispatch(
        joinRoomSuccess({
          roomId: room, // TODO: Remove after backend integration - roomId will come from joinRoom action
          players: [
            {
              id: "1",
              name: playerName,
              isHost: true,
              isReady: true,
            },
          ],
          currentPlayerId: "1",
          gameMode: "classic",
        }),
      );

      // TODO: When backend is ready, replace above with:
      // if (isConnected) {
      //   dispatch(joinRoom({ roomId: room, playerName }));
      // }
    }
  }, [dispatch, room, playerName]);

  // Placeholder: Add a second player after 3 seconds (for testing)
  useEffect(() => {
    // Just for demo - will be replaced with real socket events
    const timer = setTimeout(() => {
      if (players.length === 1) {
        // Add a test opponent to see multiplayer functionality
        dispatch(
          addPlayer({
            id: "2",
            name: "Opponent",
            isHost: false,
            isReady: true,
          }),
        );
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [players.length, dispatch]);

  // Handle countdown interval
  useEffect(() => {
    let interval: number | null = null;

    if (countdown !== null && countdown > 0) {
      interval = window.setInterval(() => {
        dispatch(updateCountdown(countdown - 1));
      }, 1000);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [countdown, dispatch]);

  const handleSettingChange = (
    key: keyof GameSettings,
    value: number | boolean,
  ) => {
    if (!isHost) return;

    dispatch(updateSetting({ key, value }));
  };

  const handleResetSettings = () => {
    if (!isHost) return;

    dispatch(resetSettings());
  };

  const handleGameModeChange = (newGameMode: GameMode) => {
    if (!isHost) return;

    dispatch(updateGameMode(newGameMode));
  };

  const handleStartGame = () => {
    if (!isHost || !canStartGameNow) return;

    if (gameCreationData) {
      console.log("Game Creation Data:", gameCreationData);
      dispatch(startCountdown());
    }
  };

  const handleCancelCountdown = () => {
    dispatch(cancelCountdown());
  };

  const handleToggleReady = () => {
    if (!currentPlayer) return;

    const newReadyStatus = !currentPlayer.isReady;
    dispatch(
      updatePlayerReady({
        playerId: currentPlayer.id,
        isReady: newReadyStatus,
      }),
    );
  };

  const handleLeaveRoom = () => {
    dispatch(leaveRoom());
    navigate("/");
  };

  // Handle game input actions - send to server
  const handleGameAction = (action: GameActionType) => {
    // TODO: When backend is ready, send action via socket
    // socket.emit('game:action', { roomId: room, action });
    console.log("Game action:", action);
  };

  // Game input hook - only active when game has started
  useGameInput({
    enabled: gameStarted,
    onAction: handleGameAction,
  });

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.gameView}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={handleLeaveRoom} className={styles.backButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // If game has started, show game view
  if (gameStarted) {
    return (
      <GameView
        roomName={room}
        playerName={playerName}
        isHost={isHost}
        onLeave={() => {
          dispatch(resetToLobby());
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {countdown !== null && (
        <CountdownOverlay
          count={countdown}
          showCancel={isHost}
          onCancel={handleCancelCountdown}
        />
      )}

      <header className={styles.header}>
        <Button
          variant="ghost"
          onClick={handleLeaveRoom}
          className={styles.leaveButton}
        >
          ← Leave Room
        </Button>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomName}>{room}</h1>
          <span className={styles.roomMode}>
            {isSoloGame ? "Solo Mode" : "Multiplayer"}
          </span>
        </div>
        <div className={styles.headerSpacer} />
      </header>

      <main className={styles.lobby}>
        <Panel title="Players" className={styles.panel}>
          <PlayerList
            players={players}
            maxPlayers={2}
            currentPlayerName={playerName || ""}
          />
        </Panel>

        <Panel title="Game Mode" className={styles.panel}>
          <GameModeSelector
            selectedMode={gameMode}
            onModeChange={handleGameModeChange}
            disabled={!isHost}
          />
        </Panel>

        <GameSettingsPanel
          settings={settings}
          onSettingChange={handleSettingChange}
          onResetToDefault={isHost ? handleResetSettings : undefined}
          disabled={!isHost}
          className={styles.panel}
        />

        <div className={styles.startSection}>
          {isHost ? (
            <Button
              onClick={handleStartGame}
              variant="primary"
              size="large"
              fullWidth
              disabled={countdown !== null || !canStartGameNow}
            >
              {countdown !== null
                ? `Starting in ${countdown}...`
                : "Start Game"}
            </Button>
          ) : (
            <Button
              onClick={handleToggleReady}
              variant={currentPlayer?.isReady ? "secondary" : "primary"}
              size="large"
              fullWidth
              disabled={countdown !== null}
            >
              {countdown !== null
                ? `Starting in ${countdown}...`
                : currentPlayer?.isReady
                  ? "Ready ✓"
                  : "Ready Up"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default GameRoom;
