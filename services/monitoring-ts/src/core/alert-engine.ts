/**
 * Alert Engine - Manages alerts and notifications
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { NotificationService } from '../services/notification.service.js';

export interface Alert {
  id: string;
  type: 'system' | 'patient' | 'service' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  source: string;
  data?: any;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  severity: Alert['severity'];
  condition: string;
  threshold?: number;
  enabled: boolean;
  cooldown?: number; // Minimum time between alerts in milliseconds
}

export class AlertEngine {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private lastAlertTimes: Map<string, Date> = new Map();
  private isRunning = false;

  constructor(private notificationService: NotificationService) {
    this.initializeDefaultRules();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Alert engine is already running');
      return;
    }

    logger.info('Starting alert engine...');
    this.isRunning = true;

    // Start alert cleanup job (every hour)
    setInterval(
      () => {
        this.cleanupOldAlerts();
      },
      60 * 60 * 1000
    );

    logger.info('Alert engine started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping alert engine...');
    this.isRunning = false;
    logger.info('Alert engine stopped');
  }

  async sendAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    // Check if we should throttle this alert
    const ruleKey = `${alertData.type}_${alertData.severity}_${alertData.source}`;
    const lastAlertTime = this.lastAlertTimes.get(ruleKey);
    const now = new Date();

    // Find matching rule to check cooldown
    const matchingRule = Array.from(this.alertRules.values()).find(
      (rule) => rule.type === alertData.type && rule.severity === alertData.severity
    );

    if (matchingRule?.cooldown && lastAlertTime) {
      const timeSinceLastAlert = now.getTime() - lastAlertTime.getTime();
      if (timeSinceLastAlert < matchingRule.cooldown) {
        logger.debug(`Alert throttled due to cooldown: ${alertData.message}`);
        return '';
      }
    }

    // Create alert
    const alertId = this.generateAlertId();
    const alert: Alert = {
      ...alertData,
      id: alertId,
      timestamp: now,
      resolved: false,
    };

    // Store alert
    this.alerts.set(alertId, alert);
    this.lastAlertTimes.set(ruleKey, now);

    // Log alert
    logger.warn(`Alert generated: [${alert.severity.toUpperCase()}] ${alert.message}`, {
      alertId,
      type: alert.type,
      source: alert.source,
      data: alert.data,
    });

    // Send notifications based on severity and configuration
    await this.sendNotifications(alert);

    return alertId;
  }

  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);

    if (!alert) {
      logger.warn(`Attempted to resolve non-existent alert: ${alertId}`);
      return false;
    }

    if (alert.resolved) {
      logger.warn(`Alert already resolved: ${alertId}`);
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    this.alerts.set(alertId, alert);

    logger.info(`Alert resolved: ${alertId}`, {
      message: alert.message,
      resolvedBy,
    });

    return true;
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  getAlerts(filters?: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    resolved?: boolean;
    since?: Date;
    limit?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters?.type) {
      alerts = alerts.filter((alert) => alert.type === filters.type);
    }

    if (filters?.severity) {
      alerts = alerts.filter((alert) => alert.severity === filters.severity);
    }

    if (filters?.resolved !== undefined) {
      alerts = alerts.filter((alert) => alert.resolved === filters.resolved);
    }

    if (filters?.since) {
      alerts = alerts.filter((alert) => alert.timestamp >= filters.since!);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  getActiveAlerts(): Alert[] {
    return this.getAlerts({ resolved: false });
  }

  getCriticalAlerts(): Alert[] {
    return this.getAlerts({ severity: 'critical', resolved: false });
  }

  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<Alert['severity'], number>;
    byType: Record<Alert['type'], number>;
  } {
    const alerts = Array.from(this.alerts.values());

    const stats = {
      total: alerts.length,
      active: alerts.filter((a) => !a.resolved).length,
      resolved: alerts.filter((a) => a.resolved).length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<Alert['severity'], number>,
      byType: {
        system: 0,
        patient: 0,
        service: 0,
        security: 0,
      } as Record<Alert['type'], number>,
    };

    alerts.forEach((alert) => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type]++;
    });

    return stats;
  }

  addRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info(`Alert rule added: ${rule.name}`, { ruleId: rule.id });
  }

  removeRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      logger.info(`Alert rule removed: ${ruleId}`);
    }
    return removed;
  }

  getRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const channels = config.alerts.priorities[alert.severity] || [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            if (config.email.enabled) {
              await this.notificationService.sendEmail({
                to: config.email.from, // In production, use proper recipient list
                subject: `[${alert.severity.toUpperCase()}] Nexus Saúde Alert`,
                text: this.formatAlertForEmail(alert),
              });
            }
            break;

          case 'websocket':
            await this.notificationService.sendWebSocketMessage('alert', alert);
            break;

          default:
            logger.warn(`Unknown notification channel: ${channel}`);
        }
      } catch (error) {
        logger.error(`Failed to send notification via ${channel}`, { error, alert });
      }
    }
  }

  private formatAlertForEmail(alert: Alert): string {
    return `
Alert Details:
- ID: ${alert.id}
- Type: ${alert.type}
- Severity: ${alert.severity}
- Message: ${alert.message}
- Source: ${alert.source}
- Timestamp: ${alert.timestamp.toISOString()}

${alert.data ? `Additional Data: ${JSON.stringify(alert.data, null, 2)}` : ''}

This alert was generated by the Nexus Saúde monitoring system.
    `.trim();
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldAlerts(): void {
    const retentionPeriod = config.monitoring.retention.alerts * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const cutoffTime = new Date(Date.now() - retentionPeriod);

    let removedCount = 0;

    for (const [alertId, alert] of this.alerts) {
      if (alert.timestamp < cutoffTime && alert.resolved) {
        this.alerts.delete(alertId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old resolved alerts`);
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu_high',
        name: 'High CPU Usage',
        type: 'system',
        severity: 'high',
        condition: 'cpu_usage > threshold',
        threshold: config.monitoring.thresholds.cpu,
        enabled: true,
        cooldown: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'memory_high',
        name: 'High Memory Usage',
        type: 'system',
        severity: 'high',
        condition: 'memory_usage > threshold',
        threshold: config.monitoring.thresholds.memory,
        enabled: true,
        cooldown: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'disk_high',
        name: 'High Disk Usage',
        type: 'system',
        severity: 'high',
        condition: 'disk_usage > threshold',
        threshold: config.monitoring.thresholds.disk,
        enabled: true,
        cooldown: 15 * 60 * 1000, // 15 minutes
      },
      {
        id: 'service_down',
        name: 'Service Down',
        type: 'service',
        severity: 'critical',
        condition: 'service_status != running',
        enabled: true,
        cooldown: 2 * 60 * 1000, // 2 minutes
      },
    ];

    defaultRules.forEach((rule) => this.addRule(rule));
  }
}

export default AlertEngine;
