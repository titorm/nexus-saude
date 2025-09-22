import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3007', 10),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',

  // API configuration
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  apiTimeout: parseInt(process.env.API_TIMEOUT || '30000', 10),

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'nexus_saude',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10)
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10) // 1 hour default
  },

  // NLP Models configuration
  nlpModels: {
    spacy: {
      modelName: process.env.SPACY_MODEL || 'en_core_web_sm',
      enabledComponents: process.env.SPACY_COMPONENTS?.split(',') || ['ner', 'parser', 'tagger'],
      maxLength: parseInt(process.env.SPACY_MAX_LENGTH || '1000000', 10)
    },
    transformers: {
      modelCache: process.env.TRANSFORMERS_CACHE || './models',
      device: process.env.TRANSFORMERS_DEVICE || 'cpu',
      maxTokens: parseInt(process.env.TRANSFORMERS_MAX_TOKENS || '512', 10)
    },
    clinical: {
      vocabularyPath: process.env.CLINICAL_VOCAB_PATH || './data/clinical_vocab.json',
      abbreviationsPath: process.env.CLINICAL_ABBREV_PATH || './data/medical_abbreviations.json',
      icd10Path: process.env.ICD10_PATH || './data/icd10_codes.json',
      snomedPath: process.env.SNOMED_PATH || './data/snomed_codes.json'
    }
  },

  // Processing configuration
  processing: {
    maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH || '50000', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '10', 10),
    concurrentProcesses: parseInt(process.env.CONCURRENT_PROCESSES || '5', 10),
    timeoutPerDocument: parseInt(process.env.TIMEOUT_PER_DOCUMENT || '30000', 10)
  },

  // Classification thresholds
  classification: {
    confidenceThreshold: parseFloat(process.env.CLASSIFICATION_CONFIDENCE || '0.7'),
    documentTypes: process.env.DOCUMENT_TYPES?.split(',') || [
      'progress_note',
      'discharge_summary',
      'consultation',
      'operative_report',
      'pathology_report',
      'radiology_report',
      'laboratory_report'
    ]
  },

  // Entity extraction configuration
  entityExtraction: {
    medicalEntities: process.env.MEDICAL_ENTITIES?.split(',') || [
      'DISEASE',
      'SYMPTOM',
      'MEDICATION',
      'PROCEDURE',
      'ANATOMY',
      'TEST',
      'DOSAGE',
      'FREQUENCY'
    ],
    confidenceThreshold: parseFloat(process.env.ENTITY_CONFIDENCE || '0.6'),
    enableNormalization: process.env.ENABLE_ENTITY_NORMALIZATION !== 'false'
  },

  // Summarization configuration
  summarization: {
    maxSummaryLength: parseInt(process.env.MAX_SUMMARY_LENGTH || '500', 10),
    minSummaryLength: parseInt(process.env.MIN_SUMMARY_LENGTH || '50', 10),
    extractiveRatio: parseFloat(process.env.EXTRACTIVE_RATIO || '0.3'),
    keywordDensity: parseFloat(process.env.KEYWORD_DENSITY || '0.1')
  },

  // Structured extraction configuration
  structuredExtraction: {
    enabledFields: process.env.STRUCTURED_FIELDS?.split(',') || [
      'chief_complaint',
      'history_present_illness',
      'past_medical_history',
      'medications',
      'allergies',
      'social_history',
      'family_history',
      'review_of_systems',
      'physical_exam',
      'assessment',
      'plan'
    ],
    confidenceThreshold: parseFloat(process.env.STRUCTURED_CONFIDENCE || '0.8')
  },

  // Monitoring configuration
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT || '9464', 10),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    performanceLogging: process.env.PERFORMANCE_LOGGING !== 'false'
  },

  // Security configuration
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
    hashRounds: parseInt(process.env.HASH_ROUNDS || '12', 10),
    enableIPFiltering: process.env.ENABLE_IP_FILTERING === 'true',
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || []
  },

  // HIPAA compliance configuration
  hipaa: {
    enableAuditLogging: process.env.HIPAA_AUDIT_LOGGING !== 'false',
    dataRetentionDays: parseInt(process.env.HIPAA_DATA_RETENTION || '2555', 10), // 7 years
    enableEncryption: process.env.HIPAA_ENCRYPTION !== 'false',
    anonymizePatientData: process.env.HIPAA_ANONYMIZE !== 'false'
  }
};

// Validation
if (!config.database.password && config.environment === 'production') {
  throw new Error('Database password is required in production');
}

if (!config.security.encryptionKey || config.security.encryptionKey === 'default-key-change-in-production') {
  if (config.environment === 'production') {
    throw new Error('Encryption key must be set in production');
  }
}

export default config;