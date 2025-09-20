import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth, usePermissions } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasRole } = usePermissions();

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

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar permissões se roles foram especificadas
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
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

          <p className="text-sm text-gray-500 mb-4">
            Você não tem permissão para acessar esta página.
          </p>

          <p className="text-xs text-gray-400">Papéis necessários: {requiredRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Componente para proteger apenas uma seção
interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, fallback, requiredRoles = [] }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();
  const { hasRole } = usePermissions();

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Hook para navegação condicional baseada em autenticação
export function useAuthNavigation() {
  const { isAuthenticated } = useAuth();
  const { hasRole } = usePermissions();

  const navigateIfAuthenticated = (path: string) => {
    if (isAuthenticated) {
      // Navigate to path
      return true;
    }
    return false;
  };

  const navigateIfRole = (roles: string[], path: string) => {
    if (isAuthenticated && hasRole(roles)) {
      // Navigate to path
      return true;
    }
    return false;
  };

  return {
    navigateIfAuthenticated,
    navigateIfRole,
    canAccess: (roles?: string[]) => {
      if (!isAuthenticated) return false;
      if (!roles || roles.length === 0) return true;
      return hasRole(roles);
    },
  };
}
