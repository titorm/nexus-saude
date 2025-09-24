import 'fastify';

// Minimal interfaces for decorated services used by NLP service routes.
declare module 'fastify' {
  interface FastifyInstance {
    // Document classifier service
    documentClassifier?: {
      isInitialized?: boolean;
      classifyDocument?: (text: string, id?: string) => Promise<any>;
      batchClassifyDocuments?: (
        docs: Array<{ id: string; text: string }>
      ) => Promise<Map<string, any> | Array<[string, any]>>;
      getClassificationHistory?: (id: string) => any;
    };

    // Clinical processing / pipeline
    clinicalProcessor?: {
      isInitialized?: boolean;
      getProcessingStatus?: () => Promise<{
        status: string;
        activeProcessors: string[];
        queueLength: number;
        capacity: any;
      }>;
    };

    // Core NLP processor used for clinical processing
    clinicalNLPProcessor?: {
      isInitialized?: boolean;
      processDocument?: (text: string, opts?: any) => Promise<any>;
      batchProcessDocuments?: (
        docs: any[],
        opts?: any
      ) => Promise<Map<string, any> | Array<[string, any]>>;
      getProcessingStatus?: () => Promise<any>;
    };

    // Summarization
    clinicalSummarizer?: {
      isInitialized?: boolean;
      summarizeDocument?: (text: string, id?: string, opts?: any) => Promise<any>;
      batchSummarizeDocuments?: (
        docs: Array<{ id: string; text: string }>,
        opts?: any
      ) => Promise<Map<string, any> | Array<[string, any]>>;
      quickSummary?: (text: string, maxSentences?: number) => Promise<any>;
      getSummarizationHistory?: (id: string) => any;
    };

    // Entity extraction
    entityExtractor?: {
      isInitialized?: boolean;
      extractEntities?: (
        text: string,
        id?: string,
        opts?: any
      ) => Promise<{
        entities: Array<{
          text: string;
          label: string;
          start: number;
          end: number;
          confidence: number;
          normalized_form?: string;
        }>;
        normalizedEntities: any[];
        entityRelations: any[];
        confidence: number;
        extractionTime: number;
        metadata: any;
      }>;
      batchExtractEntities?: (
        docs: Array<{ id: string; text: string }>
      ) => Promise<Map<string, any> | Array<[string, any]>>;
      getExtractionHistory?: (id: string) => any;
    };

    // Structured data extraction
    structuredDataExtractor?: {
      isInitialized?: boolean;
      extractStructuredData?: (text: string, id?: string, opts?: any) => Promise<any>;
      batchExtractStructuredData?: (
        docs: Array<{ id: string; text: string }>,
        opts?: any
      ) => Promise<Map<string, any> | Array<[string, any]>>;
    };

    // Database logging / persistence
    databaseService?: {
      isInitialized?: boolean;
      isConnected?: boolean;
      logDocumentClassification?: (rec: any) => Promise<void>;
      logEntityExtraction?: (rec: any) => Promise<void>;
      logClinicalProcessing?: (rec: any) => Promise<void>;
      logStructuredExtraction?: (rec: any) => Promise<void>;
      logSummarization?: (rec: any) => Promise<void>;
      getClinicalProcessingStats?: (timeframe?: string, document_type?: string) => Promise<any>;
      getStructuredExtractionStats?: (timeframe?: string) => Promise<any>;
      getSummarizationStats?: (timeframe?: string) => Promise<any>;
      getClassificationStats?: (timeframe?: string) => Promise<any>;
      saveDocument?: (doc: any) => Promise<void>;
    };

    // Monitoring / metrics
    monitoringService?: {
      isInitialized?: boolean;
      recordRequest?: (name: string, durationMs: number, success: boolean) => void;
      recordDocumentClassification?: (type: string) => void;
      recordEntityExtraction?: (count: number) => void;
      recordClinicalProcessing?: (stages: number, quality: number) => void;
      recordStructuredExtraction?: (count: number) => void;
      recordSummarization?: (value: number) => void;
      getDetailedHealthStatus?: () => Promise<Record<string, any>>;
      getPerformanceMetrics?: () => Promise<Record<string, any>>;
      getCurrentMetrics?: () => Promise<any>;
      getPrometheusMetrics?: () => Promise<string>;
      isHealthy?: () => boolean;
    };
  }

  // Allow `tags` and `description` in route schemas (used for OpenAPI metadata)
  interface FastifySchema {
    description?: string;
    tags?: string[];
  }
}
