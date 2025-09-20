import { Link } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { cn } from '@/utils/cn';

interface BreadcrumbsProps {
  className?: string;
  maxItems?: number;
}

export function Breadcrumbs({ className, maxItems = 5 }: BreadcrumbsProps) {
  const { breadcrumbs } = useBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  // Limitar número de items se especificado
  const displayBreadcrumbs =
    breadcrumbs.length > maxItems
      ? [
          breadcrumbs[0], // Sempre mostrar "Início"
          { label: '...', path: '', isCurrentPage: false },
          ...breadcrumbs.slice(-maxItems + 2),
        ]
      : breadcrumbs;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm text-gray-600', className)}
    >
      <ol className="flex items-center space-x-1">
        {displayBreadcrumbs.map((crumb, index) => (
          <li key={crumb.path || index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" aria-hidden="true" />
            )}

            {crumb.label === '...' ? (
              <span className="text-gray-400">...</span>
            ) : crumb.isCurrentPage ? (
              <span className="font-medium text-gray-900 truncate max-w-xs" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-150 truncate max-w-xs"
              >
                {index === 0 && crumb.label === 'Início' ? (
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{crumb.label}</span>
                  </div>
                ) : (
                  crumb.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
