/**
 * Data Warehouse Service - Main Entry Point
 * ETL pipelines, analytics, and business intelligence for Nexus Saúde
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupRoutes } from './routes/index';
import { ETLPipeline } from './core/etl-pipeline.js';
import { AnalyticsEngine } from './core/analytics-engine.js';
import { ReportGenerator } from './core/report-generator.js';
import { DataConnector } from './core/data-connector.js';
import { SchedulerService } from './services/scheduler.service.js';
import { CacheService } from './services/cache.service.js';
import { DatabaseService } from './services/database.service.js';

// Global services
let etlPipeline: ETLPipeline;
let analyticsEngine: AnalyticsEngine;
let reportGenerator: ReportGenerator;
let dataConnector: DataConnector;
let schedulerService: SchedulerService;
let cacheService: CacheService;
let databaseService: DatabaseService;

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Security middleware
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: config.allowedOrigins,
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Initialize services
  databaseService = new DatabaseService();
  await databaseService.connect();

  cacheService = new CacheService();
  await cacheService.connect();

  dataConnector = new DataConnector();
  etlPipeline = new ETLPipeline(dataConnector, databaseService);
  analyticsEngine = new AnalyticsEngine(databaseService, cacheService);
  reportGenerator = new ReportGenerator(analyticsEngine, databaseService);
  schedulerService = new SchedulerService();

  // Make services available globally for routes (typed in src/types/global.d.ts)
  // Local typed view of the global object for this service
  interface LocalGlobal {
    etlPipeline?: ETLPipeline;
    analyticsEngine?: AnalyticsEngine;
    reportGenerator?: ReportGenerator;
    dataConnector?: DataConnector;
    schedulerService?: SchedulerService;
    cacheService?: CacheService;
    databaseService?: DatabaseService;
  }

  const gw = globalThis as unknown as LocalGlobal;
  gw.etlPipeline = etlPipeline;
  gw.analyticsEngine = analyticsEngine;
  gw.reportGenerator = reportGenerator;
  gw.dataConnector = dataConnector;
  gw.schedulerService = schedulerService;
  gw.cacheService = cacheService;
  gw.databaseService = databaseService;

  // Initialize ETL pipeline
  await etlPipeline.initialize();

  // Start scheduler
  await schedulerService.start();

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: databaseService.isHealthy(),
        cache: cacheService.isHealthy(),
        etl: etlPipeline.isRunning(),
        scheduler: schedulerService.isRunning(),
      },
      version: '1.0.0',
    };

    const allHealthy = Object.values(healthStatus.services).every(Boolean);

    if (allHealthy) {
      return reply.send(healthStatus);
    } else {
      return reply.status(503).send(healthStatus);
    }
  });

  // Data warehouse status endpoint
  fastify.get('/status', async (request, reply) => {
    const status = {
      timestamp: new Date(),
      etl: {
        isRunning: etlPipeline.isRunning(),
        lastRun: await etlPipeline.getLastRunInfo(),
        nextRun: await etlPipeline.getNextRunInfo(),
      },
      analytics: {
        cacheSize: await analyticsEngine.getCacheSize(),
        lastAnalysis: await analyticsEngine.getLastAnalysisInfo(),
      },
      reports: {
        generated: await reportGenerator.getGeneratedReportsCount(),
        scheduled: await reportGenerator.getScheduledReportsCount(),
      },
      storage: {
        totalRecords: await databaseService.getTotalRecords(),
        storageSize: await databaseService.getStorageSize(),
      },
    };

    return reply.send(status);
  });

  // Setup data warehouse API routes
  await setupRoutes(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    logger.info('Shutting down data warehouse service...');
    await schedulerService.stop();
    await etlPipeline.stop();
    await cacheService.close();
    await databaseService.close();
    logger.info('Data warehouse service shutdown complete');
  });

  return fastify;
}

// Application startup
async function start() {
  try {
    logger.info('Starting Data Warehouse Service (TypeScript)');

    const app = await createApp();

    await app.listen({
      host: config.host,
      port: config.port,
    });

    logger.info(`Data warehouse service running on ${config.host}:${config.port}`);
    logger.info('ETL pipelines and analytics engine initialized');
    logger.info('Business intelligence dashboard available at /dashboard');
  } catch (error) {
    logger.error('Failed to start data warehouse service: ' + String(error));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the application (support CommonJS and ESM execution)
{
  let isMain = false;
  try {
    // @ts-ignore
    isMain = require.main === module;
  } catch {
    isMain = !!(process.argv[1] && process.argv[1].endsWith('src/index.ts'));
  }

  if (isMain) start();
}

export {
  etlPipeline,
  analyticsEngine,
  reportGenerator,
  dataConnector,
  schedulerService,
  cacheService,
  databaseService,
};
