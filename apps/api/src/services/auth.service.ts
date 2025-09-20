import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'doctor' | 'administrator' | 'nurse';
  hospitalId: number;
  // Propriedades padrão do JWT
  iat?: number; // issued at
  exp?: number; // expires at
  sub?: string; // subject
}

export class AuthService {
  /**
   * Autentica um usuário com email e senha
   */
  async authenticateUser(email: string, password: string): Promise<JWTPayload | null> {
    // Buscar usuário pelo email
    const db = await getDb();
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0) {
      return null;
    }

    const foundUser = user[0];

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, foundUser.hashedPassword);

    if (!isValidPassword) {
      return null;
    }

    // Retornar payload do JWT
    return {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      hospitalId: foundUser.hospitalId,
    };
  }

  /**
   * Cria hash da senha
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Busca um usuário por ID
   */
  async getUserById(userId: number): Promise<JWTPayload | null> {
    const db = await getDb();
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user.length === 0) {
      return null;
    }

    const foundUser = user[0];

    return {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      hospitalId: foundUser.hospitalId,
    };
  }

  /**
   * Altera a senha de um usuário
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const db = await getDb();

    // Buscar usuário atual
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user.length === 0) {
      return false;
    }

    const foundUser = user[0];

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, foundUser.hashedPassword);

    if (!isCurrentPasswordValid) {
      return false;
    }

    // Hash da nova senha
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Atualizar senha no banco
    await db.update(users).set({ hashedPassword: hashedNewPassword }).where(eq(users.id, userId));

    return true;
  }

  /**
   * Valida a força de uma senha
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Senha deve conter pelo menos um caractere especial');
    }

    // Verificar padrões comuns fracos
    const commonWeakPatterns = [/123456/, /password/i, /qwerty/i, /admin/i, /letmein/i];

    if (commonWeakPatterns.some((pattern) => pattern.test(password))) {
      errors.push('Senha muito comum, escolha uma senha mais segura');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
