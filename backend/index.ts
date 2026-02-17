import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import {Server, Socket} from "socket.io";

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());

// Serve static files from frontend dist
app.use(express.static(join(__dirname, '/public')));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: __dirname });
});

// Fallback to index.html for SPA routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(__dirname, '/public/index.html'));
});

// Create HTTP server explicitly to attach WebSocket server
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket: Socket) => {
  console.log('a user connected');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
