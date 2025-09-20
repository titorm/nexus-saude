// Search Components
export { SearchBar } from './SearchBar';
export { SearchFilters } from './SearchFilters';
export { SearchResults } from './SearchResults';
export { SearchPage, QuickSearch } from './SearchPage';

// Search Types
export type { SearchFilters as SearchFiltersType } from './SearchFilters';

// Re-export search service types for convenience
export type {
  SearchResult,
  SearchQuery,
  SearchResponse,
  AutocompleteResult,
  AutocompleteResponse,
  SearchHistoryItem,
  SearchAnalytics,
} from '@/services/search.service';

// Re-export search hooks for convenience
export {
  useGlobalSearch,
  useEntitySearch,
  useAutocomplete,
  useSearchHistory,
  useSearchAnalytics,
  useSearchTracking,
  useSearchOperations,
  useSearchManager,
  searchKeys,
} from '@/hooks/useSearch';
