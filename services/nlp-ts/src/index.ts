import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { DatabaseService } from './core/database.js';
import { MonitoringService } from './core/monitoring.js';
import { registerRoutes } from './routes/index.js';
import { ClinicalNLPProcessor } from './core/clinical-nlp-processor.js';
import { DocumentClassifier } from './core/document-classifier.js';
import { MedicalEntityExtractor } from './core/medical-entity-extractor.js';
import { ClinicalSummarizer } from './core/clinical-summarizer.js';
import { StructuredDataExtractor } from './core/structured-data-extractor.js';

// Declare global services
declare global {
  var database: DatabaseService;
  var monitoring: MonitoringService;
  var clinicalNLP: ClinicalNLPProcessor;
  var documentClassifier: DocumentClassifier;
  var entityExtractor: MedicalEntityExtractor;
  var summarizer: ClinicalSummarizer;
  var structuredExtractor: StructuredDataExtractor;
}

async function main() {
  const fastify = Fastify({
    logger: {
      level: config.environment === 'development' ? 'debug' : 'info',
      transport:
        config.environment === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            }
          : undefined,
    },
  });

  // Register security plugins
  await fastify.register(
    helmet as unknown as FastifyPluginAsync,
    {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    } as any
  );

  // Register CORS
  await fastify.register(
    cors as unknown as FastifyPluginAsync,
    {
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    } as any
  );

  // Register rate limiting
  await fastify.register(
    rateLimit as unknown as FastifyPluginAsync,
    {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: (req: any, context: any) => ({
        code: 429,
        error: 'Rate limit exceeded',
        message: `Rate limit exceeded, retry in ${context.ttl} seconds`,
        date: Date.now(),
        expiresIn: context.ttl,
      }),
    } as any
  );

  // Register Swagger documentation
  await fastify.register(
    swagger as unknown as FastifyPluginAsync,
    {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'NLP Service API',
          description: 'Clinical Natural Language Processing Service for Medical Text Analysis',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    } as any
  );

  await fastify.register(
    swaggerUi as unknown as FastifyPluginAsync,
    {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      uiHooks: {
        onRequest: function (request: any, reply: any, next: () => void) {
          next();
        },
        preHandler: function (request: any, reply: any, next: () => void) {
          next();
        },
      },
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
      transformSpecification: (swaggerObject: any, request: any, reply: any) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    } as any
  );

  // Initialize services
  logger.info('Initializing services...');

  try {
    // Initialize database
    global.database = new DatabaseService();
    await global.database.connect();
    logger.info('Database service initialized');

    // Initialize monitoring
    global.monitoring = new MonitoringService();
    await global.monitoring.initialize(global.database);
    logger.info('Monitoring service initialized');

    // Initialize NLP services
    global.clinicalNLP = new ClinicalNLPProcessor();
    await global.clinicalNLP.initialize();
    logger.info('Clinical NLP processor initialized');

    global.documentClassifier = new DocumentClassifier();
    await global.documentClassifier.initialize();
    logger.info('Document classifier initialized');

    global.entityExtractor = new MedicalEntityExtractor();
    await global.entityExtractor.initialize();
    logger.info('Medical entity extractor initialized');

    global.summarizer = new ClinicalSummarizer();
    await global.summarizer.initialize();
    logger.info('Clinical summarizer initialized');

    global.structuredExtractor = new StructuredDataExtractor();
    await global.structuredExtractor.initialize();
    logger.info('Structured data extractor initialized');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }

  // Health check endpoint
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                  nlp: { type: 'string' },
                  monitoring: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: (await global.database.testConnection()) ? 'healthy' : 'unhealthy',
          nlp: 'healthy', // Add actual NLP health check if needed
          monitoring: global.monitoring.isHealthy() ? 'healthy' : 'unhealthy',
        },
      };

      const isHealthy = Object.values(healthCheck.services).every((status) => status === 'healthy');

      reply.code(isHealthy ? 200 : 503).send(healthCheck);
    }
  );

  // Register all routes
  await registerRoutes(fastify);

  // Global error handler
  fastify.setErrorHandler((error: any, request: any, reply: any) => {
    logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    const isDev = process.env.NODE_ENV !== 'production';

    reply.code(error.statusCode || 500).send({
      error: 'Internal Server Error',
      message: isDev ? error.message : 'Something went wrong',
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      await fastify.close();
      await global.database?.disconnect();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: any) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason?.stack || reason,
    });
    // Don't exit the process, just log the error
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: any) => {
    logger.error('Uncaught Exception thrown:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Start the server
  try {
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`🚀 NLP Service started on http://${config.host}:${config.port}`);
    logger.info(`📚 API Documentation: http://${config.host}:${config.port}/docs`);
    logger.info(`🔍 Health Check: http://${config.host}:${config.port}/health`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
