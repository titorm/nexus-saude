import { z } from 'zod';

// Schema para filtros de busca
export const searchFiltersSchema = z.object({
  types: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  authors: z.array(z.number().int().positive()).optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.enum(['critical', 'high', 'normal', 'low'])).optional(),
  tags: z.array(z.string()).optional(),
});

// Schema para busca global
export const globalSearchSchema = z.object({
  q: z.string().min(1).max(500, 'Query muito longa'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  types: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
  filters: searchFiltersSchema.optional(),
});

// Schema para autocomplete
export const autocompleteSchema = z.object({
  q: z.string().min(2, 'Query deve ter pelo menos 2 caracteres').max(100),
  types: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

// Schema para busca específica de pacientes
export const searchPatientsSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Schema para busca específica de notas clínicas
export const searchClinicalNotesSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  types: z
    .array(
      z.enum([
        'consultation',
        'diagnosis',
        'prescription',
        'examination',
        'laboratory',
        'imaging',
        'procedure',
        'follow_up',
        'referral',
        'discharge',
        'emergency',
        'observation',
        'progress',
        'admission',
      ])
    )
    .optional(),
  priority: z.array(z.enum(['critical', 'high', 'normal', 'low'])).optional(),
  authorId: z.number().int().positive().optional(),
  patientId: z.number().int().positive().optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'relevance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schema para busca específica de agendamentos
export const searchAppointmentsSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z
    .array(
      z.enum([
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ])
    )
    .optional(),
  doctorId: z.number().int().positive().optional(),
  patientId: z.number().int().positive().optional(),
  appointmentTypeId: z.number().int().positive().optional(),
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  sortBy: z.enum(['scheduledAt', 'createdAt', 'relevance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schema para registrar evento de busca
export const searchEventSchema = z.object({
  query: z.string().min(1).max(500),
  filters: searchFiltersSchema.optional(),
  resultsCount: z.number().int().min(0),
  clickedResultId: z.string().optional(), // formato: "patient:123"
});

// Schema para histórico de buscas
export const searchHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

// Schema para analytics de busca
export const searchAnalyticsSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('week'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Schema para rebuild de índices
export const rebuildIndexesSchema = z.object({
  entityTypes: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
  forceRebuild: z.boolean().default(false),
});

// Tipos TypeScript inferidos dos schemas
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type GlobalSearchQuery = z.infer<typeof globalSearchSchema>;
export type AutocompleteQuery = z.infer<typeof autocompleteSchema>;
export type SearchPatientsQuery = z.infer<typeof searchPatientsSchema>;
export type SearchClinicalNotesQuery = z.infer<typeof searchClinicalNotesSchema>;
export type SearchAppointmentsQuery = z.infer<typeof searchAppointmentsSchema>;
export type SearchEvent = z.infer<typeof searchEventSchema>;
export type SearchHistoryQuery = z.infer<typeof searchHistoryQuerySchema>;
export type SearchAnalyticsQuery = z.infer<typeof searchAnalyticsSchema>;
export type RebuildIndexesQuery = z.infer<typeof rebuildIndexesSchema>;

// Tipos para resposta da API
export interface SearchResult {
  id: string; // formato: "patient:123"
  type: 'patient' | 'clinical_note' | 'appointment';
  title: string;
  content: string;
  excerpt: string;
  relevanceScore: number;
  metadata: {
    authorName?: string;
    patientName?: string;
    doctorName?: string;
    createdAt: Date;
    updatedAt?: Date;
    status?: string;
    priority?: string;
    tags?: string[];
    appointmentDate?: Date;
    appointmentType?: string;
  };
  highlights?: {
    title?: string[];
    content?: string[];
  };
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'query' | 'patient' | 'author' | 'tag' | 'appointment_type';
  metadata?: any;
  count?: number;
}

export interface SearchResults {
  results: SearchResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets?: {
    types: Array<{ type: string; count: number }>;
    authors: Array<{ id: number; name: string; count: number }>;
    tags: Array<{ tag: string; count: number }>;
    priorities: Array<{ priority: string; count: number }>;
  };
  searchTime: number; // em millisegundos
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  topQueries: Array<{ query: string; count: number }>;
  searchesByType: Record<string, number>;
  avgResultsPerSearch: number;
  avgSearchTime: number;
  clickThroughRate: number;
  noResultsRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  filters?: SearchFilters;
  resultsCount: number;
  clickedResultId?: string;
  createdAt: Date;
}
