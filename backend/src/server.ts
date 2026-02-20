import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import { WebSocketManager } from './socket/WebSocketManager.js';
import { Player } from './classes/Player.js';
import { Game } from './classes/Game.js';
import { GameSettings } from '@shared/types/game.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.json());

// Serve static files from frontend dist
app.use(express.static(join(__dirname, '../../client/dist')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// test page to verify server is running
app.get('/test', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, './pages/test_page.html'));
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../../client/dist/index.html'));
});

// Create HTTP server explicitly to attach WebSocket server
const server = http.createServer(app);
// Initialize WebSocketManager to handle all Socket.io logic
const wsManager = new WebSocketManager(server);

// console.log('Running server tests...');
// const player = new Player('test-player');
// const settings: GameSettings = {
//   gravity: 1,
//   gameSpeed: 1,
//   ghostPiece: false,
//   boardWidth: 10,
//   boardHeight: 20,
//   nextPieceCount: 5,
// };
// const game = new Game(player, settings, 12345);
// console.log('Game initialized successfully');

// game.start();

export { app, server, wsManager };
