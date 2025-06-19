import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Eye, EyeOff, AlertCircle, CheckCircle, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus-visible:ring-primary-400',
  {
    variants: {
      variant: {
        default: '',
        filled: 'bg-gray-50 border-gray-200 focus:bg-white dark:bg-gray-700 dark:border-gray-600',
        underlined: 'border-0 border-b-2 border-gray-300 rounded-none px-0 focus:border-primary-500 dark:border-gray-600',
      },
      inputSize: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: '',
        error: 'border-error-500 focus-visible:ring-error-500 dark:border-error-400',
        success: 'border-success-500 focus-visible:ring-success-500 dark:border-success-400',
        warning: 'border-warning-500 focus-visible:ring-warning-500 dark:border-warning-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      state,
      type = 'text',
      label,
      helperText,
      errorText,
      successText,
      leftIcon,
      rightIcon,
      isRequired,
      isLoading,
      showPasswordToggle,
      clearable,
      onClear,
      disabled,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalId] = React.useState(() => id || `input-${Math.random().toString(36).substr(2, 9)}`);
    
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;
    
    // Determine the actual state based on props
    const actualState = errorText ? 'error' : successText ? 'success' : state;
    
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon || isPassword || clearable || isLoading;
    
    const inputClasses = cn(
      inputVariants({ variant, inputSize, state: actualState }),
      hasLeftIcon && 'pl-10',
      hasRightIcon && 'pr-10',
      className
    );

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    const renderStatusIcon = () => {
      if (isLoading) {
        return (
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-primary-500 rounded-full" />
        );
      }
      
      if (errorText) {
        return <AlertCircle className="h-4 w-4 text-error-500" />;
      }
      
      if (successText) {
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      }
      
      return null;
    };

    const renderRightContent = () => {
      const elements = [];
      
      // Clear button (if clearable and has value)
      if (clearable && value && !disabled) {
        elements.push(
          <button
            key="clear"
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        );
      }
      
      // Password toggle
      if (isPassword && showPasswordToggle) {
        elements.push(
          <button
            key="password-toggle"
            type="button"
            onClick={togglePasswordVisibility}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        );
      }
      
      // Status icon
      const statusIcon = renderStatusIcon();
      if (statusIcon) {
        elements.push(
          <span key="status" className="pointer-events-none">
            {statusIcon}
          </span>
        );
      }
      
      // Custom right icon
      if (rightIcon && !statusIcon) {
        elements.push(
          <span key="custom" className="pointer-events-none text-gray-400">
            {rightIcon}
          </span>
        );
      }
      
      return elements;
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={internalId}
            className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            {label}
            {isRequired && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm">
                {leftIcon}
              </span>
            </div>
          )}
          
          <input
            id={internalId}
            ref={ref}
            type={actualType}
            className={inputClasses}
            disabled={disabled || isLoading}
            value={value}
            aria-invalid={!!errorText}
            aria-describedby={
              errorText ? `${internalId}-error` :
              successText ? `${internalId}-success` :
              helperText ? `${internalId}-helper` : undefined
            }
            {...props}
          />
          
          {hasRightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
              {renderRightContent()}
            </div>
          )}
        </div>
        
        {/* Helper/Error/Success text */}
        {(helperText || errorText || successText) && (
          <div className="mt-1 text-xs">
            {errorText && (
              <p id={`${internalId}-error`} className="text-error-600 dark:text-error-400">
                {errorText}
              </p>
            )}
            {successText && !errorText && (
              <p id={`${internalId}-success`} className="text-success-600 dark:text-success-400">
                {successText}
              </p>
            )}
            {helperText && !errorText && !successText && (
              <p id={`${internalId}-helper`} className="text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, searchDelay = 300, className, ...props }, ref) => {
    const [searchValue, setSearchValue] = React.useState(props.value || '');
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
      if (onSearch) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          onSearch(String(searchValue));
        }, searchDelay);
      }
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [searchValue, onSearch, searchDelay]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
      props.onChange?.(e);
    };

    const handleClear = () => {
      setSearchValue('');
      onSearch?.('');
      props.onClear?.();
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        placeholder="Search..."
        clearable
        className={cn('max-w-md', className)}
        value={searchValue}
        onChange={handleChange}
        onClear={handleClear}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Textarea component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  isRequired?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      errorText,
      successText,
      isRequired,
      resize = 'vertical',
      id,
      ...props
    },
    ref
  ) => {
    const [internalId] = React.useState(() => id || `textarea-${Math.random().toString(36).substr(2, 9)}`);
    const hasError = !!errorText;
    const hasSuccess = !!successText;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={internalId}
            className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
          >
            {label}
            {isRequired && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          id={internalId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400',
            hasError && 'border-error-500 focus-visible:ring-error-500',
            hasSuccess && 'border-success-500 focus-visible:ring-success-500',
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            errorText ? `${internalId}-error` :
            successText ? `${internalId}-success` :
            helperText ? `${internalId}-helper` : undefined
          }
          {...props}
        />
        
        {/* Helper/Error/Success text */}
        {(helperText || errorText || successText) && (
          <div className="mt-1 text-xs">
            {errorText && (
              <p id={`${internalId}-error`} className="text-error-600 dark:text-error-400">
                {errorText}
              </p>
            )}
            {successText && !errorText && (
              <p id={`${internalId}-success`} className="text-success-600 dark:text-success-400">
                {successText}
              </p>
            )}
            {helperText && !errorText && !successText && (
              <p id={`${internalId}-helper`} className="text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, inputVariants };
export default Input; 