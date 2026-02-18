/**
 * GameRoom Page - Pre-game lobby and game view
 * Displays waiting room before game starts, then the game itself
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './GameRoom.module.css';
import type {
  Player,
  GameMode,
  GameSettings,
} from '../types/game';
import {
  DEFAULT_SETTINGS,
  GAME_MODES,
  ROOM_CONFIG,
  prepareGameCreationData,
  canStartGame,
} from '../types/game';

export function GameRoom() {
  const { room, playerName } = useParams<{ room: string; playerName: string }>();
  const navigate = useNavigate();

  // Placeholder state - will be replaced with Redux store
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: playerName || 'Player1', isHost: true, isReady: true },
  ]);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Current player (first player for now - will use socket ID later)
  const currentPlayer = players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost ?? false;
  const isSoloGame = players.length === 1;
  const allPlayersReady = canStartGame(players);

  // Placeholder: Add a second player after 3 seconds (for testing)
  useEffect(() => {
    // This is just for demo - will be replaced with socket events
    const timer = setTimeout(() => {
      if (players.length === 1) {
        // Uncomment to test 2-player mode:
        setPlayers(prev => [...prev, { id: '2', name: 'Opponent', isHost: false, isReady: true }]);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [players.length]);

  const handleSettingChange = (key: keyof GameSettings, value: number | boolean) => {
    if (!isHost) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // TODO: Send to backend via socket
    // socket.emit('UPDATE_SETTINGS', { roomId: room!, settings: newSettings });
  };

  const handleGameModeChange = (newGameMode: GameMode) => {
    if (!isHost) return;
    
    setGameMode(newGameMode);
    
    // TODO: Send to backend via socket
    // socket.emit('UPDATE_GAME_MODE', { roomId: room!, gameMode: newGameMode });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    
    try {
      // Prepare game creation data for backend
      const gameCreationData = prepareGameCreationData(room || '', gameMode, settings, players);
      
      // TODO: Send to backend via socket
      // socket.emit('START_GAME', { roomId: gameCreationData.roomId });
      console.log('Game Creation Data:', gameCreationData);
      
      // Start countdown
      setCountdown(ROOM_CONFIG.COUNTDOWN_DURATION);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setGameStarted(true);
            
            // TODO: Send final game start event to backend
            // socket.emit('GAME_STARTED', { gameId: generateGameId() });
            
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Store interval ID so we can clear it if needed
      (window as any).countdownInterval = interval;
    } catch (error) {
      console.error('Failed to prepare game creation data:', error);
    }
  };

  const handleCancelCountdown = () => {
    // Clear the interval to prevent game from starting
    if ((window as any).countdownInterval) {
      clearInterval((window as any).countdownInterval);
      (window as any).countdownInterval = null;
    }
    setCountdown(null);
    
    // TODO: Send to backend via socket
    // socket.emit('CANCEL_START', { roomId: room! });
  };

  const handleToggleReady = () => {
    if (!currentPlayer) return;
    
    const newReadyStatus = !currentPlayer.isReady;
    
    setPlayers(prev => prev.map(player => 
      player.id === currentPlayer.id 
        ? { ...player, isReady: newReadyStatus }
        : player
    ));
    
    // TODO: Send to backend via socket
    // socket.emit('PLAYER_READY', { 
    //   roomId: room!, 
    //   playerId: currentPlayer.id, 
    //   isReady: newReadyStatus 
    // });
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  // If game has started, show game view (placeholder for now)
  if (gameStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.gameView}>
          <h2>Game In Progress</h2>
          <p>Game board will be displayed here</p>
          <button onClick={() => setGameStarted(false)} className={styles.backButton}>
            Back to Lobby (Debug)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Countdown Overlay */}
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

      {/* Header */}
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

      {/* Main Content */}
      <main className={styles.lobby}>
        {/* Players Panel */}
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

        {/* Game Mode Panel */}
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
                  <span className={styles.gameModeIcon}>{mode.icon}</span>
                  <span className={styles.gameModeName}>{mode.name}</span>
                  <span className={styles.gameModeDescription}>{mode.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Settings Panel */}
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Game Settings
          </h2>
          <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
              {/* Board Width */}
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

              {/* Board Height */}
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

              {/* Gravity */}
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

              {/* Game Speed */}
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

              {/* Next Piece Count */}
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

              {/* Ghost Piece */}
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

        {/* Start Game Button */}
        <div className={styles.startSection}>
          {isHost ? (
            <button
              onClick={handleStartGame}
              className={styles.startButton}
              disabled={countdown !== null || !allPlayersReady}
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
