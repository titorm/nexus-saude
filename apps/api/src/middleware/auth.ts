import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '../services/auth.service.js';
import { recordFailedLogin } from './security.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: JWTPayload;
  }
}

// Blacklist de tokens inválidos (em produção, usar Redis)
const tokenBlacklist = new Set<string>();

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.accessToken;
    const ip = request.ip || 'unknown';

    if (!token) {
      await recordFailedLogin(ip);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de acesso não encontrado',
      });
    }

    // Verificar se o token está na blacklist
    if (tokenBlacklist.has(token)) {
      await recordFailedLogin(ip);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de acesso revogado',
      });
    }

    // Verificar e decodificar o token
    const decoded = request.server.jwt.verify(token) as JWTPayload;

    // Validações adicionais do payload
    if (!decoded.userId || !decoded.email || !decoded.role || !decoded.hospitalId) {
      await recordFailedLogin(ip);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de acesso malformado',
      });
    }

    // Verificar se o token não está muito antigo (adicional à expiração JWT)
    const tokenAge = Date.now() - (decoded.iat || 0) * 1000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas máximo

    if (tokenAge > maxAge) {
      await recordFailedLogin(ip);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de acesso muito antigo',
      });
    }

    request.currentUser = decoded;

    // Log de acesso bem-sucedido
    request.log.info(
      {
        level: 'AUTH_SUCCESS',
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        ip,
        userAgent: request.headers['user-agent'],
      },
      'Successful authentication'
    );
  } catch (error) {
    const ip = request.ip || 'unknown';
    await recordFailedLogin(ip);

    // Log detalhado do erro
    request.log.warn(
      {
        level: 'AUTH_FAILURE',
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
        userAgent: request.headers['user-agent'],
        token: request.cookies.accessToken ? 'present' : 'missing',
      },
      'Authentication failed'
    );

    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de acesso inválido',
    });
  }
}

export async function requireRole(roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.currentUser) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
      });
    }

    if (!roles.includes(request.currentUser.role)) {
      // Log de tentativa de acesso negado
      request.log.warn(
        {
          level: 'AUTHORIZATION_DENIED',
          userId: request.currentUser.userId,
          email: request.currentUser.email,
          currentRole: request.currentUser.role,
          requiredRoles: roles,
          url: request.url,
          method: request.method,
        },
        'Access denied - insufficient permissions'
      );

      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Acesso negado - permissões insuficientes',
      });
    }

    // Log de acesso autorizado
    request.log.info(
      {
        level: 'AUTHORIZATION_SUCCESS',
        userId: request.currentUser.userId,
        email: request.currentUser.email,
        role: request.currentUser.role,
        url: request.url,
        method: request.method,
      },
      'Access granted'
    );
  };
}

/**
 * Adiciona um token à blacklist
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);

  // Limpar blacklist periodicamente para evitar vazamento de memória
  // Em produção, usar Redis com TTL automático
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
}

/**
 * Verifica se um token está na blacklist
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Middleware opcional para verificar se o usuário existe no banco
 * Útil para casos onde o usuário pode ter sido desabilitado após o login
 */
export async function verifyUserExists(request: FastifyRequest, reply: FastifyReply) {
  if (!request.currentUser) {
    return;
  }

  try {
    const { getDb } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const db = await getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, request.currentUser.userId))
      .limit(1);

    if (user.length === 0) {
      request.log.warn(
        {
          level: 'USER_NOT_FOUND',
          userId: request.currentUser.userId,
          email: request.currentUser.email,
        },
        'Token valid but user not found in database'
      );

      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Usuário não encontrado',
      });
    }

    // Verificar se o usuário está ativo (se houver campo de status)
    // const foundUser = user[0];
    // if (foundUser.status === 'inactive') { ... }
  } catch (error) {
    request.log.error(error, 'Error verifying user existence');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Erro interno do servidor',
    });
  }
}
