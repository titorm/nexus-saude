import { eq, and, or, gte, lte, sql, desc, asc, like, ilike, inArray, isNull } from 'drizzle-orm';
import {
  getDb,
  searchIndexes,
  searchHistory,
  patients,
  clinicalNotes,
  appointments,
  users,
  appointmentTypes,
} from '../db/index.js';
import type {
  SearchResult,
  SearchResults,
  AutocompleteSuggestion,
  SearchAnalytics,
  SearchHistoryItem,
  GlobalSearchQuery,
  AutocompleteQuery,
  SearchPatientsQuery,
  SearchClinicalNotesQuery,
  SearchAppointmentsQuery,
  SearchEvent,
  SearchHistoryQuery,
  SearchAnalyticsQuery,
  SearchFilters,
} from '../schemas/search.js';

export class SearchService {
  /**
   * Busca global unificada em todas as entidades
   */
  async globalSearch(
    query: GlobalSearchQuery,
    hospitalId: number,
    userId?: number
  ): Promise<SearchResults> {
    const startTime = Date.now();
    const db = await getDb();

    try {
      // Preparar condições base
      const baseConditions = [eq(searchIndexes.hospitalId, hospitalId)];

      // Filtro por tipos de entidade
      if (query.types && query.types.length > 0) {
        baseConditions.push(inArray(searchIndexes.entityType, query.types));
      }

      // Filtro por data
      if (query.filters?.dateRange) {
        if (query.filters.dateRange.start) {
          baseConditions.push(
            gte(searchIndexes.createdAt, new Date(query.filters.dateRange.start))
          );
        }
        if (query.filters.dateRange.end) {
          baseConditions.push(lte(searchIndexes.createdAt, new Date(query.filters.dateRange.end)));
        }
      }

      // Query de busca com full-text search
      const searchCondition = sql`(
        ${searchIndexes.searchVector} @@ plainto_tsquery('portuguese', ${query.q}) OR
        ${searchIndexes.title} ILIKE ${'%' + query.q + '%'} OR
        ${searchIndexes.content} ILIKE ${'%' + query.q + '%'}
      )`;

      // Buscar resultados com ranking de relevância
      const searchQuery = db
        .select({
          id: searchIndexes.id,
          entityType: searchIndexes.entityType,
          entityId: searchIndexes.entityId,
          title: searchIndexes.title,
          content: searchIndexes.content,
          metadata: searchIndexes.metadata,
          createdAt: searchIndexes.createdAt,
          updatedAt: searchIndexes.updatedAt,
          // Calcular relevância
          relevance: sql<number>`(
            CASE 
              WHEN ${searchIndexes.title} ILIKE ${'%' + query.q + '%'} THEN 0.4
              ELSE 0.0
            END +
            CASE 
              WHEN ${searchIndexes.content} ILIKE ${'%' + query.q + '%'} THEN 0.2
              ELSE 0.0
            END +
            CASE 
              WHEN ${searchIndexes.searchVector} @@ plainto_tsquery('portuguese', ${query.q}) THEN 0.3
              ELSE 0.0
            END +
            CASE 
              WHEN ${searchIndexes.entityType} = 'patient' THEN 0.1
              WHEN ${searchIndexes.entityType} = 'clinical_note' THEN 0.05
              ELSE 0.0
            END
          )`,
        })
        .from(searchIndexes)
        .where(and(...baseConditions, searchCondition))
        .orderBy(desc(sql`relevance`), desc(searchIndexes.updatedAt))
        .limit(query.limit)
        .offset(query.offset);

      const results = await searchQuery;

      // Contar total de resultados
      const countQuery = await db
        .select({ count: sql<number>`count(*)` })
        .from(searchIndexes)
        .where(and(...baseConditions, searchCondition));

      const total = countQuery[0]?.count || 0;

      // Formatar resultados
      const formattedResults: SearchResult[] = results.map((row: any) => ({
        id: `${row.entityType}:${row.entityId}`,
        type: row.entityType as 'patient' | 'clinical_note' | 'appointment',
        title: row.title,
        content: row.content,
        excerpt: this.generateExcerpt(row.content, query.q),
        relevanceScore: Number(row.relevance || 0),
        metadata: {
          ...(row.metadata as any),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        highlights: this.generateHighlights(row.title, row.content, query.q),
      }));

      // Registrar evento de busca se userId fornecido
      if (userId) {
        await this.recordSearchEvent(
          userId,
          {
            query: query.q,
            filters: query.filters,
            resultsCount: total,
          },
          hospitalId
        );
      }

      const searchTime = Date.now() - startTime;

      return {
        results: formattedResults,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasNext: query.offset + query.limit < total,
          hasPrev: query.offset > 0,
        },
        searchTime,
      };
    } catch (error) {
      throw new Error(`Erro na busca global: ${error}`);
    }
  }

