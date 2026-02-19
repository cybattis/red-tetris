import { Button } from '../UI/Button';
import styles from './CountdownOverlay.module.css';

export interface CountdownOverlayProps {
  count: number;
  showCancel?: boolean;
  onCancel?: () => void;
  message?: string;
}

export function CountdownOverlay({
  count,
  showCancel = false,
  onCancel,
  message = 'Game starting in...',
}: CountdownOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <div className={styles.countdown}>
          {count}
        </div>
        {showCancel && onCancel && (
          <Button
            variant="danger"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default CountdownOverlay;
