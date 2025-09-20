import type { Patient } from '../types/patient';
import type { ClinicalNote } from '../types/clinicalNotes';

export const mockPatient: Patient = {
  id: 1,
  hospitalId: 1,
  name: 'João Silva',
  cpf: '123.456.789-00',
  birthDate: '1985-06-15',
  age: 38,
  phone: '(11) 99999-9999',
  email: 'joao.silva@example.com',
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
  },
  emergencyContact: {
    name: 'Maria Silva',
    relationship: 'Esposa',
    phone: '(11) 88888-8888',
  },
  medicalInfo: {
    bloodType: 'A+',
    allergies: ['Penicilina'],
    chronicConditions: ['Diabetes'],
    medications: ['Metformina 500mg'],
  },
  isActive: true,
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
};

export const mockClinicalNote: ClinicalNote = {
  id: 1,
  patientId: 1,
  authorId: 1,
  hospitalId: 1,
  type: 'consultation',
  title: 'Consulta de Rotina',
  content: 'Paciente apresenta bom estado geral. Pressão arterial controlada.',
  priority: 'normal',
  symptoms: ['Dor de cabeça leve'],
  medications: ['Paracetamol 500mg'],
  vitalSigns: {
    bloodPressure: {
      systolic: 120,
      diastolic: 80,
    },
    heartRate: 72,
    temperature: 36.5,
  },
  attachments: [],
  tags: ['rotina'],
  isPrivate: false,
  version: 1,
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  author: {
    id: 1,
    name: 'Dr. Carlos Santos',
    specialty: 'Clínico Geral',
  },
};

export const mockClinicalNotes: ClinicalNote[] = [
  mockClinicalNote,
  {
    ...mockClinicalNote,
    id: 2,
    type: 'examination',
    title: 'Exame Físico',
    content: 'Exame físico detalhado sem alterações significativas.',
    priority: 'low',
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-02T10:00:00Z',
  },
];

export const mockPatientsResponse = {
  data: [mockPatient],
  pagination: {
    page: 1,
    limit: 12,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

export const mockClinicalNotesResponse = {
  data: mockClinicalNotes,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};
