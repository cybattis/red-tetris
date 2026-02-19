import { memo } from 'react';
import styles from './Spectrum.module.css';

export interface SpectrumProps {
  playerName: string;
  spectrum: number[];
  score?: number;
  isEliminated?: boolean;
  boardHeight?: number;
}

export const Spectrum = memo(function Spectrum({
  playerName,
  spectrum,
  score = 0,
  isEliminated = false,
  boardHeight = 20,
}: SpectrumProps) {
  const maxHeight = boardHeight;

  return (
    <div className={`${styles.container} ${isEliminated ? styles.eliminated : ''}`}>
      <span className={styles.playerName}>{playerName}</span>
      <div className={styles.spectrumGrid}>
        {spectrum.map((height, col) => (
          <div key={col} className={styles.column}>
            <div
              className={styles.fill}
              style={{
                height: `${(height / maxHeight) * 100}%`,
              }}
            />
          </div>
        ))}
      </div>
      <span className={styles.score}>{score.toLocaleString()}</span>
      {isEliminated && <span className={styles.eliminatedBadge}>OUT</span>}
    </div>
  );
});

export default Spectrum;
