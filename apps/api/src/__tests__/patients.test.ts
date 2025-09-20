import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeConnection } from '../db/index.js';
import { patientsService } from '../services/patients.service.js';

describe('PatientsService', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('calculateAge', () => {
    it('should calculate age correctly', () => {
      const service = new (patientsService.constructor as any)();

      // Teste para pessoa com 30 anos (nascida em 1994)
      const birthDate = new Date('1994-06-15');
      const age = service.calculateAge(birthDate);

      // A idade deve estar entre 29 e 31 dependendo da data atual
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(31);
    });

    it('should handle birthday not yet reached this year', () => {
      const service = new (patientsService.constructor as any)();

      // Data de nascimento no futuro este ano
      const nextYear = new Date().getFullYear() + 1;
      const futureBirthDate = new Date(`${nextYear}-01-01`);
      const today = new Date();

      // Para data futura, idade seria negativa, mas não testamos isso aqui
      // Vamos testar com uma data do ano passado
      const lastYear = today.getFullYear() - 1;
      const birthDate = new Date(`${lastYear}-12-31`);
      const age = service.calculateAge(birthDate);

      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(1);
    });
  });

  describe('formatPatientResponse', () => {
    it('should format patient data correctly', () => {
      const service = new (patientsService.constructor as any)();

      const mockPatient = {
        id: 1,
        fullName: 'João Silva',
        dateOfBirth: new Date('1990-05-15'),
        hospitalId: 1,
      };

      const formatted = service.formatPatientResponse(mockPatient);

      expect(formatted).toEqual({
        id: 1,
        fullName: 'João Silva',
        dateOfBirth: new Date('1990-05-15'),
        hospitalId: 1,
        age: expect.any(Number),
      });

      expect(formatted.age).toBeGreaterThanOrEqual(33);
      expect(formatted.age).toBeLessThanOrEqual(35);
    });
  });

  describe('getPatientStats', () => {
    it('should return valid statistics structure', async () => {
      const hospitalId = 1;

      const stats = await patientsService.getPatientStats(hospitalId);

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('recentlyAdded');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.recentlyAdded).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.recentlyAdded).toBeGreaterThanOrEqual(0);
    });
  });

  describe('searchPatients', () => {
    it('should return empty array for non-existent search term', async () => {
      const hospitalId = 1;
      const searchTerm = 'NonExistentPatientName12345';

      const results = await patientsService.searchPatients(searchTerm, hospitalId, 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const hospitalId = 1;
      const searchTerm = 'a'; // Termo amplo que pode retornar muitos resultados
      const limit = 5;

      const results = await patientsService.searchPatients(searchTerm, hospitalId, limit);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('getPatients', () => {
    it('should return valid pagination structure', async () => {
      const hospitalId = 1;
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'fullName' as const,
        sortOrder: 'asc' as const,
        hospitalId: undefined,
      };

      const result = await patientsService.getPatients(query, hospitalId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);

      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination).toHaveProperty('hasNext');
      expect(result.pagination).toHaveProperty('hasPrev');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(typeof result.pagination.total).toBe('number');
      expect(typeof result.pagination.totalPages).toBe('number');
      expect(typeof result.pagination.hasNext).toBe('boolean');
      expect(typeof result.pagination.hasPrev).toBe('boolean');
    });

    it('should handle search parameter', async () => {
      const hospitalId = 1;
      const query = {
        page: 1,
        limit: 10,
        search: 'test',
        sortBy: 'fullName' as const,
        sortOrder: 'asc' as const,
        hospitalId: undefined,
      };

      const result = await patientsService.getPatients(query, hospitalId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should handle invalid hospital ID', async () => {
      const invalidHospitalId = -1;

      const result = await patientsService.getPatientById(999, invalidHospitalId);

      expect(result).toBeNull();
    });

    it('should handle non-existent patient ID', async () => {
      const hospitalId = 1;
      const nonExistentId = 999999;

      const result = await patientsService.getPatientById(nonExistentId, hospitalId);

      expect(result).toBeNull();
    });
  });
});
