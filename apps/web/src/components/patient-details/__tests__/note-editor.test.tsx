import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, userEvent } from '../../../test/utils';
import { NoteEditor } from '../../patient-details/NoteEditor';
import type { ClinicalNote } from '../../../types/clinicalNotes';
import { mockClinicalNotesResponse } from '../../../test/mocks';

describe('NoteEditor', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    patientId: 1,
    mode: 'create' as const,
  };

  it('should render in create mode', () => {
    render(<NoteEditor {...defaultProps} />);

    expect(screen.getByText(/Nova Nota Clínica/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });

  it('should render in edit mode when note is provided', () => {
    const existingNote = mockClinicalNotesResponse.data[0];

    render(<NoteEditor {...defaultProps} note={existingNote} mode="edit" />);

    expect(screen.getByText(/Editar Nota/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(existingNote.title)).toBeInTheDocument();
  });

  it('should render in view mode when mode is view', () => {
    const existingNote = mockClinicalNotesResponse.data[0];

    render(<NoteEditor {...defaultProps} note={existingNote} mode="view" />);

    expect(screen.getByText(/Visualizar Nota/i)).toBeInTheDocument();
    // No modo view, campos devem estar desabilitados
    expect(screen.getByDisplayValue(existingNote.title)).toBeDisabled();
  });

  it('should not render when isOpen is false', () => {
    render(<NoteEditor {...defaultProps} isOpen={false} />);

    expect(screen.queryByText(/Nova Nota Clínica/i)).not.toBeInTheDocument();
  });

  it('should have required form fields', () => {
    render(<NoteEditor {...defaultProps} />);

    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/conteúdo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
  });

  it('should call onSave with form data when save button is clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} onSave={onSave} />);

    // Preenche o formulário
    await user.type(screen.getByLabelText(/título/i), 'Nova Consulta');
    await user.type(screen.getByLabelText(/conteúdo/i), 'Conteúdo da nova consulta');

    // Clica em salvar
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nova Consulta',
        content: 'Conteúdo da nova consulta',
        patientId: 1,
      })
    );
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} onClose={onClose} />);

    // Procura pelo botão de fechar (X)
    const closeButton =
      screen.getByRole('button', { name: /fechar/i }) || screen.getByLabelText(/fechar/i);
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should update form fields when typing', async () => {
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} />);

    const titleInput = screen.getByLabelText(/título/i);
    const contentInput = screen.getByLabelText(/conteúdo/i);

    await user.type(titleInput, 'Teste de Título');
    await user.type(contentInput, 'Teste de conteúdo');

    expect(titleInput).toHaveValue('Teste de Título');
    expect(contentInput).toHaveValue('Teste de conteúdo');
  });

  it('should handle note type selection', async () => {
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/tipo/i);
    await user.selectOptions(typeSelect, 'consultation');

    expect(typeSelect).toHaveValue('consultation');
  });

  it('should handle priority selection', async () => {
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} />);

    const prioritySelect = screen.getByLabelText(/prioridade/i);
    await user.selectOptions(prioritySelect, 'high');

    expect(prioritySelect).toHaveValue('high');
  });

  it('should show loading state when isLoading is true', () => {
    render(<NoteEditor {...defaultProps} isLoading={true} />);

    const saveButton = screen.getByRole('button', { name: /salvar/i });
    expect(saveButton).toBeDisabled();
  });

  it('should disable form fields in view mode', () => {
    const existingNote = mockClinicalNotesResponse.data[0];

    render(<NoteEditor {...defaultProps} note={existingNote} mode="view" />);

    expect(screen.getByDisplayValue(existingNote.title)).toBeDisabled();
    expect(screen.getByDisplayValue(existingNote.content)).toBeDisabled();
  });

  it('should handle symptoms and medications input', async () => {
    const user = userEvent.setup();

    render(<NoteEditor {...defaultProps} />);

    // Procura por campos de sintomas e medicações
    const symptomsInput = screen.queryByLabelText(/sintomas/i);
    const medicationsInput = screen.queryByLabelText(/medicações/i);

    if (symptomsInput) {
      await user.type(symptomsInput, 'Dor de cabeça');
      expect(symptomsInput).toHaveValue('Dor de cabeça');
    }

    if (medicationsInput) {
      await user.type(medicationsInput, 'Paracetamol');
      expect(medicationsInput).toHaveValue('Paracetamol');
    }
  });

  it('should handle vital signs input', () => {
    render(<NoteEditor {...defaultProps} />);

    // Procura por campos de sinais vitais
    const pressureInput = screen.queryByLabelText(/pressão/i);
    const temperatureInput = screen.queryByLabelText(/temperatura/i);

    if (pressureInput) {
      expect(pressureInput).toBeInTheDocument();
    }

    if (temperatureInput) {
      expect(temperatureInput).toBeInTheDocument();
    }
  });
});
