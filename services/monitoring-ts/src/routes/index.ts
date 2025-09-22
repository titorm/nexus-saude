/**
 * API Routes for Monitoring Service
 */

import { type FastifyInstance } from 'fastify';
import { systemRoutes } from './system.routes.js';
import { alertRoutes } from './alert.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { patientRoutes } from './patient.routes.js';
import { websocketRoutes } from './websocket.routes.js';

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  // Register route modules
  await fastify.register(systemRoutes, { prefix: '/api/system' });
  await fastify.register(alertRoutes, { prefix: '/api/alerts' });
  await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(patientRoutes, { prefix: '/api/patients' });
  await fastify.register(websocketRoutes, { prefix: '/ws' });

  // API documentation endpoint
  fastify.get('/api', async (request, reply) => {
    return {
      service: 'Nexus Saúde Monitoring Service',
      version: '1.0.0',
      description: 'Real-time monitoring and alerting for healthcare platform',
      endpoints: {
        system: '/api/system',
        alerts: '/api/alerts',
        dashboard: '/api/dashboard',
        patients: '/api/patients',
        websocket: '/ws',
        health: '/health',
        metrics: '/metrics',
        status: '/status',
      },
      documentation: 'https://docs.nexus-saude.com/monitoring',
    };
  });
}

export default setupRoutes;
