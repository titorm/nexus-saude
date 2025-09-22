/**
 * Alert Routes - Alert management endpoints
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

export async function alertRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all alerts
  fastify.get('/', async (request, reply) => {
    try {
      const alertEngine = globalThis.alertEngine;
      const alerts = alertEngine.getAlerts();
      return { success: true, data: alerts };
    } catch (error) {
      logger.error('Failed to get alerts', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get alerts' });
    }
  });

  // Get alert by ID
  fastify.get('/:alertId', async (request, reply) => {
    try {
      const { alertId } = request.params as { alertId: string };
      const alertEngine = globalThis.alertEngine;
      const alert = alertEngine.getAlert(alertId);

      if (!alert) {
        return reply.status(404).send({ success: false, error: 'Alert not found' });
      }

      return { success: true, data: alert };
    } catch (error) {
      logger.error('Failed to get alert', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get alert' });
    }
  });

  // Resolve alert
  fastify.patch('/:alertId/resolve', async (request, reply) => {
    try {
      const { alertId } = request.params as { alertId: string };
      const { resolvedBy } = request.body as { resolvedBy?: string };
      const alertEngine = globalThis.alertEngine;

      const resolved = await alertEngine.resolveAlert(alertId, resolvedBy);

      if (!resolved) {
        return reply
          .status(404)
          .send({ success: false, error: 'Alert not found or already resolved' });
      }

      return { success: true, message: 'Alert resolved successfully' };
    } catch (error) {
      logger.error('Failed to resolve alert', { error });
      return reply.status(500).send({ success: false, error: 'Failed to resolve alert' });
    }
  });

  // Get alert statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const alertEngine = globalThis.alertEngine;
      const stats = alertEngine.getAlertStats();
      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get alert stats', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get alert stats' });
    }
  });
}

export default alertRoutes;
