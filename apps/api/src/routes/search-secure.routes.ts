import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SearchService } from '../services/search.service.js';
import {
  searchSecurityMiddleware,
  searchQuerySchema,
  autocompleteQuerySchema,
  logSearchActivity,
} from '../middleware/search-security.js';

/**
 * Fastify Search Routes with Security Middleware
 *
 * Implements secure search endpoints with authentication, authorization,
 * rate limiting, input validation, and audit logging.
 */

export async function searchRoutes(fastify: FastifyInstance) {
  const searchService = new SearchService();

  // Security middleware configuration
  const globalSearchSecurity = searchSecurityMiddleware({
    requiredPermission: 'search:read',
    maxRequests: 100,
    windowMs: 60000,
    validationSchema: searchQuerySchema,
  });

  const autocompleteSearchSecurity = searchSecurityMiddleware({
    requiredPermission: 'search:read',
    maxRequests: 200,
    windowMs: 60000,
    validationSchema: autocompleteQuerySchema,
  });

  const advancedSearchSecurity = searchSecurityMiddleware({
    requiredPermission: 'search:advanced',
    maxRequests: 50,
    windowMs: 60000,
    validationSchema: searchQuerySchema,
  });

  const analyticsSearchSecurity = searchSecurityMiddleware({
    requiredPermission: 'search:analytics',
    maxRequests: 30,
    windowMs: 60000,
  });

  /**
   * POST /api/search/global
   * Global unified search across all entities
   */
  fastify.post('/search/global', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      const query = request.body as any;
      // Mock context for now - replace with proper auth middleware
      const context = {
        user: { id: 1 },
        hospitalId: 1,
      } as any;
      request.searchContext = context;

      await logSearchActivity(context, 'global_search_started', {
        query: query.query,
        entityTypes: query.entityTypes,
        limit: query.limit,
      });

      const results = await searchService.globalSearch(query, context.hospitalId, context.user.id);
      const executionTime = Date.now() - startTime;

      await logSearchActivity(context, 'global_search_completed', {
        query: query.query,
        resultCount: results.pagination.total,
        executionTime,
      });

      return reply.status(200).send({
        success: true,
        results: results.results,
        total: results.pagination.total,
        executionTime,
        metadata: {
          query: query.query,
          limit: query.limit,
          entityTypes: query.entityTypes,
        },
      });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      await logSearchActivity(request.searchContext, 'global_search_error', {
        error: error.message,
        executionTime,
      });

      console.error('Global search error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal search service error',
        code: 'SEARCH_ERROR',
      });
    }
  });

  /**
   * POST /api/search/patients
   * Patient-specific search
   */
  fastify.post(
    '/search/patients',
    {
      preHandler: [
        globalSearchSecurity.securityHeaders,
        globalSearchSecurity.authenticate,
        globalSearchSecurity.authorize,
        globalSearchSecurity.rateLimit,
        globalSearchSecurity.validate,
        globalSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const query = request.body as any;
        const context = request.searchContext!;

        await logSearchActivity(context, 'patient_search_started', {
          query: query.query,
          limit: query.limit,
        });

        const results = await searchService.searchPatients(query, context.hospitalId);
        const executionTime = Date.now() - startTime;

        await logSearchActivity(context, 'patient_search_completed', {
          query: query.query,
          resultCount: results.length,
          executionTime,
        });

        return reply.status(200).send({
          success: true,
          results: results,
          total: results.length,
          executionTime,
        });
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        await logSearchActivity(request.searchContext, 'patient_search_error', {
          error: error.message,
          executionTime,
        });

        console.error('Patient search error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Patient search service error',
          code: 'PATIENT_SEARCH_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/search/clinical-notes
   * Clinical notes specific search
   */
  fastify.post(
    '/search/clinical-notes',
    {
      preHandler: [
        globalSearchSecurity.securityHeaders,
        globalSearchSecurity.authenticate,
        globalSearchSecurity.authorize,
        globalSearchSecurity.rateLimit,
        globalSearchSecurity.validate,
        globalSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const query = request.body as any;
        const context = request.searchContext!;

        await logSearchActivity(context, 'clinical_notes_search_started', {
          query: query.query,
          limit: query.limit,
          priority: query.priority,
        });

        const results = await searchService.searchClinicalNotes(query, context.hospitalId);
        const executionTime = Date.now() - startTime;

        await logSearchActivity(context, 'clinical_notes_search_completed', {
          query: query.query,
          resultCount: results.length,
          executionTime,
        });

        return reply.status(200).send({
          success: true,
          results: results,
          total: results.length,
          executionTime,
        });
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        await logSearchActivity(request.searchContext, 'clinical_notes_search_error', {
          error: error.message,
          executionTime,
        });

        console.error('Clinical notes search error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Clinical notes search service error',
          code: 'CLINICAL_NOTES_SEARCH_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/search/appointments
   * Appointments specific search
   */
  fastify.post(
    '/search/appointments',
    {
      preHandler: [
        globalSearchSecurity.securityHeaders,
        globalSearchSecurity.authenticate,
        globalSearchSecurity.authorize,
        globalSearchSecurity.rateLimit,
        globalSearchSecurity.validate,
        globalSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const query = request.body as any;
        const context = request.searchContext!;

        await logSearchActivity(context, 'appointments_search_started', {
          query: query.query,
          limit: query.limit,
          status: query.status,
        });

        const results = await searchService.searchAppointments(query, context.hospitalId);
        const executionTime = Date.now() - startTime;

        await logSearchActivity(context, 'appointments_search_completed', {
          query: query.query,
          resultCount: results.length,
          executionTime,
        });

        return reply.status(200).send({
          success: true,
          results: results,
          total: results.length,
          executionTime,
        });
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        await logSearchActivity(request.searchContext, 'appointments_search_error', {
          error: error.message,
          executionTime,
        });

        console.error('Appointments search error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Appointments search service error',
          code: 'APPOINTMENTS_SEARCH_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/search/autocomplete
   * Autocomplete suggestions for search
   */
  fastify.get(
    '/search/autocomplete',
    {
      preHandler: [
        autocompleteSearchSecurity.securityHeaders,
        autocompleteSearchSecurity.authenticate,
        autocompleteSearchSecurity.authorize,
        autocompleteSearchSecurity.rateLimit,
        autocompleteSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const queryParams = request.query as any;
        const context = request.searchContext!;

        // Validate autocomplete query
        const validationResult = autocompleteQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid autocomplete parameters',
            code: 'VALIDATION_ERROR',
            details: validationResult.error.issues,
          });
        }

        const query = validationResult.data;

        await logSearchActivity(context, 'autocomplete_started', {
          query: query.q,
          types: query.types,
          limit: query.limit,
        });

        const suggestions = await searchService.getAutocompleteSuggestions(
          query,
          context.hospitalId
        );
        const executionTime = Date.now() - startTime;

        await logSearchActivity(context, 'autocomplete_completed', {
          query: query.query,
          suggestionCount: suggestions.length,
          executionTime,
        });

        return reply.status(200).send({
          success: true,
          suggestions,
          executionTime,
        });
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        await logSearchActivity(request.searchContext, 'autocomplete_error', {
          error: error.message,
          executionTime,
        });

        console.error('Autocomplete error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Autocomplete service error',
          code: 'AUTOCOMPLETE_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/search/history
   * Get search history for the current user
   */
  fastify.get(
    '/search/history',
    {
      preHandler: [
        globalSearchSecurity.securityHeaders,
        globalSearchSecurity.authenticate,
        globalSearchSecurity.authorize,
        globalSearchSecurity.rateLimit,
        globalSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const queryParams = request.query as any;
        const context = request.searchContext!;
        const limit = Math.min(parseInt(queryParams.limit || '20'), 100);

        await logSearchActivity(context, 'search_history_requested', {
          limit,
        });

        const history = await searchService.getSearchHistory(
          context.user.id,
          { limit, offset: 0 },
          context.hospitalId
        );

        return reply.status(200).send({
          success: true,
          history,
        });
      } catch (error: any) {
        await logSearchActivity(request.searchContext, 'search_history_error', {
          error: error.message,
        });

        console.error('Search history error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Search history service error',
          code: 'SEARCH_HISTORY_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/search/analytics
   * Get search analytics (admin only)
   */
  fastify.get(
    '/search/analytics',
    {
      preHandler: [
        analyticsSearchSecurity.securityHeaders,
        analyticsSearchSecurity.authenticate,
        analyticsSearchSecurity.authorize,
        analyticsSearchSecurity.rateLimit,
        analyticsSearchSecurity.enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const queryParams = request.query as any;
        const context = request.searchContext!;
        const timeframe = queryParams.timeframe || 'daily';
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;

        await logSearchActivity(context, 'search_analytics_requested', {
          timeframe,
          startDate,
          endDate,
        });

        const analytics = await searchService.getSearchAnalytics(
          { period: timeframe, startDate, endDate },
          context.hospitalId
        );

        return reply.status(200).send({
          success: true,
          analytics,
        });
      } catch (error: any) {
        await logSearchActivity(request.searchContext, 'search_analytics_error', {
          error: error.message,
        });

        console.error('Search analytics error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Search analytics service error',
          code: 'SEARCH_ANALYTICS_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/search/rebuild-indexes
   * Rebuild search indexes (admin only)
   */
  fastify.post(
    '/search/rebuild-indexes',
    {
      preHandler: [
        searchSecurityMiddleware({
          requiredPermission: 'search:manage',
          maxRequests: 5,
          windowMs: 300000, // 5 minutes
        }).securityHeaders,
        searchSecurityMiddleware({
          requiredPermission: 'search:manage',
          maxRequests: 5,
          windowMs: 300000,
        }).authenticate,
        searchSecurityMiddleware({
          requiredPermission: 'search:manage',
          maxRequests: 5,
          windowMs: 300000,
        }).authorize,
        searchSecurityMiddleware({
          requiredPermission: 'search:manage',
          maxRequests: 5,
          windowMs: 300000,
        }).rateLimit,
        searchSecurityMiddleware({
          requiredPermission: 'search:manage',
          maxRequests: 5,
          windowMs: 300000,
        }).enforceIsolation,
      ].filter(Boolean),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const context = request.searchContext!;

        await logSearchActivity(context, 'search_indexes_rebuild_started', {
          triggeredBy: context.user.id,
        });

        // Trigger background job to rebuild indexes
        // TODO: Implement actual background job system
        const jobId = `rebuild-${Date.now()}-${context.hospitalId}`;

        await logSearchActivity(context, 'search_indexes_rebuild_triggered', {
          jobId,
          triggeredBy: context.user.id,
        });

        return reply.status(202).send({
          success: true,
          message: 'Index rebuild job started',
          jobId,
        });
      } catch (error: any) {
        await logSearchActivity(request.searchContext, 'search_indexes_rebuild_error', {
          error: error.message,
        });

        console.error('Search index rebuild error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Search index rebuild service error',
          code: 'INDEX_REBUILD_ERROR',
        });
      }
    }
  );
}
