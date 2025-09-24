// Lightweight in-src dev database fallback for monitoring service
export class DevDatabaseService {
  private logs: Record<string, any[]> = {};
  public isConnected = true;
  async connect(): Promise<void> {
    this.isConnected = true;
  }
  async close(): Promise<void> {
    this.isConnected = false;
  }
  private pushLog(key: string, item: any) {
    if (!this.logs[key]) this.logs[key] = [];
    this.logs[key].push({ ...item, _ts: new Date().toISOString() });
  }
  async logStructuredExtraction(rec: any): Promise<void> {
    this.pushLog('structuredExtraction', rec);
  }
  async getStructuredExtractionStats(): Promise<any> {
    return { total_extractions: this.logs.structuredExtraction?.length || 0 };
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}
