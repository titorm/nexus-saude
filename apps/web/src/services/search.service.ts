import { apiClient } from '../lib/api';

export interface SearchQuery {
  query: string;
  entityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  entityType: 'patient' | 'clinical_note' | 'appointment';
  entityId: number;
  title: string;
  content: string;
  excerpt?: string;
  highlights?: string[];
  metadata: Record<string, any>;
  relevanceScore: number;
  matchedTerms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  page: number;
  limit: number;
  executionTime: number;
  query: string;
  suggestions?: string[];
}

export interface AutocompleteResult {
  text: string;
  type: 'query' | 'patient' | 'clinical_note' | 'appointment';
  entityId?: number;
  metadata?: Record<string, any>;
  popularity?: number;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteResult[];
  executionTime: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: Record<string, any>;
  resultsCount: number;
  executionTime: number;
  clickedResultId?: string;
  createdAt: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  avgResultsPerSearch: number;
  avgExecutionTime: number;
  popularQueries: Array<{
    query: string;
    count: number;
    avgResults: number;
  }>;
  noResultQueries: Array<{
    query: string;
    count: number;
  }>;
  searchTrends: Array<{
    date: string;
    searchCount: number;
    uniqueUsers: number;
  }>;
}

export class SearchService {
  private static baseURL = '/v1/search';

  /**
   * Perform global search across all entities
   */
  static async globalSearch(params: SearchQuery): Promise<SearchResponse> {
    const response = await apiClient.get(`${this.baseURL}/global`, { params });
    return response.data;
  }

  /**
   * Search patients specifically
   */
  static async searchPatients(params: SearchQuery): Promise<SearchResponse> {
    const response = await apiClient.get(`${this.baseURL}/patients`, { params });
    return response.data;
  }

  /**
   * Search clinical notes specifically
   */
  static async searchClinicalNotes(params: SearchQuery): Promise<SearchResponse> {
    const response = await apiClient.get(`${this.baseURL}/clinical-notes`, { params });
    return response.data;
  }

  /**
   * Search appointments specifically
   */
  static async searchAppointments(params: SearchQuery): Promise<SearchResponse> {
    const response = await apiClient.get(`${this.baseURL}/appointments`, { params });
    return response.data;
  }

  /**
   * Get autocomplete suggestions
   */
  static async getAutocompleteSuggestions(
    query: string,
    types?: string[],
    limit = 10
  ): Promise<AutocompleteResponse> {
    const response = await apiClient.get(`${this.baseURL}/autocomplete`, {
      params: { query, types: types?.join(','), limit },
    });
    return response.data;
  }

  /**
   * Track search event (for analytics)
   */
  static async trackSearchEvent(eventData: {
    query: string;
    filters?: Record<string, any>;
    resultsCount?: number;
    clickedResultId?: string;
    executionTime?: number;
  }): Promise<void> {
    try {
      await apiClient.post(`${this.baseURL}/events`, eventData);
    } catch (error) {
      // Don't throw on analytics errors
      console.warn('Failed to track search event:', error);
    }
  }

