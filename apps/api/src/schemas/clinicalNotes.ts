import { z } from 'zod';

// Enum para tipos de anotações médicas
export const noteTypeEnum = z.enum([
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
]);

// Enum para prioridade das anotações
export const priorityEnum = z.enum([
  'low', // Baixa prioridade
  'normal', // Prioridade normal
  'high', // Alta prioridade
  'urgent', // Urgente
  'critical', // Crítico
]);

// Schema para criar nova anotação médica
export const createClinicalNoteSchema = z.object({
  patientId: z.number().int().positive({ message: 'ID do paciente deve ser um número positivo' }),

  type: noteTypeEnum,

  title: z
    .string()
    .min(1, { message: 'Título é obrigatório' })
    .max(200, { message: 'Título deve ter no máximo 200 caracteres' })
    .trim(),

  content: z
    .string()
    .min(1, { message: 'Conteúdo é obrigatório' })
    .max(10000, { message: 'Conteúdo deve ter no máximo 10.000 caracteres' }),

  priority: priorityEnum.default('normal'),

  symptoms: z
    .array(z.string().trim().min(1))
    .optional()
    .default([])
    .refine((symptoms) => symptoms.length <= 20, { message: 'Máximo de 20 sintomas permitidos' }),

  medications: z
    .array(
      z.object({
        name: z.string().min(1, { message: 'Nome do medicamento é obrigatório' }),
        dosage: z.string().min(1, { message: 'Dosagem é obrigatória' }),
        frequency: z.string().min(1, { message: 'Frequência é obrigatória' }),
        duration: z.string().optional(),
        instructions: z.string().optional(),
      })
    )
    .optional()
    .default([])
    .refine((medications) => medications.length <= 50, {
      message: 'Máximo de 50 medicamentos permitidos',
    }),

  vitalSigns: z
    .object({
      bloodPressure: z
        .object({
          systolic: z.number().min(50).max(300).optional(),
          diastolic: z.number().min(30).max(200).optional(),
        })
        .optional(),
      heartRate: z.number().min(30).max(250).optional(),
      temperature: z.number().min(32).max(45).optional(), // Celsius
      respiratoryRate: z.number().min(5).max(60).optional(),
      oxygenSaturation: z.number().min(70).max(100).optional(),
      weight: z.number().min(0.5).max(500).optional(), // kg
      height: z.number().min(30).max(250).optional(), // cm
    })
    .optional(),

  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        type: z.string().min(1),
        size: z.number().positive(),
        url: z.string().url(),
      })
    )
    .optional()
    .default([])
    .refine((attachments) => attachments.length <= 10, {
      message: 'Máximo de 10 anexos permitidos',
    }),

  isPrivate: z.boolean().default(false),

  tags: z
    .array(z.string().trim().min(1).max(50))
    .optional()
    .default([])
    .refine((tags) => tags.length <= 10, { message: 'Máximo de 10 tags permitidas' }),

  followUpDate: z.string().datetime().optional().or(z.null()),
});

// Schema para atualizar anotação médica
export const updateClinicalNoteSchema = z
  .object({
    type: noteTypeEnum.optional(),

    title: z
      .string()
      .min(1, { message: 'Título é obrigatório' })
      .max(200, { message: 'Título deve ter no máximo 200 caracteres' })
      .trim()
      .optional(),

    content: z
      .string()
      .min(1, { message: 'Conteúdo é obrigatório' })
      .max(10000, { message: 'Conteúdo deve ter no máximo 10.000 caracteres' })
      .optional(),

    priority: priorityEnum.optional(),

    symptoms: z
      .array(z.string().trim().min(1))
      .refine((symptoms) => symptoms.length <= 20, { message: 'Máximo de 20 sintomas permitidos' })
      .optional(),

    medications: z
      .array(
        z.object({
          name: z.string().min(1, { message: 'Nome do medicamento é obrigatório' }),
          dosage: z.string().min(1, { message: 'Dosagem é obrigatória' }),
          frequency: z.string().min(1, { message: 'Frequência é obrigatória' }),
          duration: z.string().optional(),
          instructions: z.string().optional(),
        })
      )
      .refine((medications) => medications.length <= 50, {
        message: 'Máximo de 50 medicamentos permitidos',
      })
      .optional(),

    vitalSigns: z
      .object({
        bloodPressure: z
          .object({
            systolic: z.number().min(50).max(300).optional(),
            diastolic: z.number().min(30).max(200).optional(),
          })
          .optional(),
        heartRate: z.number().min(30).max(250).optional(),
        temperature: z.number().min(32).max(45).optional(),
        respiratoryRate: z.number().min(5).max(60).optional(),
        oxygenSaturation: z.number().min(70).max(100).optional(),
        weight: z.number().min(0.5).max(500).optional(),
        height: z.number().min(30).max(250).optional(),
      })
      .optional(),

    attachments: z
      .array(
        z.object({
          filename: z.string().min(1),
          type: z.string().min(1),
          size: z.number().positive(),
          url: z.string().url(),
        })
      )
      .refine((attachments) => attachments.length <= 10, {
        message: 'Máximo de 10 anexos permitidos',
      })
      .optional(),

    isPrivate: z.boolean().optional(),

    tags: z
      .array(z.string().trim().min(1).max(50))
      .refine((tags) => tags.length <= 10, { message: 'Máximo de 10 tags permitidas' })
      .optional(),

    followUpDate: z.string().datetime().optional().or(z.null()),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser fornecido para atualização',
  });

