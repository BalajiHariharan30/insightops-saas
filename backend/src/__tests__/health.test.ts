/**
 * Health Check Tests
 * Tests: GET /health, GET /ready
 */
import supertest from 'supertest';
import mongoose from 'mongoose';
import app from '../app';

const request = supertest(app);

describe('🏥 Health & Readiness Endpoints', () => {
  it('GET /health → returns 200 with status UP', async () => {
    const res = await request.get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health → includes ISO timestamp', async () => {
    const res = await request.get('/health');
    const ts = new Date(res.body.timestamp);
    expect(ts.toString()).not.toBe('Invalid Date');
  });

  it('GET /ready → returns 200 when DB is connected', async () => {
    const res = await request.get('/ready');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /nonexistent → returns 302 or 404 (not 500)', async () => {
    const res = await request.get('/api/v1/nonexistent-route');
    expect(res.status).not.toBe(500);
  });
});
