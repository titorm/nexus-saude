import {
  pgTable,
  text,
  varchar,
  timestamp,
  serial,
  integer,
  index,
  pgEnum,
  boolean,
  json,
} from 'drizzle-orm/pg-core';

// Justificativa: Enum garante a integridade referencial dos papéis no nível do banco de dados.
export const userRoleEnum = pgEnum('user_role', ['doctor', 'administrator', 'nurse']);

// Enum expandido para tipos de notas médicas
export const noteTypeEnum = pgEnum('note_type', [
  'consultation', // Consulta médica
  'diagnosis', // Diagnóstico
  'prescription', // Prescrição médica
  'examination', // Exame físico
  'laboratory', // Resultados laboratoriais
  'imaging', // Exames de imagem
  'procedure', // Procedimentos médicos
  'follow_up', // Acompanhamento
  'referral', // Encaminhamento
  'discharge', // Alta médica
  'emergency', // Atendimento de emergência
  'observation', // Observações gerais
  'progress', // Evolução (legacy)
  'admission', // Admissão (legacy)
]);

// Enum para prioridade das notas
export const priorityEnum = pgEnum('priority', [
  'low', // Baixa prioridade
  'normal', // Prioridade normal
  'high', // Alta prioridade
  'urgent', // Urgente
  'critical', // Crítico
]);

// Enum para status de agendamentos
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled', // Agendado
  'confirmed', // Confirmado
  'in_progress', // Em andamento
  'completed', // Concluído
  'cancelled', // Cancelado
  'no_show', // Falta do paciente
  'rescheduled', // Reagendado
]);

// Enum para tipos de entidade no sistema de busca
export const searchEntityTypeEnum = pgEnum('search_entity_type', [
  'patient',
  'clinical_note',
  'appointment',
]);

// Tabela de Hospitais
export const hospitals = pgTable('hospitals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de Usuários
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 256 }).notNull().unique(),
    // Justificativa: 'text' é usado em vez de 'varchar' para hashes bcrypt, que podem ter comprimentos variáveis.
    hashedPassword: text('hashed_password').notNull(),
    name: varchar('name', { length: 256 }).notNull(), // Nome do usuário
    role: userRoleEnum('role').notNull().default('doctor'),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    // Justificativa: Um índice no email é crucial para a performance das queries de login.
    return {
      emailIdx: index('email_idx').on(table.email),
    };
  }
);

// Tabela de Pacientes
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 256 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 256 }),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 256 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  hospitalId: integer('hospital_id')
    .references(() => hospitals.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de Notas Clínicas (expandida)
export const clinicalNotes = pgTable(
  'clinical_notes',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 200 }).notNull(), // Título da nota
    content: text('content').notNull(),
    type: noteTypeEnum('type').notNull().default('progress'),
    priority: priorityEnum('priority').notNull().default('normal'),

    // Campos estruturados como JSON
    symptoms: json('symptoms').$type<string[]>().default([]), // Lista de sintomas
    medications: json('medications')
      .$type<
        Array<{
          name: string;
          dosage: string;
          frequency: string;
          duration?: string;
          instructions?: string;
        }>
      >()
      .default([]), // Lista de medicamentos
    vitalSigns: json('vital_signs')
      .$type<{
        bloodPressure?: {
          systolic?: number;
          diastolic?: number;
        };
        heartRate?: number;
        temperature?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        weight?: number;
        height?: number;
      }>()
      .default({}), // Sinais vitais
    attachments: json('attachments')
      .$type<
        Array<{
          filename: string;
          type: string;
          size: number;
          url: string;
        }>
      >()
      .default([]), // Anexos
    tags: json('tags').$type<string[]>().default([]), // Tags/etiquetas

    // Campos de controle
    isPrivate: boolean('is_private').default(false), // Nota privada
    followUpDate: timestamp('follow_up_date'), // Data de follow-up
    version: integer('version').default(1).notNull(), // Versionamento

    // Relações
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: integer('author_id')
      .references(() => users.id)
      .notNull(),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    signedAt: timestamp('signed_at').defaultNow().notNull(), // Legacy field
  },
  (table) => {
    return {
      patientIdx: index('clinical_notes_patient_idx').on(table.patientId),
      authorIdx: index('clinical_notes_author_idx').on(table.authorId),
      typeIdx: index('clinical_notes_type_idx').on(table.type),
      createdAtIdx: index('clinical_notes_created_at_idx').on(table.createdAt),
    };
  }
);

// Tabela de Tipos de Consulta
export const appointmentTypes = pgTable('appointment_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  color: varchar('color', { length: 7 }).notNull().default('#3B82F6'), // Cor hex
  isActive: boolean('is_active').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  hospitalId: integer('hospital_id')
    .references(() => hospitals.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de Horários dos Médicos
export const doctorSchedules = pgTable(
  'doctor_schedules',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Domingo, 6=Sábado
    startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM format
    endTime: varchar('end_time', { length: 5 }).notNull(), // HH:MM format
    breakStartTime: varchar('break_start_time', { length: 5 }), // HH:MM format
    breakEndTime: varchar('break_end_time', { length: 5 }), // HH:MM format
    isActive: boolean('is_active').default(true),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      doctorDayIdx: index('doctor_schedules_doctor_day_idx').on(table.doctorId, table.dayOfWeek),
      doctorIdx: index('doctor_schedules_doctor_idx').on(table.doctorId),
    };
  }
);

