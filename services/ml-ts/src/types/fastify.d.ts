import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    mlPipeline?: any;
    monitoringService?: any;
    dbService?: any;
  }

  interface FastifySchema {
    description?: string;
    tags?: string[];
  }
}
