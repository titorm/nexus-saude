/**
 * Logging utility for Monitoring Service
 */

import { config } from '../config/index.js';

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  service: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const service = 'monitoring-ts';

    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${service}] ${message}`;

    if (data) {
      logMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }

    return logMessage;
  }

  private addLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      service: 'monitoring-ts',
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  debug(message: string, data?: any): void {
    if (config.env === 'development') {
      console.debug(this.formatMessage('debug', message, data));
    }
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any): void {
    console.info(this.formatMessage('info', message, data));
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data));
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data));
    this.addLog('error', message, data);
  }

  getLogs(limit?: number, level?: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = this.logs.filter((log) => log.level === level);
    }

    if (limit) {
      return filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogStats(): { total: number; byLevel: Record<string, number> } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      },
    };

    this.logs.forEach((log) => {
      stats.byLevel[log.level]++;
    });

    return stats;
  }
}

export const logger = new Logger();
export default logger;
