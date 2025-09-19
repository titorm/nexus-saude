import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from './schema.js';

// Configuração do cliente PostgreSQL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Função para criar a conexão com postgres
async function createConnection() {
  const postgres = await import('postgres');
  // @ts-ignore - Contornando problema de tipos do postgres
  return postgres.default ? postgres.default(connectionString) : postgres(connectionString);
}

let dbInstance: any;
let clientInstance: any;

// Função para obter a instância do banco
export async function getDb() {
  if (!dbInstance) {
    clientInstance = await createConnection();
    dbInstance = drizzle(clientInstance, { schema });
  }
  return dbInstance;
}

// Função para executar migrações
export async function runMigrations() {
  try {
    const db = await getDb();
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
}

// Função para fechar a conexão
export async function closeConnection() {
  if (clientInstance) {
    await clientInstance.end();
  }
}

// Exportar tipos e schema
export * from './schema.js';
export type Database = Awaited<ReturnType<typeof getDb>>;
