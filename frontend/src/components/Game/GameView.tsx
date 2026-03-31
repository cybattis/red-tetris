import { useState, useEffect, useRef } from "react";
import styles from "./GameView.module.css";
import { PlayerBoard } from "./PlayerBoard";
import { GameOverOverlay } from "./GameOverOverlay";
import { Button } from "../UI";
import { useAppSelector, useAppDispatch } from "@/store";
import {
  selectBoard,
  selectCurrentPiece,
  selectGhostPiece,
  selectNextPieces,
  selectScore,
  selectTotalLinesCleared,
  selectIsPaused,
  selectIsGameOver,
  selectOpponent,
  selectCurrentBoardPlayer,
  selectBoardDimensions,
  selectClearingRows,
  selectPenaltyRows,
  selectGameOverReason,
  selectLockedCells,
  selectHardDropTrail,
  setClearingRows,
  clearClearingRows,
  setPenaltyRows,
  clearPenaltyRows,
  clearLockedCells,
  clearHardDropTrail,
  gameOver,
  resetGame,
} from "@store/slices/gameSlice.ts";
import {
  selectGameSettings,
  selectGameMode,
  selectCurrentPlayerId,
  selectIsSpectator,
} from "@store/slices/gameRoomSlice.ts";
import { EndGameReason } from "@shared/types/game";
import type { OpponentsGameState } from "@shared/types/player.ts";

export interface GameViewProps {
  roomName?: string;
  playerName?: string;
  isHost?: boolean;
  onLeave?: () => void;
  onReturnHome?: () => void;
}

