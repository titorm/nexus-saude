import { createRootRoute, createRoute, Link, Outlet, useParams } from '@tanstack/react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { RouteGuard } from '@/components/auth/RouteGuard';
import PatientsPage from './pages/PatientsPage';
import { PatientDetailsPage } from './pages/PatientDetails';

// Componente simples para dashboard
function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bem-vindo ao Nexus Saúde</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Pacientes</h3>
          <p className="text-gray-600">Gerencie seus pacientes</p>
          <Link to="/patients" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            Ver todos →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Consultas</h3>
          <p className="text-gray-600">Agenda e consultas</p>
          <span className="mt-4 inline-block text-gray-400">Em breve →</span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Relatórios</h3>
          <p className="text-gray-600">Análises e métricas</p>
          <span className="mt-4 inline-block text-gray-400">Em breve →</span>
        </div>
      </div>
    </div>
  );
}

// Componente simples para home
function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nexus Saúde</h1>
          <p className="text-xl text-gray-600 mb-8">Sistema de Gestão em Saúde</p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/patients"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Gerenciar Pacientes
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente simples para login
function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Entre na sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sistema de Gestão em Saúde</p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow">
          <p className="text-center text-gray-600">Página de login será implementada</p>
          <div className="mt-4 text-center">
            <Link to="/" className="text-blue-600 hover:text-blue-800">
              ← Voltar para início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para páginas em construção
function ComingSoonPage({ title = 'Em Breve' }: { title?: string }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600 mb-8">Esta funcionalidade está sendo desenvolvida</p>
      <Link
        to="/"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        ← Voltar ao início
      </Link>
    </div>
  );
}

// Root Layout Component
function RootComponent() {
  return <RootLayout />;
}

// Patient Details Route Component
function PatientDetailsRoute() {
  const { patientId } = useParams({ from: '/patients/$patientId' });
  return <PatientDetailsPage patientId={parseInt(patientId)} />;
}

// Rota raiz
const rootRoute = createRootRoute({
  component: RootComponent,
});

// Rota de home (página pública)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <RouteGuard allowUnauthenticated>
      <HomePage />
    </RouteGuard>
  ),
});

// Rota de login (página pública)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <RouteGuard allowUnauthenticated>
      <LoginPage />
    </RouteGuard>
  ),
});

// Rota do dashboard (protegida)
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <RouteGuard requiredRoles={['doctor', 'nurse', 'administrator']}>
      <DashboardPage />
    </RouteGuard>
  ),
});

// Rota de pacientes (protegida)
const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients',
  component: () => (
    <RouteGuard requiredRoles={['doctor', 'nurse']}>
      <PatientsPage />
    </RouteGuard>
  ),
});

// Rota de detalhes do paciente (protegida)
const patientDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/patients/$patientId',
  component: () => (
    <RouteGuard requiredRoles={['doctor', 'nurse']}>
      <PatientDetailsRoute />
    </RouteGuard>
  ),
});

// Rota de prontuários (protegida)
const clinicalNotesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clinical-notes',
  component: () => (
    <RouteGuard requiredRoles={['doctor', 'nurse']}>
      <ComingSoonPage title="Prontuários Eletrônicos" />
    </RouteGuard>
  ),
});

// Rota de consultas (protegida)
const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/appointments',
  component: () => (
    <RouteGuard requiredRoles={['doctor', 'nurse', 'receptionist']}>
      <ComingSoonPage title="Sistema de Consultas" />
    </RouteGuard>
  ),
});

// Rota de medicina (protegida - apenas médicos)
const medicalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/medical',
  component: () => (
    <RouteGuard requiredRoles={['doctor']}>
      <ComingSoonPage title="Ferramentas Médicas" />
    </RouteGuard>
  ),
});

// Rota de relatórios (protegida)
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: () => (
    <RouteGuard requiredRoles={['administrator', 'doctor']}>
      <ComingSoonPage title="Relatórios e Análises" />
    </RouteGuard>
  ),
});

// Rota de administração (protegida - apenas admins)
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <RouteGuard requiredRoles={['administrator']}>
      <ComingSoonPage title="Painel de Administração" />
    </RouteGuard>
  ),
});

// Rota de acesso negado
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
        <p className="text-gray-600 mb-6">Você não tem permissão para acessar esta área.</p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  ),
});

// Árvore de rotas
export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  patientsRoute,
  patientDetailsRoute,
  clinicalNotesRoute,
  appointmentsRoute,
  medicalRoute,
  reportsRoute,
  adminRoute,
  unauthorizedRoute,
]);
