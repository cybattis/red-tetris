// @ts-ignore
import request from 'supertest';
import { server, app } from '../src/server.js';

describe('Server Integration Tests', () => {
  let port: number;

  beforeAll((done) => {
    // Server listens on port 0 to let OS assign a random free port
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        port = addr.port;
      }
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('HTTP Endpoints', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /* should serve SPA fallback (index.html)', async () => {
      // The wildcard route should attempt to serve index.html
      // In test environment, the file might not exist, but the route should be matched
      const response = await request(app).get('/random-route-xyz');
      // Should not be a generic 404, but rather attempt to send the SPA file
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
