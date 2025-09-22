import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // Service Configuration
  serviceName: z.string().default('ai-medical-assistant'),
  serviceVersion: z.string().default('1.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  debug: z.boolean().default(false),
  
  // Server Configuration
  host: z.string().default('0.0.0.0'),
  port: z.number().default(8002),
  workers: z.number().default(1),
  
  // OpenAI Configuration
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-3.5-turbo'),
  openaiTemperature: z.number().min(0).max(2).default(0.3),
  openaiMaxTokens: z.number().default(1000),
  
  // Hugging Face Configuration
  hfModelCacheDir: z.string().default('./models'),
  hfUseAuthToken: z.boolean().default(false),
  
  // Medical Knowledge Configuration
  medicalKnowledgePath: z.string().default('./data/medical_knowledge'),
  enableMedicalDb: z.boolean().default(true),
  
  // NLP Configuration
  sentenceTransformerModel: z.string().default('all-MiniLM-L6-v2'),
  
  // Conversation Configuration
  conversationTimeoutMinutes: z.number().default(30),
  maxConversationMemory: z.number().default(20),
  
  // Database Configuration
  databaseUrl: z.string().optional(),
  dbHost: z.string().default('localhost'),
  dbPort: z.number().default(5432),
  dbName: z.string().default('nexus_saude'),
  dbUser: z.string().default('postgres'),
  dbPassword: z.string().default('postgres'),
  dbSsl: z.boolean().default(false),
  dbMaxConnections: z.number().default(20),
  
  // Redis Configuration
  redisUrl: z.string().optional(),
  redisHost: z.string().default('localhost'),
  redisPort: z.number().default(6379),
  redisPassword: z.string().optional(),
  redisDb: z.number().default(0),
  
  // Security Configuration
  apiKey: z.string().optional(),
  allowedOrigins: z.array(z.string()).default([
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:5173'
  ]),
  
  // Monitoring Configuration
  enableMetrics: z.boolean().default(true),
  metricsPort: z.number().default(9002),
  
  // Logging Configuration
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  logFormat: z.enum(['json', 'pretty']).default('json'),
  
  // Rate Limiting
  rateLimitMax: z.number().default(100),
  rateLimitWindow: z.string().default('1 minute'),
  
  // AI Model Configuration
  enableOpenAI: z.boolean().default(true),
  enableLocalModels: z.boolean().default(true),
  modelLoadTimeout: z.number().default(60000), // 60 seconds
  
  // Knowledge Base Configuration
  knowledgeBaseUpdateInterval: z.number().default(3600000), // 1 hour
  enableKnowledgeSync: z.boolean().default(true),
  
  // Performance Configuration
  maxRequestSize: z.string().default('10mb'),
  requestTimeout: z.number().default(30000), // 30 seconds
  
  // Feature Flags
  enableDiagnosticSuggestions: z.boolean().default(true),
  enableTreatmentRecommendations: z.boolean().default(true),
  enableConversationMemory: z.boolean().default(true),
  enableMedicalEntityExtraction: z.boolean().default(true)
});

// Parse and validate configuration
const parseConfig = () => {
  const rawConfig = {
    // Service Configuration
    serviceName: process.env.SERVICE_NAME,
    serviceVersion: process.env.SERVICE_VERSION,
    nodeEnv: process.env.NODE_ENV,
    debug: process.env.DEBUG === 'true',
    
    // Server Configuration
    host: process.env.AI_HOST,
    port: parseInt(process.env.AI_PORT || '8002'),
    workers: parseInt(process.env.AI_WORKERS || '1'),
    
    // OpenAI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
    openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    
    // Hugging Face Configuration
    hfModelCacheDir: process.env.HF_CACHE_DIR,
    hfUseAuthToken: process.env.HF_USE_AUTH_TOKEN === 'true',
    
    // Medical Knowledge Configuration
    medicalKnowledgePath: process.env.MEDICAL_KNOWLEDGE_PATH,
    enableMedicalDb: process.env.ENABLE_MEDICAL_DB !== 'false',
    
    // NLP Configuration
    sentenceTransformerModel: process.env.SENTENCE_TRANSFORMER_MODEL,
    
    // Conversation Configuration
    conversationTimeoutMinutes: parseInt(process.env.CONVERSATION_TIMEOUT || '30'),
    maxConversationMemory: parseInt(process.env.MAX_CONVERSATION_MEMORY || '20'),
    
    // Database Configuration
    databaseUrl: process.env.DATABASE_URL,
    dbHost: process.env.DB_HOST,
    dbPort: parseInt(process.env.DB_PORT || '5432'),
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbSsl: process.env.DB_SSL === 'true',
    dbMaxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    
    // Redis Configuration
    redisUrl: process.env.REDIS_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
    redisPassword: process.env.REDIS_PASSWORD,
    redisDb: parseInt(process.env.REDIS_DB || '0'),
    
    // Security Configuration
    apiKey: process.env.AI_API_KEY,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || undefined,
    
    // Monitoring Configuration
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT || '9002'),
    
    // Logging Configuration
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    
    // Rate Limiting
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
    
    // AI Model Configuration
    enableOpenAI: process.env.ENABLE_OPENAI !== 'false',
    enableLocalModels: process.env.ENABLE_LOCAL_MODELS !== 'false',
    modelLoadTimeout: parseInt(process.env.MODEL_LOAD_TIMEOUT || '60000'),
    
    // Knowledge Base Configuration
    knowledgeBaseUpdateInterval: parseInt(process.env.KNOWLEDGE_BASE_UPDATE_INTERVAL || '3600000'),
    enableKnowledgeSync: process.env.ENABLE_KNOWLEDGE_SYNC !== 'false',
    
    // Performance Configuration
    maxRequestSize: process.env.MAX_REQUEST_SIZE,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    
    // Feature Flags
    enableDiagnosticSuggestions: process.env.ENABLE_DIAGNOSTIC_SUGGESTIONS !== 'false',
    enableTreatmentRecommendations: process.env.ENABLE_TREATMENT_RECOMMENDATIONS !== 'false',
    enableConversationMemory: process.env.ENABLE_CONVERSATION_MEMORY !== 'false',
    enableMedicalEntityExtraction: process.env.ENABLE_MEDICAL_ENTITY_EXTRACTION !== 'false'
  };

  return configSchema.parse(rawConfig);
};

export const config = parseConfig();

// Helper function to get database connection string
export const getDatabaseUrl = (): string => {
  if (config.databaseUrl) {
    return config.databaseUrl;
  }
  
  const ssl = config.dbSsl ? '?sslmode=require' : '';
  return `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}${ssl}`;
};

// Helper function to get Redis connection options
export const getRedisOptions = () => {
  if (config.redisUrl) {
    return { url: config.redisUrl };
  }
  
  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: config.redisDb
  };
};

export type Config = typeof config;