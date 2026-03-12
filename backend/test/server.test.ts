import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/server.js';

describe('server routes', () => {
	test('GET /debug serves debug page', async () => {
		const response = await request(app).get('/debug');

		expect(response.status).toBe(200);
		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('WebSocket Keyboard Test');
	});

	test('GET unknown route serves index fallback page in non-production', async () => {
		const response = await request(app).get('/this-route-does-not-exist');

		expect(response.status).toBe(200);
		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('Red Tetris Backend');
	});
});
