/**
 * Patient Routes - Patient monitoring endpoints
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

export async function patientRoutes(fastify: FastifyInstance): Promise<void> {
  // Get patient metrics
  fastify.get('/metrics', async (request, reply) => {
    try {
      const patientMonitor = fastify.patientMonitor;
      const metrics = patientMonitor ? await patientMonitor.getPatientMetrics() : {};
      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Failed to get patient metrics', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get patient metrics' });
    }
  });

  // Get patient vital signs
  fastify.get('/:patientId/vitals', async (request, reply) => {
    try {
      const { patientId } = request.params as { patientId: string };
      const { limit } = request.query as { limit?: string };
      const patientMonitor = fastify.patientMonitor;

      const vitals = patientMonitor
        ? await patientMonitor.getPatientVitals(patientId, limit ? parseInt(limit) : undefined)
        : [];

      return { success: true, data: vitals };
    } catch (error) {
      logger.error('Failed to get patient vitals', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get patient vitals' });
    }
  });

  // Record patient vital signs
  fastify.post('/:patientId/vitals', async (request, reply) => {
    try {
      const { patientId } = request.params as { patientId: string };
      const body = request.body as Record<string, any> | undefined;
      const vitalSigns = {
        patientId,
        timestamp: new Date(),
        ...(body || {}),
      };

      const patientMonitor = fastify.patientMonitor;
      await patientMonitor?.recordVitalSigns?.(vitalSigns);

      return { success: true, message: 'Vital signs recorded successfully' };
    } catch (error) {
      logger.error('Failed to record vital signs', { error });
      return reply.status(500).send({ success: false, error: 'Failed to record vital signs' });
    }
  });

  // Get patient alerts
  fastify.get('/:patientId/alerts', async (request, reply) => {
    try {
      const { patientId } = request.params as { patientId: string };
      const { limit } = request.query as { limit?: string };
      const patientMonitor = fastify.patientMonitor;

      const alerts = patientMonitor
        ? await patientMonitor.getPatientAlerts(patientId, limit ? parseInt(limit) : undefined)
        : [];

      return { success: true, data: alerts };
    } catch (error) {
      logger.error('Failed to get patient alerts', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get patient alerts' });
    }
  });

  // Simulate patient data (for testing)
  fastify.post('/simulate', async (request, reply) => {
    try {
      const patientMonitor = fastify.patientMonitor;
      await patientMonitor?.simulatePatientData?.();
      return { success: true, message: 'Patient data simulation completed' };
    } catch (error) {
      logger.error('Failed to simulate patient data', { error });
      return reply.status(500).send({ success: false, error: 'Failed to simulate patient data' });
    }
  });
}

export default patientRoutes;
