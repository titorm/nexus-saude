/**
 * Medical AI/ML Service - TypeScript/Node.js Implementation
 *
 * Sistema de machine learning para análise preditiva médica.
 * Fornece APIs para predição de diagnósticos, avaliação de riscos
 * e predição de outcomes médicos.
 */

import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { MLPipeline } from './core/pipeline.js';
import { setupRoutes } from './routes/index.js';
import { MonitoringService } from './core/monitoring.js';
import { DatabaseService } from './core/database.js';

// Global services
let mlPipeline: MLPipeline;
let monitoringService: MonitoringService;
let dbService: DatabaseService;

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Security middleware
  await fastify.register(
    helmet as unknown as FastifyPluginAsync,
    {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    } as any
  );

  // CORS
  await fastify.register(
    cors as unknown as FastifyPluginAsync,
    {
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    } as any
  );

  // Rate limiting
  await fastify.register(
    rateLimit as unknown as FastifyPluginAsync,
    {
      max: 100,
      timeWindow: '1 minute',
    } as any
  );

  // Health check route
  fastify.get('/health', async (request, reply) => {
    const health = await monitoringService.getServiceHealth();
    return reply.status(health.status === 'healthy' ? 200 : 503).send(health);
  });

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    const metrics = await monitoringService.getMetrics();
    return reply.type('text/plain').send(metrics);
  });

  // Decorate the Fastify instance so routes can access services as `fastify.mlPipeline`
  fastify.decorate('mlPipeline', mlPipeline);
  fastify.decorate('monitoringService', monitoringService);
  fastify.decorate('dbService', dbService);

  // Setup API routes
  await setupRoutes(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    logger.info('Shutting down ML service...');
    await dbService.close();
    await mlPipeline.cleanup();
    logger.info('ML service shutdown complete');
  });

  return fastify;
}

// Application startup
async function start() {
  try {
    logger.info('Starting Medical AI/ML Service (TypeScript)');

    // Initialize services
    dbService = new DatabaseService(config.database);
    await dbService.connect();

    monitoringService = new MonitoringService();
    await monitoringService.initialize();

    mlPipeline = new MLPipeline(config.ml);
    await mlPipeline.initialize();

    // Create and start the app
    const app = await createApp();

    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`Server running on ${config.server.host}:${config.server.port}`);

    // Start background monitoring
    setInterval(async () => {
      try {
        await monitoringService.updateSystemMetrics();
      } catch (error) {
        logger.error('Error updating system metrics:', error);
      }
    }, 30000); // Every 30 seconds
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  start();
}

export { mlPipeline, monitoringService, dbService };
