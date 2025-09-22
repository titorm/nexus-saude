/**
 * System Monitor - Real-time monitoring of system resources and health
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import { MetricsCollector } from './metrics-collector.js';
import { AlertEngine } from './alert-engine';
import type { Alert } from './alert-engine';
import { config } from '../config/index.js';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  network: {
    inbound: number;
    outbound: number;
  };
  uptime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  checks: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
    services: boolean;
  };
  message: string;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastCheck: Date;
  responseTime?: number;
  errorMessage?: string;
}

export class SystemMonitor {
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastNetworkStats: { [key: string]: number } = {};

  constructor(
    private metricsCollector: MetricsCollector,
    private alertEngine: AlertEngine
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('System monitor is already running');
      return;
    }

    logger.info('Starting system monitor...');
    this.isRunning = true;

    // Start monitoring loop
    this.monitoringInterval = setInterval(
      () => this.performMonitoringCycle(),
      config.monitoring.intervals.system
    );

    // Perform initial monitoring
    await this.performMonitoringCycle();

    logger.info('System monitor started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping system monitor...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('System monitor stopped');
  }

  private async performMonitoringCycle(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();
      await this.metricsCollector.recordSystemMetrics(metrics);
      await this.checkThresholds(metrics);
    } catch (error) {
      logger.error('Error in monitoring cycle', { error });
    }
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memoryInfo = this.getMemoryInfo();
    const diskInfo = await this.getDiskInfo();
    const networkInfo = await this.getNetworkInfo();

    return {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      memory: memoryInfo,
      disk: diskInfo,
      network: networkInfo,
      uptime: os.uptime(),
    };
  }

  private async getCpuUsage(): Promise<number> {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((100 * idle) / total);

    return Math.max(0, Math.min(100, usage));
  }

  private getMemoryInfo(): SystemMetrics['memory'] {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usagePercent = (used / total) * 100;

    return {
      total,
      free,
      used,
      usagePercent,
    };
  }

  private async getDiskInfo(): Promise<SystemMetrics['disk']> {
    try {
      const stats = await fs.statfs('/');
      const total = stats.bavail * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      const usagePercent = (used / total) * 100;

      return {
        total,
        free,
        used,
        usagePercent,
      };
    } catch (error) {
      logger.warn('Could not get disk info', { error });
      return {
        total: 0,
        free: 0,
        used: 0,
        usagePercent: 0,
      };
    }
  }

  private async getNetworkInfo(): Promise<SystemMetrics['network']> {
    // Simplified network monitoring - in production, use a proper library like systeminformation
    return {
      inbound: 0,
      outbound: 0,
    };
  }

  private async checkThresholds(metrics: SystemMetrics): Promise<void> {
    const { thresholds } = config.monitoring;
    const alerts: Array<Omit<Alert, 'id' | 'timestamp' | 'resolved'>> = [];

    // CPU threshold check
    if (metrics.cpu.usage > thresholds.cpu) {
      alerts.push({
        type: 'system',
        severity: metrics.cpu.usage > 95 ? ('critical' as const) : ('high' as const),
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        source: 'system-monitor',
        data: { cpuUsage: metrics.cpu.usage, threshold: thresholds.cpu },
      });
    }

    // Memory threshold check
    if (metrics.memory.usagePercent > thresholds.memory) {
      alerts.push({
        type: 'system',
        severity: metrics.memory.usagePercent > 95 ? ('critical' as const) : ('high' as const),
        message: `High memory usage: ${metrics.memory.usagePercent.toFixed(1)}%`,
        source: 'system-monitor',
        data: { memoryUsage: metrics.memory.usagePercent, threshold: thresholds.memory },
      });
    }

    // Disk threshold check
    if (metrics.disk.usagePercent > thresholds.disk) {
      alerts.push({
        type: 'system',
        severity: metrics.disk.usagePercent > 98 ? ('critical' as const) : ('high' as const),
        message: `High disk usage: ${metrics.disk.usagePercent.toFixed(1)}%`,
        source: 'system-monitor',
        data: { diskUsage: metrics.disk.usagePercent, threshold: thresholds.disk },
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.alertEngine.sendAlert(alert);
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const metrics = await this.collectSystemMetrics();
      const { thresholds } = config.monitoring;

      const checks = {
        cpu: metrics.cpu.usage < thresholds.cpu,
        memory: metrics.memory.usagePercent < thresholds.memory,
        disk: metrics.disk.usagePercent < thresholds.disk,
        services: await this.checkServicesHealth(),
      };

      const failedChecks = Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([check]) => check);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = 'All systems operational';

      if (failedChecks.length > 0) {
        if (
          metrics.cpu.usage > 95 ||
          metrics.memory.usagePercent > 95 ||
          metrics.disk.usagePercent > 98
        ) {
          status = 'critical';
          message = `Critical issues detected: ${failedChecks.join(', ')}`;
        } else {
          status = 'warning';
          message = `Warning: Issues detected in ${failedChecks.join(', ')}`;
        }
      }

      return {
        status,
        timestamp: new Date(),
        checks,
        message,
      };
    } catch (error) {
      logger.error('Error getting health status', { error });
      return {
        status: 'critical',
        timestamp: new Date(),
        checks: {
          cpu: false,
          memory: false,
          disk: false,
          services: false,
        },
        message: 'Health check failed',
      };
    }
  }

  async getSystemStatus(): Promise<{
    uptime: number;
    metrics: SystemMetrics;
    services: ServiceStatus[];
  }> {
    const metrics = await this.collectSystemMetrics();
    const services = await this.getServicesStatus();

    return {
      uptime: os.uptime(),
      metrics,
      services,
    };
  }

  private async checkServicesHealth(): Promise<boolean> {
    try {
      const services = await this.getServicesStatus();
      return services.every((service) => service.status === 'running');
    } catch (error) {
      logger.error('Error checking services health', { error });
      return false;
    }
  }

  private async getServicesStatus(): Promise<ServiceStatus[]> {
    const services = [
      { name: 'fhir-service', url: 'http://localhost:3001/health' },
      { name: 'ai-service', url: 'http://localhost:3002/health' },
      { name: 'ml-service', url: 'http://localhost:3004/health' },
      { name: 'nlp-service', url: 'http://localhost:3005/health' },
    ];

    const serviceStatuses: ServiceStatus[] = [];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const startTime = Date.now();
        const response = await fetch(service.url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const responseTime = Date.now() - startTime;

        serviceStatuses.push({
          name: service.name,
          status: response.ok ? 'running' : 'error',
          lastCheck: new Date(),
          responseTime,
          errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
        });
      } catch (error) {
        serviceStatuses.push({
          name: service.name,
          status: 'error',
          lastCheck: new Date(),
          errorMessage: String(error),
        });
      }
    }

    return serviceStatuses;
  }
}

export default SystemMonitor;
