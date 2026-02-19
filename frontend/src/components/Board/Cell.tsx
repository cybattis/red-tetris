import { memo } from 'react';
import styles from './Cell.module.css';
import { getCellColor, getCellBorderColor, PieceType } from '../../utils/colors';

export interface CellProps {
  /** Cell value (0 = empty, 1-7 = piece types, 8 = penalty) */
  value: number;
  isGhost?: boolean;
  isActive?: boolean;
  size?: number;
}

export const Cell = memo(function Cell({
  value,
  isGhost = false,
  isActive = false,
  size,
}: CellProps) {
  const isEmpty = value === PieceType.EMPTY && !isGhost;
  const backgroundColor = getCellColor(value, isGhost);
  const borderColor = isActive ? getCellBorderColor(value) : 'transparent';

  const style: React.CSSProperties = {
    backgroundColor,
    borderColor,
    ...(size && { width: size, height: size }),
  };

  const classNames = [
    styles.cell,
    isEmpty ? styles.empty : styles.filled,
    isGhost ? styles.ghost : '',
    isActive ? styles.active : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} style={style} />;
});

export default Cell;
