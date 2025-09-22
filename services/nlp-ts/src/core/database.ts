import pg from 'pg';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export interface NLPProcessingLog {
  id?: string;
  document_id: string;
  processing_type: string;
  input_text_length: number;
  output_data: any;
  processing_time: number;
  confidence: number;
  status: 'success' | 'error' | 'partial';
  error_message?: string;
  created_at?: Date;
}

export interface DocumentClassificationLog {
  id?: string;
  document_id: string;
  document_type: string;
  confidence: number;
  urgency_level: string;
  specialty_area?: string;
  processing_priority: number;
  metadata: any;
  created_at?: Date;
}

export interface EntityExtractionLog {
  id?: string;
  document_id: string;
  entities_count: number;
  entity_types: string[];
  average_confidence: number;
  extraction_time: number;
  metadata: any;
  created_at?: Date;
}

export interface SummarizationLog {
  id?: string;
  document_id: string;
  original_length: number;
  summary_length: number;
  compression_ratio: number;
  summary_type: string;
  confidence: number;
  key_points_count: number;
  processing_time: number;
  created_at?: Date;
}

export interface StructuredExtractionLog {
  id?: string;
  document_id: string;
  fields_extracted: string[];
  extraction_confidence: number;
  completeness_score: number;
  data_quality_score: number;
  processing_time: number;
  created_at?: Date;
}

export interface UsageStatistics {
  total_documents_processed: number;
  total_processing_time: number;
  average_processing_time: number;
  success_rate: number;
  most_common_document_types: string[];
  daily_usage: number;
  monthly_usage: number;
}

