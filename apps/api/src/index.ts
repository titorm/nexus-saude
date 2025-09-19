import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import redis from '@fastify/redis';
import { authRoutes } from './routes/auth.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Registrar plugins essenciais
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
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

// Rota de erro para demonstrar tratamento de erros
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;
  
  fastify.log.error(error);
  
  reply.status(statusCode).send({
    statusCode,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server is running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();