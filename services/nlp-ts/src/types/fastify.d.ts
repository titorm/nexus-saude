import 'fastify';

// Minimal interfaces for decorated services used by NLP service routes.
declare module 'fastify' {
  interface FastifyInstance {
    documentClassifier?: {
      classifyDocument: (text: string, id?: string) => Promise<any>;
      batchClassifyDocuments: (
        docs: Array<{ id: string; text: string }>
      ) => Promise<Map<string, any> | Array<[string, any]>>;
      getClassificationHistory?: (id: string) => any;
      isInitialized?: boolean;
    };

    clinicalProcessor?: {
      isInitialized?: boolean;
    };

    clinicalNLPProcessor?: {
      isInitialized?: boolean;
    };

    clinicalSummarizer?: {
      isInitialized?: boolean;
    };

    entityExtractor?: {
      isInitialized?: boolean;
    };

    structuredExtractor?: {
      isInitialized?: boolean;
    };

    structuredDataExtractor?: any;

    databaseService?: {
      logDocumentClassification?: (rec: any) => Promise<void>;
      getClassificationStats?: (timeframe?: string) => Promise<any>;
      isConnected?: boolean;
    };

    monitoringService?: {
      recordRequest?: (name: string, time: number, ok: boolean) => void;
      recordDocumentClassification?: (type: string) => void;
      getDetailedHealthStatus?: () => Promise<any>;
      getPerformanceMetrics?: () => Promise<any>;
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
