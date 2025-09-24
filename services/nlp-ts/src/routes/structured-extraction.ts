import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

interface StructuredExtractionRequest {
  text: string;
  document_id?: string;
  options?: {
    extract_medications?: boolean;
    extract_allergies?: boolean;
    extract_vital_signs?: boolean;
    extract_procedures?: boolean;
    extract_diagnoses?: boolean;
    extract_symptoms?: boolean;
    include_confidence?: boolean;
    include_sections?: boolean;
  };
}

interface BatchStructuredExtractionRequest {
  documents: Array<{
    id: string;
    text: string;
  }>;
  options?: {
    extract_medications?: boolean;
    extract_allergies?: boolean;
    extract_vital_signs?: boolean;
    extract_procedures?: boolean;
    extract_diagnoses?: boolean;
    extract_symptoms?: boolean;
    include_confidence?: boolean;
    include_sections?: boolean;
  };
}

export async function structuredExtractionRoutes(fastify: FastifyInstance) {
  // Single document structured data extraction
  fastify.post(
    '/structured-extraction',
    {
      schema: {
        tags: ['Structured Data Extraction'],
        description: 'Extract structured clinical data from medical text',
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 100000,
              description: 'Clinical text to process',
            },
            document_id: {
              type: 'string',
              description: 'Optional document identifier',
            },
            options: {
              type: 'object',
              properties: {
                extract_medications: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract medication information',
                },
                extract_allergies: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract allergy information',
                },
                extract_vital_signs: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract vital signs and measurements',
                },
                extract_procedures: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract medical procedures',
                },
                extract_diagnoses: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract diagnoses and conditions',
                },
                extract_symptoms: {
                  type: 'boolean',
                  default: true,
                  description: 'Extract symptoms and complaints',
                },
                include_confidence: {
                  type: 'boolean',
                  default: true,
                  description: 'Include confidence scores',
                },
                include_sections: {
                  type: 'boolean',
                  default: true,
                  description: 'Include document section analysis',
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
              structured_data: {
                type: 'object',
                properties: {
                  patient_demographics: {
                    type: 'object',
                    properties: {
                      age: { type: 'number' },
                      gender: { type: 'string' },
                      date_of_birth: { type: 'string' },
                      patient_id: { type: 'string' },
                    },
                  },
                  chief_complaint: {
                    type: 'object',
                    properties: {
                      complaint: { type: 'string' },
                      duration: { type: 'string' },
                      severity: { type: 'string' },
                      onset: { type: 'string' },
                    },
                  },
                  medications: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        dosage: { type: 'string' },
                        frequency: { type: 'string' },
                        route: { type: 'string' },
                        start_date: { type: 'string' },
                        status: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                    },
                  },
                  allergies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        allergen: { type: 'string' },
                        reaction: { type: 'string' },
                        severity: { type: 'string' },
                        type: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                    },
                  },
                  vital_signs: {
                    type: 'object',
                    properties: {
                      blood_pressure: {
                        type: 'object',
                        properties: {
                          systolic: { type: 'number' },
                          diastolic: { type: 'number' },
                          unit: { type: 'string' },
                          timestamp: { type: 'string' },
                        },
                      },
                      heart_rate: {
                        type: 'object',
                        properties: {
                          value: { type: 'number' },
                          unit: { type: 'string' },
                          timestamp: { type: 'string' },
                        },
                      },
                      temperature: {
                        type: 'object',
                        properties: {
                          value: { type: 'number' },
                          unit: { type: 'string' },
                          timestamp: { type: 'string' },
                        },
                      },
                      respiratory_rate: {
                        type: 'object',
                        properties: {
                          value: { type: 'number' },
                          unit: { type: 'string' },
                          timestamp: { type: 'string' },
                        },
                      },
                      oxygen_saturation: {
                        type: 'object',
                        properties: {
                          value: { type: 'number' },
                          unit: { type: 'string' },
                          timestamp: { type: 'string' },
                        },
                      },
                    },
                  },
                  diagnoses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        condition: { type: 'string' },
                        icd_code: { type: 'string' },
                        type: { type: 'string' },
                        status: { type: 'string' },
                        onset_date: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                    },
                  },
                  procedures: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        procedure: { type: 'string' },
                        cpt_code: { type: 'string' },
                        date: { type: 'string' },
                        status: { type: 'string' },
                        provider: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                    },
                  },
                  symptoms: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        symptom: { type: 'string' },
                        severity: { type: 'string' },
                        duration: { type: 'string' },
                        frequency: { type: 'string' },
                        onset: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                    },
                  },
                },
              },
              document_sections: {
                type: 'object',
                properties: {
                  history_of_present_illness: { type: 'string' },
                  past_medical_history: { type: 'string' },
                  social_history: { type: 'string' },
                  family_history: { type: 'string' },
                  review_of_systems: { type: 'string' },
                  physical_examination: { type: 'string' },
                  assessment_and_plan: { type: 'string' },
                  medications: { type: 'string' },
                  allergies: { type: 'string' },
                },
              },
              extraction_summary: {
                type: 'object',
                properties: {
                  total_entities_extracted: { type: 'number' },
                  confidence_distribution: { type: 'object' },
                  sections_identified: { type: 'array', items: { type: 'string' } },
                  data_completeness: { type: 'number' },
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
    async (request: FastifyRequest<{ Body: StructuredExtractionRequest }>, reply: FastifyReply) => {
      try {
        const { text, document_id, options = {} } = request.body;
        const structuredDataExtractor = fastify.structuredDataExtractor;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!structuredDataExtractor) {
          reply.code(500);
          return {
            error: 'Service Error',
            message: 'Structured data extractor not available',
          };
        }

        const startTime = Date.now();
        const docId = document_id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Perform structured data extraction
        if (!structuredDataExtractor.extractStructuredData) {
          reply.code(500);
          return { error: 'Service Error', message: 'Structured data extractor not available' };
        }
        const result = await structuredDataExtractor.extractStructuredData(text, docId, options);

        const processingTime = Date.now() - startTime;

        // Log to database
        if (databaseService && databaseService.logStructuredExtraction) {
          try {
            await databaseService.logStructuredExtraction({
              document_id: docId,
              entities_extracted: result.totalEntitiesExtracted,
              data_completeness: result.dataCompleteness,
              sections_identified: result.sectionsIdentified,
              extraction_time: processingTime,
              metadata: result.metadata,
            });
          } catch (error) {
            fastify.log.warn('Failed to log structured extraction: ' + String(error));
          }
        }

        // Record metrics
        if (monitoringService) {
          monitoringService.recordRequest?.('structured_extraction', processingTime, true);
          monitoringService.recordStructuredExtraction?.(result.totalEntitiesExtracted);
        }

        return {
          success: true,
          document_id: docId,
          processing_time: processingTime,
          structured_data: {
            patient_demographics: result.patientDemographics,
            chief_complaint: result.chiefComplaint,
            medications: options.extract_medications !== false ? result.medications : undefined,
            allergies: options.extract_allergies !== false ? result.allergies : undefined,
            vital_signs: options.extract_vital_signs !== false ? result.vitalSigns : undefined,
            diagnoses: options.extract_diagnoses !== false ? result.diagnoses : undefined,
            procedures: options.extract_procedures !== false ? result.procedures : undefined,
            symptoms: options.extract_symptoms !== false ? result.symptoms : undefined,
          },
          document_sections:
            options.include_sections !== false ? result.documentSections : undefined,
          extraction_summary: {
            total_entities_extracted: result.totalEntitiesExtracted,
            confidence_distribution: result.confidenceDistribution,
            sections_identified: result.sectionsIdentified,
            data_completeness: result.dataCompleteness,
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = fastify.monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest?.('structured_extraction', processingTime, false);
        }

        fastify.log.error('Structured data extraction failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to extract structured data',
        };
      }
    }
  );

  // Batch structured data extraction
  fastify.post(
    '/structured-extraction/batch',
    {
      schema: {
        tags: ['Structured Data Extraction'],
        description: 'Extract structured data from multiple clinical documents',
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
                    minLength: 1,
                    maxLength: 100000,
                  },
                },
              },
            },
            options: {
              type: 'object',
              properties: {
                extract_medications: { type: 'boolean', default: true },
                extract_allergies: { type: 'boolean', default: true },
                extract_vital_signs: { type: 'boolean', default: true },
                extract_procedures: { type: 'boolean', default: true },
                extract_diagnoses: { type: 'boolean', default: true },
                extract_symptoms: { type: 'boolean', default: true },
                include_confidence: { type: 'boolean', default: true },
                include_sections: { type: 'boolean', default: true },
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
                    entities_extracted: { type: 'number' },
                    data_completeness: { type: 'number' },
                    sections_identified: { type: 'number' },
                    processing_time: { type: 'number' },
                  },
                },
              },
              aggregate_summary: {
                type: 'object',
                properties: {
                  total_entities_extracted: { type: 'number' },
                  average_data_completeness: { type: 'number' },
                  common_medications: { type: 'array', items: { type: 'string' } },
                  common_conditions: { type: 'array', items: { type: 'string' } },
                  common_procedures: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: BatchStructuredExtractionRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { documents, options = {} } = request.body;
        const structuredDataExtractor = fastify.structuredDataExtractor;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        if (!structuredDataExtractor || !structuredDataExtractor.batchExtractStructuredData) {
          reply.code(500);
          return { error: 'Service Error', message: 'Structured data extractor not available' };
        }

        const startTime = Date.now();

        // Process documents in batch
        const results = await structuredDataExtractor.batchExtractStructuredData(
          documents,
          options
        );

        const processingTime = Date.now() - startTime;

        // Prepare aggregate summary
        let totalEntitiesExtracted = 0;
        let totalDataCompleteness = 0;
        const allMedications = new Set<string>();
        const allConditions = new Set<string>();
        const allProcedures = new Set<string>();
        const processedResults = [];

        for (const [docId, result] of results) {
          totalEntitiesExtracted += result.totalEntitiesExtracted;
          totalDataCompleteness += result.dataCompleteness;

          // Collect common entities
          result.medications.forEach((med: any) => allMedications.add(med.name));
          result.diagnoses.forEach((diag: any) => allConditions.add(diag.condition));
          result.procedures.forEach((proc: any) => allProcedures.add(proc.procedure));

          processedResults.push({
            document_id: docId,
            entities_extracted: result.totalEntitiesExtracted,
            data_completeness: result.dataCompleteness,
            sections_identified: result.sectionsIdentified.length,
            processing_time: result.processingTime,
          });

          // Log individual results
          if (databaseService && databaseService.logStructuredExtraction) {
            try {
              await databaseService.logStructuredExtraction({
                document_id: docId,
                entities_extracted: result.totalEntitiesExtracted,
                data_completeness: result.dataCompleteness,
                sections_identified: result.sectionsIdentified,
                extraction_time: result.processingTime,
                metadata: result.metadata,
              });
            } catch (error) {
              fastify.log.warn(
                `Failed to log structured extraction for ${docId}: ` + String(error)
              );
            }
          }
        }

        // Record metrics
        if (monitoringService) {
          monitoringService.recordRequest?.('structured_extraction_batch', processingTime, true);
          monitoringService.recordStructuredExtraction?.(totalEntitiesExtracted);
        }

        const resultsArray = Array.isArray(results)
          ? results
          : Array.from(results as Map<string, any>);

        return {
          success: true,
          total_documents: documents.length,
          processing_time: processingTime,
          results: processedResults,
          aggregate_summary: {
            total_entities_extracted: totalEntitiesExtracted,
            average_data_completeness:
              resultsArray.length > 0 ? totalDataCompleteness / resultsArray.length : 0,
            common_medications: Array.from(allMedications).slice(0, 10),
            common_conditions: Array.from(allConditions).slice(0, 10),
            common_procedures: Array.from(allProcedures).slice(0, 10),
          },
        };
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();

        // Record error metrics
        const monitoringService = fastify.monitoringService;
        if (monitoringService) {
          monitoringService.recordRequest?.('structured_extraction_batch', processingTime, false);
        }

        fastify.log.error('Batch structured data extraction failed:', error);
        reply.code(500);
        return {
          error: 'Processing Error',
          message: error.message || 'Failed to extract structured data in batch',
        };
      }
    }
  );

  // Get extraction templates
  fastify.get(
    '/structured-extraction/templates',
    {
      schema: {
        tags: ['Structured Data Extraction'],
        description: 'Get available extraction templates for different document types',
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    document_type: { type: 'string' },
                    fields: { type: 'array', items: { type: 'string' } },
                    required_sections: { type: 'array', items: { type: 'string' } },
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
        templates: [
          {
            name: 'consultation_note',
            description: 'Standard consultation note template',
            document_type: 'consultation_note',
            fields: [
              'patient_demographics',
              'chief_complaint',
              'history_of_present_illness',
              'medications',
              'allergies',
              'vital_signs',
              'physical_examination',
              'assessment_and_plan',
            ],
            required_sections: ['chief_complaint', 'assessment_and_plan'],
          },
          {
            name: 'discharge_summary',
            description: 'Hospital discharge summary template',
            document_type: 'discharge_summary',
            fields: [
              'patient_demographics',
              'admission_diagnosis',
              'discharge_diagnosis',
              'procedures',
              'medications',
              'follow_up_instructions',
            ],
            required_sections: ['admission_diagnosis', 'discharge_diagnosis', 'medications'],
          },
          {
            name: 'operative_report',
            description: 'Surgical operative report template',
            document_type: 'operative_report',
            fields: [
              'patient_demographics',
              'procedure',
              'surgeon',
              'anesthesia',
              'findings',
              'complications',
              'postoperative_plan',
            ],
            required_sections: ['procedure', 'findings'],
          },
          {
            name: 'lab_report',
            description: 'Laboratory test report template',
            document_type: 'lab_report',
            fields: [
              'patient_demographics',
              'test_results',
              'reference_ranges',
              'abnormal_values',
              'interpretation',
            ],
            required_sections: ['test_results'],
          },
          {
            name: 'radiology_report',
            description: 'Radiology imaging report template',
            document_type: 'radiology_report',
            fields: [
              'patient_demographics',
              'examination_type',
              'technique',
              'findings',
              'impression',
              'recommendations',
            ],
            required_sections: ['findings', 'impression'],
          },
        ],
      };
    }
  );

  // Get extraction statistics
  fastify.get(
    '/structured-extraction/stats',
    {
      schema: {
        tags: ['Structured Data Extraction'],
        description: 'Get structured data extraction statistics and metrics',
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
              total_extractions: { type: 'number' },
              average_entities_extracted: { type: 'number' },
              average_data_completeness: { type: 'number' },
              average_processing_time: { type: 'number' },
              most_common_entities: { type: 'object' },
              extraction_success_rate: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { timeframe?: string } }>) => {
      const { timeframe = 'day' } = request.query;
      const databaseService = fastify.databaseService;

      if (!databaseService || !databaseService.getStructuredExtractionStats) {
        return {
          timeframe,
          total_extractions: 0,
          average_entities_extracted: 0,
          average_data_completeness: 0,
          average_processing_time: 0,
          most_common_entities: {},
          extraction_success_rate: 0,
        };
      }

      try {
        const stats = await databaseService.getStructuredExtractionStats(timeframe);
        return {
          timeframe,
          ...stats,
        };
      } catch (error) {
        fastify.log.error('Failed to get structured extraction stats: ' + String(error));
        return {
          timeframe,
          total_extractions: 0,
          average_entities_extracted: 0,
          average_data_completeness: 0,
          average_processing_time: 0,
          most_common_entities: {},
          extraction_success_rate: 0,
        };
      }
    }
  );
}