  /**
   * Busca específica em pacientes
   */
  async searchPatients(query: SearchPatientsQuery, hospitalId: number): Promise<SearchResult[]> {
    const db = await getDb();

    try {
      const searchCondition = sql`(
        ${patients.fullName} ILIKE ${'%' + query.q + '%'} OR
        ${patients.email} ILIKE ${'%' + query.q + '%'} OR
        ${patients.phone} ILIKE ${'%' + query.q + '%'}
      )`;

      const conditions = [eq(patients.hospitalId, hospitalId), searchCondition];

      // Assumindo que vamos adicionar campo isActive na migração
      // if (query.status !== 'all') {
      //   conditions.push(eq(patients.isActive, query.status === 'active'));
      // }

      const orderBy =
        query.sortBy === 'name'
          ? [asc(patients.fullName)]
          : query.sortOrder === 'desc'
            ? [desc(patients.createdAt)]
            : [asc(patients.createdAt)];

      const results = await db
        .select({
          id: patients.id,
          fullName: patients.fullName,
          email: patients.email,
          phone: patients.phone,
          dateOfBirth: patients.dateOfBirth,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt,
        })
        .from(patients)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(query.limit)
        .offset(query.offset);

      return results.map((patient: any) => ({
        id: `patient:${patient.id}`,
        type: 'patient' as const,
        title: patient.fullName,
        content: `${patient.email || ''} | ${patient.phone || ''}`,
        excerpt: this.generateExcerpt(`${patient.fullName} ${patient.email || ''}`, query.q),
        relevanceScore: this.calculatePatientRelevance(patient, query.q),
        metadata: {
          patientName: patient.fullName,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
          status: 'active', // TODO: usar isActive quando disponível
        },
        highlights: this.generateHighlights(
          patient.fullName,
          `${patient.email || ''} ${patient.phone || ''}`,
          query.q
        ),
      }));
    } catch (error) {
      throw new Error(`Erro na busca de pacientes: ${error}`);
    }
  }

  /**
   * Busca específica em notas clínicas
   */
  async searchClinicalNotes(
    query: SearchClinicalNotesQuery,
    hospitalId: number
  ): Promise<SearchResult[]> {
    const db = await getDb();

    try {
      const searchCondition = sql`(
        ${clinicalNotes.title} ILIKE ${'%' + query.q + '%'} OR
        ${clinicalNotes.content} ILIKE ${'%' + query.q + '%'} OR
        ${clinicalNotes.symptoms}::text ILIKE ${'%' + query.q + '%'} OR
        ${clinicalNotes.tags}::text ILIKE ${'%' + query.q + '%'}
      )`;

      const conditions = [eq(clinicalNotes.hospitalId, hospitalId), searchCondition];

      // Filtros adicionais
      if (query.types && query.types.length > 0) {
        conditions.push(inArray(clinicalNotes.type, query.types));
      }

      if (query.priority && query.priority.length > 0) {
        conditions.push(inArray(clinicalNotes.priority, query.priority));
      }

      if (query.authorId) {
        conditions.push(eq(clinicalNotes.authorId, query.authorId));
      }

      if (query.patientId) {
        conditions.push(eq(clinicalNotes.patientId, query.patientId));
      }

      if (query.dateRange?.start) {
        conditions.push(gte(clinicalNotes.createdAt, new Date(query.dateRange.start)));
      }

      if (query.dateRange?.end) {
        conditions.push(lte(clinicalNotes.createdAt, new Date(query.dateRange.end)));
      }

      // Join com dados do autor e paciente
      const results = await db
        .select({
          note: clinicalNotes,
          authorName: users.name,
          patientName: patients.fullName,
        })
        .from(clinicalNotes)
        .leftJoin(users, eq(clinicalNotes.authorId, users.id))
        .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
        .where(and(...conditions))
        .orderBy(
          query.sortBy === 'relevance'
            ? desc(clinicalNotes.createdAt)
            : query.sortOrder === 'desc'
              ? desc(clinicalNotes.createdAt)
              : asc(clinicalNotes.createdAt)
        )
        .limit(query.limit)
        .offset(query.offset);

      return results.map((row: any) => ({
        id: `clinical_note:${row.note.id}`,
        type: 'clinical_note' as const,
        title: row.note.title,
        content: row.note.content,
        excerpt: this.generateExcerpt(row.note.content, query.q),
        relevanceScore: this.calculateNoteRelevance(row.note, query.q),
        metadata: {
          authorName: row.authorName,
          patientName: row.patientName,
          createdAt: row.note.createdAt,
          updatedAt: row.note.updatedAt,
          priority: row.note.priority,
          tags: row.note.tags as string[],
        },
        highlights: this.generateHighlights(row.note.title, row.note.content, query.q),
      }));
    } catch (error) {
      throw new Error(`Erro na busca de notas clínicas: ${error}`);
    }
  }

