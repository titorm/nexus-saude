/**
 * Configuration settings for Data Warehouse Service
 */

export interface DataWarehouseConfig {
  host: string;
  port: number;
  env: string;
  server: {
    host: string;
    port: number;
  };
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
  etl: {
    enabled: boolean;
    batchSize: number;
    intervals: {
      patient: number;
      analytics: number;
      reports: number;
    };
    sources: {
      fhir: string;
      monitoring: string;
      ai: string;
      ml: string;
      nlp: string;
    };
  };
  analytics: {
    cacheSize: number;
    aggregationLevels: string[];
    retentionDays: number;
  };
  reports: {
    outputPath: string;
    formats: string[];
    scheduling: boolean;
    maxReports: number;
  };
  allowedOrigins: string[];
}

export const config: DataWarehouseConfig = {
  host: process.env.DATA_WAREHOUSE_HOST || '0.0.0.0',
  port: parseInt(process.env.DATA_WAREHOUSE_PORT || '3006'),
  env: process.env.NODE_ENV || 'development',

  server: {
    host: process.env.DATA_WAREHOUSE_HOST || '0.0.0.0',
    port: parseInt(process.env.DATA_WAREHOUSE_PORT || '3006'),
  },

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'nexus_warehouse',
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '1'),
  },

  etl: {
    enabled: process.env.ETL_ENABLED !== 'false',
    batchSize: parseInt(process.env.ETL_BATCH_SIZE || '1000'),
    intervals: {
      patient: parseInt(process.env.ETL_PATIENT_INTERVAL || '300000'), // 5 minutes
      analytics: parseInt(process.env.ETL_ANALYTICS_INTERVAL || '900000'), // 15 minutes
      reports: parseInt(process.env.ETL_REPORTS_INTERVAL || '3600000'), // 1 hour
    },
    sources: {
      fhir: process.env.FHIR_SERVICE_URL || 'http://localhost:3001',
      monitoring: process.env.MONITORING_SERVICE_URL || 'http://localhost:3003',
      ai: process.env.AI_SERVICE_URL || 'http://localhost:3002',
      ml: process.env.ML_SERVICE_URL || 'http://localhost:3004',
      nlp: process.env.NLP_SERVICE_URL || 'http://localhost:3005',
    },
  },

  analytics: {
    cacheSize: parseInt(process.env.ANALYTICS_CACHE_SIZE || '10000'),
    aggregationLevels: (process.env.AGGREGATION_LEVELS || 'daily,weekly,monthly').split(','),
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365'),
  },

  reports: {
    outputPath: process.env.REPORTS_OUTPUT_PATH || './reports',
    formats: (process.env.REPORT_FORMATS || 'pdf,csv,json').split(','),
    scheduling: process.env.REPORT_SCHEDULING !== 'false',
    maxReports: parseInt(process.env.MAX_REPORTS || '100'),
  },

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://nexus-saude.vercel.app',
  ],
};

export default config;
