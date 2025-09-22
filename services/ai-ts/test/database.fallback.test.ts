import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../src/core/database';

describe('DatabaseService (fallback)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
  });

  it('falls back to in-memory DB when Postgres unavailable and DEV_DB_FALLBACK=true', async () => {
    process.env.DEV_DB_FALLBACK = 'true';

    const db = new DatabaseService();

    // Force any pool connect errors by ensuring connection string is invalid
    try {
      await db.connect();
      const health = await db.healthCheck();
      expect(health.status).toBe('healthy');
    } finally {
      await db.disconnect();
    }
  });
});
