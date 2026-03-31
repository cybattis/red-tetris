# Red Tetris - Implementation Strategy (Current State)

> Version: 2.0
> Last Updated: 2026-03-22
> Status: Synced with repository state

---

## 1) Scope of this document

This file now reflects what is implemented in the current codebase, what is partially implemented, and what is still planned.

The previous version was a forward-looking blueprint; this version is a "living status" strategy.

---

## 2) Current architecture (as implemented)

```text
Frontend (React + Redux + socket.io-client)
  - Renders board and UI
  - Captures keyboard input
  - Stores server game state in Redux
  - Sends room/game events over Socket.io

Backend (Node.js + Express + Socket.io)
  - Manages rooms and players
  - Runs game loops server-side (Room -> Game per player)
  - Broadcasts game state and animation events
  - Persists game history to JSON via GameHistoryManager

Optional backend mode:
  - RoomWorkerManager can run room game loops in worker threads
  - Enabled with USE_ROOM_WORKERS=1
```

### Source of truth split

- Server-authoritative gameplay is implemented (`backend/src/classes/Game.ts`).
- Client game slice is display-focused and stores server updates (`frontend/src/store/slices/gameSlice.ts`).

---

## 3) Repository structure (actual)

```text
red-tetris/
  backend/
    src/
      classes/           # Game, Room, Player, Piece, PiecesSequence
      managers/          # RoomManager, RoomWorkerManager, GameHistoryManager
      socket/            # WebSocketManager + room/game handlers
      workers/           # room.worker.ts (+ message types)
      pieces/            # TetrominoFactory
      utils/
    test/
  frontend/
    src/
      components/        # Board, Game UI, Lobby UI, shared UI
      hooks/             # useSocket, useGameInput
      pages/             # HomePage, GameRoom, NotFound, SocketTest
      store/             # Redux slices + socket middleware
      utils/
    tests/
  shared/
    types/               # game, socket, room, piece, player
  docs/
    strategy.md
```

Notes:
- The implemented tree uses `backend/` and `frontend/` (not `server/` and `client/`).
- Shared TypeScript contracts are actively used by both sides.

---

## 4) Feature status matrix

### 4.1 Core gameplay and multiplayer

| Feature                                     | Status      | Evidence                                                                         |
|---------------------------------------------|-------------|----------------------------------------------------------------------------------|
| Room join/leave lifecycle                   | Implemented | `backend/src/socket/RoomSocketHandler.ts`, `backend/src/managers/RoomManager.ts` |
| Host assignment/transfer                    | Implemented | `backend/src/classes/Room.ts`                                                    |
| Start game from host                        | Implemented | `backend/src/socket/RoomSocketHandler.ts`, `backend/src/classes/Room.ts`         |
| Server game loop                            | Implemented | `backend/src/classes/Game.ts`                                                    |
| Keyboard input -> server action             | Implemented | `frontend/src/hooks/useGameInput.ts`, `backend/src/socket/GameSocketHandler.ts`  |
| Same piece sequence fairness                | Implemented | `backend/src/classes/PiecesSequence.ts`, room seed usage in `Room.startGame()`   |
| Penalty lines `(n - 1)` to opponents        | Implemented | `backend/src/classes/Game.ts`, `backend/src/classes/Room.ts`                     |
| Spectator support when room is full/in-game | Implemented | `backend/src/classes/Room.ts`                                                    |
| End game + broadcast result                 | Implemented | `backend/src/classes/Room.ts`, `backend/src/socket/WebSocketManager.ts`          |

Implementation detail currently differs from original draft:
- Penalty rows are fully filled indestructible rows (value `8`) without random hole (`backend/src/classes/Game.ts`).

### 4.2 Game modes and settings

| Feature                                   | Status                                      | Evidence                                                                                       |
|-------------------------------------------|---------------------------------------------|------------------------------------------------------------------------------------------------|
| Classic mode                              | Implemented                                 | `shared/types/game.ts`                                                                         |
| Sprint mode                               | Implemented (gravity acceleration behavior) | `backend/src/classes/Game.ts`                                                                  |
| Invisible mode                            | Implemented in rendering path               | `frontend/src/components/Board/Board.tsx`                                                      |
| Host settings panel in lobby              | Implemented                                 | `frontend/src/pages/GameRoom.tsx`, `frontend/src/components/.../GameSettingsPanel`             |
| Runtime settings sync via socket          | Implemented (broadcast)                     | `frontend/src/store/middleware/socketMiddleware.ts`, `backend/src/socket/GameSocketHandler.ts` |
| Strong server-side validation of settings | Partial                                     | Broadcast exists; strict validation is not centralized yet                                     |

### 4.3 UI and rendering constraints

| Requirement                           | Status      | Evidence                                         |
|---------------------------------------|-------------|--------------------------------------------------|
| No `<table>`/`<canvas>`/SVG for board | Implemented | `frontend/src/components/Board/Board.tsx`        |
| CSS Grid/Flex rendering               | Implemented | `frontend/src/components/Board/Board.module.css` |
| Functional React components           | Implemented | Frontend component/hook patterns                 |

