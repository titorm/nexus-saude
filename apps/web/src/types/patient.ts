// Types para pacientes baseados na API backend
export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
  rg?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    chronicConditions?: string[];
  };
  hospitalId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  age: number;
}

export interface CreatePatientInput {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
  rg?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    medications?: string[];
    chronicConditions?: string[];
  };
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

export interface PatientsResponse {
  data: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PatientsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'age';
  sortOrder?: 'asc' | 'desc';
}

export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  newPatientsThisMonth: number;
  averageAge: number;
  ageGroups: {
    '0-18': number;
    '19-40': number;
    '41-65': number;
    '65+': number;
  };
  bloodTypeDistribution: Record<string, number>;
}
