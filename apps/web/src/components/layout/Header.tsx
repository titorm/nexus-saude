import { Menu, Bell, Search } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { cn } from '@/utils/cn';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { toggleSidebar, state } = useNavigation();
  const { user } = useAuth();

  return (
    <header
      className={cn(
        'bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center space-x-4 flex-1">
        {/* Menu toggle para mobile */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        {/* Breadcrumbs */}
        <div className="flex-1">
          <Breadcrumbs className="hidden sm:flex" />
        </div>
      </div>

      {/* Actions da direita */}
      <div className="flex items-center space-x-3">
        {/* Search */}
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Buscar">
          <Search className="h-5 w-5 text-gray-600" />
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          title="Notificações"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {/* Badge de notificação */}
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User info (apenas em mobile) */}
        {user && (
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
            <span className="font-medium">{user.email}</span>
            <span className="text-gray-500 capitalize">({user.role})</span>
          </div>
        )}
      </div>
    </header>
  );
}
