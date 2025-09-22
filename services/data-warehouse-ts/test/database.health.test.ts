import { describe, it, expect } from 'vitest';
import { DatabaseService } from '../src/services/database.service';

describe('Data Warehouse DatabaseService (mock)', () => {
  it('connects and reports healthy', async () => {
    const db = new DatabaseService();
    await db.connect();
    expect(db.isHealthy()).toBe(true);
    await db.close();
    expect(db.isHealthy()).toBe(false);
  });

  it('saves and counts records', async () => {
    const db = new DatabaseService();
    await db.connect();
    await db.saveRecord('test_table', { name: 'alice' });
    await db.saveRecord('test_table', { name: 'bob' });
    const total = await db.getTotalRecords();
    expect(total).toBeGreaterThanOrEqual(2);
    await db.close();
  });
});