// Tabela de Bloqueios de Horário
export const scheduleBlocks = pgTable(
  'schedule_blocks',
  {
    id: serial('id').primaryKey(),
    doctorId: integer('doctor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    startDateTime: timestamp('start_date_time').notNull(),
    endDateTime: timestamp('end_date_time').notNull(),
    reason: varchar('reason', { length: 200 }),
    isRecurring: boolean('is_recurring').default(false),
    recurringPattern: json('recurring_pattern').$type<{
      frequency: 'weekly' | 'monthly';
      interval: number;
      endDate?: string;
      exceptions?: string[]; // Dates to skip
    }>(),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      doctorDateIdx: index('schedule_blocks_doctor_date_idx').on(
        table.doctorId,
        table.startDateTime
      ),
      doctorIdx: index('schedule_blocks_doctor_idx').on(table.doctorId),
    };
  }
);

// Tabela de Agendamentos
export const appointments = pgTable(
  'appointments',
  {
    id: serial('id').primaryKey(),
    patientId: integer('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    doctorId: integer('doctor_id')
      .references(() => users.id)
      .notNull(),
    appointmentTypeId: integer('appointment_type_id')
      .references(() => appointmentTypes.id)
      .notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),

    // Campos informativos
    notes: text('notes'), // Notas do agendamento
    reason: varchar('reason', { length: 500 }), // Motivo da consulta
    symptoms: json('symptoms').$type<string[]>().default([]), // Sintomas reportados

    // Campos de controle
    isUrgent: boolean('is_urgent').default(false),
    requiresPreparation: boolean('requires_preparation').default(false),
    preparationInstructions: text('preparation_instructions'),

    // Confirmação
    confirmedAt: timestamp('confirmed_at'),
    confirmationMethod: varchar('confirmation_method', { length: 20 }), // 'email', 'sms', 'phone'

    // Cancelamento/Reagendamento
    cancelledAt: timestamp('cancelled_at'),
    cancellationReason: text('cancellation_reason'),
    cancelledBy: integer('cancelled_by').references(() => users.id), // Quem cancelou
    rescheduledFromId: integer('rescheduled_from_id'), // Agendamento original - FK será adicionada depois

    // Notificações
    reminderSent24h: boolean('reminder_sent_24h').default(false),
    reminderSent1h: boolean('reminder_sent_1h').default(false),

    // Metadados
    source: varchar('source', { length: 50 }).default('web'), // 'web', 'mobile', 'phone', 'admin'
    externalId: varchar('external_id', { length: 100 }), // ID externo para integrações

    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      patientIdx: index('appointments_patient_idx').on(table.patientId),
      doctorIdx: index('appointments_doctor_idx').on(table.doctorId),
      scheduledAtIdx: index('appointments_scheduled_at_idx').on(table.scheduledAt),
      statusIdx: index('appointments_status_idx').on(table.status),
      doctorDateIdx: index('appointments_doctor_date_idx').on(table.doctorId, table.scheduledAt),
    };
  }
);

// Tabela de Índices de Busca - T-306
export const searchIndexes = pgTable(
  'search_indexes',
  {
    id: serial('id').primaryKey(),
    entityType: searchEntityTypeEnum('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    searchVector: text('search_vector'), // tsvector será adicionado via trigger
    metadata: json('metadata').default({}),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      hospitalTypeIdx: index('search_indexes_hospital_type_idx').on(
        table.hospitalId,
        table.entityType
      ),
      entityIdx: index('search_indexes_entity_idx').on(table.entityType, table.entityId),
      searchVectorIdx: index('search_indexes_search_vector_idx').on(table.searchVector),
      metadataIdx: index('search_indexes_metadata_idx').on(table.metadata),
      updatedAtIdx: index('search_indexes_updated_at_idx').on(table.updatedAt),
    };
  }
);

// Tabela de Histórico de Buscas - T-306
export const searchHistory = pgTable(
  'search_history',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    query: text('query').notNull(),
    filters: json('filters').default({}),
    resultsCount: integer('results_count').default(0),
    clickedResultId: varchar('clicked_result_id', { length: 100 }), // formato: "patient:123"
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userHospitalIdx: index('search_history_user_hospital_idx').on(table.userId, table.hospitalId),
      queryIdx: index('search_history_query_idx').on(table.query),
      createdAtIdx: index('search_history_created_at_idx').on(table.createdAt),
    };
  }
);

// Tipos TypeScript inferidos do schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type NewClinicalNote = typeof clinicalNotes.$inferInsert;
export type Hospital = typeof hospitals.$inferSelect;
export type NewHospital = typeof hospitals.$inferInsert;

// Tipos para sistema de agendamento
export type AppointmentType = typeof appointmentTypes.$inferSelect;
export type NewAppointmentType = typeof appointmentTypes.$inferInsert;
export type DoctorSchedule = typeof doctorSchedules.$inferSelect;
export type NewDoctorSchedule = typeof doctorSchedules.$inferInsert;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type NewScheduleBlock = typeof scheduleBlocks.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

// Tabela de auditoria para logs de segurança
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: integer('entity_id'),
    details: json('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
    hospitalIdIdx: index('audit_logs_hospital_id_idx').on(table.hospitalId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  })
);

// Tipos para sistema de busca - T-306
export type SearchIndex = typeof searchIndexes.$inferSelect;
export type NewSearchIndex = typeof searchIndexes.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;

// Tipos para sistema de auditoria
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
