import { useEffect } from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from '@/components/layout/Header';
import { cn } from '@/utils/cn';

interface RootLayoutProps {
  className?: string;
}

export function RootLayout({ className }: RootLayoutProps) {
  const location = useLocation();

  // Páginas que não precisam do layout principal (ex: login, landing)
  const publicPages = ['/login', '/signup', '/forgot-password'];
  const isPublicPage = publicPages.includes(location.pathname);

  // Se for página pública, renderizar apenas o outlet
  if (isPublicPage) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Outlet />
        </div>
      </AuthProvider>
    );
  }

  // Layout principal para páginas protegidas
  return (
    <AuthProvider>
      <NavigationProvider>
        <ProtectedRoute>
          <div className={cn('min-h-screen bg-gray-50 flex', className)}>
            {/* Sidebar */}
            <Sidebar />

            {/* Conteúdo principal */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <Header />

              {/* Área de conteúdo */}
              <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-7xl mx-auto">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </ProtectedRoute>
      </NavigationProvider>
    </AuthProvider>
  );
}

// Componente wrapper para usar em outras páginas que precisam do layout mas não da proteção
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}
