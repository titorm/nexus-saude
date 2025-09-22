import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    etlPipeline?: any;
    analyticsEngine?: any;
    reportGenerator?: any;
    dataConnector?: any;
    schedulerService?: any;
    cacheService?: any;
    databaseService?: any;
  }

  interface FastifySchema {
    description?: string;
    tags?: string[];
  }
}
