/**
 * Scheduler Service for Data Warehouse
 * Manages ETL jobs, report generation, and data processing tasks
 */

import { logger } from '../utils/logger';

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  task?: () => Promise<void>;
}

export class SchedulerService {
  private running = false;
  private jobs: Map<string, ScheduledJob> = new Map();

  async start(): Promise<void> {
    logger.info('Starting scheduler service...');
    this.running = true;

    // Initialize scheduled jobs
    this.initializeJobs();

    logger.info('Scheduler service started');
  }

  async stop(): Promise<void> {
    logger.info('Stopping scheduler service...');
    this.running = false;

    // Clear all scheduled jobs
    this.jobs.clear();

    logger.info('Scheduler service stopped');
  }

  private initializeJobs(): void {
    // Mock scheduled jobs
    const jobs: ScheduledJob[] = [
      {
        id: 'etl-patient-data',
        name: 'ETL Patient Data',
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
      },
      {
        id: 'generate-reports',
        name: 'Generate Reports',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: true,
      },
      {
        id: 'cleanup-old-data',
        name: 'Cleanup Old Data',
        schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
        enabled: true,
      },
    ];

    jobs.forEach((job) => this.jobs.set(job.id, job));
    logger.info(`Initialized ${jobs.length} scheduled jobs`);
  }

  scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    logger.info(`Scheduling job: ${name} with schedule: ${schedule}`);

    const job: ScheduledJob = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      schedule,
      enabled: true,
      task,
      nextRun: new Date(Date.now() + 60000), // Next minute
    };

    this.jobs.set(job.id, job);
  }

  unscheduleJob(jobId: string): boolean {
    const removed = this.jobs.delete(jobId);
    if (removed) {
      logger.info(`Unscheduled job: ${jobId}`);
    }
    return removed;
  }

  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  isRunning(): boolean {
    return this.running;
  }

  async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (!job.enabled) {
      logger.warn(`Job is disabled: ${jobId}`);
      return;
    }

    try {
      logger.info(`Executing job: ${job.name}`);

      if (job.task) {
        await job.task();
      } else {
        // Mock execution for demo jobs
        await this.mockJobExecution(job);
      }

      job.lastRun = new Date();
      logger.info(`Job completed: ${job.name}`);
    } catch (error) {
      logger.error(`Job failed: ${job.name}`, error);
      throw error;
    }
  }

  private async mockJobExecution(job: ScheduledJob): Promise<void> {
    // Simulate job execution
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1000);
      // In a real implementation, we'd clear this timer if the service stops
      if (!this.running) {
        clearTimeout(timer);
        resolve();
      }
    });

    logger.info(`Mock execution completed for job: ${job.name}`);
  }

  enableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = true;
      logger.info(`Enabled job: ${jobId}`);
      return true;
    }
    return false;
  }

  disableJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      logger.info(`Disabled job: ${jobId}`);
      return true;
    }
    return false;
  }
}

export const schedulerService = new SchedulerService();
