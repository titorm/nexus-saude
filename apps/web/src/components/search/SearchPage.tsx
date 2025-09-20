import { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { SearchFilters, SearchFilters as SearchFiltersType } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { useGlobalSearch, useSearchManager } from '@/hooks/useSearch';
import { SearchService, type SearchResult, type SearchQuery } from '@/services/search.service';
import { cn } from '@/lib/utils';

interface SearchPageProps {
  className?: string;
  onResultClick?: (result: SearchResult) => void;
  defaultFilters?: SearchFiltersType;
  hideFilters?: boolean;
  maxResults?: number;
}

export function SearchPage({
  className,
  onResultClick,
  defaultFilters = {},
  hideFilters = false,
  maxResults = 50,
}: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFiltersType>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);

  // Use search manager for operations
  const { performSearch, trackResultClick } = useSearchManager();

  // Use global search hook
  const {
    data: searchResponse,
    isLoading,
    error,
  } = useGlobalSearch(searchQuery || { query: '', limit: maxResults }, !!searchQuery);

  const results = searchResponse?.results || [];

  // Handle search execution
  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSearchQuery(null);
        return;
      }

      const searchParams: SearchQuery = {
        query: searchQuery.trim(),
        limit: maxResults,
        ...filters,
      };

      setSearchQuery(searchParams);

      try {
        await performSearch(searchParams);
      } catch (err) {
        console.error('Search failed:', err);
      }
    },
    [performSearch, filters, maxResults]
  );

  // Handle query change from SearchBar
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      if (newQuery.trim()) {
        handleSearch(newQuery);
      } else {
        setSearchQuery(null);
      }
    },
    [handleSearch]
  );

  // Handle search from SearchBar
  const handleSearchBarSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      handleSearch(searchQuery);
    },
    [handleSearch]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: SearchFiltersType) => {
      setFilters(newFilters);

      // Re-execute search with new filters if there's an active query
      if (query.trim()) {
        handleSearch(query);
      }
    },
    [query, handleSearch]
  );

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});

    // Re-execute search without filters if there's an active query
    if (query.trim()) {
      handleSearch(query);
    }
  }, [query, handleSearch]);

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Track click analytics
      trackResultClick(query, result.id.toString(), filters);

      // Call external handler if provided
      onResultClick?.(result);
    },
    [query, filters, trackResultClick, onResultClick]
  );

  // Auto-search when filters change
  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch(query);
      }, 300); // Debounce filter changes

      return () => clearTimeout(timeoutId);
    }
  }, [filters, query, handleSearch]);

  return (
    <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
      {/* Search Header */}
      <div className="space-y-4">
        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearchBarSearch}
          placeholder="Buscar pacientes, prontuários, consultas..."
          className="w-full"
          entityTypes={filters.entityTypes}
        />

        {/* Search Filters */}
        {!hideFilters && (
          <div className="flex justify-between items-center">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />

            {/* Search Stats */}
            {results && results.length > 0 && (
              <div className="text-sm text-gray-600">
                {results.length} de {maxResults} resultados
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Erro na busca</h3>
              <p className="text-sm text-red-700 mt-1">
                {error.message || 'Ocorreu um erro ao realizar a busca. Tente novamente.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      <SearchResults
        results={results || []}
        isLoading={isLoading}
        query={query}
        onResultClick={handleResultClick}
        className="min-h-96"
      />

      {/* Search Tips - Show when no query and no results */}
      {!query && !isLoading && (!results || results.length === 0) && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Busca Avançada do Sistema</h3>
          <p className="text-gray-600 mb-4">
            Digite sua busca acima para encontrar pacientes, prontuários médicos e consultas.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              <strong>Dicas de busca:</strong>
            </p>
            <p>• Use palavras-chave específicas para melhores resultados</p>
            <p>• Combine filtros para refinar sua busca</p>
            <p>• Busque por nome, CPF, diagnóstico, procedimentos</p>
            <p>• Use aspas para buscar termos exatos: "diabetes tipo 2"</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component for simple usage
interface QuickSearchProps {
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  entityTypes?: string[];
  className?: string;
}

export function QuickSearch({
  placeholder = 'Buscar...',
  onResultSelect,
  entityTypes,
  className,
}: QuickSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultFilters: SearchFiltersType = entityTypes ? { entityTypes } : {};

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultSelect?.(result);
      setIsExpanded(false);
    },
    [onResultSelect]
  );

  const handleSearch = useCallback((query: string) => {
    setIsExpanded(!!query.trim());
  }, []);

  return (
    <div className={cn('relative', className)}>
      <SearchBar
        placeholder={placeholder}
        onSearch={handleSearch}
        className="w-full"
        entityTypes={entityTypes}
      />

      {isExpanded && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-auto">
          <SearchPage
            hideFilters={true}
            defaultFilters={defaultFilters}
            onResultClick={handleResultClick}
            maxResults={10}
            className="p-4"
          />
        </div>
      )}
    </div>
  );
}
