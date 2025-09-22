/**
 * Patient Routes
 * FHIR R4 Patient resource endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FHIRResource } from '../services/validation.service.js';

export async function patientRoutes(fastify: FastifyInstance): Promise<void> {
  // Create Patient
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const resource = request.body as FHIRResource;
      resource.resourceType = 'Patient';

      // Validate resource
      const validation = await fastify.fhirValidationService?.validateResource?.(resource);
      fastify.monitoringService?.recordValidation?.(validation?.isValid ?? false);

      if (!validation.isValid) {
        return reply.status(400).send({
          resourceType: 'OperationOutcome',
          issue: validation.errors.map((error: any) => ({
            severity: error.severity,
            code: error.code,
            details: { text: error.message },
            expression: [error.field],
          })),
        });
      }

      // Create resource
      const created = await fastify.resourceService.create(resource);
      fastify.monitoringService?.recordResourceOperation?.('create');

      reply.status(201).send(created);
    } catch (error) {
      reply.status(500).send({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'processing',
            details: { text: 'Error creating Patient' },
          },
        ],
      });
    }
  });

  // Read Patient
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const resource = await fastify.resourceService.read('Patient', id);
        fastify.monitoringService?.recordResourceOperation?.('read');

        if (!resource) {
          return reply.status(404).send({
            resourceType: 'OperationOutcome',
            issue: [
              {
                severity: 'error',
                code: 'not-found',
                details: { text: `Patient with ID ${id} not found` },
              },
            ],
          });
        }

        reply.send(resource);
      } catch (error) {
        reply.status(500).send({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'processing',
              details: { text: 'Error reading Patient' },
            },
          ],
        });
      }
    }
  );

  // Update Patient
  fastify.put(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const resource = request.body as FHIRResource;
        resource.resourceType = 'Patient';
        resource.id = id;

        // Validate resource
        const validation = await fastify.fhirValidationService?.validateResource?.(resource);
        fastify.monitoringService?.recordValidation?.(validation?.isValid ?? false);

        if (!validation.isValid) {
          return reply.status(400).send({
            resourceType: 'OperationOutcome',
            issue: validation.errors.map((error: any) => ({
              severity: error.severity,
              code: error.code,
              details: { text: error.message },
              expression: [error.field],
            })),
          });
        }

        // Update resource
        const updated = await fastify.resourceService.update(resource);
        fastify.monitoringService?.recordResourceOperation?.('update');

        reply.send(updated);
      } catch (error) {
        reply.status(500).send({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'processing',
              details: { text: 'Error updating Patient' },
            },
          ],
        });
      }
    }
  );

  // Delete Patient
  fastify.delete(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        await fastify.resourceService.delete('Patient', id);
        fastify.monitoringService?.recordResourceOperation?.('delete');

        reply.status(204).send();
      } catch (error) {
        reply.status(500).send({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'processing',
              details: { text: 'Error deleting Patient' },
            },
          ],
        });
      }
    }
  );

  // Search Patients
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queryParams = request.query as Record<string, any>;
      const params = {
        resourceType: 'Patient',
        ...queryParams,
      };
      const result = await fastify.resourceService.search(params);
      fastify.monitoringService?.recordResourceOperation?.('search');

      const bundle = fastify.resourceService.createBundle(
        'searchset',
        result.resources,
        result.total
      );
      reply.send(bundle);
    } catch (error) {
      reply.status(500).send({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'processing',
            details: { text: 'Error searching Patients' },
          },
        ],
      });
    }
  });
}