export class DatabaseService {
  private pool: pg.Pool | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    logger.info('Initializing Database Service');
  }

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to PostgreSQL database...');
      
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl,
        max: config.database.maxConnections,
        connectionTimeoutMillis: config.database.connectionTimeout,
        idleTimeoutMillis: 30000,
        query_timeout: 60000,
        statement_timeout: 60000
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Initialize database tables
      await this.initializeTables();

      this.connected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), 5000);
      } else {
        throw new Error(`Failed to connect to database after ${this.maxReconnectAttempts} attempts`);
      }
    }
  }

  private async initializeTables(): Promise<void> {
    if (!this.pool) throw new Error('Database pool not initialized');

    const tables = [
      // NLP Processing logs
      `CREATE TABLE IF NOT EXISTS nlp_processing_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) NOT NULL,
        processing_type VARCHAR(100) NOT NULL,
        input_text_length INTEGER NOT NULL,
        output_data JSONB,
        processing_time INTEGER NOT NULL,
        confidence DECIMAL(3,2),
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Document classification logs
      `CREATE TABLE IF NOT EXISTS document_classification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        urgency_level VARCHAR(20) NOT NULL,
        specialty_area VARCHAR(100),
        processing_priority INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Entity extraction logs
      `CREATE TABLE IF NOT EXISTS entity_extraction_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) NOT NULL,
        entities_count INTEGER NOT NULL,
        entity_types TEXT[],
        average_confidence DECIMAL(3,2),
        extraction_time INTEGER NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Summarization logs
      `CREATE TABLE IF NOT EXISTS summarization_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) NOT NULL,
        original_length INTEGER NOT NULL,
        summary_length INTEGER NOT NULL,
        compression_ratio DECIMAL(4,3),
        summary_type VARCHAR(50),
        confidence DECIMAL(3,2),
        key_points_count INTEGER,
        processing_time INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Structured extraction logs
      `CREATE TABLE IF NOT EXISTS structured_extraction_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(255) NOT NULL,
        fields_extracted TEXT[],
        extraction_confidence DECIMAL(3,2),
        completeness_score DECIMAL(3,2),
        data_quality_score DECIMAL(3,2),
        processing_time INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (const tableSQL of tables) {
      try {
        await this.pool.query(tableSQL);
      } catch (error) {
        logger.error('Failed to create table:', error);
      }
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_nlp_logs_document_id ON nlp_processing_logs(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_nlp_logs_created_at ON nlp_processing_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_classification_document_id ON document_classification_logs(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_classification_type ON document_classification_logs(document_type)',
      'CREATE INDEX IF NOT EXISTS idx_entity_extraction_document_id ON entity_extraction_logs(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_summarization_document_id ON summarization_logs(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_structured_extraction_document_id ON structured_extraction_logs(document_id)'
    ];

    for (const indexSQL of indexes) {
      try {
        await this.pool.query(indexSQL);
      } catch (error) {
        logger.warn('Failed to create index:', error);
      }
    }

    logger.info('Database tables and indexes initialized');
  }

  async logNLPProcessing(log: NLPProcessingLog): Promise<string> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO nlp_processing_logs 
        (document_id, processing_type, input_text_length, output_data, processing_time, confidence, status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const values = [
        log.document_id,
        log.processing_type,
        log.input_text_length,
        JSON.stringify(log.output_data),
        log.processing_time,
        log.confidence,
        log.status,
        log.error_message
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log NLP processing:', error);
      throw error;
    }
  }

  async logDocumentClassification(log: DocumentClassificationLog): Promise<string> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO document_classification_logs 
        (document_id, document_type, confidence, urgency_level, specialty_area, processing_priority, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const values = [
        log.document_id,
        log.document_type,
        log.confidence,
        log.urgency_level,
        log.specialty_area,
        log.processing_priority,
        JSON.stringify(log.metadata)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log document classification:', error);
      throw error;
    }
  }

  async logEntityExtraction(log: EntityExtractionLog): Promise<string> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO entity_extraction_logs 
        (document_id, entities_count, entity_types, average_confidence, extraction_time, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const values = [
        log.document_id,
        log.entities_count,
        log.entity_types,
        log.average_confidence,
        log.extraction_time,
        JSON.stringify(log.metadata)
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log entity extraction:', error);
      throw error;
    }
  }

  async logSummarization(log: SummarizationLog): Promise<string> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO summarization_logs 
        (document_id, original_length, summary_length, compression_ratio, summary_type, confidence, key_points_count, processing_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      const values = [
        log.document_id,
        log.original_length,
        log.summary_length,
        log.compression_ratio,
        log.summary_type,
        log.confidence,
        log.key_points_count,
        log.processing_time
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log summarization:', error);
      throw error;
    }
  }

  async logStructuredExtraction(log: StructuredExtractionLog): Promise<string> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO structured_extraction_logs 
        (document_id, fields_extracted, extraction_confidence, completeness_score, data_quality_score, processing_time)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const values = [
        log.document_id,
        log.fields_extracted,
        log.extraction_confidence,
        log.completeness_score,
        log.data_quality_score,
        log.processing_time
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to log structured extraction:', error);
      throw error;
    }
  }

  async getUsageStatistics(days: number = 30): Promise<UsageStatistics> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const queries = [
        // Total documents processed
        `SELECT COUNT(*) as total_count FROM nlp_processing_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'`,
        
        // Total and average processing time
        `SELECT 
           SUM(processing_time) as total_time,
           AVG(processing_time) as avg_time
         FROM nlp_processing_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'`,
        
        // Success rate
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
         FROM nlp_processing_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'`,
        
        // Most common document types
        `SELECT document_type, COUNT(*) as count
         FROM document_classification_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY document_type 
         ORDER BY count DESC 
         LIMIT 5`,
        
        // Daily usage (today)
        `SELECT COUNT(*) as daily_count
         FROM nlp_processing_logs 
         WHERE DATE(created_at) = CURRENT_DATE`,
        
        // Monthly usage (current month)
        `SELECT COUNT(*) as monthly_count
         FROM nlp_processing_logs 
         WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`
      ];

      const results = await Promise.all(
        queries.map(query => this.pool!.query(query))
      );

      const [
        totalResult,
        timeResult,
        successResult,
        typesResult,
        dailyResult,
        monthlyResult
      ] = results;

      return {
        total_documents_processed: parseInt(totalResult.rows[0]?.total_count || '0'),
        total_processing_time: parseInt(timeResult.rows[0]?.total_time || '0'),
        average_processing_time: parseFloat(timeResult.rows[0]?.avg_time || '0'),
        success_rate: parseFloat(successResult.rows[0]?.success_rate || '0'),
        most_common_document_types: typesResult.rows.map((row: any) => row.document_type),
        daily_usage: parseInt(dailyResult.rows[0]?.daily_count || '0'),
        monthly_usage: parseInt(monthlyResult.rows[0]?.monthly_count || '0')
      };
    } catch (error) {
      logger.error('Failed to get usage statistics:', error);
      throw error;
    }
  }

  async getDocumentHistory(documentId: string): Promise<any[]> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const query = `
        SELECT 
          'nlp_processing' as log_type,
          processing_type,
          processing_time,
          confidence,
          status,
          created_at
        FROM nlp_processing_logs 
        WHERE document_id = $1
        
        UNION ALL
        
        SELECT 
          'classification' as log_type,
          document_type as processing_type,
          NULL as processing_time,
          confidence,
          'success' as status,
          created_at
        FROM document_classification_logs 
        WHERE document_id = $1
        
        UNION ALL
        
        SELECT 
          'entity_extraction' as log_type,
          'entity_extraction' as processing_type,
          extraction_time as processing_time,
          average_confidence as confidence,
          'success' as status,
          created_at
        FROM entity_extraction_logs 
        WHERE document_id = $1
        
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query, [documentId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get document history:', error);
      throw error;
    }
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    if (!this.pool) throw new Error('Database not connected');

    try {
      const tables = [
        'nlp_processing_logs',
        'document_classification_logs',
        'entity_extraction_logs',
        'summarization_logs',
        'structured_extraction_logs'
      ];

      let totalDeleted = 0;

      for (const table of tables) {
        const query = `
          DELETE FROM ${table} 
          WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        `;
        
        const result = await this.pool.query(query);
        totalDeleted += result.rowCount || 0;
        
        logger.info(`Cleaned up ${result.rowCount || 0} old records from ${table}`);
      }

      logger.info(`Total cleanup: ${totalDeleted} records deleted`);
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to cleanup old logs:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<any> {
    if (!this.pool) return { connected: false };

    return {
      connected: this.connected,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
      maxConnections: config.database.maxConnections
    };
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.connected = false;
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection:', error);
      }
    }
  }
}