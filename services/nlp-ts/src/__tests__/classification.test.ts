import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils';

let app: any;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('Classification routes', () => {
  it('classifies a single document (happy path)', async () => {
    const payload = { text: 'Patient with fever and cough' };
    const res = await app.inject({ method: 'POST', url: '/api/v1/classification', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.classification).toBeDefined();
    expect(body.metadata.model_used).toBe('default');
  });

  it('classifies multiple documents (batch)', async () => {
    const payload = {
      documents: [
        { id: 'd1', text: 'note one' },
        { id: 'd2', text: 'note two' },
      ],
    };
    const res = await app.inject({ method: 'POST', url: '/api/v1/classification/batch', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.total_documents).toBe(2);
    expect(Array.isArray(body.results)).toBe(true);
  });
});
