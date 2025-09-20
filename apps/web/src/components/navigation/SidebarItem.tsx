import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NavigationItem } from '@/types/navigation';

interface SidebarItemProps {
  item: NavigationItem;
  isActive: boolean;
  isExpanded: boolean;
  level: number;
  compact: boolean;
  showBadge: boolean;
  onItemClick?: () => void;
}

export function SidebarItem({
  item,
  isActive,
  isExpanded,
  level = 0,
  compact = false,
  showBadge = true,
  onItemClick,
}: SidebarItemProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const hasChildren = item.children && item.children.length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      setLocalExpanded(!localExpanded);
    }
  };

  const ItemIcon = item.icon;
  const paddingLeft = level === 0 ? 'pl-3' : `pl-${3 + level * 4}`;

  return (
    <div className="w-full">
      {/* Item principal */}
      <div
        className={cn(
          'group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-lg transition-all duration-150',
          paddingLeft,
          isActive
            ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          compact && 'px-2 py-1'
        )}
      >
        {/* Link ou botão dependendo se tem filhos */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex items-center flex-1 text-left"
            aria-expanded={localExpanded}
          >
            <ItemIcon
              className={cn(
                'h-5 w-5 mr-3 flex-shrink-0',
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500',
                compact && 'mr-2'
              )}
            />
            {!compact && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {showBadge && item.badge && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.badge}
                  </span>
                )}
                <div className="ml-2">
                  {localExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </>
            )}
          </button>
        ) : (
          <Link to={item.path} className="flex items-center flex-1" onClick={onItemClick}>
            <ItemIcon
              className={cn(
                'h-5 w-5 mr-3 flex-shrink-0',
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500',
                compact && 'mr-2'
              )}
            />
            {!compact && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {showBadge && item.badge && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        )}
      </div>

      {/* Filhos (submenu) */}
      {hasChildren && localExpanded && !compact && (
        <div className="ml-4 mt-1 space-y-1">
          {item.children!.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              isActive={isActive && child.path === window.location.pathname}
              isExpanded={false}
              level={level + 1}
              compact={compact}
              showBadge={showBadge}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}

      {/* Tooltip para modo compacto */}
      {compact && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          {item.label}
          {item.description && <div className="text-gray-300 text-xs mt-1">{item.description}</div>}
        </div>
      )}
    </div>
  );
}