  /**
   * Get user's search history
   */
  static async getSearchHistory(limit = 20): Promise<SearchHistoryItem[]> {
    const response = await apiClient.get(`${this.baseURL}/history`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get search analytics (admin only)
   */
  static async getSearchAnalytics(
    timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly',
    hospitalId?: number
  ): Promise<SearchAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/analytics`, {
      params: { timeframe, hospitalId },
    });
    return response.data;
  }

  /**
   * Manually update search index for an entity
   */
  static async updateEntityIndex(entityType: string, entityId: number): Promise<void> {
    await apiClient.put(`${this.baseURL}/index/${entityType}/${entityId}`);
  }

  /**
   * Trigger full reindex (admin only)
   */
  static async triggerReindex(): Promise<{ jobId: string }> {
    const response = await apiClient.post(`${this.baseURL}/reindex`);
    return response.data;
  }

  /**
   * Get search analytics data
   */
  async getAnalytics(options: {
    timeframe: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; analytics: any }> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', options.timeframe);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await apiClient.get(
        `${SearchService.baseURL}/analytics?${params.toString()}`
      );

      return {
        success: true,
        analytics: response.data?.analytics || this.getMockAnalytics(),
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        success: true,
        analytics: this.getMockAnalytics(), // Return mock data for development
      };
    }
  }

  /**
   * Mock analytics data for development/demo purposes
   */
  private getMockAnalytics() {
    return {
      summary: {
        totalSearches: 15420,
        activeUsers: 89,
        avgResponseTime: 245,
        successRate: 94.2,
        searchGrowth: 12.5,
        avgSearchesPerUser: 173,
        p95ResponseTime: 450,
        errorRate: 5.8,
      },
      trends: {
        searchVolume: [
          { date: '2024-01-01', searches: 456 },
          { date: '2024-01-02', searches: 523 },
          { date: '2024-01-03', searches: 612 },
          { date: '2024-01-04', searches: 445 },
          { date: '2024-01-05', searches: 678 },
          { date: '2024-01-06', searches: 589 },
          { date: '2024-01-07', searches: 734 },
        ],
        responseTime: [
          { date: '2024-01-01', avg: 230, p95: 420, p99: 680 },
          { date: '2024-01-02', avg: 245, p95: 445, p99: 720 },
          { date: '2024-01-03', avg: 225, p95: 410, p99: 650 },
          { date: '2024-01-04', avg: 260, p95: 480, p99: 750 },
          { date: '2024-01-05', avg: 235, p95: 430, p99: 680 },
          { date: '2024-01-06', avg: 250, p95: 460, p99: 720 },
          { date: '2024-01-07', avg: 240, p95: 440, p99: 700 },
        ],
      },
      distribution: {
        entityTypes: [
          { name: 'Pacientes', count: 6240 },
          { name: 'Notas Clínicas', count: 5680 },
          { name: 'Agendamentos', count: 3500 },
        ],
        queryCategories: [
          { category: 'Diagnósticos', count: 4250 },
          { category: 'Medicamentos', count: 3180 },
          { category: 'Procedimentos', count: 2890 },
          { category: 'Sintomas', count: 2650 },
          { category: 'Exames', count: 2450 },
        ],
      },
      popularQueries: [
        { query: 'diabetes', count: 892 },
        { query: 'hipertensão', count: 754 },
        { query: 'consulta cardiologia', count: 623 },
        { query: 'exame sangue', count: 567 },
        { query: 'pressão arterial', count: 498 },
        { query: 'medicação diabetes', count: 445 },
        { query: 'ultrassom', count: 398 },
        { query: 'raio x', count: 356 },
        { query: 'colesterol', count: 334 },
        { query: 'consulta neurologista', count: 298 },
      ],
      failedQueries: [
        { query: 'teste xyz', attempts: 15, lastAttempt: '2024-01-07T10:30:00Z' },
        { query: 'medicamento inexistente', attempts: 8, lastAttempt: '2024-01-07T09:15:00Z' },
        { query: 'procedimento abc', attempts: 6, lastAttempt: '2024-01-06T16:20:00Z' },
        { query: 'exame desconhecido', attempts: 4, lastAttempt: '2024-01-06T14:45:00Z' },
      ],
      performance: {
        avgResponseTime: 245,
        p95ResponseTime: 450,
        p99ResponseTime: 720,
        errorRate: 5.8,
        throughput: 125,
        responseTimeDistribution: [
          { range: '0-100ms', count: 4250 },
          { range: '100-200ms', count: 3890 },
          { range: '200-300ms', count: 2340 },
          { range: '300-500ms', count: 1560 },
          { range: '500ms+', count: 780 },
        ],
      },
      userActivity: {
        timeline: [
          { date: '2024-01-01', activeUsers: 45 },
          { date: '2024-01-02', activeUsers: 52 },
          { date: '2024-01-03', activeUsers: 48 },
          { date: '2024-01-04', activeUsers: 41 },
          { date: '2024-01-05', activeUsers: 56 },
          { date: '2024-01-06', activeUsers: 49 },
          { date: '2024-01-07', activeUsers: 53 },
        ],
        topUsers: [
          { name: 'Dr. João Silva', role: 'Cardiologista', searchCount: 456, avgResponseTime: 220 },
          {
            name: 'Dra. Maria Santos',
            role: 'Neurologista',
            searchCount: 398,
            avgResponseTime: 235,
          },
          { name: 'Dr. Pedro Lima', role: 'Clínico Geral', searchCount: 334, avgResponseTime: 190 },
          { name: 'Enfermeira Ana', role: 'Enfermeira', searchCount: 278, avgResponseTime: 250 },
          { name: 'Dr. Carlos Costa', role: 'Ortopedista', searchCount: 245, avgResponseTime: 210 },
        ],
        hourlyPattern: [
          { hour: '08:00', searches: 234 },
          { hour: '09:00', searches: 356 },
          { hour: '10:00', searches: 445 },
          { hour: '11:00', searches: 398 },
          { hour: '12:00', searches: 289 },
          { hour: '13:00', searches: 178 },
          { hour: '14:00', searches: 334 },
          { hour: '15:00', searches: 423 },
          { hour: '16:00', searches: 389 },
          { hour: '17:00', searches: 267 },
          { hour: '18:00', searches: 145 },
        ],
      },
      security: {
        events: [
          {
            type: 'Rate Limit Exceeded',
            description: 'Usuário excedeu limite de 100 req/min',
            timestamp: '2024-01-07T10:45:00Z',
            ipAddress: '192.168.1.100',
          },
          {
            type: 'Unauthorized Access',
            description: 'Tentativa de acesso sem autenticação',
            timestamp: '2024-01-07T09:30:00Z',
            ipAddress: '203.45.67.89',
          },
          {
            type: 'Permission Denied',
            description: 'Usuário tentou acessar analytics sem permissão',
            timestamp: '2024-01-07T08:15:00Z',
            ipAddress: '192.168.1.105',
          },
        ],
        rateLimiting: {
          blockedRequests: 23,
          blockedIPs: 5,
          affectedUsers: 3,
        },
        auditTrail: [
          {
            action: 'search:global_search_completed',
            details: 'Query: diabetes, Results: 15',
            timestamp: '2024-01-07T11:00:00Z',
          },
          {
            action: 'search:analytics_accessed',
            details: 'Admin user accessed analytics dashboard',
            timestamp: '2024-01-07T10:55:00Z',
          },
          {
            action: 'search:rate_limit_exceeded',
            details: 'User ID: 123 exceeded rate limit',
            timestamp: '2024-01-07T10:45:00Z',
          },
          {
            action: 'search:index_rebuilt',
            details: 'Search index rebuild completed',
            timestamp: '2024-01-07T10:30:00Z',
          },
        ],
      },
      health: {
        database: 'healthy',
        searchIndexes: 'healthy',
        cache: 'healthy',
        lastIndexUpdate: '2024-01-07T02:00:00Z',
      },
    };
  }
}
