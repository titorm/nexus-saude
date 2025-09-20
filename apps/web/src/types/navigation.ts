import type { LucideIcon } from 'lucide-react';

export type UserRole = 'doctor' | 'administrator' | 'nurse' | 'receptionist';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  requiredRoles?: UserRole[];
  children?: NavigationItem[];
  badge?: string | number;
  isExternal?: boolean;
  description?: string;
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrentPage: boolean;
  params?: Record<string, string>;
}

export interface NavigationPreferences {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showBadges: boolean;
}

export interface NavigationState {
  sidebarOpen: boolean;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  history: string[];
  preferences: NavigationPreferences;
}

export interface RouteGuard {
  requiredRoles?: UserRole[];
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
}

export interface NavigationContextType {
  state: NavigationState;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void;
  addToHistory: (path: string) => void;
  clearHistory: () => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
}
