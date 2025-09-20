import type { Database } from '../db/index.js';
import { InMemoryJobQueue } from './queue.js';
import {
  JobType,
  JobPriority,
  type SearchIndexSyncJobPayload,
  type SearchBulkReindexJobPayload,
  type SearchCleanupJobPayload,
  type SearchAnalyticsUpdateJobPayload,
} from './types.js';

/**
 * Search Job Manager
 * Provides high-level methods for managing search-related background jobs
 */
export class SearchJobManager {
  private queue: InMemoryJobQueue;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.queue = new InMemoryJobQueue(db);
  }

  /**
   * Start the job processing
   */
  async start(): Promise<void> {
    await this.queue.start();

    // Schedule periodic cleanup jobs
    this.schedulePeriodicJobs();
  }

  /**
   * Stop the job processing
   */
  async stop(): Promise<void> {
    await this.queue.stop();
  }

  /**
   * Queue a search index synchronization job
   * Called when entities are created, updated, or deleted
   */
  async queueIndexSync(payload: SearchIndexSyncJobPayload): Promise<string> {
    return await this.queue.add(JobType.SEARCH_INDEX_SYNC, payload, {
      priority: JobPriority.HIGH, // Index sync is important for data consistency
      maxAttempts: 3,
    });
  }

  /**
   * Queue a bulk reindexing job
   * Used for large-scale index rebuilding
   */
  async queueBulkReindex(payload: SearchBulkReindexJobPayload): Promise<string> {
    return await this.queue.add(JobType.SEARCH_BULK_REINDEX, payload, {
      priority: JobPriority.NORMAL,
      maxAttempts: 1, // Bulk operations shouldn't be retried automatically
    });
  }

  /**
   * Queue a search cleanup job
   * Used for maintenance tasks
   */
  async queueCleanup(payload: SearchCleanupJobPayload): Promise<string> {
    return await this.queue.add(JobType.SEARCH_CLEANUP, payload, {
      priority: JobPriority.LOW,
      maxAttempts: 2,
    });
  }

  /**
   * Queue a search analytics update job
   * Used for periodic analytics calculations
   */
  async queueAnalyticsUpdate(payload: SearchAnalyticsUpdateJobPayload): Promise<string> {
    return await this.queue.add(JobType.SEARCH_ANALYTICS_UPDATE, payload, {
      priority: JobPriority.LOW,
      maxAttempts: 2,
    });
  }

  /**
   * Convenience method to sync a patient index
   */
  async syncPatientIndex(
    patientId: number,
    hospitalId: number,
    operation: 'create' | 'update' | 'delete' = 'update'
  ): Promise<string> {
    return await this.queueIndexSync({
      entityType: 'patient',
      entityId: patientId,
      operation,
      hospitalId,
    });
  }

  /**
   * Convenience method to sync a clinical note index
   */
  async syncClinicalNoteIndex(
    noteId: number,
    hospitalId: number,
    operation: 'create' | 'update' | 'delete' = 'update'
  ): Promise<string> {
    return await this.queueIndexSync({
      entityType: 'clinical_note',
      entityId: noteId,
      operation,
      hospitalId,
    });
  }

  /**
   * Convenience method to sync an appointment index
   */
  async syncAppointmentIndex(
    appointmentId: number,
    hospitalId: number,
    operation: 'create' | 'update' | 'delete' = 'update'
  ): Promise<string> {
    return await this.queueIndexSync({
      entityType: 'appointment',
      entityId: appointmentId,
      operation,
      hospitalId,
    });
  }

  /**
   * Reindex all entities for a hospital
   */
  async reindexHospital(hospitalId: number, batchSize = 100): Promise<string[]> {
    const jobIds: string[] = [];

    // Queue reindex jobs for each entity type
    const entityTypes: Array<'patient' | 'clinical_note' | 'appointment'> = [
      'patient',
      'clinical_note',
      'appointment',
    ];

    for (const entityType of entityTypes) {
      const jobId = await this.queueBulkReindex({
        entityType,
        hospitalId,
        batchSize,
      });
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Perform full system reindex (all hospitals, all entities)
   */
  async reindexSystem(batchSize = 100): Promise<string> {
    return await this.queueBulkReindex({
      batchSize,
    });
  }

  /**
   * Clean up orphaned search indexes
   */
  async cleanupOrphanedIndexes(hospitalId?: number): Promise<string> {
    return await this.queueCleanup({
      cleanupType: 'orphaned_indexes',
      hospitalId,
    });
  }

  /**
   * Clean up old search history
   */
  async cleanupOldHistory(olderThanDays = 90, hospitalId?: number): Promise<string> {
    return await this.queueCleanup({
      cleanupType: 'old_history',
      olderThanDays,
      hospitalId,
    });
  }

  /**
   * Update search analytics for a specific timeframe
   */
  async updateAnalytics(
    timeframe: 'hourly' | 'daily' | 'weekly',
    date: string,
    hospitalId?: number
  ): Promise<string> {
    return await this.queueAnalyticsUpdate({
      timeframe,
      date,
      hospitalId,
    });
  }

  /**
   * Get job queue statistics
   */
  async getQueueStats() {
    return await this.queue.getQueueStats();
  }

  /**
   * Get jobs by type
   */
  async getJobsByType(type: JobType) {
    return await this.queue.getJobsByType(type);
  }

  /**
   * Get a specific job
   */
  async getJob(jobId: string) {
    return await this.queue.getJob(jobId);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    await this.queue.retry(jobId);
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<void> {
    await this.queue.cancel(jobId);
  }

  /**
   * Clear completed or failed jobs
   */
  async clearJobs(status?: string): Promise<number> {
    return await this.queue.clear(status as any);
  }

  /**
   * Schedule periodic maintenance jobs
   */
  private schedulePeriodicJobs(): void {
    // Clean up old completed jobs every hour
    setInterval(
      async () => {
        try {
          const removed = await this.queue.cleanupOldJobs(24); // Remove jobs older than 24 hours
          if (removed > 0) {
            console.log(`Cleaned up ${removed} old jobs`);
          }
        } catch (error) {
          console.error('Error cleaning up old jobs:', error);
        }
      },
      60 * 60 * 1000
    ); // Every hour

    // Clean up orphaned search indexes daily
    setInterval(
      async () => {
        try {
          await this.cleanupOrphanedIndexes();
          console.log('Scheduled orphaned indexes cleanup');
        } catch (error) {
          console.error('Error scheduling orphaned indexes cleanup:', error);
        }
      },
      24 * 60 * 60 * 1000
    ); // Every 24 hours

    // Update daily analytics
    setInterval(
      async () => {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          await this.updateAnalytics('daily', yesterday.toISOString().split('T')[0]);
          console.log('Scheduled daily analytics update');
        } catch (error) {
          console.error('Error scheduling daily analytics update:', error);
        }
      },
      24 * 60 * 60 * 1000
    ); // Every 24 hours
  }
}

// Singleton instance
let searchJobManager: SearchJobManager | null = null;

/**
 * Get or create the global SearchJobManager instance
 */
export function getSearchJobManager(db?: Database): SearchJobManager {
  if (!searchJobManager) {
    if (!db) {
      throw new Error('Database instance required to initialize SearchJobManager');
    }
    searchJobManager = new SearchJobManager(db);
  }
  return searchJobManager;
}

/**
 * Initialize the search job manager
 * Call this during application startup
 */
export async function initializeSearchJobManager(db: Database): Promise<SearchJobManager> {
  const manager = getSearchJobManager(db);
  await manager.start();
  return manager;
}
