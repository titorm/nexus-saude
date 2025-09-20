import type { ReactNode } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { routeGuards } from '@/utils/navigation';
import type { UserRole } from '@/types/navigation';

interface RouteGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
  allowUnauthenticated?: boolean;
}

export function RouteGuard({
  children,
  requiredRoles,
  fallbackPath,
  allowUnauthenticated = false,
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasRole } = usePermissions();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se permite não autenticado e usuário não está logado, permitir acesso
  if (allowUnauthenticated && !isAuthenticated) {
    return <>{children}</>;
  }

  // Se usuário está logado mas página permite não autenticados,
  // redirecionar para dashboard ou página inicial apropriada
  if (allowUnauthenticated && isAuthenticated) {
    const redirectTo = user?.role === 'administrator' ? '/' : '/';
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar se está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} replace />;
  }

  // Obter configuração de guard para a rota atual
  const routeGuard = routeGuards[location.pathname];
  const finalRequiredRoles = requiredRoles || routeGuard?.requiredRoles;
  const finalFallbackPath = fallbackPath || routeGuard?.redirectTo || '/';

  // Verificar permissões se roles foram especificadas
  if (finalRequiredRoles && finalRequiredRoles.length > 0) {
    if (!hasRole(finalRequiredRoles)) {
      // Se é admin tentando acessar área comum, permitir
      if (user?.role === 'administrator' && !finalRequiredRoles.includes('administrator')) {
        return <>{children}</>;
      }

      // Caso contrário, mostrar página de acesso negado ou redirecionar
      if (finalFallbackPath.startsWith('/')) {
        return <Navigate to="/" replace />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>

            <p className="text-sm text-gray-500 mb-6">
              Você não tem permissão para acessar esta página.
            </p>

            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Papéis necessários: {finalRequiredRoles.join(', ')}
              </p>
              <p className="text-xs text-gray-400">Seu papel atual: {user?.role}</p>

              <div className="flex space-x-3">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Início
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook para verificação de acesso a rotas
export function useRouteAccess() {
  const { isAuthenticated, user } = useAuth();
  const { hasRole } = usePermissions();
  const location = useLocation();

  const canAccessRoute = (path: string, requiredRoles?: UserRole[]): boolean => {
    if (!isAuthenticated) return false;

    const routeGuard = routeGuards[path];
    const roles = requiredRoles || routeGuard?.requiredRoles;

    if (!roles || roles.length === 0) return true;

    // Admin sempre pode acessar (exceto se explicitamente restrito)
    if (user?.role === 'administrator' && !roles.includes('administrator')) {
      return true;
    }

    return hasRole(roles);
  };

  const getRedirectPath = (requiredRoles?: UserRole[]): string => {
    if (!isAuthenticated) return '/login';

    if (!requiredRoles || requiredRoles.length === 0) return '/';

    // Se não tem permissão, redirecionar baseado no papel
    switch (user?.role) {
      case 'administrator':
        return '/';
      case 'doctor':
        return '/';
      case 'nurse':
        return '/patients';
      default:
        return '/';
    }
  };

  return {
    canAccessRoute,
    getRedirectPath,
    currentUserRole: user?.role,
    isAuthenticated,
  };
}
