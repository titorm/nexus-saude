import pino from 'pino';
import { config } from '../config/index.js';

const isDevelopment = config.environment !== 'production';

export const logger = pino({
  level: config.logging.level,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          singleLine: false,
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: () => ({}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'patient.ssn',
      'patient.mrn',
      'patient.identifiers',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
