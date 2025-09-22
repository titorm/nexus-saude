import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface DocumentClassificationRequest {
  text: string;
  document_id?: string;
  options?: {
    include_confidence?: boolean;
    include_keywords?: boolean;
    model?: string;
  };
}

interface BatchClassificationRequest {
  documents: Array<{
    id: string;
    text: string;
  }>;
  options?: {
    include_confidence?: boolean;
    include_keywords?: boolean;
    model?: string;
  };
}

export async function classificationRoutes(fastify: FastifyInstance) {
  // Single document classification
  fastify.post(
    '/classification',
    {
      schema: {
        tags: ['Document Classification'],
        description: 'Classify clinical documents by type, urgency, and specialty',
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 50000,
              description: 'Clinical text to classify',
            },
            document_id: {
              type: 'string',
              description: 'Optional document identifier',
            },
            options: {
              type: 'object',
              properties: {
                include_confidence: {
                  type: 'boolean',
                  default: true,
                  description: 'Include confidence scores',
                },
                include_keywords: {
                  type: 'boolean',
                  default: true,
                  description: 'Include classification keywords',
                },
                model: {
                  type: 'string',
                  default: 'default',
                  description: 'Classification model to use',
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
              classification: {
                type: 'object',
                properties: {
                  document_type: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      confidence: { type: 'number' },
                      subtype: { type: 'string' },
                    },
                  },
                  urgency_level: {
                    type: 'object',
                    properties: {
                      level: { type: 'string' },
                      confidence: { type: 'number' },
                      indicators: { type: 'array', items: { type: 'string' } },
                    },
                  },
                  specialty_area: {
                    type: 'object',
                    properties: {
                      primary: { type: 'string' },
                      secondary: { type: 'array', items: { type: 'string' } },
                      confidence: { type: 'number' },
                    },
                  },
                  medical_complexity: {
                    type: 'object',
                    properties: {
                      level: { type: 'string' },
                      score: { type: 'number' },
                      factors: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
              keywords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    relevance: { type: 'number' },
                    category: { type: 'string' },
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  text_length: { type: 'number' },
                  word_count: { type: 'number' },
                  model_used: { type: 'string' },
                  processing_model: { type: 'string' },
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
    async (
      request: FastifyRequest<{ Body: DocumentClassificationRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { text, document_id, options = {} } = request.body;
        const documentClassifier = fastify.documentClassifier;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!documentClassifier) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Document classifier not available',
          };
        }

        const startTime = Date.now();
        const docId = document_id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Perform document classification
        const result = await documentClassifier.classifyDocument(text, docId);

        const processingTime = Date.now() - startTime;

        // Log to database
        if (databaseService?.logDocumentClassification) {
          try {
            await databaseService.logDocumentClassification({
              document_id: docId,
              document_type: result.documentType.type,
              urgency_level: result.urgencyLevel.level,
              specialty_area: result.specialtyArea.primary,
              confidence_score: result.overallConfidence,
              classification_time: processingTime,
              metadata: result.metadata,
            });
          } catch (error) {
            fastify.log.warn('Failed to log document classification: ' + String(error));
          }
        }

        // Record metrics
        if (monitoringService?.recordRequest) {
          monitoringService.recordRequest('document_classification', processingTime, true);
        }
        if (monitoringService?.recordDocumentClassification) {
          monitoringService.recordDocumentClassification(result.documentType.type);
        }

        return {
          success: true,
          document_id: docId,
          processing_time: processingTime,
          classification: {
            document_type: result.documentType,
            urgency_level: result.urgencyLevel,
            specialty_area: result.specialtyArea,
            medical_complexity: result.medicalComplexity,
          },
          keywords: options.include_keywords !== false ? result.keywords : undefined,
          metadata: {
            text_length: text.length,
            word_count: text.split(/\s+/).length,
            model_used: options.model || 'default',
            processing_model: result.metadata.model,
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = (fastify as any).monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest('document_classification', processingTime, false);
        }

        fastify.log.error('Document classification failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to classify document',
        };
      }
    }
  );

  // Batch document classification
  fastify.post(
    '/classification/batch',
    {
      schema: {
        tags: ['Document Classification'],
        description: 'Classify multiple clinical documents',
        body: {
          type: 'object',
          required: ['documents'],
          properties: {
            documents: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              items: {
                type: 'object',
                required: ['id', 'text'],
                properties: {
                  id: { type: 'string' },
                  text: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 50000,
                  },
                },
              },
            },
            options: {
              type: 'object',
              properties: {
                include_confidence: { type: 'boolean', default: true },
                include_keywords: { type: 'boolean', default: true },
                model: { type: 'string', default: 'default' },
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
                    document_type: { type: 'string' },
                    urgency_level: { type: 'string' },
                    specialty_area: { type: 'string' },
                    confidence: { type: 'number' },
                    processing_time: { type: 'number' },
                  },
                },
              },
              summary: {
                type: 'object',
                properties: {
                  document_types: { type: 'object' },
                  urgency_distribution: { type: 'object' },
                  specialty_distribution: { type: 'object' },
                  average_confidence: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BatchClassificationRequest }>, reply: FastifyReply) => {
      try {
        const { documents, options = {} } = request.body;
        const documentClassifier = fastify.documentClassifier;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!documentClassifier) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Document classifier not available',
          };
        }

        const startTime = Date.now();

        // Process documents in batch
        const results = await documentClassifier.batchClassifyDocuments(documents);

        const processingTime = Date.now() - startTime;

        // Prepare summary statistics
        const documentTypes: { [key: string]: number } = {};
        const urgencyDistribution: { [key: string]: number } = {};
        const specialtyDistribution: { [key: string]: number } = {};
        let totalConfidence = 0;
        const processedResults = [];

        // Ensure results is iterable as [id, result][]
        const resultsArray: Array<[string, any]> = Array.isArray(results)
          ? results
          : Array.from(results as Map<string, any>);
        for (const [docId, result] of resultsArray) {
          // Update distributions
          documentTypes[result.documentType.type] =
            (documentTypes[result.documentType.type] || 0) + 1;
          urgencyDistribution[result.urgencyLevel.level] =
            (urgencyDistribution[result.urgencyLevel.level] || 0) + 1;
          specialtyDistribution[result.specialtyArea.primary] =
            (specialtyDistribution[result.specialtyArea.primary] || 0) + 1;
          totalConfidence += result.overallConfidence;

          processedResults.push({
            document_id: docId,
            document_type: result.documentType.type,
            urgency_level: result.urgencyLevel.level,
            specialty_area: result.specialtyArea.primary,
            confidence: result.overallConfidence,
            processing_time: result.classificationTime,
          });

          // Log individual results
          if (databaseService?.logDocumentClassification) {
            try {
              await databaseService.logDocumentClassification({
                document_id: docId,
                document_type: result.documentType.type,
                urgency_level: result.urgencyLevel.level,
                specialty_area: result.specialtyArea.primary,
                confidence_score: result.overallConfidence,
                classification_time: result.classificationTime,
                metadata: result.metadata,
              });
            } catch (error) {
              fastify.log.warn(`Failed to log classification for ${docId}: ` + String(error));
            }
          }
        }

        // Record metrics
        if (monitoringService?.recordRequest) {
          monitoringService.recordRequest('document_classification_batch', processingTime, true);
        }
        if (monitoringService?.recordDocumentClassification) {
          const recordFn = monitoringService.recordDocumentClassification;
          Object.entries(documentTypes).forEach(([type, count]) => {
            for (let i = 0; i < count; i++) {
              recordFn(type);
            }
          });
        }

        return {
          success: true,
          total_documents: documents.length,
          processing_time: processingTime,
          results: processedResults,
          summary: {
            document_types: documentTypes,
            urgency_distribution: urgencyDistribution,
            specialty_distribution: specialtyDistribution,
            average_confidence: resultsArray.length > 0 ? totalConfidence / resultsArray.length : 0,
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = (fastify as any).monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest('document_classification_batch', processingTime, false);
        }

        fastify.log.error('Batch document classification failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to classify documents in batch',
        };
      }
    }
  );

  // Get classification history for a document
  fastify.get(
    '/classification/history/:documentId',
    {
      schema: {
        tags: ['Document Classification'],
        description: 'Get classification history for a specific document',
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
                    document_type: { type: 'string' },
                    urgency_level: { type: 'string' },
                    specialty_area: { type: 'string' },
                    confidence: { type: 'number' },
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
        const documentClassifier = (fastify as any).documentClassifier;

        if (!documentClassifier) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Document classifier not available',
          };
        }

        const history = documentClassifier.getClassificationHistory(documentId);

        if (!history) {
          reply.code(404);
          return {
            error: 'Not Found',
            message: 'No classification history found for this document',
          };
        }

        return {
          document_id: documentId,
          history: [
            {
              timestamp: new Date().toISOString(),
              document_type: history.documentType.type,
              urgency_level: history.urgencyLevel.level,
              specialty_area: history.specialtyArea.primary,
              confidence: history.overallConfidence,
              processing_time: history.classificationTime,
            },
          ],
        };
      } catch (error: any) {
        fastify.log.error('Failed to get classification history:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to get classification history',
        };
      }
    }
  );

  // Get supported document types
  fastify.get(
    '/classification/types',
    {
      schema: {
        tags: ['Document Classification'],
        description: 'Get list of supported document types and classifications',
        response: {
          200: {
            type: 'object',
            properties: {
              document_types: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    description: { type: 'string' },
                    subtypes: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              urgency_levels: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    level: { type: 'string' },
                    description: { type: 'string' },
                    indicators: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              specialty_areas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    area: { type: 'string' },
                    description: { type: 'string' },
                    keywords: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        document_types: [
          {
            type: 'consultation_note',
            description: 'Patient consultation and examination notes',
            subtypes: ['initial_consultation', 'follow_up', 'specialist_consultation'],
          },
          {
            type: 'discharge_summary',
            description: 'Hospital discharge summaries',
            subtypes: ['routine_discharge', 'transfer', 'against_medical_advice'],
          },
          {
            type: 'operative_report',
            description: 'Surgical procedure reports',
            subtypes: ['major_surgery', 'minor_surgery', 'emergency_surgery'],
          },
          {
            type: 'diagnostic_report',
            description: 'Diagnostic test and imaging reports',
            subtypes: ['laboratory', 'radiology', 'pathology'],
          },
          {
            type: 'progress_note',
            description: 'Patient progress and monitoring notes',
            subtypes: ['daily_progress', 'nursing_note', 'therapy_note'],
          },
        ],
        urgency_levels: [
          {
            level: 'emergency',
            description: 'Immediate medical attention required',
            indicators: ['acute', 'emergency', 'urgent', 'critical', 'stat'],
          },
          {
            level: 'urgent',
            description: 'Prompt medical attention needed',
            indicators: ['urgent', 'priority', 'expedite', 'asap'],
          },
          {
            level: 'routine',
            description: 'Standard medical care',
            indicators: ['routine', 'stable', 'follow-up', 'scheduled'],
          },
          {
            level: 'low',
            description: 'Non-urgent medical care',
            indicators: ['stable', 'chronic', 'maintenance', 'preventive'],
          },
        ],
        specialty_areas: [
          {
            area: 'cardiology',
            description: 'Heart and cardiovascular system',
            keywords: ['heart', 'cardiac', 'cardiovascular', 'ecg', 'chest pain'],
          },
          {
            area: 'neurology',
            description: 'Brain and nervous system',
            keywords: ['brain', 'neurological', 'headache', 'seizure', 'stroke'],
          },
          {
            area: 'orthopedics',
            description: 'Bones, joints, and musculoskeletal system',
            keywords: ['bone', 'joint', 'fracture', 'orthopedic', 'musculoskeletal'],
          },
          {
            area: 'gastroenterology',
            description: 'Digestive system',
            keywords: ['stomach', 'intestinal', 'digestive', 'abdominal pain', 'gi'],
          },
          {
            area: 'pulmonology',
            description: 'Lungs and respiratory system',
            keywords: ['lung', 'respiratory', 'breathing', 'pneumonia', 'asthma'],
          },
        ],
      };
    }
  );

  // Get classification statistics
  fastify.get(
    '/classification/stats',
    {
      schema: {
        tags: ['Document Classification'],
        description: 'Get classification statistics and metrics',
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
              total_classifications: { type: 'number' },
              document_type_distribution: { type: 'object' },
              urgency_distribution: { type: 'object' },
              specialty_distribution: { type: 'object' },
              average_confidence: { type: 'number' },
              average_processing_time: { type: 'number' },
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
          total_classifications: 0,
          document_type_distribution: {},
          urgency_distribution: {},
          specialty_distribution: {},
          average_confidence: 0,
          average_processing_time: 0,
        };
      }

      try {
        const stats = databaseService?.getClassificationStats
          ? await databaseService.getClassificationStats(timeframe)
          : null;
        return {
          timeframe,
          ...stats,
        };
      } catch (error) {
        fastify.log.error('Failed to get classification stats: ' + String(error));
        return {
          timeframe,
          total_classifications: 0,
          document_type_distribution: {},
          urgency_distribution: {},
          specialty_distribution: {},
          average_confidence: 0,
          average_processing_time: 0,
        };
      }
    }
  );
}
