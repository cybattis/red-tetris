import type { Player } from '../../types/game';
import styles from './PlayerList.module.css';

export interface PlayerListProps {
  players: Player[];
  currentPlayerName?: string;
  maxPlayers?: number;
  showWaitingSlot?: boolean;
}

export function PlayerList({
  players,
  currentPlayerName,
  maxPlayers = 2,
  showWaitingSlot = true,
}: PlayerListProps) {
  return (
    <div className={styles.container}>
      <ul className={styles.playerList}>
        {players.map(player => (
          <li key={player.id} className={styles.playerItem}>
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>
                {player.name}
                {player.isHost && <span className={styles.hostBadge}>Host</span>}
              </span>
              {player.name === currentPlayerName && (
                <span className={styles.youBadge}>You</span>
              )}
            </div>
            <span className={`${styles.playerStatus} ${player.isReady ? styles.ready : ''}`}>
              {player.isReady ? '✓ Ready' : 'Waiting...'}
            </span>
          </li>
        ))}
        
        {showWaitingSlot && players.length < maxPlayers && (
          <li className={styles.playerItemEmpty}>
            <span className={styles.waitingText}>Waiting for opponent...</span>
          </li>
        )}
      </ul>
      
      <div className={styles.playerCount}>
        {players.length}/{maxPlayers} Players
      </div>
    </div>
  );
}

export default PlayerList;
