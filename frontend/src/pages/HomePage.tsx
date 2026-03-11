import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TetrisBackground } from '@/components/UI';
import styles from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateInputs = useCallback((): boolean => {
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

    setError(null);
    return true;
  }, [playerName, roomName]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!validateInputs()) return;
      navigate(`/${roomName.trim()}/${playerName.trim()}`);
    },
    [playerName, roomName, validateInputs, navigate]
  );

  return (
    <div className={styles.container}>
      <TetrisBackground pieceCount={50} />

      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleRed}>RED</span>
          <span className={styles.titleTetris}>TETRIS</span>
        </h1>
        <p className={styles.subtitle}>Multiplayer Tetris Battle</p>
      </header>

      <div className={styles.layout}>
        {/* Match History */}
        <aside className={styles.sidePanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Match History</h2>
            <ul className={styles.matchList}>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerNameHighlight}>Player1</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerNameHighlight}>Player2</span>
                </div>
                <span className={styles.matchMode}>Classic</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerNameHighlight}>ProGamer</span>
                </div>
                <span className={styles.matchMode}>Solo</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerNameHighlight}>TetrisMaster</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerNameHighlight}>Newbie42</span>
                </div>
                <span className={styles.matchMode}>Sprint</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerNameHighlight}>BlockKing</span>
                </div>
                <span className={styles.matchMode}>Solo</span>
              </li>
              <li className={styles.matchItem}>
                <div className={styles.matchPlayers}>
                  <span className={styles.playerNameHighlight}>SpeedRunner</span>
                  <span className={styles.matchVs}>vs</span>
                  <span className={styles.playerNameHighlight}>CasualFan</span>
                </div>
                <span className={styles.matchMode}>Classic</span>
              </li>
              <li className={styles.matchItemEmpty}>
                <span>No more matches to display</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Join Form */}
        <main className={styles.content}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Play</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
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

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className={styles.submitButton}>
                Join Game
              </button>
            </form>
          </div>
        </main>

        {/* Leaderboards */}
        <aside className={styles.sidePanel}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Leaderboards</h2>
            <ol className={styles.leaderboardList}>
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