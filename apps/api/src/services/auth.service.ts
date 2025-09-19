import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'doctor' | 'administrator' | 'nurse';
  hospitalId: number;
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
}
