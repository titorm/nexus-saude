import type { FastifyInstance } from 'fastify';
import { loginSchema } from '../schemas/auth.js';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/login
  fastify.post(
    '/login',
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };

      try {
        const user = await authService.authenticateUser(email, password);

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Email ou senha inválidos',
          });
        }

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
  fastify.post('/refresh', async (request, reply) => {
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

      // Buscar dados atualizados do usuário
      const user = await authService.authenticateUser(/* seria necessário buscar por ID */ '', '');

      if (!user) {
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

      return { message: 'Tokens atualizados com sucesso' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token de refresh inválido',
      });
    }
  });

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        const decoded = fastify.jwt.verify(refreshToken) as { userId: number };
        await fastify.redis.del(`refresh_token:${decoded.userId}`);
      }

      reply.clearCookie('accessToken').clearCookie('refreshToken');

      return { message: 'Logout realizado com sucesso' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Erro interno do servidor',
      });
    }
  });
}
