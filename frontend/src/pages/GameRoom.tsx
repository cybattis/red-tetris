import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./GameRoom.module.css";
// Redux imports
import { useAppDispatch, useAppSelector } from "@/store";
import {
  joinRoom,
  leaveRoom,
  updateGameMode,
  updateSetting,
  resetSettings,
  startCountdown,
  updateCountdown,
  selectPlayers,
  selectIsHost,
  selectGameMode,
  selectGameSettings,
  selectCanStartGame,
  selectCountdown,
  selectGameStarted,
  selectGameId,
  selectError,
  selectGameCreationData,
} from "../store/slices/gameRoomSlice.js";
import {
  selectSocket,
  selectConnectionStatus,
} from "../store/slices/connectionSlice.js";
import { resetGame } from "../store/slices/gameSlice.js";
import { GameAction, GameMode, type GameSettings } from "@shared/types/game";
import { Button, Panel } from "../components/UI";
import {
  PlayerList,
  GameModeSelector,
  GameSettingsPanel,
  CountdownOverlay,
  GameView,
} from "@/components";
import { TetrisBackground } from "../components/UI/TetrisBackground";
import { useGameInput } from "../hooks";

export function GameRoom() {
  const { room, playerName } = useParams<{
    room: string;
    playerName: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state selectors
  const players = useAppSelector(selectPlayers);
  const isHost = useAppSelector(selectIsHost);
  const gameMode = useAppSelector(selectGameMode);
  const settings = useAppSelector(selectGameSettings);
  const canStartGameNow = useAppSelector(selectCanStartGame);
  const countdown = useAppSelector(selectCountdown);
  const gameStarted = useAppSelector(selectGameStarted);
  const gameId = useAppSelector(selectGameId);
  const gameCreationData = useAppSelector(selectGameCreationData);
  const error = useAppSelector(selectError);
  const socket = useAppSelector(selectSocket);
  const connectionStatus = useAppSelector(selectConnectionStatus);

  // Derived state
  const isSoloGame = players.length === 1;

  // Ref to prevent duplicate room joining
  const hasJoinedRoom = useRef(false);

  useEffect(() => {
    if (
      room &&
      playerName &&
      connectionStatus === "connected" &&
      !hasJoinedRoom.current
    ) {
      // Join room using the new room management system
      hasJoinedRoom.current = true;
      dispatch(joinRoom({ roomId: room, playerName }));
    }
  }, [dispatch, room, playerName, connectionStatus]);

  // Reset join flag when room or player changes
  useEffect(() => {
    hasJoinedRoom.current = false;
  }, [room, playerName]);

  // Navigate back to home if no room or player name
  useEffect(() => {
    if (!room || !playerName) {
      navigate("/");
    }
  }, [room, playerName, navigate]);

  // Handle countdown interval
  useEffect(() => {
    let interval: number | null = null;

    if (countdown !== null && countdown > 0) {
      interval = globalThis.setInterval(() => {
        dispatch(updateCountdown(countdown - 1));
      }, 1000);
    }

    return () => {
      if (interval) {
        globalThis.clearInterval(interval);
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

  const handleLeaveRoom = () => {
    dispatch(leaveRoom());
    navigate("/");
  };

  const handleReturnToLobby = useCallback(() => {
    // End the current game state and return to lobby
    dispatch({ type: "gameRoom/endGame" });
    dispatch(resetGame());
  }, [dispatch]);

  const handleReturnHome = useCallback(() => {
    // End the game and navigate to home page
    dispatch({ type: "gameRoom/endGame" });
    dispatch(resetGame());
    dispatch(leaveRoom());
    navigate("/");
  }, [dispatch, navigate]);

  // Handle game input actions - send to server
  // MUST be memoized to prevent useGameInput from re-registering event listeners on every render
  const handleGameAction = useCallback(
    (action: GameAction) => {
      console.log("Handling game action:", socket?.id, action, {
        gameStarted,
        gameId,
      });
      if (socket && socket.connected && gameStarted && gameId) {
        socket.emit("PLAYER_INPUT", {
          gameId: gameId,
          playerId: socket.id,
          input: action,
        });
      }
    },
    [socket, gameStarted, gameId],
  );

  // Game input hook - only active when game has started
  useGameInput({
    enabled: gameStarted,
    onAction: handleGameAction,
  });

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <TetrisBackground pieceCount={50} />
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
        onLeave={handleReturnToLobby}
        onReturnHome={handleReturnHome}
      />
    );
  }

  return (
    <div className={styles.container}>
      <TetrisBackground pieceCount={50} />

      {countdown !== null && <CountdownOverlay count={countdown} />}

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
              {countdown === null
                ? "Start Game"
                : `Starting in ${countdown}...`}
            </Button>
          ) : (
            <span className={styles.waitingText}>
              Waiting for host to start the game...
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
