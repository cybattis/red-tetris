import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketManager } from '../src/socket/webSocketManager.js';

describe('WebSocketManager Class', () => {
  let httpServer: HttpServer;
  let wsManager: WebSocketManager;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    // Initialize WebSocketManager with HTTP server
    wsManager = new WebSocketManager(httpServer);

    httpServer.listen(0, () => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    wsManager.io.close();
    httpServer.close(done);
  });

  test('should accept WebSocket client connections', (done) => {
    clientSocket = Client(`http://localhost:${port}`);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('error', (error) => {
      done(error);
    });
  });

  test('should handle custom socket events', (done) => {
    clientSocket = Client(`http://localhost:${port}`);
    const testMessage = 'Hello WebSocket';

    wsManager.io.on('connection', (socket) => {
      socket.on('test_message', (data) => {
        socket.emit('test_response', `Echo: ${data}`);
      });
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('test_message', testMessage);
    });

    clientSocket.on('test_response', (data) => {
      expect(data).toBe(`Echo: ${testMessage}`);
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('error', (error) => {
      done(error);
    });
  });
});
