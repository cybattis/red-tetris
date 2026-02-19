import styles from './Slider.module.css';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  disabled = false,
  onChange,
  className = '',
}: SliderProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <label className={styles.label}>{label}</label>
      <div className={styles.control}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={styles.slider}
        />
        <span className={styles.value}>
          {value}{suffix}
        </span>
      </div>
    </div>
  );
}

export default Slider;
