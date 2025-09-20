import { Fragment, useMemo } from 'react';
import {
  User,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Heart,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/services/search.service';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  query: string;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
}

interface GroupedResults {
  patients: SearchResult[];
  clinical_notes: SearchResult[];
  appointments: SearchResult[];
}

export function SearchResults({
  results,
  isLoading,
  query,
  onResultClick,
  className,
}: SearchResultsProps) {
  const groupedResults = useMemo<GroupedResults>(() => {
    return results.reduce(
      (groups, result) => {
        if (!groups[result.entityType as keyof GroupedResults]) {
          groups[result.entityType as keyof GroupedResults] = [];
        }
        groups[result.entityType as keyof GroupedResults].push(result);
        return groups;
      },
      {
        patients: [],
        clinical_notes: [],
        appointments: [],
      } as GroupedResults
    );
  }, [results]);

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
      case 'no_show':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Timer className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600';
      case 'confirmed':
        return 'text-green-600';
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
      case 'no_show':
        return 'text-red-600';
      case 'in_progress':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-gray-600';
      case 'normal':
        return 'text-blue-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      case 'critical':
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  const renderPatientResult = (result: SearchResult) => (
    <div
      key={result.id}
      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onResultClick?.(result)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <User className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {highlightText(result.metadata?.name || 'Paciente', query)}
            </h3>
            <div className="mt-1 space-y-1">
              {result.metadata?.cpf && (
                <p className="text-xs text-gray-600">
                  CPF: {highlightText(result.metadata.cpf, query)}
                </p>
              )}
              {result.metadata?.phone && (
                <div className="flex items-center text-xs text-gray-600">
                  <Phone className="w-3 h-3 mr-1" />
                  {highlightText(result.metadata.phone, query)}
                </div>
              )}
              {result.metadata?.email && (
                <div className="flex items-center text-xs text-gray-600">
                  <Mail className="w-3 h-3 mr-1" />
                  {highlightText(result.metadata.email, query)}
                </div>
              )}
              {result.metadata?.birth_date && (
                <p className="text-xs text-gray-600">
                  Nascimento: {formatDate(result.metadata.birth_date)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="primary" size="sm">
            Score: {result.relevanceScore.toFixed(2)}
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const renderClinicalNoteResult = (result: SearchResult) => (
    <div
      key={result.id}
      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onResultClick?.(result)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <FileText className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {highlightText(result.metadata?.title || 'Prontuário Médico', query)}
            </h3>
            <div className="mt-1 space-y-1">
              {result.metadata?.patient_name && (
                <p className="text-xs text-gray-600">
                  Paciente: {highlightText(result.metadata.patient_name, query)}
                </p>
              )}
              {result.metadata?.doctor_name && (
                <p className="text-xs text-gray-600">
                  Médico: {highlightText(result.metadata.doctor_name, query)}
                </p>
              )}
              {result.metadata?.note_type && (
                <Badge variant="secondary" size="sm">
                  {result.metadata.note_type}
                </Badge>
              )}
              {result.metadata?.created_at && (
                <p className="text-xs text-gray-600">
                  Criado em: {formatDate(result.metadata.created_at)}
                </p>
              )}
            </div>
            {result.content && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                {highlightText(result.content.substring(0, 200) + '...', query)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="primary" size="sm">
            Score: {result.relevanceScore.toFixed(2)}
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const renderAppointmentResult = (result: SearchResult) => (
    <div
      key={result.id}
      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onResultClick?.(result)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {highlightText(result.metadata?.title || 'Consulta Médica', query)}
            </h3>
            <div className="mt-1 space-y-1">
              {result.metadata?.patient_name && (
                <p className="text-xs text-gray-600">
                  Paciente: {highlightText(result.metadata.patient_name, query)}
                </p>
              )}
              {result.metadata?.doctor_name && (
                <p className="text-xs text-gray-600">
                  Médico: {highlightText(result.metadata.doctor_name, query)}
                </p>
              )}
              {result.metadata?.scheduled_at && (
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(result.metadata.scheduled_at)}
                </div>
              )}
              {result.metadata?.location && (
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="w-3 h-3 mr-1" />
                  {highlightText(result.metadata.location, query)}
                </div>
              )}
              <div className="flex items-center space-x-2 mt-2">
                {result.metadata?.status && (
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(result.metadata.status)}
                    <span className={cn('text-xs', getStatusColor(result.metadata.status))}>
                      {result.metadata.status}
                    </span>
                  </div>
                )}
                {result.metadata?.priority && (
                  <Badge
                    variant="warning"
                    size="sm"
                    className={getPriorityColor(result.metadata.priority)}
                  >
                    {result.metadata.priority}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="primary" size="sm">
            Score: {result.relevanceScore.toFixed(2)}
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  const renderResultGroup = (
    title: string,
    icon: React.ReactNode,
    results: SearchResult[],
    renderFn: (result: SearchResult) => React.ReactNode
  ) => {
    if (results.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Badge variant="secondary" size="sm">
            {results.length}
          </Badge>
        </div>
        <div className="space-y-2">{results.map(renderFn)}</div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
        <p className="text-gray-600">Tente ajustar os termos de busca ou remover alguns filtros.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado
            {results.length !== 1 ? 's' : ''}
          </span>
          {query && (
            <span className="text-sm text-gray-600">
              para "<strong>{query}</strong>"
            </span>
          )}
        </div>
      </div>

      {/* Results by Category */}
      {renderResultGroup(
        'Pacientes',
        <User className="w-5 h-5 text-blue-500" />,
        groupedResults.patients,
        renderPatientResult
      )}

      {renderResultGroup(
        'Prontuários',
        <FileText className="w-5 h-5 text-green-500" />,
        groupedResults.clinical_notes,
        renderClinicalNoteResult
      )}

      {renderResultGroup(
        'Consultas',
        <Calendar className="w-5 h-5 text-purple-500" />,
        groupedResults.appointments,
        renderAppointmentResult
      )}
    </div>
  );
}
