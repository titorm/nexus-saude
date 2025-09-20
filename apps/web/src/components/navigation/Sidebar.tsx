import { X, Menu, Settings, LogOut, User } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarItem } from './SidebarItem';
import { cn } from '@/utils/cn';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const {
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    navigationItems,
    isItemActive,
    isItemExpanded,
    compactMode,
    showBadges,
    currentUser,
  } = useSidebar();

  const { logout } = useAuth();

  const handleItemClick = () => {
    // Fechar sidebar em mobile quando item for clicado
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-16',
          compactMode && sidebarOpen && 'w-16',
          'lg:static lg:inset-auto lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {/* Logo/Title */}
          {sidebarOpen && !compactMode ? (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NS</span>
              </div>
              <span className="font-semibold text-gray-900">Nexus Saúde</span>
            </div>
          ) : (
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">NS</span>
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-1 rounded-lg hover:bg-gray-100 transition-colors',
              (!sidebarOpen || compactMode) && 'hidden lg:block absolute top-4 right-2'
            )}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {sidebarOpen && !compactMode ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isItemActive(item)}
              isExpanded={isItemExpanded(item)}
              level={0}
              compact={!sidebarOpen || compactMode}
              showBadge={showBadges}
              onItemClick={handleItemClick}
            />
          ))}
        </nav>

        {/* Footer da Sidebar - Usuário */}
        {currentUser && (
          <div className="border-t border-gray-200 p-4">
            {sidebarOpen && !compactMode ? (
              <div className="space-y-2">
                {/* Informações do usuário */}
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
                  </div>
                </div>

                {/* Ações do usuário */}
                <div className="flex space-x-1">
                  <button
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Configurações"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  className="w-full p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Configurações"
                >
                  <Settings className="h-5 w-5 mx-auto" />
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full p-2 text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5 mx-auto" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
