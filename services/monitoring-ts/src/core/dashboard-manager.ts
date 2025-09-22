/**
 * Dashboard Manager - Manages real-time monitoring dashboard data and WebSocket connections
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface DashboardData {
  timestamp: Date;
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
  patientMetrics: {
    totalPatients: number;
    activePatients: number;
    criticalPatients: number;
    recentAlerts: number;
  };
  serviceStatus: {
    [serviceName: string]: {
      status: 'running' | 'stopped' | 'error';
      responseTime?: number;
    };
  };
  alerts: {
    total: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'alert' | 'status' | 'table';
  title: string;
  data: any;
  config?: any;
  refreshInterval?: number;
}

export class DashboardManager {
  private dashboardData: DashboardData | null = null;
  private widgets: Map<string, DashboardWidget> = new Map();
  private updateInterval?: NodeJS.Timeout;

  constructor() {
    logger.info('Initializing Dashboard Manager');
    this.initializeDefaultWidgets();
  }

  async start(): Promise<void> {
    logger.info('Starting dashboard manager...');

    // Start periodic dashboard data updates
    this.updateInterval = setInterval(
      () => this.updateDashboardData(),
      config.monitoring.intervals.metrics
    );

    // Initial update
    await this.updateDashboardData();

    logger.info('Dashboard manager started');
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    logger.info('Dashboard manager stopped');
  }

  async updateDashboardData(): Promise<void> {
    try {
      // In a real implementation, this would gather data from various services
      const dashboardData: DashboardData = {
        timestamp: new Date(),
        systemMetrics: await this.getSystemMetrics(),
        patientMetrics: await this.getPatientMetrics(),
        serviceStatus: await this.getServiceStatus(),
        alerts: await this.getAlertSummary(),
      };

      this.dashboardData = dashboardData;

      // Update widgets with new data
      await this.updateWidgets();

      logger.debug('Dashboard data updated');
    } catch (error) {
      logger.error('Failed to update dashboard data', { error });
    }
  }

  getDashboardData(): DashboardData | null {
    return this.dashboardData;
  }

  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    logger.info(`Dashboard widget added: ${widget.title}`, { widgetId: widget.id });
  }

  removeWidget(widgetId: string): boolean {
    const removed = this.widgets.delete(widgetId);
    if (removed) {
      logger.info(`Dashboard widget removed: ${widgetId}`);
    }
    return removed;
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      return false;
    }

    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(widgetId, updatedWidget);

    logger.debug(`Dashboard widget updated: ${widgetId}`);
    return true;
  }

  async getDashboardConfig(): Promise<{
    layout: any[];
    widgets: DashboardWidget[];
    settings: any;
  }> {
    return {
      layout: this.getDefaultLayout(),
      widgets: this.getAllWidgets(),
      settings: {
        refreshInterval: config.monitoring.intervals.metrics,
        theme: 'light',
        timezone: 'America/Sao_Paulo',
      },
    };
  }

  private async getSystemMetrics(): Promise<DashboardData['systemMetrics']> {
    // Mock implementation - in production, get from SystemMonitor
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      uptime: Math.floor(Date.now() / 1000),
    };
  }

  private async getPatientMetrics(): Promise<DashboardData['patientMetrics']> {
    // Mock implementation - in production, get from PatientMonitor
    return {
      totalPatients: 150,
      activePatients: 89,
      criticalPatients: 3,
      recentAlerts: 7,
    };
  }

  private async getServiceStatus(): Promise<DashboardData['serviceStatus']> {
    // Mock implementation - in production, get from SystemMonitor
    return {
      'fhir-service': { status: 'running', responseTime: 120 },
      'ai-service': { status: 'running', responseTime: 340 },
      'ml-service': { status: 'running', responseTime: 890 },
      'nlp-service': { status: 'running', responseTime: 210 },
      'monitoring-service': { status: 'running', responseTime: 45 },
    };
  }

  private async getAlertSummary(): Promise<DashboardData['alerts']> {
    // Mock implementation - in production, get from AlertEngine
    return {
      total: 12,
      bySeverity: {
        low: 5,
        medium: 4,
        high: 2,
        critical: 1,
      },
    };
  }

  private async updateWidgets(): Promise<void> {
    if (!this.dashboardData) {
      return;
    }

    // Update system metrics widget
    this.updateWidget('system-metrics', {
      data: {
        cpu: this.dashboardData.systemMetrics.cpu,
        memory: this.dashboardData.systemMetrics.memory,
        disk: this.dashboardData.systemMetrics.disk,
        timestamp: this.dashboardData.timestamp,
      },
    });

    // Update patient metrics widget
    this.updateWidget('patient-overview', {
      data: this.dashboardData.patientMetrics,
    });

    // Update service status widget
    this.updateWidget('service-status', {
      data: this.dashboardData.serviceStatus,
    });

    // Update alerts widget
    this.updateWidget('alerts-summary', {
      data: this.dashboardData.alerts,
    });
  }

  private initializeDefaultWidgets(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'system-metrics',
        type: 'chart',
        title: 'System Resources',
        data: null,
        config: {
          chartType: 'line',
          metrics: ['cpu', 'memory', 'disk'],
          timeRange: '1h',
        },
        refreshInterval: 15000,
      },
      {
        id: 'patient-overview',
        type: 'metric',
        title: 'Patient Overview',
        data: null,
        config: {
          displayMode: 'cards',
          metrics: ['total', 'active', 'critical'],
        },
      },
      {
        id: 'service-status',
        type: 'status',
        title: 'Service Status',
        data: null,
        config: {
          showResponseTimes: true,
          alertOnFailure: true,
        },
      },
      {
        id: 'alerts-summary',
        type: 'alert',
        title: 'Active Alerts',
        data: null,
        config: {
          maxAlerts: 10,
          groupBySeverity: true,
        },
      },
      {
        id: 'recent-vitals',
        type: 'table',
        title: 'Recent Vital Signs',
        data: null,
        config: {
          maxRows: 15,
          autoRefresh: true,
        },
      },
      {
        id: 'performance-metrics',
        type: 'chart',
        title: 'API Performance',
        data: null,
        config: {
          chartType: 'bar',
          metrics: ['responseTime', 'requestCount', 'errorRate'],
          timeRange: '24h',
        },
      },
    ];

    defaultWidgets.forEach((widget) => this.addWidget(widget));
  }

  private getDefaultLayout(): any[] {
    return [
      {
        id: 'system-metrics',
        x: 0,
        y: 0,
        w: 6,
        h: 4,
      },
      {
        id: 'patient-overview',
        x: 6,
        y: 0,
        w: 6,
        h: 2,
      },
      {
        id: 'service-status',
        x: 6,
        y: 2,
        w: 6,
        h: 2,
      },
      {
        id: 'alerts-summary',
        x: 0,
        y: 4,
        w: 12,
        h: 3,
      },
      {
        id: 'recent-vitals',
        x: 0,
        y: 7,
        w: 8,
        h: 4,
      },
      {
        id: 'performance-metrics',
        x: 8,
        y: 7,
        w: 4,
        h: 4,
      },
    ];
  }

  // Export dashboard data for external use
  async exportDashboardData(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (!this.dashboardData) {
      throw new Error('No dashboard data available');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.dashboardData, null, 2);

      case 'csv':
        // Simple CSV export implementation
        const csvRows = [
          'timestamp,metric,value',
          `${this.dashboardData.timestamp.toISOString()},cpu,${this.dashboardData.systemMetrics.cpu}`,
          `${this.dashboardData.timestamp.toISOString()},memory,${this.dashboardData.systemMetrics.memory}`,
          `${this.dashboardData.timestamp.toISOString()},disk,${this.dashboardData.systemMetrics.disk}`,
          `${this.dashboardData.timestamp.toISOString()},total_patients,${this.dashboardData.patientMetrics.totalPatients}`,
          `${this.dashboardData.timestamp.toISOString()},active_patients,${this.dashboardData.patientMetrics.activePatients}`,
          `${this.dashboardData.timestamp.toISOString()},critical_patients,${this.dashboardData.patientMetrics.criticalPatients}`,
        ];
        return csvRows.join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  getStats(): {
    totalWidgets: number;
    lastUpdate?: Date;
    isRunning: boolean;
  } {
    return {
      totalWidgets: this.widgets.size,
      lastUpdate: this.dashboardData?.timestamp,
      isRunning: !!this.updateInterval,
    };
  }
}

export default DashboardManager;
