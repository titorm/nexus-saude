import type { Database } from '../db/index.js';

/**
 * Job types for the application
 */
export enum JobType {
  SEARCH_INDEX_SYNC = 'search_index_sync',
  SEARCH_BULK_REINDEX = 'search_bulk_reindex',
  SEARCH_CLEANUP = 'search_cleanup',
  SEARCH_ANALYTICS_UPDATE = 'search_analytics_update',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Base job payload interface
 */
export interface BaseJobPayload {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: Record<string, any>;
}

/**
 * Search index sync job payload
 */
export interface SearchIndexSyncJobPayload {
  entityType: 'patient' | 'clinical_note' | 'appointment';
  entityId: number;
  operation: 'create' | 'update' | 'delete';
  hospitalId: number;
}

/**
 * Bulk reindex job payload
 */
export interface SearchBulkReindexJobPayload {
  entityType?: 'patient' | 'clinical_note' | 'appointment';
  hospitalId?: number;
  batchSize?: number;
  startFromId?: number;
}

/**
 * Search cleanup job payload
 */
export interface SearchCleanupJobPayload {
  cleanupType: 'orphaned_indexes' | 'old_history' | 'failed_indexes';
  olderThanDays?: number;
  hospitalId?: number;
}

/**
 * Search analytics update job payload
 */
export interface SearchAnalyticsUpdateJobPayload {
  timeframe: 'hourly' | 'daily' | 'weekly';
  date: string;
  hospitalId?: number;
}

/**
 * Job processor interface
 */
export interface JobProcessor<T = any> {
  process(job: BaseJobPayload & { payload: T }, db: Database): Promise<Record<string, any>>;
}

/**
 * Job queue interface
 */
export interface JobQueue {
  add<T>(
    type: JobType,
    payload: T,
    options?: {
      priority?: JobPriority;
      delay?: number;
      maxAttempts?: number;
    }
  ): Promise<string>;

  start(): Promise<void>;
  stop(): Promise<void>;

  getJob(id: string): Promise<BaseJobPayload | null>;
  getJobs(status: JobStatus, limit?: number): Promise<BaseJobPayload[]>;

  retry(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  clear(status?: JobStatus): Promise<number>;
}
