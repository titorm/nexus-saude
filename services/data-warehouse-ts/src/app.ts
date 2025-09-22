/**
 * Data Warehouse Server Application
 * Entry point for the data warehouse microservice
 */

import Fastify from 'fastify';
import { config } from './config';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { CacheService } from './services/cache.service';
import { SchedulerService } from './services/scheduler.service';
import { ETLPipeline } from './core/etl-pipeline';
import { AnalyticsEngine } from './core/analytics-engine';
import { ReportGenerator } from './core/report-generator';

interface ServerServices {
  database: DatabaseService;
  cache: CacheService;
  scheduler: SchedulerService;
  etl: ETLPipeline;
  analytics: AnalyticsEngine;
  reports: ReportGenerator;
}

class DataWarehouseServer {
  private fastify: ReturnType<typeof Fastify>;
  private services: ServerServices;

  constructor() {
    this.fastify = Fastify({
      logger: false, // We use our custom logger
    });

    // Initialize services with dependencies
    const database = new DatabaseService();
    const cache = new CacheService();
    const scheduler = new SchedulerService();

    this.services = {
      database,
      cache,
      scheduler,
      etl: new ETLPipeline(database, cache),
      analytics: new AnalyticsEngine(database, cache),
      reports: new ReportGenerator(database, cache),
    };

    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupRoutes(): void {
    // Health check
    this.fastify.get('/health', async () => {
      return {
        status: 'healthy',
        service: 'data-warehouse',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      };
    });

    // Service status
    this.fastify.get('/status', async () => {
      return {
        services: {
          database: await this.services.database.isHealthy(),
          cache: await this.services.cache.isHealthy(),
          scheduler: this.services.scheduler.isRunning(),
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    });

    // ETL endpoints
    this.fastify.register(
      async (fastify: any) => {
        fastify.get('/etl/status', async () => {
          return {
            running: this.services.etl.isRunning(),
            lastRun: null, // Would be implemented in real ETL
            jobs: this.services.scheduler.getJobs(),
          };
        });

        fastify.post('/etl/run', async () => {
          try {
            await this.services.etl.run();
            return { success: true, message: 'ETL pipeline started' };
          } catch (error) {
            throw new Error(`ETL pipeline failed: ${error}`);
          }
        });
      },
      { prefix: '/api/v1' }
    );

    // Analytics endpoints
    this.fastify.register(
      async (fastify: any) => {
        fastify.get('/analytics/metrics', async () => {
          return this.services.analytics.getMetrics();
        });

        fastify.get('/analytics/reports', async () => {
          return this.services.reports.getAvailableReports();
        });

        fastify.get('/analytics/reports/:reportId', async (request: any) => {
          const { reportId } = request.params;
          const format = request.query?.format || 'json';

          return this.services.reports.generateReport(reportId, format as any);
        });
      },
      { prefix: '/api/v1' }
    );

    // Scheduler endpoints
    this.fastify.register(
      async (fastify: any) => {
        fastify.get('/scheduler/jobs', async () => {
          return this.services.scheduler.getJobs();
        });

        fastify.post('/scheduler/jobs/:jobId/execute', async (request: any) => {
          const { jobId } = request.params;
          await this.services.scheduler.executeJob(jobId);
          return { success: true, message: `Job ${jobId} executed` };
        });

        fastify.post('/scheduler/jobs/:jobId/enable', async (request: any) => {
          const { jobId } = request.params;
          const success = this.services.scheduler.enableJob(jobId);
          return { success, message: success ? 'Job enabled' : 'Job not found' };
        });

        fastify.post('/scheduler/jobs/:jobId/disable', async (request: any) => {
          const { jobId } = request.params;
          const success = this.services.scheduler.disableJob(jobId);
          return { success, message: success ? 'Job disabled' : 'Job not found' };
        });
      },
      { prefix: '/api/v1' }
    );
  }

  private setupErrorHandlers(): void {
    this.fastify.setErrorHandler((error: any, request: any, reply: any) => {
      logger.error('Request error:', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });

      const statusCode = error.statusCode || 500;
      reply.status(statusCode).send({
        error: true,
        message: error.message,
        statusCode,
        timestamp: new Date().toISOString(),
      });
    });

    this.fastify.setNotFoundHandler((request: any, reply: any) => {
      reply.status(404).send({
        error: true,
        message: 'Route not found',
        statusCode: 404,
        path: request.url,
      });
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Data Warehouse Server...');

      // Initialize all services
      await this.services.database.connect();
      await this.services.cache.connect();
      await this.services.scheduler.start();

      // Start the HTTP server
      await this.fastify.listen({
        port: config.server.port,
        host: config.server.host,
      });

      logger.info(`Data Warehouse Server running on ${config.server.host}:${config.server.port}`);
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping Data Warehouse Server...');

      // Stop all services
      await this.services.scheduler.stop();
      await this.services.cache.disconnect();
      await this.services.database.disconnect();

      // Stop the HTTP server
      await this.fastify.close();

      logger.info('Data Warehouse Server stopped');
    } catch (error) {
      logger.error('Error stopping server:', error);
    }
  }
}

// Start the server
const server = new DataWarehouseServer();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', { promise, reason });
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server;
