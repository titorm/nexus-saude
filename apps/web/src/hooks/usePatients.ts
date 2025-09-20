import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PatientsService } from '../services/patients.service';
import type {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  PatientsQuery,
} from '../types/patient';

// Query keys para cache management
export const patientsKeys = {
  all: ['patients'] as const,
  lists: () => [...patientsKeys.all, 'list'] as const,
  list: (params: PatientsQuery) => [...patientsKeys.lists(), params] as const,
  details: () => [...patientsKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientsKeys.details(), id] as const,
  stats: () => [...patientsKeys.all, 'stats'] as const,
  search: (query: string) => [...patientsKeys.all, 'search', query] as const,
};

// Hook para listar pacientes
export function usePatients(params: PatientsQuery = {}) {
  return useQuery({
    queryKey: patientsKeys.list(params),
    queryFn: () => PatientsService.getPatients(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para buscar pacientes
export function useSearchPatients(query: string, enabled = true) {
  return useQuery({
    queryKey: patientsKeys.search(query),
    queryFn: () => PatientsService.searchPatients(query),
    enabled: enabled && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// Hook para estatísticas
export function usePatientsStats() {
  return useQuery({
    queryKey: patientsKeys.stats(),
    queryFn: () => PatientsService.getStats(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para detalhes de um paciente
export function usePatient(id: number, enabled = true) {
  return useQuery({
    queryKey: patientsKeys.detail(id),
    queryFn: () => PatientsService.getPatient(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para criar paciente
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientInput) => PatientsService.createPatient(data),
    onSuccess: () => {
      // Invalidar cache de listas e estatísticas
      queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientsKeys.stats() });
    },
  });
}

// Hook para atualizar paciente
export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePatientInput }) =>
      PatientsService.updatePatient(id, data),
    onSuccess: (updatedPatient) => {
      // Atualizar cache específico do paciente
      queryClient.setQueryData(patientsKeys.detail(updatedPatient.id), updatedPatient);

      // Invalidar listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
    },
  });
}

// Hook para deletar paciente
export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => PatientsService.deletePatient(id),
    onSuccess: () => {
      // Invalidar cache de listas e estatísticas
      queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientsKeys.stats() });
    },
  });
}

// Hook para reativar paciente
export function useReactivatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => PatientsService.reactivatePatient(id),
    onSuccess: (reactivatedPatient) => {
      // Atualizar cache específico do paciente
      queryClient.setQueryData(patientsKeys.detail(reactivatedPatient.id), reactivatedPatient);

      // Invalidar listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientsKeys.stats() });
    },
  });
}
