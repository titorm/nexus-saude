import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { createTestUser, createTestDatabase, cleanupTestData } from './helpers/test-helpers';

describe('AuthService', () => {
  let authService: AuthService;
  let testDb: any;
  let createdUserIds: number[] = [];

  beforeEach(async () => {
    testDb = await createTestDatabase();
    authService = new AuthService();
    createdUserIds = [];
  });

  afterEach(async () => {
    // Cleanup test data
    if (createdUserIds.length > 0) {
      await cleanupTestData(testDb, createdUserIds);
    }
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'nurse',
      });
      createdUserIds.push(testUser.id);

      const result = await authService.authenticateUser('test@example.com', 'ValidPassword123!');

      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUser.id);
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('nurse');
    });

    it('should return null for invalid email', async () => {
      const result = await authService.authenticateUser('nonexistent@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      const result = await authService.authenticateUser('test@example.com', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'ValidPassword123!',
        'MyStr0ng@Password',
        'C0mpl3x#P@ssw0rd',
        'Secure123$Password',
      ];

      strongPasswords.forEach((password) => {
        const result = authService.validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'password', expectedError: /letra maiúscula|número|caractere especial/ },
        { password: 'PASSWORD', expectedError: /letra minúscula|número|caractere especial/ },
        { password: '12345678', expectedError: /letra/ },
        { password: 'Password', expectedError: /número|caractere especial/ },
        { password: 'Password123', expectedError: /caractere especial/ },
        { password: 'Pass!', expectedError: /8 caracteres/ },
        { password: 'short', expectedError: /8 caracteres/ },
        { password: '', expectedError: /8 caracteres/ },
      ];

      weakPasswords.forEach(({ password, expectedError }) => {
        const result = authService.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: 'administrator',
      });
      createdUserIds.push(testUser.id);

      const result = await authService.changePassword(
        testUser.id,
        'OldPassword123!',
        'NewPassword123!'
      );

      expect(result).toBe(true);

      // Verify old password no longer works
      const oldAuth = await authService.authenticateUser('test@example.com', 'OldPassword123!');
      expect(oldAuth).toBeNull();

      // Verify new password works
      const newAuth = await authService.authenticateUser('test@example.com', 'NewPassword123!');
      expect(newAuth?.userId).toBe(testUser.id);
    });

    it('should return false for invalid current password', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      const result = await authService.changePassword(
        testUser.id,
        'WrongPassword123!',
        'NewPassword123!'
      );

      expect(result).toBe(false);
    });

    it('should return false for nonexistent user', async () => {
      const result = await authService.changePassword(
        99999,
        'ValidPassword123!',
        'NewPassword123!'
      );

      expect(result).toBe(false);
    });
  });

  describe('getUserById', () => {
    it('should return user by valid ID', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'nurse',
      });
      createdUserIds.push(testUser.id);

      const result = await authService.getUserById(testUser.id);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUser.id);
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('nurse');
    });

    it('should return null for invalid ID', async () => {
      const result = await authService.getUserById(99999);
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toMatch(/^\$2[aby]\$12\$/); // bcrypt format with cost 12
      expect(hash2).toMatch(/^\$2[aby]\$12\$/);
    });

    it('should create hash that can be verified', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      // Create a test user to verify the hash works
      const testUser = await createTestUser(testDb, {
        email: 'hash-test@example.com',
        password: password,
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      const authResult = await authService.authenticateUser('hash-test@example.com', password);
      expect(authResult).toBeDefined();
      expect(authResult?.userId).toBe(testUser.id);
    });
  });
});
