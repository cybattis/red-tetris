import styles from './CountdownOverlay.module.css';

export interface CountdownOverlayProps {
  count: number;
  message?: string;
}

export function CountdownOverlay({
  count,
  message = 'Game starting in...',
}: CountdownOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <div className={styles.countdown}>
          {count}
        </div>
      </div>
    </div>
  );
}

export default CountdownOverlay;
