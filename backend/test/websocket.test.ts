import { jest, describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketManager } from '../src/webSocketManager';

describe('WebSocketManager Class', () => {
  let httpServer: HttpServer;
  let wsManager: WebSocketManager;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    // Initialize our wrapper class
    wsManager = new WebSocketManager(httpServer);

    httpServer.listen(0, () => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    wsManager.io.close();
    httpServer.close(done);
  });

  test('should initialize and return the io instance', () => {
    expect(wsManager.io).toBeDefined();
  });

  test('should handle message events and echo back', (done) => {
    clientSocket = Client(`http://localhost:${port}`);
    const testMessage = 'Hello World';

    clientSocket.on('connect', () => {
      clientSocket.emit('message', testMessage);
    });

    clientSocket.on('message', (data) => {
      expect(data).toBe(`Echo: ${testMessage}`);
      clientSocket.close();
      done();
    });
  });
});
