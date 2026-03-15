import styles from "./GameModeSelector.module.css";
import type { GameMode } from "@shared/types/game.ts";
import { GAME_MODES } from "../../types/game.ts";

export interface GameModeSelectorProps {
  selectedMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  disabled?: boolean;
}

export function GameModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: Readonly<GameModeSelectorProps>) {
  return (
    <div className={styles.container}>
      <div className={styles.gameModeGrid}>
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`${styles.gameModeButton} ${selectedMode === mode.id ? styles.gameModeActive : ""}`}
          >
            <span className={styles.gameModeName}>{mode.name}</span>
            <span className={styles.gameModeDescription}>
              {mode.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
