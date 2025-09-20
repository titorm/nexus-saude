import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClinicalNotesService } from '../services/clinicalNotes.service';
import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
  ClinicalNotesQuery,
  PatientTimeline,
  ClinicalNotesStats,
  FollowUp,
  TimelineFilters,
} from '../types/clinicalNotes';

// Query keys para cache management
export const clinicalNotesKeys = {
  all: ['clinical-notes'] as const,
  lists: () => [...clinicalNotesKeys.all, 'list'] as const,
  list: (filters: ClinicalNotesQuery) => [...clinicalNotesKeys.lists(), filters] as const,
  details: () => [...clinicalNotesKeys.all, 'detail'] as const,
  detail: (id: number) => [...clinicalNotesKeys.details(), id] as const,
  timeline: (patientId: number) => [...clinicalNotesKeys.all, 'timeline', patientId] as const,
  timelineFiltered: (patientId: number, filters: TimelineFilters) =>
    [...clinicalNotesKeys.timeline(patientId), filters] as const,
  stats: () => [...clinicalNotesKeys.all, 'stats'] as const,
  patientStats: (patientId: number) => [...clinicalNotesKeys.stats(), patientId] as const,
  followUps: () => [...clinicalNotesKeys.all, 'follow-ups'] as const,
  patientFollowUps: (patientId: number) => [...clinicalNotesKeys.followUps(), patientId] as const,
  search: (term: string, patientId?: number) =>
    [...clinicalNotesKeys.all, 'search', term, patientId] as const,
};

// Hook para buscar notas com filtros
export function useClinicalNotes(query: ClinicalNotesQuery = {}) {
  return useQuery({
    queryKey: clinicalNotesKeys.list(query),
    queryFn: () => ClinicalNotesService.getNotes(query),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para buscar nota específica
export function useClinicalNote(id: number) {
  return useQuery({
    queryKey: clinicalNotesKeys.detail(id),
    queryFn: () => ClinicalNotesService.getNote(id),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para timeline do paciente
export function usePatientTimeline(patientId: number, filters?: TimelineFilters) {
  const queryKey = filters
    ? clinicalNotesKeys.timelineFiltered(patientId, filters)
    : clinicalNotesKeys.timeline(patientId);

  return useQuery({
    queryKey,
    queryFn: () => ClinicalNotesService.getPatientTimeline(patientId, filters),
    staleTime: 60 * 1000, // 1 minuto
    enabled: !!patientId,
  });
}

// Hook para estatísticas gerais
export function useClinicalNotesStats() {
  return useQuery({
    queryKey: clinicalNotesKeys.stats(),
    queryFn: () => ClinicalNotesService.getStats(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para estatísticas de um paciente
export function usePatientClinicalNotesStats(patientId: number) {
  return useQuery({
    queryKey: clinicalNotesKeys.patientStats(patientId),
    queryFn: () => ClinicalNotesService.getPatientStats(patientId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!patientId,
  });
}

// Hook para follow-ups
export function useFollowUps(patientId?: number) {
  const queryKey = patientId
    ? clinicalNotesKeys.patientFollowUps(patientId)
    : clinicalNotesKeys.followUps();

  return useQuery({
    queryKey,
    queryFn: () => ClinicalNotesService.getFollowUps(patientId),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para busca de notas
export function useSearchClinicalNotes(searchTerm: string, patientId?: number, enabled = true) {
  return useQuery({
    queryKey: clinicalNotesKeys.search(searchTerm, patientId),
    queryFn: () => ClinicalNotesService.searchNotes(searchTerm, patientId),
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

// Hook para criar nova nota
export function useCreateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClinicalNoteInput) => ClinicalNotesService.createNote(data),
    onSuccess: (newNote) => {
      // Invalidar listas de notas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });

      // Invalidar timeline do paciente
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.timeline(newNote.patientId),
      });

      // Invalidar estatísticas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientStats(newNote.patientId),
      });

      // Invalidar follow-ups se a nota tem follow-up
      if (newNote.followUpDate) {
        queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.followUps() });
        queryClient.invalidateQueries({
          queryKey: clinicalNotesKeys.patientFollowUps(newNote.patientId),
        });
      }
    },
  });
}

// Hook para atualizar nota
export function useUpdateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClinicalNoteInput }) =>
      ClinicalNotesService.updateNote(id, data),
    onSuccess: (updatedNote) => {
      // Atualizar cache da nota específica
      queryClient.setQueryData(clinicalNotesKeys.detail(updatedNote.id), updatedNote);

      // Invalidar listas e timeline
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.timeline(updatedNote.patientId),
      });

      // Invalidar estatísticas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientStats(updatedNote.patientId),
      });

      // Invalidar follow-ups
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.followUps() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientFollowUps(updatedNote.patientId),
      });
    },
  });
}

// Hook para excluir nota
export function useDeleteClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patientId }: { id: number; patientId: number }) => {
      return ClinicalNotesService.deleteNote(id).then(() => ({ id, patientId }));
    },
    onSuccess: ({ id, patientId }) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: clinicalNotesKeys.detail(id) });

      // Invalidar listas e timeline
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.timeline(patientId),
      });

      // Invalidar estatísticas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientStats(patientId),
      });

      // Invalidar follow-ups
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.followUps() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientFollowUps(patientId),
      });
    },
  });
}

// Hook para completar follow-up
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: number) => ClinicalNotesService.completeFollowUp(noteId),
    onSuccess: () => {
      // Invalidar follow-ups
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.followUps() });

      // Invalidar listas (pode afetar contadores)
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });
    },
  });
}

// Hook para upload de anexo
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, file }: { noteId: number; file: File }) =>
      ClinicalNotesService.uploadAttachment(noteId, file),
    onSuccess: (_, { noteId }) => {
      // Invalidar a nota específica para recarregar com o novo anexo
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.detail(noteId) });

      // Invalidar listas que podem mostrar indicador de anexos
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });
    },
  });
}

// Hook para remover anexo
export function useRemoveAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, filename }: { noteId: number; filename: string }) =>
      ClinicalNotesService.removeAttachment(noteId, filename),
    onSuccess: (_, { noteId }) => {
      // Invalidar a nota específica para recarregar sem o anexo
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.detail(noteId) });

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });
    },
  });
}

// Hook para duplicar nota
export function useDuplicateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: number) => ClinicalNotesService.duplicateNote(noteId),
    onSuccess: (newNote) => {
      // Invalidar listas para mostrar a nova nota
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.lists() });

      // Invalidar timeline do paciente
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.timeline(newNote.patientId),
      });

      // Invalidar estatísticas
      queryClient.invalidateQueries({ queryKey: clinicalNotesKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: clinicalNotesKeys.patientStats(newNote.patientId),
      });
    },
  });
}

// Hook para export de notas
export function useExportClinicalNotes() {
  return useMutation({
    mutationFn: ({
      patientId,
      format,
      filters,
    }: {
      patientId: number;
      format: 'pdf' | 'csv';
      filters?: ClinicalNotesQuery;
    }) => ClinicalNotesService.exportNotes(patientId, format, filters),
    onSuccess: (blob, { format }) => {
      // Criar download automático
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prontuario-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
