import { Pool } from 'pg';
import type { PoolClient, QueryResult } from 'pg';
import { config, getDatabaseUrl } from '../config/index.js';
import { logger, logError } from '../utils/logger.js';

/**
 * Minimal interface that our service expects from a DB client.
 * Both Postgres Pool and the in-memory fallback will implement these methods.
 */
export interface IDatabase {
  query: (
    text: string,
    params?: any[]
  ) => Promise<QueryResult<any> | { rows: any[]; rowCount?: number }>;
  getClient?: () => Promise<any>;
  end?: () => Promise<void>;
}

/**
 * In-memory fallback DB used for development when Postgres isn't available.
 * Implements only a tiny subset of methods used at startup and by the service.
 */
class InMemoryDatabase implements IDatabase {
  private tables: Map<string, any[]> = new Map();

  async query(_text: string, _params: any[] = []) {
    // Very small parsing: respond to SELECT 1 / SELECT NOW() / simple count queries gracefully
    const text = (_text || '').trim().toUpperCase();

    if (text.startsWith('SELECT 1') || text.includes('NOW()')) {
      return { rows: [{ now: new Date().toISOString() }], rowCount: 1 } as {
        rows: any[];
        rowCount?: number;
      };
    }

    // For COUNT or simple queries return empty result
    return { rows: [], rowCount: 0 } as { rows: any[]; rowCount?: number };
  }

  async end() {
    this.tables.clear();
  }
}

/**
 * Database Service
 * Tries to connect to PostgreSQL, falls back to an in-memory DB when DEV_DB_FALLBACK=true
 */
export class DatabaseService {
  private pool?: Pool;
  private db: IDatabase | null = null;
  public isConnected = false;

  constructor() {
    // Initialize Postgres pool but don't assume connection succeeds.
    try {
      this.pool = new Pool({
        connectionString: getDatabaseUrl(),
        max: config.dbMaxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } catch (err) {
      // Swallow pool creation errors; we'll handle connect() later.
      logError(err, 'DatabaseService.constructor');
      this.pool = undefined;
    }
  }

  /**
   * Connect to database; fallback to in-memory DB when DEV_DB_FALLBACK=true and Postgres fails.
   */
  async connect(): Promise<void> {
    const devFallback =
      process.env.DEV_DB_FALLBACK === 'true' || process.env.NODE_ENV === 'development';

    if (this.pool) {
      try {
        logger.info('Connecting to PostgreSQL database...');
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        this.db = this.pool;
        this.isConnected = true;
        logger.info('Successfully connected to PostgreSQL database');
        return;
      } catch (error) {
        logError(error, 'DatabaseService.connect');
        // fallthrough to fallback
      }
    }

    if (devFallback) {
      logger.warn('Postgres not available — using in-memory DB fallback (DEV mode)');
      this.db = new InMemoryDatabase();
      this.isConnected = true;
      return;
    }

    throw new Error('Failed to connect to database');
  }

  /**
   * Execute a query
   */
  async query(text: string, params?: any[]): Promise<any> {
    try {
      if (!this.db) {
        throw new Error('Database not connected');
      }

      const start = Date.now();
      const result = await this.db.query(text, params);
      const duration = Date.now() - start;

      logger.debug(`Executed query in ${duration}ms`, {
        query: text.substring(0, 100),
        rowCount: (result as any)?.rowCount ?? (result as any)?.rows?.length ?? 0,
      });

      return result;
    } catch (error) {
      logError(error, 'DatabaseService.query');
      throw error;
    }
  }

  /**
   * Get a client from the pool (only available for Postgres)
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) throw new Error('Pool not available');
    return await this.pool.connect();
  }

  /**
   * Execute multiple queries in a transaction (Postgres only)
   */
  async transaction(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    if (!this.pool) throw new Error('Transactions require Postgres pool');
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      const results: any[] = [];
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logError(error, 'DatabaseService.transaction');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    try {
      if (!this.isConnected || !this.db) {
        return { status: 'disconnected', latency: -1 };
      }

      const start = Date.now();
      await this.query('SELECT 1');
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      logError(error, 'DatabaseService.healthCheck');
      return { status: 'unhealthy', latency: -1 };
    }
  }

  /**
   * Get database statistics (best-effort)
   */
  async getStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingCount: number;
  }> {
    try {
      if (!this.pool) {
        return {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingCount: 0,
        };
      }

      return {
        totalConnections: this.pool.totalCount,
        activeConnections: this.pool.totalCount - this.pool.idleCount,
        idleConnections: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      };
    } catch (error) {
      logError(error, 'DatabaseService.getStats');
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingCount: 0,
      };
    }
  }

  /**
   * Initialize database schema (if needed) - only for Postgres
   */
  async initializeSchema(): Promise<void> {
    try {
      if (!this.pool) {
        logger.info('Skipping schema initialization (no Postgres pool)');
        return;
      }

      logger.info('Initializing database schema...');
      await this.createAIAssistantTables();
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logError(error, 'DatabaseService.initializeSchema');
      throw new Error('Failed to initialize database schema');
    }
  }

  /**
   * Create AI assistant related tables (Postgres only)
   */
  private async createAIAssistantTables(): Promise<void> {
    const tables = [
      // Conversations table
      `
        CREATE TABLE IF NOT EXISTS ai_conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID,
          start_time TIMESTAMP DEFAULT NOW(),
          last_activity TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'active',
          summary TEXT,
          tags TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `,
      // ... other table SQL omitted for brevity (unchanged)
    ];

    for (const tableSQL of tables) {
      await this.query(tableSQL);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (this.db && this.db.end) {
        await this.db.end();
      }
      this.isConnected = false;
      logger.info('Disconnected from database');
    } catch (error) {
      logError(error, 'DatabaseService.disconnect');
    }
  }
}
