import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, FileText, Tag, Calendar, Upload, Trash2 } from 'lucide-react';
import type {
  ClinicalNote,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput,
  NoteType,
  NotePriority,
  VitalSigns,
} from '../../types/clinicalNotes';
import { NOTE_TYPE_LABELS, PRIORITY_LABELS } from '../../types/clinicalNotes';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateClinicalNoteInput | UpdateClinicalNoteInput) => void;
  note?: ClinicalNote;
  patientId: number;
  isLoading?: boolean;
  mode: 'create' | 'edit' | 'view';
}

interface FormData {
  type: NoteType;
  title: string;
  content: string;
  priority: NotePriority;
  symptoms: string[];
  medications: string[];
  vitalSigns?: VitalSigns;
  tags: string[];
  isPrivate: boolean;
  followUpDate?: string;
  attachments: string[];
}

const initialFormData: FormData = {
  type: 'consultation',
  title: '',
  content: '',
  priority: 'normal',
  symptoms: [],
  medications: [],
  vitalSigns: undefined,
  tags: [],
  isPrivate: false,
  followUpDate: undefined,
  attachments: [],
};

export function NoteEditor({
  isOpen,
  onClose,
  onSave,
  note,
  patientId,
  isLoading = false,
  mode,
}: NoteEditorProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newSymptom, setNewSymptom] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showVitalSigns, setShowVitalSigns] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados da nota para edição
  useEffect(() => {
    if (note && (mode === 'edit' || mode === 'view')) {
      setFormData({
        type: note.type,
        title: note.title,
        content: note.content,
        priority: note.priority,
        symptoms: note.symptoms || [],
        medications: note.medications || [],
        vitalSigns: note.vitalSigns,
        tags: note.tags || [],
        isPrivate: note.isPrivate,
        followUpDate: note.followUpDate,
        attachments: note.attachments || [],
      });
      setShowVitalSigns(!!note.vitalSigns);
    } else {
      setFormData(initialFormData);
      setShowVitalSigns(false);
    }
    setErrors({});
  }, [note, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório';
    }

    if (showVitalSigns && formData.vitalSigns) {
      const vs = formData.vitalSigns;

      if (vs.bloodPressure) {
        if (vs.bloodPressure.systolic <= 0 || vs.bloodPressure.diastolic <= 0) {
          newErrors.bloodPressure = 'Pressão arterial deve ter valores positivos';
        }
        if (vs.bloodPressure.systolic <= vs.bloodPressure.diastolic) {
          newErrors.bloodPressure = 'Pressão sistólica deve ser maior que diastólica';
        }
      }

      if (vs.heartRate && (vs.heartRate <= 0 || vs.heartRate > 300)) {
        newErrors.heartRate = 'Frequência cardíaca deve estar entre 1 e 300 bpm';
      }

      if (vs.temperature && (vs.temperature < 30 || vs.temperature > 45)) {
        newErrors.temperature = 'Temperatura deve estar entre 30°C e 45°C';
      }

      if (vs.respiratoryRate && (vs.respiratoryRate <= 0 || vs.respiratoryRate > 60)) {
        newErrors.respiratoryRate = 'Frequência respiratória deve estar entre 1 e 60 irpm';
      }

      if (vs.oxygenSaturation && (vs.oxygenSaturation < 50 || vs.oxygenSaturation > 100)) {
        newErrors.oxygenSaturation = 'Saturação de oxigênio deve estar entre 50% e 100%';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = {
      patientId,
      type: formData.type,
      title: formData.title.trim(),
      content: formData.content.trim(),
      priority: formData.priority,
      symptoms: formData.symptoms,
      medications: formData.medications,
      vitalSigns: showVitalSigns ? formData.vitalSigns : undefined,
      tags: formData.tags,
      isPrivate: formData.isPrivate,
      followUpDate: formData.followUpDate || undefined,
      attachments: formData.attachments,
    };

    if (mode === 'edit' && note) {
      onSave({ ...data, id: note.id } as UpdateClinicalNoteInput);
    } else {
      onSave(data as CreateClinicalNoteInput);
    }
  };

  const addSymptom = () => {
    if (newSymptom.trim() && !formData.symptoms.includes(newSymptom.trim())) {
      setFormData((prev) => ({
        ...prev,
        symptoms: [...prev.symptoms, newSymptom.trim()],
      }));
      setNewSymptom('');
    }
  };

  const removeSymptom = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index),
    }));
  };

  const addMedication = () => {
    if (newMedication.trim() && !formData.medications.includes(newMedication.trim())) {
      setFormData((prev) => ({
        ...prev,
        medications: [...prev.medications, newMedication.trim()],
      }));
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const updateVitalSigns = (field: keyof VitalSigns, value: any) => {
    setFormData((prev) => ({
      ...prev,
      vitalSigns: {
        ...prev.vitalSigns,
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title =
    mode === 'create' ? 'Nova Nota Clínica' : mode === 'edit' ? 'Editar Nota' : 'Visualizar Nota';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo da Nota *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value as NoteType }))
                  }
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                >
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
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, priority: e.target.value as NotePriority }))
                  }
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite o título da nota..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Conteúdo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                disabled={isReadOnly}
                rows={8}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descreva os detalhes da consulta, diagnóstico, observações..."
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.content}
                </p>
              )}
            </div>

            {/* Sintomas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sintomas</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.symptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                  >
                    {symptom}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeSymptom(index)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Adicionar sintoma..."
                  />
                  <button
                    type="button"
                    onClick={addSymptom}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* Medicações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medicações</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.medications.map((medication, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {medication}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Adicionar medicação..."
                  />
                  <button
                    type="button"
                    onClick={addMedication}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* Sinais Vitais */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Sinais Vitais</label>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setShowVitalSigns(!showVitalSigns)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showVitalSigns ? 'Remover' : 'Adicionar'} sinais vitais
                  </button>
                )}
              </div>

              {showVitalSigns && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Pressão Arterial */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pressão Arterial (mmHg)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={formData.vitalSigns?.bloodPressure?.systolic || ''}
                        onChange={(e) =>
                          updateVitalSigns('bloodPressure', {
                            ...formData.vitalSigns?.bloodPressure,
                            systolic: parseInt(e.target.value) || 0,
                            diastolic: formData.vitalSigns?.bloodPressure?.diastolic || 0,
                          })
                        }
                        disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                        placeholder="Sistólica"
                      />
                      <span className="text-gray-500 py-1">/</span>
                      <input
                        type="number"
                        value={formData.vitalSigns?.bloodPressure?.diastolic || ''}
                        onChange={(e) =>
                          updateVitalSigns('bloodPressure', {
                            ...formData.vitalSigns?.bloodPressure,
                            systolic: formData.vitalSigns?.bloodPressure?.systolic || 0,
                            diastolic: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={isReadOnly}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                        placeholder="Diastólica"
                      />
                    </div>
                    {errors.bloodPressure && (
                      <p className="mt-1 text-xs text-red-600">{errors.bloodPressure}</p>
                    )}
                  </div>

                  {/* Frequência Cardíaca */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">FC (bpm)</label>
                    <input
                      type="number"
                      value={formData.vitalSigns?.heartRate || ''}
                      onChange={(e) =>
                        updateVitalSigns('heartRate', parseInt(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    {errors.heartRate && (
                      <p className="mt-1 text-xs text-red-600">{errors.heartRate}</p>
                    )}
                  </div>

                  {/* Temperatura */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vitalSigns?.temperature || ''}
                      onChange={(e) =>
                        updateVitalSigns('temperature', parseFloat(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    {errors.temperature && (
                      <p className="mt-1 text-xs text-red-600">{errors.temperature}</p>
                    )}
                  </div>

                  {/* FR */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      FR (irpm)
                    </label>
                    <input
                      type="number"
                      value={formData.vitalSigns?.respiratoryRate || ''}
                      onChange={(e) =>
                        updateVitalSigns('respiratoryRate', parseInt(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    {errors.respiratoryRate && (
                      <p className="mt-1 text-xs text-red-600">{errors.respiratoryRate}</p>
                    )}
                  </div>

                  {/* SpO2 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      value={formData.vitalSigns?.oxygenSaturation || ''}
                      onChange={(e) =>
                        updateVitalSigns('oxygenSaturation', parseInt(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                    {errors.oxygenSaturation && (
                      <p className="mt-1 text-xs text-red-600">{errors.oxygenSaturation}</p>
                    )}
                  </div>

                  {/* Peso */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vitalSigns?.weight || ''}
                      onChange={(e) =>
                        updateVitalSigns('weight', parseFloat(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                  </div>

                  {/* Altura */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Altura (cm)
                    </label>
                    <input
                      type="number"
                      value={formData.vitalSigns?.height || ''}
                      onChange={(e) =>
                        updateVitalSigns('height', parseInt(e.target.value) || undefined)
                      }
                      disabled={isReadOnly}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tags e Opções */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!isReadOnly && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Adicionar tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>

              {/* Opções */}
              <div className="space-y-4">
                {/* Data de Acompanhamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data de Acompanhamento
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.followUpDate || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        followUpDate: e.target.value || undefined,
                      }))
                    }
                    disabled={isReadOnly}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Nota Privada */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isPrivate: e.target.checked }))
                    }
                    disabled={isReadOnly}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
                    Nota privada (acesso restrito)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isReadOnly && (
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {mode === 'edit' ? 'Atualizar' : 'Salvar'} Nota
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
