import { Link } from 'react-router-dom';
import { TetrisBackground } from '@/components/UI';
import styles from './NotFoundPage.module.css';

const FOUR_SHAPE = [
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [1, 1, 1, 1],
  [0, 0, 0, 1],
  [0, 0, 0, 1],
];

const ZERO_SHAPE = [
  [1, 1, 1, 1],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [1, 1, 1, 1],
];

interface BlockGridProps {
  shape: number[][];
  color: string;
  delay?: number;
}

function BlockGrid({ shape, color, delay = 0 }: BlockGridProps) {
  return (
    <div 
      className={styles.blockGrid}
      style={{ 
        '--block-color': color,
        '--animation-delay': `${delay}s`,
      } as React.CSSProperties}
    >
      {shape.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.blockRow}>
          {row.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              className={`${styles.block} ${cell ? styles.blockFilled : styles.blockEmpty}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <TetrisBackground pieceCount={40} />
      
      <main className={styles.content}>
        <div className={styles.errorCode}>
          <BlockGrid shape={FOUR_SHAPE} color="#00f0f0" delay={0} />
          <BlockGrid shape={ZERO_SHAPE} color="#f0f000" delay={0.1} />
          <BlockGrid shape={FOUR_SHAPE} color="#a000f0" delay={0.2} />
        </div>

        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.message}>
          Looks like this block fell into the void!
        </p>
        <p className={styles.submessage}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.homeButton}>
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default NotFoundPage;
