import type { FastifyInstance } from 'fastify';
import { loginSchema, changePasswordSchema } from '../schemas/auth.js';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware, blacklistToken } from '../middleware/auth.js';
import { authRateLimit, refreshRateLimit } from '../middleware/rateLimit.js';
import { recordSuccessfulLogin, recordFailedLogin } from '../middleware/security.js';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login
  fastify.post('/login', { preHandler: [authRateLimit] }, async (request, reply) => {
      // Validate input using Zod at runtime (avoid passing Zod directly to Fastify schema)
  let email: string;
  let password: string;
  const ip = request.ip || 'unknown';
      try {
        const parsed = loginSchema.parse(request.body);
        ({ email, password } = parsed as { email: string; password: string });
      const ip = request.ip || 'unknown';

      } catch (zodError) {
        // Zod validation error
        fastify.log.warn({ error: zodError }, 'Validation failed for /auth/login');
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Dados inválidos' });
      }

      try {
        const ip = request.ip || 'unknown';
        const user = await authService.authenticateUser(email, password);

        if (!user) {
          await recordFailedLogin(ip);
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Email ou senha inválidos',
          });
        }

        await recordSuccessfulLogin(ip);

        // Gerar tokens
        const accessToken = fastify.jwt.sign(user, { expiresIn: '15m' });
        const refreshToken = fastify.jwt.sign({ userId: user.userId }, { expiresIn: '7d' });

        // Armazenar refresh token no Redis
        await fastify.redis.set(
          `refresh_token:${user.userId}`,
          refreshToken,
          'EX',
          7 * 24 * 60 * 60
        ); // 7 dias

        // Definir cookies seguros
        reply
          .setCookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutos
          })
          .setCookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
          });

        // Log de login bem-sucedido
        fastify.log.info(
          {
            level: 'LOGIN_SUCCESS',
            userId: user.userId,
            email: user.email,
            ip,
            userAgent: request.headers['user-agent'],
          },
          'User logged in successfully'
        );

        return {
          message: 'Login realizado com sucesso',
          user: {
            id: user.userId,
            email: user.email,
            role: user.role,
            hospitalId: user.hospitalId,
          },
        };
      } catch (error) {
        await recordFailedLogin(ip);
        fastify.log.error(error);
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Erro interno do servidor',
        });
      }
    }
  );

  // POST /auth/refresh
  fastify.post(
    '/refresh',
    {
      preHandler: [refreshRateLimit],
    },
    async (request, reply) => {
      try {
        const refreshToken = request.cookies.refreshToken;

        if (!refreshToken) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Token de refresh não encontrado',
          });
        }

        // Verificar token
        const decoded = fastify.jwt.verify(refreshToken) as { userId: number };

        // Verificar se o token ainda está válido no Redis
        const storedToken = await fastify.redis.get(`refresh_token:${decoded.userId}`);

        if (storedToken !== refreshToken) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Token de refresh inválido',
          });
        }

        // Buscar dados atualizados do usuário por ID
        const user = await authService.getUserById(decoded.userId);

        if (!user) {
          // Remove token inválido do Redis
          await fastify.redis.del(`refresh_token:${decoded.userId}`);
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Usuário não encontrado',
          });
        }

        // Gerar novos tokens
        const newAccessToken = fastify.jwt.sign(user, { expiresIn: '15m' });
        const newRefreshToken = fastify.jwt.sign({ userId: user.userId }, { expiresIn: '7d' });

        // Atualizar refresh token no Redis
        await fastify.redis.del(`refresh_token:${decoded.userId}`);
        await fastify.redis.set(
          `refresh_token:${user.userId}`,
          newRefreshToken,
          'EX',
          7 * 24 * 60 * 60
        );

        // Definir novos cookies
        reply
          .setCookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
          })
          .setCookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });

        // Log de refresh bem-sucedido
        fastify.log.info(
          {
            level: 'REFRESH_SUCCESS',
            userId: user.userId,
            email: user.email,
            ip: request.ip,
          },
          'Token refreshed successfully'
        );

        return { message: 'Tokens atualizados com sucesso' };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token de refresh inválido',
        });
      }
    }
  );

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const accessToken = request.cookies.accessToken;
      const refreshToken = request.cookies.refreshToken;

      // Adicionar access token à blacklist se existir
      if (accessToken) {
        blacklistToken(accessToken);
      }

      // Remover refresh token do Redis se existir
      if (refreshToken) {
        try {
          const decoded = fastify.jwt.verify(refreshToken) as { userId: number };
          await fastify.redis.del(`refresh_token:${decoded.userId}`);

          // Log de logout
          fastify.log.info(
            {
              level: 'LOGOUT_SUCCESS',
              userId: decoded.userId,
              ip: request.ip,
            },
            'User logged out successfully'
          );
        } catch (jwtError) {
          // Token inválido, mas ainda assim limpar cookies
          fastify.log.warn('Invalid refresh token during logout');
        }
      }

      // Limpar cookies
      reply
        .clearCookie('accessToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        })
        .clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

      return { message: 'Logout realizado com sucesso' };
    } catch (error) {
      fastify.log.error(error);

      // Mesmo com erro, limpar cookies
      reply.clearCookie('accessToken').clearCookie('refreshToken');

      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Erro durante logout, mas sessão foi limpa',
      });
    }
  });

  // GET /auth/validate - Validar sessão atual
  fastify.get(
    '/validate',
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      // Se chegou até aqui, o token é válido (middleware já validou)
      const user = request.currentUser!;

      return {
        valid: true,
        user: {
          id: user.userId,
          email: user.email,
          role: user.role,
          hospitalId: user.hospitalId,
        },
      };
    }
  );

  // POST /auth/change-password - Alterar senha
  fastify.post(
    '/change-password',
    {
      preHandler: [authMiddleware],
      // Validate with Zod at runtime to avoid passing Zod directly to Fastify
    },
    async (request, reply) => {
      let currentPassword: string;
      let newPassword: string;
      let user = request.currentUser!;
      try {
        const parsed = changePasswordSchema.parse(request.body);
        ({ currentPassword, newPassword } = parsed as {
          currentPassword: string;
          newPassword: string;
        });
      } catch (zodError) {
        fastify.log.warn({ error: zodError }, 'Validation failed for /auth/change-password');
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Dados inválidos' });
      }

      try {
        // Validar força da nova senha
        const passwordValidation = authService.validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Nova senha não atende aos critérios de segurança',
            details: passwordValidation.errors,
          });
        }

        // Alterar senha
        const success = await authService.changePassword(user.userId, currentPassword, newPassword);

        if (!success) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Senha atual incorreta',
          });
        }

        // Log de mudança de senha
        fastify.log.info(
          {
            level: 'PASSWORD_CHANGED',
            userId: user.userId,
            email: user.email,
            ip: request.ip,
          },
          'User changed password successfully'
        );

        // Invalidar todas as sessões ativas do usuário
        await fastify.redis.del(`refresh_token:${user.userId}`);
        if (request.cookies.accessToken) {
          blacklistToken(request.cookies.accessToken);
        }

        // Limpar cookies para forçar novo login
        reply.clearCookie('accessToken').clearCookie('refreshToken');

        return {
          message: 'Senha alterada com sucesso. Faça login novamente.',
          requireReauth: true,
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Erro interno do servidor',
        });
      }
    }
  );
}
