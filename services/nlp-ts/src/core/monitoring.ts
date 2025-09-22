import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { DatabaseService } from './database.js';

export interface HealthStatus {
  database: string;
  nlp_models: string;
  processors: string;
  redis?: string;
}

export interface DetailedHealthStatus {
  database: {
    status: string;
    latency: number;
    connections: number;
  };
  redis: {
    status: string;
    latency: number;
    memory: string;
  };
  nlp_models: {
    status: string;
    loaded_models: string[];
    model_memory: string;
  };
  processors: {
    status: string;
    active_processes: number;
    queue_size: number;
  };
}

export interface PerformanceMetrics {
  memory_usage: string;
  cpu_usage: number;
  requests_per_minute: number;
  average_response_time: number;
}

export interface ServiceMetrics {
  requests_total: number;
  requests_success: number;
  requests_error: number;
  processing_time_total: number;
  processing_time_avg: number;
  entities_extracted_total: number;
  documents_classified_total: number;
  summaries_generated_total: number;
  structured_data_extracted_total: number;
}

export class MonitoringService {
  private healthy: boolean = false;
  private metrics: ServiceMetrics;
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private startTime: number;
  private databaseService?: DatabaseService;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      requests_total: 0,
      requests_success: 0,
      requests_error: 0,
      processing_time_total: 0,
      processing_time_avg: 0,
      entities_extracted_total: 0,
      documents_classified_total: 0,
      summaries_generated_total: 0,
      structured_data_extracted_total: 0
    };
    
    logger.info('Initializing Monitoring Service');
  }

  async initialize(databaseService?: DatabaseService): Promise<void> {
    try {
      this.databaseService = databaseService;
      
      // Start periodic health checks
      this.startHealthChecks();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.healthy = true;
      logger.info('Monitoring Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Monitoring Service:', error);
      throw error;
    }
  }

  private startHealthChecks(): void {
    const checkInterval = config.monitoring.healthCheckInterval;
    
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.warn('Health check failed:', error);
      }
    }, checkInterval);
    
    logger.info(`Health checks started (interval: ${checkInterval}ms)`);
  }

  private startMetricsCollection(): void {
    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);
    
    // Clean up old response times every 5 minutes
    setInterval(() => {
      this.cleanupMetrics();
    }, 300000);
    
    logger.info('Metrics collection started');
  }

  private async performHealthCheck(): Promise<void> {
    let allHealthy = true;
    
    // Check database connection
    if (this.databaseService) {
      const dbHealthy = await this.databaseService.testConnection();
      if (!dbHealthy) {
        allHealthy = false;
        logger.warn('Database health check failed');
      }
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 1024 * 1024 * 1024; // 1GB
    if (memoryUsage.heapUsed > memoryThreshold) {
      logger.warn(`High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
    }
    
    this.healthy = allHealthy;
  }

  private collectSystemMetrics(): void {
    // Calculate average response time
    if (this.responseTimes.length > 0) {
      this.metrics.processing_time_avg = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }
    
    // Log current metrics
    if (config.monitoring.performanceLogging) {
      logger.debug('Current metrics:', {
        requests_total: this.metrics.requests_total,
        success_rate: this.getSuccessRate(),
        avg_response_time: this.metrics.processing_time_avg,
        memory_usage: this.getMemoryUsage()
      });
    }
  }

  private cleanupMetrics(): void {
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    // Reset per-minute counters
    this.requestCounts.clear();
  }

  // Public methods for recording metrics
  recordRequest(endpoint: string, processingTime: number, success: boolean): void {
    this.metrics.requests_total++;
    
    if (success) {
      this.metrics.requests_success++;
    } else {
      this.metrics.requests_error++;
    }
    
    this.metrics.processing_time_total += processingTime;
    this.responseTimes.push(processingTime);
    
    // Track requests per endpoint
    const currentCount = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, currentCount + 1);
  }

  recordEntityExtraction(entitiesCount: number): void {
    this.metrics.entities_extracted_total += entitiesCount;
  }

  recordDocumentClassification(): void {
    this.metrics.documents_classified_total++;
  }

  recordSummarization(): void {
    this.metrics.summaries_generated_total++;
  }

  recordStructuredExtraction(): void {
    this.metrics.structured_data_extracted_total++;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const dbStatus = this.databaseService?.isConnected ? 'healthy' : 'unhealthy';
    
    return {
      database: dbStatus,
      nlp_models: 'healthy', // Simplified for now
      processors: 'healthy'
    };
  }

  async getDetailedHealthStatus(): Promise<DetailedHealthStatus> {
    // Database health
    const dbLatency = await this.measureDatabaseLatency();
    const dbConnections = this.databaseService ? 
      (await this.databaseService.getConnectionInfo()).totalConnections : 0;
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    return {
      database: {
        status: this.databaseService?.isConnected ? 'healthy' : 'unhealthy',
        latency: dbLatency,
        connections: dbConnections
      },
      redis: {
        status: 'not_configured', // Redis integration would go here
        latency: 0,
        memory: '0MB'
      },
      nlp_models: {
        status: 'healthy',
        loaded_models: ['clinical_nlp_v1', 'entity_extractor_v1', 'classifier_v1'],
        model_memory: `${memoryMB}MB`
      },
      processors: {
        status: 'healthy',
        active_processes: this.getActiveProcesses(),
        queue_size: this.getQueueSize()
      }
    };
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = await this.getCpuUsage();
    const requestsPerMinute = this.getRequestsPerMinute();
    const avgResponseTime = this.metrics.processing_time_avg;

    return {
      memory_usage: memoryUsage,
      cpu_usage: cpuUsage,
      requests_per_minute: requestsPerMinute,
      average_response_time: avgResponseTime
    };
  }

  async getPrometheusMetrics(): Promise<string> {
    const metrics = [
      '# HELP nlp_service_requests_total Total number of requests processed',
      '# TYPE nlp_service_requests_total counter',
      `nlp_service_requests_total ${this.metrics.requests_total}`,
      '',
      '# HELP nlp_service_requests_success_total Total number of successful requests',
      '# TYPE nlp_service_requests_success_total counter',
      `nlp_service_requests_success_total ${this.metrics.requests_success}`,
      '',
      '# HELP nlp_service_requests_error_total Total number of failed requests',
      '# TYPE nlp_service_requests_error_total counter',
      `nlp_service_requests_error_total ${this.metrics.requests_error}`,
      '',
      '# HELP nlp_service_processing_time_seconds_total Total processing time in seconds',
      '# TYPE nlp_service_processing_time_seconds_total counter',
      `nlp_service_processing_time_seconds_total ${this.metrics.processing_time_total / 1000}`,
      '',
      '# HELP nlp_service_processing_time_seconds_avg Average processing time in seconds',
      '# TYPE nlp_service_processing_time_seconds_avg gauge',
      `nlp_service_processing_time_seconds_avg ${this.metrics.processing_time_avg / 1000}`,
      '',
      '# HELP nlp_service_entities_extracted_total Total number of entities extracted',
      '# TYPE nlp_service_entities_extracted_total counter',
      `nlp_service_entities_extracted_total ${this.metrics.entities_extracted_total}`,
      '',
      '# HELP nlp_service_documents_classified_total Total number of documents classified',
      '# TYPE nlp_service_documents_classified_total counter',
      `nlp_service_documents_classified_total ${this.metrics.documents_classified_total}`,
      '',
      '# HELP nlp_service_summaries_generated_total Total number of summaries generated',
      '# TYPE nlp_service_summaries_generated_total counter',
      `nlp_service_summaries_generated_total ${this.metrics.summaries_generated_total}`,
      '',
      '# HELP nlp_service_structured_extractions_total Total number of structured extractions',
      '# TYPE nlp_service_structured_extractions_total counter',
      `nlp_service_structured_extractions_total ${this.metrics.structured_data_extracted_total}`,
      '',
      '# HELP nlp_service_memory_usage_bytes Current memory usage in bytes',
      '# TYPE nlp_service_memory_usage_bytes gauge',
      `nlp_service_memory_usage_bytes ${process.memoryUsage().heapUsed}`,
      '',
      '# HELP nlp_service_uptime_seconds Service uptime in seconds',
      '# TYPE nlp_service_uptime_seconds gauge',
      `nlp_service_uptime_seconds ${(Date.now() - this.startTime) / 1000}`,
      ''
    ];

    // Add per-endpoint metrics
    for (const [endpoint, count] of this.requestCounts) {
      metrics.push(
        `# HELP nlp_service_endpoint_requests_total Requests per endpoint`,
        `# TYPE nlp_service_endpoint_requests_total counter`,
        `nlp_service_endpoint_requests_total{endpoint="${endpoint}"} ${count}`,
        ''
      );
    }

    return metrics.join('\n');
  }

  getServiceMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  getSuccessRate(): number {
    if (this.metrics.requests_total === 0) return 100;
    return (this.metrics.requests_success / this.metrics.requests_total) * 100;
  }

  private async measureDatabaseLatency(): Promise<number> {
    if (!this.databaseService) return 0;
    
    const start = Date.now();
    try {
      await this.databaseService.testConnection();
      return Date.now() - start;
    } catch (error) {
      return -1; // Indicates connection failure
    }
  }

  private getMemoryUsage(): string {
    const usage = process.memoryUsage();
    const used = Math.round(usage.heapUsed / 1024 / 1024);
    const total = Math.round(usage.heapTotal / 1024 / 1024);
    return `${used}MB / ${total}MB`;
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In a real implementation, you might use a library like 'os-utils'
    return Math.round(Math.random() * 100); // Placeholder
  }

  private getRequestsPerMinute(): number {
    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, count) => sum + count, 0);
    return totalRequests; // Simplified - would need time-based windowing
  }

  private getActiveProcesses(): number {
    // Would track actual active processing operations
    return Math.floor(Math.random() * 5); // Placeholder
  }

  private getQueueSize(): number {
    // Would track actual queue size if using a queue system
    return Math.floor(Math.random() * 10); // Placeholder
  }

  // Alerting methods
  shouldAlert(): boolean {
    const errorRate = (this.metrics.requests_error / this.metrics.requests_total) * 100;
    const avgResponseTime = this.metrics.processing_time_avg;
    const memoryUsage = process.memoryUsage().heapUsed;
    
    // Alert conditions
    if (errorRate > 10) return true; // More than 10% errors
    if (avgResponseTime > 30000) return true; // Response time > 30 seconds
    if (memoryUsage > 1024 * 1024 * 1024) return true; // Memory > 1GB
    
    return false;
  }

  getAlertDetails(): string[] {
    const alerts: string[] = [];
    const errorRate = (this.metrics.requests_error / this.metrics.requests_total) * 100;
    const avgResponseTime = this.metrics.processing_time_avg;
    const memoryUsage = process.memoryUsage().heapUsed;
    
    if (errorRate > 10) {
      alerts.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }
    
    if (avgResponseTime > 30000) {
      alerts.push(`High response time: ${(avgResponseTime / 1000).toFixed(2)}s`);
    }
    
    if (memoryUsage > 1024 * 1024 * 1024) {
      alerts.push(`High memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    }
    
    if (!this.healthy) {
      alerts.push('Service health check failed');
    }
    
    return alerts;
  }

  // Reset methods
  resetMetrics(): void {
    this.metrics = {
      requests_total: 0,
      requests_success: 0,
      requests_error: 0,
      processing_time_total: 0,
      processing_time_avg: 0,
      entities_extracted_total: 0,
      documents_classified_total: 0,
      summaries_generated_total: 0,
      structured_data_extracted_total: 0
    };
    
    this.responseTimes = [];
    this.requestCounts.clear();
    
    logger.info('Metrics reset');
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  async cleanup(): Promise<void> {
    // Stop any running intervals if we were tracking them
    this.healthy = false;
    logger.info('Monitoring Service cleaned up');
  }
}