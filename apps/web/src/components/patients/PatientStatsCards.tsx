import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import type { PatientStats } from '../../types/patient';

interface PatientStatsCardsProps {
  stats: PatientStats;
  isLoading?: boolean;
}

export function PatientStatsCards({ stats, isLoading }: PatientStatsCardsProps) {
  const statsConfig = [
    {
      id: 'total',
      label: 'Total de Pacientes',
      value: stats.totalPatients,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      id: 'active',
      label: 'Pacientes Ativos',
      value: stats.activePatients,
      icon: UserCheck,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      id: 'inactive',
      label: 'Pacientes Inativos',
      value: stats.inactivePatients,
      icon: UserX,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      id: 'recent',
      label: 'Novos (30 dias)',
      value: stats.newPatientsThisMonth,
      icon: Clock,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => (
          <div
            key={stat.id}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mr-4`}
              >
                <div className="w-6 h-6 bg-gray-300 rounded" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2 w-20" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mr-4`}
              >
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.value.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Barra de progresso visual (opcional) */}
            {stat.id !== 'total' && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${stat.color}`}
                    style={{
                      width: `${stats.totalPatients > 0 ? (stat.value / stats.totalPatients) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalPatients > 0
                    ? ((stat.value / stats.totalPatients) * 100).toFixed(1)
                    : 0}
                  % do total
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