  /**
   * Busca específica em agendamentos
   */
  async searchAppointments(
    query: SearchAppointmentsQuery,
    hospitalId: number
  ): Promise<SearchResult[]> {
    const db = await getDb();

    try {
      const searchCondition = sql`(
        ${appointments.notes} ILIKE ${'%' + query.q + '%'} OR
        ${appointments.reason} ILIKE ${'%' + query.q + '%'} OR
        ${users.name} ILIKE ${'%' + query.q + '%'} OR
        ${patients.fullName} ILIKE ${'%' + query.q + '%'}
      )`;

      const conditions = [eq(appointments.hospitalId, hospitalId), searchCondition];

      // Filtros adicionais
      if (query.status && query.status.length > 0) {
        conditions.push(inArray(appointments.status, query.status));
      }

      if (query.doctorId) {
        conditions.push(eq(appointments.doctorId, query.doctorId));
      }

      if (query.patientId) {
        conditions.push(eq(appointments.patientId, query.patientId));
      }

      if (query.appointmentTypeId) {
        conditions.push(eq(appointments.appointmentTypeId, query.appointmentTypeId));
      }

      if (query.dateRange?.start) {
        conditions.push(gte(appointments.scheduledAt, new Date(query.dateRange.start)));
      }

      if (query.dateRange?.end) {
        conditions.push(lte(appointments.scheduledAt, new Date(query.dateRange.end)));
      }

      // Join com dados relacionados
      const results = await db
        .select({
          appointment: appointments,
          doctorName: users.name,
          patientName: patients.fullName,
          appointmentTypeName: appointmentTypes.name,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.doctorId, users.id))
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
        .where(and(...conditions))
        .orderBy(
          query.sortBy === 'relevance'
            ? desc(appointments.scheduledAt)
            : query.sortOrder === 'desc'
              ? desc(appointments.scheduledAt)
              : asc(appointments.scheduledAt)
        )
        .limit(query.limit)
        .offset(query.offset);

      return results.map((row: any) => ({
        id: `appointment:${row.appointment.id}`,
        type: 'appointment' as const,
        title: `Consulta: ${row.patientName} - ${row.doctorName}`,
        content: `${row.appointment.reason || ''} ${row.appointment.notes || ''}`.trim(),
        excerpt: this.generateExcerpt(
          `${row.appointment.reason || ''} ${row.appointment.notes || ''}`.trim(),
          query.q
        ),
        relevanceScore: this.calculateAppointmentRelevance(row.appointment, query.q),
        metadata: {
          doctorName: row.doctorName,
          patientName: row.patientName,
          appointmentType: row.appointmentTypeName,
          appointmentDate: row.appointment.scheduledAt,
          createdAt: row.appointment.createdAt,
          updatedAt: row.appointment.updatedAt,
          status: row.appointment.status,
        },
        highlights: this.generateHighlights(
          `Consulta: ${row.patientName} - ${row.doctorName}`,
          `${row.appointment.reason || ''} ${row.appointment.notes || ''}`.trim(),
          query.q
        ),
      }));
    } catch (error) {
      throw new Error(`Erro na busca de agendamentos: ${error}`);
    }
  }

