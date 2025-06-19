import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-solid border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        default: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-12 w-12 border-4',
      },
      variant: {
        default: 'border-primary-600',
        light: 'border-white',
        muted: 'border-gray-400',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string;
  center?: boolean;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, text, center = false, ...props }, ref) => {
    const Component = (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          center && 'justify-center min-h-[200px]',
          text && 'space-x-2',
          className
        )}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, variant }))} />
        {text && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {text}
          </span>
        )}
      </div>
    );

    if (center) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          {Component}
        </div>
      );
    }

    return Component;
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner; 