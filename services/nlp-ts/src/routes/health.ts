import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Advanced health check with detailed service status
  fastify.get(
    '/health/detailed',
    {
      schema: {
        tags: ['Health'],
        description: 'Detailed health check with service status',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency: { type: 'number' },
                      connections: { type: 'number' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      latency: { type: 'number' },
                      memory: { type: 'string' },
                    },
                  },
                  nlp_models: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      loaded_models: { type: 'array', items: { type: 'string' } },
                      model_memory: { type: 'string' },
                    },
                  },
                  processors: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      active_processes: { type: 'number' },
                      queue_size: { type: 'number' },
                    },
                  },
                },
              },
              performance: {
                type: 'object',
                properties: {
                  memory_usage: { type: 'string' },
                  cpu_usage: { type: 'number' },
                  requests_per_minute: { type: 'number' },
                  average_response_time: { type: 'number' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const monitoringService = fastify.monitoringService;
        const databaseService = fastify.databaseService;

        if (!monitoringService || !databaseService) {
          reply.code(503);
          return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Services not initialized',
          };
        }

        const healthDetails = (await monitoringService?.getDetailedHealthStatus?.()) ?? {};
        const performanceMetrics = (await monitoringService?.getPerformanceMetrics?.()) ?? {};

        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0',
          services: healthDetails,
          performance: performanceMetrics,
        };
      } catch (error: any) {
        reply.code(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
        };
      }
    }
  );

  // Liveness probe (basic health check)
  fastify.get(
    '/health/live',
    {
      schema: {
        tags: ['Health'],
        description: 'Liveness probe for container orchestration',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => {
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };
    }
  );

  // Readiness probe (services ready check)
  fastify.get(
    '/health/ready',
    {
      schema: {
        tags: ['Health'],
        description: 'Readiness probe for container orchestration',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              services_ready: { type: 'boolean' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              services_ready: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clinicalProcessor = fastify.clinicalProcessor;
        const documentClassifier = fastify.documentClassifier;
        const entityExtractor = fastify.entityExtractor;
        const clinicalSummarizer = fastify.clinicalSummarizer;
        const structuredExtractor = fastify.structuredDataExtractor;
        const databaseService = fastify.databaseService;
        const monitoringService = fastify.monitoringService;

        const servicesReady =
          clinicalProcessor?.isInitialized &&
          documentClassifier?.isInitialized &&
          entityExtractor?.isInitialized &&
          clinicalSummarizer?.isInitialized &&
          structuredExtractor?.isInitialized &&
          databaseService?.isConnected &&
          monitoringService
            ? monitoringService.isHealthy?.()
            : false;

        if (!servicesReady) {
          reply.code(503);
          return {
            status: 'not ready',
            timestamp: new Date().toISOString(),
            services_ready: false,
            error: 'Some services are not ready',
          };
        }

        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          services_ready: true,
        };
      } catch (error: any) {
        reply.code(503);
        return {
          status: 'not ready',
          timestamp: new Date().toISOString(),
          services_ready: false,
          error: error.message,
        };
      }
    }
  );

  // Metrics endpoint for monitoring systems
  fastify.get(
    '/health/metrics',
    {
      schema: {
        tags: ['Health'],
        description: 'Prometheus-style metrics endpoint',
        response: {
          200: {
            type: 'string',
            description: 'Prometheus metrics format',
          },
        },
      },
    },
    async () => {
      const monitoringService = fastify.monitoringService;

      if (!monitoringService || !monitoringService.getPrometheusMetrics) {
        return '# Monitoring service not available\n';
      }

      return await monitoringService.getPrometheusMetrics();
    }
  );
}
