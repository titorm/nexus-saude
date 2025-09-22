import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3004', 10),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',

  // API configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  apiVersion: process.env.API_VERSION || 'R4',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'nexus_saude',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    },
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'fhir:',
  },

  // FHIR configuration
  fhir: {
    version: process.env.FHIR_VERSION || 'R4',
    baseUrl: process.env.FHIR_BASE_URL || 'http://localhost:3004/fhir',
    enableValidation: process.env.FHIR_ENABLE_VALIDATION !== 'false',
    enableBundling: process.env.FHIR_ENABLE_BUNDLING !== 'false',
    maxBundleSize: parseInt(process.env.FHIR_MAX_BUNDLE_SIZE || '1000', 10),
    supportedResources: process.env.FHIR_SUPPORTED_RESOURCES?.split(',') || [
      'Patient',
      'Practitioner',
      'Organization',
      'Encounter',
      'Observation',
      'Medication',
      'MedicationRequest',
      'Condition',
      'Procedure',
      'DiagnosticReport',
      'DocumentReference',
    ],
    defaultPageSize: parseInt(process.env.FHIR_DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.FHIR_MAX_PAGE_SIZE || '100', 10),
  },

  // External systems integration
  externalSystems: {
    enableHIS: process.env.ENABLE_HIS_INTEGRATION === 'true',
    enableLIS: process.env.ENABLE_LIS_INTEGRATION === 'true',
    enableRIS: process.env.ENABLE_RIS_INTEGRATION === 'true',
    enableEMR: process.env.ENABLE_EMR_INTEGRATION === 'true',

    // Hospital Information System
    his: {
      baseUrl: process.env.HIS_BASE_URL,
      apiKey: process.env.HIS_API_KEY,
      timeout: parseInt(process.env.HIS_TIMEOUT || '10000', 10),
    },

    // Laboratory Information System
    lis: {
      baseUrl: process.env.LIS_BASE_URL,
      apiKey: process.env.LIS_API_KEY,
      timeout: parseInt(process.env.LIS_TIMEOUT || '10000', 10),
    },

    // Radiology Information System
    ris: {
      baseUrl: process.env.RIS_BASE_URL,
      apiKey: process.env.RIS_API_KEY,
      timeout: parseInt(process.env.RIS_TIMEOUT || '10000', 10),
    },

    // Electronic Medical Record
    emr: {
      baseUrl: process.env.EMR_BASE_URL,
      apiKey: process.env.EMR_API_KEY,
      timeout: parseInt(process.env.EMR_TIMEOUT || '10000', 10),
    },
  },

  // Processing configuration
  processing: {
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100', 10),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
    enableAsync: process.env.ENABLE_ASYNC_PROCESSING !== 'false',
    batchProcessingSize: parseInt(process.env.BATCH_PROCESSING_SIZE || '50', 10),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  },

  // Search configuration
  search: {
    enableFullTextSearch: process.env.ENABLE_FULL_TEXT_SEARCH !== 'false',
    defaultSearchLimit: parseInt(process.env.DEFAULT_SEARCH_LIMIT || '50', 10),
    maxSearchLimit: parseInt(process.env.MAX_SEARCH_LIMIT || '1000', 10),
    enableAdvancedSearch: process.env.ENABLE_ADVANCED_SEARCH !== 'false',
    searchIndexing: process.env.SEARCH_INDEXING !== 'false',
  },

  // Monitoring configuration
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT || '9465', 10),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    performanceLogging: process.env.PERFORMANCE_LOGGING !== 'false',
    auditLogging: process.env.AUDIT_LOGGING !== 'false',
  },

  // Security configuration
  security: {
    enableAuthentication: process.env.ENABLE_AUTHENTICATION === 'true',
    enableAuthorization: process.env.ENABLE_AUTHORIZATION === 'true',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production',
    hashRounds: parseInt(process.env.HASH_ROUNDS || '12', 10),
    enableIPFiltering: process.env.ENABLE_IP_FILTERING === 'true',
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
  },

  // HIPAA Compliance configuration
  hipaa: {
    enableAuditLogging: process.env.HIPAA_AUDIT_LOGGING !== 'false',
    dataRetentionDays: parseInt(process.env.HIPAA_DATA_RETENTION || '2555', 10), // 7 years
    enableEncryption: process.env.HIPAA_ENCRYPTION !== 'false',
    anonymizePatientData: process.env.HIPAA_ANONYMIZE === 'true',
    enableAccessControl: process.env.HIPAA_ACCESS_CONTROL !== 'false',
    enableDataIntegrity: process.env.HIPAA_DATA_INTEGRITY !== 'false',
  },

  // Validation configuration
  validation: {
    enableStrict: process.env.VALIDATION_STRICT === 'true',
    enableWarnings: process.env.VALIDATION_WARNINGS !== 'false',
    customProfiles: process.env.CUSTOM_PROFILES?.split(',') || [],
    terminologyValidation: process.env.TERMINOLOGY_VALIDATION !== 'false',
    referenceValidation: process.env.REFERENCE_VALIDATION !== 'false',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10MB',
  },
};
