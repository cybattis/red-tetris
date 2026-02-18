import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import { WebSocketManager } from './socket/webSocketManager.js';

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

// SPA fallback - serve index.html for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../../client/dist/index.html'));
});

// Create HTTP server explicitly to attach WebSocket server
const server = http.createServer(app);
// Initialize WebSocketManager to handle all Socket.io logic
const wsManager = new WebSocketManager(server);

export { app, server, wsManager };
