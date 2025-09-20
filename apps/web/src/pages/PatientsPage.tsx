import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { PatientCard } from '../components/patients/PatientCard';
import { PatientFilters } from '../components/patients/PatientFilters';
import { Pagination } from '../components/patients/Pagination';
import { PatientStatsCards } from '../components/patients/PatientStatsCards';
import { PatientSkeleton, PatientListSkeleton } from '../components/patients/PatientSkeleton';
import { EmptyPatientList } from '../components/patients/EmptyPatientList';
import { usePatients, usePatientsStats, useSearchPatients } from '../hooks/usePatients';
import type { PatientsQuery, Patient } from '../types/patient';

export default function PatientsPage() {
  const navigate = useNavigate();

  // Estados locais
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PatientsQuery>({
    page: 1,
    limit: 12,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Determinar qual hook usar baseado na busca
  const shouldUseSearch = searchQuery.trim().length > 0;

  // Hooks de dados
  const {
    data: patientsData,
    isLoading: isPatientsLoading,
    error: patientsError,
  } = usePatients(shouldUseSearch ? undefined : filters);

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSearchPatients(searchQuery, shouldUseSearch);

  const { data: stats, isLoading: isStatsLoading } = usePatientsStats();

  // Dados finais baseados na busca
  const patients = shouldUseSearch ? searchData || [] : patientsData?.data || [];
  const pagination = shouldUseSearch ? null : patientsData?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const isLoading = shouldUseSearch ? isSearchLoading : isPatientsLoading;
  const error = shouldUseSearch ? searchError : patientsError;
  const hasFilters = useMemo(() => {
    return Boolean(
      filters.status ||
        filters.sortBy !== 'name' ||
        filters.sortOrder !== 'asc' ||
        searchQuery.trim()
    );
  }, [filters, searchQuery]);

  // Handlers
  const handleFiltersChange = (newFilters: PatientsQuery) => {
    setFilters(newFilters);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset para primeira página quando buscar
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    // Scroll suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPatient = () => {
    // TODO: Implementar navegação para formulário de cadastro
    console.log('Navegar para cadastro de paciente');
  };

  const handleViewPatient = (patientId: number) => {
    navigate({ to: `/patients/${patientId}` });
  };

  const handleEditPatient = (patientId: number) => {
    // TODO: Implementar navegação para edição do paciente
    console.log('Navegar para edição do paciente:', patientId);
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    setSearchQuery('');
  };

  // Estados de carregamento e erro
  if (isLoading && patients.length === 0) {
    return <PatientListSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Erro ao carregar pacientes</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : 'Ocorreu um erro inesperado'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pacientes</h1>
            <p className="mt-2 text-gray-600">
              {pagination
                ? `${pagination.total} paciente${pagination.total !== 1 ? 's' : ''} encontrado${pagination.total !== 1 ? 's' : ''}`
                : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} encontrado${patients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={handleAddPatient}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8">
            <PatientStatsCards stats={stats} isLoading={isStatsLoading} />
          </div>
        )}

        {/* Filtros */}
        <PatientFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />

        {/* Lista de Pacientes */}
        {isLoading ? (
          <PatientSkeleton count={filters.limit} />
        ) : patients.length === 0 ? (
          <EmptyPatientList
            isFiltered={hasFilters}
            onAddPatient={handleAddPatient}
            onClearFilters={clearFilters}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {patients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => handleViewPatient(patient.id)}
                  onEdit={() => handleEditPatient(patient.id)}
                />
              ))}
            </div>

            {/* Paginação */}
            {pagination && totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
