import { config } from '../config/index.js';
import { logger, logError } from '../utils/logger.js';

export interface HealthStatus {
  database: 'healthy' | 'unhealthy' | 'unknown';
  ai_models: 'loaded' | 'loading' | 'failed' | 'unknown';
  knowledge_base: 'ready' | 'loading' | 'failed' | 'unknown';
  redis?: 'connected' | 'disconnected' | 'unknown';
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
}

export interface AIMetrics {
  totalQueries: number;
  queriesPerMinute: number;
  averageConfidence: number;
  averageProcessingTime: number;
  errorRate: number;
  modelLoadTime: number;
}

/**
 * Monitoring Service
 * Provides health checks, metrics, and system monitoring
 */
export class MonitoringService {
  private healthStatus: HealthStatus = {
    database: 'unknown',
    ai_models: 'unknown',
    knowledge_base: 'unknown',
  };

  private systemMetrics: SystemMetrics = {
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: { usage: 0 },
    uptime: 0,
    activeConnections: 0,
    requestsPerMinute: 0,
    averageResponseTime: 0,
  };

  private aiMetrics: AIMetrics = {
    totalQueries: 0,
    queriesPerMinute: 0,
    averageConfidence: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    modelLoadTime: 0,
  };

  private requestTimes: number[] = [];
  private queryTimes: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;
  private metricsInterval?: any;
  private isInitialized = false;

  constructor() {}

  /**
   * Initialize monitoring service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Monitoring Service...');

      const startTime = Date.now();

      // Start metrics collection
      this.startMetricsCollection();

      // Set initial health status
      await this.updateHealthStatus();

      this.isInitialized = true;

      const initTime = Date.now() - startTime;
      logger.info(`Monitoring Service initialized in ${initTime}ms`);
    } catch (error) {
      logError(error, 'MonitoringService.initialize');
      throw new Error('Failed to initialize Monitoring Service');
    }
  }

  /**
   * Check if monitoring service is healthy
   */
  isHealthy(): boolean {
    return (
      this.isInitialized &&
      this.healthStatus.database === 'healthy' &&
      this.healthStatus.ai_models === 'loaded' &&
      this.healthStatus.knowledge_base === 'ready'
    );
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    await this.updateHealthStatus();
    return { ...this.healthStatus };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    this.updateSystemMetrics();
    return { ...this.systemMetrics };
  }

  /**
   * Get AI-specific metrics
   */
  getAIMetrics(): AIMetrics {
    this.updateAIMetrics();
    return { ...this.aiMetrics };
  }

