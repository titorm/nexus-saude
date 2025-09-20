import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { authRoutes } from '../routes/auth';
import { createTestUser, createTestDatabase, cleanupTestData } from './helpers/test-helpers';

describe('Auth Routes', () => {
  let app: any;
  let testDb: any;
  let createdUserIds: number[] = [];

  beforeEach(async () => {
    testDb = await createTestDatabase();
    createdUserIds = [];

    app = Fastify();

    // Register JWT plugin
    await app.register(import('@fastify/jwt'), {
      secret: process.env.JWT_SECRET || 'test-secret-key-for-testing',
    });

    // Register auth routes
    await app.register(authRoutes, { prefix: '/api/auth' });
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await cleanupTestData(testDb, createdUserIds);
    }
    await app.close();
  });

  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.role).toBe('doctor');

      // Should set cookies
      const cookies = response.cookies;
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: any) => c.name === 'access_token')).toBe(true);
      expect(cookies.some((c: any) => c.name === 'refresh_token')).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'InvalidPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('credenciais');
    });

    it('should reject malformed requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'invalid-email',
          password: '123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should apply rate limiting', async () => {
      const requests = [];

      // Make multiple requests quickly to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        requests.push(
          app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
              email: 'test@example.com',
              password: 'wrongpassword',
            },
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.statusCode === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /logout', () => {
    it('should logout authenticated user', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'nurse',
      });
      createdUserIds.push(testUser.id);

      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        },
      });

      expect(loginResponse.statusCode).toBe(200);

      const loginCookies = loginResponse.cookies;
      const cookieHeader = loginCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

      // Then logout
      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: cookieHeader,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);

      const body = JSON.parse(logoutResponse.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('logout');
    });

    it('should handle logout without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /validate', () => {
    it('should validate valid token', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'administrator',
      });
      createdUserIds.push(testUser.id);

      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        },
      });

      const loginCookies = loginResponse.cookies;
      const cookieHeader = loginCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

      // Then validate
      const validateResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/validate',
        headers: {
          cookie: cookieHeader,
        },
      });

      expect(validateResponse.statusCode).toBe(200);

      const body = JSON.parse(validateResponse.body);
      expect(body.valid).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
    });

    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/validate',
        headers: {
          cookie: 'access_token=invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/validate',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /refresh', () => {
    it('should refresh valid refresh token', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        },
      });

      const loginCookies = loginResponse.cookies;
      const refreshTokenCookie = loginCookies.find((c: any) => c.name === 'refresh_token');

      expect(refreshTokenCookie).toBeDefined();

      // Then refresh
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: `refresh_token=${refreshTokenCookie.value}`,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);

      const body = JSON.parse(refreshResponse.body);
      expect(body.success).toBe(true);

      // Should set new cookies
      const refreshCookies = refreshResponse.cookies;
      expect(refreshCookies.some((c: any) => c.name === 'access_token')).toBe(true);
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: 'refresh_token=invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should apply rate limiting to refresh requests', async () => {
      const requests = [];

      for (let i = 0; i < 12; i++) {
        requests.push(
          app.inject({
            method: 'POST',
            url: '/api/auth/refresh',
            headers: {
              cookie: 'refresh_token=invalid-token',
            },
          })
        );
      }

      const responses = await Promise.all(requests);

      // Should be rate limited after 10 requests
      const rateLimited = responses.some((r) => r.statusCode === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('POST /change-password', () => {
    it('should change password with valid current password', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'OldPassword123!',
        role: 'nurse',
      });
      createdUserIds.push(testUser.id);

      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'OldPassword123!',
        },
      });

      const loginCookies = loginResponse.cookies;
      const cookieHeader = loginCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

      // Change password
      const changeResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          cookie: cookieHeader,
        },
        payload: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        },
      });

      expect(changeResponse.statusCode).toBe(200);

      const body = JSON.parse(changeResponse.body);
      expect(body.success).toBe(true);

      // Verify old password no longer works
      const oldLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'OldPassword123!',
        },
      });

      expect(oldLoginResponse.statusCode).toBe(401);

      // Verify new password works
      const newLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'NewPassword123!',
        },
      });

      expect(newLoginResponse.statusCode).toBe(200);
    });

    it('should reject weak new passwords', async () => {
      const testUser = await createTestUser(testDb, {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        role: 'doctor',
      });
      createdUserIds.push(testUser.id);

      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'ValidPassword123!',
        },
      });

      const loginCookies = loginResponse.cookies;
      const cookieHeader = loginCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

      // Try to change to weak password
      const changeResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: {
          cookie: cookieHeader,
        },
        payload: {
          currentPassword: 'ValidPassword123!',
          newPassword: 'weak',
        },
      });

      expect(changeResponse.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        payload: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
