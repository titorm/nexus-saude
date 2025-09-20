// Types para notas clínicas baseados na API backend

export type NoteType =
  | 'consultation' // Consulta médica
  | 'diagnosis' // Diagnóstico
  | 'prescription' // Prescrição médica
  | 'examination' // Exame físico
  | 'laboratory' // Resultados laboratoriais
  | 'imaging' // Exames de imagem
  | 'procedure' // Procedimentos médicos
  | 'follow_up' // Acompanhamento
  | 'referral' // Encaminhamento
  | 'discharge' // Alta médica
  | 'emergency' // Atendimento de emergência
  | 'observation'; // Observações gerais

export type NotePriority =
  | 'low' // Baixa prioridade
  | 'normal' // Prioridade normal
  | 'high' // Alta prioridade
  | 'urgent' // Urgente
  | 'critical'; // Crítico

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface ClinicalNote {
  id: number;
  patientId: number;
  authorId: number;
  hospitalId: number;
  type: NoteType;
  title: string;
  content: string;
  priority: NotePriority;
  symptoms: string[];
  medications: string[];
  vitalSigns?: VitalSigns;
  attachments: string[];
  tags: string[];
  isPrivate: boolean;
  followUpDate?: string;
  version: number;
  createdAt: string;
  updatedAt: string;

  // Dados do autor (join)
  author?: {
    id: number;
    name: string;
    specialty?: string;
  };
}

export interface CreateClinicalNoteInput {
  patientId: number;
  type: NoteType;
  title: string;
  content: string;
  priority?: NotePriority;
  symptoms?: string[];
  medications?: string[];
  vitalSigns?: VitalSigns;
  attachments?: string[];
  tags?: string[];
  isPrivate?: boolean;
  followUpDate?: string;
}

export interface UpdateClinicalNoteInput extends Partial<CreateClinicalNoteInput> {
  id: number;
}

export interface ClinicalNotesQuery {
  patientId?: number;
  type?: NoteType;
  priority?: NotePriority;
  authorId?: number;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  tags?: string[];
  includePrivate?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ClinicalNotesResponse {
  data: ClinicalNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TimelineGroupedNotes {
  date: string; // YYYY-MM-DD
  notes: ClinicalNote[];
}

export interface PatientTimeline {
  patientId: number;
  timeline: TimelineGroupedNotes[];
  totalNotes: number;
}

export interface ClinicalNotesStats {
  totalNotes: number;
  notesByType: Record<NoteType, number>;
  notesByPriority: Record<NotePriority, number>;
  recentNotes: number; // últimos 30 dias
  pendingFollowUps: number;
  averageNotesPerDay: number;
  mostActiveAuthor: {
    id: number;
    name: string;
    noteCount: number;
  };
}

export interface FollowUp {
  id: number;
  noteId: number;
  patientId: number;
  followUpDate: string;
  isCompleted: boolean;
  completedAt?: string;
  note: {
    title: string;
    type: NoteType;
    priority: NotePriority;
  };
  patient: {
    name: string;
  };
}

// Tipos para filtros da timeline
export interface TimelineFilters {
  type?: NoteType[];
  priority?: NotePriority[];
  authorId?: number;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  tags?: string[];
}

// Tipos para o editor de notas
export interface NoteEditorState {
  mode: 'create' | 'edit' | 'view';
  noteId?: number;
  isOpen: boolean;
  initialData?: Partial<CreateClinicalNoteInput>;
}

// Constantes úteis
export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  consultation: 'Consulta Médica',
  diagnosis: 'Diagnóstico',
  prescription: 'Prescrição',
  examination: 'Exame Físico',
  laboratory: 'Resultado Laboratorial',
  imaging: 'Exame de Imagem',
  procedure: 'Procedimento',
  follow_up: 'Acompanhamento',
  referral: 'Encaminhamento',
  discharge: 'Alta Médica',
  emergency: 'Emergência',
  observation: 'Observação',
};

export const PRIORITY_LABELS: Record<NotePriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Crítica',
};

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  consultation: 'blue',
  diagnosis: 'red',
  prescription: 'green',
  examination: 'purple',
  laboratory: 'orange',
  imaging: 'indigo',
  procedure: 'pink',
  follow_up: 'yellow',
  referral: 'teal',
  discharge: 'gray',
  emergency: 'red',
  observation: 'slate',
};

export const PRIORITY_COLORS: Record<NotePriority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
  critical: 'red',
};
