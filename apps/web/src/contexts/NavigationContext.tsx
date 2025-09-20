import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  NavigationContextType,
  NavigationState,
  NavigationPreferences,
  BreadcrumbItem,
} from '@/types/navigation';

const defaultPreferences: NavigationPreferences = {
  sidebarOpen: true,
  theme: 'light',
  compactMode: false,
  showBadges: true,
};

const defaultState: NavigationState = {
  sidebarOpen: true,
  currentPath: '/',
  breadcrumbs: [],
  history: [],
  preferences: defaultPreferences,
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>(() => {
    // Carregar preferências do localStorage na inicialização
    try {
      const savedPreferences = localStorage.getItem('nexus-navigation-preferences');
      const preferences = savedPreferences
        ? { ...defaultPreferences, ...JSON.parse(savedPreferences) }
        : defaultPreferences;

      return {
        ...defaultState,
        preferences,
        sidebarOpen: preferences.sidebarOpen,
      };
    } catch {
      return defaultState;
    }
  });

  // Salvar preferências no localStorage quando mudarem
  useEffect(() => {
    try {
      localStorage.setItem('nexus-navigation-preferences', JSON.stringify(state.preferences));
    } catch (error) {
      console.warn('Falha ao salvar preferências de navegação:', error);
    }
  }, [state.preferences]);

  const toggleSidebar = () => {
    setState((prev) => {
      const newSidebarOpen = !prev.sidebarOpen;
      return {
        ...prev,
        sidebarOpen: newSidebarOpen,
        preferences: {
          ...prev.preferences,
          sidebarOpen: newSidebarOpen,
        },
      };
    });
  };

  const setSidebarOpen = (open: boolean) => {
    setState((prev) => ({
      ...prev,
      sidebarOpen: open,
      preferences: {
        ...prev.preferences,
        sidebarOpen: open,
      },
    }));
  };

  const updatePreferences = (newPreferences: Partial<NavigationPreferences>) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...newPreferences,
      },
    }));
  };

  const addToHistory = (path: string) => {
    setState((prev) => {
      const newHistory = [path, ...prev.history.filter((p) => p !== path)].slice(0, 10);
      return {
        ...prev,
        currentPath: path,
        history: newHistory,
      };
    });
  };

  const clearHistory = () => {
    setState((prev) => ({
      ...prev,
      history: [],
    }));
  };

  const updateBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
    setState((prev) => ({
      ...prev,
      breadcrumbs,
    }));
  };

  const contextValue: NavigationContextType = {
    state,
    toggleSidebar,
    setSidebarOpen,
    updatePreferences,
    addToHistory,
    clearHistory,
    updateBreadcrumbs,
  };

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
}
