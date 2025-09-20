import {
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Calendar,
  Edit,
  Printer,
  Download,
} from 'lucide-react';
import type { Patient } from '../../types/patient';
import { formatCPF, formatPhone, calculateAge, getInitials } from '../../utils/patients';

interface PatientHeaderProps {
  patient: Patient;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export function PatientHeader({
  patient,
  onEdit,
  onPrint,
  onExport,
  isLoading = false,
}: PatientHeaderProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded w-32" />
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-9 bg-gray-200 rounded w-20" />
            <div className="h-9 bg-gray-200 rounded w-20" />
            <div className="h-9 bg-gray-200 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  const patientAge = calculateAge(patient.birthDate);
  const hasAllergies = patient.medicalInfo?.allergies && patient.medicalInfo.allergies.length > 0;
  const hasCriticalInfo = hasAllergies || patient.medicalInfo?.chronicConditions?.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-start space-x-6">
        {/* Avatar do Paciente */}
        <div className="relative">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold flex-shrink-0">
            {getInitials(patient.name)}
          </div>

          {/* Status Badge */}
          <div
            className={`
            absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center
            ${patient.isActive ? 'bg-green-500' : 'bg-gray-400'}
          `}
          >
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </div>

        {/* Informações Principais */}
        <div className="flex-1 min-w-0">
          {/* Nome e Status */}
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{patient.name}</h1>
            <span
              className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${patient.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            `}
            >
              {patient.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {/* Informações Críticas (Alergias, etc.) */}
          {hasCriticalInfo && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Informações Críticas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasAllergies && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Alergias: {patient.medicalInfo.allergies!.join(', ')}
                  </div>
                )}
                {patient.medicalInfo?.chronicConditions?.map((condition, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                  >
                    {condition}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações de Contato e Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
            {/* Idade */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{patientAge} anos</span>
            </div>

            {/* CPF */}
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>{formatCPF(patient.cpf)}</span>
            </div>

            {/* Telefone */}
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{formatPhone(patient.phone)}</span>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{patient.email}</span>
            </div>
          </div>

          {/* Endereço Completo */}
          <div className="mt-4 flex items-start space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span>
              {patient.address.street}, {patient.address.number}
              {patient.address.complement && `, ${patient.address.complement}`} -{' '}
              {patient.address.district}, {patient.address.city}/{patient.address.state}
            </span>
          </div>

          {/* Informações Médicas Básicas */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Tipo Sanguíneo */}
            {patient.medicalInfo?.bloodType && (
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">Tipo Sanguíneo:</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                  {patient.medicalInfo.bloodType}
                </span>
              </div>
            )}

            {/* Medicações Atuais */}
            {patient.medicalInfo?.medications && patient.medicalInfo.medications.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">Medicações:</span>
                <span className="text-gray-600">
                  {patient.medicalInfo.medications.length} ativa
                  {patient.medicalInfo.medications.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Contato de Emergência */}
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">Emergência:</span>
              <span className="text-gray-600">
                {patient.emergencyContact.name} ({formatPhone(patient.emergencyContact.phone)})
              </span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col space-y-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
