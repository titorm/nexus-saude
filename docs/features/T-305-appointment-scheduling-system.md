# T-305: Sistema de Agendamento e Consultas

## Visão Geral

O T-305 implementa um sistema completo de agendamento e gestão de consultas para o Nexus Saúde, permitindo que pacientes agendem consultas, profissionais gerenciem seus horários e o sistema coordene automaticamente disponibilidades e conflitos.

## Objetivos Principais

### 1. Sistema de Agendamento

- **Calendário Visual**: Interface intuitiva para visualização de disponibilidades
- **Agendamento Online**: Pacientes podem agendar consultas de forma autônoma
- **Gestão de Conflitos**: Prevenção automática de sobreposições e conflitos
- **Múltiplos Tipos**: Suporte a diferentes tipos de consulta (rotina, urgência, retorno)

### 2. Gestão de Disponibilidade

- **Horários Médicos**: Definição de disponibilidade por profissional
- **Bloqueios Temporários**: Férias, folgas, bloqueios emergenciais
- **Configurações Flexíveis**: Intervalos personalizáveis, duração variável
- **Recurring Schedules**: Horários recorrentes semanais/mensais

### 3. Comunicação e Notificações

- **Confirmações Automáticas**: Email/SMS ao agendar
- **Lembretes**: Notificações 24h/1h antes da consulta
- **Reagendamentos**: Sistema de reagendamento com notificações
- **Cancelamentos**: Gestão de cancelamentos e listas de espera

## Componentes Técnicos

### Database Schema

#### Appointments Table

```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  appointment_type_id INTEGER NOT NULL REFERENCES appointment_types(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);
```

#### Doctor Schedules Table

```sql
CREATE TABLE doctor_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Appointment Types Table

```sql
CREATE TABLE appointment_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false
);
```

### TypeScript Types

```typescript
interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentTypeId: number;
  appointmentType: AppointmentType;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive: boolean;
}

interface AppointmentType {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  color: string;
  isActive: boolean;
  requiresApproval: boolean;
}

type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
```

### API Endpoints

#### Appointments

- `GET /api/appointments` - Lista consultas com filtros
- `POST /api/appointments` - Cria nova consulta
- `GET /api/appointments/:id` - Detalhes da consulta
- `PUT /api/appointments/:id` - Atualiza consulta
- `DELETE /api/appointments/:id` - Cancela consulta
- `POST /api/appointments/:id/confirm` - Confirma consulta
- `POST /api/appointments/:id/reschedule` - Reagenda consulta

#### Availability

- `GET /api/doctors/:id/availability` - Horários disponíveis
- `GET /api/doctors/:id/schedule` - Agenda do médico
- `POST /api/doctors/:id/schedule` - Define horários
- `PUT /api/doctors/:id/schedule/:scheduleId` - Atualiza horário
- `POST /api/doctors/:id/blocks` - Bloqueia horários

#### Calendar

- `GET /api/calendar/:doctorId` - Calendário do médico
- `GET /api/calendar/availability` - Disponibilidade geral

## Frontend Components

### 1. Calendar Component

```typescript
interface CalendarProps {
  view: 'month' | 'week' | 'day';
  doctorId?: number;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (date: Date, time: string) => void;
  appointments: Appointment[];
  isLoading?: boolean;
}
```

### 2. AppointmentForm Component

```typescript
interface AppointmentFormProps {
  mode: 'create' | 'edit';
  appointment?: Appointment;
  onSave: (data: CreateAppointmentInput) => void;
  onCancel: () => void;
  availableSlots: TimeSlot[];
  appointmentTypes: AppointmentType[];
}
```

### 3. TimeSlotPicker Component

```typescript
interface TimeSlotPickerProps {
  date: Date;
  doctorId: number;
  appointmentTypeId: number;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot;
}
```

### 4. AppointmentList Component

```typescript
interface AppointmentListProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onConfirm: (appointment: Appointment) => void;
  view: 'upcoming' | 'today' | 'past';
}
```

## Pages e Routing

### Estrutura de Páginas

```
/appointments                    # Lista geral de consultas
/appointments/new               # Agendar nova consulta
/appointments/:id               # Detalhes da consulta
/appointments/:id/edit          # Editar consulta
/calendar                       # Calendário geral
/calendar/:doctorId             # Calendário do médico
/schedule                       # Gestão de horários (médicos)
/schedule/blocks               # Bloqueios de horário
```

### Route Definitions (TanStack Router)

```typescript
const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments',
  component: AppointmentsPage,
});

