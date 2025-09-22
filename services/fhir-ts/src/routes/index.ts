/**
 * FHIR Routes Setup
 * Main routing configuration for FHIR R4 endpoints
 */

import type { FastifyInstance } from 'fastify';
import { patientRoutes } from './patient.routes.js';

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  // FHIR R4 base path
  await fastify.register(
    async function (fastify) {
      // Middleware for all FHIR routes
      fastify.addHook('preHandler', async (request, reply) => {
        const startTime = Date.now();
        request.startTime = startTime;

        // Add FHIR headers
        reply.header('Content-Type', 'application/fhir+json');
        reply.header('X-FHIR-Version', 'R4');
      });

      // Post-processing hook
      fastify.addHook('onSend', async (request, reply, payload) => {
        const duration = Date.now() - (request.startTime || Date.now());
        const success = reply.statusCode < 400;

        fastify.monitoringService?.recordRequest?.(duration, success);

        return payload;
      });

      // Resource-specific routes
      await fastify.register(patientRoutes, { prefix: '/Patient' });

      // Basic metadata endpoint
      fastify.get('/metadata', async (request, reply) => {
        return {
          resourceType: 'CapabilityStatement',
          id: 'nexus-fhir-gateway',
          name: 'Nexus FHIR Gateway',
          title: 'Nexus FHIR R4 Gateway',
          status: 'active',
          date: new Date().toISOString(),
          publisher: 'Nexus Saúde',
          fhirVersion: '4.0.1',
          format: ['application/fhir+json'],
          rest: [
            {
              mode: 'server',
              resource: [
                {
                  type: 'Patient',
                  interaction: [
                    { code: 'create' },
                    { code: 'read' },
                    { code: 'update' },
                    { code: 'delete' },
                    { code: 'search-type' },
                  ],
                },
              ],
            },
          ],
        };
      });
    },
    { prefix: '/fhir/R4' }
  );

  // Generic error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    const operationOutcome = {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'processing',
          details: {
            text: error.message || 'An error occurred processing the request',
          },
        },
      ],
    };

    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send(operationOutcome);
  });
}

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
