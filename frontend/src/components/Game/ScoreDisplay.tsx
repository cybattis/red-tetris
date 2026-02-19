import { memo } from 'react';
import styles from './ScoreDisplay.module.css';

export interface ScoreDisplayProps {
  score: number;
  level: number;
  linesCleared: number;
  totalLines?: number;
}

export const ScoreDisplay = memo(function ScoreDisplay({
  score,
  level,
  linesCleared,
}: ScoreDisplayProps) {
  return (
    <div className={styles.container}>
      <StatItem label="Score" value={formatScore(score)} />
      <StatItem label="Level" value={level.toString()} />
      <StatItem label="Lines" value={linesCleared.toString()} />
    </div>
  );
});

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem = memo(function StatItem({ label, value }: StatItemProps) {
  return (
    <div className={styles.statItem}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
});

function formatScore(score: number): string {
  return score.toLocaleString();
}

export default ScoreDisplay;
