/**
 * Metrics Collector - Collects and stores system metrics
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { SystemMetrics } from './system-monitor.js';

export interface MetricPoint {
  timestamp: Date;
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface PrometheusMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export class MetricsCollector {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private maxDataPoints = 10000;

  constructor() {
    logger.info('Initializing Metrics Collector');
  }

  async recordSystemMetrics(systemMetrics: SystemMetrics): Promise<void> {
    const timestamp = systemMetrics.timestamp;

    // Record CPU metrics
    this.recordMetric('system_cpu_usage_percent', systemMetrics.cpu.usage, timestamp);
    this.recordMetric('system_cpu_cores', systemMetrics.cpu.cores, timestamp);
    this.recordMetric('system_load_average_1m', systemMetrics.cpu.loadAverage[0], timestamp);
    this.recordMetric('system_load_average_5m', systemMetrics.cpu.loadAverage[1], timestamp);
    this.recordMetric('system_load_average_15m', systemMetrics.cpu.loadAverage[2], timestamp);

    // Record memory metrics
    this.recordMetric('system_memory_total_bytes', systemMetrics.memory.total, timestamp);
    this.recordMetric('system_memory_free_bytes', systemMetrics.memory.free, timestamp);
    this.recordMetric('system_memory_used_bytes', systemMetrics.memory.used, timestamp);
    this.recordMetric('system_memory_usage_percent', systemMetrics.memory.usagePercent, timestamp);

    // Record disk metrics
    this.recordMetric('system_disk_total_bytes', systemMetrics.disk.total, timestamp);
    this.recordMetric('system_disk_free_bytes', systemMetrics.disk.free, timestamp);
    this.recordMetric('system_disk_used_bytes', systemMetrics.disk.used, timestamp);
    this.recordMetric('system_disk_usage_percent', systemMetrics.disk.usagePercent, timestamp);

    // Record network metrics
    this.recordMetric('system_network_inbound_bytes', systemMetrics.network.inbound, timestamp);
    this.recordMetric('system_network_outbound_bytes', systemMetrics.network.outbound, timestamp);

    // Record uptime
    this.recordMetric('system_uptime_seconds', systemMetrics.uptime, timestamp);

    logger.debug('System metrics recorded');
  }

  recordMetric(
    name: string,
    value: number,
    timestamp?: Date,
    labels?: Record<string, string>
  ): void {
    const metricPoint: MetricPoint = {
      timestamp: timestamp || new Date(),
      name,
      value,
      labels,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metricPoint);

    // Keep only the last maxDataPoints
    if (metricArray.length > this.maxDataPoints) {
      metricArray.splice(0, metricArray.length - this.maxDataPoints);
    }
  }

  recordCounter(name: string, increment = 1, labels?: Record<string, string>): void {
    const existing = this.getLatestMetric(name);
    const newValue = (existing?.value || 0) + increment;
    this.recordMetric(name, newValue, new Date(), labels);
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, new Date(), labels);
  }

  recordHistogram(
    name: string,
    value: number,
    buckets: number[],
    labels?: Record<string, string>
  ): void {
    // Record the observation
    this.recordMetric(`${name}_sum`, value, new Date(), labels);
    this.recordCounter(`${name}_count`, 1, labels);

    // Record bucket counts
    for (const bucket of buckets) {
      if (value <= bucket) {
        this.recordCounter(`${name}_bucket`, 1, { ...labels, le: bucket.toString() });
      }
    }
  }

  getMetrics(name: string, limit?: number): MetricPoint[] {
    const metrics = this.metrics.get(name) || [];

    if (limit) {
      return metrics.slice(-limit);
    }

    return [...metrics];
  }

  getLatestMetric(name: string): MetricPoint | undefined {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  }

  getMetricsByTimeRange(name: string, startTime: Date, endTime: Date): MetricPoint[] {
    const metrics = this.metrics.get(name) || [];

    return metrics.filter((metric) => metric.timestamp >= startTime && metric.timestamp <= endTime);
  }

  getAllMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetricsStats(): {
    totalMetrics: number;
    totalDataPoints: number;
    metricNames: string[];
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
  } {
    const metricNames = this.getAllMetricNames();
    let totalDataPoints = 0;
    let oldestTimestamp: Date | undefined;
    let newestTimestamp: Date | undefined;

    for (const name of metricNames) {
      const metrics = this.metrics.get(name)!;
      totalDataPoints += metrics.length;

      if (metrics.length > 0) {
        const firstMetric = metrics[0];
        const lastMetric = metrics[metrics.length - 1];

        if (!oldestTimestamp || firstMetric.timestamp < oldestTimestamp) {
          oldestTimestamp = firstMetric.timestamp;
        }

        if (!newestTimestamp || lastMetric.timestamp > newestTimestamp) {
          newestTimestamp = lastMetric.timestamp;
        }
      }
    }

    return {
      totalMetrics: metricNames.length,
      totalDataPoints,
      metricNames,
      oldestTimestamp,
      newestTimestamp,
    };
  }

  async getPrometheusMetrics(): Promise<string> {
    const lines: string[] = [];
    const metricNames = this.getAllMetricNames();

    for (const name of metricNames) {
      const latestMetric = this.getLatestMetric(name);

      if (!latestMetric) continue;

      // Add help comment
      lines.push(`# HELP ${name} ${this.getMetricHelp(name)}`);

      // Add type comment
      lines.push(`# TYPE ${name} ${this.getMetricType(name)}`);

      // Add metric line
      let metricLine = name;

      if (latestMetric.labels && Object.keys(latestMetric.labels).length > 0) {
        const labelPairs = Object.entries(latestMetric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        metricLine += `{${labelPairs}}`;
      }

      metricLine += ` ${latestMetric.value} ${latestMetric.timestamp.getTime()}`;
      lines.push(metricLine);
      lines.push(''); // Empty line for readability
    }

    return lines.join('\n');
  }

  private getMetricHelp(name: string): string {
    const helpMap: Record<string, string> = {
      system_cpu_usage_percent: 'Current CPU usage percentage',
      system_cpu_cores: 'Number of CPU cores',
      system_load_average_1m: 'System load average for 1 minute',
      system_load_average_5m: 'System load average for 5 minutes',
      system_load_average_15m: 'System load average for 15 minutes',
      system_memory_total_bytes: 'Total system memory in bytes',
      system_memory_free_bytes: 'Free system memory in bytes',
      system_memory_used_bytes: 'Used system memory in bytes',
      system_memory_usage_percent: 'Memory usage percentage',
      system_disk_total_bytes: 'Total disk space in bytes',
      system_disk_free_bytes: 'Free disk space in bytes',
      system_disk_used_bytes: 'Used disk space in bytes',
      system_disk_usage_percent: 'Disk usage percentage',
      system_network_inbound_bytes: 'Network inbound bytes',
      system_network_outbound_bytes: 'Network outbound bytes',
      system_uptime_seconds: 'System uptime in seconds',
    };

    return helpMap[name] || `Metric: ${name}`;
  }

  private getMetricType(name: string): string {
    if (name.includes('_total') || name.includes('_count')) {
      return 'counter';
    }

    if (name.includes('_bucket')) {
      return 'histogram';
    }

    return 'gauge';
  }

  clearMetrics(): void {
    this.metrics.clear();
    logger.info('All metrics cleared');
  }

  clearOldMetrics(olderThan: Date): void {
    const metricNames = this.getAllMetricNames();
    let totalRemoved = 0;

    for (const name of metricNames) {
      const metrics = this.metrics.get(name)!;
      const filteredMetrics = metrics.filter((metric) => metric.timestamp > olderThan);

      totalRemoved += metrics.length - filteredMetrics.length;
      this.metrics.set(name, filteredMetrics);
    }

    logger.info(`Cleared ${totalRemoved} old metric data points`);
  }
}

export default MetricsCollector;