  /**
   * Autocomplete para sugestões de busca
   */
  async getAutocompleteSuggestions(
    query: AutocompleteQuery,
    hospitalId: number
  ): Promise<AutocompleteSuggestion[]> {
    const db = await getDb();
    const suggestions: AutocompleteSuggestion[] = [];

    try {
      // Sugestões de pacientes
      if (!query.types || query.types.includes('patient')) {
        const patientSuggestions = await db
          .select({
            name: patients.fullName,
            id: patients.id,
          })
          .from(patients)
          .where(and(eq(patients.hospitalId, hospitalId), ilike(patients.fullName, `%${query.q}%`)))
          .limit(5);

        suggestions.push(
          ...patientSuggestions.map((p: any) => ({
            text: p.name,
            type: 'patient' as const,
            metadata: { id: p.id },
          }))
        );
      }

      // Sugestões de autores (médicos)
      const authorSuggestions = await db
        .select({
          name: users.name,
          id: users.id,
        })
        .from(users)
        .where(and(eq(users.hospitalId, hospitalId), ilike(users.name, `%${query.q}%`)))
        .limit(3);

      suggestions.push(
        ...authorSuggestions.map((a: any) => ({
          text: a.name,
          type: 'author' as const,
          metadata: { id: a.id },
        }))
      );

      // Sugestões de tags das notas clínicas
      if (!query.types || query.types.includes('clinical_note')) {
        const tagSuggestions = await db
          .select({
            tags: clinicalNotes.tags,
          })
          .from(clinicalNotes)
          .where(
            and(
              eq(clinicalNotes.hospitalId, hospitalId),
              sql`${clinicalNotes.tags}::text ILIKE ${'%' + query.q + '%'}`
            )
          )
          .limit(10);

        const allTags = new Set<string>();
        tagSuggestions.forEach((row: any) => {
          if (Array.isArray(row.tags)) {
            row.tags.forEach((tag: string) => {
              if (tag.toLowerCase().includes(query.q.toLowerCase())) {
                allTags.add(tag);
              }
            });
          }
        });

        suggestions.push(
          ...Array.from(allTags)
            .slice(0, 3)
            .map((tag) => ({
              text: tag,
              type: 'tag' as const,
            }))
        );
      }

      // Sugestões de queries populares do histórico
      const popularQueries = await db
        .select({
          query: searchHistory.query,
          count: sql<number>`count(*)`,
        })
        .from(searchHistory)
        .where(
          and(eq(searchHistory.hospitalId, hospitalId), ilike(searchHistory.query, `%${query.q}%`))
        )
        .groupBy(searchHistory.query)
        .orderBy(desc(sql`count(*)`))
        .limit(3);

      suggestions.push(
        ...popularQueries.map((pq: any) => ({
          text: pq.query,
          type: 'query' as const,
          count: Number(pq.count),
        }))
      );

      return suggestions.slice(0, query.limit);
    } catch (error) {
      throw new Error(`Erro no autocomplete: ${error}`);
    }
  }

  /**
   * Registrar evento de busca
   */
  async recordSearchEvent(
    userId: number,
    event: SearchEvent,
    hospitalId: number,
    clickedResultId?: string
  ): Promise<void> {
    const db = await getDb();

    try {
      await db.insert(searchHistory).values({
        userId,
        query: event.query,
        filters: event.filters || {},
        resultsCount: event.resultsCount,
        clickedResultId: clickedResultId || event.clickedResultId,
        hospitalId,
      });
    } catch (error) {
      // Log do erro mas não falha a busca
      console.error('Erro ao registrar evento de busca:', error);
    }
  }

