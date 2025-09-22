import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { entityRoutes } from './entity-extraction.js';
import { classificationRoutes } from './classification.js';
import { summarizationRoutes } from './summarization.js';
import { structuredExtractionRoutes } from './structured-extraction.js';
import { clinicalProcessingRoutes } from './clinical-processing.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(entityRoutes, { prefix: '/api/v1' });
  await fastify.register(classificationRoutes, { prefix: '/api/v1' });
  await fastify.register(summarizationRoutes, { prefix: '/api/v1' });
  await fastify.register(structuredExtractionRoutes, { prefix: '/api/v1' });
  await fastify.register(clinicalProcessingRoutes, { prefix: '/api/v1' });
}