import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { AppointmentsService } from '../services/appointments.service.js';
import type {
  CreateAppointmentType,
  UpdateAppointmentType,
  RescheduleAppointmentType,
  CancelAppointmentType,
  ConfirmAppointmentType,
  AppointmentFiltersType,
  AvailabilityRequestType,
  AppointmentParamsType,
  DoctorParamsType,
} from '../schemas/appointments.js';

// Rate limiting para operações de agendamento
const appointmentsRateLimit = createRateLimit({
  max: 150, // 150 requests
  windowMs: 15 * 60 * 1000, // por 15 minutos
  message: 'Muitas tentativas. Tente novamente em 15 minutos.',
});

const createAppointmentRateLimit = createRateLimit({
  max: 30, // 30 criações
  windowMs: 60 * 60 * 1000, // por hora
  message: 'Limite de criação de agendamentos excedido. Tente novamente em 1 hora.',
});

// Usar tipagem correta para requests autenticados
function checkRole(request: FastifyRequest, allowedRoles: string[]): boolean {
  const user = (request as any).currentUser;
  return user && allowedRoles.includes(user.role);
}

function getCurrentUser(request: FastifyRequest) {
  return (request as any).currentUser;
}

export async function appointmentsRoutes(fastify: FastifyInstance) {
  const appointmentsService = new AppointmentsService();

  // Aplicar middleware de autenticação e rate limiting
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', appointmentsRateLimit);

  // Lista agendamentos com filtros
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const filters = request.query as AppointmentFiltersType;
      const result = await appointmentsService.getAppointments(
        filters,
        getCurrentUser(request).hospitalId
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Busca agendamento por ID
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as AppointmentParamsType;
      const appointment = await appointmentsService.getAppointmentById(
        id,
        getCurrentUser(request).hospitalId
      );

      if (!appointment) {
        return reply.code(404).send({
          success: false,
          error: 'Agendamento não encontrado',
        });
      }

      return reply.code(200).send({
        success: true,
        data: appointment,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Cria novo agendamento
  fastify.post(
    '/',
    {
      preHandler: [createAppointmentRateLimit],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const appointmentData = request.body as CreateAppointmentType;
        const appointment = await appointmentsService.createAppointment(
          appointmentData,
          getCurrentUser(request).hospitalId
        );

        return reply.code(201).send({
          success: true,
          data: appointment,
        });
      } catch (error) {
        fastify.log.error(error);

        if (
          error instanceof Error &&
          (error.message.includes('não disponível') || error.message.includes('Conflito'))
        ) {
          return reply.code(400).send({
            success: false,
            error: error.message,
          });
        }

        return reply.code(500).send({
          success: false,
          error: 'Erro interno do servidor',
        });
      }
    }
  );

  // Atualiza agendamento
  fastify.put('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as AppointmentParamsType;
      const updateData = request.body as UpdateAppointmentType;

      const appointment = await appointmentsService.updateAppointment(
        id,
        updateData,
        getCurrentUser(request).hospitalId
      );

      return reply.code(200).send({
        success: true,
        data: appointment,
      });
    } catch (error) {
      fastify.log.error(error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      if (
        error instanceof Error &&
        (error.message.includes('não disponível') || error.message.includes('Conflito'))
      ) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Reagenda agendamento
  fastify.post('/:id/reschedule', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as AppointmentParamsType;
      const rescheduleData = request.body as RescheduleAppointmentType;

      const appointment = await appointmentsService.rescheduleAppointment(
        id,
        rescheduleData,
        getCurrentUser(request).hospitalId,
        getCurrentUser(request).userId
      );

      return reply.code(200).send({
        success: true,
        data: appointment,
      });
    } catch (error) {
      fastify.log.error(error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      if (
        error instanceof Error &&
        (error.message.includes('não é possível') ||
          error.message.includes('não disponível') ||
          error.message.includes('Conflito'))
      ) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Cancela agendamento
  fastify.post('/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as AppointmentParamsType;
      const cancelData = request.body as CancelAppointmentType;

      const appointment = await appointmentsService.cancelAppointment(
        id,
        cancelData,
        getCurrentUser(request).hospitalId,
        getCurrentUser(request).userId
      );

      return reply.code(200).send({
        success: true,
        data: appointment,
      });
    } catch (error) {
      fastify.log.error(error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      if (error instanceof Error && error.message.includes('não é possível')) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Confirma agendamento
  fastify.post('/:id/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as AppointmentParamsType;
      const confirmData = request.body as ConfirmAppointmentType;

      const appointment = await appointmentsService.confirmAppointment(
        id,
        confirmData,
        getCurrentUser(request).hospitalId
      );

      return reply.code(200).send({
        success: true,
        data: appointment,
      });
    } catch (error) {
      fastify.log.error(error);

      if (error instanceof Error && error.message.includes('não encontrado')) {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      if (error instanceof Error && error.message.includes('Apenas')) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });

  // Busca disponibilidade do médico
  fastify.get(
    '/doctors/:doctorId/availability',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { doctorId } = request.params as DoctorParamsType;
        const { date, appointmentTypeId } = request.query as {
          date: string;
          appointmentTypeId?: number;
        };

        const availabilityRequest: AvailabilityRequestType = {
          doctorId,
          date,
          appointmentTypeId,
        };

        const slots = await appointmentsService.getDoctorAvailability(
          availabilityRequest,
          getCurrentUser(request).hospitalId
        );

        return reply.code(200).send({
          success: true,
          data: slots,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: 'Erro interno do servidor',
        });
      }
    }
  );

  // Estatísticas de agendamentos
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await appointmentsService.getAppointmentStats(
        getCurrentUser(request).hospitalId
      );

      return reply.code(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  });
}
