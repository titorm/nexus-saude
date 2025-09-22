/**
 * Configuration settings for Monitoring Service
 */

export interface MonitoringConfig {
  host: string;
  port: number;
  env: string;
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    database: number;
  };
  email: {
    enabled: boolean;
    service: string;
    user: string;
    pass: string;
    from: string;
  };
  monitoring: {
    intervals: {
      system: number;
      patient: number;
      metrics: number;
    };
    thresholds: {
      cpu: number;
      memory: number;
      disk: number;
      responseTime: number;
    };
    retention: {
      metrics: number;
      alerts: number;
    };
  };
  alerts: {
    channels: string[];
    priorities: {
      low: string[];
      medium: string[];
      high: string[];
      critical: string[];
    };
  };
  websocket: {
    enabled: boolean;
    heartbeatInterval: number;
  };
  allowedOrigins: string[];
}

export const config: MonitoringConfig = {
  host: process.env.MONITORING_HOST || '0.0.0.0',
  port: parseInt(process.env.MONITORING_PORT || '3003'),
  env: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'nexus_monitoring',
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0'),
  },

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'nexus-monitoring@example.com',
  },

  monitoring: {
    intervals: {
      system: parseInt(process.env.SYSTEM_MONITOR_INTERVAL || '30000'), // 30 seconds
      patient: parseInt(process.env.PATIENT_MONITOR_INTERVAL || '60000'), // 1 minute
      metrics: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '15000'), // 15 seconds
    },
    thresholds: {
      cpu: parseFloat(process.env.CPU_THRESHOLD || '80'), // 80%
      memory: parseFloat(process.env.MEMORY_THRESHOLD || '85'), // 85%
      disk: parseFloat(process.env.DISK_THRESHOLD || '90'), // 90%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000'), // 5 seconds
    },
    retention: {
      metrics: parseInt(process.env.METRICS_RETENTION_DAYS || '30'), // 30 days
      alerts: parseInt(process.env.ALERTS_RETENTION_DAYS || '90'), // 90 days
    },
  },

  alerts: {
    channels: (process.env.ALERT_CHANNELS || 'email,websocket').split(','),
    priorities: {
      low: ['websocket'],
      medium: ['email', 'websocket'],
      high: ['email', 'websocket'],
      critical: ['email', 'websocket'],
    },
  },

  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    heartbeatInterval: parseInt(process.env.WEBSOCKET_HEARTBEAT || '30000'), // 30 seconds
  },

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://nexus-saude.vercel.app',
  ],
};

export default config;
