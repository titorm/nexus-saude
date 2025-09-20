import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { clinicalNotesService } from '../services/clinicalNotes.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { clinicalNotesRateLimit } from '../middleware/rateLimit.js';
import { createClinicalNoteSchema, updateClinicalNoteSchema } from '../schemas/clinicalNotes.js';

/**
 * Registra as rotas das anotações clínicas no Fastify
 */
export async function clinicalNotesRoutes(fastify: FastifyInstance) {
  // Aplicar middleware de autenticação
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', clinicalNotesRateLimit);

  /**
   * GET /clinical-notes
   * Listar anotações clínicas com paginação e filtros
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const query = request.query as any;
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';

      const queryParams = {
        page,
        limit,
        sortBy,
        sortOrder,
        patientId: query.patientId ? parseInt(query.patientId) : undefined,
        type: query.type,
        priority: query.priority,
        startDate: query.startDate,
        endDate: query.endDate,
        search: query.search,
        authorId: query.authorId ? parseInt(query.authorId) : undefined,
      };

      const result = await clinicalNotesService.getClinicalNotes(
        queryParams,
        user.hospitalId,
        user.id,
        user.role
      );
      reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar anotações clínicas:', errorMessage);
      reply.code(500).send({
        error: 'Erro interno do servidor',
        details: errorMessage,
      });
    }
  });

  /**
   * GET /clinical-notes/stats
   * Obter estatísticas das anotações clínicas
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const stats = await clinicalNotesService.getClinicalNotesStats(user.hospitalId);
      reply.send(stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar estatísticas:', errorMessage);
      reply.code(500).send({
        error: 'Erro interno do servidor',
        details: errorMessage,
      });
    }
  });

  /**
   * GET /clinical-notes/follow-ups
   * Obter anotações com follow-ups pendentes
   */
  fastify.get('/follow-ups', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const query = request.query as { limit?: string };

      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      if (limit < 1 || limit > 100) {
        return reply.code(400).send({ error: 'Limite deve estar entre 1 e 100' });
      }

      const followUps = await clinicalNotesService.getPendingFollowUps(user.hospitalId, limit);
      reply.send(followUps);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar follow-ups:', errorMessage);
      reply.code(500).send({
        error: 'Erro interno do servidor',
        details: errorMessage,
      });
    }
  });

  /**
   * GET /clinical-notes/patient/:patientId/timeline
   * Obter timeline das anotações de um paciente
   */
  fastify.get(
    '/patient/:patientId/timeline',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const params = request.params as { patientId: string };
        const query = request.query as { startDate?: string; endDate?: string; limit?: string };

        if (!user) {
          return reply.code(401).send({ error: 'Usuário não autenticado' });
        }

        const patientId = parseInt(params.patientId, 10);
        const limit = query.limit ? parseInt(query.limit, 10) : 50;

        if (limit < 1 || limit > 200) {
          return reply.code(400).send({ error: 'Limite deve estar entre 1 e 200' });
        }

        const timeline = await clinicalNotesService.getPatientTimeline(
          patientId,
          user.hospitalId,
          limit
        );

        reply.send(timeline);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro ao buscar timeline:', errorMessage);
        reply.code(500).send({
          error: 'Erro interno do servidor',
          details: errorMessage,
        });
      }
    }
  );

  /**
   * GET /clinical-notes/:id
   * Obter uma anotação clínica específica
   */
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const params = request.params as { id: string };

      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const noteId = parseInt(params.id, 10);
      const note = await clinicalNotesService.getClinicalNoteById(user.hospitalId, noteId);

      if (!note) {
        return reply.code(404).send({ error: 'Anotação não encontrada' });
      }

      reply.send(note);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar anotação médica:', errorMessage);
      reply.code(500).send({
        error: 'Erro interno do servidor',
        details: errorMessage,
      });
    }
  });

  /**
   * POST /clinical-notes
   * Criar uma nova anotação clínica
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      // Validação usando Zod
      const validatedData = createClinicalNoteSchema.parse(request.body);

      const note = await clinicalNotesService.createClinicalNote(
        validatedData,
        user.id,
        user.hospitalId
      );

      reply.code(201).send(note);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar anotação médica:', errorMessage);

      if (error instanceof Error && error.name === 'ZodError') {
        reply.code(400).send({
          error: 'Dados inválidos',
          details: errorMessage,
        });
      } else {
        reply.code(500).send({
          error: 'Erro interno do servidor',
          details: errorMessage,
        });
      }
    }
  });

  /**
   * PUT /clinical-notes/:id
   * Atualizar uma anotação clínica existente
   */
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const params = request.params as { id: string };

      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const noteId = parseInt(params.id, 10);

      // Validação usando Zod
      const validatedData = updateClinicalNoteSchema.parse(request.body);

      const note = await clinicalNotesService.updateClinicalNote(
        noteId,
        validatedData,
        user.hospitalId,
        user.id,
        user.role
      );

      if (!note) {
        return reply.code(404).send({ error: 'Anotação não encontrada' });
      }

      reply.send(note);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao atualizar anotação médica:', errorMessage);

      if (error instanceof Error && error.name === 'ZodError') {
        reply.code(400).send({
          error: 'Dados inválidos',
          details: errorMessage,
        });
      } else {
        reply.code(500).send({
          error: 'Erro interno do servidor',
          details: errorMessage,
        });
      }
    }
  });

  /**
   * DELETE /clinical-notes/:id
   * Excluir uma anotação clínica
   */
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const params = request.params as { id: string };

      if (!user) {
        return reply.code(401).send({ error: 'Usuário não autenticado' });
      }

      const noteId = parseInt(params.id, 10);

      const deleted = await clinicalNotesService.deleteClinicalNote(
        noteId,
        user.hospitalId,
        user.id,
        user.role
      );

      if (!deleted) {
        return reply.code(404).send({ error: 'Anotação não encontrada' });
      }

      reply.code(204).send();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao excluir anotação médica:', errorMessage);
      reply.code(500).send({
        error: 'Erro interno do servidor',
        details: errorMessage,
      });
    }
  });
}
