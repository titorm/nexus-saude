/**
 * Logger utility for ML Service
 */

import pino from 'pino';
import { config } from '../config/index.js';

// Create pino logger
export const logger = pino({
  level: config.server.logLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Structured logging helpers
export const logError = (message: string, error: Error, context?: any) => {
  logger.error({
    message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
};

export const logInfo = (message: string, context?: any) => {
  logger.info({ message, context });
};

export const logWarn = (message: string, context?: any) => {
  logger.warn({ message, context });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug({ message, context });
};
