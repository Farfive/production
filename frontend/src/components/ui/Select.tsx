import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const selectVariants = cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  options: SelectOption[];
  placeholder?: string;
  isRequired?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      errorText,
      options,
      placeholder,
      isRequired,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(errorText);
    const selectVariant = hasError ? 'error' : variant;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {isRequired && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500">{leftIcon}</span>
            </div>
          )}
          
          <select
            className={cn(
              selectVariants({ variant: selectVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              'appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon || <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
          </div>
        </div>
        
        {(helperText || errorText) && (
          <div className="mt-1 flex items-center">
            {hasError && <AlertCircle className="h-4 w-4 text-error-500 mr-1" />}
            <p
              className={cn(
                'text-xs',
                hasError
                  ? 'text-error-500'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {errorText || helperText}
            </p>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select; 