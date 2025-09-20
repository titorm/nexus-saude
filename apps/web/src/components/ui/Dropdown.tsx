import { cn } from '@/lib/utils';
import { forwardRef, useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  width?: 'auto' | 'trigger' | 'full';
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      isOpen,
      onClose,
      trigger,
      children,
      className,
      position = 'bottom-left',
      width = 'auto',
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [triggerWidth, setTriggerWidth] = useState(0);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, onClose]);

    useEffect(() => {
      if (containerRef.current && width === 'trigger') {
        const triggerElement = containerRef.current.firstElementChild;
        if (triggerElement) {
          setTriggerWidth(triggerElement.getBoundingClientRect().width);
        }
      }
    }, [width, isOpen]);

    const positionClasses = {
      'bottom-left': 'top-full left-0 mt-1',
      'bottom-right': 'top-full right-0 mt-1',
      'top-left': 'bottom-full left-0 mb-1',
      'top-right': 'bottom-full right-0 mb-1',
    };

    const widthStyles = {
      auto: {},
      trigger: { width: triggerWidth },
      full: { width: '100%' },
    };

    return (
      <div ref={containerRef} className="relative inline-block" {...props}>
        {trigger}

        {isOpen && (
          <div
            ref={ref}
            className={cn(
              'absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg',
              positionClasses[position],
              className
            )}
            style={widthStyles[width]}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
}

const DropdownItem = ({
  children,
  onClick,
  className,
  disabled = false,
  active = false,
}: DropdownItemProps) => {
  return (
    <div
      className={cn(
        'px-4 py-2 text-sm cursor-pointer transition-colors',
        {
          'bg-primary-50 text-primary-900': active && !disabled,
          'text-gray-900 hover:bg-gray-50': !active && !disabled,
          'text-gray-400 cursor-not-allowed': disabled,
        },
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
};

interface DropdownSeparatorProps {
  className?: string;
}

const DropdownSeparator = ({ className }: DropdownSeparatorProps) => {
  return <div className={cn('border-t border-gray-100 my-1', className)} />;
};

interface DropdownHeaderProps {
  children: ReactNode;
  className?: string;
}

const DropdownHeader = ({ children, className }: DropdownHeaderProps) => {
  return (
    <div
      className={cn(
        'px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide',
        className
      )}
    >
      {children}
    </div>
  );
};

export { Dropdown, DropdownItem, DropdownSeparator, DropdownHeader };

export type { DropdownProps, DropdownItemProps };
