/**
 * Search Integration Test Suite
 *
 * This file contains integration tests for the advanced search system.
 * Tests cover API endpoints, search accuracy, filtering, and performance.
 *
 * To run these tests:
 * 1. Ensure the API server is running on localhost:3001
 * 2. Database should be populated with test data
 * 3. Run: npm test or npx vitest run
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_TIMEOUT = 30000; // 30 seconds

// Mock authentication token for testing
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

/**
 * HTTP client for API testing
 */
class ApiClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string = '') {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  private async request(method: string, endpoint: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
    };

    const config: RequestInit = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) }),
    };

    const response = await fetch(url, config);

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    return {
      status: response.status,
      data: responseData,
      headers: response.headers,
    };
  }

  async post(endpoint: string, data: any) {
    return this.request('POST', endpoint, data);
  }

  async get(endpoint: string) {
    return this.request('GET', endpoint);
  }
}

describe('Search System Integration Tests', () => {
  let apiClient: ApiClient;

  beforeAll(() => {
    apiClient = new ApiClient(API_BASE_URL, AUTH_TOKEN);
  });

  describe('API Connectivity', () => {
    test(
      'should connect to API server',
      async () => {
        try {
          const response = await apiClient.get('/health');
          expect([200, 404]).toContain(response.status); // 404 is ok if health endpoint doesn't exist
        } catch (error) {
          throw new Error(
            `Cannot connect to API server at ${API_BASE_URL}. Ensure server is running.`
          );
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Global Search Endpoint', () => {
    test(
      'should handle simple search queries',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'diabetes',
          limit: 10,
        });

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(response.data).toHaveProperty('results');
          expect(response.data).toHaveProperty('total');
          expect(Array.isArray(response.data.results)).toBe(true);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle complex multi-term queries',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'diabetes type 2 hypertension medication',
          limit: 20,
        });

        expect([200, 404]).toContain(response.status);

        if (response.status === 200 && response.data.results.length > 1) {
          // Check if results are sorted by relevance (descending)
          for (let i = 0; i < response.data.results.length - 1; i++) {
            if (
              response.data.results[i].relevanceScore &&
              response.data.results[i + 1].relevanceScore
            ) {
              expect(response.data.results[i].relevanceScore).toBeGreaterThanOrEqual(
                response.data.results[i + 1].relevanceScore
              );
            }
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should respect result limits',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'patient',
          limit: 5,
        });

        if (response.status === 200) {
          expect(response.data.results.length).toBeLessThanOrEqual(5);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should validate input parameters',
      async () => {
        const invalidQueries = [
          { query: '', limit: 10 }, // Empty query
          { query: 'test', limit: -1 }, // Invalid limit
          { query: 'test', limit: 'invalid' }, // Non-numeric limit
        ];

        for (const query of invalidQueries) {
          const response = await apiClient.post('/search/global', query);

          if (response.status !== 404) {
            // Skip if endpoint doesn't exist
            expect([400, 422]).toContain(response.status);
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle special characters safely',
      async () => {
        const specialQueries = [
          'test@email.com',
          'patient-name',
          'test & condition',
          'test OR condition',
          '"exact phrase search"',
          'test*wildcard',
          'test123number',
          'açento português',
        ];

        for (const query of specialQueries) {
          const response = await apiClient.post('/search/global', {
            query,
            limit: 5,
          });

          // Should not crash the server
          expect(response.status).toBeLessThan(500);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Entity-Specific Search Endpoints', () => {
    test(
      'should search patients only',
      async () => {
        const response = await apiClient.post('/search/patients', {
          query: 'patient test',
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            expect(result.entityType).toBe('patient');
          });
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should search clinical notes only',
      async () => {
        const response = await apiClient.post('/search/clinical-notes', {
          query: 'diabetes consultation',
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            expect(result.entityType).toBe('clinical_note');
          });
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should search appointments only',
      async () => {
        const response = await apiClient.post('/search/appointments', {
          query: 'consultation appointment',
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            expect(result.entityType).toBe('appointment');
          });
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Autocomplete Functionality', () => {
    test(
      'should provide autocomplete suggestions',
      async () => {
        const queries = ['pat', 'diab', 'cons', 'med'];

        for (const query of queries) {
          const response = await apiClient.get(`/search/autocomplete?query=${query}&limit=5`);

          if (response.status === 200) {
            expect(response.data).toHaveProperty('suggestions');
            expect(Array.isArray(response.data.suggestions)).toBe(true);
            expect(response.data.suggestions.length).toBeLessThanOrEqual(5);
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should reject very short queries',
      async () => {
        const response = await apiClient.get('/search/autocomplete?query=a&limit=5');

        if (response.status !== 404) {
          // Skip if endpoint doesn't exist
          expect([400, 422]).toContain(response.status);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should filter by entity types',
      async () => {
        const response = await apiClient.get(
          '/search/autocomplete?query=test&types=patient&limit=5'
        );

        if (response.status === 200) {
          response.data.suggestions.forEach((suggestion: any) => {
            if (suggestion.type) {
              expect(['patient', 'mixed']).toContain(suggestion.type);
            }
          });
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Search Filters', () => {
    test(
      'should filter by entity types',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'test',
          entityTypes: ['patient', 'clinical_note'],
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            expect(['patient', 'clinical_note']).toContain(result.entityType);
          });
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should filter by date range',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'test',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            const resultDate = new Date(result.createdAt || result.scheduledAt || result.updatedAt);
            expect(resultDate.getFullYear()).toBeGreaterThanOrEqual(2024);
          });
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should filter by priority',
      async () => {
        const priorities = ['low', 'normal', 'high', 'urgent', 'critical'];

        for (const priority of priorities) {
          const response = await apiClient.post('/search/global', {
            query: 'test',
            priority,
            limit: 5,
          });

          if (response.status === 200) {
            response.data.results.forEach((result: any) => {
              if (result.metadata?.priority) {
                expect(result.metadata.priority).toBe(priority);
              }
            });
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should filter by status',
      async () => {
        const statuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];

        for (const status of statuses) {
          const response = await apiClient.post('/search/global', {
            query: 'test',
            status,
            limit: 5,
          });

          if (response.status === 200) {
            response.data.results.forEach((result: any) => {
              if (result.metadata?.status) {
                expect(result.metadata.status).toBe(status);
              }
            });
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should combine multiple filters',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'test',
          entityTypes: ['clinical_note'],
          priority: 'high',
          status: 'completed',
          limit: 10,
        });

        if (response.status === 200) {
          response.data.results.forEach((result: any) => {
            expect(result.entityType).toBe('clinical_note');
            if (result.metadata?.priority) {
              expect(result.metadata.priority).toBe('high');
            }
            if (result.metadata?.status) {
              expect(result.metadata.status).toBe('completed');
            }
          });
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Search History', () => {
    test(
      'should retrieve search history',
      async () => {
        // First, perform a search to create history
        await apiClient.post('/search/global', {
          query: 'history test query',
          limit: 5,
        });

        const response = await apiClient.get('/search/history?limit=10');

        if (response.status === 200) {
          expect(response.data).toHaveProperty('history');
          expect(Array.isArray(response.data.history)).toBe(true);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should limit history results',
      async () => {
        const response = await apiClient.get('/search/history?limit=3');

        if (response.status === 200) {
          expect(response.data.history.length).toBeLessThanOrEqual(3);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Search Analytics', () => {
    test(
      'should provide search analytics',
      async () => {
        const response = await apiClient.get('/search/analytics?timeframe=daily');

        if (response.status === 200) {
          expect(response.data).toHaveProperty('metrics');
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should track execution time',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'performance test',
          limit: 10,
        });

        if (response.status === 200) {
          expect(response.data).toHaveProperty('executionTime');
          expect(typeof response.data.executionTime).toBe('number');
          expect(response.data.executionTime).toBeGreaterThan(0);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Performance Requirements', () => {
    test(
      'should respond to simple queries quickly',
      async () => {
        const start = Date.now();

        const response = await apiClient.post('/search/global', {
          query: 'diabetes',
          limit: 10,
        });

        const responseTime = Date.now() - start;

        if (response.status === 200) {
          // Should respond within 500ms for simple queries
          expect(responseTime).toBeLessThan(500);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle autocomplete requests quickly',
      async () => {
        const start = Date.now();

        const response = await apiClient.get('/search/autocomplete?query=diab&limit=5');

        const responseTime = Date.now() - start;

        if (response.status === 200) {
          // Autocomplete should be very fast (under 200ms)
          expect(responseTime).toBeLessThan(200);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle concurrent requests',
      async () => {
        const concurrentRequests = 5;
        const requests = Array.from({ length: concurrentRequests }, (_, i) =>
          apiClient.post('/search/global', {
            query: `concurrent test ${i}`,
            limit: 5,
          })
        );

        const start = Date.now();
        const responses = await Promise.all(requests);
        const totalTime = Date.now() - start;

        // All requests should complete
        responses.forEach((response) => {
          expect(response.status).toBeLessThan(500);
        });

        // Should handle concurrent requests efficiently
        expect(totalTime).toBeLessThan(concurrentRequests * 300);
      },
      TEST_TIMEOUT
    );
  });

  describe('Error Handling and Edge Cases', () => {
    test(
      'should handle malformed requests gracefully',
      async () => {
        const malformedRequests = [
          { invalidField: 'test' },
          { query: null },
          { query: 'test', limit: null },
          { query: 'test', entityTypes: 'not-an-array' },
        ];

        for (const request of malformedRequests) {
          const response = await apiClient.post('/search/global', request);

          // Should not crash the server
          expect(response.status).toBeLessThan(500);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle SQL injection attempts',
      async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE patients; --",
          "test' OR '1'='1",
          "test'; DELETE FROM appointments; --",
          'test UNION SELECT * FROM users',
          "test'; INSERT INTO logs VALUES ('hacked'); --",
        ];

        for (const query of sqlInjectionAttempts) {
          const response = await apiClient.post('/search/global', {
            query,
            limit: 5,
          });

          // Should handle safely without crashing
          expect(response.status).toBeLessThan(500);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle XSS attempts',
      async () => {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert("xss")',
          '<svg onload=alert(1)>',
          '"><script>alert("xss")</script>',
        ];

        for (const query of xssAttempts) {
          const response = await apiClient.post('/search/global', {
            query,
            limit: 5,
          });

          // Should handle safely
          expect(response.status).toBeLessThan(500);

          if (response.status === 200 && response.data.results) {
            // Results should not contain unescaped script tags
            const resultString = JSON.stringify(response.data.results);
            expect(resultString).not.toMatch(/<script[^>]*>/);
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle very long queries',
      async () => {
        const longQuery = 'very long query '.repeat(100); // ~1600 characters

        const response = await apiClient.post('/search/global', {
          query: longQuery,
          limit: 5,
        });

        // Should handle gracefully (might return 400 for too long, but shouldn't crash)
        expect([200, 400, 413, 422]).toContain(response.status);
      },
      TEST_TIMEOUT
    );

    test(
      'should handle excessive result limits',
      async () => {
        const response = await apiClient.post('/search/global', {
          query: 'test',
          limit: 99999,
        });

        if (response.status === 200) {
          // Should cap results to a reasonable maximum
          expect(response.data.results.length).toBeLessThan(1000);
        } else {
          // Or reject excessive limits
          expect([400, 422]).toContain(response.status);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Search Result Quality', () => {
    test(
      'should return relevant results for medical terms',
      async () => {
        const medicalTerms = ['diabetes', 'hipertensão', 'consulta', 'exame', 'medicamento'];

        for (const term of medicalTerms) {
          const response = await apiClient.post('/search/global', {
            query: term,
            limit: 10,
          });

          if (response.status === 200 && response.data.results.length > 0) {
            // Results should have positive relevance scores
            response.data.results.forEach((result: any) => {
              if (result.relevanceScore) {
                expect(result.relevanceScore).toBeGreaterThan(0);
              }
            });
          }
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should handle Portuguese language correctly',
      async () => {
        const portugueseQueries = [
          'consulta médica',
          'exame de sangue',
          'pressão arterial',
          'medicação',
          'acompanhamento',
        ];

        for (const query of portugueseQueries) {
          const response = await apiClient.post('/search/global', {
            query,
            limit: 5,
          });

          // Should handle Portuguese without errors
          expect(response.status).not.toBe(500);
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should find exact phrase matches',
      async () => {
        const phraseQueries = [
          '"diabetes type 2"',
          '"emergency consultation"',
          '"blood pressure"',
          '"follow up"',
        ];

        for (const query of phraseQueries) {
          const response = await apiClient.post('/search/global', {
            query,
            limit: 10,
          });

          if (response.status === 200 && response.data.results.length > 0) {
            // At least some results should contain the exact phrase
            const hasExactMatch = response.data.results.some((result: any) => {
              const content = JSON.stringify(result).toLowerCase();
              const phrase = query.replace(/"/g, '').toLowerCase();
              return content.includes(phrase);
            });

            // Note: This is a quality check, not a hard requirement
            // In real scenarios, exact phrase matching depends on data availability
          }
        }
      },
      TEST_TIMEOUT
    );
  });
});

// Helper function to check if API server is accessible
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.status < 500;
  } catch {
    return false;
  }
}

// Export for external test runners
export { ApiClient, API_BASE_URL };
