import { Users, Plus, Search } from 'lucide-react';

interface EmptyPatientListProps {
  isFiltered?: boolean;
  onAddPatient?: () => void;
  onClearFilters?: () => void;
}

export function EmptyPatientList({
  isFiltered = false,
  onAddPatient,
  onClearFilters,
}: EmptyPatientListProps) {
  if (isFiltered) {
    // Estado quando há filtros aplicados mas não há resultados
    return (
      <div className="text-center py-16">
        <div className="mx-auto max-w-md">
          <Search className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente encontrado</h3>
          <p className="text-gray-500 mb-6">
            Não encontramos pacientes que correspondam aos filtros aplicados. Tente ajustar os
            critérios de busca.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Limpar Filtros
            </button>
            {onAddPatient && (
              <button
                onClick={onAddPatient}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Paciente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Estado quando não há pacientes cadastrados
  return (
    <div className="text-center py-16">
      <div className="mx-auto max-w-md">
        <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente cadastrado</h3>
        <p className="text-gray-500 mb-6">
          Comece adicionando o primeiro paciente ao sistema. Você poderá gerenciar todas as
          informações médicas e pessoais em um só lugar.
        </p>
        {onAddPatient && (
          <button
            onClick={onAddPatient}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Cadastrar Primeiro Paciente
          </button>
        )}
      </div>
    </div>
  );
}
