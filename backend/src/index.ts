import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { WebSocketManager } from "./socket/webSocketManager";

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());

// Serve static files from frontend dist
app.use(express.static(join(__dirname, '../public')));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: __dirname });
});

// Fallback to index.html for SPA routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Create HTTP server explicitly to attach WebSocket server
const server = http.createServer(app);

// Initialize WebSocketManager
const wsManager = new WebSocketManager(server);

// Only listen if this file is run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app, server, wsManager };
