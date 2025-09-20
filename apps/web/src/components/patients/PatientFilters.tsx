import { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import type { PatientsQuery } from '../../types/patient';

interface PatientFiltersProps {
  filters: PatientsQuery;
  onFiltersChange: (filters: PatientsQuery) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function PatientFilters({
  filters,
  onFiltersChange,
  onSearch,
  searchQuery,
}: PatientFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    // Simples debounce com timeout
    setTimeout(() => onSearch(value), 300);
  };

  const updateFilter = <K extends keyof PatientsQuery>(key: K, value: PatientsQuery[K]) => {
    onFiltersChange({ ...filters, [key]: value, page: 1 }); // Reset para primeira página
  };

  const clearFilters = () => {
    onFiltersChange({ page: 1, limit: filters.limit });
    setLocalSearch('');
    onSearch('');
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.sortBy !== 'name' || filters.sortOrder !== 'asc' || searchQuery
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Linha Principal: Busca e Toggle de Filtros */}
      <div className="flex items-center space-x-4">
        {/* Campo de Busca */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou email..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Botão de Filtros Avançados */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${hasActiveFilters ? 'ring-2 ring-blue-500 border-blue-300' : ''}
          `}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Ativos
            </span>
          )}
        </button>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </button>
        )}
      </div>

      {/* Filtros Expandidos */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value as any)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            {/* Ordenar Por */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar Por</label>
              <select
                value={filters.sortBy || 'name'}
                onChange={(e) => updateFilter('sortBy', e.target.value as any)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="name">Nome</option>
                <option value="createdAt">Data de Cadastro</option>
                <option value="age">Idade</option>
              </select>
            </div>

            {/* Ordem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordem</label>
              <select
                value={filters.sortOrder || 'asc'}
                onChange={(e) => updateFilter('sortOrder', e.target.value as any)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </div>
          </div>

          {/* Itens por Página */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Itens por Página</label>
            <div className="flex space-x-2">
              {[10, 20, 50, 100].map((limit) => (
                <button
                  key={limit}
                  onClick={() => updateFilter('limit', limit)}
                  className={`
                    px-3 py-1 rounded-md text-sm font-medium border
                    ${
                      filters.limit === limit
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
