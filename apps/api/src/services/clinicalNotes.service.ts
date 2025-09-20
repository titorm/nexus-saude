import { eq, and, desc, asc, ilike, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { clinicalNotes, patients, users } from '../db/schema.js';
import type {
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
  ClinicalNotesQuery,
  ClinicalNoteResponse,
  ClinicalNoteTimeline,
  ClinicalNotesStats,
  NoteType,
  Priority,
} from '../schemas/clinicalNotes.js';

export class ClinicalNotesService {
  constructor() {}

  /**
   * Criar nova anotação médica
   */
  async createClinicalNote(
    noteData: CreateClinicalNoteInput,
    authorId: number,
    hospitalId: number
  ): Promise<ClinicalNoteResponse> {
    const db = await getDb();

    // Verificar se o paciente existe e pertence ao hospital
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, noteData.patientId), eq(patients.hospitalId, hospitalId)))
      .limit(1);

    if (patient.length === 0) {
      throw new Error('Paciente não encontrado ou não pertence ao seu hospital');
    }

    // Inserir nova anotação
    const newNote = await db
      .insert(clinicalNotes)
      .values({
        patientId: noteData.patientId,
        authorId,
        hospitalId,
        type: noteData.type,
        title: noteData.title,
        content: noteData.content,
        priority: noteData.priority,
        symptoms: noteData.symptoms || [],
        medications: noteData.medications || [],
        vitalSigns: noteData.vitalSigns || {},
        attachments: noteData.attachments || [],
        isPrivate: noteData.isPrivate || false,
        tags: noteData.tags || [],
        followUpDate: noteData.followUpDate || null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return this.formatNoteResponse(newNote[0]);
  }

  /**
   * Buscar anotações médicas com filtros e paginação
   */
  async getClinicalNotes(
    query: ClinicalNotesQuery,
    hospitalId: number,
    userId?: number,
    userRole?: string
  ): Promise<{
    data: ClinicalNoteResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const db = await getDb();
    const offset = (query.page - 1) * query.limit;

    // Construir condições da query
    const conditions = [eq(clinicalNotes.hospitalId, hospitalId)];

    if (query.patientId) {
      conditions.push(eq(clinicalNotes.patientId, query.patientId));
    }

    if (query.type) {
      conditions.push(eq(clinicalNotes.type, query.type));
    }

    if (query.priority) {
      conditions.push(eq(clinicalNotes.priority, query.priority));
    }

    if (query.authorId) {
      conditions.push(eq(clinicalNotes.authorId, query.authorId));
    }

    if (query.isPrivate !== undefined) {
      conditions.push(eq(clinicalNotes.isPrivate, query.isPrivate));
    }

    if (query.hasFollowUp !== undefined) {
      if (query.hasFollowUp) {
        conditions.push(sql`${clinicalNotes.followUpDate} IS NOT NULL`);
      } else {
        conditions.push(sql`${clinicalNotes.followUpDate} IS NULL`);
      }
    }

    if (query.dateFrom) {
      conditions.push(gte(clinicalNotes.createdAt, new Date(query.dateFrom)));
    }

    if (query.dateTo) {
      conditions.push(lte(clinicalNotes.createdAt, new Date(query.dateTo)));
    }

    // Filtros de texto (busca)
    if (query.search) {
      const searchCondition = sql`(
        ${clinicalNotes.title} ILIKE ${'%' + query.search + '%'} OR
        ${clinicalNotes.content} ILIKE ${'%' + query.search + '%'} OR
        ${clinicalNotes.symptoms}::text ILIKE ${'%' + query.search + '%'} OR
        ${clinicalNotes.tags}::text ILIKE ${'%' + query.search + '%'}
      )`;
      conditions.push(searchCondition);
    }

    // Filtro por tags
    if (query.tags && query.tags.length > 0) {
      const tagsCondition = sql`${clinicalNotes.tags} @> ${JSON.stringify(query.tags)}`;
      conditions.push(tagsCondition);
    }

    // Filtro de privacidade (usuários não-admin só veem suas próprias notas privadas)
    if (userRole !== 'admin' && userId) {
      const privateCondition = sql`(
        ${clinicalNotes.isPrivate} = false OR
        (${clinicalNotes.isPrivate} = true AND ${clinicalNotes.authorId} = ${userId})
      )`;
      conditions.push(privateCondition);
    }

    // Determinar ordenação
    const orderColumn = (() => {
      switch (query.sortBy) {
        case 'updatedAt':
          return clinicalNotes.updatedAt;
        case 'priority':
          return clinicalNotes.priority;
        case 'type':
          return clinicalNotes.type;
        case 'followUpDate':
          return clinicalNotes.followUpDate;
        default:
          return clinicalNotes.createdAt;
      }
    })();

    const orderFn = query.sortOrder === 'asc' ? asc : desc;

    // Buscar total de registros
    const totalQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinicalNotes)
      .where(and(...conditions));

    const total = totalQuery[0]?.count || 0;
    const totalPages = Math.ceil(total / query.limit);

    // Buscar anotações com joins
    const notes = await db
      .select({
        note: clinicalNotes,
        author: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
        patient: {
          id: patients.id,
          fullName: patients.fullName,
        },
      })
      .from(clinicalNotes)
      .leftJoin(users, eq(clinicalNotes.authorId, users.id))
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(query.limit)
      .offset(offset);

    const formattedNotes = notes.map((row: any) =>
      this.formatNoteResponse(row.note, row.author, row.patient)
    );

    return {
      data: formattedNotes,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

  /**
   * Buscar anotação médica por ID
   */
  async getClinicalNoteById(
    noteId: number,
    hospitalId: number,
    userId?: number,
    userRole?: string
  ): Promise<ClinicalNoteResponse | null> {
    const db = await getDb();

    const conditions = [eq(clinicalNotes.id, noteId), eq(clinicalNotes.hospitalId, hospitalId)];

    // Filtro de privacidade
    if (userRole !== 'admin' && userId) {
      const privateCondition = sql`(
        ${clinicalNotes.isPrivate} = false OR
        (${clinicalNotes.isPrivate} = true AND ${clinicalNotes.authorId} = ${userId})
      )`;
      conditions.push(privateCondition);
    }

    const result = await db
      .select({
        note: clinicalNotes,
        author: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
        patient: {
          id: patients.id,
          fullName: patients.fullName,
        },
      })
      .from(clinicalNotes)
      .leftJoin(users, eq(clinicalNotes.authorId, users.id))
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .where(and(...conditions))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const { note, author, patient } = result[0];
    return this.formatNoteResponse(note, author, patient);
  }

  /**
   * Atualizar anotação médica
   */
  async updateClinicalNote(
    noteId: number,
    updateData: UpdateClinicalNoteInput,
    hospitalId: number,
    userId: number,
    userRole: string
  ): Promise<ClinicalNoteResponse | null> {
    const db = await getDb();

    // Verificar se a anotação existe e se o usuário tem permissão
    const existingNote = await db
      .select()
      .from(clinicalNotes)
      .where(and(eq(clinicalNotes.id, noteId), eq(clinicalNotes.hospitalId, hospitalId)))
      .limit(1);

    if (existingNote.length === 0) {
      return null;
    }

    const note = existingNote[0];

    // Verificar permissões de edição
    if (userRole !== 'admin' && note.authorId !== userId) {
      throw new Error('Você só pode editar suas próprias anotações');
    }

    // Atualizar a anotação (incrementar versão)
    const updatedNote = await db
      .update(clinicalNotes)
      .set({
        ...updateData,
        version: note.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(clinicalNotes.id, noteId))
      .returning();

    return this.formatNoteResponse(updatedNote[0]);
  }

  /**
   * Remover anotação médica
   */
  async deleteClinicalNote(
    noteId: number,
    hospitalId: number,
    userId: number,
    userRole: string
  ): Promise<boolean> {
    const db = await getDb();

    // Verificar se a anotação existe e se o usuário tem permissão
    const existingNote = await db
      .select()
      .from(clinicalNotes)
      .where(and(eq(clinicalNotes.id, noteId), eq(clinicalNotes.hospitalId, hospitalId)))
      .limit(1);

    if (existingNote.length === 0) {
      return false;
    }

    const note = existingNote[0];

    // Verificar permissões de exclusão (apenas admin ou autor)
    if (userRole !== 'admin' && note.authorId !== userId) {
      throw new Error('Você só pode excluir suas próprias anotações');
    }

    await db.delete(clinicalNotes).where(eq(clinicalNotes.id, noteId));

    return true;
  }

  /**
   * Buscar timeline de anotações para um paciente
   */
  async getPatientTimeline(
    patientId: number,
    hospitalId: number,
    limit: number = 50
  ): Promise<ClinicalNoteTimeline[]> {
    const db = await getDb();

    // Verificar se o paciente pertence ao hospital
    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.hospitalId, hospitalId)))
      .limit(1);

    if (patient.length === 0) {
      throw new Error('Paciente não encontrado');
    }

    const notes = await db
      .select({
        note: clinicalNotes,
        author: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
        patient: {
          id: patients.id,
          fullName: patients.fullName,
        },
      })
      .from(clinicalNotes)
      .leftJoin(users, eq(clinicalNotes.authorId, users.id))
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .where(and(eq(clinicalNotes.patientId, patientId), eq(clinicalNotes.hospitalId, hospitalId)))
      .orderBy(desc(clinicalNotes.createdAt))
      .limit(limit);

    // Agrupar por data
    const groupedByDate = notes.reduce((acc: Record<string, ClinicalNoteResponse[]>, row: any) => {
      const date = row.note.createdAt.toISOString().split('T')[0];

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(this.formatNoteResponse(row.note, row.author, row.patient));
      return acc;
    }, {});

    return Object.entries(groupedByDate).map(([date, notes]: [string, any]) => ({
      date,
      notes,
    }));
  }

  /**
   * Buscar estatísticas de anotações médicas
   */
  async getClinicalNotesStats(hospitalId: number): Promise<ClinicalNotesStats> {
    const db = await getDb();

    // Total de anotações
    const totalQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinicalNotes)
      .where(eq(clinicalNotes.hospitalId, hospitalId));

    const total = totalQuery[0]?.count || 0;

    // Anotações por tipo
    const byTypeQuery = await db
      .select({
        type: clinicalNotes.type,
        count: sql<number>`count(*)::int`,
      })
      .from(clinicalNotes)
      .where(eq(clinicalNotes.hospitalId, hospitalId))
      .groupBy(clinicalNotes.type);

    const byType = byTypeQuery.reduce(
      (acc: Record<NoteType, number>, row: any) => {
        acc[row.type as NoteType] = row.count;
        return acc;
      },
      {} as Record<NoteType, number>
    );

    // Anotações por prioridade
    const byPriorityQuery = await db
      .select({
        priority: clinicalNotes.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(clinicalNotes)
      .where(eq(clinicalNotes.hospitalId, hospitalId))
      .groupBy(clinicalNotes.priority);

    const byPriority = byPriorityQuery.reduce(
      (acc: Record<Priority, number>, row: any) => {
        acc[row.priority as Priority] = row.count;
        return acc;
      },
      {} as Record<Priority, number>
    );

    // Anotações recentes (últimos 7 dias)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinicalNotes)
      .where(and(eq(clinicalNotes.hospitalId, hospitalId), gte(clinicalNotes.createdAt, weekAgo)));

    const recentCount = recentQuery[0]?.count || 0;

    // Follow-ups pendentes
    const pendingFollowUpsQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clinicalNotes)
      .where(
        and(
          eq(clinicalNotes.hospitalId, hospitalId),
          sql`${clinicalNotes.followUpDate} IS NOT NULL`,
          gte(clinicalNotes.followUpDate, new Date())
        )
      );

    const pendingFollowUps = pendingFollowUpsQuery[0]?.count || 0;

    return {
      total,
      byType,
      byPriority,
      recentCount,
      pendingFollowUps,
    };
  }

  /**
   * Buscar anotações com follow-ups pendentes
   */
  async getPendingFollowUps(
    hospitalId: number,
    limit: number = 20
  ): Promise<ClinicalNoteResponse[]> {
    const db = await getDb();

    const notes = await db
      .select({
        note: clinicalNotes,
        author: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
        patient: {
          id: patients.id,
          fullName: patients.fullName,
        },
      })
      .from(clinicalNotes)
      .leftJoin(users, eq(clinicalNotes.authorId, users.id))
      .leftJoin(patients, eq(clinicalNotes.patientId, patients.id))
      .where(
        and(
          eq(clinicalNotes.hospitalId, hospitalId),
          sql`${clinicalNotes.followUpDate} IS NOT NULL`,
          gte(clinicalNotes.followUpDate, new Date())
        )
      )
      .orderBy(asc(clinicalNotes.followUpDate))
      .limit(limit);

    return notes.map((row: any) => this.formatNoteResponse(row.note, row.author, row.patient));
  }

  /**
   * Formatar resposta da anotação médica
   */
  private formatNoteResponse(note: any, author?: any, patient?: any): ClinicalNoteResponse {
    return {
      id: note.id,
      patientId: note.patientId,
      authorId: note.authorId,
      type: note.type,
      title: note.title,
      content: note.content,
      priority: note.priority,
      symptoms: note.symptoms || [],
      medications: note.medications || [],
      vitalSigns: note.vitalSigns || {},
      attachments: note.attachments || [],
      isPrivate: note.isPrivate || false,
      tags: note.tags || [],
      followUpDate: note.followUpDate ? note.followUpDate.toISOString() : null,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      version: note.version,
      author: author || {
        id: note.authorId,
        name: 'Unknown',
        role: 'unknown',
      },
      patient: patient || {
        id: note.patientId,
        fullName: 'Unknown',
      },
    };
  }
}

// Exportar instância única do serviço
export const clinicalNotesService = new ClinicalNotesService();
