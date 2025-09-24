/**
 * Dashboard Routes - Real-time dashboard endpoints
 */

import type { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // Get dashboard data
  fastify.get('/data', async (request, reply) => {
    try {
      const dashboardManager = fastify.dashboardManager;
      if (!dashboardManager || !dashboardManager.getDashboardData) {
        return reply.status(503).send({ success: false, error: 'Dashboard manager unavailable' });
      }
      const data = dashboardManager.getDashboardData();
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to get dashboard data', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get dashboard data' });
    }
  });

  // Get dashboard configuration
  fastify.get('/config', async (request, reply) => {
    try {
      const dashboardManager = fastify.dashboardManager;
      if (!dashboardManager || !dashboardManager.getDashboardConfig) {
        return reply.status(503).send({ success: false, error: 'Dashboard manager unavailable' });
      }
      const config = await dashboardManager.getDashboardConfig();
      return { success: true, data: config };
    } catch (error) {
      logger.error('Failed to get dashboard config', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get dashboard config' });
    }
  });

  // Get all widgets
  fastify.get('/widgets', async (request, reply) => {
    try {
      const dashboardManager = fastify.dashboardManager;
      if (!dashboardManager || !dashboardManager.getAllWidgets) {
        return reply.status(503).send({ success: false, error: 'Dashboard manager unavailable' });
      }
      const widgets = dashboardManager.getAllWidgets();
      return { success: true, data: widgets };
    } catch (error) {
      logger.error('Failed to get widgets', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get widgets' });
    }
  });

  // Get specific widget
  fastify.get('/widgets/:widgetId', async (request, reply) => {
    try {
      const { widgetId } = request.params as { widgetId: string };
      const dashboardManager = fastify.dashboardManager;
      if (!dashboardManager || !dashboardManager.getWidget) {
        return reply.status(503).send({ success: false, error: 'Dashboard manager unavailable' });
      }
      const widget = dashboardManager.getWidget(widgetId);

      if (!widget) {
        return reply.status(404).send({ success: false, error: 'Widget not found' });
      }

      return { success: true, data: widget };
    } catch (error) {
      logger.error('Failed to get widget', { error });
      return reply.status(500).send({ success: false, error: 'Failed to get widget' });
    }
  });

  // Export dashboard data
  fastify.get('/export', async (request, reply) => {
    try {
      const { format = 'json' } = request.query as { format?: 'json' | 'csv' };
      const dashboardManager = fastify.dashboardManager;
      if (!dashboardManager || !dashboardManager.exportDashboardData) {
        return reply.status(503).send({ success: false, error: 'Dashboard manager unavailable' });
      }
      const exportData = await dashboardManager.exportDashboardData(format);

      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.${format}`;

      return reply
        .type(contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(exportData);
    } catch (error) {
      logger.error('Failed to export dashboard data', { error });
      return reply.status(500).send({ success: false, error: 'Failed to export dashboard data' });
    }
  });
}

export default dashboardRoutes;
