import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { PatientHeader, Timeline, NoteEditor } from '../components/patient-details';
import { usePatient } from '../hooks/usePatients';
import {
  useClinicalNotes,
  useCreateClinicalNote,
  useUpdateClinicalNote,
} from '../hooks/useClinicalNotes';
import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
} from '../types/clinicalNotes';

interface NoteEditorState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  note?: ClinicalNote;
}

interface PatientDetailsPageProps {
  patientId: number;
}

export function PatientDetailsPage({ patientId }: PatientDetailsPageProps) {
  const navigate = useNavigate();
  const [noteEditor, setNoteEditor] = useState<NoteEditorState>({
    isOpen: false,
    mode: 'create',
  });

  // Queries
  const { data: patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientId);

  const {
    data: notesResponse,
    isLoading: isLoadingNotes,
    error: notesError,
  } = useClinicalNotes({ patientId });

  const notes = notesResponse?.data || [];

  // Mutations
  const createNoteMutation = useCreateClinicalNote();
  const updateNoteMutation = useUpdateClinicalNote();

  // Handlers
  const handleEditPatient = () => {
    navigate({ to: `/patients/${patientId}/edit` });
  };

  const handlePrintPatient = () => {
    // TODO: Implementar impressão do prontuário
    console.log('Print patient details');
  };

  const handleExportPatient = () => {
    // TODO: Implementar exportação do prontuário
    console.log('Export patient details');
  };

  const handleAddNote = () => {
    setNoteEditor({
      isOpen: true,
      mode: 'create',
    });
  };

  const handleNoteClick = (note: ClinicalNote) => {
    setNoteEditor({
      isOpen: true,
      mode: 'view',
      note,
    });
  };

  const handleEditNote = (note: ClinicalNote) => {
    setNoteEditor({
      isOpen: true,
      mode: 'edit',
      note,
    });
  };

  const handleCloseNoteEditor = () => {
    setNoteEditor({
      isOpen: false,
      mode: 'create',
    });
  };

  const handleSaveNote = async (data: CreateClinicalNoteInput | UpdateClinicalNoteInput) => {
    try {
      if (noteEditor.mode === 'edit' && 'id' in data && noteEditor.note) {
        const updateData = { ...data, id: noteEditor.note.id } as UpdateClinicalNoteInput;
        await updateNoteMutation.mutateAsync({
          id: noteEditor.note.id,
          data: updateData,
        });
      } else {
        await createNoteMutation.mutateAsync(data as CreateClinicalNoteInput);
      }
      handleCloseNoteEditor();
    } catch (error) {
      console.error('Error saving note:', error);
      // TODO: Mostrar toast de erro
    }
  };

  const handleBack = () => {
    navigate({ to: '/patients' });
  };

  // Loading state
  if (isLoadingPatient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
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
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
              <div className="space-y-6">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i}>
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
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (patientError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Pacientes
          </button>

          <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar paciente</h2>
            <p className="text-gray-600 mb-4">
              Não foi possível carregar os dados do paciente.
              {patientError instanceof Error ? ` ${patientError.message}` : ''}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Pacientes
          </button>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Paciente não encontrado</h2>
            <p className="text-gray-600">O paciente solicitado não foi encontrado ou não existe.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb / Navigation */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Pacientes
          </button>
        </div>

        {/* Patient Header */}
        <PatientHeader
          patient={patient}
          onEdit={handleEditPatient}
          onPrint={handlePrintPatient}
          onExport={handleExportPatient}
        />

        {/* Clinical Notes Timeline */}
        <Timeline
          notes={notes}
          onNoteClick={handleNoteClick}
          onAddNote={handleAddNote}
          isLoading={isLoadingNotes}
        />

        {/* Note Editor Modal */}
        <NoteEditor
          isOpen={noteEditor.isOpen}
          mode={noteEditor.mode}
          note={noteEditor.note}
          patientId={patientId}
          onClose={handleCloseNoteEditor}
          onSave={handleSaveNote}
          isLoading={createNoteMutation.isPending || updateNoteMutation.isPending}
        />

        {/* Error Messages */}
        {notesError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">
                Erro ao carregar notas clínicas:{' '}
                {notesError instanceof Error ? notesError.message : 'Erro desconhecido'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
