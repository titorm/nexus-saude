import pino from 'pino';
import { config } from '../config/index.js';

// Create logger instance
export const logger = pino({
  level: config.logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      const { req, res, err, ...rest } = object;
      return rest;
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  transport:
    config.nodeEnv === 'development' && config.logFormat === 'pretty'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

// Export a Fastify-compatible logger alias so callers can pass it to Fastify without casting
export const fastifyLogger = logger as unknown as import('fastify').FastifyBaseLogger;

// Error logging utilities
export const logError = (error: Error | unknown, context?: string) => {
  if (error instanceof Error) {
    logger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context,
      },
      `Error${context ? ` in ${context}` : ''}`
    );
  } else {
    logger.error(
      { error: String(error), context },
      `Unknown error${context ? ` in ${context}` : ''}`
    );
  }
};

// Performance logging utilities
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  logger.info(
    {
      operation,
      duration,
      unit: 'ms',
      ...metadata,
    },
    `Performance: ${operation} completed in ${duration}ms`
  );
};

// Medical operation logging
export const logMedicalQuery = (query: string, patientId?: string, confidence?: number) => {
  logger.info(
    {
      type: 'medical_query',
      query_length: query.length,
      patient_id: patientId,
      confidence,
      timestamp: new Date().toISOString(),
    },
    'Medical query processed'
  );
};

// Diagnostic logging
export const logDiagnosticSuggestion = (
  symptoms: string[],
  suggestions: any[],
  confidence: number
) => {
  logger.info(
    {
      type: 'diagnostic_suggestion',
      symptom_count: symptoms.length,
      suggestion_count: suggestions.length,
      confidence,
      timestamp: new Date().toISOString(),
    },
    'Diagnostic suggestions generated'
  );
};

// Treatment logging
export const logTreatmentRecommendation = (
  diagnosis: string,
  treatments: any[],
  severity: string
) => {
  logger.info(
    {
      type: 'treatment_recommendation',
      diagnosis,
      treatment_count: treatments.length,
      severity,
      timestamp: new Date().toISOString(),
    },
    'Treatment recommendations generated'
  );
};

// Conversation logging
export const logConversationInteraction = (
  conversationId: string,
  messageType: 'query' | 'response',
  length: number
) => {
  logger.info(
    {
      type: 'conversation_interaction',
      conversation_id: conversationId,
      message_type: messageType,
      message_length: length,
      timestamp: new Date().toISOString(),
    },
    'Conversation interaction logged'
  );
};

// Knowledge base logging
export const logKnowledgeBaseQuery = (query: string, resultsFound: number, searchTime: number) => {
  logger.info(
    {
      type: 'knowledge_base_query',
      query_length: query.length,
      results_found: resultsFound,
      search_time: searchTime,
      timestamp: new Date().toISOString(),
    },
    'Knowledge base query executed'
  );
};

// Model loading logging
export const logModelLoading = (modelName: string, loadTime: number, success: boolean) => {
  logger.info(
    {
      type: 'model_loading',
      model_name: modelName,
      load_time: loadTime,
      success,
      timestamp: new Date().toISOString(),
    },
    `Model ${modelName} ${success ? 'loaded successfully' : 'failed to load'}`
  );
};

// Security logging
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.warn(
    {
      type: 'security_event',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    },
    `Security event: ${event}`
  );
};

// Rate limit logging
export const logRateLimit = (clientId: string, endpoint: string, attempts: number) => {
  logger.warn(
    {
      type: 'rate_limit',
      client_id: clientId,
      endpoint,
      attempts,
      timestamp: new Date().toISOString(),
    },
    'Rate limit exceeded'
  );
};

export default logger;
