// Minimal in-src dev DB for ML service
export class DevDatabaseService {
  public isConnected = true;
  private logs: Record<string, any[]> = {};

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  private pushLog(key: string, item: any) {
    if (!this.logs[key]) this.logs[key] = [];
    this.logs[key].push({ ...item, _ts: new Date().toISOString() });
  }

  async logModelEvent(rec: any): Promise<void> {
    this.pushLog('modelEvents', rec);
  }

  async getModelStats(): Promise<any> {
    return { total_events: this.logs.modelEvents?.length || 0 };
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}
