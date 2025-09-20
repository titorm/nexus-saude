import { User, Phone, Mail, Calendar, MapPin } from 'lucide-react';
import type { Patient } from '../../types/patient';
import {
  formatCPF,
  formatPhone,
  formatDate,
  getInitials,
  getStatusColor,
  getAgeGroupColor,
  truncateText,
} from '../../utils/patients';

interface PatientCardProps {
  patient: Patient;
  onClick?: (patient: Patient) => void;
  showActions?: boolean;
  onEdit?: (patient: Patient) => void;
  onToggleStatus?: (patient: Patient) => void;
}

export function PatientCard({
  patient,
  onClick,
  showActions = false,
  onEdit,
  onToggleStatus,
}: PatientCardProps) {
  const statusColors = getStatusColor(patient.isActive);
  const ageColors = getAgeGroupColor(patient.age);

  const handleCardClick = () => {
    if (onClick) {
      onClick(patient);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(patient);
    }
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStatus) {
      onToggleStatus(patient);
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200
        ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* Header com Avatar e Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {getInitials(patient.name)}
          </div>

          {/* Nome e Info Principal */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{patient.name}</h3>
            <p className="text-sm text-gray-500">{formatCPF(patient.cpf)}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span
            className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${statusColors.badge} ${statusColors.text}
          `}
          >
            {patient.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Informações de Contato */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 text-gray-400" />
          <span className="truncate">{patient.email}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 text-gray-400" />
          <span>{formatPhone(patient.phone)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {formatDate(patient.birthDate)} ({patient.age} anos)
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="truncate">
            {patient.address.city} - {patient.address.state}
          </span>
        </div>
      </div>

      {/* Informações Médicas (se disponível) */}
      {patient.medicalInfo && (
        <div className="border-t pt-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {patient.medicalInfo.bloodType && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">
                Tipo: {patient.medicalInfo.bloodType}
              </span>
            )}

            {patient.medicalInfo.allergies && patient.medicalInfo.allergies.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700">
                Alergias: {patient.medicalInfo.allergies.length}
              </span>
            )}

            {patient.medicalInfo.chronicConditions &&
              patient.medicalInfo.chronicConditions.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                  Condições: {patient.medicalInfo.chronicConditions.length}
                </span>
              )}
          </div>
        </div>
      )}

      {/* Grupo Etário */}
      <div className="flex items-center justify-between">
        <span
          className={`
          inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
          ${ageColors.bg} ${ageColors.text}
        `}
        >
          {patient.age < 18
            ? 'Pediátrico'
            : patient.age < 40
              ? 'Jovem Adulto'
              : patient.age < 65
                ? 'Adulto'
                : 'Idoso'}
        </span>

        <div className="text-xs text-gray-500">Cadastrado em {formatDate(patient.createdAt)}</div>
      </div>

      {/* Ações (se habilitadas) */}
      {showActions && (
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Editar
          </button>

          <button
            onClick={handleToggleStatus}
            className={`
              inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                patient.isActive
                  ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500'
                  : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
              }
            `}
          >
            {patient.isActive ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      )}
    </div>
  );
}
