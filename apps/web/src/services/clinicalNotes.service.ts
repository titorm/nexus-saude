import { apiClient } from '../lib/api';
import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
  ClinicalNotesQuery,
  ClinicalNotesResponse,
  PatientTimeline,
  ClinicalNotesStats,
  FollowUp,
} from '../types/clinicalNotes';

export class ClinicalNotesService {
  private static readonly baseURL = '/clinical-notes';

  // Obter lista de notas com filtros e paginação
  static async getNotes(query: ClinicalNotesQuery = {}): Promise<ClinicalNotesResponse> {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, item.toString()));
        } else {
          params.set(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`${this.baseURL}?${params}`);
    return response.data;
  }

  // Obter nota por ID
  static async getNote(id: number): Promise<ClinicalNote> {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  // Criar nova nota
  static async createNote(data: CreateClinicalNoteInput): Promise<ClinicalNote> {
    const response = await apiClient.post(this.baseURL, data);
    return response.data;
  }

  // Atualizar nota existente
  static async updateNote(id: number, data: UpdateClinicalNoteInput): Promise<ClinicalNote> {
    const response = await apiClient.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  // Excluir nota
  static async deleteNote(id: number): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${id}`);
  }

  // Obter timeline do paciente
  static async getPatientTimeline(
    patientId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: string[];
      priority?: string[];
    }
  ): Promise<PatientTimeline> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => params.append(key, item));
          } else {
            params.set(key, value);
          }
        }
      });
    }

    const url = `${this.baseURL}/patient/${patientId}/timeline${params.toString() ? `?${params}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  // Obter estatísticas de notas
  static async getStats(): Promise<ClinicalNotesStats> {
    const response = await apiClient.get(`${this.baseURL}/stats`);
    return response.data;
  }

  // Obter estatísticas de um paciente específico
  static async getPatientStats(patientId: number): Promise<ClinicalNotesStats> {
    const response = await apiClient.get(`${this.baseURL}/stats?patientId=${patientId}`);
    return response.data;
  }

  // Obter follow-ups pendentes
  static async getFollowUps(patientId?: number): Promise<FollowUp[]> {
    const url = patientId
      ? `${this.baseURL}/follow-ups?patientId=${patientId}`
      : `${this.baseURL}/follow-ups`;

    const response = await apiClient.get(url);
    return response.data;
  }

  // Marcar follow-up como completo
  static async completeFollowUp(noteId: number): Promise<void> {
    await apiClient.patch(`${this.baseURL}/${noteId}/follow-up/complete`);
  }

  // Buscar notas por texto
  static async searchNotes(searchTerm: string, patientId?: number): Promise<ClinicalNote[]> {
    const params = new URLSearchParams();
    params.set('searchTerm', searchTerm);

    if (patientId) {
      params.set('patientId', patientId.toString());
    }

    const response = await apiClient.get(`${this.baseURL}/search?${params}`);
    return response.data;
  }

  // Upload de anexo para nota
  static async uploadAttachment(
    noteId: number,
    file: File
  ): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseURL}/${noteId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Remover anexo da nota
  static async removeAttachment(noteId: number, filename: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${noteId}/attachments/${encodeURIComponent(filename)}`);
  }

  // Obter notas por tipo específico
  static async getNotesByType(type: string, patientId?: number): Promise<ClinicalNote[]> {
    const params = new URLSearchParams();
    params.set('type', type);

    if (patientId) {
      params.set('patientId', patientId.toString());
    }

    const response = await apiClient.get(`${this.baseURL}?${params}`);
    return response.data.data; // retorna apenas o array de notas
  }

  // Duplicar nota (criar cópia)
  static async duplicateNote(noteId: number): Promise<ClinicalNote> {
    const response = await apiClient.post(`${this.baseURL}/${noteId}/duplicate`);
    return response.data;
  }

  // Obter histórico de versões da nota
  static async getNoteVersions(noteId: number): Promise<ClinicalNote[]> {
    const response = await apiClient.get(`${this.baseURL}/${noteId}/versions`);
    return response.data;
  }

  // Export de notas para PDF/CSV
  static async exportNotes(
    patientId: number,
    format: 'pdf' | 'csv',
    filters?: ClinicalNotesQuery
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.set('format', format);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => params.append(key, item.toString()));
          } else {
            params.set(key, value.toString());
          }
        }
      });
    }

    const response = await apiClient.get(`${this.baseURL}/patient/${patientId}/export?${params}`, {
      responseType: 'blob',
    });

    return response.data;
  }
}
