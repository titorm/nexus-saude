import type { SystemMonitor } from '../core/system-monitor';
import type { PatientMonitor } from '../core/patient-monitor';
import type { AlertEngine } from '../core/alert-engine';
import type { MetricsCollector } from '../core/metrics-collector';
import type { DashboardManager } from '../core/dashboard-manager';
import type { DatabaseService } from '../services/database.service';
import type { NotificationService } from '../services/notification.service';

declare global {
  // Make these available on globalThis with correct types
  var systemMonitor: SystemMonitor;
  var patientMonitor: PatientMonitor;
  var alertEngine: AlertEngine;
  var metricsCollector: MetricsCollector;
  var dashboardManager: DashboardManager;
  var databaseService: DatabaseService;
  var notificationService: NotificationService;
}

export {};
