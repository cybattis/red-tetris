import type { GameMode } from '../../types/game';
import { GAME_MODES } from '../../types/game';
import styles from './GameModeSelector.module.css';

export interface GameModeSelectorProps {
  selectedMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  disabled?: boolean;
}

export function GameModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: GameModeSelectorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.gameModeGrid}>
        {GAME_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`${styles.gameModeButton} ${selectedMode === mode.id ? styles.gameModeActive : ''}`}
          >
            <span className={styles.gameModeName}>{mode.name}</span>
            <span className={styles.gameModeDescription}>{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default GameModeSelector;
