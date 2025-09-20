import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  email: string;
  role: 'doctor' | 'administrator' | 'nurse';
  hospitalId: number;
}

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

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // Validar sessão no carregamento inicial
  useEffect(() => {
    validateSession();
  }, []);

  // Configurar interceptor para refresh automático de tokens
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Se recebeu 401 e não é uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Tentar refresh do token
          const refreshSuccess = await refreshToken();

          if (refreshSuccess) {
            // Retentar a requisição original
            return apiClient(originalRequest);
          } else {
            // Refresh falhou, fazer logout
            await logout();
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, []);

  const validateSession = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/v1/auth/validate');
      if (response.data.valid && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.warn('Session validation failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email,
        password,
      });

      if (response.data.user) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: 'Resposta inválida do servidor' };
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro no login';
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setUser(null);
      navigate({ to: '/login' });
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await apiClient.post('/api/v1/auth/refresh');
      return response.status === 200;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      // Após mudança de senha, o backend força logout
      setUser(null);
      navigate({ to: '/login' });

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao alterar senha';
      return { success: false, error: message };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para verificar permissões baseadas em papel
export function usePermissions() {
  const { user } = useAuth();

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.role);
  };

  const isDoctor = hasRole('doctor');
  const isAdministrator = hasRole('administrator');
  const isNurse = hasRole('nurse');
  const isAdminOrNurse = hasRole(['administrator', 'nurse']);

  return {
    hasRole,
    isDoctor,
    isAdministrator,
    isNurse,
    isAdminOrNurse,
  };
}