const newAppointmentRoute = createRoute({
  getParentRoute: () => appointmentsRoute,
  path: '/new',
  component: NewAppointmentPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: CalendarPage,
});
```

## React Query Hooks

### Appointments

```typescript
// Query para listar consultas
export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentService.getAll(filters),
  });
}

// Mutation para criar consulta
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

// Query para disponibilidade
export function useDoctorAvailability(doctorId: number, date: Date) {
  return useQuery({
    queryKey: ['availability', doctorId, date],
    queryFn: () => availabilityService.getSlots(doctorId, date),
    enabled: !!doctorId && !!date,
  });
}
```

## Notification System

### Email Templates

- **Confirmação de Agendamento**: Detalhes da consulta agendada
- **Lembrete 24h**: Lembrete 1 dia antes
- **Lembrete 1h**: Lembrete 1 hora antes
- **Cancelamento**: Notificação de cancelamento
- **Reagendamento**: Confirmação de nova data/hora

### SMS Templates

- **Confirmação**: "Consulta agendada para {date} às {time} com Dr. {doctor}"
- **Lembrete**: "Lembrete: consulta amanhã às {time} com Dr. {doctor}"
- **Cancelamento**: "Sua consulta de {date} foi cancelada"

## Validações e Regras de Negócio

### Conflict Detection

- Verificação de sobreposição de horários
- Validação de disponibilidade do médico
- Checagem de intervalos obrigatórios
- Validação de horário comercial

### Business Rules

- Mínimo 2h antecedência para agendamento
- Máximo 90 dias futuros para agendamento
- Pacientes podem ter no máximo 3 consultas futuras
- Cancelamento gratuito até 24h antes

## Performance Considerations

### Caching Strategy

- Cache de disponibilidade por 15 minutos
- Cache de tipos de consulta por 1 hora
- Invalidação inteligente por doctor/date
- Background refresh para dados críticos

### Database Optimization

- Índices em appointment.scheduled_at, patient_id, doctor_id
- Particionamento por mês para appointments antigas
- Materialized views para relatórios de disponibilidade

## Future Enhancements

### Phase 2 Features

- **Waitlist Management**: Lista de espera automática
- **Recurring Appointments**: Consultas recorrentes
- **Video Consultations**: Integração com telemedição
- **Payment Integration**: Pagamento online de consultas
- **Analytics Dashboard**: Métricas de agendamento

### Integration Possibilities

- **Google Calendar**: Sincronização bidirecional
- **WhatsApp Business**: Notificações via WhatsApp
- **SMS Providers**: Twilio, AWS SNS
- **Email Services**: SendGrid, AWS SES
- **Payment Gateways**: Stripe, Mercado Pago

## Testing Strategy

### Unit Tests

- Validation functions
- Date/time calculations
- Conflict detection algorithms
- Business rule enforcement

### Integration Tests

- Appointment flow end-to-end
- Notification delivery
- Calendar synchronization
- API endpoint validation

### E2E Tests

- Patient booking journey
- Doctor schedule management
- Appointment modifications
- Notification preferences

## Metrics e Monitoring

### Key Performance Indicators

- **Booking Success Rate**: % de agendamentos completados
- **No-Show Rate**: % de faltas
- **Average Lead Time**: Tempo médio entre agendamento e consulta
- **Doctor Utilization**: % de ocupação por médico
- **Patient Satisfaction**: Net Promoter Score

### Monitoring Points

- API response times
- Database query performance
- Notification delivery rates
- Calendar sync accuracy

Este documento serve como base para a implementação completa do sistema de agendamento do Nexus Saúde, garantindo uma experiência fluida tanto para pacientes quanto para profissionais de saúde.
