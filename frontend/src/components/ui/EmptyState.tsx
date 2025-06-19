import React from 'react';
import Button from './Button';
import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Lightweight reusable empty-state component.
 * Shows a message when a list is empty and (optionally) a retry button.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  description = 'No data available.',
  retryLabel = 'Retry',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4 w-full">
    <RefreshCw className="h-12 w-12 text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">{description}</p>
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {retryLabel}
      </Button>
    )}
  </div>
);

export default EmptyState; 