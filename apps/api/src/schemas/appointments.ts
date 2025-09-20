import { z } from 'zod';

// Schema para status de agendamento
export const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

// Schema para método de confirmação
export const confirmationMethodSchema = z.enum(['email', 'sms', 'phone']);

// Schema para origem do agendamento
export const appointmentSourceSchema = z.enum(['web', 'mobile', 'phone', 'admin']);

// Schema para padrão de recorrência
export const recurringPatternSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
  interval: z.number().min(1).max(12),
  endDate: z.string().optional(),
  exceptions: z.array(z.string()).optional(),
});

// Schema base para Appointment Type
export const appointmentTypeSchema = z.object({
  id: z.number(),
  name: z.string().max(100),
  description: z.string().optional(),
  durationMinutes: z.number().min(15).max(480), // 15 min a 8h
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Deve ser uma cor hexadecimal válida'),
  isActive: z.boolean(),
  requiresApproval: z.boolean(),
  hospitalId: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para criar tipo de consulta
export const createAppointmentTypeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().min(15).max(480),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Deve ser uma cor hexadecimal válida')
    .optional(),
  requiresApproval: z.boolean().optional(),
});

// Schema para horário do médico
export const doctorScheduleSchema = z.object({
  id: z.number(),
  doctorId: z.number(),
  dayOfWeek: z.number().min(0).max(6), // 0=Domingo, 6=Sábado
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM'),
  breakStartTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM')
    .optional(),
  breakEndTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM')
    .optional(),
  isActive: z.boolean(),
  hospitalId: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para criar horário do médico
export const createDoctorScheduleSchema = z
  .object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM'),
    breakStartTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM')
      .optional(),
    breakEndTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:MM')
      .optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Horário de início deve ser anterior ao horário de fim',
    path: ['endTime'],
  })
  .refine(
    (data) => {
      if (data.breakStartTime && data.breakEndTime) {
        return data.breakStartTime < data.breakEndTime;
      }
      return true;
    },
    {
      message: 'Horário de início do intervalo deve ser anterior ao horário de fim',
      path: ['breakEndTime'],
    }
  );

// Schema para bloqueio de horário
export const scheduleBlockSchema = z.object({
  id: z.number(),
  doctorId: z.number(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  reason: z.string().max(200).optional(),
  isRecurring: z.boolean(),
  recurringPattern: recurringPatternSchema.optional(),
  hospitalId: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para criar bloqueio
export const createScheduleBlockSchema = z
  .object({
    startDateTime: z.string().datetime(),
    endDateTime: z.string().datetime(),
    reason: z.string().max(200).optional(),
    isRecurring: z.boolean().optional(),
    recurringPattern: recurringPatternSchema.optional(),
  })
  .refine((data) => new Date(data.startDateTime) < new Date(data.endDateTime), {
    message: 'Data/hora de início deve ser anterior à data/hora de fim',
    path: ['endDateTime'],
  });

// Schema para sintomas (array de strings)
export const symptomsSchema = z.array(z.string().max(100)).default([]);

// Schema completo para agendamento
export const appointmentSchema = z.object({
  id: z.number(),
  patientId: z.number(),
  patientName: z.string(), // Dados agregados do join
  doctorId: z.number(),
  doctorName: z.string(), // Dados agregados do join
  appointmentTypeId: z.number(),
  appointmentType: appointmentTypeSchema, // Dados agregados do join
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().min(15).max(480),
  status: appointmentStatusSchema,
  notes: z.string().optional(),
  reason: z.string().max(500).optional(),
  symptoms: symptomsSchema,
  isUrgent: z.boolean(),
  requiresPreparation: z.boolean(),
  preparationInstructions: z.string().optional(),
  confirmedAt: z.string().datetime().optional(),
  confirmationMethod: confirmationMethodSchema.optional(),
  cancelledAt: z.string().datetime().optional(),
  cancellationReason: z.string().optional(),
  cancelledBy: z.number().optional(),
  rescheduledFromId: z.number().optional(),
  reminderSent24h: z.boolean(),
  reminderSent1h: z.boolean(),
  source: appointmentSourceSchema,
  externalId: z.string().max(100).optional(),
  hospitalId: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para criar agendamento
export const createAppointmentSchema = z
  .object({
    patientId: z.number().positive('ID do paciente deve ser um número positivo'),
    doctorId: z.number().positive('ID do médico deve ser um número positivo'),
    appointmentTypeId: z.number().positive('ID do tipo de consulta deve ser um número positivo'),
    scheduledAt: z.string().datetime('Data/hora deve estar no formato ISO 8601'),
    durationMinutes: z.number().min(15).max(480).optional(),
    notes: z.string().max(1000).optional(),
    reason: z.string().max(500).optional(),
    symptoms: symptomsSchema.optional(),
    isUrgent: z.boolean().optional(),
    requiresPreparation: z.boolean().optional(),
    preparationInstructions: z.string().max(1000).optional(),
    source: appointmentSourceSchema.optional(),
    externalId: z.string().max(100).optional(),
  })
  .refine(
    (data) => {
      const scheduledDate = new Date(data.scheduledAt);
      const now = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 6); // Máximo 6 meses no futuro

      return scheduledDate > now && scheduledDate <= maxFutureDate;
    },
    {
      message: 'Agendamento deve ser no futuro e não exceder 6 meses',
      path: ['scheduledAt'],
    }
  );

// Schema para atualizar agendamento
export const updateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().min(15).max(480).optional(),
  status: appointmentStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
  reason: z.string().max(500).optional(),
  symptoms: symptomsSchema.optional(),
  isUrgent: z.boolean().optional(),
  requiresPreparation: z.boolean().optional(),
  preparationInstructions: z.string().max(1000).optional(),
  cancellationReason: z.string().max(500).optional(),
});

// Schema para reagendamento
export const rescheduleAppointmentSchema = z
  .object({
    newScheduledAt: z.string().datetime('Nova data/hora deve estar no formato ISO 8601'),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const newDate = new Date(data.newScheduledAt);
      const now = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 6);

      return newDate > now && newDate <= maxFutureDate;
    },
    {
      message: 'Nova data deve ser no futuro e não exceder 6 meses',
      path: ['newScheduledAt'],
    }
  );

// Schema para cancelamento
export const cancelAppointmentSchema = z.object({
  reason: z.string().min(5, 'Motivo deve ter pelo menos 5 caracteres').max(500),
});

// Schema para confirmação
export const confirmAppointmentSchema = z.object({
  confirmationMethod: confirmationMethodSchema,
});

// Schema para slot de tempo disponível
export const timeSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAvailable: z.boolean(),
  reason: z.string().optional(), // Motivo se não disponível
});

