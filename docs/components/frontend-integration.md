# Integração Frontend - Sistema de Autenticação

## Visão Geral

Este guia descreve como integrar o sistema de autenticação no frontend React usando TanStack Router e o AuthContext fornecido.

## Configuração Inicial

### 1. Instalação de Dependências

As dependências já estão incluídas no projeto:

```json
{
  "@tanstack/react-router": "^1.131.48",
  "@tanstack/react-query": "^5.89.0",
  "axios": "^1.12.2",
  "zod": "^4.1.9"
}
```

### 2. Configuração do Axios

Configure o cliente HTTP para incluir cookies automaticamente:

```typescript
// src/lib/api.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // Importante para cookies de autenticação
  timeout: 10000,
});

// Interceptor para renovação automática de tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await apiClient.post('/api/auth/refresh');
        // Retry da requisição original
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Redirecionar para login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## AuthContext

### Usando o Hook useAuth

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      // Usuário logado com sucesso
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <p>Bem-vindo, {user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Hook usePermissions

```typescript
import { usePermissions } from '@/contexts/AuthContext';

function AdminPanel() {
  const { hasPermission } = usePermissions();

  if (!hasPermission(['administrator'])) {
    return <div>Acesso negado</div>;
  }

  return (
    <div>
      <h2>Painel Administrativo</h2>
      {/* Conteúdo admin */}
    </div>
  );
}
```

## Proteção de Rotas

### Componente ProtectedRoute

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Rota protegida para médicos
function DoctorRoute() {
  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <DoctorDashboard />
    </ProtectedRoute>
  );
}

// Rota protegida para administradores
function AdminRoute() {
  return (
    <ProtectedRoute allowedRoles={['administrator']}>
      <AdminPanel />
    </ProtectedRoute>
  );
}

// Rota protegida para múltiplos roles
function PatientsRoute() {
  return (
    <ProtectedRoute allowedRoles={['doctor', 'nurse', 'administrator']}>
      <PatientsList />
    </ProtectedRoute>
  );
}
```

### AuthGuard para Seções

```typescript
import { AuthGuard } from '@/components/auth/ProtectedRoute';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Seção visível para todos usuários autenticados */}
      <div>Informações gerais</div>

      {/* Seção apenas para médicos */}
      <AuthGuard allowedRoles={['doctor']}>
        <PrescriptionPanel />
      </AuthGuard>

      {/* Seção apenas para administradores */}
      <AuthGuard allowedRoles={['administrator']}>
        <UserManagement />
      </AuthGuard>
    </div>
  );
}
```

## Configuração de Rotas com TanStack Router

### Estrutura de Rotas

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AuthProvider } from '@/contexts/AuthContext';

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <div className="app">
        <nav>
          {/* Navigation */}
        </nav>
        <main>
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  ),
});
```

```typescript
// src/routes/login.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/pages/LoginPage';

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // Redirecionar se já estiver logado
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});
```

```typescript
// src/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Dashboard } from '@/pages/Dashboard';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    // Requerer autenticação
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <ProtectedRoute allowedRoles={['doctor', 'nurse', 'administrator']}>
      <Dashboard />
    </ProtectedRoute>
  ),
});
```

## Formulários de Autenticação

### Página de Login

```typescript
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from '@tanstack/react-router';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login - Nexus Saúde</h2>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="login-button"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

### Formulário de Mudança de Senha

```typescript
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { changePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Nova senha e confirmação não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setMessage('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Alterar Senha</h3>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="form-group">
        <label htmlFor="currentPassword">Senha Atual:</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="newPassword">Nova Senha:</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirmar Nova Senha:</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Alterando...' : 'Alterar Senha'}
      </button>
    </form>
  );
}
```

## Navegação Condicional

### Componente de Navegação

