export class DevDatabaseService {
  private logs: Record<string, any[]> = {};
  public isConnected = true;
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
  async logDocumentClassification(rec: any): Promise<void> {
    this.pushLog('documentClassification', rec);
  }
  async getClassificationStats(): Promise<any> {
    return { total_classifications: this.logs.documentClassification?.length || 0 };
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}
