import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { pathLabels } from '@/utils/navigation';
import type { BreadcrumbItem } from '@/types/navigation';

export function useBreadcrumbs() {
  const location = useLocation();
  const { state, updateBreadcrumbs, addToHistory } = useNavigation();

  useEffect(() => {
    const pathname = location.pathname;

    // Adicionar à história
    addToHistory(pathname);

    // Gerar breadcrumbs baseado no caminho atual
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Sempre adicionar "Início" se não estiver na página inicial
    if (pathname !== '/') {
      breadcrumbs.push({
        label: 'Início',
        path: '/',
        isCurrentPage: false,
      });
    }

    // Construir breadcrumbs para cada segmento do caminho
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Obter rótulo do segmento
      let label = pathLabels[currentPath] || segment;

      // Se for um ID numérico, tentar obter um nome mais descritivo
      if (/^\d+$/.test(segment)) {
        const parentPath = pathSegments.slice(0, index).join('/');
        if (parentPath.includes('patients')) {
          label = `Paciente #${segment}`;
        } else if (parentPath.includes('appointments')) {
          label = `Consulta #${segment}`;
        } else {
          label = `#${segment}`;
        }
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        isCurrentPage: isLast,
        params: /^\d+$/.test(segment) ? { id: segment } : undefined,
      });
    });

    updateBreadcrumbs(breadcrumbs);
  }, [location.pathname, addToHistory, updateBreadcrumbs]);

  return {
    breadcrumbs: state.breadcrumbs,
    currentPath: state.currentPath,
  };
}
