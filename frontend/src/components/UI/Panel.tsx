import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Panel.module.css';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'glass' | 'solid';
  className?: string;
}

export function Panel({
  title,
  children,
  variant = 'default',
  className = '',
  ...props
}: PanelProps) {
  const classNames = [
    styles.panel,
    styles[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}

export default Panel;