```typescript
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { Link } from '@tanstack/react-router';

export function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();

  if (!isAuthenticated) {
    return (
      <nav>
        <Link to="/login">Login</Link>
        <Link to="/about">Sobre</Link>
      </nav>
    );
  }

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>

      {hasPermission(['doctor', 'nurse']) && (
        <Link to="/patients">Pacientes</Link>
      )}

      {hasPermission(['doctor']) && (
        <Link to="/prescriptions">Prescrições</Link>
      )}

      {hasPermission(['administrator']) && (
        <Link to="/admin">Administração</Link>
      )}

      <div className="user-menu">
        <span>Olá, {user?.email}</span>
        <button onClick={logout}>Sair</button>
      </div>
    </nav>
  );
}
```

## Tratamento de Erros

### Interceptor Global de Erro

```typescript
// src/lib/api.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, tentar renovar
      return handleTokenRefresh(error);
    }

    if (error.response?.status === 403) {
      // Acesso negado
      toast.error('Você não tem permissão para esta ação');
    }

    if (error.response?.status === 429) {
      // Rate limit
      toast.error('Muitas tentativas. Tente novamente mais tarde');
    }

    return Promise.reject(error);
  }
);
```

### Componente de Erro de Autorização

```typescript
export function UnauthorizedError() {
  const { user } = useAuth();

  return (
    <div className="error-container">
      <h2>Acesso Negado</h2>
      <p>
        Você não tem permissão para acessar esta página.
        {user && (
          <>
            <br />
            Usuário atual: {user.email} ({user.role})
          </>
        )}
      </p>
      <Link to="/dashboard">Voltar ao Dashboard</Link>
    </div>
  );
}
```

## Persistência de Estado

### LocalStorage para Preferências

```typescript
// src/hooks/useAuthPersistence.ts
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthPersistence() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Salvar preferências do usuário
      localStorage.setItem(
        'user_preferences',
        JSON.stringify({
          theme: 'light',
          language: 'pt-BR',
          lastLogin: new Date().toISOString(),
        })
      );
    }
  }, [user]);
}
```

## Testes

### Testando Componentes com Autenticação

```typescript
// src/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const MockAuthProvider = ({ children, user = null }) => (
  <AuthProvider value={{ user, isAuthenticated: !!user }}>
    {children}
  </AuthProvider>
);

test('should render content for authorized user', () => {
  const mockUser = { userId: 1, email: 'test@test.com', role: 'doctor' };

  render(
    <MockAuthProvider user={mockUser}>
      <ProtectedRoute allowedRoles={['doctor']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    </MockAuthProvider>
  );

  expect(screen.getByText('Protected Content')).toBeInTheDocument();
});

test('should show unauthorized for wrong role', () => {
  const mockUser = { userId: 1, email: 'test@test.com', role: 'nurse' };

  render(
    <MockAuthProvider user={mockUser}>
      <ProtectedRoute allowedRoles={['administrator']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    </MockAuthProvider>
  );

  expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
});
```

## Boas Práticas

### 1. Validação de Permissões

```typescript
// Sempre validar permissões no frontend E backend
const canEditPatient = hasPermission(['doctor', 'administrator']);

if (canEditPatient) {
  // Mostrar botão de edição
}
```

### 2. Loading States

```typescript
// Sempre mostrar estados de carregamento
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 3. Logout Automático

```typescript
// Configurar logout automático em inatividade
useEffect(() => {
  const timer = setTimeout(
    () => {
      logout();
    },
    30 * 60 * 1000
  ); // 30 minutos

  return () => clearTimeout(timer);
}, [user]);
```

### 4. Feedback Visual

```typescript
// Sempre dar feedback ao usuário
const handleLogin = async () => {
  try {
    setIsLoading(true);
    await login(email, password);
    toast.success('Login realizado com sucesso!');
  } catch (error) {
    toast.error('Erro no login. Verifique suas credenciais.');
  } finally {
    setIsLoading(false);
  }
};
```

---

**Última Atualização**: Dezembro 2024  
**Framework**: React + TanStack Router  
**Versão**: 1.0
