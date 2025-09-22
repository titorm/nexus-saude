import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface MedicalEntity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
  normalized_form?: string;
  code?: string;
  code_system?: string;
}

interface EntityExtractionResult {
  entities: MedicalEntity[];
  normalizedEntities: any[];
  entityRelations: any[];
  confidence: number;
  extractionTime: number;
  metadata: any;
}

interface EntityExtractionRequest {
  text: string;
  document_id?: string;
  options?: {
    include_normalized?: boolean;
    include_relations?: boolean;
    confidence_threshold?: number;
  };
}

interface BatchEntityExtractionRequest {
  documents: Array<{
    id: string;
    text: string;
  }>;
  options?: {
    include_normalized?: boolean;
    include_relations?: boolean;
    confidence_threshold?: number;
  };
}

export async function entityRoutes(fastify: FastifyInstance) {
  // Single document entity extraction
  fastify.post('/entity-extraction', {
    schema: {
      tags: ['Entity Extraction'],
      description: 'Extract medical entities from clinical text',
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { 
            type: 'string',
            minLength: 1,
            maxLength: 50000,
            description: 'Clinical text to process'
          },
          document_id: { 
            type: 'string',
            description: 'Optional document identifier'
          },
          options: {
            type: 'object',
            properties: {
              include_normalized: { 
                type: 'boolean',
                default: true,
                description: 'Include normalized entity forms'
              },
              include_relations: { 
                type: 'boolean',
                default: true,
                description: 'Include entity relationships'
              },
              confidence_threshold: { 
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.6,
                description: 'Minimum confidence threshold for entities'
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
            processing_time: { type: 'number' },
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  label: { type: 'string' },
                  start: { type: 'number' },
                  end: { type: 'number' },
                  confidence: { type: 'number' },
                  normalized_form: { type: 'string' },
                  code: { type: 'string' },
                  code_system: { type: 'string' }
                }
              }
            },
            normalized_entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  original_text: { type: 'string' },
                  normalized_text: { type: 'string' },
                  entity_type: { type: 'string' },
                  confidence: { type: 'number' },
                  codes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        code_system: { type: 'string' },
                        code: { type: 'string' },
                        display: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            entity_relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source_entity: { type: 'string' },
                  target_entity: { type: 'string' },
                  relation_type: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                total_entities_found: { type: 'number' },
                entity_type_distribution: { type: 'object' },
                average_confidence: { type: 'number' },
                processing_model: { type: 'string' }
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
  }, async (request: FastifyRequest<{ Body: EntityExtractionRequest }>, reply: FastifyReply) => {
    try {
      const { text, document_id, options = {} } = request.body;
      const entityExtractor = (fastify as any).entityExtractor;
      const databaseService = (fastify as any).databaseService;
      const monitoringService = (fastify as any).monitoringService;

      if (!entityExtractor) {
        reply.code(500);
        return {
          error: 'Service Error',
          message: 'Entity extractor not available'
        };
      }

      const startTime = Date.now();
      const docId = document_id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Perform entity extraction
      const result = await entityExtractor.extractEntities(text, docId);

      // Filter entities by confidence threshold if specified
      if (options.confidence_threshold) {
        result.entities = result.entities.filter((entity: MedicalEntity) => 
          entity.confidence >= options.confidence_threshold!
        );
      }

      const processingTime = Date.now() - startTime;

      // Log to database
      if (databaseService) {
        try {
          await databaseService.logEntityExtraction({
            document_id: docId,
            entities_count: result.entities.length,
            entity_types: [...new Set(result.entities.map((e: MedicalEntity) => e.label))],
            average_confidence: result.confidence,
            extraction_time: processingTime,
            metadata: result.metadata
          });
        } catch (error) {
          fastify.log.warn('Failed to log entity extraction: ' + String(error));
        }
      }

      // Record metrics
      if (monitoringService) {
        monitoringService.recordRequest('entity_extraction', processingTime, true);
        monitoringService.recordEntityExtraction(result.entities.length);
      }

      return {
        success: true,
        document_id: docId,
        processing_time: processingTime,
        entities: result.entities,
        normalized_entities: options.include_normalized !== false ? result.normalizedEntities : undefined,
        entity_relations: options.include_relations !== false ? result.entityRelations : undefined,
        metadata: result.metadata
      };

    } catch (error: any) {
      const processingTime = Date.now() - Date.now();
      
      // Record error metrics
      const monitoringService = (fastify as any).monitoringService;
      if (monitoringService) {
        monitoringService.recordRequest('entity_extraction', processingTime, false);
      }

      fastify.log.error('Entity extraction failed:', error);
      reply.code(500);
      return {
        error: 'Processing Error',
        message: error.message || 'Failed to extract entities'
      };
    }
  });

  // Batch entity extraction
  fastify.post('/entity-extraction/batch', {
    schema: {
      tags: ['Entity Extraction'],
      description: 'Extract medical entities from multiple clinical documents',
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
                  maxLength: 50000
                }
              }
            }
          },
          options: {
            type: 'object',
            properties: {
              include_normalized: { type: 'boolean', default: true },
              include_relations: { type: 'boolean', default: true },
              confidence_threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.6 }
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
                  entities_count: { type: 'number' },
                  confidence: { type: 'number' },
                  processing_time: { type: 'number' }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                total_entities: { type: 'number' },
                average_confidence: { type: 'number' },
                entity_types_found: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BatchEntityExtractionRequest }>, reply: FastifyReply) => {
    try {
      const { documents, options = {} } = request.body;
      const entityExtractor = (fastify as any).entityExtractor;
      const databaseService = (fastify as any).databaseService;
      const monitoringService = (fastify as any).monitoringService;

      if (!entityExtractor) {
        reply.code(500);
        return {
          error: 'Service Error',
          message: 'Entity extractor not available'
        };
      }

      const startTime = Date.now();

      // Process documents in batch
      const results = await entityExtractor.batchExtractEntities(documents);

      const processingTime = Date.now() - startTime;

      // Prepare summary
      let totalEntities = 0;
      let totalConfidence = 0;
      const entityTypes = new Set<string>();
      const processedResults = [];

      for (const [docId, result] of results) {
        // Filter by confidence threshold if specified
        let entities = result.entities;
        if (options.confidence_threshold) {
          entities = entities.filter((entity: MedicalEntity) => 
            entity.confidence >= options.confidence_threshold!
          );
        }

        totalEntities += entities.length;
        totalConfidence += result.confidence;
        entities.forEach((entity: MedicalEntity) => entityTypes.add(entity.label));

        processedResults.push({
          document_id: docId,
          entities_count: entities.length,
          confidence: result.confidence,
          processing_time: result.extractionTime
        });

        // Log individual results
        if (databaseService) {
          try {
            await databaseService.logEntityExtraction({
              document_id: docId,
              entities_count: entities.length,
              entity_types: [...new Set(entities.map((e: MedicalEntity) => e.label))],
              average_confidence: result.confidence,
              extraction_time: result.extractionTime,
              metadata: result.metadata
            });
          } catch (error) {
            fastify.log.warn(`Failed to log entity extraction for ${docId}: ` + String(error));
          }
        }
      }

      // Record metrics
      if (monitoringService) {
        monitoringService.recordRequest('entity_extraction_batch', processingTime, true);
        monitoringService.recordEntityExtraction(totalEntities);
      }

      return {
        success: true,
        total_documents: documents.length,
        processing_time: processingTime,
        results: processedResults,
        summary: {
          total_entities: totalEntities,
          average_confidence: results.size > 0 ? totalConfidence / results.size : 0,
          entity_types_found: Array.from(entityTypes)
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - Date.now();
      
      // Record error metrics
      const monitoringService = (fastify as any).monitoringService;
      if (monitoringService) {
        monitoringService.recordRequest('entity_extraction_batch', processingTime, false);
      }

      fastify.log.error('Batch entity extraction failed:', error);
      reply.code(500);
      return {
        error: 'Processing Error',
        message: error.message || 'Failed to extract entities from batch'
      };
    }
  });

  // Get entity extraction history for a document
  fastify.get('/entity-extraction/history/:documentId', {
    schema: {
      tags: ['Entity Extraction'],
      description: 'Get entity extraction history for a specific document',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string' }
        }
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
                  entities_count: { type: 'number' },
                  confidence: { type: 'number' },
                  processing_time: { type: 'number' }
                }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply) => {
    try {
      const { documentId } = request.params;
      const entityExtractor = (fastify as any).entityExtractor;

      if (!entityExtractor) {
        reply.code(500);
        return {
          error: 'Service Error',
          message: 'Entity extractor not available'
        };
      }

      const history = entityExtractor.getExtractionHistory(documentId);

      if (!history) {
        reply.code(404);
        return {
          error: 'Not Found',
          message: 'No entity extraction history found for this document'
        };
      }

      return {
        document_id: documentId,
        history: [{
          timestamp: new Date().toISOString(),
          entities_count: history.entities.length,
          confidence: history.confidence,
          processing_time: history.extractionTime
        }]
      };

    } catch (error: any) {
      fastify.log.error('Failed to get entity extraction history:', error);
      reply.code(500);
      return {
        error: 'Processing Error',
        message: error.message || 'Failed to get entity extraction history'
      };
    }
  });

  // Get supported entity types
  fastify.get('/entity-extraction/types', {
    schema: {
      tags: ['Entity Extraction'],
      description: 'Get list of supported medical entity types',
      response: {
        200: {
          type: 'object',
          properties: {
            entity_types: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  description: { type: 'string' },
                  examples: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }, async () => {
    return {
      entity_types: [
        {
          type: 'DISEASE',
          description: 'Medical conditions and diseases',
          examples: ['diabetes', 'hypertension', 'pneumonia']
        },
        {
          type: 'SYMPTOM', 
          description: 'Symptoms and signs',
          examples: ['chest pain', 'fever', 'shortness of breath']
        },
        {
          type: 'MEDICATION',
          description: 'Medications and drugs',
          examples: ['aspirin', 'metformin', 'lisinopril']
        },
        {
          type: 'PROCEDURE',
          description: 'Medical procedures and tests',
          examples: ['MRI', 'blood test', 'surgery']
        },
        {
          type: 'ANATOMY',
          description: 'Anatomical structures',
          examples: ['heart', 'lung', 'kidney']
        },
        {
          type: 'TEST',
          description: 'Laboratory tests and measurements',
          examples: ['blood glucose', 'cholesterol', 'blood pressure']
        }
      ]
    };
  });
}