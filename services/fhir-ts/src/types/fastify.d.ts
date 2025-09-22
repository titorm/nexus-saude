import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    fhirValidationService?: any;
    resourceService?: any;
    monitoringService?: any;
    databaseService?: any;
  }

  interface FastifySchema {
    description?: string;
    tags?: string[];
  }
}