### 4.4 Extra systems

| System                            | Status                                | Evidence                                                                        |
|-----------------------------------|---------------------------------------|---------------------------------------------------------------------------------|
| Match history + top scores view   | Implemented                           | `backend/src/managers/GameHistoryManager.ts`, `frontend/src/pages/HomePage.tsx` |
| Dedicated matchmaking queue       | Not implemented                       | No matchmaking manager/events in current code                                   |
| Dedicated leaderboard manager API | Not implemented as standalone service | Replaced by history-based top scores                                            |
| Audio manager and sound design    | Not implemented                       | No audio manager/assets wired in current runtime                                |

---

## 5) Socket events (actual)

### Client -> Server

- `JOIN_ROOM`
- `LEAVE_ROOM`
- `START_GAME`
- `PLAYER_INPUT`
- `UPDATE_SETTINGS`
- `UPDATE_GAME_MODE`
- `HISTORY`
- `ping`

### Server -> Client

- `ROOM_STATE_UPDATE`
- `PLAYER_JOINED`
- `PLAYER_LEFT`
- `HOST_TRANSFER`
- `LEFT_ROOM`
- `ROOM_ERROR`
- `GAME_STARTED`
- `GAME_STATE_UPDATE`
- `GAME_ANIMATION`
- `GAME_ENDED`
- `SETTINGS_UPDATED`
- `GAME_MODE_UPDATED`
- `HISTORY_RESPONSE`
- `pong`

Reference types: `shared/types/socket.ts` and runtime handlers in backend/frontend socket modules.

---

## 6) Testing and coverage status

### Backend

- Test suites are broad across classes/managers/socket (`backend/test/**`).
- Coverage thresholds configured at 70/70/70 and branch 50 (`backend/jest.config.cjs`).
- Current generated report (2026-03-21):
  - Statements: 92.61%
  - Branches: 91.85%
  - Functions: 91.2%
  - Lines: 93.04%
- Source: `backend/coverage/lcov-report/index.html`.

### Frontend

- Tests exist for hooks, slices, middleware, utils (`frontend/tests/**`).
- Coverage thresholds configured at 70/70/70 and branch 50 (`frontend/jest.config.js`).
- Last generated report in repo (2026-03-15) is far below target:
  - Statements: 4.31%
  - Branches: 0%
  - Functions: 4.63%
  - Lines: 3.06%
- Source: `frontend/coverage/index.html`.

Conclusion:
- Backend coverage objective is met.
- Frontend coverage objective is not met in the checked-in report and must be raised.

---

## 7) Constraints compliance snapshot

| Constraint                                       | Status                               | Notes                              |
|--------------------------------------------------|--------------------------------------|------------------------------------|
| Server OOP with classes                          | Implemented                          | `Game`, `Room`, `Player`, `Piece`  |
| Client functional style (no class/this patterns) | Implemented in current frontend flow | Hooks + function components        |
| No jQuery                                        | Implemented                          | No jQuery usage                    |
| No table/canvas/SVG board renderer               | Implemented                          | Grid/CSS renderer                  |
| URL-based room join                              | Implemented                          | Route `/:room/:playerName`         |
| Multiplayer penalties `(n - 1)`                  | Implemented                          | Solid penalty rows design          |
| Coverage >= 70% / branches >= 50%                | Partial overall                      | Backend yes, frontend currently no |

---

## 8) What changed vs the original draft

- The document now matches current event names and actual folder names.
- Strategy is updated from "planned server/client architecture" to real `backend/frontend/shared` implementation.
- Bonus feature section has been reclassified into implemented vs pending rather than assumed done.
- Coverage section now reports current generated artifacts, including the frontend gap.

---

## 9) Next milestones (short-term)

1. Raise frontend coverage to required thresholds (prioritize `socketMiddleware`, `Board`, `GameRoom` paths).
2. Add server-side validation rules for `UPDATE_SETTINGS` and host-only guarantees for all lobby mutations.
3. Decide whether to keep history-based leaderboard only, or introduce a dedicated leaderboard service/API.
4. Decide whether matchmaking/audio remain in scope for this milestone or move to a later release.

---

## 10) Reference files

- Backend core: `backend/src/classes/Game.ts`, `backend/src/classes/Room.ts`
- Backend room orchestration: `backend/src/managers/RoomManager.ts`, `backend/src/socket/RoomSocketHandler.ts`
- Backend socket entrypoint: `backend/src/socket/WebSocketManager.ts`
- Frontend room flow: `frontend/src/pages/GameRoom.tsx`
- Frontend game state handling: `frontend/src/store/slices/gameSlice.ts`
- Frontend socket bridge: `frontend/src/store/middleware/socketMiddleware.ts`
- Shared contracts: `shared/types/game.ts`, `shared/types/socket.ts`, `shared/types/room.ts`
- Coverage artifacts: `backend/coverage/lcov-report/index.html`, `frontend/coverage/index.html`
