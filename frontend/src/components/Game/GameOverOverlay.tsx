import { memo, useEffect, useState } from 'react';
import styles from './GameOverOverlay.module.css';
import { useAppSelector } from '@/store';
import { selectIsSpectator } from '@/store/slices/gameRoomSlice';

export interface GameOverStats {
  score: number;
  linesCleared: number;
  placement?: number;
  totalPlayers?: number;
}

export interface GameOverOverlayProps {
  isVisible: boolean;
  reason?: string;
  stats: GameOverStats;
  isWinner?: boolean;
  onReturnToLobby?: () => void;
  onReturnHome?: () => void;
}

export const GameOverOverlay = memo(function GameOverOverlay({
  isVisible,
  reason = 'Game Over',
  stats,
  isWinner = false,
  onReturnToLobby,
  onReturnHome,
}: GameOverOverlayProps) {
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // Game state from Redux (received from server)
  const isSpectator = useAppSelector(selectIsSpectator);

  console.log('GameOverOverlay visibility changed:', isVisible);
  console.log('Stats:', stats);
  console.log('Is Winner:', isWinner);
  console.log('Reason:', reason);
  console.log('Is Spectator:', isSpectator);

  useEffect(() => {
    if (isVisible) {
      const statsTimer = setTimeout(() => setShowStats(true), 600);
      const buttonsTimer = setTimeout(() => setShowButtons(true), 1200);

      return () => {
        clearTimeout(statsTimer);
        clearTimeout(buttonsTimer);
      };
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
            {isWinner && !isSpectator ? 'Victory!' : reason}
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
            <span className={styles.statValue}>{stats.linesCleared}</span>
            <span className={styles.statLabel}>Lines</span>
          </div>
        </div>

        <div className={`${styles.buttonsContainer} ${showButtons ? styles.visible : ''}`}>
          {!isSpectator && onReturnToLobby && (
            <button className={styles.primaryButton} onClick={onReturnToLobby}>
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
