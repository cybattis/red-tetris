import { useEffect, useRef } from "react";
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
  clearClearingRows,
  clearLockedCells,
  clearHardDropTrail,
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
            lockedCells={lockedCells}
            hardDropTrail={hardDropTrail}
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
