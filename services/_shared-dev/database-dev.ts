// Lightweight in-memory DatabaseService for local development and tests
// Implements the minimal async methods used across services for logging and basic stats.

export class DevDatabaseService {
  private logs: Record<string, any[]> = {};
  public isConnected = true;

  async connect(): Promise<void> {
    this.isConnected = true;
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    return Promise.resolve();
  }

  private pushLog(key: string, item: any) {
    if (!this.logs[key]) this.logs[key] = [];
    this.logs[key].push({ ...item, _ts: new Date().toISOString() });
  }

  async logDocumentClassification(rec: any): Promise<void> {
    this.pushLog('documentClassification', rec);
  }

  async logEntityExtraction(rec: any): Promise<void> {
    this.pushLog('entityExtraction', rec);
  }

  async logClinicalProcessing(rec: any): Promise<void> {
    this.pushLog('clinicalProcessing', rec);
  }

  async logStructuredExtraction(rec: any): Promise<void> {
    this.pushLog('structuredExtraction', rec);
  }

  async logSummarization(rec: any): Promise<void> {
    this.pushLog('summarization', rec);
  }

  // Simple stats getters used by routes when present
  async getClinicalProcessingStats(timeframe?: string, document_type?: string): Promise<any> {
    return { total_documents_processed: this.logs.clinicalProcessing?.length || 0 };
  }

  async getStructuredExtractionStats(timeframe?: string): Promise<any> {
    return { total_extractions: this.logs.structuredExtraction?.length || 0 };
  }

  async getSummarizationStats(timeframe?: string): Promise<any> {
    return { total_summaries: this.logs.summarization?.length || 0 };
  }

  async getClassificationStats(timeframe?: string): Promise<any> {
    return { total_classifications: this.logs.documentClassification?.length || 0 };
  }

  async saveDocument(doc: any): Promise<void> {
    this.pushLog('documents', doc);
  }
}

export function createDevDatabaseService() {
  return new DevDatabaseService();
}
