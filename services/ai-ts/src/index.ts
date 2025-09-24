import Fastify from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/index.js';
import { logger, fastifyLogger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { MedicalAssistant } from './core/medical-assistant.js';
import { DatabaseService } from './core/database';
import { MonitoringService } from './core/monitoring';

const fastify = Fastify({
  // Use pre-wrapped fastifyLogger to satisfy types
  logger: fastifyLogger,
  trustProxy: true,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
});

let medicalAssistant: MedicalAssistant;
let databaseService: DatabaseService;
let monitoringService: MonitoringService;

// Register plugins
// Some @fastify plugins have type signatures that are incompatible with the
// project's FastifyTypeProvider generic. Cast them to `FastifyPluginAsync`
// when registering so TypeScript accepts the call while keeping runtime
// behavior unchanged.
await fastify.register(
  helmet as unknown as FastifyPluginAsync,
  {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  } as any
);

await fastify.register(
  cors as unknown as FastifyPluginAsync,
  {
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  } as any
);

await fastify.register(
  rateLimit as unknown as FastifyPluginAsync,
  {
    max: 100,
    timeWindow: '1 minute',
    // Provide explicit any types to avoid implicit-any errors in strict TS
    errorResponseBuilder: (req: any, context: any) => ({
      error: 'Rate limit exceeded',
      message: `Only ${context.max} requests allowed.`,
      statusCode: 429,
    }),
  } as any
);

// Swagger documentation
await fastify.register(
  swagger as unknown as FastifyPluginAsync,
  {
    openapi: {
      info: {
        title: 'Nexus Saúde - AI Medical Assistant',
        description: 'Intelligent medical assistant for healthcare professionals',
        version: '1.0.0',
        contact: {
          name: 'Nexus Saúde Team',
          email: 'dev@nexussaude.com',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'AI Assistant', description: 'Medical AI assistant endpoints' },
        { name: 'Diagnosis', description: 'Diagnostic assistance endpoints' },
        { name: 'Treatment', description: 'Treatment recommendation endpoints' },
        { name: 'Conversation', description: 'Conversation management endpoints' },
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
  } as any
);

// Initialize services
async function initializeServices() {
  logger.info('Initializing AI Medical Assistant services...');

  try {
    // Initialize database
    databaseService = new DatabaseService();
    try {
      await databaseService.connect();
    } catch (dbErr) {
      logger.warn('Database connection failed, using dev fallback', String(dbErr));
      const { createDevDatabaseService } = await import('./services/dev-database');
      databaseService = createDevDatabaseService() as unknown as DatabaseService;
    }

    // Initialize monitoring
    monitoringService = new MonitoringService();
    await monitoringService.initialize();

    // Initialize medical assistant
    medicalAssistant = new MedicalAssistant();
    await medicalAssistant.initialize();

    // Make services available globally
    fastify.decorate('medicalAssistant', medicalAssistant);
    fastify.decorate('databaseService', databaseService);
    fastify.decorate('monitoringService', monitoringService);

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Health check endpoint
fastify.get(
  '/health',
  {
    schema: {
      tags: ['Health'],
      description: 'Service health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                ai_models: { type: 'string' },
                knowledge_base: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const healthStatus = (await monitoringService?.getHealthStatus()) || {
      database: 'unknown',
      ai_models: 'unknown',
      knowledge_base: 'unknown',
    };

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: healthStatus,
    };
  }
);

// Ready check endpoint
fastify.get(
  '/ready',
  {
    schema: {
      tags: ['Health'],
      description: 'Service readiness check',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const isReady =
      medicalAssistant?.isInitialized &&
      databaseService?.isConnected &&
      monitoringService?.isHealthy();

    if (!isReady) {
      reply.code(503);
      return {
        ready: false,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
);

// Register application routes
// registerRoutes expects a FastifyInstance; provide typed `fastify` instead of casting
await registerRoutes(fastify);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      requestId: request.id,
      url: request.url,
      method: request.method,
    },
    'Request error'
  );

  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV !== 'production';

  reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: isDev ? error.message : 'Something went wrong',
    statusCode: error.statusCode || 500,
    requestId: request.id,
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Stop accepting new requests
    await fastify.close();

    // Cleanup services
    if (medicalAssistant) {
      await medicalAssistant.cleanup();
    }

    if (databaseService) {
      await databaseService.disconnect();
    }

    if (monitoringService) {
      await monitoringService.cleanup();
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    {
      reason,
      promise,
    },
    'Unhandled promise rejection'
  );
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(
    {
      error: error.message,
      stack: error.stack,
    },
    'Uncaught exception'
  );
  process.exit(1);
});

// Start server
async function start() {
  try {
    await initializeServices();

    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`🚀 AI Medical Assistant service started on ${config.host}:${config.port}`);
    logger.info(`📚 API Documentation available at http://${config.host}:${config.port}/docs`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
start();

export { fastify };
