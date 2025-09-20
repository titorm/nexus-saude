import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'search' | 'filter';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, variant = 'default', size = 'md', error, leftIcon, rightIcon, disabled, ...props },
    ref
  ) => {
    const baseClasses =
      'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors';

    const variants = {
      default: 'bg-white text-gray-900 placeholder-gray-500',
      search: 'bg-white text-gray-900 placeholder-gray-400 border-gray-200 shadow-sm',
      filter: 'bg-gray-50 text-gray-700 placeholder-gray-400 border-gray-200',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const paddingWithIcons = {
      sm: {
        left: leftIcon ? 'pl-8' : '',
        right: rightIcon ? 'pr-8' : '',
      },
      md: {
        left: leftIcon ? 'pl-10' : '',
        right: rightIcon ? 'pr-10' : '',
      },
      lg: {
        left: leftIcon ? 'pl-12' : '',
        right: rightIcon ? 'pr-12' : '',
      },
    };

    const errorStyles = error ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : '';

    return (
      <div className="relative">
        {leftIcon && (
          <div
            className={cn(
              'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400',
              iconSizes[size]
            )}
          >
            {leftIcon}
          </div>
        )}

        <input
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            paddingWithIcons[size].left,
            paddingWithIcons[size].right,
            errorStyles,
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />

        {rightIcon && (
          <div
            className={cn(
              'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400',
              iconSizes[size]
            )}
          >
            {rightIcon}
          </div>
        )}

        {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
