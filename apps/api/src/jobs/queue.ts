import { EventEmitter } from 'events';
import type { Database } from '../db/index.js';
import { JobType, JobPriority, JobStatus } from './types.js';
import type { JobQueue, BaseJobPayload, JobProcessor } from './types.js';
import {
  SearchIndexSyncProcessor,
  SearchBulkReindexProcessor,
  SearchCleanupProcessor,
  SearchAnalyticsUpdateProcessor,
} from './processors.js';

/**
 * In-memory job queue implementation
 * For production, consider using Redis or a dedicated queue service
 */
export class InMemoryJobQueue extends EventEmitter implements JobQueue {
  private jobs = new Map<string, BaseJobPayload>();
  private processors = new Map<JobType, JobProcessor>();
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private db: Database;

  constructor(db: Database) {
    super();
    this.db = db;
    this.setupProcessors();
  }

  private setupProcessors(): void {
    this.processors.set(JobType.SEARCH_INDEX_SYNC, new SearchIndexSyncProcessor());
    this.processors.set(JobType.SEARCH_BULK_REINDEX, new SearchBulkReindexProcessor());
    this.processors.set(JobType.SEARCH_CLEANUP, new SearchCleanupProcessor());
    this.processors.set(JobType.SEARCH_ANALYTICS_UPDATE, new SearchAnalyticsUpdateProcessor());
  }

  async add<T>(
    type: JobType,
    payload: T,
    options: {
      priority?: JobPriority;
      delay?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: BaseJobPayload = {
      id: jobId,
      type,
      payload: payload as Record<string, any>,
      priority: options.priority || JobPriority.NORMAL,
      status: JobStatus.PENDING,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
    };

    // Handle delayed jobs
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.jobs.set(jobId, job);
        this.emit('job:added', job);
      }, options.delay);
    } else {
      this.jobs.set(jobId, job);
      this.emit('job:added', job);
    }

    return jobId;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this.processNextJob().catch((error) => {
        console.error('Error processing job:', error);
      });
    }, 1000); // Process jobs every second

    console.log('Job queue started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('Job queue stopped');
  }

  async getJob(id: string): Promise<BaseJobPayload | null> {
    return this.jobs.get(id) || null;
  }

  async getJobs(status: JobStatus, limit = 50): Promise<BaseJobPayload[]> {
    const filteredJobs = Array.from(this.jobs.values())
      .filter((job) => job.status === status)
      .sort((a, b) => {
        // Sort by priority (higher first), then by creation date
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit);

    return filteredJobs;
  }

  async retry(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status !== JobStatus.FAILED) {
      throw new Error(`Job ${id} is not in failed status`);
    }

    job.status = JobStatus.PENDING;
    job.attempts = 0;
    job.error = undefined;
    job.failedAt = undefined;

    this.emit('job:retried', job);
  }

  async cancel(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status === JobStatus.PROCESSING) {
      throw new Error(`Cannot cancel job ${id} - currently processing`);
    }

    job.status = JobStatus.CANCELLED;
    this.emit('job:cancelled', job);
  }

  async clear(status?: JobStatus): Promise<number> {
    let removedCount = 0;

    if (status) {
      // Remove jobs with specific status
      const entries = Array.from(this.jobs.entries());
      for (const [id, job] of entries) {
        if (job.status === status) {
          this.jobs.delete(id);
          removedCount++;
        }
      }
    } else {
      // Remove all jobs
      removedCount = this.jobs.size;
      this.jobs.clear();
    }

    this.emit('jobs:cleared', { status, removedCount });
    return removedCount;
  }

  private async processNextJob(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Get the next pending job with highest priority
    const pendingJobs = Array.from(this.jobs.values())
      .filter((job) => job.status === JobStatus.PENDING)
      .sort((a, b) => {
        // Sort by priority (higher first), then by creation date
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (pendingJobs.length === 0) {
      return;
    }

    const job = pendingJobs[0];
    await this.processJob(job);
  }

  private async processJob(job: BaseJobPayload): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      console.error(`No processor found for job type: ${job.type}`);
      return;
    }

    try {
      // Mark job as processing
      job.status = JobStatus.PROCESSING;
      job.processingStartedAt = new Date();
      job.attempts++;
      this.emit('job:started', job);

      // Process the job
      const result = await processor.process(job, this.db);

      // Mark job as completed
      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result;
      this.emit('job:completed', job);

      console.log(`Job ${job.id} completed successfully:`, result);
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts >= job.maxAttempts) {
        // Max attempts reached, mark as failed
        job.status = JobStatus.FAILED;
        job.failedAt = new Date();
        this.emit('job:failed', job);
      } else {
        // Retry the job
        job.status = JobStatus.PENDING;
        this.emit('job:retry', job);
      }
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Statistics and monitoring methods
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const stats = {
      total: this.jobs.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    const jobs = Array.from(this.jobs.values());
    for (const job of jobs) {
      switch (job.status) {
        case JobStatus.PENDING:
          stats.pending++;
          break;
        case JobStatus.PROCESSING:
          stats.processing++;
          break;
        case JobStatus.COMPLETED:
          stats.completed++;
          break;
        case JobStatus.FAILED:
          stats.failed++;
          break;
        case JobStatus.CANCELLED:
          stats.cancelled++;
          break;
      }
    }

    return stats;
  }

  async getJobsByType(type: JobType): Promise<BaseJobPayload[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Cleanup old completed/failed jobs
  async cleanupOldJobs(olderThanHours = 24): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    let removedCount = 0;
    const entries = Array.from(this.jobs.entries());

    for (const [id, job] of entries) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.createdAt < cutoff
      ) {
        this.jobs.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.emit('jobs:cleanup', { removedCount, olderThanHours });
    }

    return removedCount;
  }
}
