import { useState, useEffect } from 'react';
import { SearchService } from '../services/search.service';

const searchService = new SearchService();

interface UseSearchAnalyticsOptions {
  timeframe: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  refreshInterval?: number | null;
}

interface SearchAnalytics {
  summary: {
    totalSearches: number;
    activeUsers: number;
    avgResponseTime: number;
    successRate: number;
    searchGrowth: number;
    avgSearchesPerUser: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  trends: {
    searchVolume: Array<{ date: string; searches: number }>;
    responseTime: Array<{ date: string; avg: number; p95: number; p99: number }>;
  };
  distribution: {
    entityTypes: Array<{ name: string; count: number }>;
    queryCategories: Array<{ category: string; count: number }>;
  };
  popularQueries: Array<{ query: string; count: number }>;
  failedQueries: Array<{ query: string; attempts: number; lastAttempt: string }>;
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
    responseTimeDistribution: Array<{ range: string; count: number }>;
  };
  userActivity: {
    timeline: Array<{ date: string; activeUsers: number }>;
    topUsers: Array<{ name: string; role: string; searchCount: number; avgResponseTime: number }>;
    hourlyPattern: Array<{ hour: string; searches: number }>;
  };
  security: {
    events: Array<{ type: string; description: string; timestamp: string; ipAddress: string }>;
    rateLimiting: {
      blockedRequests: number;
      blockedIPs: number;
      affectedUsers: number;
    };
    auditTrail: Array<{ action: string; details: string; timestamp: string }>;
  };
  health: {
    database: string;
    searchIndexes: string;
    cache: string;
    lastIndexUpdate: string;
  };
}

export function useSearchAnalytics(options: UseSearchAnalyticsOptions) {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await searchService.getAnalytics({
        timeframe: options.timeframe,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      if (response.success) {
        setAnalytics(response.analytics);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching search analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [options.timeframe, options.startDate, options.endDate]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
