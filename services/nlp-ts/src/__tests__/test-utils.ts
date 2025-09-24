import Fastify from 'fastify';
import { registerRoutes } from '../routes/index.js';
import { createDevDatabaseService } from '../services/dev-database';

export async function createTestApp() {
  const fastify = Fastify({ logger: false });

  // Provide minimal decorations expected by routes
  // Use in-src dev DB so tests don't require Postgres
  const devDb = createDevDatabaseService();
  await devDb.connect();

  // Minimal stub services to satisfy route guards
  // documentClassifier stub
  const documentClassifier: any = {
    async classifyDocument(text: string, id: string) {
      return {
        documentType: { type: 'clinical_note', subtype: 'outpatient' },
        urgencyLevel: { level: 'normal' },
        specialtyArea: { primary: 'general' },
        medicalComplexity: { level: 'low' },
        overallConfidence: 0.95,
        keywords: [{ keyword: 'fever', relevance: 0.9 }],
        classificationTime: 5,
        metadata: { model: 'test-model' },
      };
    },
    async batchClassifyDocuments(docs: Array<any>) {
      const out: Array<[string, any]> = [];
      for (const d of docs) {
        const res = await this.classifyDocument(d.text, d.id);
        out.push([d.id, { ...res, classificationTime: 5 }]);
      }
      return out;
    },
  };

  const clinicalSummarizer: any = {
    async summarizeDocument(text: string, id: string, options: any) {
      return {
        extractiveSummary: {
          summary: 'extractive summary',
          key_sentences: ['s1'],
          confidence: 0.9,
          compressionRatio: 0.5,
        },
        abstractiveSummary: {
          summary: 'abstractive summary',
          key_concepts: ['c1'],
          confidence: 0.88,
          readabilityScore: 0.8,
        },
        clinicalInsights: {
          key_points: [{ category: 'finding', point: 'sample', importance: 0.8 }],
        },
        summaryLength: 50,
        compressionRatio: 0.5,
        qualityScore: 0.85,
        metadata: { model: 'test-summarizer' },
      };
    },
    async batchSummarizeDocuments(docs: Array<any>) {
      const out: Array<[string, any]> = [];
      for (const d of docs) {
        const res = await this.summarizeDocument(d.text, d.id, {});
        out.push([d.id, { ...res, originalLength: d.text.length, processingTime: 10 }]);
      }
      return out;
    },
  };

  // minimal monitoring stub
  const monitoringService: any = {
    recordRequest: () => {},
    recordDocumentClassification: () => {},
    recordSummarization: () => {},
    isHealthy: () => true,
  };

  // Decorate instance
  fastify.decorate('documentClassifier', documentClassifier);
  fastify.decorate('clinicalSummarizer', clinicalSummarizer);
  fastify.decorate('databaseService', devDb);
  fastify.decorate('monitoringService', monitoringService);

  await registerRoutes(fastify);

  return fastify;
}
