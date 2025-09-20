import { z } from 'zod';

// Schema para criação de paciente
export const createPatientSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(256, 'Nome não pode exceder 256 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform((name) => name.trim()),

  dateOfBirth: z
    .string()
    .datetime('Data de nascimento deve estar no formato ISO 8601')
    .transform((date) => new Date(date))
    .refine((date) => {
      const today = new Date();
      const maxAge = new Date(today.getFullYear() - 150, today.getMonth(), today.getDate());
      return date <= today && date >= maxAge;
    }, 'Data de nascimento deve ser válida (não pode ser futura nem muito antiga)'),

  hospitalId: z
    .number()
    .int('ID do hospital deve ser um número inteiro')
    .positive('ID do hospital deve ser positivo'),
});

// Schema para atualização de paciente (campos opcionais)
export const updatePatientSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(256, 'Nome não pode exceder 256 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform((name) => name.trim())
    .optional(),

  dateOfBirth: z
    .string()
    .datetime('Data de nascimento deve estar no formato ISO 8601')
    .transform((date) => new Date(date))
    .refine((date) => {
      const today = new Date();
      const maxAge = new Date(today.getFullYear() - 150, today.getMonth(), today.getDate());
      return date <= today && date >= maxAge;
    }, 'Data de nascimento deve ser válida (não pode ser futura nem muito antiga)')
    .optional(),

  hospitalId: z
    .number()
    .int('ID do hospital deve ser um número inteiro')
    .positive('ID do hospital deve ser positivo')
    .optional(),
});

// Schema para parâmetros de rota
export const patientParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID deve ser um número')
    .transform((id) => parseInt(id, 10))
    .refine((id) => id > 0, 'ID deve ser positivo'),
});

// Schema para query parameters de listagem
export const patientsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((page) => parseInt(page, 10))
    .refine((page) => page > 0, 'Página deve ser maior que 0'),

  limit: z
    .string()
    .optional()
    .default('20')
    .transform((limit) => parseInt(limit, 10))
    .refine((limit) => limit > 0 && limit <= 100, 'Limite deve estar entre 1 e 100'),

  search: z
    .string()
    .min(1, 'Termo de busca deve ter pelo menos 1 caractere')
    .max(100, 'Termo de busca não pode exceder 100 caracteres')
    .transform((search) => search.trim())
    .optional(),

  hospitalId: z
    .string()
    .optional()
    .transform((id) => (id ? parseInt(id, 10) : undefined))
    .refine((id) => !id || id > 0, 'ID do hospital deve ser positivo'),

  sortBy: z.enum(['fullName', 'dateOfBirth', 'id']).optional().default('fullName'),

  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Schemas de resposta
export const patientResponseSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  dateOfBirth: z.date(),
  hospitalId: z.number(),
  age: z.number().optional(), // Calculado dinamicamente
});

export const patientsListResponseSchema = z.object({
  data: z.array(patientResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Tipos TypeScript derivados dos schemas
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientParams = z.infer<typeof patientParamsSchema>;
export type PatientsQuery = z.infer<typeof patientsQuerySchema>;
export type PatientResponse = z.infer<typeof patientResponseSchema>;
export type PatientsListResponse = z.infer<typeof patientsListResponseSchema>;