// Schema para busca de disponibilidade
export const availabilityRequestSchema = z
  .object({
    doctorId: z.number().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
    appointmentTypeId: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      const requestDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return requestDate >= today;
    },
    {
      message: 'Data não pode ser no passado',
      path: ['date'],
    }
  );

// Schema para filtros de agendamentos
export const appointmentFiltersSchema = z
  .object({
    patientId: z.number().positive().optional(),
    doctorId: z.number().positive().optional(),
    status: appointmentStatusSchema.optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
      .optional(),
    appointmentTypeId: z.number().positive().optional(),
    isUrgent: z.boolean().optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Data de início deve ser anterior ou igual à data de fim',
      path: ['endDate'],
    }
  );

// Schema para resposta paginada
export const paginatedAppointmentsSchema = z.object({
  appointments: z.array(appointmentSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});

// Schema para estatísticas de agendamentos
export const appointmentStatsSchema = z.object({
  today: z.object({
    total: z.number(),
    confirmed: z.number(),
    pending: z.number(),
    cancelled: z.number(),
  }),
  thisWeek: z.object({
    total: z.number(),
    confirmed: z.number(),
    pending: z.number(),
    cancelled: z.number(),
  }),
  nextWeek: z.object({
    total: z.number(),
    scheduled: z.number(),
  }),
  upcomingUrgent: z.number(),
});

// Schemas para parâmetros de rota
export const appointmentParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID deve ser um número').transform(Number),
});

export const doctorParamsSchema = z.object({
  doctorId: z.string().regex(/^\d+$/, 'ID do médico deve ser um número').transform(Number),
});

// Tipos TypeScript inferidos
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type ConfirmationMethod = z.infer<typeof confirmationMethodSchema>;
export type AppointmentSource = z.infer<typeof appointmentSourceSchema>;
export type RecurringPattern = z.infer<typeof recurringPatternSchema>;
export type AppointmentTypeType = z.infer<typeof appointmentTypeSchema>;
export type CreateAppointmentTypeType = z.infer<typeof createAppointmentTypeSchema>;
export type DoctorScheduleType = z.infer<typeof doctorScheduleSchema>;
export type CreateDoctorScheduleType = z.infer<typeof createDoctorScheduleSchema>;
export type ScheduleBlockType = z.infer<typeof scheduleBlockSchema>;
export type CreateScheduleBlockType = z.infer<typeof createScheduleBlockSchema>;
export type AppointmentType = z.infer<typeof appointmentSchema>;
export type CreateAppointmentType = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentType = z.infer<typeof updateAppointmentSchema>;
export type RescheduleAppointmentType = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentType = z.infer<typeof cancelAppointmentSchema>;
export type ConfirmAppointmentType = z.infer<typeof confirmAppointmentSchema>;
export type TimeSlotType = z.infer<typeof timeSlotSchema>;
export type AvailabilityRequestType = z.infer<typeof availabilityRequestSchema>;
export type AppointmentFiltersType = z.infer<typeof appointmentFiltersSchema>;
export type PaginatedAppointmentsType = z.infer<typeof paginatedAppointmentsSchema>;
export type AppointmentStatsType = z.infer<typeof appointmentStatsSchema>;
export type AppointmentParamsType = z.infer<typeof appointmentParamsSchema>;
export type DoctorParamsType = z.infer<typeof doctorParamsSchema>;
