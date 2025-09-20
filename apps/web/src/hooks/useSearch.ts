import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SearchService,
  type SearchQuery,
  type SearchResponse,
  type AutocompleteResponse,
} from '../services/search.service';
import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

// Query keys for React Query cache management
export const searchKeys = {
  all: ['search'] as const,
  global: (query: SearchQuery) => [...searchKeys.all, 'global', query] as const,
  patients: (query: SearchQuery) => [...searchKeys.all, 'patients', query] as const,
  clinicalNotes: (query: SearchQuery) => [...searchKeys.all, 'clinical-notes', query] as const,
  appointments: (query: SearchQuery) => [...searchKeys.all, 'appointments', query] as const,
  autocomplete: (query: string, types?: string[]) =>
    [...searchKeys.all, 'autocomplete', query, types] as const,
  history: () => [...searchKeys.all, 'history'] as const,
  analytics: (timeframe: string, hospitalId?: number) =>
    [...searchKeys.all, 'analytics', timeframe, hospitalId] as const,
};

/**
 * Hook for global search with caching and state management
 */
export function useGlobalSearch(searchQuery: SearchQuery, enabled = true) {
  const queryKey = searchKeys.global(searchQuery);

  return useQuery({
    queryKey,
    queryFn: () => SearchService.globalSearch(searchQuery),
    enabled: enabled && !!searchQuery.query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for entity-specific searches
 */
export function useEntitySearch(
  entityType: 'patients' | 'clinical-notes' | 'appointments',
  searchQuery: SearchQuery,
  enabled = true
) {
  const getQueryKey = () => {
    switch (entityType) {
      case 'patients':
        return searchKeys.patients(searchQuery);
      case 'clinical-notes':
        return searchKeys.clinicalNotes(searchQuery);
      case 'appointments':
        return searchKeys.appointments(searchQuery);
    }
  };

  const getSearchFn = () => {
    switch (entityType) {
      case 'patients':
        return SearchService.searchPatients;
      case 'clinical-notes':
        return SearchService.searchClinicalNotes;
      case 'appointments':
        return SearchService.searchAppointments;
    }
  };

  return useQuery({
    queryKey: getQueryKey(),
    queryFn: () => getSearchFn()(searchQuery),
    enabled: enabled && !!searchQuery.query.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for autocomplete with debouncing and caching
 */
export function useAutocomplete(query: string, types?: string[], debounceMs = 300, enabled = true) {
  const debouncedQuery = useDebounce(query, debounceMs);

  return useQuery({
    queryKey: searchKeys.autocomplete(debouncedQuery, types),
    queryFn: () => SearchService.getAutocompleteSuggestions(debouncedQuery, types),
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for search history
 */
export function useSearchHistory(limit = 20) {
  return useQuery({
    queryKey: searchKeys.history(),
    queryFn: () => SearchService.getSearchHistory(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook for search analytics (admin users)
 */
export function useSearchAnalytics(
  timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly',
  hospitalId?: number
) {
  return useQuery({
    queryKey: searchKeys.analytics(timeframe, hospitalId),
    queryFn: () => SearchService.getSearchAnalytics(timeframe, hospitalId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for tracking search events
 */
export function useSearchTracking() {
  return useMutation({
    mutationFn: SearchService.trackSearchEvent,
    // Don't show errors for tracking failures
    onError: (error) => {
      console.warn('Search tracking failed:', error);
    },
  });
}

/**
 * Hook for search operations (reindex, update)
 */
export function useSearchOperations() {
  const queryClient = useQueryClient();

  const updateIndex = useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: number }) =>
      SearchService.updateEntityIndex(entityType, entityId),
    onSuccess: () => {
      // Invalidate search caches
      queryClient.invalidateQueries({ queryKey: searchKeys.all });
    },
  });

  const triggerReindex = useMutation({
    mutationFn: SearchService.triggerReindex,
    onSuccess: () => {
      // Invalidate all search caches
      queryClient.invalidateQueries({ queryKey: searchKeys.all });
    },
  });

  return {
    updateIndex,
    triggerReindex,
  };
}

/**
 * Hook for managing search state and providing search utilities
 */
export function useSearchManager() {
  const queryClient = useQueryClient();
  const trackSearch = useSearchTracking();
  const searchStartTime = useRef<number>(0);

  const performSearch = useCallback(
    async (searchQuery: SearchQuery) => {
      searchStartTime.current = Date.now();

      try {
        const result = await SearchService.globalSearch(searchQuery);

        // Track search event
        trackSearch.mutate({
          query: searchQuery.query,
          filters: searchQuery.filters,
          resultsCount: result.total,
          executionTime: Date.now() - searchStartTime.current,
        });

        return result;
      } catch (error) {
        // Track failed search
        trackSearch.mutate({
          query: searchQuery.query,
          filters: searchQuery.filters,
          resultsCount: 0,
          executionTime: Date.now() - searchStartTime.current,
        });
        throw error;
      }
    },
    [trackSearch]
  );

  const trackResultClick = useCallback(
    (query: string, resultId: string, filters?: Record<string, any>) => {
      trackSearch.mutate({
        query,
        filters,
        clickedResultId: resultId,
      });
    },
    [trackSearch]
  );

  const clearSearchCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: searchKeys.all });
  }, [queryClient]);

  const prefetchSearch = useCallback(
    (searchQuery: SearchQuery) => {
      queryClient.prefetchQuery({
        queryKey: searchKeys.global(searchQuery),
        queryFn: () => SearchService.globalSearch(searchQuery),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    performSearch,
    trackResultClick,
    clearSearchCache,
    prefetchSearch,
  };
}
