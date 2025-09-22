/**
 * Logging utility for Data Warehouse Service
 */

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
    const service = 'data-warehouse-ts';

    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${service}] ${message}`;

    if (data) {
      logMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }

    return logMessage;
  }

  debug(message: string, data?: any): void {
    console.debug(this.formatMessage('debug', message, data));
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

  private addLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      service: 'data-warehouse-ts',
    };

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }
}

export const logger = new Logger();
export default logger;
