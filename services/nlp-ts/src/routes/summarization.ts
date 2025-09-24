import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface SummarizationRequest {
  text: string;
  document_id?: string;
  options?: {
    max_length?: number;
    min_length?: number;
    summary_type?: 'extractive' | 'abstractive' | 'both';
    include_key_points?: boolean;
    focus_areas?: string[];
  };
}

interface BatchSummarizationRequest {
  documents: Array<{
    id: string;
    text: string;
  }>;
  options?: {
    max_length?: number;
    min_length?: number;
    summary_type?: 'extractive' | 'abstractive' | 'both';
    include_key_points?: boolean;
    focus_areas?: string[];
  };
}

export async function summarizationRoutes(fastify: FastifyInstance) {
  // Single document summarization
  fastify.post(
    '/summarization',
    {
      schema: {
        tags: ['Clinical Summarization'],
        description: 'Generate clinical summaries from medical text',
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 100,
              maxLength: 100000,
              description: 'Clinical text to summarize',
            },
            document_id: {
              type: 'string',
              description: 'Optional document identifier',
            },
            options: {
              type: 'object',
              properties: {
                max_length: {
                  type: 'number',
                  minimum: 50,
                  maximum: 2000,
                  default: 500,
                  description: 'Maximum summary length in words',
                },
                min_length: {
                  type: 'number',
                  minimum: 20,
                  maximum: 500,
                  default: 100,
                  description: 'Minimum summary length in words',
                },
                summary_type: {
                  type: 'string',
                  enum: ['extractive', 'abstractive', 'both'],
                  default: 'both',
                  description: 'Type of summarization to perform',
                },
                include_key_points: {
                  type: 'boolean',
                  default: true,
                  description: 'Include key clinical points',
                },
                focus_areas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific clinical areas to focus on',
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              document_id: { type: 'string' },
              processing_time: { type: 'number' },
              summaries: {
                type: 'object',
                properties: {
                  extractive: {
                    type: 'object',
                    properties: {
                      summary: { type: 'string' },
                      key_sentences: { type: 'array', items: { type: 'string' } },
                      confidence: { type: 'number' },
                      compression_ratio: { type: 'number' },
                    },
                  },
                  abstractive: {
                    type: 'object',
                    properties: {
                      summary: { type: 'string' },
                      key_concepts: { type: 'array', items: { type: 'string' } },
                      confidence: { type: 'number' },
                      readability_score: { type: 'number' },
                    },
                  },
                },
              },
              clinical_insights: {
                type: 'object',
                properties: {
                  key_points: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        point: { type: 'string' },
                        importance: { type: 'number' },
                        source_section: { type: 'string' },
                      },
                    },
                  },
                  clinical_findings: { type: 'array', items: { type: 'string' } },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  follow_up_needed: { type: 'boolean' },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  original_length: { type: 'number' },
                  summary_length: { type: 'number' },
                  compression_ratio: { type: 'number' },
                  processing_model: { type: 'string' },
                  quality_score: { type: 'number' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          500: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SummarizationRequest }>, reply: FastifyReply) => {
      try {
        const { text, document_id, options = {} } = request.body;
        const clinicalSummarizer = fastify.clinicalSummarizer;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!clinicalSummarizer || !clinicalSummarizer.summarizeDocument) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Clinical summarizer not available',
          };
        }

        const startTime = Date.now();
        const docId = document_id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Perform summarization
        const result = await clinicalSummarizer.summarizeDocument(text, docId, options);

        const processingTime = Date.now() - startTime;

        // Log to database
        if (databaseService && databaseService.logSummarization) {
          try {
            await databaseService.logSummarization({
              document_id: docId,
              original_length: text.length,
              summary_length: result.summaryLength,
              compression_ratio: result.compressionRatio,
              summary_type: options.summary_type || 'both',
              quality_score: result.qualityScore,
              processing_time: processingTime,
              metadata: result.metadata,
            });
          } catch (error) {
            fastify.log.warn('Failed to log summarization: ' + String(error));
          }
        }

        // Record metrics
        if (monitoringService) {
          monitoringService.recordRequest?.('clinical_summarization', processingTime, true);
          monitoringService.recordSummarization?.(result.compressionRatio);
        }

        return {
          success: true,
          document_id: docId,
          processing_time: processingTime,
          summaries: {
            extractive:
              options.summary_type !== 'abstractive' ? result.extractiveSummary : undefined,
            abstractive:
              options.summary_type !== 'extractive' ? result.abstractiveSummary : undefined,
          },
          clinical_insights:
            options.include_key_points !== false ? result.clinicalInsights : undefined,
          metadata: {
            original_length: text.length,
            summary_length: result.summaryLength,
            compression_ratio: result.compressionRatio,
            processing_model: result.metadata.model,
            quality_score: result.qualityScore,
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = fastify.monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest?.('clinical_summarization', processingTime, false);
        }

        fastify.log.error('Clinical summarization failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to generate summary',
        };
      }
    }
  );

  // Batch summarization
  fastify.post(
    '/summarization/batch',
    {
      schema: {
        tags: ['Clinical Summarization'],
        description: 'Generate summaries for multiple clinical documents',
        body: {
          type: 'object',
          required: ['documents'],
          properties: {
            documents: {
              type: 'array',
              minItems: 1,
              maxItems: 50,
              items: {
                type: 'object',
                required: ['id', 'text'],
                properties: {
                  id: { type: 'string' },
                  text: {
                    type: 'string',
                    minLength: 100,
                    maxLength: 100000,
                  },
                },
              },
            },
            options: {
              type: 'object',
              properties: {
                max_length: { type: 'number', minimum: 50, maximum: 2000, default: 500 },
                min_length: { type: 'number', minimum: 20, maximum: 500, default: 100 },
                summary_type: {
                  type: 'string',
                  enum: ['extractive', 'abstractive', 'both'],
                  default: 'both',
                },
                include_key_points: { type: 'boolean', default: true },
                focus_areas: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              total_documents: { type: 'number' },
              processing_time: { type: 'number' },
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    document_id: { type: 'string' },
                    summary_length: { type: 'number' },
                    compression_ratio: { type: 'number' },
                    quality_score: { type: 'number' },
                    processing_time: { type: 'number' },
                  },
                },
              },
              summary: {
                type: 'object',
                properties: {
                  average_compression_ratio: { type: 'number' },
                  average_quality_score: { type: 'number' },
                  total_words_processed: { type: 'number' },
                  total_words_summarized: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BatchSummarizationRequest }>, reply: FastifyReply) => {
      try {
        const { documents, options = {} } = request.body;
        const clinicalSummarizer = fastify.clinicalSummarizer;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!clinicalSummarizer) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Clinical summarizer not available',
          };
        }

        const startTime = Date.now();

        // Process documents in batch
        if (!clinicalSummarizer || !clinicalSummarizer.batchSummarizeDocuments) {
          reply.code(500);
          return { error: 'Service Error', message: 'Clinical summarizer not available' };
        }
        const results = await clinicalSummarizer.batchSummarizeDocuments(documents, options);
        const resultsArray = Array.isArray(results)
          ? results
          : Array.from(results as Map<string, any>);

        const processingTime = Date.now() - startTime;

        // Prepare summary statistics
        let totalCompressionRatio = 0;
        let totalQualityScore = 0;
        let totalWordsProcessed = 0;
        let totalWordsSummarized = 0;
        const processedResults = [];

        for (const [docId, result] of results) {
          totalCompressionRatio += result.compressionRatio;
          totalQualityScore += result.qualityScore;
          totalWordsProcessed += result.originalLength;
          totalWordsSummarized += result.summaryLength;

          processedResults.push({
            document_id: docId,
            summary_length: result.summaryLength,
            compression_ratio: result.compressionRatio,
            quality_score: result.qualityScore,
            processing_time: result.processingTime,
          });

          // Log individual results
          if (databaseService?.logSummarization) {
            try {
              await databaseService.logSummarization({
                document_id: docId,
                original_length: result.originalLength,
                summary_length: result.summaryLength,
                compression_ratio: result.compressionRatio,
                summary_type: options.summary_type || 'both',
                quality_score: result.qualityScore,
                processing_time: result.processingTime,
                metadata: result.metadata,
              });
            } catch (error) {
              fastify.log.warn(`Failed to log summarization for ${docId}: ` + String(error));
            }
          }
        }

        // Record metrics
        if (monitoringService) {
          monitoringService.recordRequest?.('clinical_summarization_batch', processingTime, true);
          monitoringService.recordSummarization?.(
            resultsArray.length > 0 ? totalCompressionRatio / resultsArray.length : 0
          );
        }

        return {
          success: true,
          total_documents: documents.length,
          processing_time: processingTime,
          results: processedResults,
          summary: {
            average_compression_ratio:
              resultsArray.length > 0 ? totalCompressionRatio / resultsArray.length : 0,
            average_quality_score:
              resultsArray.length > 0 ? totalQualityScore / resultsArray.length : 0,
            total_words_processed: totalWordsProcessed,
            total_words_summarized: totalWordsSummarized,
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = fastify.monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest?.('clinical_summarization_batch', processingTime, false);
        }

        fastify.log.error('Batch clinical summarization failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to generate summaries in batch',
        };
      }
    }
  );

  // Get summarization history for a document
  fastify.get(
    '/summarization/history/:documentId',
    {
      schema: {
        tags: ['Clinical Summarization'],
        description: 'Get summarization history for a specific document',
        params: {
          type: 'object',
          required: ['documentId'],
          properties: {
            documentId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              document_id: { type: 'string' },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string' },
                    summary_type: { type: 'string' },
                    original_length: { type: 'number' },
                    summary_length: { type: 'number' },
                    compression_ratio: { type: 'number' },
                    quality_score: { type: 'number' },
                    processing_time: { type: 'number' },
                  },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply) => {
      try {
        const { documentId } = request.params;
        const clinicalSummarizer = fastify.clinicalSummarizer;

        if (!clinicalSummarizer) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Clinical summarizer not available',
          };
        }

        const history = clinicalSummarizer.getSummarizationHistory
          ? clinicalSummarizer.getSummarizationHistory(documentId)
          : null;

        if (!history) {
          reply.code(404);
          return {
            error: 'Not Found',
            message: 'No summarization history found for this document',
          };
        }

        return {
          document_id: documentId,
          history: [
            {
              timestamp: new Date().toISOString(),
              summary_type: 'both',
              original_length: history.originalLength,
              summary_length: history.summaryLength,
              compression_ratio: history.compressionRatio,
              quality_score: history.qualityScore,
              processing_time: history.processingTime,
            },
          ],
        };
      } catch (error: any) {
        fastify.log.error('Failed to get summarization history:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to get summarization history',
        };
      }
    }
  );

  // Get summarization statistics
  fastify.get(
    '/summarization/stats',
    {
      schema: {
        tags: ['Clinical Summarization'],
        description: 'Get summarization statistics and metrics',
        querystring: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              enum: ['hour', 'day', 'week', 'month'],
              default: 'day',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              timeframe: { type: 'string' },
              total_summarizations: { type: 'number' },
              average_compression_ratio: { type: 'number' },
              average_quality_score: { type: 'number' },
              average_processing_time: { type: 'number' },
              summary_type_distribution: { type: 'object' },
              total_words_processed: { type: 'number' },
              total_words_summarized: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { timeframe?: string } }>) => {
      const { timeframe = 'day' } = request.query;
      const databaseService = fastify.databaseService;

      if (!databaseService) {
        return {
          timeframe,
          total_summarizations: 0,
          average_compression_ratio: 0,
          average_quality_score: 0,
          average_processing_time: 0,
          summary_type_distribution: {},
          total_words_processed: 0,
          total_words_summarized: 0,
        };
      }

      try {
        const stats = databaseService.getSummarizationStats
          ? await databaseService.getSummarizationStats(timeframe)
          : {};
        return {
          timeframe,
          ...stats,
        };
      } catch (error) {
        fastify.log.error('Failed to get summarization stats: ' + String(error));
        return {
          timeframe,
          total_summarizations: 0,
          average_compression_ratio: 0,
          average_quality_score: 0,
          average_processing_time: 0,
          summary_type_distribution: {},
          total_words_processed: 0,
          total_words_summarized: 0,
        };
      }
    }
  );

  // Quick summary endpoint for short text
  fastify.post(
    '/summarization/quick',
    {
      schema: {
        tags: ['Clinical Summarization'],
        description: 'Generate quick summary for short clinical text',
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 50,
              maxLength: 10000,
              description: 'Short clinical text to summarize',
            },
            max_sentences: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              default: 3,
              description: 'Maximum number of sentences in summary',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              summary: { type: 'string' },
              key_points: { type: 'array', items: { type: 'string' } },
              processing_time: { type: 'number' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { text: string; max_sentences?: number } }>,
      reply: FastifyReply
    ) => {
      try {
        const { text, max_sentences = 3 } = request.body;
        const clinicalSummarizer = fastify.clinicalSummarizer;

        if (!clinicalSummarizer || !clinicalSummarizer.quickSummary) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Clinical summarizer not available',
          };
        }

        const startTime = Date.now();

        // Generate quick summary
        const result = await clinicalSummarizer.quickSummary(text, max_sentences);

        const processingTime = Date.now() - startTime;

        return {
          success: true,
          summary: result.summary,
          key_points: result.keyPoints,
          processing_time: processingTime,
          confidence: result.confidence,
        };
      } catch (error: any) {
        fastify.log.error('Quick summarization failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to generate quick summary',
        };
      }
    }
  );
}
