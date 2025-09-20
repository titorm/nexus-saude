import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Clock, User, FileText, Calendar, ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';
import { Dropdown, DropdownItem, DropdownHeader, DropdownSeparator } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { useAutocomplete, useSearchHistory, useSearchManager } from '../../hooks/useSearch';
import { cn } from '@/lib/utils';
import type { AutocompleteResult } from '../../services/search.service';

interface SearchBarProps {
  onSearch?: (query: string, filters?: Record<string, any>) => void;
  onResultSelect?: (result: AutocompleteResult) => void;
  placeholder?: string;
  showHistory?: boolean;
  showFilters?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  entityTypes?: string[];
}

export function SearchBar({
  onSearch,
  onResultSelect,
  placeholder = 'Buscar pacientes, consultas, prontuários...',
  showHistory = true,
  showFilters = false,
  className,
  size = 'md',
  entityTypes,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { trackResultClick } = useSearchManager();

  // Autocomplete suggestions
  const { data: autocompleteData, isLoading: isAutocompleteLoading } = useAutocomplete(
    query,
    entityTypes,
    300, // debounce 300ms
    query.length >= 2
  );

  // Search history
  const { data: searchHistory } = useSearchHistory(10);

  const suggestions = autocompleteData?.suggestions || [];
  const recentSearches = showHistory ? searchHistory?.slice(0, 5) || [] : [];

  // Combined options for dropdown
  const hasRecentSearches = recentSearches.length > 0 && query.length < 2;
  const hasSuggestions = suggestions.length > 0 && query.length >= 2;
  const showDropdown =
    isDropdownOpen && (hasRecentSearches || hasSuggestions || isAutocompleteLoading);

  const allOptions = [
    ...(hasRecentSearches
      ? recentSearches.map((item) => ({
          id: `history-${item.id}`,
          text: item.query,
          type: 'history' as const,
          metadata: { resultsCount: item.resultsCount },
        }))
      : []),
    ...(hasSuggestions
      ? suggestions.map((suggestion, index) => ({
          id: `suggestion-${index}`,
          ...suggestion,
        }))
      : []),
  ];

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedIndex(-1);

      if (value.length >= 2 || (value.length === 0 && showHistory)) {
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    },
    [showHistory]
  );

  const handleInputFocus = useCallback(() => {
    if (query.length >= 2 || (query.length === 0 && showHistory && recentSearches.length > 0)) {
      setIsDropdownOpen(true);
    }
  }, [query.length, showHistory, recentSearches.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < allOptions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < allOptions.length) {
            const selectedOption = allOptions[selectedIndex];
            handleOptionSelect(selectedOption);
          } else if (query.trim()) {
            handleSearch(query.trim());
          }
          break;
        case 'Escape':
          setIsDropdownOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [showDropdown, selectedIndex, allOptions, query]
  );

  const handleOptionSelect = useCallback(
    (option: any) => {
      const searchQuery = option.text;
      setQuery(searchQuery);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);

      // Track the selection
      if (option.type !== 'history') {
        trackResultClick(query, option.id);
      }

      if (option.type === 'query' || option.type === 'history') {
        handleSearch(searchQuery);
      } else if (onResultSelect) {
        onResultSelect(option);
      }
    },
    [query, trackResultClick, onResultSelect]
  );

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery.trim());
      }
      setIsDropdownOpen(false);
    },
    [onSearch]
  );

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return <User className="w-4 h-4" />;
      case 'clinical_note':
        return <FileText className="w-4 h-4" />;
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'patient':
        return 'Paciente';
      case 'clinical_note':
        return 'Prontuário';
      case 'appointment':
        return 'Consulta';
      case 'query':
        return 'Busca';
      case 'history':
        return 'Histórico';
      default:
        return 'Resultado';
    }
  };

  const getEntityVariant = (type: string) => {
    switch (type) {
      case 'patient':
        return 'primary' as const;
      case 'clinical_note':
        return 'success' as const;
      case 'appointment':
        return 'warning' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Dropdown
        isOpen={showDropdown}
        onClose={() => setIsDropdownOpen(false)}
        position="bottom-left"
        width="trigger"
        trigger={
          <Input
            ref={inputRef}
            variant="search"
            size={size}
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            leftIcon={<Search className="w-5 h-5" />}
            className="w-full"
          />
        }
      >
        <div className="max-h-96 overflow-y-auto">
          {isAutocompleteLoading && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">Buscando sugestões...</div>
          )}

          {hasRecentSearches && (
            <>
              <DropdownHeader>
                <Clock className="w-3 h-3 inline mr-1" />
                Pesquisas Recentes
              </DropdownHeader>
              {recentSearches.map((item, index) => (
                <DropdownItem
                  key={`history-${item.id}`}
                  active={selectedIndex === index}
                  onClick={() =>
                    handleOptionSelect({
                      id: `history-${item.id}`,
                      text: item.query,
                      type: 'history',
                      metadata: { resultsCount: item.resultsCount },
                    })
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {item.query}
                    </span>
                    <Badge variant="secondary" size="sm">
                      {item.resultsCount} resultados
                    </Badge>
                  </div>
                </DropdownItem>
              ))}
              {hasSuggestions && <DropdownSeparator />}
            </>
          )}

          {hasSuggestions && (
            <>
              {!hasRecentSearches && (
                <DropdownHeader>
                  <Search className="w-3 h-3 inline mr-1" />
                  Sugestões
                </DropdownHeader>
              )}
              {suggestions.map((suggestion, index) => {
                const optionIndex = hasRecentSearches ? recentSearches.length + index : index;
                return (
                  <DropdownItem
                    key={`suggestion-${index}`}
                    active={selectedIndex === optionIndex}
                    onClick={() =>
                      handleOptionSelect({
                        id: `suggestion-${index}`,
                        ...suggestion,
                      })
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center">
                        {getEntityIcon(suggestion.type)}
                        <span className="ml-2">{suggestion.text}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getEntityVariant(suggestion.type)} size="sm">
                          {getEntityLabel(suggestion.type)}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  </DropdownItem>
                );
              })}
            </>
          )}

          {!isAutocompleteLoading && !hasRecentSearches && !hasSuggestions && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Nenhuma sugestão encontrada
            </div>
          )}

          {!isAutocompleteLoading && !hasRecentSearches && query.length < 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  );
}
