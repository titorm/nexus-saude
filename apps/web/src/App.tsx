import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PatientsPage from './pages/PatientsPage';

// Configurar React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header simples da aplicação */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Nexus Saúde</h1>
              </div>
              <nav className="flex space-x-8">
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600"
                >
                  Pacientes
                </a>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Agendamentos
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main>
          <PatientsPage />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
