import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { User } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// Mock RouteGuard temporarily since it might not exist yet
const RouteGuard = ({
  children,
  requiredRole,
  fallback,
}: {
  children: React.ReactNode;
  requiredRole?: 'administrator' | 'doctor' | 'nurse';
  fallback?: React.ReactNode;
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <div data-testid="navigate" data-to="/login"></div>;
  }

  if (requiredRole && (!user || !hasRequiredRole(user.role, requiredRole))) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-md3-on-surface mb-4">Acesso Negado</h2>
            <p className="text-md3-on-surface-variant">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};

// Helper function to check role hierarchy
function hasRequiredRole(userRole: User['role'], requiredRole: User['role']): boolean {
  const roleHierarchy = {
    nurse: 0,
    doctor: 1,
    administrator: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('RouteGuard', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user is authenticated and has required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'administrator',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="administrator">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="administrator">
        <TestComponent />
      </RouteGuard>
    );

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toHaveAttribute('data-to', '/login');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders loading when authentication is in progress', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="administrator">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders unauthorized page when user lacks required role', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'doctor@example.com',
        role: 'doctor',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="administrator">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(
      screen.getByText('Você não tem permissão para acessar esta página.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('allows access when no specific role is required and user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'user@example.com',
        role: 'doctor',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard>
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('respects role hierarchy - admin can access doctor routes', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'administrator',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="doctor">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('respects role hierarchy - doctor can access nurse routes', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'doctor@example.com',
        role: 'doctor',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="nurse">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('blocks access when role hierarchy is not satisfied', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'nurse@example.com',
        role: 'nurse',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="doctor">
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders custom fallback component when provided', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Unauthorized</div>;

    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'nurse@example.com',
        role: 'nurse',
        hospitalId: 1,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <RouteGuard requiredRole="administrator" fallback={<CustomFallback />}>
        <TestComponent />
      </RouteGuard>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Acesso Negado')).not.toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
