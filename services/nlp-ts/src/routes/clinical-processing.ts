import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface ClinicalProcessingRequest {
  text: string;
  document_id?: string;
  document_type?: string;
  options?: {
    include_entity_extraction?: boolean;
    include_classification?: boolean;
    include_summarization?: boolean;
    include_structured_data?: boolean;
    processing_priority?: 'low' | 'normal' | 'high' | 'urgent';
    quality_threshold?: number;
  };
}

interface BatchClinicalProcessingRequest {
  documents: Array<{
    id: string;
    text: string;
    type?: string;
  }>;
  options?: {
    include_entity_extraction?: boolean;
    include_classification?: boolean;
    include_summarization?: boolean;
    include_structured_data?: boolean;
    processing_priority?: 'low' | 'normal' | 'high' | 'urgent';
    quality_threshold?: number;
  };
}

export async function clinicalProcessingRoutes(fastify: FastifyInstance) {
  // Comprehensive clinical text processing
  fastify.post('/clinical-processing', {
    schema: {
      tags: ['Clinical Processing'],
      description: 'Comprehensive clinical text processing with all NLP features',
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { 
            type: 'string',
            minLength: 1,
            maxLength: 200000,
            description: 'Clinical text to process comprehensively'
          },
          document_id: { 
            type: 'string',
            description: 'Optional document identifier'
          },
          document_type: { 
            type: 'string',
            enum: ['consultation_note', 'discharge_summary', 'operative_report', 'lab_report', 'radiology_report', 'progress_note', 'other'],
            description: 'Type of clinical document'
          },
          options: {
            type: 'object',
            properties: {
              include_entity_extraction: { 
                type: 'boolean',
                default: true,
                description: 'Include medical entity extraction'
              },
              include_classification: { 
                type: 'boolean',
                default: true,
                description: 'Include document classification'
              },
              include_summarization: { 
                type: 'boolean',
                default: true,
                description: 'Include clinical summarization'
              },
              include_structured_data: { 
                type: 'boolean',
                default: true,
                description: 'Include structured data extraction'
              },
              processing_priority: { 
                type: 'string',
                enum: ['low', 'normal', 'high', 'urgent'],
                default: 'normal',
                description: 'Processing priority level'
              },
              quality_threshold: { 
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.7,
                description: 'Minimum quality threshold for results'
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            document_id: { type: 'string' },
            document_type: { type: 'string' },
            processing_time: { type: 'number' },
            processing_pipeline: {
              type: 'object',
              properties: {
                stages_completed: { type: 'array', items: { type: 'string' } },
                total_stages: { type: 'number' },
                success_rate: { type: 'number' }
              }
            },
            entity_extraction: {
              type: 'object',
              properties: {
                entities: { type: 'array' },
                entity_count: { type: 'number' },
                confidence: { type: 'number' },
                processing_time: { type: 'number' }
              }
            },
            classification: {
              type: 'object',
              properties: {
                document_type: { type: 'string' },
                urgency_level: { type: 'string' },
                specialty_area: { type: 'string' },
                confidence: { type: 'number' },
                processing_time: { type: 'number' }
              }
            },
            summarization: {
              type: 'object',
              properties: {
                extractive_summary: { type: 'string' },
                abstractive_summary: { type: 'string' },
                key_points: { type: 'array', items: { type: 'string' } },
                compression_ratio: { type: 'number' },
                processing_time: { type: 'number' }
              }
            },
            structured_data: {
              type: 'object',
              properties: {
                medications: { type: 'array' },
                diagnoses: { type: 'array' },
                procedures: { type: 'array' },
                vital_signs: { type: 'object' },
                allergies: { type: 'array' },
                data_completeness: { type: 'number' },
                processing_time: { type: 'number' }
              }
            },
            clinical_insights: {
              type: 'object',
              properties: {
                risk_factors: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                follow_up_required: { type: 'boolean' },
                urgency_indicators: { type: 'array', items: { type: 'string' } },
                quality_indicators: { type: 'object' }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                text_characteristics: { type: 'object' },
                processing_statistics: { type: 'object' },
                quality_metrics: { type: 'object' },
                model_versions: { type: 'object' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: ClinicalProcessingRequest }>, reply: FastifyReply) => {
    try {
      const { text, document_id, document_type, options = {} } = request.body;
      const clinicalNLPProcessor = (fastify as any).clinicalNLPProcessor;
      const databaseService = (fastify as any).databaseService;
      const monitoringService = (fastify as any).monitoringService;

      if (!clinicalNLPProcessor) {
        reply.code(500);
        return {
          error: 'Service Error',
          message: 'Clinical NLP processor not available'
        };
      }

      const startTime = Date.now();
      const docId = document_id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Perform comprehensive clinical processing
      const result = await clinicalNLPProcessor.processDocument(text, {
        documentId: docId,
        documentType: document_type || 'other',
        includeEntityExtraction: options.include_entity_extraction !== false,
        includeClassification: options.include_classification !== false,
        includeSummarization: options.include_summarization !== false,
        includeStructuredData: options.include_structured_data !== false,
        processingPriority: options.processing_priority || 'normal',
        qualityThreshold: options.quality_threshold || 0.7
      });

      const processingTime = Date.now() - startTime;

      // Log comprehensive processing to database
      if (databaseService) {
        try {
          await databaseService.logClinicalProcessing({
            document_id: docId,
            document_type: document_type || 'other',
            stages_completed: result.stagesCompleted,
            total_processing_time: processingTime,
            quality_score: result.overallQuality,
            entity_count: result.entityExtraction?.entityCount || 0,
            has_summary: !!result.summarization,
            has_structured_data: !!result.structuredData,
            metadata: result.metadata
          });
        } catch (error) {
          fastify.log.warn('Failed to log clinical processing: ' + String(error));
        }
      }

      // Record comprehensive metrics
      if (monitoringService) {
        monitoringService.recordRequest('clinical_processing_comprehensive', processingTime, true);
        monitoringService.recordClinicalProcessing(result.stagesCompleted.length, result.overallQuality);
      }

      return {
        success: true,
        document_id: docId,
        document_type: document_type || 'other',
        processing_time: processingTime,
        processing_pipeline: {
          stages_completed: result.stagesCompleted,
          total_stages: result.totalStages,
          success_rate: result.stagesCompleted.length / result.totalStages
        },
        entity_extraction: result.entityExtraction ? {
          entities: result.entityExtraction.entities,
          entity_count: result.entityExtraction.entityCount,
          confidence: result.entityExtraction.confidence,
          processing_time: result.entityExtraction.processingTime
        } : undefined,
        classification: result.classification ? {
          document_type: result.classification.documentType,
          urgency_level: result.classification.urgencyLevel,
          specialty_area: result.classification.specialtyArea,
          confidence: result.classification.confidence,
          processing_time: result.classification.processingTime
        } : undefined,
        summarization: result.summarization ? {
          extractive_summary: result.summarization.extractiveSummary,
          abstractive_summary: result.summarization.abstractiveSummary,
          key_points: result.summarization.keyPoints,
          compression_ratio: result.summarization.compressionRatio,
          processing_time: result.summarization.processingTime
        } : undefined,
        structured_data: result.structuredData ? {
          medications: result.structuredData.medications,
          diagnoses: result.structuredData.diagnoses,
          procedures: result.structuredData.procedures,
          vital_signs: result.structuredData.vitalSigns,
          allergies: result.structuredData.allergies,
          data_completeness: result.structuredData.dataCompleteness,
          processing_time: result.structuredData.processingTime
        } : undefined,
        clinical_insights: result.clinicalInsights,
        metadata: {
          text_characteristics: result.textCharacteristics,
          processing_statistics: result.processingStatistics,
          quality_metrics: result.qualityMetrics,
          model_versions: result.modelVersions
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - Date.now();
      
      // Record error metrics
      const monitoringService = (fastify as any).monitoringService;
      if (monitoringService) {
        monitoringService.recordRequest('clinical_processing_comprehensive', processingTime, false);
      }

      fastify.log.error('Comprehensive clinical processing failed:', error);
      reply.code(500);
      return {
        error: 'Processing Error',
        message: error.message || 'Failed to process clinical document comprehensively'
      };
    }
  });

  // Batch comprehensive clinical processing
  fastify.post('/clinical-processing/batch', {
    schema: {
      tags: ['Clinical Processing'],
      description: 'Batch comprehensive clinical text processing',
      body: {
        type: 'object',
        required: ['documents'],
        properties: {
          documents: {
            type: 'array',
            minItems: 1,
            maxItems: 25,
            items: {
              type: 'object',
              required: ['id', 'text'],
              properties: {
                id: { type: 'string' },
                text: { 
                  type: 'string',
                  minLength: 1,
                  maxLength: 200000
                },
                type: { 
                  type: 'string',
                  enum: ['consultation_note', 'discharge_summary', 'operative_report', 'lab_report', 'radiology_report', 'progress_note', 'other']
                }
              }
            }
          },
          options: {
            type: 'object',
            properties: {
              include_entity_extraction: { type: 'boolean', default: true },
              include_classification: { type: 'boolean', default: true },
              include_summarization: { type: 'boolean', default: true },
              include_structured_data: { type: 'boolean', default: true },
              processing_priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
              quality_threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.7 }
            }
          }
        }
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
                  stages_completed: { type: 'number' },
                  overall_quality: { type: 'number' },
                  entity_count: { type: 'number' },
                  processing_time: { type: 'number' }
                }
              }
            },
            batch_summary: {
              type: 'object',
              properties: {
                total_entities_extracted: { type: 'number' },
                average_quality_score: { type: 'number' },
                document_type_distribution: { type: 'object' },
                processing_success_rate: { type: 'number' },
                total_processing_stages: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BatchClinicalProcessingRequest }>, reply: FastifyReply) => {
    try {
      const { documents, options = {} } = request.body;
      const clinicalNLPProcessor = (fastify as any).clinicalNLPProcessor;
      const databaseService = (fastify as any).databaseService;
      const monitoringService = (fastify as any).monitoringService;

      if (!clinicalNLPProcessor) {
        reply.code(500);
        return {
          error: 'Service Error',
          message: 'Clinical NLP processor not available'
        };
      }

      const startTime = Date.now();

      // Process documents in batch
      const results = await clinicalNLPProcessor.batchProcessDocuments(documents, options);

      const processingTime = Date.now() - startTime;

      // Prepare batch summary
      let totalEntitiesExtracted = 0;
      let totalQualityScore = 0;
      let totalProcessingStages = 0;
      let successfulProcessing = 0;
      const documentTypeDistribution: { [key: string]: number } = {};
      const processedResults = [];

      for (const [docId, result] of results) {
        const docType = result.documentType || 'other';
        documentTypeDistribution[docType] = (documentTypeDistribution[docType] || 0) + 1;
        
        totalEntitiesExtracted += result.entityExtraction?.entityCount || 0;
        totalQualityScore += result.overallQuality;
        totalProcessingStages += result.stagesCompleted.length;
        
        if (result.overallQuality >= (options.quality_threshold || 0.7)) {
          successfulProcessing++;
        }

        processedResults.push({
          document_id: docId,
          document_type: docType,
          stages_completed: result.stagesCompleted.length,
          overall_quality: result.overallQuality,
          entity_count: result.entityExtraction?.entityCount || 0,
          processing_time: result.processingTime
        });

        // Log individual results
        if (databaseService) {
          try {
            await databaseService.logClinicalProcessing({
              document_id: docId,
              document_type: docType,
              stages_completed: result.stagesCompleted,
              total_processing_time: result.processingTime,
              quality_score: result.overallQuality,
              entity_count: result.entityExtraction?.entityCount || 0,
              has_summary: !!result.summarization,
              has_structured_data: !!result.structuredData,
              metadata: result.metadata
            });
          } catch (error) {
            fastify.log.warn(`Failed to log clinical processing for ${docId}: ` + String(error));
          }
        }
      }

      // Record batch metrics
      if (monitoringService) {
        monitoringService.recordRequest('clinical_processing_batch', processingTime, true);
        monitoringService.recordClinicalProcessing(totalProcessingStages, totalQualityScore / results.size);
      }

      return {
        success: true,
        total_documents: documents.length,
        processing_time: processingTime,
        results: processedResults,
        batch_summary: {
          total_entities_extracted: totalEntitiesExtracted,
          average_quality_score: results.size > 0 ? totalQualityScore / results.size : 0,
          document_type_distribution: documentTypeDistribution,
          processing_success_rate: documents.length > 0 ? successfulProcessing / documents.length : 0,
          total_processing_stages: totalProcessingStages
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - Date.now();
      
      // Record error metrics
      const monitoringService = (fastify as any).monitoringService;
      if (monitoringService) {
        monitoringService.recordRequest('clinical_processing_batch', processingTime, false);
      }

      fastify.log.error('Batch clinical processing failed:', error);
      reply.code(500);
      return {
        error: 'Processing Error',
        message: error.message || 'Failed to process clinical documents in batch'
      };
    }
  });

  // Get processing pipeline status
  fastify.get('/clinical-processing/status', {
    schema: {
      tags: ['Clinical Processing'],
      description: 'Get current processing pipeline status and health',
      response: {
        200: {
          type: 'object',
          properties: {
            pipeline_status: { type: 'string' },
            active_processors: { type: 'array', items: { type: 'string' } },
            queue_length: { type: 'number' },
            processing_capacity: { type: 'object' },
            performance_metrics: { type: 'object' },
            last_health_check: { type: 'string' }
          }
        }
      }
    }
  }, async () => {
    const clinicalNLPProcessor = (fastify as any).clinicalNLPProcessor;
    const monitoringService = (fastify as any).monitoringService;

    if (!clinicalNLPProcessor) {
      return {
        pipeline_status: 'unavailable',
        active_processors: [],
        queue_length: 0,
        processing_capacity: {},
        performance_metrics: {},
        last_health_check: new Date().toISOString()
      };
    }

    try {
      const status = await clinicalNLPProcessor.getProcessingStatus();
      const metrics = monitoringService ? await monitoringService.getCurrentMetrics() : {};

      return {
        pipeline_status: status.status,
        active_processors: status.activeProcessors,
        queue_length: status.queueLength,
        processing_capacity: status.capacity,
        performance_metrics: metrics,
        last_health_check: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('Failed to get processing status: ' + String(error));
      return {
        pipeline_status: 'error',
        active_processors: [],
        queue_length: 0,
        processing_capacity: {},
        performance_metrics: {},
        last_health_check: new Date().toISOString()
      };
    }
  });

  // Get processing statistics
  fastify.get('/clinical-processing/stats', {
    schema: {
      tags: ['Clinical Processing'],
      description: 'Get comprehensive processing statistics',
      querystring: {
        type: 'object',
        properties: {
          timeframe: { 
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            default: 'day'
          },
          document_type: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeframe: { type: 'string' },
            total_documents_processed: { type: 'number' },
            average_processing_time: { type: 'number' },
            average_quality_score: { type: 'number' },
            processing_success_rate: { type: 'number' },
            document_type_distribution: { type: 'object' },
            stage_completion_rates: { type: 'object' },
            error_distribution: { type: 'object' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { timeframe?: string; document_type?: string } }>) => {
    const { timeframe = 'day', document_type } = request.query;
    const databaseService = (fastify as any).databaseService;

    if (!databaseService) {
      return {
        timeframe,
        total_documents_processed: 0,
        average_processing_time: 0,
        average_quality_score: 0,
        processing_success_rate: 0,
        document_type_distribution: {},
        stage_completion_rates: {},
        error_distribution: {}
      };
    }

    try {
      const stats = await databaseService.getClinicalProcessingStats(timeframe, document_type);
      return {
        timeframe,
        document_type: document_type || 'all',
        ...stats
      };
    } catch (error) {
      fastify.log.error('Failed to get processing stats: ' + String(error));
      return {
        timeframe,
        total_documents_processed: 0,
        average_processing_time: 0,
        average_quality_score: 0,
        processing_success_rate: 0,
        document_type_distribution: {},
        stage_completion_rates: {},
        error_distribution: {}
      };
    }
  });
}