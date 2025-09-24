import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createApp } from '../src/index';

let app: Awaited<ReturnType<typeof createApp>>;

beforeAll(async () => {
  app = await createApp();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('Data Warehouse - health and status', () => {
  it('GET /health returns healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('healthy');
  });

  it('GET /status returns expected structure', async () => {
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body).toHaveProperty('etl');
    expect(body).toHaveProperty('analytics');
    expect(body).toHaveProperty('reports');
    expect(body).toHaveProperty('storage');
  });
});
