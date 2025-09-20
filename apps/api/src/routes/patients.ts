import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { patientsService } from '../services/patients.service.js';
import {
  createPatientSchema,
  updatePatientSchema,
  patientParamsSchema,
  patientsQuerySchema,
} from '../schemas/patients.js';

// Rate limiting para operações de pacientes
const patientsRateLimit = createRateLimit({
  max: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // por 15 minutos
  message: 'Muitas tentativas. Tente novamente em 15 minutos.',
});

const createPatientRateLimit = createRateLimit({
  max: 20, // 20 criações
  windowMs: 60 * 60 * 1000, // por hora
  message: 'Limite de criação de pacientes excedido. Tente novamente em 1 hora.',
});

function checkRole(request: FastifyRequest, allowedRoles: string[]): boolean {
  const user = (request as any).currentUser;
  return user && allowedRoles.includes(user.role);
}

export async function patientsRoutes(fastify: FastifyInstance) {
  // Middleware global para todas as rotas de pacientes
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', patientsRateLimit);

  /**
   * GET /patients - Lista pacientes com paginação e filtros
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização
      if (!checkRole(request, ['doctor', 'nurse', 'administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - permissões insuficientes',
        });
      }

      const user = (request as any).currentUser;
      const queryParams = patientsQuerySchema.parse(request.query);

      const result = await patientsService.getPatients(queryParams, user.hospitalId);

      return reply.code(200).send({
        success: true,
        ...result,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro ao listar pacientes: ${errorMessage}`);

      if (error instanceof Error && error.message.includes('validation')) {
        return reply.code(400).send({
          success: false,
          message: 'Parâmetros de consulta inválidos',
          error: error.message,
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor ao listar pacientes',
      });
    }
  });

  /**
   * GET /patients/search - Busca rápida de pacientes (para autocomplete)
   */
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização
      if (!checkRole(request, ['doctor', 'nurse', 'administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - permissões insuficientes',
        });
      }

      const user = (request as any).currentUser;
      const { q: searchTerm, limit: limitStr } = request.query as { q: string; limit?: string };

      if (!searchTerm) {
        return reply.code(400).send({
          success: false,
          message: 'Parâmetro de busca obrigatório',
        });
      }

      const limit = limitStr ? parseInt(limitStr, 10) : 10;

      if (limit > 50) {
        return reply.code(400).send({
          success: false,
          message: 'Limite máximo de 50 resultados',
        });
      }

      const results = await patientsService.searchPatients(searchTerm, user.hospitalId, limit);

      return reply.code(200).send({
        success: true,
        data: results,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro na busca de pacientes: ${errorMessage}`);

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor na busca',
      });
    }
  });

  /**
   * GET /patients/stats - Estatísticas de pacientes (para dashboard)
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização
      if (!checkRole(request, ['doctor', 'administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - permissões insuficientes',
        });
      }

      const user = (request as any).currentUser;

      const stats = await patientsService.getPatientStats(user.hospitalId);

      return reply.code(200).send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro ao buscar estatísticas de pacientes: ${errorMessage}`);

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor ao buscar estatísticas',
      });
    }
  });

  /**
   * GET /patients/:id - Busca paciente por ID
   */
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização
      if (!checkRole(request, ['doctor', 'nurse', 'administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - permissões insuficientes',
        });
      }

      const user = (request as any).currentUser;
      const { id } = patientParamsSchema.parse(request.params);

      const patient = await patientsService.getPatientById(id, user.hospitalId);

      if (!patient) {
        return reply.code(404).send({
          success: false,
          message: 'Paciente não encontrado',
        });
      }

      return reply.code(200).send({
        success: true,
        data: patient,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro ao buscar paciente: ${errorMessage}`);

      if (error instanceof Error && error.message.includes('validation')) {
        return reply.code(400).send({
          success: false,
          message: 'ID do paciente inválido',
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor ao buscar paciente',
      });
    }
  });

  /**
   * POST /patients - Cria novo paciente
   */
  fastify.post(
    '/',
    {
      preHandler: [createPatientRateLimit],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Verificar autorização
        if (!checkRole(request, ['doctor', 'administrator'])) {
          return reply.code(403).send({
            success: false,
            message: 'Acesso negado - permissões insuficientes',
          });
        }

        const user = (request as any).currentUser;
        const patientData = createPatientSchema.parse(request.body);

        const newPatient = await patientsService.createPatient(patientData, user.hospitalId);

        request.log.info(`Paciente criado: ${newPatient.id} por usuário ${user.userId}`);

        return reply.code(201).send({
          success: true,
          message: 'Paciente criado com sucesso',
          data: newPatient,
        });
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        request.log.error(`Erro ao criar paciente: ${errorMessage}`);

        if (error instanceof Error) {
          if (error.message.includes('validation') || error.message.includes('inválido')) {
            return reply.code(400).send({
              success: false,
              message: 'Dados do paciente inválidos',
              error: error.message,
            });
          }

          if (error.message.includes('já existe') || error.message.includes('duplicat')) {
            return reply.code(409).send({
              success: false,
              message: error.message,
            });
          }

          if (error.message.includes('permissão')) {
            return reply.code(403).send({
              success: false,
              message: error.message,
            });
          }
        }

        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor ao criar paciente',
        });
      }
    }
  );

  /**
   * PUT /patients/:id - Atualiza paciente
   */
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização
      if (!checkRole(request, ['doctor', 'administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - permissões insuficientes',
        });
      }

      const user = (request as any).currentUser;
      const { id } = patientParamsSchema.parse(request.params);
      const updateData = updatePatientSchema.parse(request.body);

      const updatedPatient = await patientsService.updatePatient(id, updateData, user.hospitalId);

      if (!updatedPatient) {
        return reply.code(404).send({
          success: false,
          message: 'Paciente não encontrado',
        });
      }

      request.log.info(`Paciente atualizado: ${id} por usuário ${user.userId}`);

      return reply.code(200).send({
        success: true,
        message: 'Paciente atualizado com sucesso',
        data: updatedPatient,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro ao atualizar paciente: ${errorMessage}`);

      if (error instanceof Error) {
        if (error.message.includes('validation') || error.message.includes('inválido')) {
          return reply.code(400).send({
            success: false,
            message: 'Dados de atualização inválidos',
            error: error.message,
          });
        }

        if (error.message.includes('já existe') || error.message.includes('duplicat')) {
          return reply.code(409).send({
            success: false,
            message: error.message,
          });
        }

        if (error.message.includes('permissão')) {
          return reply.code(403).send({
            success: false,
            message: error.message,
          });
        }
      }

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor ao atualizar paciente',
      });
    }
  });

  /**
   * DELETE /patients/:id - Remove paciente
   */
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verificar autorização (apenas admins podem deletar)
      if (!checkRole(request, ['administrator'])) {
        return reply.code(403).send({
          success: false,
          message: 'Acesso negado - apenas administradores podem remover pacientes',
        });
      }

      const user = (request as any).currentUser;
      const { id } = patientParamsSchema.parse(request.params);

      const deleted = await patientsService.deletePatient(id, user.hospitalId);

      if (!deleted) {
        return reply.code(404).send({
          success: false,
          message: 'Paciente não encontrado',
        });
      }

      request.log.warn(`Paciente deletado: ${id} por usuário ${user.userId}`);

      return reply.code(200).send({
        success: true,
        message: 'Paciente removido com sucesso',
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      request.log.error(`Erro ao deletar paciente: ${errorMessage}`);

      if (error instanceof Error && error.message.includes('validation')) {
        return reply.code(400).send({
          success: false,
          message: 'ID do paciente inválido',
        });
      }

      return reply.code(500).send({
        success: false,
        message: 'Erro interno do servidor ao remover paciente',
      });
    }
  });
}
