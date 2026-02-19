import styles from './GameView.module.css';
import { PlayerBoard } from './PlayerBoard';
import { Button } from '../UI';
import { useAppSelector } from '../../store';
import {
  selectBoard,
  selectCurrentPiece,
  selectGhostPiece,
  selectNextPieces,
  selectHoldPiece,
  selectCanHold,
  selectScore,
  selectLevel,
  selectLinesCleared,
  selectIsPaused,
  selectIsGameOver,
  selectOpponents,
  selectBoardDimensions,
} from '../../store/slices/gameSlice';

export interface GameViewProps {
  roomName?: string;
  playerName?: string;
  isHost?: boolean;
  onLeave?: () => void;
}

export function GameView({ 
  roomName, 
  playerName = 'Player',
  isHost = false,
  onLeave,
}: GameViewProps) {
  // Game state from Redux (received from server)
  const board = useAppSelector(selectBoard);
  const currentPiece = useAppSelector(selectCurrentPiece);
  const ghostPiece = useAppSelector(selectGhostPiece);
  const nextPieces = useAppSelector(selectNextPieces);
  const holdPiece = useAppSelector(selectHoldPiece);
  const canHold = useAppSelector(selectCanHold);
  const score = useAppSelector(selectScore);
  const level = useAppSelector(selectLevel);
  const linesCleared = useAppSelector(selectLinesCleared);
  const isPaused = useAppSelector(selectIsPaused);
  const isGameOver = useAppSelector(selectIsGameOver);
  const opponents = useAppSelector(selectOpponents);
  const { width, height } = useAppSelector(selectBoardDimensions);

  // Determine game mode based on opponents
  const isSoloGame = opponents.length === 0;
  const opponent = opponents[0]; // For 1v1, we only have one opponent

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {onLeave && (
          <Button variant="ghost" onClick={onLeave} className={styles.leaveButton}>
            ← Leave Room
          </Button>
        )}
        {roomName && <h1 className={styles.roomName}>{roomName}</h1>}
        <div className={styles.headerSpacer} />
      </header>

      <main className={`${styles.gameArea} ${isSoloGame ? styles.soloLayout : styles.multiplayerLayout}`}>
        
        <div className={styles.playerBoardWrapper}>
          <PlayerBoard
            playerName={playerName}
            isCurrentPlayer={true}
            isHost={isHost}
            board={board}
            width={width}
            height={height}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            nextPieces={nextPieces}
            holdPiece={holdPiece}
            canHold={canHold}
            score={score}
            level={level}
            linesCleared={linesCleared}
            isPaused={isPaused}
            isGameOver={isGameOver}
            size="normal"
          />
        </div>

        {!isSoloGame && opponent && (
          <div className={styles.opponentBoardWrapper}>
            <OpponentBoard
              opponent={opponent}
              boardHeight={height}
            />
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.controls}>
          <span>← → Move</span>
          <span>↑ Rotate</span>
          <span>↓ Soft Drop</span>
          <span>Space Hard Drop</span>
          <span>C Hold</span>
          <span>Esc Pause</span>
        </div>
      </footer>
    </div>
  );
}

interface OpponentBoardProps {
  opponent: {
    playerId: string;
    playerName: string;
    spectrum: number[];
    score: number;
    isEliminated: boolean;
    board?: number[][];
    holdPiece?: number | null;
    nextPieces?: number[];
  };
  boardHeight: number;
}

function OpponentBoard({ opponent, boardHeight }: OpponentBoardProps) {
  
  if (opponent.board) {
    return (
      <PlayerBoard
        playerName={opponent.playerName}
        isCurrentPlayer={false}
        board={opponent.board}
        width={10}
        height={boardHeight}
        holdPiece={opponent.holdPiece}
        nextPieces={opponent.nextPieces}
        score={opponent.score}
        isGameOver={opponent.isEliminated}
        size="normal"
      />
    );
  }

  const spectrumBoard = createBoardFromSpectrum(opponent.spectrum, boardHeight);
  
  return (
    <PlayerBoard
      playerName={opponent.playerName}
      isCurrentPlayer={false}
      board={spectrumBoard}
      width={10}
      height={boardHeight}
      score={opponent.score}
      isGameOver={opponent.isEliminated}
      size="normal"
    />
  );
}

function createBoardFromSpectrum(spectrum: number[], height: number): number[][] {
  const width = spectrum.length || 10;
  const board: number[][] = Array.from({ length: height }, () => 
    Array(width).fill(0)
  );
  
  for (let col = 0; col < width; col++) {
    const columnHeight = spectrum[col] || 0;
    for (let row = height - columnHeight; row < height; row++) {
      if (row >= 0) {
        board[row][col] = 8;
      }
    }
  }
  
  return board;
}

export default GameView;
