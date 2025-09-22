/**
 * Real-time Monitoring Service - Main Entry Point
 * Comprehensive monitoring for Nexus Saúde healthcare platform
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupRoutes } from './routes/index.js';
import { SystemMonitor } from './core/system-monitor';
import { PatientMonitor } from './core/patient-monitor';
import { AlertEngine } from './core/alert-engine';
import { MetricsCollector } from './core/metrics-collector';
import { DashboardManager } from './core/dashboard-manager';
import { DatabaseService } from './services/database.service';
import { NotificationService } from './services/notification.service';

// Global services
let systemMonitor: SystemMonitor;
let patientMonitor: PatientMonitor;
let alertEngine: AlertEngine;
let metricsCollector: MetricsCollector;
let dashboardManager: DashboardManager;
let databaseService: DatabaseService;
let notificationService: NotificationService;

export async function createApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    // Cast to satisfy Fastify typing in this monorepo
    logger: true as unknown as import('fastify').FastifyBaseLogger,
    trustProxy: true,
  });

  // Security middleware
  // Plugins' type signatures sometimes differ; cast to any to avoid strict incompatibility
  await fastify.register(
    helmet as any,
    {
      contentSecurityPolicy: false,
    } as any
  );

  // CORS configuration
  await fastify.register(
    cors as any,
    {
      origin: config.allowedOrigins,
      credentials: true,
    } as any
  );

  // Rate limiting
  await fastify.register(
    rateLimit as any,
    {
      max: 200,
      timeWindow: '1 minute',
    } as any
  );

  // WebSocket support for real-time monitoring
  await fastify.register(websocket as any);

  // Initialize services
  databaseService = new DatabaseService();
  await databaseService.connect();

  notificationService = new NotificationService();
  metricsCollector = new MetricsCollector();
  alertEngine = new AlertEngine(notificationService);
  systemMonitor = new SystemMonitor(metricsCollector, alertEngine);
  patientMonitor = new PatientMonitor(databaseService, alertEngine);
  dashboardManager = new DashboardManager();

  // Make services available globally for routes (typed via src/types/global.d.ts)
  globalThis.systemMonitor = systemMonitor;
  globalThis.patientMonitor = patientMonitor;
  globalThis.alertEngine = alertEngine;
  globalThis.metricsCollector = metricsCollector;
  globalThis.dashboardManager = dashboardManager;
  globalThis.databaseService = databaseService;
  globalThis.notificationService = notificationService;

  // Start monitoring services
  await systemMonitor.start();
  await patientMonitor.start();
  await alertEngine.start();

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    const healthStatus = await systemMonitor.getHealthStatus();

    if (healthStatus.status === 'healthy') {
      return reply.send(healthStatus);
    } else {
      return reply.status(503).send(healthStatus);
    }
  });

  // Metrics endpoint (Prometheus format)
  fastify.get('/metrics', async (request, reply) => {
    const metrics = await metricsCollector.getPrometheusMetrics();
    return reply.type('text/plain').send(metrics);
  });

  // System status endpoint
  fastify.get('/status', async (request, reply) => {
    const status = await systemMonitor.getSystemStatus();
    return reply.send(status);
  });

  // Setup monitoring API routes
  await setupRoutes(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    logger.info('Shutting down monitoring service...');
    await systemMonitor.stop();
    await patientMonitor.stop();
    await alertEngine.stop();
    await databaseService.close();
    logger.info('Monitoring service shutdown complete');
  });

  return fastify;
}

// Application startup
async function start() {
  try {
    logger.info('Starting Real-time Monitoring Service (TypeScript)');

    const app = await createApp();

    await app.listen({
      host: config.host,
      port: config.port,
    });

    logger.info(`Monitoring service running on ${config.host}:${config.port}`);
    logger.info('Real-time monitoring dashboard available at /dashboard');
    logger.info('WebSocket endpoint available at /ws');
  } catch (error) {
    logger.error('Failed to start monitoring service: ' + String(error));
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

// Start the application (support both CommonJS and ESM execution environments)
{
  let isMain = false;
  try {
    // CommonJS: require may be defined
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    isMain = require.main === module;
  } catch {
    // ESM (tsx/node --loader): fallback to checking argv for direct invocation
    isMain = !!(process.argv[1] && process.argv[1].endsWith('src/index.ts'));
  }

  if (isMain) {
    start();
  }
}

export {
  systemMonitor,
  patientMonitor,
  alertEngine,
  metricsCollector,
  dashboardManager,
  databaseService,
  notificationService,
};
