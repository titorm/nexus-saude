import { Calendar, Clock, FileText, Filter, Search, ChevronDown, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ClinicalNote, NoteType, NotePriority } from '../../types/clinicalNotes';
import { groupNotesByDate, formatNoteDate, formatNoteTime } from '../../utils/clinicalNotes';
import { NOTE_TYPE_LABELS, PRIORITY_LABELS } from '../../types/clinicalNotes';

interface TimelineProps {
  notes: ClinicalNote[];
  onNoteClick?: (note: ClinicalNote) => void;
  onAddNote?: () => void;
  isLoading?: boolean;
}

interface FilterOptions {
  search: string;
  noteType: NoteType | 'all';
  priority: NotePriority | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

const priorityColors: Record<NotePriority, string> = {
  low: 'bg-blue-100 text-blue-800',
  normal: 'bg-green-100 text-green-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
  critical: 'bg-red-100 text-red-800',
};

const noteTypeColors: Record<NoteType, string> = {
  consultation: 'bg-green-100 text-green-800',
  diagnosis: 'bg-red-100 text-red-800',
  prescription: 'bg-purple-100 text-purple-800',
  examination: 'bg-blue-100 text-blue-800',
  laboratory: 'bg-orange-100 text-orange-800',
  imaging: 'bg-indigo-100 text-indigo-800',
  procedure: 'bg-pink-100 text-pink-800',
  follow_up: 'bg-teal-100 text-teal-800',
  referral: 'bg-yellow-100 text-yellow-800',
  discharge: 'bg-gray-100 text-gray-800',
  emergency: 'bg-red-100 text-red-800',
  observation: 'bg-cyan-100 text-cyan-800',
};

export function Timeline({ notes, onNoteClick, onAddNote, isLoading = false }: TimelineProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    noteType: 'all',
    priority: 'all',
    dateRange: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar e agrupar notas
  const filteredAndGroupedNotes = useMemo(() => {
    let filtered = notes;

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower) ||
          (note.author?.name && note.author.name.toLowerCase().includes(searchLower))
      );
    }

    // Filtro de tipo
    if (filters.noteType !== 'all') {
      filtered = filtered.filter((note) => note.type === filters.noteType);
    }

    // Filtro de prioridade
    if (filters.priority !== 'all') {
      filtered = filtered.filter((note) => note.priority === filters.priority);
    }

    // Filtro de data
    const now = new Date();
    if (filters.dateRange !== 'all') {
      filtered = filtered.filter((note) => {
        const noteDate = new Date(note.createdAt);
        switch (filters.dateRange) {
          case 'today':
            return noteDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return noteDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return noteDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return groupNotesByDate(filtered);
  }, [notes, filters]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }, (_, j) => (
                  <div key={j} className="flex space-x-4">
                    <div className="w-2 h-16 bg-gray-200 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header com Filtros */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Prontuário ({notes.length} nota{notes.length !== 1 ? 's' : ''})
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              <ChevronDown
                className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Nota
              </button>
            )}
          </div>
        </div>

        {/* Filtros Expandidos */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar notas..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tipo de Nota */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Nota</label>
                <select
                  value={filters.noteType}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      noteType: e.target.value as NoteType | 'all',
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os tipos</option>
                  {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      priority: e.target.value as NotePriority | 'all',
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todas as prioridades</option>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: e.target.value as FilterOptions['dateRange'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos os períodos</option>
                  <option value="today">Hoje</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mês</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-6">
        {filteredAndGroupedNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma nota encontrada</h3>
            <p className="text-gray-500 mb-4">
              {notes.length === 0
                ? 'Ainda não há notas registradas para este paciente.'
                : 'Nenhuma nota corresponde aos filtros aplicados.'}
            </p>
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Nota
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredAndGroupedNotes
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((dayGroup) => (
                <div key={dayGroup.date} className="relative">
                  {/* Data */}
                  <div className="flex items-center mb-4">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      {formatNoteDate(dayGroup.date)}
                    </h3>
                    <div className="ml-auto text-sm text-gray-500">
                      {dayGroup.notes.length} nota{dayGroup.notes.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Notas do Dia */}
                  <div className="space-y-4 relative">
                    {/* Linha Vertical */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                    {dayGroup.notes
                      .sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .map((note) => (
                        <div
                          key={note.id}
                          className="relative flex items-start space-x-4 group cursor-pointer"
                          onClick={() => onNoteClick?.(note)}
                        >
                          {/* Indicador */}
                          <div
                            className={`
                            relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                            ${priorityColors[note.priority]} border-2 border-white shadow-sm
                          `}
                          >
                            <div className="w-2 h-2 bg-current rounded-full" />
                          </div>

                          {/* Conteúdo da Nota */}
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="bg-gray-50 rounded-lg p-4 group-hover:bg-gray-100 transition-colors">
                              {/* Header da Nota */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {note.title}
                                  </h4>
                                  <span
                                    className={`
                                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                    ${noteTypeColors[note.type]}
                                  `}
                                  >
                                    {NOTE_TYPE_LABELS[note.type]}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatNoteTime(note.createdAt)}</span>
                                </div>
                              </div>

                              {/* Conteúdo */}
                              <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                                {note.content}
                              </p>

                              {/* Médico e Especialidade */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{note.author?.name || 'Autor não especificado'}</span>
                                {note.author?.specialty && <span>{note.author.specialty}</span>}
                              </div>

                              {/* Anexos */}
                              {note.attachments && note.attachments.length > 0 && (
                                <div className="mt-2 text-xs text-blue-600">
                                  📎 {note.attachments.length} anexo
                                  {note.attachments.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
