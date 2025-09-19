import {
  pgTable,
  text,
  varchar,
  timestamp,
  serial,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Justificativa: Enum garante a integridade referencial dos papéis no nível do banco de dados.
export const userRoleEnum = pgEnum('user_role', ['doctor', 'administrator', 'nurse']);
export const noteTypeEnum = pgEnum('note_type', [
  'progress',
  'prescription',
  'admission',
  'discharge',
]);

// Tabela de Hospitais
export const hospitals = pgTable('hospitals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de Usuários
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 256 }).notNull().unique(),
    // Justificativa: 'text' é usado em vez de 'varchar' para hashes bcrypt, que podem ter comprimentos variáveis.
    hashedPassword: text('hashed_password').notNull(),
    role: userRoleEnum('role').notNull().default('doctor'),
    hospitalId: integer('hospital_id')
      .references(() => hospitals.id)
      .notNull(),
  },
  (table) => {
    // Justificativa: Um índice no email é crucial para a performance das queries de login.
    return {
      emailIdx: index('email_idx').on(table.email),
    };
  }
);

// Tabela de Pacientes
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 256 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  hospitalId: integer('hospital_id')
    .references(() => hospitals.id)
    .notNull(),
});

// Tabela de Notas Clínicas
export const clinicalNotes = pgTable('clinical_notes', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  type: noteTypeEnum('type').notNull().default('progress'),
  // Justificativa: onDelete: 'cascade' garante que se um paciente for removido, todas as suas notas associadas também sejam, mantendo a integridade dos dados.
  patientId: integer('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: integer('author_id')
    .references(() => users.id)
    .notNull(),
  signedAt: timestamp('signed_at').defaultNow().notNull(),
});

// Tipos TypeScript inferidos do schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type NewClinicalNote = typeof clinicalNotes.$inferInsert;
export type Hospital = typeof hospitals.$inferSelect;
export type NewHospital = typeof hospitals.$inferInsert;
