/**
 * Main routes setup for Data Warehouse Service
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  logger.info('Setting up data warehouse routes...');

  // Health check
  // Additional API routes for data warehouse can be registered here.
  // Note: health/status endpoints are provided by the main application in src/index.ts

  logger.info('Data warehouse routes configured');
}
