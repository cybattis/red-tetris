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

This is a **hybrid architecture** where game logic runs on **both** client and server, but for different purposes.

#### Server Responsibilities (Authority)

The server is the **single source of truth** for:

1. **Game Management**
   - Room creation/deletion
   - Player join/leave validation
   - Host assignment

2. **Piece Distribution**
   - Generates THE piece sequence (7-bag randomizer)
   - All players get the same sequence
   - Prevents cheating (can't manipulate pieces)

3. **Penalty System**
   - Receives line clear notifications
   - Calculates penalty (n-1)
   - Broadcasts to other players

4. **Win Condition**
   - Tracks player elimination
   - Determines winner
   - Ends game when ≤1 player alive

5. **Anti-Cheat**
   - Validates player actions (optional)
   - Rate limiting
   - Ensures game state consistency

**Server Does NOT**:
- Run the game loop (no piece gravity, no collisions)
- Render anything
- Handle keyboard input

#### Client Responsibilities (Game Execution)

Each client runs its **own independent game loop**:

1. **Game Loop** (60 FPS via `requestAnimationFrame`)
   ```
   Every frame:
   - Apply gravity (move piece down based on timer)
   - Handle keyboard input
   - Check collisions
   - Render current state
   ```

2. **Pure Game Logic** (Client-side calculations)
   - Piece movement (left, right, down)
   - Rotation with wall kicks
   - Collision detection (walls, floor, other pieces)
   - Line clearing
   - Score calculation
   - Board manipulation

3. **Rendering**
   - Game board (CSS Grid)
   - Current piece
   - Ghost piece (preview)
   - Next pieces queue
   - Opponent spectrums

4. **Input Handling**
   - Keyboard events
   - Touch controls (optional)
   - Immediate UI response (no network delay)

**Why This Architecture?**

| Aspect | Reason |
|--------|--------|
| **Responsiveness** | No input lag - moves happen instantly |
| **Scalability** | Server doesn't run 60 FPS loop per player |
| **Bandwidth** | Only send events (line clears, game over), not every frame |
| **Offline Play** | Solo mode works even if server lags |
| **Fairness** | Server controls piece sequence and penalties |

#### Communication Flow Example

**Line Clear Scenario**:
```
Client Side:
1. Piece locks on board (client detects)
2. Check for complete lines (pure function)
3. Found 3 complete lines
4. Clear lines locally (update Redux)
5. Emit 'lines_cleared' { count: 3 } to server
6. Update local score (immediate feedback)

Server Side:
1. Receive 'lines_cleared' { count: 3 }
2. Calculate penalty: 3 - 1 = 2
3. Update player score in Game class
4. Broadcast 'penalty_lines' { count: 2, fromPlayer: 'Alice' } 
   to all other players in room

Other Clients:
1. Receive 'penalty_lines' { count: 2 }
2. Add to pendingPenalty in Redux
3. Next piece lock: insert 2 garbage lines at bottom
4. Update local board state
```

**Key Insight**: Each client is **authoritative** for its own gameplay, but the server is **authoritative** for multiplayer coordination.

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
│   │   │   └── RoomManager.ts       # Room/lobby management
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
│       │   └── RoomManager.test.ts
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
│   │   │   │   └── PlayerList.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       └── Modal.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useSocket.ts
│   │   │   ├── useGameControls.ts
│   │   │   └── useGameLoop.ts
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
│       │   └── GameView.test.tsx
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
│   │   │   └── RoomManager.ts       # Room/lobby management
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
│       │   └── RoomManager.test.ts
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
│   │   │   │   └── PlayerList.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       └── Modal.tsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useSocket.ts
│   │   │   ├── useGameControls.ts
│   │   │   └── useGameLoop.ts
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
│       │   └── GameView.test.tsx
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
████                ██                   █
                    ██                  ███

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
| `player_action` | `{ action: ActionType, data?: any }` | Game action (move, rotate, drop) |
| `request_piece` | `{ room: string }` | Request next piece |
| `lines_cleared` | `{ room: string, count: number }` | Report cleared lines |
| `game_over` | `{ room: string }` | Report player elimination |
| `restart_game` | `{ room: string }` | Host restarts game |

### 7.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `room_joined` | `{ room: RoomState, player: Player }` | Successfully joined room |
| `room_updated` | `{ room: RoomState }` | Room state changed |
| `player_joined` | `{ player: Player }` | New player joined |
| `player_left` | `{ playerId: string }` | Player left room |
| `game_starting` | `{ countdown: number }` | Game starting countdown |
| `game_started` | `{ pieces: Piece[] }` | Game started with initial pieces |
| `new_piece` | `{ piece: Piece, index: number }` | Next piece in sequence |
| `spectrum_update` | `{ playerId: string, spectrum: number[] }` | Opponent board update |
| `penalty_lines` | `{ count: number, fromPlayer: string }` | Receive penalty lines |
| `player_eliminated` | `{ playerId: string }` | Player lost |
| `game_finished` | `{ winner: Player, rankings: Player[] }` | Game ended |
| `error` | `{ code: string, message: string }` | Error occurred |

### 7.3 Action Types

```typescript
enum ActionType {
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  ROTATE = 'rotate',
  SOFT_DROP = 'soft_drop',
  HARD_DROP = 'hard_drop'
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

  constructor(roomName: string) {
    this.id = generateUUID();
    this.roomName = roomName;
    this.state = GameState.WAITING;
    this.players = new Map();
    this.pieceSequence = [];
    this.hostId = null;
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

*To be implemented if time permits:*

### 15.1 Scoring System
- Points for soft drops (1 per cell)
- Points for hard drops (2 per cell)
- Line clear points: 100/300/500/800
- Combo multipliers
- T-spin detection and bonus

### 15.2 Enhanced UI
- Hold piece functionality
- Next piece queue (3-5 pieces)
- Line clear animations
- Sound effects
- Music

### 15.3 Game Modes
- Sprint: Clear 40 lines fastest
- Ultra: Highest score in 2 minutes
- Battle: Last player standing (current)

### 15.4 Persistence
- High scores (requires database)
- Player statistics
- Match history

### 15.5 FRP Exploration
- RxJS for event streams
- Reactive game loop

---

## Appendix A: Piece Definitions

```typescript
const PIECES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 1 // cyan
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 2 // yellow
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 3 // purple
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 4 // green
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 5 // red
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 6 // orange
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 7 // blue
  }
};
```

---

## Appendix B: Color Scheme

| Piece | Color | Hex Code |
|-------|-------|----------|
| I | Cyan | #00FFFF |
| O | Yellow | #FFFF00 |
| T | Purple | #800080 |
| S | Green | #00FF00 |
| Z | Red | #FF0000 |
| L | Orange | #FFA500 |
| J | Blue | #0000FF |
| Empty | Dark Gray | #1a1a1a |
| Ghost | Light Gray | #404040 |
| Penalty | Gray | #808080 |

---

## Appendix C: Useful Resources

- [Tetris Guideline](https://tetris.wiki/Tetris_Guideline)
- [Super Rotation System](https://tetris.wiki/Super_Rotation_System)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Vite Documentation](https://vitejs.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

*This document is a living specification. Update as implementation progresses.*
