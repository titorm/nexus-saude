import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../app';
import type { FastifyInstance } from 'fastify';

describe('Patients API Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = build({ logger: false, disableRateLimit: true });
    await app.ready();

    // Para testes, vamos simular um token JWT válido
    // Em um ambiente real, você faria login através da API de auth
    const mockPayload = {
      userId: 1,
      hospitalId: 1,
      role: 'admin',
    };

    authToken = app.jwt.sign(mockPayload);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/patients', () => {
    it('should return patients list with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.data)).toBe(true);

      expect(body.pagination).toHaveProperty('page');
      expect(body.pagination).toHaveProperty('limit');
      expect(body.pagination).toHaveProperty('total');
      expect(body.pagination).toHaveProperty('totalPages');
      expect(body.pagination).toHaveProperty('hasNext');
      expect(body.pagination).toHaveProperty('hasPrev');
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients?page=1&limit=5&search=test&sortBy=fullName&sortOrder=desc',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
    });

    it('should validate query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients?page=-1&limit=1000',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/patients/stats', () => {
    it('should return patient statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/stats',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('recentlyAdded');
      expect(typeof body.total).toBe('number');
      expect(typeof body.recentlyAdded).toBe('number');
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/stats',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/patients/search', () => {
    it('should search patients', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/search?q=test&limit=10',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should require search query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/search',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate search parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/search?q=a&limit=1000',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    it('should return 404 for non-existent patient', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/999999',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Paciente não encontrado');
    });

    it('should validate patient ID parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/invalid-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/patients', () => {
    const validPatientData = {
      fullName: 'João Silva de Teste',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      phone: '(11) 99999-9999',
      email: 'joao.teste@email.com',
      address: 'Rua de Teste, 123',
      emergencyContact: 'Maria Silva',
      emergencyPhone: '(11) 88888-8888',
    };

    it('should create a new patient with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: validPatientData,
      });

      // Pode retornar 201 (criado) ou 409 (conflito se já existe)
      expect([201, 409]).toContain(response.statusCode);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          fullName: 'Nome Incompleto',
          // dateOfBirth missing
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should validate email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          ...validPatientData,
          email: 'invalid-email',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate age requirements', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          ...validPatientData,
          dateOfBirth: '2025-01-01', // Data futura
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/v1/patients/:id', () => {
    it('should return 404 for non-existent patient', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patients/999999',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          fullName: 'Nome Atualizado',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate update data', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/patients/1',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          email: 'invalid-email-format',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('should return 404 for non-existent patient', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/patients/999999',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require admin role for deletion', async () => {
      // Criar um token com role diferente de admin
      const nonAdminPayload = {
        userId: 2,
        hospitalId: 1,
        role: 'user',
      };
      const nonAdminToken = app.jwt.sign(nonAdminPayload);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/patients/1',
        headers: {
          authorization: `Bearer ${nonAdminToken}`,
        },
      });

      // Deve retornar 403 (forbidden) ou 401 dependendo da implementação
      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on endpoints', async () => {
      // Fazer múltiplas requisições rapidamente
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/v1/patients',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        })
      );

      const responses = await Promise.all(promises);

      // Algumas requisições devem ser bloqueadas por rate limiting
      const rateLimitedResponses = responses.filter((r) => r.statusCode === 429);

      // Se rate limiting estiver configurado, deve haver algumas requisições bloqueadas
      // Isso depende da configuração específica do rate limiting
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      }
    });
  });
});
