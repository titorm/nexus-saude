import type { FastifyInstance } from 'fastify';

type AssistantRequestBody = {
  query: string;
  patientContext?: Record<string, any>;
  conversationId?: string;
};

/**
 * Register all API routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Root API info endpoint
  fastify.get(
    '/api/v1',
    {
      schema: {
        description: 'API information',
        response: {
          200: {
            type: 'object',
            properties: {
              service: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
              endpoints: {
                type: 'object',
                properties: {
                  assistant: { type: 'string' },
                  diagnostic: { type: 'string' },
                  treatment: { type: 'string' },
                  conversation: { type: 'string' },
                  analytics: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async () => {
      return {
        service: 'Nexus Saúde - AI Medical Assistant',
        version: '1.0.0',
        description: 'Intelligent medical assistant for healthcare professionals',
        endpoints: {
          assistant: '/api/v1/assistant',
          diagnostic: '/api/v1/diagnostic',
          treatment: '/api/v1/treatment',
          conversation: '/api/v1/conversation',
          analytics: '/api/v1/analytics',
        },
      };
    }
  );

  // Metrics endpoint
  fastify.get(
    '/metrics',
    {
      schema: {
        description: 'Prometheus metrics',
        response: {
          200: {
            type: 'string',
          },
        },
      },
    },
    async (request, reply) => {
      const monitoringService = fastify.monitoringService;
      reply.type('text/plain');
      return monitoringService.generatePrometheusMetrics();
    }
  );

  // Status endpoint
  fastify.get(
    '/status',
    {
      schema: {
        // Response schema only - metadata like description removed to satisfy
        // Fastify's FastifySchema typing. Keep documentation in external
        // OpenAPI config instead.
      },
    },
    async () => {
      const monitoringService = fastify.monitoringService;
      return await monitoringService.getStatusReport();
    }
  );

  // Basic assistant endpoint
  fastify.post(
    '/api/v1/assistant/query',
    {
      schema: {
        // Validation schema can be added here (body/response). Keep simple for now.
      },
    },
    async (request) => {
      const medicalAssistant = fastify.medicalAssistant!;
      const body = request.body as AssistantRequestBody;

      return await medicalAssistant.processQuery({
        query: body.query,
        patientContext: body.patientContext,
        conversationId: body.conversationId,
      });
    }
  );
}
