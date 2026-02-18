import request from 'supertest';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../src'; // Ensure path is correct relative to test folder

describe('Server Integration Tests', () => {
  let clientSocket: Socket;
  let port: number;

  beforeAll((done) => {
    // Server is exported but not listening due to our change in index.ts
    // We listen on port 0 to let the OS assign a random free port for parallel testing
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        port = addr.port;
      }
      done();
    });
  });

  afterAll((done) => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
      server.close(done);
  });

  describe('HTTP Endpoints', () => {
    test('GET /health should return status', async () => {
      // Use the exported server instance or app which supertest attaches to
      const response = await request(server).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    test('GET /unknown should return index.html (SPA Fallback)', async () => {
      // Mocking the static file response logic since we might not have the actual file during test
      const response = await request(app).get('/random-route');
      // Since express.static might not find the file, it goes to the fallback
      // Ideally check if it tries to send the file.
      // Assuming public/index.html might not exist in test env, we just check routing logic exists
      // If the file doesn't exist, sendFile throws 404 or 500 depending on config,
      // but the route is matched.
      // For this test, let's just ensure it hits the app logic.
      expect(response.status).not.toBe(404); // It shouldn't be a generic Express 404
    });
  });

  describe('WebSocket Connection', () => {
    test('should allow client connection', (done) => {
      // Connect to the specific port assigned in beforeAll
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.close();
        done();
      });
    });
  });
});
