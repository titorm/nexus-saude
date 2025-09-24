import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './test-utils';

let app: any;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  if (app) await app.close();
});

describe('Summarization routes', () => {
  it('summarizes a single document (happy path)', async () => {
    const longText = 'This is a long clinical note '.repeat(20);
    const payload = { text: longText };
    const res = await app.inject({ method: 'POST', url: '/api/v1/summarization', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.summaries).toBeDefined();
    expect(body.metadata.summary_length).toBeGreaterThan(0);
  });

  it('summarizes multiple documents (batch)', async () => {
    const docs = [
      { id: 's1', text: 'Clinical note 1 '.repeat(30) },
      { id: 's2', text: 'Clinical note 2 '.repeat(25) },
    ];
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/summarization/batch',
      payload: { documents: docs },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.total_documents).toBe(2);
  });
});
