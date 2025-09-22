/**
 * Monitoring Service for FHIR Gateway
 * Handles health checks, metrics, and performance monitoring
 */

import { logger } from '../utils/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      used: number;
      available: number;
      percentage: number;
    };
  };
}

export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  resources: {
    created: number;
    updated: number;
    deleted: number;
    read: number;
    searched: number;
  };
  validation: {
    total: number;
    successful: number;
    failed: number;
  };
  uptime: number;
  timestamp: string;
}

export class MonitoringService {
  private startTime: Date;
  private metrics: Metrics;

  constructor() {
    this.startTime = new Date();
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
      resources: {
        created: 0,
        updated: 0,
        deleted: 0,
        read: 0,
        searched: 0,
      },
      validation: {
        total: 0,
        successful: 0,
        failed: 0,
      },
      uptime: 0,
      timestamp: new Date().toISOString(),
    };

    // Update metrics every minute
    setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const memoryUsage = process.memoryUsage();

    // Check database health
    const databaseStatus = await this.checkDatabaseHealth();

    // Calculate memory percentage
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Mock disk usage (in production, would check actual disk usage)
    const diskUsed = 1024 * 1024 * 1024; // 1GB
    const diskAvailable = 10 * 1024 * 1024 * 1024; // 10GB
    const diskPercentage = (diskUsed / (diskUsed + diskAvailable)) * 100;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (databaseStatus.status === 'down' || memoryPercentage > 90 || diskPercentage > 90) {
      status = 'unhealthy';
    } else if (memoryPercentage > 75 || diskPercentage > 75) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: '1.0.0',
      checks: {
        database: databaseStatus,
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round(memoryPercentage * 100) / 100,
        },
        disk: {
          used: diskUsed,
          available: diskAvailable,
          percentage: Math.round(diskPercentage * 100) / 100,
        },
      },
    };
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<string> {
    this.updateMetrics();

    const prometheusMetrics = `
# HELP fhir_requests_total Total number of FHIR requests
# TYPE fhir_requests_total counter
fhir_requests_total{status="success"} ${this.metrics.requests.successful}
fhir_requests_total{status="error"} ${this.metrics.requests.failed}

# HELP fhir_request_duration_seconds Average request duration in seconds
# TYPE fhir_request_duration_seconds gauge
fhir_request_duration_seconds ${this.metrics.requests.averageResponseTime / 1000}

# HELP fhir_resources_total Total number of resource operations
# TYPE fhir_resources_total counter
fhir_resources_total{operation="create"} ${this.metrics.resources.created}
fhir_resources_total{operation="read"} ${this.metrics.resources.read}
fhir_resources_total{operation="update"} ${this.metrics.resources.updated}
fhir_resources_total{operation="delete"} ${this.metrics.resources.deleted}
fhir_resources_total{operation="search"} ${this.metrics.resources.searched}

# HELP fhir_validations_total Total number of resource validations
# TYPE fhir_validations_total counter
fhir_validations_total{status="success"} ${this.metrics.validation.successful}
fhir_validations_total{status="error"} ${this.metrics.validation.failed}

# HELP fhir_uptime_seconds Service uptime in seconds
# TYPE fhir_uptime_seconds gauge
fhir_uptime_seconds ${this.metrics.uptime}

# HELP fhir_memory_usage_bytes Current memory usage in bytes
# TYPE fhir_memory_usage_bytes gauge
fhir_memory_usage_bytes ${process.memoryUsage().heapUsed}
    `.trim();

    return prometheusMetrics;
  }

  /**
   * Record a request
   */
  recordRequest(duration: number, success: boolean): void {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update average response time
    const totalTime =
      this.metrics.requests.averageResponseTime * (this.metrics.requests.total - 1) + duration;
    this.metrics.requests.averageResponseTime = totalTime / this.metrics.requests.total;
  }

  /**
   * Record a resource operation
   */
  recordResourceOperation(operation: 'create' | 'read' | 'update' | 'delete' | 'search'): void {
    switch (operation) {
      case 'create':
        this.metrics.resources.created++;
        break;
      case 'read':
        this.metrics.resources.read++;
        break;
      case 'update':
        this.metrics.resources.updated++;
        break;
      case 'delete':
        this.metrics.resources.deleted++;
        break;
      case 'search':
        this.metrics.resources.searched++;
        break;
    }
  }

  /**
   * Record a validation
   */
  recordValidation(success: boolean): void {
    this.metrics.validation.total++;

    if (success) {
      this.metrics.validation.successful++;
    } else {
      this.metrics.validation.failed++;
    }
  }

  /**
   * Update metrics timestamp and uptime
   */
  private updateMetrics(): void {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    this.metrics.timestamp = new Date().toISOString();
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<{ status: 'up' | 'down'; responseTime?: number }> {
    try {
      const startTime = Date.now();

      // In production, this would actually ping the database
      // For now, simulate a health check
      await new Promise((resolve) => setTimeout(resolve, 1));

      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      logger.error('Database health check failed: ' + String(error));
      return {
        status: 'down',
      };
    }
  }

  /**
   * Shutdown monitoring service
   */
  async shutdown(): Promise<void> {
    logger.info('Monitoring service shutdown complete');
  }
}