// Schema para consulta de anotações médicas
export const clinicalNotesQuerySchema = z
  .object({
    patientId: z.number().int().positive().optional(),

    type: noteTypeEnum.optional(),

    priority: priorityEnum.optional(),

    search: z
      .string()
      .trim()
      .min(1, { message: 'Termo de busca deve ter pelo menos 1 caractere' })
      .max(100, { message: 'Termo de busca deve ter no máximo 100 caracteres' })
      .optional(),

    tags: z.array(z.string().trim().min(1)).optional(),

    dateFrom: z.string().datetime().optional(),

    dateTo: z.string().datetime().optional(),

    isPrivate: z.boolean().optional(),

    hasFollowUp: z.boolean().optional(),

    authorId: z.number().int().positive().optional(),

    page: z.number().int().min(1, { message: 'Página deve ser maior que 0' }).default(1),

    limit: z
      .number()
      .int()
      .min(1, { message: 'Limite deve ser maior que 0' })
      .max(100, { message: 'Limite não pode ser maior que 100' })
      .default(20),

    sortBy: z
      .enum(['createdAt', 'updatedAt', 'priority', 'type', 'followUpDate'])
      .default('createdAt'),

    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    { message: 'Data inicial deve ser anterior à data final' }
  );

// Schema para resposta de anotação médica
export const clinicalNoteResponseSchema = z.object({
  id: z.number(),
  patientId: z.number(),
  authorId: z.number(),
  type: noteTypeEnum,
  title: z.string(),
  content: z.string(),
  priority: priorityEnum,
  symptoms: z.array(z.string()),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.string().optional(),
      instructions: z.string().optional(),
    })
  ),
  vitalSigns: z
    .object({
      bloodPressure: z
        .object({
          systolic: z.number().optional(),
          diastolic: z.number().optional(),
        })
        .optional(),
      heartRate: z.number().optional(),
      temperature: z.number().optional(),
      respiratoryRate: z.number().optional(),
      oxygenSaturation: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      type: z.string(),
      size: z.number(),
      url: z.string(),
    })
  ),
  isPrivate: z.boolean(),
  tags: z.array(z.string()),
  followUpDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number(),
  // Dados do autor
  author: z.object({
    id: z.number(),
    name: z.string(),
    role: z.string(),
  }),
  // Dados do paciente
  patient: z.object({
    id: z.number(),
    fullName: z.string(),
  }),
});

// Schema para timeline de anotações
export const clinicalNoteTimelineSchema = z.object({
  date: z.string(),
  notes: z.array(clinicalNoteResponseSchema),
});

// Schema para estatísticas de anotações
export const clinicalNotesStatsSchema = z.object({
  total: z.number(),
  byType: z.record(noteTypeEnum, z.number()),
  byPriority: z.record(priorityEnum, z.number()),
  recentCount: z.number(),
  pendingFollowUps: z.number(),
});

// Tipos TypeScript derivados dos schemas
export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;
export type ClinicalNotesQuery = z.infer<typeof clinicalNotesQuerySchema>;
export type ClinicalNoteResponse = z.infer<typeof clinicalNoteResponseSchema>;
export type ClinicalNoteTimeline = z.infer<typeof clinicalNoteTimelineSchema>;
export type ClinicalNotesStats = z.infer<typeof clinicalNotesStatsSchema>;
export type NoteType = z.infer<typeof noteTypeEnum>;
export type Priority = z.infer<typeof priorityEnum>;
