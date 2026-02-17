import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'join' | 'matchmaking'>('join');

  const validateInputs = useCallback((): boolean => {
    // Player name validation
    if (!playerName.trim()) {
      setError('Please enter your name');
      return false;
    }
    if (playerName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return false;
    }
    if (playerName.trim().length > 20) {
      setError('Name must be 20 characters or less');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(playerName.trim())) {
      setError('Name can only contain letters, numbers, underscores, and hyphens');
      return false;
    }

    // Room name validation (only for join mode)
    if (mode === 'join') {
      if (!roomName.trim()) {
        setError('Please enter a room name');
        return false;
      }
      if (roomName.trim().length < 2) {
        setError('Room name must be at least 2 characters');
        return false;
      }
      if (roomName.trim().length > 30) {
        setError('Room name must be 30 characters or less');
        return false;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(roomName.trim())) {
        setError('Room name can only contain letters, numbers, underscores, and hyphens');
        return false;
      }
    }

    setError(null);
    return true;
  }, [playerName, roomName, mode]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!validateInputs()) {
        return;
      }

      const formattedPlayer = playerName.trim();

      if (mode === 'matchmaking') {
        // Navigate to matchmaking queue
        navigate(`/matchmaking/${formattedPlayer}`);
      } else {
        // Navigate to the game room using the URL format: /<room>/<player_name>
        const formattedRoom = roomName.trim();
        navigate(`/${formattedRoom}/${formattedPlayer}`);
      }
    },
    [playerName, roomName, mode, validateInputs, navigate]
  );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Logo / Title */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleRed}>RED</span>
            <span className={styles.titleTetris}>TETRIS</span>
          </h1>
          <p className={styles.subtitle}>Multiplayer Tetris Battle</p>
        </header>

        {/* Join Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'join' ? styles.modeButtonActive : ''}`}
              onClick={() => {
                setMode('join');
                setError(null);
              }}
            >
              Join Room
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'matchmaking' ? styles.modeButtonActive : ''}`}
              onClick={() => {
                setMode('matchmaking');
                setError(null);
              }}
            >
              Matchmaking
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="playerName" className={styles.label}>
              Player Name
            </label>
            <input
              type="text"
              id="playerName"
              className={styles.input}
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError(null);
              }}
              maxLength={20}
              autoComplete="off"
              autoFocus
            />
          </div>

          {mode === 'join' && (
            <div className={styles.inputGroup}>
              <label htmlFor="roomName" className={styles.label}>
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                className={styles.input}
                placeholder="Enter room name to join or create"
                value={roomName}
                onChange={(e) => {
                  setRoomName(e.target.value);
                  setError(null);
                }}
                maxLength={30}
                autoComplete="off"
              />
            </div>
          )}

          {mode === 'matchmaking' && (
            <div className={styles.matchmakingInfo}>
              <p>You'll be matched with other players looking for a game</p>
            </div>
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button type="submit" className={styles.submitButton}>
            {mode === 'matchmaking' ? 'Find Match' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default HomePage;
