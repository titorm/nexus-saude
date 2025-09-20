import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/index';
import { users, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Search Security Middleware
 *
 * Provides authentication, authorization, rate limiting, and audit logging
 * for all search-related endpoints in the Advanced Search System.
 */

// Types for request context
export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
  hospitalId: number;
  permissions: string[];
}

export interface SearchContext {
  user: AuthenticatedUser;
  hospitalId: number;
  ipAddress: string;
  userAgent: string;
}

// Extend Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    searchContext?: SearchContext;
  }
}

// Input sanitization schemas
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long')
    .refine((query) => !containsSqlInjection(query), 'Invalid characters detected')
    .refine((query) => !containsXSS(query), 'Invalid content detected'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  entityTypes: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'critical']).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).optional(),
});

export const autocompleteQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Query must be at least 2 characters')
    .max(100, 'Query too long')
    .refine((query) => !containsSqlInjection(query), 'Invalid characters detected'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .optional()
    .default(10),
  types: z.array(z.enum(['patient', 'clinical_note', 'appointment'])).optional(),
});

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security validation functions
function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\'|\"|;|--|\*|\+|\^|\|)/,
    /(OR\s+1\s*=\s*1|AND\s+1\s*=\s*1)/i,
    /(UNION\s+SELECT)/i,
    /(\/\*|\*\/)/,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Authentication Middleware
 * Validates JWT token and loads user context
 */
export async function authenticateSearch(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token (implement according to your JWT strategy)
    const decoded = await verifyJwtToken(token);

    if (!decoded || !decoded.userId) {
      return reply.status(401).send({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    // Load user from database
    const db = await getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        hospitalId: users.hospitalId,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Get user permissions based on role
    const permissions = await getUserPermissions(user.role);

    // Check if user has search permissions
    if (!permissions.includes('search:read')) {
      return reply.status(403).send({
        error: 'Insufficient permissions for search operations',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // Add search context to request
    request.searchContext = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hospitalId: user.hospitalId,
        permissions,
      },
      hospitalId: user.hospitalId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return reply.status(500).send({
      error: 'Authentication service error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Authorization Middleware
 * Validates specific search permissions
 */
export async function authorizeSearch(requiredPermission: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const context = request.searchContext;

    if (!context) {
      return reply.status(401).send({
        error: 'Authentication context missing',
        code: 'AUTH_CONTEXT_MISSING',
      });
    }

    if (!context.user.permissions.includes(requiredPermission)) {
      return reply.status(403).send({
        error: `Permission required: ${requiredPermission}`,
        code: 'PERMISSION_DENIED',
      });
    }

    // Log permission check
    await logSearchActivity(context, 'permission_check', {
      permission: requiredPermission,
      granted: true,
    });
  };
}

/**
 * Rate Limiting Middleware
 * Prevents abuse of search endpoints
 */
export async function rateLimitSearch(
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const context = request.searchContext;

    if (!context) {
      return reply.status(401).send({
        error: 'Authentication required for rate limiting',
        code: 'AUTH_REQUIRED',
      });
    }

    const key = `search_rate_limit:${context.user.id}`;
    const now = Date.now();

    let rateLimit = rateLimitStore.get(key);

    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimit = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    rateLimit.count++;
    rateLimitStore.set(key, rateLimit);

    if (rateLimit.count > maxRequests) {
      await logSearchActivity(context, 'rate_limit_exceeded', {
        maxRequests,
        currentCount: rateLimit.count,
        windowMs,
      });

      return reply.status(429).send({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
      });
    }

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests.toString());
    reply.header('X-RateLimit-Remaining', (maxRequests - rateLimit.count).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
  };
}

/**
 * Input Validation Middleware
 * Sanitizes and validates search input
 */
export function validateSearchInput(schema: z.ZodSchema) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const validationResult = schema.safeParse(request.body);

      if (!validationResult.success) {
        await logSearchActivity(request.searchContext, 'validation_error', {
          errors: validationResult.error.issues,
          input: request.body,
        });

        return reply.status(400).send({
          error: 'Invalid input parameters',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.issues,
        });
      }

      // Replace request body with validated data
      request.body = validationResult.data;
    } catch (error: any) {
      console.error('Input validation error:', error);
      return reply.status(500).send({
        error: 'Validation service error',
        code: 'VALIDATION_ERROR',
      });
    }
  };
}

/**
 * Hospital Data Isolation Middleware
 * Ensures users only access their hospital's data
 */
export async function enforceHospitalIsolation(request: FastifyRequest, reply: FastifyReply) {
  const context = request.searchContext;

  if (!context) {
    return reply.status(401).send({
      error: 'Authentication context required',
      code: 'AUTH_REQUIRED',
    });
  }

  // Add hospital filter to query context
  // This will be used by the search service to filter results
  const body = request.body as any;
  request.body = {
    ...body,
    hospitalId: context.hospitalId,
  };

  await logSearchActivity(context, 'hospital_isolation_applied', {
    hospitalId: context.hospitalId,
  });
}

/**
 * Search Audit Logging
 * Logs all search activities for security monitoring
 */
export async function logSearchActivity(
  context: SearchContext | undefined,
  action: string,
  details: any = {}
) {
  if (!context) {
    return;
  }

  try {
    const db = await getDb();
    await db.insert(auditLogs).values({
      userId: context.user.id,
      action: `search:${action}`,
      entityType: 'search',
      entityId: null,
      details: JSON.stringify({
        ...details,
        hospitalId: context.hospitalId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString(),
      }),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      hospitalId: context.hospitalId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log search activity:', error);
  }
}

/**
 * Helper Functions
 */

// Mock JWT verification - implement according to your JWT strategy
async function verifyJwtToken(token: string): Promise<{ userId: number } | null> {
  try {
    // This should integrate with your actual JWT verification logic
    // For example, using jsonwebtoken library:
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded;

    // Mock implementation for development
    if (token === 'mock-valid-token') {
      return { userId: 1 };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Get user permissions based on role
async function getUserPermissions(role: string): Promise<string[]> {
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'search:read',
      'search:advanced',
      'search:analytics',
      'search:history',
      'search:manage',
    ],
    doctor: ['search:read', 'search:advanced', 'search:history'],
    nurse: ['search:read', 'search:history'],
    receptionist: ['search:read'],
    viewer: ['search:read'],
  };

  return rolePermissions[role] || ['search:read'];
}

// Security headers middleware
export async function addSecurityHeaders(request: FastifyRequest, reply: FastifyReply) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'");
}

// Export middleware composition helpers
export function searchSecurityMiddleware(
  options: {
    requiredPermission?: string;
    maxRequests?: number;
    windowMs?: number;
    validationSchema?: z.ZodSchema;
  } = {}
) {
  return {
    authenticate: authenticateSearch,
    authorize: options.requiredPermission ? authorizeSearch(options.requiredPermission) : null,
    rateLimit: rateLimitSearch(options.maxRequests, options.windowMs),
    validate: options.validationSchema ? validateSearchInput(options.validationSchema) : null,
    enforceIsolation: enforceHospitalIsolation,
    securityHeaders: addSecurityHeaders,
  };
}
