import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { getDb, patients, hospitals } from '../db/index.js';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientsQuery,
  PatientResponse,
  PatientsListResponse,
} from '../schemas/patients.js';

export class PatientsService {
  private async getDbInstance() {
    return await getDb();
  }

  /**
   * Calcula a idade baseada na data de nascimento
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Formata os dados do paciente para resposta da API
   */
  private formatPatientResponse(patient: any): PatientResponse {
    return {
      id: patient.id,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      hospitalId: patient.hospitalId,
      age: this.calculateAge(patient.dateOfBirth),
    };
  }

  /**
   * Lista pacientes com paginação e filtros
   */
  async getPatients(query: PatientsQuery, userHospitalId: number): Promise<PatientsListResponse> {
    const db = await this.getDbInstance();
    const { page, limit, search, hospitalId, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    // Construir condições de filtro
    const conditions = [];

    // Filtro por hospital (usuário só vê pacientes do seu hospital, exceto admins)
    const targetHospitalId = hospitalId || userHospitalId;
    conditions.push(eq(patients.hospitalId, targetHospitalId));

    // Busca por nome (case-insensitive)
    if (search) {
      conditions.push(ilike(patients.fullName, `%${search}%`));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Configurar ordenação
    const orderBy =
      sortBy === 'dateOfBirth'
        ? sortOrder === 'desc'
          ? desc(patients.dateOfBirth)
          : asc(patients.dateOfBirth)
        : sortBy === 'id'
          ? sortOrder === 'desc'
            ? desc(patients.id)
            : asc(patients.id)
          : sortOrder === 'desc'
            ? desc(patients.fullName)
            : asc(patients.fullName);

    // Buscar pacientes com paginação
    const [patientsData, totalResult] = await Promise.all([
      db.select().from(patients).where(whereClause).orderBy(orderBy).limit(limit).offset(offset),

      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(patients)
        .where(whereClause),
    ]);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    return {
      data: patientsData.map((patient: any) => this.formatPatientResponse(patient)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Busca um paciente por ID
   */
  async getPatientById(id: number, userHospitalId: number): Promise<PatientResponse | null> {
    const db = await this.getDbInstance();
    const result = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.hospitalId, userHospitalId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.formatPatientResponse(result[0]);
  }

  /**
   * Cria um novo paciente
   */
  async createPatient(data: CreatePatientInput, userHospitalId: number): Promise<PatientResponse> {
    const db = await this.getDbInstance();

    // Verificar se o hospital existe
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.id, data.hospitalId))
      .limit(1);

    if (hospital.length === 0) {
      throw new Error('Hospital não encontrado');
    }

    // Verificar se o usuário tem permissão para criar pacientes neste hospital
    if (data.hospitalId !== userHospitalId) {
      throw new Error('Usuário não tem permissão para criar pacientes neste hospital');
    }

    // Verificar se já existe um paciente com o mesmo nome e data de nascimento
    const existingPatient = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.fullName, data.fullName),
          eq(patients.dateOfBirth, data.dateOfBirth),
          eq(patients.hospitalId, data.hospitalId)
        )
      )
      .limit(1);

    if (existingPatient.length > 0) {
      throw new Error('Já existe um paciente com este nome e data de nascimento no hospital');
    }

    const result = await db
      .insert(patients)
      .values({
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        hospitalId: data.hospitalId,
      })
      .returning();

    return this.formatPatientResponse(result[0]);
  }

  /**
   * Atualiza um paciente existente
   */
  async updatePatient(
    id: number,
    data: UpdatePatientInput,
    userHospitalId: number
  ): Promise<PatientResponse | null> {
    const db = await this.getDbInstance();

    // Verificar se o paciente existe e pertence ao hospital do usuário
    const existingPatient = await this.getPatientById(id, userHospitalId);
    if (!existingPatient) {
      return null;
    }

    // Verificar se o hospital de destino existe (se foi fornecido)
    if (data.hospitalId && data.hospitalId !== userHospitalId) {
      throw new Error('Usuário não tem permissão para transferir pacientes para outro hospital');
    }

    // Verificar duplicatas (nome + data de nascimento)
    if (data.fullName || data.dateOfBirth) {
      const checkName = data.fullName || existingPatient.fullName;
      const checkDate = data.dateOfBirth || existingPatient.dateOfBirth;
      const checkHospitalId = data.hospitalId || existingPatient.hospitalId;

      const duplicate = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.fullName, checkName),
            eq(patients.dateOfBirth, checkDate),
            eq(patients.hospitalId, checkHospitalId),
            sql`${patients.id} != ${id}` // Excluir o próprio paciente
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new Error('Já existe outro paciente com este nome e data de nascimento no hospital');
      }
    }

    const result = await db
      .update(patients)
      .set(data)
      .where(and(eq(patients.id, id), eq(patients.hospitalId, userHospitalId)))
      .returning();

    if (result.length === 0) {
      return null;
    }

    return this.formatPatientResponse(result[0]);
  }

  /**
   * Remove um paciente (soft delete não implementado no schema atual)
   */
  async deletePatient(id: number, userHospitalId: number): Promise<boolean> {
    const db = await this.getDbInstance();

    // Verificar se o paciente existe e pertence ao hospital do usuário
    const existingPatient = await this.getPatientById(id, userHospitalId);
    if (!existingPatient) {
      return false;
    }

    const result = await db
      .delete(patients)
      .where(and(eq(patients.id, id), eq(patients.hospitalId, userHospitalId)));

    return result.rowCount > 0;
  }

  /**
   * Busca pacientes por termo (para autocomplete)
   */
  async searchPatients(
    searchTerm: string,
    userHospitalId: number,
    limit: number = 10
  ): Promise<PatientResponse[]> {
    const db = await this.getDbInstance();
    const results = await db
      .select()
      .from(patients)
      .where(
        and(eq(patients.hospitalId, userHospitalId), ilike(patients.fullName, `%${searchTerm}%`))
      )
      .orderBy(asc(patients.fullName))
      .limit(limit);

    return results.map((patient: any) => this.formatPatientResponse(patient));
  }

  /**
   * Obtém estatísticas de pacientes para o dashboard
   */
  async getPatientStats(userHospitalId: number) {
    const db = await this.getDbInstance();
    const [totalResult] = await Promise.all([
      // Total de pacientes
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(patients)
        .where(eq(patients.hospitalId, userHospitalId)),
    ]);

    return {
      total: totalResult[0].count,
      recentlyAdded: totalResult[0].count, // Por enquanto, igual ao total (schema sem created_at)
    };
  }
}

// Instância singleton do serviço
export const patientsService = new PatientsService();