export function GameView({
  roomName,
  playerName = "Player",
  isHost = false,
  onLeave,
  onReturnHome,
}: Readonly<GameViewProps>) {
  const dispatch = useAppDispatch();

  // Game state from Redux (received from server)
  const board = useAppSelector(selectBoard);
  const currentPiece = useAppSelector(selectCurrentPiece);
  const ghostPiece = useAppSelector(selectGhostPiece);
  const nextPieces = useAppSelector(selectNextPieces);
  const score = useAppSelector(selectScore);
  const totalLinesCleared = useAppSelector(selectTotalLinesCleared);
  const isPaused = useAppSelector(selectIsPaused);
  const isGameOver = useAppSelector(selectIsGameOver);
  const gameOverReason = useAppSelector(selectGameOverReason);
  const opponent = useAppSelector(selectOpponent);
  const currentBoardPlayer = useAppSelector(selectCurrentBoardPlayer);
  const { width, height } = useAppSelector(selectBoardDimensions);
  const clearingRows = useAppSelector(selectClearingRows);
  const penaltyRows = useAppSelector(selectPenaltyRows);
  const gameSettings = useAppSelector(selectGameSettings);
  const gameMode = useAppSelector(selectGameMode);
  const currentPlayerId = useAppSelector(selectCurrentPlayerId);
  const isSpectator = useAppSelector(selectIsSpectator);

  // Animation data from server
  const lockedCells = useAppSelector(selectLockedCells);
  const hardDropTrail = useAppSelector(selectHardDropTrail);

  // Local state for debug animations (keep for debugging)
  const [debugLockedCells, setDebugLockedCells] = useState<
    { x: number; y: number; type: number }[]
  >([]);
  const [debugHardDropTrail, setDebugHardDropTrail] = useState<
    { x: number; startY: number; endY: number; type: number }[]
  >([]);

  // Use refs to prevent multiple overlapping animations
  const lockedCellsTimeoutRef = useRef<number | null>(null);
  const hardDropTimeoutRef = useRef<number | null>(null);
  const lineClearTimeoutRef = useRef<number | null>(null);

  // Handle animation clearing with timeouts
  useEffect(() => {
    if (lockedCells.length > 0) {
      // If there's already an animation in progress, don't start a new one
      if (lockedCellsTimeoutRef.current) {
        return;
      }

      lockedCellsTimeoutRef.current = setTimeout(() => {
        dispatch(clearLockedCells());
        lockedCellsTimeoutRef.current = null;
      }, 400);

      return () => {
        if (lockedCellsTimeoutRef.current) {
          clearTimeout(lockedCellsTimeoutRef.current);
          lockedCellsTimeoutRef.current = null;
        }
      };
    }
  }, [lockedCells, dispatch]); // Depend on the actual array, not just length

  useEffect(() => {
    if (hardDropTrail.length > 0) {
      // If there's already an animation in progress, don't start a new one
      if (hardDropTimeoutRef.current) {
        return;
      }

      hardDropTimeoutRef.current = setTimeout(() => {
        dispatch(clearHardDropTrail());
        hardDropTimeoutRef.current = null;
      }, 500);

      return () => {
        if (hardDropTimeoutRef.current) {
          clearTimeout(hardDropTimeoutRef.current);
          hardDropTimeoutRef.current = null;
        }
      };
    }
  }, [hardDropTrail, dispatch]); // Depend on the actual array, not just length

  useEffect(() => {
    if (clearingRows.length > 0) {
      // If there's already an animation in progress, don't start a new one
      if (lineClearTimeoutRef.current) {
        return;
      }

      lineClearTimeoutRef.current = setTimeout(() => {
        dispatch(clearClearingRows());
        lineClearTimeoutRef.current = null;
      }, 1100);

      return () => {
        if (lineClearTimeoutRef.current) {
          clearTimeout(lineClearTimeoutRef.current);
          lineClearTimeoutRef.current = null;
        }
      };
    }
  }, [clearingRows, dispatch]);

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
    dispatch(gameOver({ reason: EndGameReason.BoardOverflow }));
  };

  const handleDebugWin = () => {
    dispatch(gameOver({ reason: EndGameReason.Victory }));
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

  // Determine if invisible mode is active
  const isInvisible = gameMode === "invisible";
  const isViewingOwnBoard =
    currentBoardPlayer?.id != null && currentBoardPlayer.id === currentPlayerId;
  // Determine game mode based on opponent
  const isSoloGame = opponent === null;
  const isSpectatorDualView = isSpectator && opponent != null;

  if (!isSoloGame && !opponent) {
    console.error("GameView: Multiplayer mode but opponent data is missing");
    return;
  }

  // Check if all opponent are eliminated (victory condition for multiplayer)
  const allOpponentsEliminated = !isSoloGame && opponent?.isEliminated;
  // Determine if we should show game over overlay and whether it's a victory
  const showGameOverOverlay = isGameOver || allOpponentsEliminated;
  const isVictory =
    allOpponentsEliminated && gameOverReason === EndGameReason.Victory;

  // Debug log game over state
  console.log(" GameView render - Game Over State:", {
    isGameOver,
    gameOverReason,
    isPaused,
  });

  console.log(" GameView render - Multiplayer State:", {
    isSoloGame,
    opponent,
  });

  console.log(" GameView - Victory Logic:", {
    allOpponentsEliminated,
    showGameOverOverlay,
    gameOverReason,
    opponentsStatus: opponent ?? "N/A",
  });

  return (
    <div className={styles.container}>
      <GameOverOverlay
        isVisible={showGameOverOverlay}
        isWinner={isVictory}
        stats={{
          score,
          linesCleared: totalLinesCleared,
          placement: opponent ? (isVictory ? 1 : 2) : undefined,
          totalPlayers: opponent ? 2 : undefined,
        }}
        onReturnToLobby={onLeave}
        onReturnHome={onReturnHome}
      />

      <header className={styles.header}>
        {onLeave && (
          <Button
            variant="ghost"
            onClick={onReturnHome}
            className={styles.leaveButton}
          >
            ← Leave Game
          </Button>
        )}
        {roomName && <h1 className={styles.roomName}>{roomName}</h1>}
        <div className={styles.headerSpacer} />
      </header>

      <main
        className={`${styles.gameArea} ${isSoloGame ? styles.soloLayout : styles.multiplayerLayout} ${isSpectatorDualView ? styles.spectatorDualLayout : ""}`}
      >
        <div className={styles.playerBoardWrapper}>
          <PlayerBoard
            playerName={currentBoardPlayer?.name ?? playerName}
            isCurrentPlayer={isViewingOwnBoard}
            isHost={isHost}
            board={board}
            width={width}
            height={height}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            nextPieces={nextPieces}
            maxNextDisplay={gameSettings.nextPieceCount}
            score={score}
            linesCleared={totalLinesCleared}
            isPaused={isPaused}
            isGameOver={isGameOver}
            isInvisible={isInvisible}
            clearingRows={clearingRows}
            penaltyRows={penaltyRows}
            lockedCells={
              lockedCells.length > 0 ? lockedCells : debugLockedCells
            }
            hardDropTrail={
              hardDropTrail.length > 0 ? hardDropTrail : debugHardDropTrail
            }
            size="normal"
          />

          {!isSoloGame && opponent != null && (
            <div className={styles.opponentBoardWrapper}>
              <OpponentBoard
                opponent={opponent}
                boardWidth={width}
                boardHeight={height}
                maxNextDisplay={1}
                size={isSpectatorDualView ? "normal" : "small"}
              />
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.controls}>
          <span>← → Move</span>
          <span>↑ Rotate</span>
          <span>↓ Soft Drop</span>
          <span>Space Hard Drop</span>
        </div>
      </footer>

      {/* Debug panel - only show in development */}
      {import.meta.env.DEV && (
        <div className={styles.debugPanel}>
          <span className={styles.debugTitle}>Debug</span>
          <button onClick={handleDebugLineClear}>Line Clear</button>
          <button onClick={handleDebugPenaltyLines}>Penalty Lines</button>
          <button onClick={handleDebugLockPiece}>Lock Piece</button>
          <button onClick={handleDebugHardDrop}>Hard Drop</button>
          <button onClick={handleDebugGameOver}>Game Over</button>
          <button onClick={handleDebugWin}>Win</button>
          <button onClick={handleDebugReset}>Reset</button>
        </div>
      )}
    </div>
  );
}

interface OpponentBoardProps {
  opponent: OpponentsGameState;
  boardWidth: number;
  boardHeight: number;
  maxNextDisplay: number;
  size?: "normal" | "small";
}

function OpponentBoard({
  opponent,
  boardWidth,
  boardHeight,
  maxNextDisplay,
  size = "normal",
}: Readonly<OpponentBoardProps>) {
  const resolvedBoardWidth =
    (opponent.board?.[0]?.length ?? opponent.spectrum.length) || boardWidth;
  const resolvedBoardHeight = opponent.board?.length ?? boardHeight;

  if (opponent.board) {
    return (
      <PlayerBoard
        playerName={opponent.player.name}
        isCurrentPlayer={false}
        board={opponent.board}
        width={resolvedBoardWidth}
        height={resolvedBoardHeight}
        currentPiece={opponent.currentPiece || null}
        nextPieces={opponent.nextPieces}
        maxNextDisplay={maxNextDisplay}
        score={opponent.score}
        isGameOver={opponent.isEliminated}
        size={size}
      />
    );
  }

  const spectrumBoard = createBoardFromSpectrum(
    opponent.spectrum,
    resolvedBoardHeight,
    resolvedBoardWidth,
  );

  return (
    <PlayerBoard
      playerName={opponent.player.name}
      isCurrentPlayer={false}
      board={spectrumBoard}
      width={resolvedBoardWidth}
      height={resolvedBoardHeight}
      score={opponent.score}
      isGameOver={opponent.isEliminated}
      size={size}
    />
  );
}

function createBoardFromSpectrum(
  spectrum: number[],
  height: number,
  fallbackWidth: number,
): number[][] {
  const width = spectrum.length || fallbackWidth;
  const board: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(0),
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
