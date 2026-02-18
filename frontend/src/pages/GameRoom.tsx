import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './GameRoom.module.css';
import type {
  GameMode,
  GameSettings,
} from '../types/game';
import {
  GAME_MODES,
} from '../types/game';

// Redux imports
import { useAppDispatch, useAppSelector } from '../store/index.js';
import {
  joinRoomSuccess,
  addPlayer,
  leaveRoom,
  updatePlayerReady,
  updateGameMode,
  updateSetting,
  startCountdown,
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
} from '../store/slices/gameRoomSlice.js';

export function GameRoom() {
  const { room, playerName } = useParams<{ room: string; playerName: string }>();
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
      // For now, without a real backend
      // Will be replaced with actual socket events when backend is ready
      dispatch(joinRoomSuccess({
        players: [
          { 
            id: '1', 
            name: playerName, 
            isHost: true, 
            isReady: true 
          }
        ],
        currentPlayerId: '1',
        gameMode: 'classic',
      }));
      
      // TODO: When backend is ready, replace with:
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
        dispatch(addPlayer({ id: '2', name: 'Opponent', isHost: false, isReady: false }));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [players.length, dispatch]);

  // Handle countdown interval
  useEffect(() => {
    let interval: number | null = null;
    
    if (countdown !== null && countdown > 0) {
      interval = window.setInterval(() => {
        dispatch({ type: 'gameRoom/updateCountdown', payload: countdown - 1 });
      }, 1000);
    }

    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [countdown, dispatch]);

  const handleSettingChange = (key: keyof GameSettings, value: number | boolean) => {
    if (!isHost) return;
    
    dispatch(updateSetting({ key, value }));
  };

  const handleGameModeChange = (newGameMode: GameMode) => {
    if (!isHost) return;
    
    dispatch(updateGameMode(newGameMode));
  };

  const handleStartGame = () => {
    if (!isHost || !canStartGameNow) return;
    
    if (gameCreationData) {
      console.log('Game Creation Data:', gameCreationData);
      dispatch(startCountdown());
    }
  };

  const handleCancelCountdown = () => {
    dispatch(cancelCountdown());
  };

  const handleToggleReady = () => {
    if (!currentPlayer) return;
    
    const newReadyStatus = !currentPlayer.isReady;
    dispatch(updatePlayerReady({ 
      playerId: currentPlayer.id, 
      isReady: newReadyStatus 
    }));
  };

  const handleLeaveRoom = () => {
    dispatch(leaveRoom());
    navigate('/');
  };

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

  // If game has started, show game view (placeholder)
  if (gameStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.gameView}>
          <h2>Game In Progress</h2>
          <p>Game board will be displayed here</p>
          <button onClick={() => dispatch(resetToLobby())} className={styles.backButton}>
            Back to Lobby (Debug)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {countdown !== null && (
        <div className={styles.countdownOverlay}>
          <div className={styles.countdownContent}>
            <div className={styles.countdownNumber}>{countdown}</div>
            <button onClick={handleCancelCountdown} className={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <button onClick={handleLeaveRoom} className={styles.leaveButton}>
          ← Leave Room
        </button>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomName}>{room}</h1>
          <span className={styles.roomMode}>
            {isSoloGame ? 'Solo Mode' : 'Multiplayer'}
          </span>
        </div>
        <div className={styles.headerSpacer} />
      </header>

      <main className={styles.lobby}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Players</h2>
          <div className={styles.panelContent}>
            <ul className={styles.playerList}>
              {players.map(player => (
                <li key={player.id} className={styles.playerItem}>
                  <div className={styles.playerInfo}>
                    <span className={styles.playerName}>
                      {player.name}
                      {player.isHost && <span className={styles.hostBadge}>Host</span>}
                    </span>
                    {player.name === playerName && (
                      <span className={styles.youBadge}>You</span>
                    )}
                  </div>
                  <span className={`${styles.playerStatus} ${player.isReady ? styles.ready : ''}`}>
                    {player.isReady ? '✓ Ready' : 'Waiting...'}
                  </span>
                </li>
              ))}
              {players.length < 2 && (
                <li className={styles.playerItemEmpty}>
                  <span className={styles.waitingText}>Waiting for opponent...</span>
                </li>
              )}
            </ul>
            <div className={styles.playerCount}>
              {players.length}/2 Players
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Game Mode
          </h2>
          <div className={styles.panelContent}>
            <div className={styles.gameModeGrid}>
              {GAME_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => handleGameModeChange(mode.id)}
                  disabled={!isHost}
                  className={`${styles.gameModeButton} ${gameMode === mode.id ? styles.gameModeActive : ''}`}
                >
                  <span className={styles.gameModeName}>{mode.name}</span>
                  <span className={styles.gameModeDescription}>{mode.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Game Settings
          </h2>
          <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Board Width</label>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="8"
                    max="16"
                    value={settings.boardWidth}
                    onChange={(e) => handleSettingChange('boardWidth', Number(e.target.value))}
                    disabled={!isHost}
                    className={styles.slider}
                  />
                  <span className={styles.settingValue}>{settings.boardWidth}</span>
                </div>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Board Height</label>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="15"
                    max="25"
                    value={settings.boardHeight}
                    onChange={(e) => handleSettingChange('boardHeight', Number(e.target.value))}
                    disabled={!isHost}
                    className={styles.slider}
                  />
                  <span className={styles.settingValue}>{settings.boardHeight}</span>
                </div>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Gravity</label>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={settings.gravity}
                    onChange={(e) => handleSettingChange('gravity', Number(e.target.value))}
                    disabled={!isHost}
                    className={styles.slider}
                  />
                  <span className={styles.settingValue}>{settings.gravity}x</span>
                </div>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Game Speed</label>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={settings.gameSpeed}
                    onChange={(e) => handleSettingChange('gameSpeed', Number(e.target.value))}
                    disabled={!isHost}
                    className={styles.slider}
                  />
                  <span className={styles.settingValue}>{settings.gameSpeed}x</span>
                </div>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Preview Queue</label>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={settings.nextPieceCount}
                    onChange={(e) => handleSettingChange('nextPieceCount', Number(e.target.value))}
                    disabled={!isHost}
                    className={styles.slider}
                  />
                  <span className={styles.settingValue}>{settings.nextPieceCount}</span>
                </div>
              </div>

              <div className={styles.settingItem}>
                <label className={styles.settingLabel}>Ghost Piece</label>
                <div className={styles.settingControl}>
                  <button
                    onClick={() => handleSettingChange('ghostPiece', !settings.ghostPiece)}
                    disabled={!isHost}
                    className={`${styles.toggleButton} ${settings.ghostPiece ? styles.toggleActive : ''}`}
                  >
                    {settings.ghostPiece ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.startSection}>
          {isHost ? (
            <button
              onClick={handleStartGame}
              className={styles.startButton}
              disabled={countdown !== null || !canStartGameNow}
            >
              {countdown !== null ? `Starting in ${countdown}...` : 'Start Game'}
            </button>
          ) : (
            <button
              onClick={handleToggleReady}
              className={`${styles.startButton} ${currentPlayer?.isReady ? styles.readyButton : styles.notReadyButton}`}
              disabled={countdown !== null}
            >
              {countdown !== null 
                ? `Starting in ${countdown}...` 
                : currentPlayer?.isReady 
                  ? 'Ready ✓' 
                  : 'Ready Up'
              }
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default GameRoom;
