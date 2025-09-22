/**
 * API Routes setup
 */

import type { FastifyInstance } from 'fastify';

interface PredictionRequest {
  patientData: Record<string, unknown>;
  modelType: 'diagnosis' | 'risk' | 'outcome';
}

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  // Use decorated services (declared in `src/types/fastify.d.ts`)
  const mlPipeline = fastify.mlPipeline;
  const monitoringService = fastify.monitoringService;
  // Predictions endpoint
  fastify.post<{ Body: PredictionRequest }>('/api/v1/predictions', async (request, reply) => {
    try {
      monitoringService?.incrementRequestCount?.();

      const { patientData, modelType } = request.body;

      if (!patientData || !modelType) {
        return reply.status(400).send({
          error: 'Missing required fields: patientData, modelType',
        });
      }

      const result = await mlPipeline.predict({
        patientData,
        modelType,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      monitoringService?.incrementErrorCount?.();
      fastify.log.error('Prediction error: ' + String(error));
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Diagnosis prediction
  fastify.post('/api/v1/predict/diagnosis', async (request, reply) => {
    try {
      const result = await mlPipeline.predict({
        patientData: request.body as Record<string, unknown>,
        modelType: 'diagnosis',
      });
      return reply.send(result);
    } catch (error) {
      fastify.log.error('Diagnosis prediction error: ' + String(error));
      return reply.status(500).send({ error: 'Prediction failed' });
    }
  });

  // Risk assessment
  fastify.post('/api/v1/predict/risk', async (request, reply) => {
    try {
      const result = await mlPipeline.predict({
        patientData: request.body as Record<string, unknown>,
        modelType: 'risk',
      });
      return reply.send(result);
    } catch (error) {
      fastify.log.error('Risk prediction error: ' + String(error));
      return reply.status(500).send({ error: 'Risk assessment failed' });
    }
  });

  // Outcome prediction
  fastify.post('/api/v1/predict/outcome', async (request, reply) => {
    try {
      const result = await mlPipeline.predict({
        patientData: request.body as Record<string, unknown>,
        modelType: 'outcome',
      });
      return reply.send(result);
    } catch (error) {
      fastify.log.error('Outcome prediction error: ' + String(error));
      return reply.status(500).send({ error: 'Outcome prediction failed' });
    }
  });

  // Model info
  fastify.get('/api/v1/models', async (request, reply) => {
    return reply.send({
      models: [
        { name: 'diagnosis', version: '1.0', status: 'active' },
        { name: 'risk', version: '1.0', status: 'active' },
        { name: 'outcome', version: '1.0', status: 'active' },
      ],
    });
  });
}
