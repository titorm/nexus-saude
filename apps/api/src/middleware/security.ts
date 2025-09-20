import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware de segurança que adiciona headers de proteção
 */
export async function securityHeaders(request: FastifyRequest, reply: FastifyReply) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Permite React em dev
    "style-src 'self' 'unsafe-inline'", // Permite CSS inline
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  // Headers de segurança
  reply.headers({
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (Feature Policy)
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=()',
      'ambient-light-sensor=()',
      'accelerometer=()',
      'vr=()',
      'midi=()',
    ].join(', '),

    // Content Security Policy
    'Content-Security-Policy': cspDirectives.join('; '),

    // Strict Transport Security (apenas em produção)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),

    // Remove headers que podem vazar informações
    'X-Powered-By': undefined,
    Server: undefined,
  });
}

/**
 * Middleware para sanitização de dados de entrada
 */
export async function sanitizeInput(request: FastifyRequest, reply: FastifyReply) {
  // Sanitizar body se existir
  if (request.body && typeof request.body === 'object') {
    request.body = sanitizeObject(request.body);
  }

  // Sanitizar query parameters
  if (request.query && typeof request.query === 'object') {
    request.query = sanitizeObject(request.query);
  }
}

/**
 * Sanitiza recursivamente um objeto removendo potenciais payloads XSS
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitiza uma string removendo caracteres perigosos
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  return (
    str
      // Remove tags HTML básicos
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')

      // Remove eventos JavaScript
      .replace(/on\w+\s*=/gi, '')

      // Remove javascript: URIs
      .replace(/javascript:/gi, '')

      // Remove data URIs suspeitos
      .replace(/data:\s*text\/html/gi, '')

      // Escape caracteres especiais mais comuns
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
      })
  );
}

/**
 * Middleware para logar tentativas de acesso suspeitas
 */
export async function auditLogger(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();

  // Log da request
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    referer: request.headers.referer,
    user: (request as any).currentUser?.email || 'anonymous',
  };

  // Log requests suspeitas
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /union.*select/i, // SQL Injection
    /<script/i, // XSS
    /eval\(/i, // Code injection
    /document\.cookie/i, // Cookie stealing
  ];

  const isSuspicious = suspiciousPatterns.some(
    (pattern) =>
      pattern.test(request.url) || (request.body && pattern.test(JSON.stringify(request.body)))
  );

  if (isSuspicious) {
    request.log.warn(
      {
        ...logData,
        level: 'SECURITY_ALERT',
        type: 'SUSPICIOUS_REQUEST',
        body: request.body,
      },
      'Suspicious request detected'
    );
  }

  // Aguardar resposta e logar resultado
  const originalSend = reply.send;
  reply.send = function (payload) {
    const duration = Date.now() - startTime;

    request.log.info({
      ...logData,
      statusCode: reply.statusCode,
      duration,
      level: 'ACCESS_LOG',
    });

    return originalSend.call(this, payload);
  };
}

/**
 * Middleware para detectar e bloquear tentativas de força bruta
 */
export async function bruteForcePrevention(request: FastifyRequest, reply: FastifyReply) {
  // Só aplicar em endpoints de autenticação
  if (!request.url.includes('/auth/login')) {
    return;
  }

  const ip = request.ip || 'unknown';
  const failedAttempts = await getFailedAttempts(ip);

  // Se muitas tentativas falharam, bloquear temporariamente
  if (failedAttempts >= 10) {
    const blockedUntil = await getBlockedUntil(ip);

    if (blockedUntil && Date.now() < blockedUntil) {
      const retryAfter = Math.ceil((blockedUntil - Date.now()) / 1000);

      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'IP temporariamente bloqueado devido a muitas tentativas de login falhadas.',
        retryAfter,
      });
    }
  }
}

// Cache simples para tentativas de força bruta (em produção, usar Redis)
const bruteForceCache = new Map<string, { attempts: number; blockedUntil?: number }>();

async function getFailedAttempts(ip: string): Promise<number> {
  const entry = bruteForceCache.get(ip);
  return entry?.attempts || 0;
}

async function getBlockedUntil(ip: string): Promise<number | null> {
  const entry = bruteForceCache.get(ip);
  return entry?.blockedUntil || null;
}

export async function recordFailedLogin(ip: string) {
  const entry = bruteForceCache.get(ip) || { attempts: 0 };
  entry.attempts++;

  // Bloquear por 30 minutos após 10 tentativas
  if (entry.attempts >= 10) {
    entry.blockedUntil = Date.now() + 30 * 60 * 1000;
  }

  bruteForceCache.set(ip, entry);
}

export async function recordSuccessfulLogin(ip: string) {
  // Reset contador em login bem-sucedido
  bruteForceCache.delete(ip);
}
