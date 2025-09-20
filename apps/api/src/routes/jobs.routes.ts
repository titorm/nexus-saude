import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getSearchJobManager } from '../jobs/index.js';
import { JobType, JobStatus } from '../jobs/index.js';
import { authMiddleware } from '../middleware/auth.js';

// Validation schemas
const QueueIndexSyncSchema = z.object({
  entityType: z.enum(['patient', 'clinical_note', 'appointment']),
  entityId: z.number().int().positive(),
  operation: z.enum(['create', 'update', 'delete']).default('update'),
  hospitalId: z.number().int().positive(),
});

const QueueBulkReindexSchema = z.object({
  entityType: z.enum(['patient', 'clinical_note', 'appointment']).optional(),
  hospitalId: z.number().int().positive().optional(),
  batchSize: z.number().int().min(10).max(1000).default(100),
});

const QueueCleanupSchema = z.object({
  cleanupType: z.enum(['orphaned_indexes', 'old_history', 'failed_indexes']),
  olderThanDays: z.number().int().min(1).max(365).default(30),
  hospitalId: z.number().int().positive().optional(),
});

const QueueAnalyticsSchema = z.object({
  timeframe: z.enum(['hourly', 'daily', 'weekly']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  hospitalId: z.number().int().positive().optional(),
});

const JobActionSchema = z.object({
  jobId: z.string().min(1),
});

const GetJobsQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  type: z.nativeEnum(JobType).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Job management routes
 * Provides API endpoints for managing background jobs
 */
export async function jobRoutes(fastify: FastifyInstance) {
  // Apply authentication to all job routes
  fastify.addHook('preHandler', authMiddleware);

  /**
   * Get job queue statistics
   */
  fastify.get('/jobs/stats', async (request, reply) => {
    try {
      const jobManager = getSearchJobManager();
      const stats = await jobManager.getQueueStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get queue stats',
      });
    }
  });

  /**
   * Get jobs list with optional filtering
   */
  fastify.get('/jobs', async (request, reply) => {
    try {
      const query = GetJobsQuerySchema.parse(request.query);
      const jobManager = getSearchJobManager();

      let jobs;
      if (query.type) {
        jobs = await jobManager.getJobsByType(query.type);
      } else {
        // Get all jobs and filter by status if provided
        const allTypes = Object.values(JobType);
        const allJobs = await Promise.all(allTypes.map((type) => jobManager.getJobsByType(type)));
        jobs = allJobs.flat();
      }

      // Filter by status if provided
      if (query.status) {
        jobs = jobs.filter((job) => job.status === query.status);
      }

      // Apply limit
      jobs = jobs.slice(0, query.limit);

      return {
        success: true,
        data: jobs,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get jobs',
      });
    }
  });

  /**
   * Get a specific job by ID
   */
  fastify.get('/jobs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const jobManager = getSearchJobManager();

      const job = await jobManager.getJob(jobId);

      if (!job) {
        return reply.status(404).send({
          success: false,
          error: 'Job not found',
        });
      }

      return {
        success: true,
        data: job,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job',
      });
    }
  });

  /**
   * Queue a search index sync job
   */
  fastify.post('/jobs/index-sync', async (request, reply) => {
    try {
      const payload = QueueIndexSyncSchema.parse(request.body);
      const jobManager = getSearchJobManager();

      const jobId = await jobManager.queueIndexSync(payload);

      return {
        success: true,
        data: { jobId },
        message: 'Index sync job queued successfully',
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue index sync job',
      });
    }
  });

  /**
   * Queue a bulk reindex job
   */
  fastify.post('/jobs/bulk-reindex', async (request, reply) => {
    try {
      const payload = QueueBulkReindexSchema.parse(request.body);
      const jobManager = getSearchJobManager();

      const jobId = await jobManager.queueBulkReindex(payload);

      return {
        success: true,
        data: { jobId },
        message: 'Bulk reindex job queued successfully',
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue bulk reindex job',
      });
    }
  });

  /**
   * Queue a cleanup job
   */
  fastify.post('/jobs/cleanup', async (request, reply) => {
    try {
      const payload = QueueCleanupSchema.parse(request.body);
      const jobManager = getSearchJobManager();

      const jobId = await jobManager.queueCleanup(payload);

      return {
        success: true,
        data: { jobId },
        message: 'Cleanup job queued successfully',
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue cleanup job',
      });
    }
  });

  /**
   * Queue an analytics update job
   */
  fastify.post('/jobs/analytics', async (request, reply) => {
    try {
      const payload = QueueAnalyticsSchema.parse(request.body);
      const jobManager = getSearchJobManager();

      const jobId = await jobManager.queueAnalyticsUpdate(payload);

      return {
        success: true,
        data: { jobId },
        message: 'Analytics update job queued successfully',
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue analytics job',
      });
    }
  });

  /**
   * Retry a failed job
   */
  fastify.post('/jobs/:jobId/retry', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const jobManager = getSearchJobManager();

      await jobManager.retryJob(jobId);

      return {
        success: true,
        message: 'Job retry queued successfully',
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry job',
      });
    }
  });

  /**
   * Cancel a pending job
   */
  fastify.post('/jobs/:jobId/cancel', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const jobManager = getSearchJobManager();

      await jobManager.cancelJob(jobId);

      return {
        success: true,
        message: 'Job cancelled successfully',
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel job',
      });
    }
  });

  /**
   * Clear completed or failed jobs
   */
  fastify.delete('/jobs/clear', async (request, reply) => {
    try {
      const { status } = request.query as { status?: string };
      const jobManager = getSearchJobManager();

      const removedCount = await jobManager.clearJobs(status);

      return {
        success: true,
        data: { removedCount },
        message: `Cleared ${removedCount} jobs`,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear jobs',
      });
    }
  });

  /**
   * Trigger hospital reindex (convenience endpoint)
   */
  fastify.post('/jobs/hospital/:hospitalId/reindex', async (request, reply) => {
    try {
      const { hospitalId } = request.params as { hospitalId: string };
      const { batchSize = 100 } = request.body as { batchSize?: number };

      const jobManager = getSearchJobManager();
      const jobIds = await jobManager.reindexHospital(Number(hospitalId), batchSize);

      return {
        success: true,
        data: { jobIds },
        message: `Queued ${jobIds.length} reindex jobs for hospital ${hospitalId}`,
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue hospital reindex',
      });
    }
  });

  /**
   * Trigger system-wide reindex (convenience endpoint)
   */
  fastify.post('/jobs/system/reindex', async (request, reply) => {
    try {
      const { batchSize = 100 } = request.body as { batchSize?: number };

      const jobManager = getSearchJobManager();
      const jobId = await jobManager.reindexSystem(batchSize);

      return {
        success: true,
        data: { jobId },
        message: 'System reindex job queued successfully',
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue system reindex',
      });
    }
  });
}
