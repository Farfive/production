import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-800',
        destructive: 'bg-error-600 text-white hover:bg-error-700 focus:bg-error-700 active:bg-error-800',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        link: 'text-primary-600 underline-offset-4 hover:underline focus:underline',
        success: 'bg-success-600 text-white hover:bg-success-700 focus:bg-success-700 active:bg-success-800',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:bg-warning-700 active:bg-warning-800',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        xl: 'h-12 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: React.ComponentType<any> | string;
  to?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      as: Component = 'button',
      to,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    
    // If we have an 'as' prop or 'to' prop, render as the specified component
    if (Component !== 'button' || to) {
      const ComponentToRender = Component as any;
      return (
        <ComponentToRender
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          disabled={isDisabled}
          to={to}
          {...props}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {!loading && leftIcon && (
            <span className="mr-2 flex items-center">
              {leftIcon}
            </span>
          )}
          {loading && loadingText ? loadingText : children}
          {!loading && rightIcon && (
            <span className="ml-2 flex items-center">
              {rightIcon}
            </span>
          )}
        </ComponentToRender>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex items-center">
            {leftIcon}
          </span>
        )}
        {loading && loadingText ? loadingText : children}
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon Button component for cleaner icon-only buttons
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'icon', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn('flex-shrink-0', className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Button Group component for grouped buttons
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'outline' | 'solid';
  size?: 'sm' | 'default' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = 'outline', size = 'default', orientation = 'horizontal', children, ...props }, ref) => {
    const isVertical = orientation === 'vertical';
    
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          isVertical ? 'flex-col' : 'flex-row',
          variant === 'outline' && 'border border-gray-300 rounded-md overflow-hidden dark:border-gray-600',
          variant === 'solid' && 'bg-gray-100 rounded-md p-1 dark:bg-gray-800',
          className
        )}
        role="group"
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Button) {
            return React.cloneElement(child as React.ReactElement<ButtonProps>, {
              className: cn(
                child.props.className,
                variant === 'outline' && [
                  'border-0 rounded-none',
                  !isVertical && index > 0 && 'border-l border-gray-300 dark:border-gray-600',
                  isVertical && index > 0 && 'border-t border-gray-300 dark:border-gray-600',
                ],
                variant === 'solid' && 'bg-transparent hover:bg-white dark:hover:bg-gray-700'
              ),
              size: child.props.size || size,
            });
          }
          return child;
        })}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

// Loading Button component with built-in loading state management
export interface LoadingButtonProps extends ButtonProps {
  asyncOnClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ asyncOnClick, onClick, loading: externalLoading, ...props }, ref) => {
    const [internalLoading, setInternalLoading] = React.useState(false);
    
    const isLoading = externalLoading || internalLoading;
    
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (asyncOnClick) {
        setInternalLoading(true);
        try {
          await asyncOnClick(event);
        } catch (error) {
          console.error('Button async click error:', error);
        } finally {
          setInternalLoading(false);
        }
      } else if (onClick) {
        onClick(event);
      }
    };
    
    return (
      <Button
        ref={ref}
        loading={isLoading}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

export { Button, buttonVariants };
export default Button; 