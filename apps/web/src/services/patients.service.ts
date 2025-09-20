import { apiClient } from '../lib/api';
import type {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  PatientsResponse,
  PatientsQuery,
  PatientStats,
} from '../types/patient';

export class PatientsService {
  private static baseURL = '/v1/patients';

  // Listar pacientes com filtros e paginação
  static async getPatients(params: PatientsQuery = {}): Promise<PatientsResponse> {
    const response = await apiClient.get(this.baseURL, { params });
    return response.data;
  }

  // Buscar pacientes por nome
  static async searchPatients(query: string, limit = 10): Promise<Patient[]> {
    const response = await apiClient.get(`${this.baseURL}/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }

  // Obter estatísticas dos pacientes
  static async getStats(): Promise<PatientStats> {
    const response = await apiClient.get(`${this.baseURL}/stats`);
    return response.data;
  }

  // Obter paciente por ID
  static async getPatient(id: number): Promise<Patient> {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  // Criar novo paciente
  static async createPatient(data: CreatePatientInput): Promise<Patient> {
    const response = await apiClient.post(this.baseURL, data);
    return response.data;
  }

  // Atualizar paciente
  static async updatePatient(id: number, data: UpdatePatientInput): Promise<Patient> {
    const response = await apiClient.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  // Remover paciente (soft delete)
  static async deletePatient(id: number): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${id}`);
  }

  // Reativar paciente
  static async reactivatePatient(id: number): Promise<Patient> {
    const response = await apiClient.patch(`${this.baseURL}/${id}/reactivate`);
    return response.data;
  }
}
