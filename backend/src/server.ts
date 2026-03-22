import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import { WebSocketManager } from './socket/WebSocketManager.js';
import { Logger } from './utils/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// Express app setup
// ============================================
const app = express();

// Middleware
app.use(express.json());

// Serve static files from frontend dist
console.log(`__dirname: ${__dirname}`);
console.log('NODE_ENV: ', process.env.NODE_ENV);

if (process.env.NODE_ENV === 'Production') {
  Logger.info('Running in production mode. Serving static files from frontend dist.');
  app.use(express.static(join(__dirname, '../../public')));
  // In production, serve the React app for all routes (SPA fallback)
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../../public/index.html'));
  });
} else {
  // test page to verify server is running
  app.get('/debug', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, './pages/debug_page.html'));
  });
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, './pages/index.html'));
  });
}

// ============================================
// Service initialization
// ============================================

// Create HTTP server explicitly to attach WebSocket server
const server = http.createServer(app);
// Initialize WebSocketManager to handle all Socket.io logic
const wsManager = new WebSocketManager(server);

export { app, server, wsManager };
