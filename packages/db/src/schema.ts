// Tipos de dados do Nexus Saúde
// Este arquivo contém apenas as tipagens, sem dependências do Drizzle

// Enums de tipos do sistema
export type UserRole = 'doctor' | 'administrator' | 'nurse';
export type NoteType = 'progress' | 'prescription' | 'admission' | 'discharge';

// Tipos das entidades principais
export interface Hospital {
  id: number;
  name: string;
  createdAt: Date;
}

export interface NewHospital {
  name: string;
  createdAt?: Date;
}

export interface User {
  id: number;
  email: string;
  hashedPassword: string;
  role: UserRole;
  hospitalId: number;
}

export interface NewUser {
  email: string;
  hashedPassword: string;
  role?: UserRole;
  hospitalId: number;
}

export interface Patient {
  id: number;
  fullName: string;
  dateOfBirth: Date;
  hospitalId: number;
}

export interface NewPatient {
  fullName: string;
  dateOfBirth: Date;
  hospitalId: number;
}

export interface ClinicalNote {
  id: number;
  content: string;
  type: NoteType;
  patientId: number;
  authorId: number;
  signedAt: Date;
}

export interface NewClinicalNote {
  content: string;
  type?: NoteType;
  patientId: number;
  authorId: number;
  signedAt?: Date;
}

// Tipos derivados para APIs e validações
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  hospitalId: number;
}

export interface PatientTimeline {
  patient: Patient;
  notes: ClinicalNote[];
}

// Tipos para requests e responses
export interface CreateNoteRequest {
  content: string;
  type?: NoteType;
  patientId: number;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  limit: number;
}
