import styles from './Toggle.module.css';

export interface ToggleProps {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export function Toggle({
  label,
  value,
  disabled = false,
  onChange,
  className = '',
}: ToggleProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <label className={styles.label}>{label}</label>
      <div className={styles.control}>
        <button
          onClick={() => onChange(!value)}
          disabled={disabled}
          className={`${styles.toggleButton} ${value ? styles.active : ''}`}
          type="button"
          aria-pressed={value}
        >
          {value ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}

export default Toggle;
