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
      {/* Logo / Title */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleRed}>RED</span>
          <span className={styles.titleTetris}>TETRIS</span>
        </h1>
        <p className={styles.subtitle}>Multiplayer Tetris Battle</p>
      </header>

      <div className={styles.layout}>
        {/* Match History - Left Column */}
        <aside className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>
              Match History
            </h2>
            <ul className={styles.matchList}>
              {/* Placeholder matches - will be replaced with real data */}
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerName}>Player1</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerName}>Player2</span>
                </div>
                <span className={styles.matchMode}>Classic</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerName}>ProGamer</span>
                </div>
                <span className={styles.matchMode}>Solo</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerName}>TetrisMaster</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerName}>Newbie42</span>
                </div>
                <span className={styles.matchMode}>Sprint</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerName}>BlockKing</span>
                </div>
                <span className={styles.matchMode}>Solo</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerName}>SpeedRunner</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerName}>CasualFan</span>
                </div>
                <span className={styles.matchMode}>Classic</span>
              </li>
              <li className={styles.matchItemEmpty}>
                <span>No more matches to display</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Join Form - Center Column */}
        <main className={styles.content}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Play</h2>
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
              <p>You'll be matched with other players looking for a game.</p>
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
        </main>

        {/* Leaderboards - Right Column */}
        <aside className={styles.sidePanel}>
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>
              Leaderboards
            </h2>
            <ol className={styles.leaderboardList}>
              {/* Placeholder leaderboard entries - will be replaced with real data */}
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>1</span>
                <span className={styles.leaderboardName}>TetrisMaster</span>
                <span className={styles.leaderboardScore}>125,400</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>2</span>
                <span className={styles.leaderboardName}>ProGamer</span>
                <span className={styles.leaderboardScore}>98,750</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>3</span>
                <span className={styles.leaderboardName}>BlockKing</span>
                <span className={styles.leaderboardScore}>87,200</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>4</span>
                <span className={styles.leaderboardName}>SpeedRunner</span>
                <span className={styles.leaderboardScore}>72,100</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>5</span>
                <span className={styles.leaderboardName}>Player1</span>
                <span className={styles.leaderboardScore}>65,800</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>6</span>
                <span className={styles.leaderboardName}>CasualFan</span>
                <span className={styles.leaderboardScore}>54,300</span>
              </li>
              <li className={styles.leaderboardItem}>
                <span className={styles.leaderboardRank}>7</span>
                <span className={styles.leaderboardName}>Newbie42</span>
                <span className={styles.leaderboardScore}>32,150</span>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HomePage;