  /**
   * Obter histórico de buscas do usuário
   */
  async getSearchHistory(
    userId: number,
    query: SearchHistoryQuery,
    hospitalId: number
  ): Promise<SearchHistoryItem[]> {
    const db = await getDb();

    try {
      const results = await db
        .select()
        .from(searchHistory)
        .where(and(eq(searchHistory.userId, userId), eq(searchHistory.hospitalId, hospitalId)))
        .orderBy(desc(searchHistory.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      return results.map((row: any) => ({
        id: row.id,
        query: row.query,
        filters: row.filters as SearchFilters,
        resultsCount: row.resultsCount,
        clickedResultId: row.clickedResultId || undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar histórico: ${error}`);
    }
  }

  /**
   * Obter analytics de busca
   */
  async getSearchAnalytics(
    query: SearchAnalyticsQuery,
    hospitalId: number
  ): Promise<SearchAnalytics> {
    const db = await getDb();

    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = query.endDate ? new Date(query.endDate) : now;

      // Calcular período baseado no tipo
      switch (query.period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      if (query.startDate) {
        startDate = new Date(query.startDate);
      }

      const conditions = [
        eq(searchHistory.hospitalId, hospitalId),
        gte(searchHistory.createdAt, startDate),
        lte(searchHistory.createdAt, endDate),
      ];

      // Total de buscas
      const totalSearches = await db
        .select({ count: sql<number>`count(*)` })
        .from(searchHistory)
        .where(and(...conditions));

      // Usuários únicos
      const uniqueUsers = await db
        .select({ count: sql<number>`count(distinct ${searchHistory.userId})` })
        .from(searchHistory)
        .where(and(...conditions));

      // Top queries
      const topQueries = await db
        .select({
          query: searchHistory.query,
          count: sql<number>`count(*)`,
        })
        .from(searchHistory)
        .where(and(...conditions))
        .groupBy(searchHistory.query)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Média de resultados por busca
      const avgResults = await db
        .select({
          avg: sql<number>`AVG(${searchHistory.resultsCount})`,
        })
        .from(searchHistory)
        .where(and(...conditions));

      // Taxa de clique (buscas com clique / total de buscas)
      const clickThroughRate = await db
        .select({
          clicked: sql<number>`count(${searchHistory.clickedResultId})`,
          total: sql<number>`count(*)`,
        })
        .from(searchHistory)
        .where(and(...conditions));

      // Taxa de buscas sem resultados
      const noResultsRate = await db
        .select({
          noResults: sql<number>`count(case when ${searchHistory.resultsCount} = 0 then 1 end)`,
          total: sql<number>`count(*)`,
        })
        .from(searchHistory)
        .where(and(...conditions));

      const clickedCount = Number(clickThroughRate[0]?.clicked || 0);
      const totalCount = Number(totalSearches[0]?.count || 0);
      const noResultsCount = Number(noResultsRate[0]?.noResults || 0);

      return {
        totalSearches: totalCount,
        uniqueUsers: Number(uniqueUsers[0]?.count || 0),
        topQueries: topQueries.map((tq: any) => ({
          query: tq.query,
          count: Number(tq.count),
        })),
        searchesByType: {}, // TODO: Implementar se necessário
        avgResultsPerSearch: Number(avgResults[0]?.avg || 0),
        avgSearchTime: 0, // TODO: Implementar medição de tempo
        clickThroughRate: totalCount > 0 ? clickedCount / totalCount : 0,
        noResultsRate: totalCount > 0 ? noResultsCount / totalCount : 0,
        period: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      throw new Error(`Erro ao buscar analytics: ${error}`);
    }
  }

  /**
   * Atualizar índice de busca para uma entidade específica
   */
  async updateEntityIndex(entityType: string, entityId: number, hospitalId: number): Promise<void> {
    const db = await getDb();

    try {
      let title = '';
      let content = '';
      let metadata = {};

      // Buscar dados baseado no tipo de entidade
      switch (entityType) {
        case 'patient':
          const patient = await db
            .select()
            .from(patients)
            .where(eq(patients.id, entityId))
            .limit(1);

          if (patient[0]) {
            title = `${patient[0].firstName} ${patient[0].lastName}`;
            content = `${title} ${patient[0].email} ${patient[0].cpf} ${patient[0].phone}`;
            metadata = {
              status: patient[0].isActive ? 'active' : 'inactive',
              dateOfBirth: patient[0].dateOfBirth,
            };
          }
          break;

        case 'clinical_note':
          const note = await db
            .select({
              note: clinicalNotes,
              authorName: users.name,
              patientName: patients.fullName,
            })
            .from(clinicalNotes)
            .leftJoin(users, eq(clinicalNotes.authorId, users.id))
            .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
            .where(eq(clinicalNotes.id, entityId))
            .limit(1);

          if (note[0]) {
            title = note[0].note.title;
            content = `${title} ${note[0].note.content} ${(note[0].note.symptoms as string[])?.join(' ') || ''} ${(note[0].note.tags as string[])?.join(' ') || ''}`;
            metadata = {
              authorName: note[0].authorName,
              patientName: note[0].patientName,
              type: note[0].note.type,
              priority: note[0].note.priority,
              tags: note[0].note.tags,
            };
          }
          break;

        case 'appointment':
          const appointment = await db
            .select({
              appointment: appointments,
              doctorName: users.name,
              patientName: patients.fullName,
              appointmentTypeName: appointmentTypes.name,
            })
            .from(appointments)
            .leftJoin(users, eq(appointments.doctorId, users.id))
            .leftJoin(patients, eq(appointments.patientId, patients.id))
            .leftJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
            .where(eq(appointments.id, entityId))
            .limit(1);

          if (appointment[0]) {
            title = `Consulta: ${appointment[0].patientName} - ${appointment[0].doctorName}`;
            content = `${title} ${appointment[0].appointment.reason || ''} ${appointment[0].appointment.notes || ''}`;
            metadata = {
              doctorName: appointment[0].doctorName,
              patientName: appointment[0].patientName,
              appointmentType: appointment[0].appointmentTypeName,
              status: appointment[0].appointment.status,
              scheduledAt: appointment[0].appointment.scheduledAt,
            };
          }
          break;
      }

      if (title && content) {
        // Verificar se índice já existe
        const existingIndex = await db
          .select()
          .from(searchIndexes)
          .where(
            and(
              eq(searchIndexes.entityType, entityType as any),
              eq(searchIndexes.entityId, entityId)
            )
          )
          .limit(1);

        if (existingIndex[0]) {
          // Atualizar índice existente
          await db
            .update(searchIndexes)
            .set({
              title,
              content,
              metadata,
              updatedAt: new Date(),
            })
            .where(eq(searchIndexes.id, existingIndex[0].id));
        } else {
          // Criar novo índice
          await db.insert(searchIndexes).values({
            entityType: entityType as any,
            entityId,
            title,
            content,
            metadata,
            hospitalId,
          });
        }
      }
    } catch (error) {
      console.error(`Erro ao atualizar índice para ${entityType}:${entityId}:`, error);
    }
  }

  /**
   * Funções auxiliares privadas
   */
  private generateExcerpt(content: string, query: string, maxLength = 200): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);

    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);

    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  private generateHighlights(title: string, content: string, query: string) {
    const highlight = (text: string, searchTerm: string): string[] => {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      return text.split(regex).filter(Boolean);
    };

    return {
      title: title.toLowerCase().includes(query.toLowerCase()) ? highlight(title, query) : [],
      content: content.toLowerCase().includes(query.toLowerCase()) ? highlight(content, query) : [],
    };
  }

  private calculatePatientRelevance(patient: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();

    if (fullName.includes(queryLower)) score += 0.4;
    if (patient.email?.toLowerCase().includes(queryLower)) score += 0.3;
    if (patient.cpf?.includes(query)) score += 0.2;
    if (patient.phone?.includes(query)) score += 0.1;

    return Math.min(score, 1);
  }

  private calculateNoteRelevance(note: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (note.title?.toLowerCase().includes(queryLower)) score += 0.4;
    if (note.content?.toLowerCase().includes(queryLower)) score += 0.3;
    if (note.priority === 'critical') score += 0.1;
    if (note.priority === 'high') score += 0.05;

    return Math.min(score, 1);
  }

  private calculateAppointmentRelevance(appointment: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (appointment.reason?.toLowerCase().includes(queryLower)) score += 0.3;
    if (appointment.notes?.toLowerCase().includes(queryLower)) score += 0.2;

    // Boost para agendamentos recentes
    const daysSince = (Date.now() - appointment.scheduledAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 0.1;
    else if (daysSince < 30) score += 0.05;

    return Math.min(score, 1);
  }
}
