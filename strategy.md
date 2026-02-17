# Red Tetris - Technical Implementation Strategy

> **Version**: 1.0  
> **Last Updated**: February 17, 2026  
> **Status**: Draft - Awaiting Review

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Technical Deep Dive](#3-technical-deep-dive)
4. [Project Structure](#4-project-structure)
5. [Technology Stack](#5-technology-stack)
6. [Core Game Mechanics](#6-core-game-mechanics)
7. [Socket.io Events](#7-socketio-events)
8. [Redux State Structure](#8-redux-state-structure)
9. [Server Classes (OOP)](#9-server-classes-oop)
10. [Game Flow](#10-game-flow)
11. [Docker Configuration](#11-docker-configuration)
12. [Testing Strategy](#12-testing-strategy)
13. [Implementation Phases](#13-implementation-phases)
14. [Constraints Compliance](#14-constraints-compliance)
15. [Bonus Features](#15-bonus-features)

---

## 1. Project Overview

### Goal

Build a networked multiplayer Tetris game with:

- **Backend**: Node.js + TypeScript (OOP with classes)
- **Frontend**: React + TypeScript (functional programming, no `this`)
- **Real-time Communication**: Socket.io
- **State Management**: Redux
- **Containerization**: Docker
- **Testing**: Jest (≥70% coverage)

### Key Requirements Summary

| Requirement | Specification |
|-------------|---------------|
| Game Field | 10 columns × 20 rows |
| Multiplayer | Same piece sequence for all players |
| Penalty System | Line clear sends (n-1) lines to opponents |
| Win Condition | Last player alive wins |
| Solo Mode | Supported |
| Test Coverage | ≥70% statements, functions, lines; ≥50% branches |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOCKER ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐         ┌─────────────────────────┐   │
│  │   Frontend (React)  │  HTTP   │   Backend (Node.js)     │   │
│  │   - Redux Store     │◄───────►│   - Express Server      │   │
│  │   - Socket.io Client│ WS/WSS  │   - Socket.io Server    │   │
│  │   - Game Renderer   │◄───────►│   - Game Logic (OOP)    │   │
│  │   Port: 3000        │         │   Port: 8080            │   │
│  └─────────────────────┘         └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **HTTP**: Initial page load, static assets
2. **WebSocket (Socket.io)**: Real-time game events, state synchronization

---

## 3. Technical Deep Dive

### 3.1 Why Redux? State Management Strategy

#### Problem Without Redux

In a multiplayer Tetris game, we need to manage:
- Player information (name, score, host status)
- Room state (players list, game state)
- Game state (board, current piece, next pieces)
- Socket connection status
- Opponent spectrums (mini board previews)

Without Redux, this would require:
- Props drilling through multiple component levels
- Complex state synchronization across components
- Difficult state debugging
- Inconsistent state updates

#### Redux Solution

**Centralized State Tree**:
```typescript
// Single source of truth
{
  player: { id, name, isHost, score },
  room: { name, players[], state },
  game: { board[][], currentPiece, nextPieces[] },
  socket: { connected, error }
}
```

**Benefits**:
1. **Predictable State Updates**: Actions → Reducers → New State
2. **Time-Travel Debugging**: Redux DevTools shows every state change
3. **Middleware Integration**: Socket.io events trigger Redux actions
4. **Component Simplification**: Components read from store via selectors
5. **Testability**: Pure reducer functions are easy to test

**How We Use Redux**:

```typescript
// 1. Component dispatches action
dispatch(moveLeft());

// 2. Reducer updates state (pure function)
const newState = gameReducer(state, moveLeft());

// 3. Components re-render with new state
const position = useSelector(state => state.game.position);

// 4. Socket middleware can intercept and emit
// (optional for certain actions)
```

**Redux Toolkit Advantages**:
- Less boilerplate with `createSlice`
- Built-in Immer for immutable updates
- Simplified async logic with `createAsyncThunk`
- TypeScript support out of the box

---

### 3.2 Client-Server Responsibility Split

This is a **server-authoritative architecture** where the server runs the game and clients only send inputs and render state.

#### Server Responsibilities (Full Authority)

The server is the **single source of truth** for **everything**:

1. **Game Management**
   - Room creation/deletion
   - Player join/leave validation
   - Host assignment

2. **Game Execution** (The Core!)
   - Runs the game loop for ALL players
   - Applies gravity (piece movement down)
   - Processes player inputs (move, rotate, drop)
   - Performs collision detection
   - Handles piece locking
   - Detects and clears completed lines
   - Calculates scores
   - Manages piece sequence (7-bag randomizer)
   - Applies penalty lines

3. **State Broadcasting**
   - Sends complete game state to all players
   - Ensures perfect synchronization
   - No possibility of desync

4. **Win Condition**
   - Tracks player elimination
   - Determines winner
   - Ends game when ≤1 player alive

5. **Anti-Cheat (Built-in)**
   - Server validates all actions
   - Impossible to cheat (no client-side logic)
   - Rate limiting on inputs

#### Client Responsibilities (View + Input Only)

Clients are **thin clients** that only:

1. **Input Capture**
   - Listen for keyboard events
   - Send input events to server immediately
   - No local game logic execution

2. **State Rendering**
   - Receive game state from server
   - Update Redux store with server state
   - Render current state:
     - Game board (from server)
     - Current piece position (from server)
     - Ghost piece (calculated from server state)
     - Next pieces queue (from server)
     - Opponent spectrums (from server)
     - Scores (from server)

3. **UI/UX**
   - Display lobby/waiting room
   - Show game over/winner screens
   - Handle animations (optional, cosmetic only)

**Why This Architecture?**

| Aspect | Benefit |
|--------|---------|
| **Perfect Sync** | All players see identical state at same time |
| **Anti-Cheat** | Impossible to manipulate game state |
| **No Desync** | Single source of truth eliminates bugs |
| **Fair Play** | Server enforces all rules consistently |
| **Simplified Client** | Less client-side complexity |
| **Easier Debugging** | Game logic only in one place |

**Trade-offs Accepted**:

| Trade-off | Impact | Mitigation |
|-----------|--------|-----------|
| Input Lag | ~10-50ms depending on network | Acceptable for turn-based nature of Tetris |
| Server Load | Must run game loop per player | Tetris is lightweight, easily scalable |
| Bandwidth | More frequent state updates | Still minimal (~60 updates/sec × small state) |

#### Communication Flow Example

**Player Input → State Update**:
```
Client Side:
1. Player presses ArrowLeft
2. Capture keyboard event
3. Emit 'player_input' { action: 'MOVE_LEFT' } to server
4. Wait for server response (no local changes)

Server Side (Game Loop running at 60 FPS):
1. Receive 'player_input' { action: 'MOVE_LEFT', playerId: 'abc' }
2. Queue input for next game tick
3. Game tick processes:
   - Apply gravity (move piece down if time elapsed)
   - Process queued input (move left)
   - Check collision for move left
   - If valid: update piece position
   - If invalid: ignore input
4. After tick completes:
   - Broadcast 'game_state_update' to all players in room
   
Game State Update Payload:
{
  timestamp: 1234567890,
  players: {
    'abc': {
      board: number[][],           // 10x20 grid
      currentPiece: { type, rotation, x, y },
      nextPieces: [type, type, ...],
      score: 1200,
      linesCleared: 5,
      isAlive: true
    },
    'def': { /* ... */ }
  }
}

All Clients:
1. Receive 'game_state_update'
2. Update Redux store with new state
3. React re-renders components with new state
4. User sees updated position
```

**Line Clear Scenario**:
```
Server Side (During Game Tick):
1. Detect piece has hit bottom (collision)
2. Lock piece to board
3. Check for completed lines
4. Found 3 complete lines
5. Clear lines from board
6. Calculate score bonus (500 points)
7. Calculate penalty: 3 - 1 = 2 lines
8. Add 2 penalty lines to OTHER players' boards
9. Broadcast updated state to all clients

Clients:
1. Receive state with:
   - Updated board (lines removed)
   - New score
   - Opponent boards now have 2 penalty lines
2. Render new state
3. (Optional) Trigger line clear animation based on state diff
```

**Key Insight**: The server is a **game engine** that clients connect to as "thin terminals". Clients are purely for input and display.

---

### 3.3 Client-Server Communication: HTTP + WebSockets

We use **two protocols** for different purposes:

#### HTTP (Express Server)

**Purpose**: Initial connection and static assets

**What HTTP Does**:
1. Serve the React SPA (index.html, JS bundles, CSS)
2. Handle initial page load
3. No game logic over HTTP

**Implementation**:
```typescript
// server/src/server.ts
import express from 'express';
import path from 'path';

const app = express();

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// SPA fallback - send index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const server = app.listen(8080);
```

**Flow**:
```
User types: http://localhost:3000/room1/Alice
  ↓
Express serves index.html + React bundles
  ↓
React Router parses URL: { room: 'room1', playerName: 'Alice' }
  ↓
React app initializes, connects WebSocket
```

#### WebSocket (Socket.io)

**Purpose**: Real-time bidirectional communication

**Why WebSocket over HTTP**:
- **Low Latency**: ~1-10ms vs HTTP ~50-200ms
- **Bidirectional**: Server can push to client
- **Persistent**: One connection, many messages
- **Event-Based**: Named events (join_room, game_started, etc.)

**Socket.io Advantages over Raw WebSocket**:
- Auto-reconnection
- Rooms/namespaces support (built-in!)
- Fallback to HTTP long-polling
- Binary data support
- Acknowledgements

**Implementation**:

**Server Setup**:
```typescript
// server/src/server.ts
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Socket event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_room', ({ room, playerName }) => {
    // Join Socket.io room (namespace)
    socket.join(room);
    
    // Game logic
    const game = gameManager.getOrCreateGame(room);
    const player = new Player(socket.id, playerName);
    game.addPlayer(player);
    
    // Emit to joining player
    socket.emit('room_joined', { room: game.toJSON(), player: player.toJSON() });
    
    // Broadcast to others in room
    socket.to(room).emit('player_joined', { player: player.toJSON() });
  });
  
  socket.on('lines_cleared', ({ room, count }) => {
    const game = gameManager.getGame(room);
    game.handleLinesClear(socket.id, count);
    
    // Broadcast penalties to others
    const penalty = Math.max(0, count - 1);
    socket.to(room).emit('penalty_lines', { count: penalty, fromPlayer: socket.id });
  });
  
  socket.on('disconnect', () => {
    // Handle cleanup
  });
});
```

**Client Setup**:
```typescript
// client/src/socket/socketClient.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const initSocket = () => {
  socket = io('http://localhost:8080', {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  
  return socket;
};

export const getSocket = () => socket;

// client/src/store/middleware/socketMiddleware.ts
const socketMiddleware = (socket: Socket) => (store: MiddlewareAPI) => {
  // Listen for server events
  socket.on('room_joined', (data) => {
    store.dispatch(roomJoined(data));
  });
  
  socket.on('game_started', (data) => {
    store.dispatch(gameStarted(data));
  });
  
  socket.on('penalty_lines', (data) => {
    store.dispatch(receivePenalty(data));
  });
  
  // Intercept Redux actions to emit socket events
  return (next: Dispatch) => (action: Action) => {
    if (action.type === 'game/linesCleared') {
      socket.emit('lines_cleared', { 
        room: store.getState().room.name,
        count: action.payload 
      });
    }
    
    return next(action);
  };
};
```

**Communication Patterns**:

1. **Emit (Client → Server)**:
   ```typescript
   socket.emit('event_name', payload);
   ```

2. **Broadcast (Server → All in Room)**:
   ```typescript
   io.to(roomName).emit('event_name', payload);
   ```

3. **Broadcast to Others (Server → All Except Sender)**:
   ```typescript
   socket.to(roomName).emit('event_name', payload);
   ```

4. **Acknowledgement (Request-Response)**:
   ```typescript
   // Client
   socket.emit('start_game', { room }, (response) => {
     if (response.success) { /* ... */ }
   });
   
   // Server
   socket.on('start_game', ({ room }, ack) => {
     const result = game.start();
     ack({ success: result });
   });
   ```

**Socket.io Rooms**:
```typescript
// Rooms = game rooms in our case
socket.join('room1');        // Player joins room1
socket.to('room1').emit(...); // Send to all in room1
socket.leave('room1');       // Player leaves room1
```

**Why This Works Perfectly**:
- Socket.io rooms = our game rooms
- Automatic message routing
- No manual room management needed

---

### 3.4 Game Room Management

#### Room Lifecycle

```
1. Creation (Lazy)
   Player visits /room1/Alice
     ↓
   Socket emits 'join_room' { room: 'room1', playerName: 'Alice' }
     ↓
   Server: gameManager.getOrCreateGame('room1')
     ↓
   New Game instance created
     ↓
   Player added as host (first player)

2. Active (Players Join)
   Player visits /room1/Bob
     ↓
   Same room, Bob added as regular player
     ↓
   Both in same Socket.io room
     ↓
   Both receive updates

3. Playing
   Host starts game
     ↓
   Game.state = PLAYING
     ↓
   No new players can join (validated server-side)

4. Cleanup (Automatic)
   All players leave/disconnect
     ↓
   Room becomes empty
     ↓
   Periodic cleanup task removes empty games
```

#### Solo vs Multiplayer: Same Code, Different Players

**Key Insight**: There's **no difference** in implementation - it's just the number of players!

```typescript
// server/src/classes/Game.ts
class Game {
  public start(): boolean {
    // Works for 1 player (solo) or N players (multiplayer)
    if (this.players.size === 0) return false;
    
    // Generate piece sequence
    this.pieceSequence = [
      ...Piece.generateBag(),
      ...Piece.generateBag(),
      ...Piece.generateBag()
    ];
    
    this.state = GameState.PLAYING;
    return true;
  }
  
  public handleLinesClear(playerId: string, count: number): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    player.score += this.calculateScore(count);
    
    // Penalty calculation
    const penalty = Math.max(0, count - 1);
    
    if (penalty > 0) {
      // Send to ALL other players
      // If solo (1 player): loop doesn't execute - no penalties!
      // If multiplayer (2+ players): everyone else gets penalties
      this.players.forEach((p, id) => {
        if (id !== playerId && p.isAlive) {
          p.addPenaltyLines(penalty);
        }
      });
    }
  }
  
  public checkGameEnd(): void {
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.isAlive);
    
    // Solo: game ends when player dies (0 alive)
    // Multiplayer: game ends when 1 or 0 left
    if (alivePlayers.length <= 1) {
      this.state = GameState.FINISHED;
    }
  }
}
```

**Comparison**:

| Aspect | Solo (1 Player) | Multiplayer (2+ Players) |
|--------|----------------|--------------------------|
| Room Creation | Same | Same |
| Piece Sequence | Same (server generated) | Same (server generated) |
| Game Loop | Runs on client | Runs on each client independently |
| Line Clears | No penalties sent (no other players) | Penalties sent to others |
| Game Over | Player dies → game ends | Last player alive wins |
| Spectrum | Not shown (no opponents) | Shows all opponents |
| Host Status | Player is host | First player is host |

**Implementation Details**:

**Server - Room Management**:
```typescript
// server/src/managers/GameManager.ts
class GameManager {
  private games: Map<string, Game> = new Map();
  
  public getOrCreateGame(roomName: string): Game {
    let game = this.games.get(roomName);
    
    if (!game) {
      game = new Game(roomName);
      this.games.set(roomName, game);
      console.log(`Created new game room: ${roomName}`);
    }
    
    return game;
  }
  
  public removeEmptyGames(): void {
    this.games.forEach((game, roomName) => {
      if (game.getPlayers().length === 0) {
        this.games.delete(roomName);
        console.log(`Removed empty game room: ${roomName}`);
      }
    });
  }
}

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  gameManager.removeEmptyGames();
}, 5 * 60 * 1000);
```

**Client - URL-Based Room Joining**:
```typescript
// client/src/App.tsx
import { useParams, useNavigate } from 'react-router-dom';

const GameRoute = () => {
  const { room, playerName } = useParams<{ room: string; playerName: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!room || !playerName) {
      navigate('/');
      return;
    }
    
    // Validation
    if (playerName.length < 3 || playerName.length > 20) {
      alert('Name must be 3-20 characters');
      navigate('/');
      return;
    }
    
    // Join room via Redux action (triggers socket emit)
    dispatch(joinRoom({ room, playerName }));
  }, [room, playerName]);
  
  return <GameView />;
};

// Routes
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/:room/:playerName" element={<GameRoute />} />
</Routes>
```

**Client - Conditional Rendering**:
```typescript
// client/src/components/Game/GameView.tsx
const GameView = () => {
  const players = useSelector((state) => state.room.players);
  const spectrums = useSelector((state) => state.game.spectrums);
  const isSolo = players.length === 1;
  
  return (
    <div className="game-view">
      <div className="main-board">
        <Board />
        <NextPiece />
      </div>
      
      {/* Only show opponent spectrums if multiplayer */}
      {!isSolo && (
        <div className="spectrums">
          {players
            .filter(p => p.id !== currentPlayerId)
            .map(player => (
              <Spectrum 
                key={player.id}
                player={player}
                spectrum={spectrums[player.id]}
              />
            ))}
        </div>
      )}
    </div>
  );
};
```

**Validation - Prevent Join After Start**:
```typescript
// server/src/socket/handlers.ts
socket.on('join_room', ({ room, playerName }, ack) => {
  const game = gameManager.getOrCreateGame(room);
  
  // Validation: can't join if game already started
  if (game.state !== GameState.WAITING) {
    socket.emit('error', {
      code: 'GAME_IN_PROGRESS',
      message: 'Cannot join game in progress'
    });
    ack({ success: false, error: 'Game already started' });
    return;
  }
  
  const player = new Player(socket.id, playerName);
  const added = game.addPlayer(player);
  
  if (!added) {
    socket.emit('error', {
      code: 'CANNOT_JOIN',
      message: 'Unable to join room'
    });
    ack({ success: false });
    return;
  }
  
  socket.join(room);
  socket.emit('room_joined', { room: game.toJSON(), player: player.toJSON() });
  socket.to(room).emit('player_joined', { player: player.toJSON() });
  ack({ success: true });
});
```

**Summary**:
- Rooms are identified by URL path (`/room1/Alice`)
- Socket.io handles room membership automatically
- Game logic doesn't distinguish solo vs multiplayer
- Server enforces rules (no join after start)
- Client adapts UI based on player count

---

## 4. Project Structure

```
red-tetris/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── strategy.md
│
├── server/                          # Backend (OOP required)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── server.ts                # Express + Socket.io setup
│   │   ├── classes/                 # Required OOP classes
│   │   │   ├── Player.ts
│   │   │   ├── Piece.ts
│   │   │   └── Game.ts
│   │   ├── managers/
│   │   │   ├── GameManager.ts       # Manages multiple concurrent games
│   │   │   ├── RoomManager.ts       # Room/lobby management
│   │   │   ├── MatchmakingQueue.ts  # ⭐ Bonus: Matchmaking system
│   │   │   └── LeaderboardManager.ts # ⭐ Bonus: In-memory leaderboards
│   │   ├── pieces/
│   │   │   └── TetrominoFactory.ts  # 7 Tetris piece definitions
│   │   ├── socket/
│   │   │   ├── handlers.ts          # Socket event handlers
│   │   │   └── events.ts            # Event type definitions
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   └── types/
│   │       └── index.ts             # Server-specific types
│   └── tests/
│       ├── classes/
│       │   ├── Player.test.ts
│       │   ├── Piece.test.ts
│       │   └── Game.test.ts
│       ├── managers/
│       │   ├── GameManager.test.ts
│       │   ├── RoomManager.test.ts
│       │   ├── MatchmakingQueue.test.ts  # ⭐
│       │   └── LeaderboardManager.test.ts # ⭐
│       └── socket/
│           └── handlers.test.ts
│
├── client/                          # Frontend (Functional programming)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # Vite for bundling
│   ├── jest.config.js
│   ├── index.html
│   ├── public/                      # ⭐ Bonus: Static assets
│   │   └── sounds/                  # ⭐ Audio files
│   │       ├── move.mp3
│   │       ├── rotate.mp3
│   │       ├── land.mp3
│   │       ├── line_clear.mp3
│   │       ├── tetris.mp3
│   │       ├── game_over.mp3
│   │       └── music/
│   │           └── gameplay.mp3
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Router setup
│   │   ├── components/              # React components (pure functions)
│   │   │   ├── Board/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Cell.tsx
│   │   │   │   └── Board.styles.css
│   │   │   ├── Piece/
│   │   │   │   └── GhostPiece.tsx
│   │   │   ├── Game/
│   │   │   │   ├── GameView.tsx
│   │   │   │   ├── Spectrum.tsx     # Opponent boards preview
│   │   │   │   └── NextPiece.tsx
│   │   │   ├── Lobby/
│   │   │   │   ├── LobbyView.tsx
│   │   │   │   ├── PlayerList.tsx
│   │   │   │   ├── SettingsPanel.tsx # ⭐ Bonus: Game settings
│   │   │   │   └── ModeSelector.tsx  # ⭐ Bonus: Mode selection
│   │   │   ├── Matchmaking/         # ⭐ Bonus: Matchmaking
│   │   │   │   └── MatchmakingView.tsx
│   │   │   ├── Leaderboard/         # ⭐ Bonus: Leaderboards
│   │   │   │   └── LeaderboardView.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── AudioSettings.tsx # ⭐ Bonus: Audio controls
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useSocket.ts
│   │   │   ├── useGameControls.ts
│   │   │   └── useGameLoop.ts
│   │   ├── audio/                   # ⭐ Bonus: Audio system
│   │   │   └── AudioManager.ts
│   │   ├── store/                   # Redux store
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── gameSlice.ts
│   │   │   │   ├── playerSlice.ts
│   │   │   │   └── roomSlice.ts
│   │   │   └── middleware/
│   │   │       └── socketMiddleware.ts
│   │   ├── game/                    # Pure game logic functions
│   │   │   ├── board.ts             # Board manipulation
│   │   │   ├── collision.ts         # Collision detection
│   │   │   ├── movement.ts          # Piece movement
│   │   │   ├── rotation.ts          # Piece rotation (SRS)
│   │   │   └── scoring.ts           # Score calculation
│   │   ├── socket/
│   │   │   ├── socketClient.ts
│   │   │   └── events.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── global.css
│   └── tests/
│       ├── components/
│       │   ├── Board.test.tsx
│       │   ├── GameView.test.tsx
│       │   ├── SettingsPanel.test.tsx   # ⭐
│       │   └── MatchmakingView.test.tsx # ⭐
│       ├── audio/                       # ⭐
│       │   └── AudioManager.test.ts
│       ├── store/
│       │   ├── gameSlice.test.ts
│       │   └── socketMiddleware.test.ts
│       └── game/
│           ├── board.test.ts
│           ├── collision.test.ts
│           └── rotation.test.ts
│
└── shared/                          # Shared types/constants
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts                 # Shared TypeScript interfaces
        ├── events.ts                # Socket event names
        └── constants.ts             # Game constants
```

---

## 5. Technology Stack

```
red-tetris/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── strategy.md
│
├── server/                          # Backend (OOP required)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── server.ts                # Express + Socket.io setup
│   │   ├── classes/                 # Required OOP classes
│   │   │   ├── Player.ts
│   │   │   ├── Piece.ts
│   │   │   └── Game.ts
│   │   ├── managers/
│   │   │   ├── GameManager.ts       # Manages multiple concurrent games
│   │   │   ├── RoomManager.ts       # Room/lobby management
│   │   │   ├── MatchmakingQueue.ts  # ⭐ Bonus: Matchmaking system
│   │   │   └── LeaderboardManager.ts # ⭐ Bonus: In-memory leaderboards
│   │   ├── pieces/
│   │   │   └── TetrominoFactory.ts  # 7 Tetris piece definitions
│   │   ├── socket/
│   │   │   ├── handlers.ts          # Socket event handlers
│   │   │   └── events.ts            # Event type definitions
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   └── types/
│   │       └── index.ts             # Server-specific types
│   └── tests/
│       ├── classes/
│       │   ├── Player.test.ts
│       │   ├── Piece.test.ts
│       │   └── Game.test.ts
│       ├── managers/
│       │   ├── GameManager.test.ts
│       │   ├── RoomManager.test.ts
│       │   ├── MatchmakingQueue.test.ts  # ⭐
│       │   └── LeaderboardManager.test.ts # ⭐
│       └── socket/
│           └── handlers.test.ts
│
├── client/                          # Frontend (Functional programming)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # Vite for bundling
│   ├── jest.config.js
│   ├── index.html
│   ├── public/                      # ⭐ Bonus: Static assets
│   │   └── sounds/                  # ⭐ Audio files
│   │       ├── move.mp3
│   │       ├── rotate.mp3
│   │       ├── land.mp3
│   │       ├── line_clear.mp3
│   │       ├── tetris.mp3
│   │       ├── game_over.mp3
│   │       └── music/
│   │           └── gameplay.mp3
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Router setup
│   │   ├── components/              # React components (pure functions)
│   │   │   ├── Board/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Cell.tsx
│   │   │   │   └── Board.styles.css
│   │   │   ├── Piece/
│   │   │   │   └── GhostPiece.tsx
│   │   │   ├── Game/
│   │   │   │   ├── GameView.tsx
│   │   │   │   ├── Spectrum.tsx     # Opponent boards preview
│   │   │   │   └── NextPiece.tsx
│   │   │   ├── Lobby/
│   │   │   │   ├── LobbyView.tsx
│   │   │   │   ├── PlayerList.tsx
│   │   │   │   ├── SettingsPanel.tsx # ⭐ Bonus: Game settings
│   │   │   │   └── ModeSelector.tsx  # ⭐ Bonus: Mode selection
│   │   │   ├── Matchmaking/         # ⭐ Bonus: Matchmaking
│   │   │   │   └── MatchmakingView.tsx
│   │   │   ├── Leaderboard/         # ⭐ Bonus: Leaderboards
│   │   │   │   └── LeaderboardView.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── AudioSettings.tsx # ⭐ Bonus: Audio controls
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useSocket.ts
│   │   │   ├── useGameControls.ts
│   │   │   └── useGameLoop.ts
│   │   ├── audio/                   # ⭐ Bonus: Audio system
│   │   │   └── AudioManager.ts
│   │   ├── store/                   # Redux store
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── gameSlice.ts
│   │   │   │   ├── playerSlice.ts
│   │   │   │   └── roomSlice.ts
│   │   │   └── middleware/
│   │   │       └── socketMiddleware.ts
│   │   ├── game/                    # Pure game logic functions
│   │   │   ├── board.ts             # Board manipulation
│   │   │   ├── collision.ts         # Collision detection
│   │   │   ├── movement.ts          # Piece movement
│   │   │   ├── rotation.ts          # Piece rotation (SRS)
│   │   │   └── scoring.ts           # Score calculation
│   │   ├── socket/
│   │   │   ├── socketClient.ts
│   │   │   └── events.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── global.css
│   └── tests/
│       ├── components/
│       │   ├── Board.test.tsx
│       │   ├── GameView.test.tsx
│       │   ├── SettingsPanel.test.tsx   # ⭐
│       │   └── MatchmakingView.test.tsx # ⭐
│       ├── audio/                       # ⭐
│       │   └── AudioManager.test.ts
│       ├── store/
│       │   ├── gameSlice.test.ts
│       │   └── socketMiddleware.test.ts
│       └── game/
│           ├── board.test.ts
│           ├── collision.test.ts
│           └── rotation.test.ts
│
└── shared/                          # Shared types/constants
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts                 # Shared TypeScript interfaces
        ├── events.ts                # Socket event names
        └── constants.ts             # Game constants
```

---

## 5. Technology Stack

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 20.x LTS |
| TypeScript | Type safety | 5.x |
| Express | HTTP server | 4.x |
| Socket.io | WebSocket communication | 4.x |
| Jest | Testing | 29.x |

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI framework | 18.x |
| TypeScript | Type safety | 5.x |
| Vite | Build tool / bundler | 5.x |
| Redux Toolkit | State management | 2.x |
| Socket.io-client | WebSocket client | 4.x |
| React Router | URL routing | 6.x |
| Jest | Testing | 29.x |
| React Testing Library | Component testing | 14.x |

### DevOps

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## 6. Core Game Mechanics

### 6.1 Tetris Field

- **Dimensions**: 10 columns × 20 rows
- **Representation**: 2D array `number[][]`
  - `0` = empty cell
  - `1-7` = piece type (for coloring)

```typescript
type Board = number[][];
// Example: Empty 10x20 board
const createEmptyBoard = (): Board => 
  Array.from({ length: 20 }, () => Array(10).fill(0));
```

### 6.2 Seven Tetrominoes

```
I-piece (cyan):     O-piece (yellow):   T-piece (purple):
████                ██                     █
                                          ███

S-piece (green):    Z-piece (red):      L-piece (orange):
 ██                 ██                  █
██                   ██                 █
                                        ██

J-piece (blue):
  █
  █
 ██
```

### 6.3 Piece Representation

```typescript
interface Piece {
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
  shape: number[][];      // 4x4 or 3x3 matrix
  color: number;          // 1-7 for rendering
}

// Example: T-piece
const T_PIECE: number[][] = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 0]
];
```

### 6.4 Game States

```typescript
enum GameState {
  WAITING = 'waiting',      // In lobby, waiting for players
  STARTING = 'starting',    // Countdown before game
  PLAYING = 'playing',      // Game in progress
  PAUSED = 'paused',        // Game paused (solo only)
  GAME_OVER = 'game_over',  // Player eliminated
  FINISHED = 'finished'     // Game ended, winner declared
}
```

### 6.5 Controls

| Key | Action | Description |
|-----|--------|-------------|
| ← (ArrowLeft) | Move left | Move piece one cell left |
| → (ArrowRight) | Move right | Move piece one cell right |
| ↑ (ArrowUp) | Rotate | Rotate piece 90° clockwise |
| ↓ (ArrowDown) | Soft drop | Accelerate piece descent |
| Space | Hard drop | Instantly drop piece to bottom |

### 6.6 Rotation System (SRS)

We'll implement the **Super Rotation System (SRS)** with wall kicks:

```typescript
// Wall kick offsets for J, L, S, T, Z pieces
const WALL_KICKS = {
  '0->1': [[ 0, 0], [-1, 0], [-1, 1], [ 0,-2], [-1,-2]],
  '1->0': [[ 0, 0], [ 1, 0], [ 1,-1], [ 0, 2], [ 1, 2]],
  '1->2': [[ 0, 0], [ 1, 0], [ 1,-1], [ 0, 2], [ 1, 2]],
  '2->1': [[ 0, 0], [-1, 0], [-1, 1], [ 0,-2], [-1,-2]],
  '2->3': [[ 0, 0], [ 1, 0], [ 1, 1], [ 0,-2], [ 1,-2]],
  '3->2': [[ 0, 0], [-1, 0], [-1,-1], [ 0, 2], [-1, 2]],
  '3->0': [[ 0, 0], [-1, 0], [-1,-1], [ 0, 2], [-1, 2]],
  '0->3': [[ 0, 0], [ 1, 0], [ 1, 1], [ 0,-2], [ 1,-2]]
};
```

### 6.7 7-Bag Randomizer

To ensure fairness and prevent piece drought:

```typescript
const generateBag = (): PieceType[] => {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
  // Fisher-Yates shuffle
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
};
```

### 6.8 Penalty Lines System

When a player clears `n` lines:
- Send `n - 1` penalty lines to all opponents
- Penalty lines appear at the bottom of opponent boards
- Penalty lines have one random gap (hole)

```typescript
const calculatePenalty = (linesCleared: number): number => {
  return Math.max(0, linesCleared - 1);
};
```

### 6.9 Spectrum

A simplified representation of a player's board showing column heights:

```typescript
// Convert full board to spectrum (column heights)
const calculateSpectrum = (board: Board): number[] => {
  const spectrum: number[] = [];
  for (let col = 0; col < 10; col++) {
    let height = 0;
    for (let row = 0; row < 20; row++) {
      if (board[row][col] !== 0) {
        height = 20 - row;
        break;
      }
    }
    spectrum.push(height);
  }
  return spectrum;
};
```

---

## 7. Socket.io Events

### 7.1 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ room: string, playerName: string }` | Join or create a room |
| `leave_room` | `{ room: string }` | Leave current room |
| `start_game` | `{ room: string }` | Host starts the game |
| `player_input` | `{ action: ActionType, data?: any }` | Game action (move, rotate, drop) |
| `game_over` | `{ room: string }` | Report player elimination |
| `restart_game` | `{ room: string }` | Host restarts game |
| **`join_matchmaking`** ⭐ | `{ playerName: string }` | Join matchmaking queue |
| **`leave_matchmaking`** ⭐ | - | Leave matchmaking queue |
| **`update_settings`** ⭐ | `{ room: string, settings: Partial<GameSettings> }` | Host updates game settings |
| **`get_leaderboard`** ⭐ | `{ mode?: string, limit?: number }` | Request leaderboard data |
| **`get_player_stats`** ⭐ | `{ playerName: string, mode?: string }` | Request player statistics |

### 7.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `room_joined` | `{ room: RoomState, player: Player }` | Successfully joined room |
| `room_updated` | `{ room: RoomState }` | Room state changed |
| `player_joined` | `{ player: Player }` | New player joined |
| `player_left` | `{ playerId: string }` | Player left room |
| `game_starting` | `{ countdown: number }` | Game starting countdown |
| `game_started` | `{ pieces: Piece[], settings: GameSettings }` | Game started with config |
| `game_state_update` | `{ players: { [id]: PlayerState } }` | Full game state broadcast |
| `spectrum_update` | `{ playerId: string, spectrum: number[] }` | Opponent board update |
| `penalty_lines` | `{ count: number, fromPlayer: string }` | Receive penalty lines |
| `player_eliminated` | `{ playerId: string }` | Player lost |
| `game_finished` | `{ winner: Player, rankings: Player[] }` | Game ended |
| `error` | `{ code: string, message: string }` | Error occurred |
| **`matchmaking_joined`** ⭐ | `{ queueSize: number, estimatedWait: number }` | Successfully joined queue |
| **`matchmaking_left`** ⭐ | - | Successfully left queue |
| **`match_found`** ⭐ | `{ roomName: string, opponent: string }` | Match found, redirect |
| **`settings_updated`** ⭐ | `{ settings: GameSettings }` | Settings changed by host |
| **`leaderboard_updated`** ⭐ | `{ topScores: LeaderboardEntry[] }` | Leaderboard changed |

### 7.3 Action Types

```typescript
enum ActionType {
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  ROTATE = 'rotate',
  SOFT_DROP = 'soft_drop',
  HARD_DROP = 'hard_drop',
  HOLD = 'hold'           // ⭐ Bonus: Hold piece
}
```

---

## 8. Redux State Structure

```typescript
interface RootState {
  player: PlayerState;
  room: RoomState;
  game: GameState;
  socket: SocketState;
}

interface PlayerState {
  id: string | null;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  score: number;
}

interface RoomState {
  name: string | null;
  players: PlayerInfo[];
  state: 'waiting' | 'starting' | 'playing' | 'finished';
  hostId: string | null;
}

interface GameState {
  board: number[][];              // 10x20 grid
  currentPiece: PieceState | null;
  nextPieces: PieceType[];        // Preview queue (3-5 pieces)
  position: { x: number; y: number };
  rotation: number;               // 0, 1, 2, 3
  ghostY: number;                 // Ghost piece y-position
  linesCleared: number;
  level: number;
  score: number;
  spectrums: Record<string, number[]>; // Other players' boards
  pendingPenalty: number;         // Pending penalty lines
  isGameOver: boolean;
}

interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

interface PieceState {
  type: PieceType;
  shape: number[][];
  index: number;                  // Position in sequence
}

interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  score: number;
}
```

### Redux Slices

1. **playerSlice**: Player identity and status
2. **roomSlice**: Room/lobby state
3. **gameSlice**: Game board and mechanics
4. **socketSlice**: Connection status

### Socket Middleware

The socket middleware will:
- Intercept specific Redux actions
- Emit corresponding socket events
- Listen for socket events and dispatch actions

```typescript
// Example middleware flow
dispatch(joinRoom({ room: 'room1', playerName: 'Alice' }))
  → middleware intercepts
  → socket.emit('join_room', { room: 'room1', playerName: 'Alice' })
  → server responds
  → socket.on('room_joined', data)
  → middleware dispatches roomJoined(data)
```

---

## 9. Server Classes (OOP)

### 9.1 Player Class

```typescript
class Player {
  public readonly id: string;
  public readonly socketId: string;
  public name: string;
  public isHost: boolean;
  public isAlive: boolean;
  public score: number;
  public board: number[][];
  public currentPieceIndex: number;

  constructor(socketId: string, name: string) {
    this.id = generateUUID();
    this.socketId = socketId;
    this.name = name;
    this.isHost = false;
    this.isAlive = true;
    this.score = 0;
    this.board = this.createEmptyBoard();
    this.currentPieceIndex = 0;
  }

  private createEmptyBoard(): number[][] {
    return Array.from({ length: 20 }, () => Array(10).fill(0));
  }

  public getSpectrum(): number[] {
    // Calculate column heights for spectrum display
  }

  public addPenaltyLines(count: number): void {
    // Add garbage lines at bottom
  }

  public updateBoard(board: number[][]): void {
    this.board = board;
  }

  public eliminate(): void {
    this.isAlive = false;
  }

  public reset(): void {
    this.isAlive = true;
    this.score = 0;
    this.board = this.createEmptyBoard();
    this.currentPieceIndex = 0;
  }

  public toJSON(): PlayerInfo {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isAlive: this.isAlive,
      score: this.score
    };
  }
}
```

### 9.2 Piece Class

```typescript
class Piece {
  public readonly type: PieceType;
  public readonly color: number;
  private shapes: number[][][];  // All 4 rotations

  constructor(type: PieceType) {
    this.type = type;
    this.color = PIECE_COLORS[type];
    this.shapes = this.generateRotations();
  }

  private generateRotations(): number[][][] {
    // Generate all 4 rotation states
  }

  public getShape(rotation: number): number[][] {
    return this.shapes[rotation % 4];
  }

  public toJSON(): PieceData {
    return {
      type: this.type,
      color: this.color,
      shape: this.shapes[0]
    };
  }

  // Static factory methods
  static createRandom(): Piece {
    const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    return new Piece(randomType);
  }

  static generateBag(): Piece[] {
    const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    return types.map(type => new Piece(type));
  }
}
```

### 9.3 Game Class

```typescript
class Game {
  public readonly id: string;
  public readonly roomName: string;
  public state: GameState;
  private players: Map<string, Player>;
  private pieceSequence: Piece[];
  private hostId: string | null;
  private settings: GameSettings;

  constructor(roomName: string, settings?: Partial<GameSettings>) {
    this.id = generateUUID();
    this.roomName = roomName;
    this.state = GameState.WAITING;
    this.players = new Map();
    this.pieceSequence = [];
    this.hostId = null;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  public addPlayer(player: Player): boolean {
    if (this.state !== GameState.WAITING) {
      return false; // Cannot join after game started
    }
    
    this.players.set(player.id, player);
    
    // First player becomes host
    if (this.players.size === 1) {
      player.isHost = true;
      this.hostId = player.id;
    }
    
    return true;
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    this.players.delete(playerId);
    
    // Reassign host if needed
    if (player.isHost && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      newHost.isHost = true;
      this.hostId = newHost.id;
    }
  }

  public start(): boolean {
    if (this.state !== GameState.WAITING) return false;
    if (this.players.size === 0) return false;
    
    // Generate initial piece sequence (multiple bags)
    this.pieceSequence = [
      ...Piece.generateBag(),
      ...Piece.generateBag(),
      ...Piece.generateBag()
    ];
    
    this.state = GameState.PLAYING;
    this.players.forEach(player => player.reset());
    
    return true;
  }

  public updateSettings(settings: Partial<GameSettings>): boolean {
    // Only allow updates in WAITING state
    if (this.state !== GameState.WAITING) return false;
    
    // Validate settings
    if (settings.boardWidth && (settings.boardWidth < 8 || settings.boardWidth > 12)) {
      return false;
    }
    if (settings.boardHeight && (settings.boardHeight < 15 || settings.boardHeight > 25)) {
      return false;
    }
    
    this.settings = { ...this.settings, ...settings };
    return true;
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public getPiece(index: number): Piece {
    // Extend sequence if needed
    while (index >= this.pieceSequence.length) {
      this.pieceSequence.push(...Piece.generateBag());
    }
    return this.pieceSequence[index];
  }

  public getInitialPieces(count: number = 5): Piece[] {
    return Array.from({ length: count }, (_, i) => this.getPiece(i));
  }

  public handleLinesClear(playerId: string, count: number): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Update score
    player.score += this.calculateScore(count);
    
    // Send penalty to others
    const penalty = Math.max(0, count - 1);
    if (penalty > 0) {
      this.players.forEach((p, id) => {
        if (id !== playerId && p.isAlive) {
          p.addPenaltyLines(penalty);
        }
      });
    }
  }

  private calculateScore(lines: number): number {
    const scores = { 1: 100, 2: 300, 3: 500, 4: 800 };
    return scores[lines as keyof typeof scores] || 0;
  }

  public eliminatePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.eliminate();
    }
    
    this.checkGameEnd();
  }

  private checkGameEnd(): void {
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.isAlive);
    
    if (alivePlayers.length <= 1) {
      this.state = GameState.FINISHED;
    }
  }

  public finishGame(): void {
    this.state = GameState.FINISHED;
    
    // Add all players to leaderboard
    this.players.forEach(player => {
      leaderboardManager.addEntry({
        playerName: player.name,
        score: player.score,
        linesCleared: player.linesCleared,
        mode: this.settings.mode,
        timestamp: Date.now(),
        gameTime: (Date.now() - this.startTime) / 1000
      });
    });
    
    // Emit updated leaderboard
    io.to(this.roomName).emit('leaderboard_updated', {
      topScores: leaderboardManager.getTopScores(10)
    });
  }

  public getWinner(): Player | null {
    if (this.state !== GameState.FINISHED) return null;
    
    const alivePlayers = Array.from(this.players.values())
      .filter(p => p.isAlive);
    
    return alivePlayers[0] || null;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public isHost(playerId: string): boolean {
    return this.hostId === playerId;
  }

  public reset(): void {
    this.state = GameState.WAITING;
    this.pieceSequence = [];
    this.players.forEach(player => player.reset());
  }

  public toJSON(): GameInfo {
    return {
      id: this.id,
      roomName: this.roomName,
      state: this.state,
      players: this.getPlayers().map(p => p.toJSON()),
      hostId: this.hostId
    };
  }
}
```

### 9.4 GameManager Class

```typescript
class GameManager {
  private games: Map<string, Game>;

  constructor() {
    this.games = new Map();
  }

  public createGame(roomName: string): Game {
    const game = new Game(roomName);
    this.games.set(roomName, game);
    return game;
  }

  public getGame(roomName: string): Game | undefined {
    return this.games.get(roomName);
  }

  public getOrCreateGame(roomName: string): Game {
    return this.getGame(roomName) || this.createGame(roomName);
  }

  public removeGame(roomName: string): void {
    this.games.delete(roomName);
  }

  public removeEmptyGames(): void {
    this.games.forEach((game, roomName) => {
      if (game.getPlayers().length === 0) {
        this.games.delete(roomName);
      }
    });
  }
}
```

---

## 10. Game Flow

### 10.1 Connection Flow

```
1. User navigates to http://server:port/room_name/player_name
2. React Router parses URL → extracts room + player name
3. Redux dispatches joinRoom action
4. Socket middleware emits 'join_room' event
5. Server:
   a. Creates game if room doesn't exist
   b. Validates player can join (game not started)
   c. Creates Player instance
   d. Adds player to game
   e. Assigns host if first player
   f. Emits 'room_joined' to joining player
   g. Broadcasts 'player_joined' to room
6. Client updates Redux state with room/player info
7. UI renders lobby view
```

### 10.2 Game Start Flow

```
1. Host clicks "Start Game" button
2. Redux dispatches startGame action
3. Socket middleware emits 'start_game' event
4. Server:
   a. Validates sender is host
   b. Validates game state is WAITING
   c. Generates piece sequence (7-bag system)
   d. Changes game state to PLAYING
   e. Broadcasts 'game_started' with initial pieces
5. All clients:
   a. Update Redux game state
   b. Initialize game board
   c. Set first piece as current
   d. Start game loop
```

### 10.3 Game Loop (Client-side)

```
Using requestAnimationFrame:

Every frame:
  1. Calculate delta time
  2. Update drop timer
  
  If drop timer >= drop interval:
    1. Attempt to move piece down
    2. If collision:
       a. Lock piece to board (pure function)
       b. Check for completed lines (pure function)
       c. If lines cleared:
          - Emit 'lines_cleared' to server
          - Update local score
       d. Check for game over
       e. If game over: emit 'game_over'
       f. Else: spawn next piece
    3. Reset drop timer

  3. Handle pending penalty lines
  4. Render game state from Redux
```

### 10.4 Input Handling

```
Keyboard event listeners (useEffect):

ArrowLeft:
  - Calculate new position
  - Check collision (pure function)
  - If valid: update position in Redux

ArrowRight:
  - Calculate new position
  - Check collision (pure function)
  - If valid: update position in Redux

ArrowUp:
  - Calculate rotated shape
  - Try wall kicks
  - If valid rotation found: update in Redux

ArrowDown:
  - Accelerate drop timer
  - Add soft drop score

Space:
  - Calculate final position (ghost Y)
  - Lock piece immediately
  - Add hard drop score
  - Process line clears
```

### 10.5 Penalty Lines Flow

```
Player A clears 3 lines:
  1. Client A: emit 'lines_cleared' { count: 3 }
  2. Server:
     a. Calculate penalty: 3 - 1 = 2 lines
     b. Broadcast 'penalty_lines' to other players
  3. Other clients:
     a. Add 2 lines to pendingPenalty in Redux
     b. On next piece lock: insert penalty lines at bottom
```

### 10.6 Spectrum Updates

```
After each piece lock:
  1. Client calculates new spectrum (column heights)
  2. Client emits 'spectrum_update' { spectrum }
  3. Server broadcasts to all other players in room
  4. Other clients update spectrums in Redux
  5. UI renders updated opponent previews
```

### 10.7 Game Over Flow

```
When piece spawns in collision:
  1. Client sets isGameOver = true
  2. Client emits 'game_over'
  3. Server:
     a. Marks player as eliminated
     b. Broadcasts 'player_eliminated'
     c. Checks if game should end
     d. If one player left: broadcasts 'game_finished'
  4. UI shows game over / results
```

---

## 11. Docker Configuration

### 11.1 docker-compose.yml

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: red-tetris-server
    ports:
      - "${SERVER_PORT:-8080}:8080"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - PORT=8080
    volumes:
      - ./server/src:/app/src:ro
      - ./shared/src:/app/shared:ro
    networks:
      - tetris-network
    restart: unless-stopped

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: red-tetris-client
    ports:
      - "${CLIENT_PORT:-3000}:3000"
    environment:
      - VITE_SERVER_URL=http://localhost:${SERVER_PORT:-8080}
    volumes:
      - ./client/src:/app/src:ro
      - ./shared/src:/app/shared:ro
    depends_on:
      - server
    networks:
      - tetris-network
    restart: unless-stopped

networks:
  tetris-network:
    driver: bridge
```

### 11.2 Server Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
```

### 11.3 Client Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start dev server (or build for production)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### 11.4 Environment Variables

**.env.example**:
```env
# Server
NODE_ENV=development
SERVER_PORT=8080

# Client
CLIENT_PORT=3000
VITE_SERVER_URL=http://localhost:8080
```

---

## 12. Testing Strategy

### 12.1 Coverage Requirements

| Metric | Required | Target |
|--------|----------|--------|
| Statements | ≥70% | 80% |
| Functions | ≥70% | 80% |
| Lines | ≥70% | 80% |
| Branches | ≥50% | 60% |

### 12.2 Test Categories

#### Server Tests

**Class Tests** (`server/tests/classes/`):
- `Player.test.ts`
  - Player creation
  - Spectrum calculation
  - Penalty line handling
  - Score updates
  - Elimination
  - Reset functionality

- `Piece.test.ts`
  - Piece creation for all 7 types
  - Shape generation
  - Rotation states
  - 7-bag randomizer
  - Bag distribution fairness

- `Game.test.ts`
  - Game creation
  - Player joining/leaving
  - Host assignment/reassignment
  - Game state transitions
  - Piece sequence generation
  - Line clear handling
  - Penalty distribution
  - Winner detection
  - Game reset

**Manager Tests** (`server/tests/managers/`):
- `GameManager.test.ts`
  - Game creation
  - Game retrieval
  - Game deletion
  - Cleanup of empty games

- `MatchmakingQueue.test.ts` ⭐
  - Player joining/leaving queue
  - Automatic matchmaking
  - FIFO order
  - Queue size and wait time estimation

- `LeaderboardManager.test.ts` ⭐
  - Adding entries
  - Top scores retrieval
  - Player best and rank retrieval
  - Clearing leaderboard

**Socket Handler Tests** (`server/tests/socket/`):
- `handlers.test.ts`
  - Join room handling
  - Leave room handling
  - Start game handling
  - Player action handling
  - Error scenarios

#### Client Tests

**Pure Function Tests** (`client/tests/game/`):
- `board.test.ts`
  - Empty board creation
  - Piece placement
  - Line detection
  - Line clearing
  - Board after clear

- `collision.test.ts`
  - Wall collision
  - Floor collision
  - Piece collision
  - No collision cases

- `rotation.test.ts`
  - Basic rotation
  - Wall kick scenarios
  - I-piece special cases
  - O-piece (no rotation)

- `movement.test.ts`
  - Move left
  - Move right
  - Move down
  - Boundary checks

- `scoring.test.ts`
  - Single line score
  - Multi-line scores
  - Soft drop points
  - Hard drop points

**Redux Tests** (`client/tests/store/`):
- `gameSlice.test.ts`
  - Initial state
  - All reducers
  - Selectors

- `playerSlice.test.ts`
  - Player state management
  - Host status

- `roomSlice.test.ts`
  - Room state management
  - Player list updates

- `socketMiddleware.test.ts`
  - Action interception
  - Socket emission
  - Event handling

**Component Tests** (`client/tests/components/`):
- `Board.test.tsx`
  - Renders correct grid size
  - Displays pieces correctly
  - Shows ghost piece

- `GameView.test.tsx`
  - Renders game state
  - Handles game over

- `Lobby.test.tsx`
  - Player list display
  - Start button (host only)
  - Waiting state

- `SettingsPanel.test.tsx` ⭐
  - Renders settings options
  - Host can change settings
  - Updates state and emits socket event

- `MatchmakingView.test.tsx` ⭐
  - Joins and leaves queue
  - Displays queue status
  - Navigates on match found

### 12.3 Jest Configuration

**Server** (`server/jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/types/**'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70
    }
  }
};
```

**Client** (`client/jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/types/**',
    '!src/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70
    }
  }
};
```

### 12.4 Testing Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- Player.test.ts

# Watch mode
npm run test:watch
```

---

## 13. Implementation Phases

### Phase 1: Project Setup (Days 1-2)

**Tasks:**
- [ ] Initialize monorepo structure
- [ ] Set up `package.json` for server, client, shared
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up Docker environment
- [ ] Configure Jest for both packages
- [ ] Set up ESLint + Prettier
- [ ] Create shared types package
- [ ] Create `.env.example` and `.gitignore`
- [ ] Write initial README.md

**Deliverables:**
- Working Docker environment
- TypeScript compilation
- Test runner executing
- Linting passing

### Phase 2: Core Game Logic (Days 3-5)

**Tasks:**
- [ ] Define all piece shapes and rotations
- [ ] Implement `Piece` class (server)
- [ ] Create pure functions for:
  - Board creation/manipulation
  - Collision detection
  - Rotation with wall kicks
  - Line clearing
  - Scoring
- [ ] Implement 7-bag randomizer
- [ ] Write comprehensive tests (aim for 90% coverage here)

**Deliverables:**
- All game logic pure functions
- Full piece rotation system
- 90%+ test coverage for game module

### Phase 3: Server Implementation (Days 6-8)

**Tasks:**
- [ ] Set up Express + Socket.io server
- [ ] Implement `Player` class
- [ ] Implement `Game` class
- [ ] Create `GameManager`
- [ ] Implement socket event handlers:
  - join_room
  - leave_room
  - start_game
  - player_action
  - lines_cleared
  - game_over
- [ ] Add URL-based room routing
- [ ] Write server tests

**Deliverables:**
- Functional Socket.io server
- All game management logic
- 70%+ test coverage

### Phase 4: Client Foundation (Days 9-11)

**Tasks:**
- [ ] Set up React + Vite
- [ ] Configure React Router for URL parsing
- [ ] Set up Redux store with slices:
  - playerSlice
  - roomSlice
  - gameSlice
  - socketSlice
- [ ] Implement socket middleware
- [ ] Create socket client connection
- [ ] Build basic routing structure

**Deliverables:**
- Redux store with all slices
- Socket connection working
- URL-based room joining

### Phase 5: UI Implementation (Days 12-14)

**Tasks:**
- [ ] Build `Board` component (CSS Grid)
- [ ] Create `Cell` component with colors
- [ ] Implement piece rendering
- [ ] Add ghost piece visualization
- [ ] Build `Lobby` component
- [ ] Create `PlayerList` component
- [ ] Build `Spectrum` component
- [ ] Add `NextPiece` preview
- [ ] Style with modern CSS
- [ ] Ensure responsive design

**Deliverables:**
- Complete UI components
- Modern, polished design
- No table/canvas/SVG usage

### Phase 6: Game Integration (Days 15-17)

**Tasks:**
- [ ] Implement keyboard controls hook
- [ ] Create game loop with requestAnimationFrame
- [ ] Add soft drop acceleration
- [ ] Implement hard drop
- [ ] Connect controls to Redux
- [ ] Integrate penalty lines system
- [ ] Handle game over detection
- [ ] Implement winner announcement

**Deliverables:**
- Fully playable game
- All controls working
- Penalty system functional

### Phase 7: Multiplayer Polish (Days 18-19)

**Tasks:**
- [ ] Test multiple concurrent games
- [ ] Optimize spectrum update frequency
- [ ] Handle disconnections gracefully
- [ ] Add reconnection logic
- [ ] Performance profiling
- [ ] Fix edge cases
- [ ] Add loading states
- [ ] Error handling UI

**Deliverables:**
- Stable multiplayer
- Graceful error handling
- Smooth performance

### Phase 8: Testing & Documentation (Days 20-21)

**Tasks:**
- [ ] Achieve 70%+ coverage (all metrics)
- [ ] Achieve 50%+ branch coverage
- [ ] Write remaining tests
- [ ] Fix any failing tests
- [ ] Complete README documentation
- [ ] Add code comments
- [ ] Final bug fixes
- [ ] Production build verification

**Deliverables:**
- Coverage thresholds met
- Complete documentation
- Production-ready build

### Phase 9: Bonus Features Implementation (Days 22-25) ⭐

**Day 22: Audio System & Game Modes**
- [ ] Implement AudioManager class
- [ ] Add sound files (SFX + music)
- [ ] Integrate audio with game events
- [ ] Create audio settings UI
- [ ] Implement game mode system
- [ ] Add invisible mode logic
- [ ] Add sprint/ultra mode logic
- [ ] Create mode selector UI

**Day 23: Settings Panel & Matchmaking**
- [ ] Implement GameSettings interface
- [ ] Add settings validation server-side
- [ ] Build SettingsPanel component
- [ ] Implement MatchmakingQueue class
- [ ] Add matchmaking socket events
- [ ] Build MatchmakingView component
- [ ] Test matchmaking flow

**Day 24: Leaderboards & Polish**
- [ ] Implement LeaderboardManager class
- [ ] Add leaderboard socket events
- [ ] Build LeaderboardView component
- [ ] Add leaderboard to game over screen
- [ ] Polish UI transitions
- [ ] Add visual feedback for mode-specific features
- [ ] Test all bonus features together

**Day 25: Final Integration & Testing**
- [ ] End-to-end testing of all features
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation updates
- [ ] Final polish

**Deliverables:**
- Fully functional matchmaking system
- Host-configurable game settings
- In-memory leaderboards
- Complete audio system with immersive sound design
- Multiple game modes (classic, invisible, sprint, ultra, gravity, master)
- Polished user experience

---

## 14. Constraints Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| No `this` on client (except Error) | Functional components, hooks, pure functions | ✅ |
| OOP on server with prototypes | TypeScript classes: Player, Piece, Game | ✅ |
| No `<table>` | CSS Grid for game board | ✅ |
| No jQuery | Pure React | ✅ |
| No Canvas | DOM-based rendering | ✅ |
| No SVG | CSS shapes/colors | ✅ |
| Pure functions for game logic | `/client/src/game/` module | ✅ |
| Same piece sequence all players | Server generates, distributes | ✅ |
| ≥70% statement coverage | Jest configuration enforced | ✅ |
| ≥70% function coverage | Jest configuration enforced | ✅ |
| ≥70% line coverage | Jest configuration enforced | ✅ |
| ≥50% branch coverage | Jest configuration enforced | ✅ |
| URL-based room joining | React Router: `/:room/:playerName` | ✅ |
| Penalty lines (n-1) | Server calculates, broadcasts | ✅ |
| Host controls | First player = host, start/restart | ✅ |
| No join after start | Server validates game state | ✅ |
| Multiple concurrent games | GameManager handles rooms | ✅ |

---

## 15. Bonus Features

> **Note**: These features go beyond the mandatory requirements and will be implemented after the core functionality is complete and tested (≥70% coverage achieved).

### Bonus Features Overview

| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| **Audio System** | High | Medium | Complete sound design with SFX and music |
| **Game Modes** | High | Medium | Multiple game modes (invisible, sprint, ultra, etc.) |
| **Settings Panel** | High | Low | Host-configurable game parameters |
| **Matchmaking** | Medium | Medium | Automatic player pairing system |
| **Leaderboards** | Medium | Low | In-memory high score tracking |

**Benefits of These Bonuses**:
- **Audio System**: Significantly enhances player immersion and feedback
- **Game Modes**: Increases replay value and variety
- **Settings Panel**: Allows customization for different skill levels
- **Matchmaking**: Improves user experience for solo players
- **Leaderboards**: Adds competitive element and motivation

---

### 15.1 Matchmaking System ⭐

#### Overview
A basic matchmaking system that automatically pairs players together without requiring them to share a room URL.

#### Architecture

**Server-Side Components**:
- **MatchmakingQueue Class**: Manages queued players and matching logic
  - Stores player info: socketId, playerName, joinedAt timestamp
  - Implements FIFO (First In, First Out) matching algorithm
  - Runs matching check every 2 seconds when queue has ≥2 players
  - Generates unique room names for matched pairs
  - Removes players from queue after successful match

**Matching Algorithm**:
```
Every 2 seconds (if queue.size >= 2):
  1. Take first 2 players from queue (FIFO)
  2. Generate unique room name: "match_<timestamp>_<random>"
  3. Remove both players from queue
  4. Create new game room
  5. Emit 'match_found' to both players with room name and opponent info
  6. Players auto-redirect to game room
```

**Socket Events**:
- **Client → Server**:
  - `join_matchmaking` { playerName } - Add player to queue
  - `leave_matchmaking` - Remove player from queue
  
- **Server → Client**:
  - `matchmaking_joined` { queueSize, estimatedWait } - Confirmation + queue stats
  - `match_found` { roomName, opponent } - Match found, redirect
  - `matchmaking_left` - Confirmation of queue exit

**Client UI**:
- Route: `/matchmaking`
- Shows "Find Opponent" button when not in queue
- While queued: displays searching status, queue size, estimated wait time
- Cancel button to leave queue
- Auto-navigates to game room on match found

**Edge Cases**:
- Player disconnects while in queue → auto-removed via socket disconnect handler
- Queue becomes empty → stop matching interval (save resources)
- Single player in queue → wait for second player (no timeout)

---

### 15.2 Game Settings Panel ⭐

#### Overview
Host can customize game parameters before starting the game.

#### Settings Schema

**Configurable Parameters**:

| Setting | Type | Default | Range/Options | Description |
|---------|------|---------|---------------|-------------|
| `dropSpeed` | number | 1000 | 200-2000ms | Piece fall interval |
| `dropSpeedIncrease` | number | 50 | 10-100ms | Speed increase per level |
| `boardWidth` | number | 10 | 8-12 | Number of columns |
| `boardHeight` | number | 20 | 15-25 | Number of rows |
| `mode` | enum | classic | classic/invisible/sprint/ultra/gravity/master | Game mode |
| `maxPlayers` | number | 4 | 2-8 | Max room capacity |
| `enableGhostPiece` | boolean | true | - | Show/hide ghost piece |
| `enableHold` | boolean | false | - | Allow hold piece feature |
| `nextPieceCount` | number | 3 | 1-5 | Preview queue length |

#### Server Implementation

**Game Class Extensions**:
- Store `settings: GameSettings` object
- `updateSettings(settings)` method:
  - Only allowed in WAITING state
  - Validates all settings against allowed ranges
  - Returns success/failure
  - Broadcasts changes to all players in room

**Validation Rules**:
- Board dimensions must stay within 8-12 width, 15-25 height
- Drop speed between 200-2000ms
- Only host can modify settings
- Settings locked once game starts

**Socket Events**:
- **Client → Server**: `update_settings` { room, settings }
  - Server validates host status
  - Server validates game state (must be WAITING)
  - Server validates setting values
  - Server broadcasts update or error
  
- **Server → Client**: `settings_updated` { settings }
  - All players receive updated settings
  - Non-hosts see read-only display

#### Client UI

**SettingsPanel Component**:
- Conditional rendering: host sees controls, others see read-only display
- Setting controls:
  - **Dropdowns**: mode selection
  - **Range sliders**: speeds, dimensions with live value display
  - **Checkboxes**: boolean toggles (ghost piece, hold)
- Real-time socket emission on change
- Visual feedback for invalid values

**Integration**:
- Rendered in LobbyView before game starts
- Hidden once game state changes to PLAYING
- Settings persist for duration of game session

---

### 15.3 Leaderboards (In-Memory) ⭐

#### Overview
Track high scores during runtime (non-persistent, lost on server restart).

#### Architecture

**LeaderboardManager Class**:
- Maintains array of `LeaderboardEntry` objects
- Max 100 entries (memory limit)
- Entries contain: playerName, score, linesCleared, mode, timestamp, gameTime
- Sorted by score (descending) after each addition

**Core Methods**:
- `addEntry(entry)`: Add new entry, sort, trim to max size
- `getTopScores(limit, mode?)`: Return top N entries, optionally filtered by mode
- `getPlayerBest(playerName, mode?)`: Return player's highest score
- `getPlayerRank(playerName, mode?)`: Return player's rank (1-based index)
- `clear()`: Reset all entries

**Data Flow**:
```
Game Ends:
  1. Server extracts player stats (score, lines, time, mode)
  2. leaderboardManager.addEntry() for each player
  3. Server emits 'leaderboard_updated' with top 10 to room
  4. Clients update local display

Client Request:
  1. Client emits 'get_leaderboard' { mode?, limit? }
  2. Server responds with filtered/sorted entries
  3. Client displays in table format
```

**Socket Events**:
- **Client → Server**:
  - `get_leaderboard` { mode?, limit? } - Request leaderboard data
  - `get_player_stats` { playerName, mode? } - Request specific player stats
  
- **Server → Client**:
  - `leaderboard_updated` { topScores[] } - Broadcast after game ends
  - Callback responses for `get_leaderboard` and `get_player_stats`

#### Client UI

**LeaderboardView Component**:
- Route: `/leaderboard`
- Mode filter buttons (All, Classic, Sprint, Ultra, etc.)
- Table display:
  - Rank (#1, #2, etc.)
  - Player name
  - Score (formatted with commas)
  - Lines cleared
  - Game time (mm:ss format)
- Auto-refresh on `leaderboard_updated` event
- Shows player's personal best and rank highlighted

**Integration Points**:
- Displayed in game over screen (top 5)
- Accessible from main menu
- Updated in real-time for active viewers

---

### 15.4 Sound Design & Audio System ⭐

#### Overview
Immersive audio experience with sound effects, music, and dynamic audio feedback.

#### Audio Assets Structure

**Sound Effects (12+ files)**:
- **Movement**: `move.mp3`, `rotate.mp3`, `land.mp3`, `hard_drop.mp3`
- **Line Clears**: `line_clear.mp3` (1-3 lines), `tetris.mp3` (4 lines)
- **Game Events**: `level_up.mp3`, `game_over.mp3`, `countdown.mp3`
- **Gameplay**: `tick.mp3` (piece auto-drop), `hold.mp3`
- **Multiplayer**: `penalty.mp3` (received penalty lines)

**Music Tracks**:
- `gameplay.mp3` - Background music during game (looped)
- `menu.mp3` - Main menu ambiance (optional)
- `game_over.mp3` - End game theme (optional)

**File Location**: `client/public/sounds/`

#### AudioManager Class (Client-Side)

**Responsibilities**:
- Load and cache all audio files on initialization
- Play SFX with automatic reset (currentTime = 0) for rapid replay
- Manage background music with loop
- Separate volume controls for SFX and music (0.0-1.0)
- Mute/unmute toggle
- Handle browser autoplay restrictions

**Key Methods**:
- `play(soundName)`: Play SFX immediately
- `playMusic()`: Start background music loop
- `stopMusic()`: Stop and reset music
- `setSFXVolume(vol)`: Adjust all SFX volume
- `setMusicVolume(vol)`: Adjust music volume
- `toggleMute()`: Mute/unmute all audio

#### Integration Points

**Game Events → Audio Triggers**:
- Piece move (left/right) → play('move')
- Piece rotate → play('rotate')
- Piece lock → play('land')
- Hard drop → play('hardDrop')
- Line clear (1-3) → play('lineClear')
- Line clear (4) → play('tetris') [special sound]
- Level up → play('levelUp')
- Game over → stopMusic() + play('gameOver')
- Penalty received → play('penaltyReceived')
- Piece tick (gravity) → play('tick') [subtle, low volume]

**Game State → Music**:
- Enter PLAYING → playMusic()
- Enter GAME_OVER/FINISHED → stopMusic()
- Pause → music.pause() (resume on unpause)

#### Technical Considerations

**Browser Restrictions**:
- Audio playback requires user interaction (first click/keypress)
- Solution: Initialize AudioManager after first user input
- Show audio icon/prompt if muted by browser policy

**Performance**:
- Use HTML5 Audio API (lightweight, no library needed)
- Pre-load all sounds on game load (prevent lag)
- Avoid creating new Audio() instances per play (reuse cached)

**Sound Design Tips**:
- Keep tick sound subtle (low volume, soft)
- Make tetris (4-line) sound distinct and rewarding
- Use short SFX (<500ms) for responsiveness
- Background music should be non-intrusive (ambient)

---

### 15.5 Alternative Game Modes ⭐

#### Overview
Multiple game modes with unique mechanics and win conditions.

#### Game Modes Specification

| Mode | Description | Win Condition | Special Mechanic |
|------|-------------|---------------|------------------|
| **Classic** | Standard multiplayer | Last player alive | Penalty lines on line clear |
| **Invisible** | Pieces disappear after landing | Last player alive | Locked pieces not rendered |
| **Sprint** | Race mode | First to clear 40 lines | No penalty lines |
| **Ultra** | Score attack | Highest score in 2 minutes | Time limit enforced |
| **High Gravity** | Fast falling | Last player alive | 3x drop speed |
| **Master (20G)** | Instant drop | Last player alive | Pieces drop instantly (no gravity) |

#### Mode Configuration

**ModeConfig Interface**:
Each mode defines:
- `name`: Display name
- `description`: Short explanation
- `dropSpeed`: Base fall speed in ms (0 for instant)
- `instantDrop`: Boolean for 20G mode
- `invisiblePieces`: Boolean for invisible mode
- `timeLimit`: Seconds (for Ultra)
- `lineGoal`: Target lines (for Sprint)
- `gravityMultiplier`: Speed multiplier

#### Server-Side Implementation

**Game Class Integration**:
- Store selected mode and mode config
- On game start:
  - Load mode config
  - Set up mode-specific timers (timeLimit)
  - Configure drop speed and mechanics
- During gameplay:
  - Check mode-specific win conditions (line goal, time limit)
  - Apply mode-specific rules (instant drop, invisible)
  
**Win Condition Checks**:
```
After each piece lock:
  - Sprint: if player.linesCleared >= 40 → end game, player wins
  - Ultra: timer expires → end game, highest score wins
  - Classic/Invisible/Gravity/Master: check elimination → last alive wins
```

**Timer Management**:
- Ultra mode: `setTimeout(endGame, 120000)` on game start
- Broadcast remaining time to clients every 5 seconds

#### Client-Side Implementation

**Invisible Mode Rendering**:
- Track which cells are "locked" vs current piece
- Render current piece normally
- Render locked cells as empty (value = 0)
- Ghost piece still visible (helps gameplay)

**20G Mode (Master)**:
- Skip gravity timer
- Piece moves to bottom immediately on spawn
- Player can only rotate/move horizontally before lock
- Extremely challenging

**Sprint Mode Display**:
- Show progress: "Lines: 25/40"
- No opponent spectrums (solo mode)
- Timer shows elapsed time

**Ultra Mode Display**:
- Countdown timer: "Time: 1:45"
- Focus on score maximization
- Speed doesn't increase (consistent pacing)

#### Mode Selection UI

**ModeSelector Component**:
- Grid of mode cards (2x3 or 3x2 layout)
- Each card shows:
  - Mode name (large)
  - Description (1-2 lines)
  - Icon/badge for special features (⏱ for time, 🎯 for goal)
- Selected mode highlighted
- Click to select (host only)
- Emits 'update_settings' on selection

**Visual Indicators**:
- Time-based modes: Clock icon ⏱
- Goal-based modes: Target icon 🎯
- Challenge modes: Star icon ⭐

---

### 15.6 Additional Bonus Ideas

*Quick mentions for potential future additions:*

- **Hold Piece Functionality**: Press 'C' to swap current piece with held piece
- **T-Spin Detection**: Award bonus points for T-spin line clears
- **Combo System**: Consecutive line clears multiply score
- **Particle Effects**: Visual effects for line clears (CSS animations)
- **Replay System**: Save and watch game replays
- **Spectator Mode**: Watch ongoing games without playing
- **Chat System**: In-game text chat between players
- **Custom Skins**: Different visual themes for pieces and boards

---
