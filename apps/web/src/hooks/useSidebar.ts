import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import type { User } from '@/contexts/AuthContext';
import { navigationConfig } from '@/utils/navigation';
import type { NavigationItem } from '@/types/navigation';

export function useSidebar(): {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  navigationItems: NavigationItem[];
  isItemActive: (item: NavigationItem) => boolean;
  isItemExpanded: (item: NavigationItem) => boolean;
  compactMode: boolean;
  showBadges: boolean;
  currentUser: User | null;
} {
  const { state, toggleSidebar, setSidebarOpen } = useNavigation();
  const { user } = useAuth();
  const { hasRole } = usePermissions();

  // Filtrar itens de navegação baseado nas permissões do usuário
  const getFilteredNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .filter((item) => {
        // Se não há roles especificadas, mostrar para todos
        if (!item.requiredRoles || item.requiredRoles.length === 0) {
          return true;
        }
        // Verificar se o usuário tem pelo menos uma das roles necessárias
        return hasRole(item.requiredRoles);
      })
      .map((item) => ({
        ...item,
        children: item.children ? getFilteredNavigation(item.children) : undefined,
      }));
  };

  const filteredNavigation = getFilteredNavigation(navigationConfig);

  // Verificar se um item está ativo baseado no caminho atual
  const isItemActive = (item: NavigationItem): boolean => {
    const currentPath = state.currentPath;

    // Verificação exata
    if (item.path === currentPath) {
      return true;
    }

    // Verificação se é uma subrota
    if (currentPath.startsWith(item.path + '/')) {
      return true;
    }

    // Verificar filhos se existirem
    if (item.children) {
      return item.children.some((child) => isItemActive(child));
    }

    return false;
  };

  // Verificar se um item parent deve estar expandido
  const isItemExpanded = (item: NavigationItem): boolean => {
    if (!item.children) return false;
    return item.children.some((child) => isItemActive(child));
  };

  return {
    sidebarOpen: state.sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    navigationItems: filteredNavigation,
    isItemActive,
    isItemExpanded,
    compactMode: state.preferences.compactMode,
    showBadges: state.preferences.showBadges,
    currentUser: user,
  };
}