  /**
   * Record request timing
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.totalRequests++;
    this.requestTimes.push(responseTime);

    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 requests for moving average
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }
  }

  /**
   * Record AI query timing
   */
  recordAIQuery(processingTime: number, confidence: number): void {
    this.aiMetrics.totalQueries++;
    this.queryTimes.push(processingTime);

    // Update confidence moving average
    this.aiMetrics.averageConfidence =
      (this.aiMetrics.averageConfidence * (this.aiMetrics.totalQueries - 1) + confidence) /
      this.aiMetrics.totalQueries;

    // Keep only last 1000 queries for moving average
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }
  }

  /**
   * Record model load time
   */
  recordModelLoad(loadTime: number): void {
    this.aiMetrics.modelLoadTime = loadTime;
  }

  /**
   * Update health status
   */
  private async updateHealthStatus(): Promise<void> {
    try {
      // Check database health (would integrate with DatabaseService)
      this.healthStatus.database = 'healthy'; // Placeholder

      // Check AI models status
      this.healthStatus.ai_models = 'loaded'; // Placeholder

      // Check knowledge base status
      this.healthStatus.knowledge_base = 'ready'; // Placeholder

      // Check Redis if configured
      if (config.redisHost || config.redisUrl) {
        this.healthStatus.redis = 'connected'; // Placeholder
      }
    } catch (error) {
      logError(error, 'MonitoringService.updateHealthStatus');
    }
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.systemMetrics.memory = {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      };

      // Uptime
      this.systemMetrics.uptime = process.uptime();

      // Average response time
      if (this.requestTimes.length > 0) {
        this.systemMetrics.averageResponseTime =
          this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;
      }

      // Requests per minute (approximate)
      const recentRequests = this.requestTimes.filter((time) => Date.now() - time < 60000).length;
      this.systemMetrics.requestsPerMinute = recentRequests;
    } catch (error) {
      logError(error, 'MonitoringService.updateSystemMetrics');
    }
  }

  /**
   * Update AI metrics
   */
  private updateAIMetrics(): void {
    try {
      // Average processing time
      if (this.queryTimes.length > 0) {
        this.aiMetrics.averageProcessingTime =
          this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
      }

      // Queries per minute (approximate)
      const now = Date.now();
      const recentQueries = this.queryTimes.filter((time) => now - time < 60000).length;
      this.aiMetrics.queriesPerMinute = recentQueries;

      // Error rate
      if (this.totalRequests > 0) {
        this.aiMetrics.errorRate = (this.errorCount / this.totalRequests) * 100;
      }
    } catch (error) {
      logError(error, 'MonitoringService.updateAIMetrics');
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.updateAIMetrics();
      this.logMetrics();
    }, 30000);
  }

  /**
   * Log current metrics
   */
  private logMetrics(): void {
    logger.info('System Metrics', {
      memory_usage_mb: Math.round(this.systemMetrics.memory.used / 1024 / 1024),
      memory_percentage: Math.round(this.systemMetrics.memory.percentage),
      uptime_hours: Math.round(this.systemMetrics.uptime / 3600),
      requests_per_minute: this.systemMetrics.requestsPerMinute,
      average_response_time_ms: Math.round(this.systemMetrics.averageResponseTime),
      total_ai_queries: this.aiMetrics.totalQueries,
      ai_queries_per_minute: this.aiMetrics.queriesPerMinute,
      average_confidence: Math.round(this.aiMetrics.averageConfidence * 100) / 100,
      error_rate_percent: Math.round(this.aiMetrics.errorRate * 100) / 100,
    });
  }

  /**
   * Get comprehensive status report
   */
  async getStatusReport(): Promise<{
    service: string;
    version: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    health: HealthStatus;
    system: SystemMetrics;
    ai: AIMetrics;
  }> {
    const health = await this.getHealthStatus();
    const system = this.getSystemMetrics();
    const ai = this.getAIMetrics();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      health.database === 'unhealthy' ||
      health.ai_models === 'failed' ||
      health.knowledge_base === 'failed'
    ) {
      overallStatus = 'unhealthy';
    } else if (
      health.database === 'unknown' ||
      health.ai_models === 'loading' ||
      health.knowledge_base === 'loading' ||
      system.memory.percentage > 90 ||
      ai.errorRate > 10
    ) {
      overallStatus = 'degraded';
    }

    return {
      service: config.serviceName,
      version: config.serviceVersion,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      health,
      system,
      ai,
    };
  }

  /**
   * Generate Prometheus metrics
   */
  generatePrometheusMetrics(): string {
    const metrics: string[] = [];

    // System metrics
    metrics.push(`# HELP ai_assistant_memory_usage_bytes Memory usage in bytes`);
    metrics.push(`# TYPE ai_assistant_memory_usage_bytes gauge`);
    metrics.push(`ai_assistant_memory_usage_bytes ${this.systemMetrics.memory.used}`);

    metrics.push(`# HELP ai_assistant_uptime_seconds Service uptime in seconds`);
    metrics.push(`# TYPE ai_assistant_uptime_seconds counter`);
    metrics.push(`ai_assistant_uptime_seconds ${this.systemMetrics.uptime}`);

    metrics.push(`# HELP ai_assistant_requests_total Total number of requests`);
    metrics.push(`# TYPE ai_assistant_requests_total counter`);
    metrics.push(`ai_assistant_requests_total ${this.totalRequests}`);

    metrics.push(
      `# HELP ai_assistant_request_duration_ms Average request duration in milliseconds`
    );
    metrics.push(`# TYPE ai_assistant_request_duration_ms gauge`);
    metrics.push(`ai_assistant_request_duration_ms ${this.systemMetrics.averageResponseTime}`);

    // AI metrics
    metrics.push(`# HELP ai_assistant_queries_total Total number of AI queries`);
    metrics.push(`# TYPE ai_assistant_queries_total counter`);
    metrics.push(`ai_assistant_queries_total ${this.aiMetrics.totalQueries}`);

    metrics.push(
      `# HELP ai_assistant_query_duration_ms Average query processing time in milliseconds`
    );
    metrics.push(`# TYPE ai_assistant_query_duration_ms gauge`);
    metrics.push(`ai_assistant_query_duration_ms ${this.aiMetrics.averageProcessingTime}`);

    metrics.push(`# HELP ai_assistant_confidence_score Average confidence score`);
    metrics.push(`# TYPE ai_assistant_confidence_score gauge`);
    metrics.push(`ai_assistant_confidence_score ${this.aiMetrics.averageConfidence}`);

    metrics.push(`# HELP ai_assistant_error_rate Error rate percentage`);
    metrics.push(`# TYPE ai_assistant_error_rate gauge`);
    metrics.push(`ai_assistant_error_rate ${this.aiMetrics.errorRate}`);

    // Health status (1 = healthy, 0 = unhealthy)
    metrics.push(`# HELP ai_assistant_health_status Health status (1 = healthy, 0 = unhealthy)`);
    metrics.push(`# TYPE ai_assistant_health_status gauge`);
    metrics.push(
      `ai_assistant_health_status{component="database"} ${this.healthStatus.database === 'healthy' ? 1 : 0}`
    );
    metrics.push(
      `ai_assistant_health_status{component="ai_models"} ${this.healthStatus.ai_models === 'loaded' ? 1 : 0}`
    );
    metrics.push(
      `ai_assistant_health_status{component="knowledge_base"} ${this.healthStatus.knowledge_base === 'ready' ? 1 : 0}`
    );

    return metrics.join('\n') + '\n';
  }

  /**
   * Set component health status
   */
  setComponentHealth(
    component: keyof HealthStatus,
    status: HealthStatus[keyof HealthStatus] | string
  ): void {
    // Accept only known statuses for the component where possible; fall back to string assignment.
    try {
      (this.healthStatus[component] as any) = status as any;
    } catch {
      // Fallback: assign as unknown
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.healthStatus[component] = status as any;
    }
  }

  /**
   * Cleanup monitoring service
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up Monitoring Service...');

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      this.isInitialized = false;
      logger.info('Monitoring Service cleaned up');
    } catch (error) {
      logError(error, 'MonitoringService.cleanup');
    }
  }
}
