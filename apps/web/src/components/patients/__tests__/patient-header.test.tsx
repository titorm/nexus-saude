import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, userEvent } from '../../../test/utils';
import { PatientHeader } from '../../patient-details/PatientHeader';
import { mockPatient } from '../../../test/mocks';

// Mock das funções de utilidade
vi.mock('../../../utils/patients', () => ({
  formatCPF: (cpf: string) => cpf,
  formatPhone: (phone: string) => phone,
  calculateAge: () => 38,
  getInitials: (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase(),
}));

describe('PatientHeader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render patient information correctly', () => {
    render(<PatientHeader patient={mockPatient} />);

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('38 anos')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
    expect(screen.getByText('joao.silva@example.com')).toBeInTheDocument();
  });

  it('should display medical information', () => {
    render(<PatientHeader patient={mockPatient} />);

    expect(screen.getByText('A+')).toBeInTheDocument();
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText(/Alergias: Penicilina/)).toBeInTheDocument();
  });

  it('should render edit button when onEdit prop is provided', () => {
    const onEdit = vi.fn();
    render(<PatientHeader patient={mockPatient} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /editar/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<PatientHeader patient={mockPatient} onEdit={onEdit} />);
    const user = userEvent.setup();

    const editButton = screen.getByRole('button', { name: /editar/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('should handle missing optional medical information', () => {
    const patientWithoutMedicalInfo = {
      ...mockPatient,
      medicalInfo: {
        bloodType: 'A+',
        allergies: [],
        chronicConditions: [],
        medications: [],
      },
    };

    render(<PatientHeader patient={patientWithoutMedicalInfo} />);

    expect(screen.getByText('A+')).toBeInTheDocument();
    expect(screen.queryByText('Diabetes')).not.toBeInTheDocument();
    expect(screen.queryByText(/Alergias:/)).not.toBeInTheDocument();
  });

  it('should display emergency contact information', () => {
    render(<PatientHeader patient={mockPatient} />);

    // O contato de emergência aparece no formato "Nome (Telefone)"
    expect(screen.getByText(/Maria Silva \(/)).toBeInTheDocument();
    expect(screen.getByText(/\(11\) 88888-8888\)/)).toBeInTheDocument();
  });

  it('should show active status correctly', () => {
    render(<PatientHeader patient={mockPatient} />);

    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    const { container } = render(<PatientHeader patient={mockPatient} isLoading={true} />);

    // No estado de loading, não deve mostrar as informações do paciente
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();

    // Deve ter elemento com classe de animação pulse
    const loadingContainer = container.querySelector('.animate-pulse');
    expect(loadingContainer).toBeInTheDocument();
  });

  it('should render print and export buttons when props are provided', () => {
    const onPrint = vi.fn();
    const onExport = vi.fn();

    render(<PatientHeader patient={mockPatient} onPrint={onPrint} onExport={onExport} />);

    expect(screen.getByRole('button', { name: /imprimir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
  });
});
