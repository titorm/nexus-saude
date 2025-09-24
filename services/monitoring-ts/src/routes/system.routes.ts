/**
 * System Routes - System monitoring and health endpoints
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

export async function systemRoutes(fastify: FastifyInstance): Promise<void> {
  // Get system metrics
  fastify.get('/metrics', async (request, reply) => {
    try {
      const systemMonitor = fastify.systemMonitor;
      const metrics = systemMonitor ? await systemMonitor.collectSystemMetrics() : {};
      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get system metrics' });
    }
  });

  // Get system status
  fastify.get('/status', async (request, reply) => {
    try {
      const systemMonitor = fastify.systemMonitor;
      const status = systemMonitor ? await systemMonitor.getSystemStatus() : {};
      return { success: true, data: status };
    } catch (error) {
      logger.error('Failed to get system status', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get system status' });
    }
  });

  // Get health status
  fastify.get('/health', async (request, reply) => {
    try {
      const systemMonitor = fastify.systemMonitor;
      const health = systemMonitor ? await systemMonitor.getHealthStatus() : { status: 'unknown' };
      return { success: true, data: health };
    } catch (error) {
      logger.error('Failed to get health status', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get health status' });
    }
  });
}

export default systemRoutes;
