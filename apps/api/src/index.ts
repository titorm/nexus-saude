import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import redis from '@fastify/redis';
import { authRoutes } from './routes/auth.js';
import { securityHeaders, sanitizeInput, auditLogger } from './middleware/security.js';
import { generalRateLimit } from './middleware/rateLimit.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function setupServer() {
  // Middleware de segurança global
  await fastify.addHook('onRequest', securityHeaders);
  await fastify.addHook('onRequest', sanitizeInput);
  await fastify.addHook('onRequest', auditLogger);

  // Rate limiting geral
  await fastify.addHook('onRequest', generalRateLimit);

  // Registrar plugins essenciais
  await fastify.register(cors, {
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://nexus-saude.vercel.app']
        : ['http://localhost:3000'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'default-secret-change-in-production',
    parseOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });

  await fastify.register(jwt, {
    secret: {
      private: process.env.JWT_ACCESS_SECRET!,
      public: process.env.JWT_ACCESS_SECRET!,
    },
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  await fastify.register(redis, {
    url: process.env.REDIS_URL!,
  });

  // Registrar rotas
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

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

// Start server
const start = async () => {
  try {
    await setupServer();

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Server is running on http://${host}:${port}`);
    fastify.log.info(`📊 Health check available at http://${host}:${port}/health`);
    fastify.log.info(`🔐 Auth endpoints at http://${host}:${port}/api/v1/auth`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
