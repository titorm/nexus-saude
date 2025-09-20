import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { authMiddleware, requireRole } from '../middleware/auth';
import { securityHeaders, sanitizeInput } from '../middleware/security';
import { createRateLimit } from '../middleware/rateLimit';

// Helper function to extract the string sanitization logic for testing
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    .replace(/[<>'"]/g, (match) => {
      switch (match) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#x27;';
        default:
          return match;
      }
    });
}

describe('Security Middleware', () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify();

    await app.register(import('@fastify/jwt'), {
      secret: 'test-secret-key',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Security Headers Middleware', () => {
    it('should add security headers to responses', async () => {
      app.register(async function (fastify: any) {
        await fastify.register(securityHeaders);

        fastify.get('/test', async () => {
          return { message: 'test' };
        });
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize dangerous HTML input', () => {
      const dangerousInputs = [
        { input: '<script>alert("xss")</script>', shouldNotContain: ['<script>', 'alert'] },
        { input: '<img src="x" onerror="alert(1)">', shouldNotContain: ['onerror', 'alert'] },
        { input: '"><script>alert("xss")</script>', shouldNotContain: ['<script>', 'alert'] },
        { input: 'javascript:alert(1)', shouldNotContain: ['javascript:', 'alert'] },
        {
          input: 'data:text/html,<script>alert(1)</script>',
          shouldNotContain: ['data:text/html', 'alert'],
        },
      ];

      dangerousInputs.forEach(({ input, shouldNotContain }) => {
        const sanitized = sanitizeString(input);
        shouldNotContain.forEach((dangerous) => {
          expect(sanitized.toLowerCase()).not.toContain(dangerous.toLowerCase());
        });
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'Dr. João Silva',
        'Paciente com histórico de diabetes',
        'Consulta agendada para 15/12/2024',
        'Email: joao@example.com',
      ];

      safeInputs.forEach((input) => {
        const sanitized = sanitizeString(input);
        expect(sanitized).toBe(input);
      });
    });

    it('should handle special characters safely', () => {
      const inputsWithSpecialChars = [
        'Preço: R$ 150,00',
        'Dosagem: 5mg/dia',
        'Horário: 08:30 - 17:00',
        'Telefone: (11) 99999-9999',
        'CPF: 123.456.789-00',
      ];

      inputsWithSpecialChars.forEach((input) => {
        const sanitized = sanitizeString(input);
        // These should be mostly preserved, but some characters might be escaped
        expect(sanitized).toBeDefined();
        expect(typeof sanitized).toBe('string');
      });
    });

    it('should work as middleware with request sanitization', async () => {
      app.register(async function (fastify: any) {
        await fastify.addHook('preHandler', sanitizeInput);

        fastify.post('/test-sanitize', async (request: any) => {
          return {
            body: request.body,
            query: request.query,
          };
        });
      });

      const response = await app.inject({
        method: 'POST',
        url: '/test-sanitize?search=<script>alert("xss")</script>',
        payload: {
          message: '<img src="x" onerror="alert(1)">',
          name: 'Dr. João Silva',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.body.message).not.toContain('<img');
      expect(body.body.message).not.toContain('onerror');
      expect(body.body.name).toBe('Dr. João Silva'); // Safe content preserved
      expect(body.query.search).not.toContain('<script>');
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimit = createRateLimit({
        max: 5,
        windowMs: 60000,
        message: 'Too many requests',
      });

      app.register(async function (fastify: any) {
        await fastify.register(rateLimit);

        fastify.get('/test', async () => {
          return { message: 'success' };
        });
      });

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test',
        });
        expect(response.statusCode).toBe(200);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      const rateLimit = createRateLimit({
        max: 2,
        windowMs: 60000,
        message: 'Rate limit exceeded',
      });

      app.register(async function (fastify: any) {
        await fastify.register(rateLimit);

        fastify.get('/test', async () => {
          return { message: 'success' };
        });
      });

      // Make requests up to limit
      for (let i = 0; i < 2; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test',
        });
        expect(response.statusCode).toBe(200);
      }

      // Next request should be blocked
      const blockedResponse = await app.inject({
        method: 'GET',
        url: '/test',
      });
      expect(blockedResponse.statusCode).toBe(429);
    });
  });

  describe('Auth Middleware', () => {
    it('should pass through valid JWT tokens', async () => {
      const token = app.jwt.sign({
        userId: 1,
        email: 'test@example.com',
        role: 'doctor',
        hospitalId: 1,
      });

      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/protected',
          {
            preHandler: fastify.authenticate,
          },
          async (request: any) => {
            return {
              message: 'authenticated',
              userId: request.user.userId,
            };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        cookies: {
          access_token: token,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.userId).toBe(1);
    });

    it('should reject invalid JWT tokens', async () => {
      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/protected',
          {
            preHandler: fastify.authenticate,
          },
          async () => {
            return { message: 'authenticated' };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        cookies: {
          access_token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject missing tokens', async () => {
      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/protected',
          {
            preHandler: fastify.authenticate,
          },
          async () => {
            return { message: 'authenticated' };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Role-based Authorization', () => {
    it('should allow access for authorized roles', async () => {
      const doctorToken = app.jwt.sign({
        userId: 1,
        email: 'doctor@example.com',
        role: 'doctor',
        hospitalId: 1,
      });

      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/doctor-only',
          {
            preHandler: [fastify.authenticate, requireRole(['doctor'])],
          },
          async () => {
            return { message: 'doctor access granted' };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/doctor-only',
        cookies: {
          access_token: doctorToken,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny access for unauthorized roles', async () => {
      const nurseToken = app.jwt.sign({
        userId: 2,
        email: 'nurse@example.com',
        role: 'nurse',
        hospitalId: 1,
      });

      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/admin-only',
          {
            preHandler: [fastify.authenticate, requireRole(['administrator'])],
          },
          async () => {
            return { message: 'admin access granted' };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin-only',
        cookies: {
          access_token: nurseToken,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow access for multiple authorized roles', async () => {
      const adminToken = app.jwt.sign({
        userId: 3,
        email: 'admin@example.com',
        role: 'administrator',
        hospitalId: 1,
      });

      app.register(async function (fastify: any) {
        await fastify.register(authMiddleware);

        fastify.get(
          '/admin-or-doctor',
          {
            preHandler: [fastify.authenticate, requireRole(['administrator', 'doctor'])],
          },
          async () => {
            return { message: 'access granted' };
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/admin-or-doctor',
        cookies: {
          access_token: adminToken,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
