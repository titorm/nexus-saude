import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: JWTPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.accessToken;

    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de acesso não encontrado',
      });
    }

    // Verificar e decodificar o token
    const decoded = request.server.jwt.verify(token) as JWTPayload;
    request.currentUser = decoded;
  } catch (error) {
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
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Acesso negado',
      });
    }
  };
}
