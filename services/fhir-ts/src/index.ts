/**
 * FHIR R4 Gateway Service - Main Entry Point
 * Healthcare Interoperability Service with FHIR R4 Standards
 */

import Fastify, { FastifyInstance, type FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index';
import { logger } from './utils/logger';
import { setupRoutes } from './routes/index';
import { FHIRValidationService } from './services/validation.service';
import { ResourceService } from './services/resource.service';
import { MonitoringService } from './services/monitoring.service';
import { DatabaseService } from './services/database.service';

// Global services
let fhirValidationService: FHIRValidationService;
let resourceService: ResourceService;
let monitoringService: MonitoringService;
let databaseService: DatabaseService;

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Security middleware
  await fastify.register(
    helmet as unknown as FastifyPluginAsync,
    {
      contentSecurityPolicy: false,
    } as any
  );

  // CORS configuration
  await fastify.register(
    cors as unknown as FastifyPluginAsync,
    {
      origin: config.allowedOrigins,
      credentials: true,
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

  // Initialize services
  databaseService = new DatabaseService();
  await databaseService.connect();

  fhirValidationService = new FHIRValidationService();
  resourceService = new ResourceService(databaseService);
  monitoringService = new MonitoringService();

  // Decorate fastify instance so routes access services via `fastify.<service>`
  fastify.decorate('fhirValidationService', fhirValidationService);
  fastify.decorate('resourceService', resourceService);
  fastify.decorate('monitoringService', monitoringService);
  fastify.decorate('databaseService', databaseService);

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const healthStatus = await monitoringService.getHealthStatus();

    if (healthStatus.status === 'healthy') {
      return reply.send(healthStatus);
    } else {
      return reply.status(503).send(healthStatus);
    }
  });

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    const metrics = await monitoringService.getMetrics();
    return reply.type('text/plain').send(metrics);
  });

  // Setup FHIR API routes
  await setupRoutes(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    logger.info('Shutting down FHIR Gateway service...');
    await databaseService.close();
    await monitoringService.shutdown();
    logger.info('FHIR Gateway service shutdown complete');
  });

  return fastify;
}

// Application startup
async function start() {
  try {
    logger.info('Starting FHIR R4 Gateway Service (TypeScript)');

    const app = await createApp();

    await app.listen({
      host: config.host,
      port: config.port,
    });

    logger.info(`FHIR Gateway service running on ${config.host}:${config.port}`);
    logger.info('FHIR R4 endpoints available at /fhir/R4/*');
  } catch (error) {
    logger.error('Failed to start FHIR Gateway service: ' + String(error));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the application
if (require.main === module) {
  start();
}

export { fhirValidationService, resourceService, monitoringService, databaseService };
