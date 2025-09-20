import {
  Home,
  Users,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  UserPlus,
  List,
  Building,
  Cog,
  Stethoscope,
  Activity,
  ClipboardList,
  PieChart,
} from 'lucide-react';
import type { NavigationItem, RouteGuard } from '@/types/navigation';

export const navigationConfig: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    requiredRoles: ['doctor', 'nurse', 'administrator'],
    description: 'Visão geral do sistema',
  },
  {
    id: 'patients',
    label: 'Pacientes',
    path: '/patients',
    icon: Users,
    requiredRoles: ['doctor', 'nurse'],
    description: 'Gerenciamento de pacientes',
    children: [
      {
        id: 'patients-list',
        label: 'Lista de Pacientes',
        path: '/patients',
        icon: List,
        requiredRoles: ['doctor', 'nurse'],
      },
      {
        id: 'patients-new',
        label: 'Novo Paciente',
        path: '/patients/new',
        icon: UserPlus,
        requiredRoles: ['doctor', 'nurse'],
      },
    ],
  },
  {
    id: 'clinical-notes',
    label: 'Prontuários',
    path: '/clinical-notes',
    icon: FileText,
    requiredRoles: ['doctor', 'nurse'],
    description: 'Notas e prontuários médicos',
  },
  {
    id: 'appointments',
    label: 'Consultas',
    path: '/appointments',
    icon: Calendar,
    requiredRoles: ['doctor', 'nurse', 'receptionist'],
    description: 'Agendamento e consultas',
    children: [
      {
        id: 'appointments-list',
        label: 'Lista de Consultas',
        path: '/appointments',
        icon: ClipboardList,
        requiredRoles: ['doctor', 'nurse', 'receptionist'],
      },
      {
        id: 'appointments-calendar',
        label: 'Calendário',
        path: '/appointments/calendar',
        icon: Calendar,
        requiredRoles: ['doctor', 'nurse', 'receptionist'],
      },
      {
        id: 'appointments-new',
        label: 'Nova Consulta',
        path: '/appointments/new',
        icon: UserPlus,
        requiredRoles: ['doctor', 'nurse', 'receptionist'],
      },
    ],
  },
  {
    id: 'medical',
    label: 'Medicina',
    path: '/medical',
    icon: Stethoscope,
    requiredRoles: ['doctor'],
    description: 'Ferramentas médicas',
    children: [
      {
        id: 'medical-prescriptions',
        label: 'Prescrições',
        path: '/medical/prescriptions',
        icon: FileText,
        requiredRoles: ['doctor'],
      },
      {
        id: 'medical-exams',
        label: 'Exames',
        path: '/medical/exams',
        icon: Activity,
        requiredRoles: ['doctor'],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    path: '/reports',
    icon: BarChart3,
    requiredRoles: ['administrator', 'doctor'],
    description: 'Relatórios e análises',
    children: [
      {
        id: 'reports-operational',
        label: 'Operacionais',
        path: '/reports/operational',
        icon: BarChart3,
        requiredRoles: ['administrator'],
      },
      {
        id: 'reports-financial',
        label: 'Financeiros',
        path: '/reports/financial',
        icon: PieChart,
        requiredRoles: ['administrator'],
      },
      {
        id: 'reports-medical',
        label: 'Médicos',
        path: '/reports/medical',
        icon: Activity,
        requiredRoles: ['doctor', 'administrator'],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    path: '/admin',
    icon: Settings,
    requiredRoles: ['administrator'],
    description: 'Configurações e administração',
    children: [
      {
        id: 'admin-users',
        label: 'Usuários',
        path: '/admin/users',
        icon: Users,
        requiredRoles: ['administrator'],
      },
      {
        id: 'admin-hospitals',
        label: 'Hospitais',
        path: '/admin/hospitals',
        icon: Building,
        requiredRoles: ['administrator'],
      },
      {
        id: 'admin-settings',
        label: 'Configurações',
        path: '/admin/settings',
        icon: Cog,
        requiredRoles: ['administrator'],
      },
    ],
  },
];

export const routeGuards: Record<string, RouteGuard> = {
  '/dashboard': {
    requiredRoles: ['doctor', 'nurse', 'administrator'],
    redirectTo: '/unauthorized',
  },
  '/patients': {
    requiredRoles: ['doctor', 'nurse'],
    redirectTo: '/dashboard',
  },
  '/patients/new': {
    requiredRoles: ['doctor', 'nurse'],
    redirectTo: '/dashboard',
  },
  '/clinical-notes': {
    requiredRoles: ['doctor', 'nurse'],
    redirectTo: '/dashboard',
  },
  '/appointments': {
    requiredRoles: ['doctor', 'nurse', 'receptionist'],
    redirectTo: '/dashboard',
  },
  '/appointments/new': {
    requiredRoles: ['doctor', 'nurse', 'receptionist'],
    redirectTo: '/dashboard',
  },
  '/appointments/calendar': {
    requiredRoles: ['doctor', 'nurse', 'receptionist'],
    redirectTo: '/dashboard',
  },
  '/medical': {
    requiredRoles: ['doctor'],
    redirectTo: '/dashboard',
  },
  '/medical/prescriptions': {
    requiredRoles: ['doctor'],
    redirectTo: '/dashboard',
  },
  '/medical/exams': {
    requiredRoles: ['doctor'],
    redirectTo: '/dashboard',
  },
  '/reports': {
    requiredRoles: ['administrator', 'doctor'],
    redirectTo: '/dashboard',
  },
  '/reports/operational': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
  '/reports/financial': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
  '/reports/medical': {
    requiredRoles: ['doctor', 'administrator'],
    redirectTo: '/dashboard',
  },
  '/admin': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
  '/admin/users': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
  '/admin/hospitals': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
  '/admin/settings': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
};

// Mapeamento de caminhos para rótulos amigáveis (breadcrumbs)
export const pathLabels: Record<string, string> = {
  '/': 'Início',
  '/dashboard': 'Dashboard',
  '/patients': 'Pacientes',
  '/patients/new': 'Novo Paciente',
  '/clinical-notes': 'Prontuários',
  '/appointments': 'Consultas',
  '/appointments/new': 'Nova Consulta',
  '/appointments/calendar': 'Calendário',
  '/medical': 'Medicina',
  '/medical/prescriptions': 'Prescrições',
  '/medical/exams': 'Exames',
  '/reports': 'Relatórios',
  '/reports/operational': 'Relatórios Operacionais',
  '/reports/financial': 'Relatórios Financeiros',
  '/reports/medical': 'Relatórios Médicos',
  '/admin': 'Administração',
  '/admin/users': 'Usuários',
  '/admin/hospitals': 'Hospitais',
  '/admin/settings': 'Configurações',
  '/login': 'Login',
  '/profile': 'Perfil',
  '/settings': 'Configurações',
  '/unauthorized': 'Acesso Negado',
  '/not-found': 'Página não encontrada',
};
