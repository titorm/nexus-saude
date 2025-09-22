/**
 * Patient Monitor - Healthcare-specific monitoring for patient data and systems
 */

import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { DatabaseService } from '../services/database.service.js';
import type { AlertEngine } from './alert-engine.js';

export interface PatientAlert {
  patientId: string;
  type: 'vitals' | 'medication' | 'appointment' | 'emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface VitalSigns {
  patientId: string;
  timestamp: Date;
  heartRate?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  temperature?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
}

export interface PatientMetrics {
  totalPatients: number;
  activePatients: number;
  criticalPatients: number;
  recentVitalSigns: number;
  alertCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export class PatientMonitor {
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private vitalSigns: Map<string, VitalSigns[]> = new Map();
  private patientAlerts: Map<string, PatientAlert[]> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private alertEngine: AlertEngine
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Patient monitor is already running');
      return;
    }

    logger.info('Starting patient monitor...');
    this.isRunning = true;

    // Start patient monitoring loop
    this.monitoringInterval = setInterval(
      () => this.performPatientMonitoring(),
      config.monitoring.intervals.patient
    );

    // Perform initial monitoring
    await this.performPatientMonitoring();

    logger.info('Patient monitor started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping patient monitor...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Patient monitor stopped');
  }

  private async performPatientMonitoring(): Promise<void> {
    try {
      await this.checkPatientVitals();
      await this.checkMedicationAlerts();
      await this.checkAppointmentReminders();
      await this.monitorSystemLoad();
    } catch (error) {
      logger.error('Error in patient monitoring cycle', { error });
    }
  }

  async recordVitalSigns(vitalSigns: VitalSigns): Promise<void> {
    const { patientId } = vitalSigns;

    // Store vital signs
    if (!this.vitalSigns.has(patientId)) {
      this.vitalSigns.set(patientId, []);
    }

    const patientVitals = this.vitalSigns.get(patientId)!;
    patientVitals.push(vitalSigns);

    // Keep only last 100 readings per patient
    if (patientVitals.length > 100) {
      patientVitals.splice(0, patientVitals.length - 100);
    }

    // Check for critical values
    await this.checkVitalSignsThresholds(vitalSigns);

    logger.debug('Vital signs recorded', { patientId });
  }

  private async checkVitalSignsThresholds(vitals: VitalSigns): Promise<void> {
    const alerts: PatientAlert[] = [];

    // Heart rate checks
    if (vitals.heartRate) {
      if (vitals.heartRate < 60 || vitals.heartRate > 100) {
        alerts.push({
          patientId: vitals.patientId,
          type: 'vitals',
          severity: vitals.heartRate < 50 || vitals.heartRate > 120 ? 'critical' : 'high',
          message: `Abnormal heart rate: ${vitals.heartRate} bpm`,
          timestamp: new Date(),
          data: { heartRate: vitals.heartRate },
        });
      }
    }

    // Blood pressure checks
    if (vitals.bloodPressure) {
      const { systolic, diastolic } = vitals.bloodPressure;
      if (systolic > 140 || diastolic > 90) {
        alerts.push({
          patientId: vitals.patientId,
          type: 'vitals',
          severity: systolic > 180 || diastolic > 110 ? 'critical' : 'high',
          message: `High blood pressure: ${systolic}/${diastolic} mmHg`,
          timestamp: new Date(),
          data: { bloodPressure: vitals.bloodPressure },
        });
      }
    }

    // Temperature checks
    if (vitals.temperature) {
      if (vitals.temperature > 38.0 || vitals.temperature < 36.0) {
        alerts.push({
          patientId: vitals.patientId,
          type: 'vitals',
          severity: vitals.temperature > 39.5 || vitals.temperature < 35.0 ? 'critical' : 'medium',
          message: `Abnormal temperature: ${vitals.temperature}°C`,
          timestamp: new Date(),
          data: { temperature: vitals.temperature },
        });
      }
    }

    // Oxygen saturation checks
    if (vitals.oxygenSaturation) {
      if (vitals.oxygenSaturation < 95) {
        alerts.push({
          patientId: vitals.patientId,
          type: 'vitals',
          severity: vitals.oxygenSaturation < 90 ? 'critical' : 'high',
          message: `Low oxygen saturation: ${vitals.oxygenSaturation}%`,
          timestamp: new Date(),
          data: { oxygenSaturation: vitals.oxygenSaturation },
        });
      }
    }

    // Send alerts
    for (const alert of alerts) {
      await this.createPatientAlert(alert);
    }
  }

  async createPatientAlert(alert: PatientAlert): Promise<void> {
    const { patientId } = alert;

    // Store patient alert
    if (!this.patientAlerts.has(patientId)) {
      this.patientAlerts.set(patientId, []);
    }

    const patientAlertsList = this.patientAlerts.get(patientId)!;
    patientAlertsList.push(alert);

    // Keep only last 50 alerts per patient
    if (patientAlertsList.length > 50) {
      patientAlertsList.splice(0, patientAlertsList.length - 50);
    }

    // Send to main alert engine
    await this.alertEngine.sendAlert({
      type: 'patient',
      severity: alert.severity,
      message: `Patient ${patientId}: ${alert.message}`,
      source: 'patient-monitor',
      data: {
        patientId,
        alertType: alert.type,
        ...alert.data,
      },
    });

    logger.info(`Patient alert created: ${alert.message}`, {
      patientId,
      type: alert.type,
      severity: alert.severity,
    });
  }

  async getPatientMetrics(): Promise<PatientMetrics> {
    const allPatients = Array.from(this.vitalSigns.keys());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count active patients (had vitals in last hour)
    let activePatients = 0;
    let recentVitalSigns = 0;

    for (const patientId of allPatients) {
      const patientVitals = this.vitalSigns.get(patientId)!;
      const recentVitals = patientVitals.filter((v) => v.timestamp > oneHourAgo);

      if (recentVitals.length > 0) {
        activePatients++;
        recentVitalSigns += recentVitals.length;
      }
    }

    // Count critical patients (have critical alerts)
    let criticalPatients = 0;
    const alertCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const patientId of allPatients) {
      const patientAlertsList = this.patientAlerts.get(patientId) || [];
      const recentAlerts = patientAlertsList.filter((a) => a.timestamp > oneHourAgo);

      let hasCritical = false;
      for (const alert of recentAlerts) {
        alertCounts[alert.severity]++;
        if (alert.severity === 'critical') {
          hasCritical = true;
        }
      }

      if (hasCritical) {
        criticalPatients++;
      }
    }

    return {
      totalPatients: allPatients.length,
      activePatients,
      criticalPatients,
      recentVitalSigns,
      alertCounts,
    };
  }

  async getPatientVitals(patientId: string, limit?: number): Promise<VitalSigns[]> {
    const vitals = this.vitalSigns.get(patientId) || [];

    if (limit) {
      return vitals.slice(-limit);
    }

    return [...vitals];
  }

  async getPatientAlerts(patientId: string, limit?: number): Promise<PatientAlert[]> {
    const alerts = this.patientAlerts.get(patientId) || [];

    if (limit) {
      return alerts.slice(-limit);
    }

    return [...alerts];
  }

  private async checkPatientVitals(): Promise<void> {
    // This would typically query a database for recent vital signs
    // For now, we'll simulate some patient monitoring

    logger.debug('Checking patient vitals...');

    // In a real implementation, this would:
    // 1. Query database for patients with recent vital signs
    // 2. Check for any concerning trends
    // 3. Generate alerts for critical values
  }

  private async checkMedicationAlerts(): Promise<void> {
    // Check for medication reminders, interactions, etc.
    logger.debug('Checking medication alerts...');
  }

  private async checkAppointmentReminders(): Promise<void> {
    // Check for upcoming appointments that need reminders
    logger.debug('Checking appointment reminders...');
  }

  private async monitorSystemLoad(): Promise<void> {
    // Monitor system load specific to patient data processing
    const patientMetrics = await this.getPatientMetrics();

    if (patientMetrics.criticalPatients > 0) {
      logger.info(`${patientMetrics.criticalPatients} patients require critical attention`);
    }
  }

  // Utility methods for testing and simulation
  async simulatePatientData(): Promise<void> {
    const patientIds = ['patient-001', 'patient-002', 'patient-003'];

    for (const patientId of patientIds) {
      const vitals: VitalSigns = {
        patientId,
        timestamp: new Date(),
        heartRate: 60 + Math.floor(Math.random() * 40), // 60-100 bpm
        bloodPressure: {
          systolic: 90 + Math.floor(Math.random() * 40), // 90-130 mmHg
          diastolic: 60 + Math.floor(Math.random() * 20), // 60-80 mmHg
        },
        temperature: 36.0 + Math.random() * 2, // 36-38°C
        oxygenSaturation: 95 + Math.floor(Math.random() * 5), // 95-100%
        respiratoryRate: 12 + Math.floor(Math.random() * 8), // 12-20 breaths/min
      };

      await this.recordVitalSigns(vitals);
    }
  }
}

export default PatientMonitor;
