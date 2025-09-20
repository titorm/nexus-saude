import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import redis from '@fastify/redis';
import { authRoutes } from './routes/auth.js';
import { patientsRoutes } from './routes/patients.js';
import { appointmentsRoutes } from './routes/appointments.js';
import searchRoutes from './routes/search.routes.js';
import { jobRoutes } from './routes/jobs.routes.js';
import { securityHeaders, sanitizeInput, auditLogger } from './middleware/security.js';
import { generalRateLimit } from './middleware/rateLimit.js';

interface AppOptions {
  logger?: boolean;
  disableRateLimit?: boolean;
}

export function build(opts: AppOptions = {}) {
  const fastify = Fastify({
    logger: opts.logger ?? false, // Desabilita logs durante testes
  });

  async function setupServer() {
    // Middleware de segurança global
    await fastify.addHook('onRequest', securityHeaders);
    await fastify.addHook('onRequest', sanitizeInput);
    await fastify.addHook('onRequest', auditLogger);

    // Rate limiting geral (desabilitado em testes se necessário)
    if (!opts.disableRateLimit) {
      await fastify.addHook('onRequest', generalRateLimit);
    }

    // Registrar plugins essenciais
    await fastify.register(cors, {
      origin: true, // Permite qualquer origem em testes
      credentials: true,
    });

    await fastify.register(cookie, {
      secret: process.env.COOKIE_SECRET || 'test-secret',
      parseOptions: {
        httpOnly: true,
        secure: false, // Desabilitado em testes
        sameSite: 'strict',
      },
    });

    await fastify.register(jwt, {
      secret: {
        private: process.env.JWT_ACCESS_SECRET || 'test-jwt-secret',
        public: process.env.JWT_ACCESS_SECRET || 'test-jwt-secret',
      },
      cookie: {
        cookieName: 'accessToken',
        signed: false,
      },
    });

    // Redis opcional para testes
    if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
      await fastify.register(redis, {
        url: process.env.REDIS_URL,
      });
    }

    // Registrar rotas
    await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
    await fastify.register(patientsRoutes, { prefix: '/api/v1/patients' });
    await fastify.register(appointmentsRoutes, { prefix: '/api/v1/appointments' });
    await fastify.register(searchRoutes, { prefix: '/api/v1/search' });
    await fastify.register(jobRoutes, { prefix: '/api/v1/jobs' });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Tratamento de erros global
    fastify.setErrorHandler((error, request, reply) => {
      const statusCode = error.statusCode || 500;

      fastify.log.error(error);

      reply.status(statusCode).send({
        statusCode,
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
      });
    });
  }

  // Setup é executado quando o app é inicializado
  fastify.register(async function (fastify) {
    await setupServer();
  });

  return fastify;
}
