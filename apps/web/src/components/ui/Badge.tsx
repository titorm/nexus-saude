import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = ({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full border';

  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-primary-100 text-primary-800 border-primary-200',
    success: 'bg-success-100 text-success-800 border-success-200',
    warning: 'bg-warning-100 text-warning-800 border-warning-200',
    error: 'bg-error-100 text-error-800 border-error-200',
    secondary: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <div className={cn(baseClasses, variants[variant], sizes[size], className)} {...props}>
      {children}
    </div>
  );
};

export { Badge };
export type { BadgeProps };
