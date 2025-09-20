import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  max: number;
  windowMs: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const key = getClientKey(request);
    const now = Date.now();

    // Limpar entradas expiradas
    cleanupExpiredEntries(now, config.windowMs);

    // Obter ou criar entrada para este cliente
    const entry = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };

    // Verificar se a janela de tempo expirou
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + config.windowMs;
    }

    // Incrementar contador
    entry.count++;
    rateLimitStore.set(key, entry);

    // Verificar se excedeu o limite
    if (entry.count > config.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      reply.headers({
        'X-RateLimit-Limit': config.max,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        'Retry-After': retryAfter,
      });

      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: config.message || 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfter,
      });
    }

    // Adicionar headers informativos
    reply.headers({
      'X-RateLimit-Limit': config.max,
      'X-RateLimit-Remaining': Math.max(0, config.max - entry.count),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    });
  };
}

// Gera chave única para o cliente (IP + User-Agent hash)
function getClientKey(request: FastifyRequest): string {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const userAgent = request.headers['user-agent'] || 'unknown';

  // Hash simples do User-Agent para reduzir tamanho da chave
  const userAgentHash = userAgent.split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
  }, 0);

  return `${ip}:${userAgentHash}`;
}

// Limpa entradas expiradas do store para evitar vazamento de memória
function cleanupExpiredEntries(now: number, windowMs: number) {
  const cutoff = now - windowMs;

  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < cutoff) {
      rateLimitStore.delete(key);
    }
  });
}

// Rate limits específicos para diferentes endpoints
export const authRateLimit = createRateLimit({
  max: 5, // 5 tentativas
  windowMs: 15 * 60 * 1000, // 15 minutos
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
});

export const refreshRateLimit = createRateLimit({
  max: 10, // 10 tentativas
  windowMs: 5 * 60 * 1000, // 5 minutos
  message: 'Muitas tentativas de refresh. Tente novamente em 5 minutos.',
});

export const generalRateLimit = createRateLimit({
  max: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // 15 minutos
  message: 'Limite de requests excedido. Tente novamente mais tarde.',
});
