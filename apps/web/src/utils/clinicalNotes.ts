import type {
  ClinicalNote,
  NoteType,
  NotePriority,
  TimelineGroupedNotes,
  VitalSigns,
} from '../types/clinicalNotes';
import {
  NOTE_TYPE_LABELS,
  PRIORITY_LABELS,
  NOTE_TYPE_COLORS,
  PRIORITY_COLORS,
} from '../types/clinicalNotes';

// Formatação de data e hora
export function formatNoteDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNoteDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNoteTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Formatação de data relativa (ex: "há 2 horas")
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'há alguns segundos';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `há ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
  }

  return formatNoteDate(dateString);
}

// Labels e cores
export function getNoteTypeLabel(type: NoteType): string {
  return NOTE_TYPE_LABELS[type] || type;
}

export function getPriorityLabel(priority: NotePriority): string {
  return PRIORITY_LABELS[priority] || priority;
}

export function getNoteTypeColor(type: NoteType): string {
  return NOTE_TYPE_COLORS[type] || 'gray';
}

export function getPriorityColor(priority: NotePriority): string {
  return PRIORITY_COLORS[priority] || 'gray';
}

// Classes CSS para cores (Tailwind)
export function getNoteTypeClasses(type: NoteType): {
  bg: string;
  text: string;
  border: string;
} {
  const color = getNoteTypeColor(type);
  return {
    bg: `bg-${color}-50`,
    text: `text-${color}-700`,
    border: `border-${color}-200`,
  };
}

export function getPriorityClasses(priority: NotePriority): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  const color = getPriorityColor(priority);
  const isUrgent = priority === 'urgent' || priority === 'critical';

  return {
    bg: `bg-${color}-${isUrgent ? '100' : '50'}`,
    text: `text-${color}-${isUrgent ? '800' : '700'}`,
    border: `border-${color}-${isUrgent ? '300' : '200'}`,
    icon: `text-${color}-${isUrgent ? '600' : '500'}`,
  };
}

// Agrupar notas por data para timeline
export function groupNotesByDate(notes: ClinicalNote[]): TimelineGroupedNotes[] {
  const grouped = notes.reduce(
    (acc, note) => {
      const date = formatNoteDate(note.createdAt);

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(note);
      return acc;
    },
    {} as Record<string, ClinicalNote[]>
  );

  // Converter para array e ordenar por data (mais recente primeiro)
  return Object.entries(grouped)
    .map(([date, notes]) => ({
      date,
      notes: notes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Truncar conteúdo da nota para preview
export function truncateNoteContent(content: string, maxLength = 150): string {
  if (content.length <= maxLength) {
    return content;
  }

  return content.substring(0, maxLength).trim() + '...';
}

// Extrair primeiras linhas do conteúdo como resumo
export function extractNoteSummary(content: string, maxLines = 3): string {
  const lines = content.split('\n').filter((line) => line.trim());
  const firstLines = lines.slice(0, maxLines).join(' ');

  return truncateNoteContent(firstLines, 200);
}

// Formatação de sinais vitais
export function formatVitalSigns(vitalSigns?: VitalSigns): string[] {
  if (!vitalSigns) return [];

  const formatted: string[] = [];

  if (vitalSigns.bloodPressure) {
    formatted.push(
      `PA: ${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic} mmHg`
    );
  }

  if (vitalSigns.heartRate) {
    formatted.push(`FC: ${vitalSigns.heartRate} bpm`);
  }

  if (vitalSigns.temperature) {
    formatted.push(`Temp: ${vitalSigns.temperature}°C`);
  }

  if (vitalSigns.respiratoryRate) {
    formatted.push(`FR: ${vitalSigns.respiratoryRate} irpm`);
  }

  if (vitalSigns.oxygenSaturation) {
    formatted.push(`SpO2: ${vitalSigns.oxygenSaturation}%`);
  }

  if (vitalSigns.weight) {
    formatted.push(`Peso: ${vitalSigns.weight} kg`);
  }

  if (vitalSigns.height) {
    formatted.push(`Altura: ${vitalSigns.height} cm`);
  }

  if (vitalSigns.bmi) {
    formatted.push(`IMC: ${vitalSigns.bmi.toFixed(1)}`);
  }

  return formatted;
}

// Validação de sinais vitais (valores normais)
export function validateVitalSigns(vitalSigns: VitalSigns): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (vitalSigns.bloodPressure) {
    const { systolic, diastolic } = vitalSigns.bloodPressure;
    if (systolic > 140 || diastolic > 90) {
      warnings.push('Pressão arterial elevada');
    }
    if (systolic < 90 || diastolic < 60) {
      warnings.push('Pressão arterial baixa');
    }
  }

  if (vitalSigns.heartRate) {
    if (vitalSigns.heartRate > 100) {
      warnings.push('Frequência cardíaca elevada');
    }
    if (vitalSigns.heartRate < 60) {
      warnings.push('Frequência cardíaca baixa');
    }
  }

  if (vitalSigns.temperature) {
    if (vitalSigns.temperature > 37.5) {
      warnings.push('Febre');
    }
    if (vitalSigns.temperature < 35) {
      warnings.push('Hipotermia');
    }
  }

  if (vitalSigns.oxygenSaturation && vitalSigns.oxygenSaturation < 95) {
    warnings.push('Saturação de oxigênio baixa');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

// Identificar notas que precisam de follow-up
export function getNotesWithPendingFollowUp(notes: ClinicalNote[]): ClinicalNote[] {
  const now = new Date();

  return notes.filter((note) => {
    if (!note.followUpDate) return false;

    const followUpDate = new Date(note.followUpDate);
    return followUpDate <= now;
  });
}

// Calcular estatísticas rápidas de uma lista de notas
export function calculateNoteStats(notes: ClinicalNote[]) {
  const stats = {
    total: notes.length,
    byType: {} as Record<NoteType, number>,
    byPriority: {} as Record<NotePriority, number>,
    withAttachments: 0,
    withFollowUp: 0,
    private: 0,
    recentDays: 0, // últimos 7 dias
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  notes.forEach((note) => {
    // Contar por tipo
    stats.byType[note.type] = (stats.byType[note.type] || 0) + 1;

    // Contar por prioridade
    stats.byPriority[note.priority] = (stats.byPriority[note.priority] || 0) + 1;

    // Contar notas com anexos
    if (note.attachments.length > 0) {
      stats.withAttachments++;
    }

    // Contar notas com follow-up
    if (note.followUpDate) {
      stats.withFollowUp++;
    }

    // Contar notas privadas
    if (note.isPrivate) {
      stats.private++;
    }

    // Contar notas recentes
    if (new Date(note.createdAt) > sevenDaysAgo) {
      stats.recentDays++;
    }
  });

  return stats;
}

// Filtrar notas por critérios múltiplos
export function filterNotes(
  notes: ClinicalNote[],
  filters: {
    types?: NoteType[];
    priorities?: NotePriority[];
    searchTerm?: string;
    authorId?: number;
    startDate?: Date;
    endDate?: Date;
    hasAttachments?: boolean;
    isPrivate?: boolean;
  }
): ClinicalNote[] {
  return notes.filter((note) => {
    // Filtro por tipo
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(note.type)) return false;
    }

    // Filtro por prioridade
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(note.priority)) return false;
    }

    // Filtro por autor
    if (filters.authorId && note.authorId !== filters.authorId) {
      return false;
    }

    // Filtro por data
    const noteDate = new Date(note.createdAt);
    if (filters.startDate && noteDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && noteDate > filters.endDate) {
      return false;
    }

    // Filtro por anexos
    if (filters.hasAttachments !== undefined) {
      const hasAttachments = note.attachments.length > 0;
      if (filters.hasAttachments !== hasAttachments) {
        return false;
      }
    }

    // Filtro por privacidade
    if (filters.isPrivate !== undefined && note.isPrivate !== filters.isPrivate) {
      return false;
    }

    // Filtro por termo de busca
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const searchableText = [
        note.title,
        note.content,
        ...note.symptoms,
        ...note.medications,
        ...note.tags,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}

// Gerar texto de resumo para uma nota (para buscas/preview)
export function generateNoteSearchText(note: ClinicalNote): string {
  const parts = [
    note.title,
    note.content,
    getNoteTypeLabel(note.type),
    getPriorityLabel(note.priority),
    ...note.symptoms,
    ...note.medications,
    ...note.tags,
  ];

  return parts.filter(Boolean).join(' ').toLowerCase();
}

// Verificar se uma nota está crítica ou urgente
export function isNoteUrgent(note: ClinicalNote): boolean {
  return note.priority === 'urgent' || note.priority === 'critical';
}

// Verificar se uma nota tem informações médicas estruturadas
export function hasStructuredData(note: ClinicalNote): boolean {
  return note.symptoms.length > 0 || note.medications.length > 0 || !!note.vitalSigns;
}
