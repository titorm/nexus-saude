import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Nova senha deve conter pelo menos uma letra maiúscula')
      .regex(/[a-z]/, 'Nova senha deve conter pelo menos uma letra minúscula')
      .regex(/[0-9]/, 'Nova senha deve conter pelo menos um número')
      .regex(/[^A-Za-z0-9]/, 'Nova senha deve conter pelo menos um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Confirmação de senha não confere',
    path: ['confirmPassword'],
  });

export const validateSessionSchema = z.object({
  accessToken: z.string().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type ValidateSessionRequest = z.infer<typeof validateSessionSchema>;
