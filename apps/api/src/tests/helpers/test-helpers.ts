import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../../db/schema.js';
import * as bcrypt from 'bcryptjs';
import { inArray } from 'drizzle-orm';
import { getDb } from '../../db/index.js';

interface TestUser {
  email: string;
  password: string;
  role: 'doctor' | 'administrator' | 'nurse';
  isActive?: boolean;
  hospitalId?: number;
}

interface CreatedTestUser {
  id: number;
  email: string;
  role: 'doctor' | 'administrator' | 'nurse';
  hospitalId: number;
}

/**
 * Cria um banco de dados para testes usando a conexão existente
 */
export async function createTestDatabase() {
  // Para testes, usaremos a mesma conexão do getDb()
  return await getDb();
}

/**
 * Cria um usuário de teste
 */
export async function createTestUser(db: any, userData: TestUser): Promise<CreatedTestUser> {
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  const [createdUser] = await db
    .insert(users)
    .values({
      email: userData.email,
      hashedPassword,
      role: userData.role,
      isActive: userData.isActive ?? true,
      hospitalId: userData.hospitalId ?? 1,
      fullName: `Test User ${userData.email}`,
      cpf: '123.456.789-00',
      licenseNumber: 'TEST123',
      specialization: 'General',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      hospitalId: users.hospitalId,
    });

  return createdUser;
}

/**
 * Limpa dados de teste
 */
export async function cleanupTestData(db: any, userIds: number[]) {
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

/**
 * Cria múltiplos usuários de teste
 */
export async function createMultipleTestUsers(
  db: any,
  usersData: TestUser[]
): Promise<CreatedTestUser[]> {
  const createdUsers: CreatedTestUser[] = [];

  for (const userData of usersData) {
    const user = await createTestUser(db, userData);
    createdUsers.push(user);
  }

  return createdUsers;
}
