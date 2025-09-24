import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    systemMonitor?: import('../core/system-monitor').SystemMonitor;
    patientMonitor?: import('../core/patient-monitor').PatientMonitor;
    alertEngine?: import('../core/alert-engine').AlertEngine;
    metricsCollector?: import('../core/metrics-collector').MetricsCollector;
    dashboardManager?: import('../core/dashboard-manager').DashboardManager;
    databaseService?: import('../services/database.service').DatabaseService;
    notificationService?: import('../services/notification.service').NotificationService;
  }

  interface FastifySchema {
    description?: string;
    tags?: string[];
  }
}
