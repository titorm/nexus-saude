declare module NodeJS {
  interface Global {
    etlPipeline?: import('../core/etl-pipeline').ETLPipeline;
    analyticsEngine?: import('../core/analytics-engine').AnalyticsEngine;
    reportGenerator?: import('../core/report-generator').ReportGenerator;
    dataConnector?: import('../core/data-connector').DataConnector;
    schedulerService?: import('../services/scheduler.service').SchedulerService;
    cacheService?: import('../services/cache.service').CacheService;
    databaseService?: import('../services/database.service').DatabaseService;
  }
}

declare const global: NodeJS.Global & typeof globalThis;

export {};
