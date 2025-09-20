// Export types
export type {
  BaseJobPayload,
  SearchIndexSyncJobPayload,
  SearchBulkReindexJobPayload,
  SearchCleanupJobPayload,
  SearchAnalyticsUpdateJobPayload,
  JobProcessor,
  JobQueue,
} from './types.js';

export { JobType, JobPriority, JobStatus } from './types.js';

// Export processors
export {
  SearchIndexSyncProcessor,
  SearchBulkReindexProcessor,
  SearchCleanupProcessor,
  SearchAnalyticsUpdateProcessor,
} from './processors.js';

// Export queue implementation
export { InMemoryJobQueue } from './queue.js';

// Export job manager
export { SearchJobManager, getSearchJobManager, initializeSearchJobManager } from './manager.js';
