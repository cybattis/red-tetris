import { useState } from 'react';
import styles from './GameView.module.css';
import { PlayerBoard } from './PlayerBoard';
import { GameOverOverlay } from './GameOverOverlay';
import { Button } from '../UI';
import { useAppSelector, useAppDispatch } from '../../store';
import {
  selectBoard,
  selectCurrentPiece,
  selectGhostPiece,
  selectNextPieces,
  selectScore,
  selectLevel,
  selectLinesCleared,
  selectIsPaused,
  selectIsGameOver,
  selectOpponents,
  selectBoardDimensions,
  selectClearingRows,
  selectPenaltyRows,
  selectGameOverReason,
  setClearingRows,
  clearClearingRows,
  setPenaltyRows,
  clearPenaltyRows,
  gameOver,
  resetGame,
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
  const dispatch = useAppDispatch();

  // Game state from Redux (received from server)
  const board = useAppSelector(selectBoard);
  const currentPiece = useAppSelector(selectCurrentPiece);
  const ghostPiece = useAppSelector(selectGhostPiece);
  const nextPieces = useAppSelector(selectNextPieces);
  const score = useAppSelector(selectScore);
  const level = useAppSelector(selectLevel);
  const linesCleared = useAppSelector(selectLinesCleared);
  const isPaused = useAppSelector(selectIsPaused);
  const isGameOver = useAppSelector(selectIsGameOver);
  const gameOverReason = useAppSelector(selectGameOverReason);
  const opponents = useAppSelector(selectOpponents);
  const { width, height } = useAppSelector(selectBoardDimensions);
  const clearingRows = useAppSelector(selectClearingRows);
  const penaltyRows = useAppSelector(selectPenaltyRows);

  // Local state for debug animations (lock and hard drop)
  const [debugLockedCells, setDebugLockedCells] = useState<{ x: number; y: number; type: number }[]>([]);
  const [debugHardDropTrail, setDebugHardDropTrail] = useState<{ x: number; startY: number; endY: number; type: number }[]>([]);

  // Determine game mode based on opponents
  const isSoloGame = opponents.length === 0;
  const opponent = opponents[0]; // For 1v1, we only have one opponent

  // === DEBUG HANDLERS ===
  const handleDebugLineClear = () => {
    // Simulate clearing bottom 2 rows with shake + firework particles
    dispatch(setClearingRows([height - 1, height - 2]));
    setTimeout(() => dispatch(clearClearingRows()), 1100);
  };

  const handleDebugPenaltyLines = () => {
    // Simulate 2 penalty lines at the bottom with warning flash
    dispatch(setPenaltyRows([height - 1, height - 2]));
    setTimeout(() => dispatch(clearPenaltyRows()), 600);
  };

  const handleDebugGameOver = () => {
    dispatch(gameOver({ reason: 'Board Overflow' }));
  };

  const handleDebugWin = () => {
    dispatch(gameOver({ reason: 'Victory!' }));
  };

  const handleDebugReset = () => {
    dispatch(resetGame());
  };

  const handleDebugLockPiece = () => {
    // Simulate a T-piece locking in the middle of the board
    const lockedCells = [
      { x: 4, y: height - 3, type: 6 }, // T-piece type
      { x: 3, y: height - 2, type: 6 },
      { x: 4, y: height - 2, type: 6 },
      { x: 5, y: height - 2, type: 6 },
    ];
    setDebugLockedCells(lockedCells);
    setTimeout(() => setDebugLockedCells([]), 400);
  };

  const handleDebugHardDrop = () => {
    // Simulate hard drop trail from top to near bottom
    const trails = [
      { x: 4, startY: 0, endY: height - 4, type: 1 }, // I-piece columns
      { x: 5, startY: 0, endY: height - 4, type: 1 },
      { x: 6, startY: 0, endY: height - 4, type: 1 },
      { x: 7, startY: 0, endY: height - 4, type: 1 },
    ];
    setDebugHardDropTrail(trails);
    setTimeout(() => setDebugHardDropTrail([]), 500);
  };

  return (
    <div className={styles.container}>
      <GameOverOverlay
        isVisible={isGameOver}
        reason={gameOverReason ?? 'Game Over'}
        isWinner={gameOverReason === 'Victory!'}
        stats={{
          score,
          level,
          linesCleared,
          placement: opponents.length > 0 ? 1 : undefined,
          totalPlayers: opponents.length > 0 ? opponents.length + 1 : undefined,
        }}
        onPlayAgain={handleDebugReset}
        onReturnToLobby={onLeave}
      />

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
            score={score}
            level={level}
            linesCleared={linesCleared}
            isPaused={isPaused}
            isGameOver={isGameOver}
            clearingRows={clearingRows}
            penaltyRows={penaltyRows}
            lockedCells={debugLockedCells}
            hardDropTrail={debugHardDropTrail}
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
          <span>Esc Pause</span>
        </div>
      </footer>

      <div className={styles.debugPanel}>
        <span className={styles.debugTitle}>🛠 Debug</span>
        <button onClick={handleDebugLineClear}>Line Clear</button>
        <button onClick={handleDebugPenaltyLines}>Penalty Lines</button>
        <button onClick={handleDebugLockPiece}>Lock Piece</button>
        <button onClick={handleDebugHardDrop}>Hard Drop</button>
        <button onClick={handleDebugGameOver}>Game Over</button>
        <button onClick={handleDebugWin}>Win</button>
        <button onClick={handleDebugReset}>Reset</button>
      </div>
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
