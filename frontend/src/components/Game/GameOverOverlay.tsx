import { memo, useEffect, useState } from 'react';
import styles from './GameOverOverlay.module.css';

export interface GameOverStats {
  score: number;
  level: number;
  linesCleared: number;
  placement?: number;
  totalPlayers?: number;
}

export interface GameOverOverlayProps {
  isVisible: boolean;
  reason?: string;
  stats: GameOverStats;
  isWinner?: boolean;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
  onReturnHome?: () => void;
}

export const GameOverOverlay = memo(function GameOverOverlay({
  isVisible,
  reason = 'Game Over',
  stats,
  isWinner = false,
  onPlayAgain,
  onReturnToLobby,
  onReturnHome,
}: GameOverOverlayProps) {
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const statsTimer = setTimeout(() => setShowStats(true), 600);
      const buttonsTimer = setTimeout(() => setShowButtons(true), 1200);
      
      return () => {
        clearTimeout(statsTimer);
        clearTimeout(buttonsTimer);
      };
    } else {
      setShowStats(false);
      setShowButtons(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const placementText = stats.placement && stats.totalPlayers
    ? `${getOrdinal(stats.placement)} of ${stats.totalPlayers}`
    : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={`${styles.titleContainer} ${isWinner ? styles.winner : ''}`}>
          {isWinner && <div className={styles.confetti} aria-hidden="true" />}
          <h1 className={styles.title}>
            {isWinner ? 'Victory!' : reason}
          </h1>
          {placementText && (
            <p className={styles.placement}>{placementText}</p>
          )}
        </div>

        <div className={`${styles.statsContainer} ${showStats ? styles.visible : ''}`}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.score.toLocaleString()}</span>
            <span className={styles.statLabel}>Score</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.level}</span>
            <span className={styles.statLabel}>Level</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.linesCleared}</span>
            <span className={styles.statLabel}>Lines</span>
          </div>
        </div>

        <div className={`${styles.buttonsContainer} ${showButtons ? styles.visible : ''}`}>
          {onPlayAgain && (
            <button className={styles.primaryButton} onClick={onPlayAgain}>
              Play Again
            </button>
          )}
          {onReturnToLobby && (
            <button className={styles.secondaryButton} onClick={onReturnToLobby}>
              Return to Lobby
            </button>
          )}
          {onReturnHome && (
            <button className={styles.secondaryButton} onClick={onReturnHome}>
              Return Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default GameOverOverlay;
