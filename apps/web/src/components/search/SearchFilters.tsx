import { useState, useCallback } from 'react';
import { Filter, X, Calendar, User, FileText, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Dropdown, DropdownItem, DropdownHeader, DropdownSeparator } from '../ui/Dropdown';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  entityTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  status?: string;
  patientId?: number;
  doctorId?: number;
  hospitalId?: number;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

const entityTypeOptions = [
  { value: 'patient', label: 'Pacientes', icon: User },
  { value: 'clinical_note', label: 'Prontuários', icon: FileText },
  { value: 'appointment', label: 'Consultas', icon: Calendar },
];

const priorityOptions = [
  { value: 'low', label: 'Baixa', color: 'text-gray-600' },
  { value: 'normal', label: 'Normal', color: 'text-blue-600' },
  { value: 'high', label: 'Alta', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
  { value: 'critical', label: 'Crítica', color: 'text-red-800' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Agendado', color: 'text-blue-600' },
  { value: 'confirmed', label: 'Confirmado', color: 'text-green-600' },
  { value: 'in_progress', label: 'Em Andamento', color: 'text-yellow-600' },
  { value: 'completed', label: 'Concluído', color: 'text-green-600' },
  { value: 'cancelled', label: 'Cancelado', color: 'text-red-600' },
  { value: 'no_show', label: 'Falta', color: 'text-red-600' },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof SearchFilters];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '';
  });

  const activeFiltersCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) {
      return count + value.length;
    }
    return value !== undefined && value !== '' ? count + 1 : count;
  }, 0);

  const handleTempFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setTempFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleEntityTypeToggle = useCallback(
    (entityType: string) => {
      const currentTypes = tempFilters.entityTypes || [];
      const newTypes = currentTypes.includes(entityType)
        ? currentTypes.filter((type) => type !== entityType)
        : [...currentTypes, entityType];

      handleTempFilterChange('entityTypes', newTypes.length > 0 ? newTypes : undefined);
    },
    [tempFilters.entityTypes, handleTempFilterChange]
  );

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  }, [tempFilters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    const emptyFilters: SearchFilters = {};
    setTempFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onClearFilters();
    setIsOpen(false);
  }, [onFiltersChange, onClearFilters]);

  const handleCancel = useCallback(() => {
    setTempFilters(filters);
    setIsOpen(false);
  }, [filters]);

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // Convert ISO string to YYYY-MM-DD
  };

  const getEntityTypeLabel = (type: string) => {
    return entityTypeOptions.find((option) => option.value === type)?.label || type;
  };

  const getPriorityLabel = (priority: string) => {
    return priorityOptions.find((option) => option.value === priority)?.label || priority;
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find((option) => option.value === status)?.label || status;
  };

  return (
    <div className={cn('relative', className)}>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="bottom-right"
        trigger={
          <Button
            variant={hasActiveFilters ? 'primary' : 'outline'}
            size="md"
            onClick={() => setIsOpen(!isOpen)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" size="sm" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        }
      >
        <div className="w-96 p-4 space-y-4">
          {/* Entity Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipos de Conteúdo
            </label>
            <div className="space-y-2">
              {entityTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = tempFilters.entityTypes?.includes(option.value) || false;

                return (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEntityTypeToggle(option.value)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <DropdownSeparator />

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                size="sm"
                value={formatDateForInput(tempFilters.dateFrom)}
                onChange={(e) => handleTempFilterChange('dateFrom', e.target.value || undefined)}
                placeholder="Data inicial"
              />
              <Input
                type="date"
                size="sm"
                value={formatDateForInput(tempFilters.dateTo)}
                onChange={(e) => handleTempFilterChange('dateTo', e.target.value || undefined)}
                placeholder="Data final"
              />
            </div>
          </div>

          <DropdownSeparator />

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
            <select
              value={tempFilters.priority || ''}
              onChange={(e) => handleTempFilterChange('priority', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Todas as prioridades</option>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={tempFilters.status || ''}
              onChange={(e) => handleTempFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <DropdownSeparator />

          {/* Action Buttons */}
          <div className="flex justify-between space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyFilters}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </Dropdown>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filters.entityTypes?.map((type) => (
            <Badge
              key={`entity-${type}`}
              variant="primary"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                const newTypes = filters.entityTypes?.filter((t) => t !== type);
                onFiltersChange({
                  ...filters,
                  entityTypes: newTypes?.length ? newTypes : undefined,
                });
              }}
            >
              {getEntityTypeLabel(type)}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}

          {filters.priority && (
            <Badge
              variant="warning"
              size="sm"
              className="cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, priority: undefined })}
            >
              Prioridade: {getPriorityLabel(filters.priority)}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}

          {filters.status && (
            <Badge
              variant="success"
              size="sm"
              className="cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, status: undefined })}
            >
              Status: {getStatusLabel(filters.status)}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}

          {(filters.dateFrom || filters.dateTo) && (
            <Badge
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  dateFrom: undefined,
                  dateTo: undefined,
                })
              }
            >
              <Calendar className="w-3 h-3 mr-1" />
              {filters.dateFrom || 'Início'} - {filters.dateTo || 'Fim'}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
