import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { TetrisBackground } from "@/components/UI";
import {
  requestHistory,
  selectHistoryError,
  selectHistoryLoading,
  selectRecentGames,
  selectTopScores,
} from "@/store/slices/historySlice";
import styles from "./HomePage.module.css";

const formatScore = (score: number): string => score.toLocaleString("en-US");

const getMatchPlayersLabel = (playerNames: string[]): string => {
  if (playerNames.length === 0) {
    return "Unknown players";
  }

  if (playerNames.length === 1) {
    return playerNames[0];
  }

  return `${playerNames[0]} vs ${playerNames[1]}`;
};

export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recentGames = useAppSelector(selectRecentGames);
  const topScores = useAppSelector(selectTopScores);
  const historyLoading = useAppSelector(selectHistoryLoading);
  const historyError = useAppSelector(selectHistoryError);

  useEffect(() => {
    dispatch(requestHistory());
  }, [dispatch]);

  const validateInputs = useCallback((): boolean => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return false;
    }
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }
    if (playerName.trim().length > 20) {
      setError("Name must be 20 characters or less");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(playerName.trim())) {
      setError(
        "Name can only contain letters, numbers, underscores, and hyphens",
      );
      return false;
    }
    if (!roomName.trim()) {
      setError("Please enter a room name");
      return false;
    }
    if (roomName.trim().length < 2) {
      setError("Room name must be at least 2 characters");
      return false;
    }
    if (roomName.trim().length > 30) {
      setError("Room name must be 30 characters or less");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(roomName.trim())) {
      setError(
        "Room name can only contain letters, numbers, underscores, and hyphens",
      );
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
    [playerName, roomName, validateInputs, navigate],
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
              {historyLoading && recentGames.length === 0 ? (
                <li className={styles.matchItemEmpty}>
                  <span>Loading history...</span>
                </li>
              ) : null}

              {!historyLoading && recentGames.length === 0 ? (
                <li className={styles.matchItemEmpty}>
                  <span>No matches yet</span>
                </li>
              ) : null}

              {recentGames.map((history) => {
                const playerNames = history.games.map(
                  (entry) => entry.player.name,
                );

                return (
                  <li
                    key={history.roomId + history.startedAt.toString()}
                    className={styles.matchItem}
                  >
                    <div className={styles.matchPlayers}>
                      <span className={styles.playerNameHighlight}>
                        {getMatchPlayersLabel(playerNames)}
                      </span>
                    </div>
                    <span className={styles.matchMode}>{history.gameMode}</span>
                  </li>
                );
              })}

              {historyError ? (
                <li className={styles.matchItemEmpty}>
                  <span>{historyError}</span>
                </li>
              ) : null}
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
              {topScores.length === 0 ? (
                <li className={styles.matchItemEmpty}>
                  <span>No scores yet</span>
                </li>
              ) : null}

              {topScores.map((entry, index) => (
                <li
                  key={entry.gameId + entry.player.id}
                  className={styles.leaderboardItem}
                >
                  <span className={styles.leaderboardRank}>{index + 1}</span>
                  <span className={styles.leaderboardName}>
                    {entry.player.name}
                  </span>
                  <span className={styles.leaderboardScore}>
                    {formatScore(entry.score)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
