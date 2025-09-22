/**
 * Main routes setup for Data Warehouse Service
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  logger.info('Setting up data warehouse routes...');

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'data-warehouse',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  });

  // Status endpoint
  fastify.get('/status', async () => {
    return {
      services: {
        database: true, // Mock - would check actual service
        cache: true, // Mock - would check actual service
        scheduler: true, // Mock - would check actual service
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  });

  logger.info('Data warehouse routes configured');
}
