import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SearchService } from '../services/search.service.js';
import {
  globalSearchSchema,
  autocompleteSchema,
  searchPatientsSchema,
  searchClinicalNotesSchema,
  searchAppointmentsSchema,
  searchHistoryQuerySchema,
  searchAnalyticsSchema,
  searchEventSchema,
} from '../schemas/search.js';

const searchService = new SearchService();

// Search routes function
export async function searchRoutes(fastify: FastifyInstance) {
  // Global Search
  fastify.get(
    '/search/global',
    {
      schema: {
        querystring: globalSearchSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              results: { type: 'array' },
              total: { type: 'number' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof globalSearchSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { q, limit = 20, offset = 0, types, filters } = request.query;

        const results = await searchService.globalSearch(
          {
            q,
            limit,
            offset,
            types,
            filters,
          },
          1,
          1
        ); // hospitalId e userId mock

        return {
          results: results.results || [],
          total: results.pagination?.total || 0,
          hasMore: results.pagination?.hasNext || false,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Autocomplete
  fastify.get(
    '/search/autocomplete',
    {
      schema: {
        querystring: autocompleteSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              suggestions: { type: 'array' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof autocompleteSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { q, types, limit = 10 } = request.query;

        const suggestions = await searchService.getAutocompleteSuggestions(
          {
            q,
            types,
            limit,
          },
          1
        ); // hospitalId mock

        return { suggestions };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Search Patients
  fastify.get(
    '/search/patients',
    {
      schema: {
        querystring: searchPatientsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              patients: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchPatientsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { q, limit = 20, offset = 0, status, sortBy, sortOrder } = request.query;

        const results = await searchService.searchPatients(
          {
            q,
            limit,
            offset,
            status,
            sortBy,
            sortOrder,
          },
          1
        ); // hospitalId mock

        return {
          patients: results,
          total: results.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Search Clinical Notes
  fastify.get(
    '/search/clinical-notes',
    {
      schema: {
        querystring: searchClinicalNotesSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              notes: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchClinicalNotesSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          q,
          limit = 20,
          offset = 0,
          types,
          priority,
          authorId,
          patientId,
          dateRange,
          tags,
          sortBy,
          sortOrder,
        } = request.query;

        const results = await searchService.searchClinicalNotes(
          {
            q,
            limit,
            offset,
            types,
            priority,
            authorId,
            patientId,
            dateRange,
            tags,
            sortBy,
            sortOrder,
          },
          1
        ); // hospitalId mock

        return {
          notes: results,
          total: results.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Search Appointments
  fastify.get(
    '/search/appointments',
    {
      schema: {
        querystring: searchAppointmentsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              appointments: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchAppointmentsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          q,
          limit = 20,
          offset = 0,
          status,
          doctorId,
          patientId,
          appointmentTypeId,
          dateRange,
          sortBy,
          sortOrder,
        } = request.query;

        const results = await searchService.searchAppointments(
          {
            q,
            limit,
            offset,
            status,
            doctorId,
            patientId,
            appointmentTypeId,
            dateRange,
            sortBy,
            sortOrder,
          },
          1
        ); // hospitalId mock

        return {
          appointments: results,
          total: results.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Search History
  fastify.get(
    '/search/history',
    {
      schema: {
        querystring: searchHistoryQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              history: { type: 'array' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchHistoryQuerySchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { limit = 50, offset = 0 } = request.query;

        const results = await searchService.getSearchHistory(
          1, // userId mock
          { limit, offset },
          1 // hospitalId mock
        );

        return {
          history: results,
          total: results.length,
        };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Search Analytics
  fastify.get(
    '/search/analytics',
    {
      schema: {
        querystring: searchAnalyticsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              totalSearches: { type: 'number' },
              popularQueries: { type: 'array' },
              searchesByType: { type: 'array' },
              averageResponseTime: { type: 'number' },
              successRate: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchAnalyticsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { period = 'week' } = request.query;

        const analytics = await searchService.getSearchAnalytics({ period }, 1); // hospitalId mock

        return analytics;
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Log Search Event
  fastify.post(
    '/search/events',
    {
      schema: {
        body: searchEventSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof searchEventSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const event = request.body;

        await searchService.recordSearchEvent(
          1, // userId mock
          event,
          1 // hospitalId mock
        );

        return { success: true };
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
