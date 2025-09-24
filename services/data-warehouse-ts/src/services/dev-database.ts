// In-src dev fallback for Data Warehouse service
export class DevDatabaseService {
  private connected = true;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  isHealthy(): boolean {
    return this.connected;
  }

  async getTotalRecords(): Promise<number> {
    return 0;
  }

  async getStorageSize(): Promise<number> {
    return 0;
  }

  // Lightweight logging used by some routes
  private logs: Record<string, any[]> = {};
  private pushLog(key: string, item: any) {
    if (!this.logs[key]) this.logs[key] = [];
    this.logs[key].push({ ...item, _ts: new Date().toISOString() });
  }

  async saveDocument(doc: any): Promise<void> {
    this.pushLog('documents', doc);
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}
