import type { FastifyInstance } from 'fastify';
import type { MedicalAssistant } from '../src/core/medical-assistant';
import type { MonitoringService } from '../src/core/monitoring';

declare module 'fastify' {
  interface FastifyInstance {
    medicalAssistant?: MedicalAssistant;
    monitoringService?: MonitoringService;
  }
}

export {};
