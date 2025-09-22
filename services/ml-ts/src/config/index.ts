/**
 * Configuration for ML Service
 */

interface ServerConfig {
  host: string;
  port: number;
  logLevel: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

interface CorsConfig {
  allowedOrigins: string[];
}

interface MLConfig {
  modelsPath: string;
  enableGPU: boolean;
  batchSize: number;
  modelCacheSize: number;
}

interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
  ml: MLConfig;
}

// Default configuration
export const config: Config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8001'),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nexus_saude',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
  },
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  ml: {
    modelsPath: process.env.MODELS_PATH || './models',
    enableGPU: process.env.ENABLE_GPU === 'true',
    batchSize: parseInt(process.env.BATCH_SIZE || '32'),
    modelCacheSize: parseInt(process.env.MODEL_CACHE_SIZE || '5'),
  },
};
