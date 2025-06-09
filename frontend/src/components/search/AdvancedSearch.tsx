import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
  Calendar,
  DollarSign,
  Package,
  User,
  MapPin,
  Tag,
  Download,
  RefreshCw,
  ChevronDown,
  Check,
  Sliders
} from 'lucide-react';
import { format, subDays } from 'date-fns';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Order, OrderStatus, CapabilityCategory, UrgencyLevel } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date-range' | 'boolean';
  options?: FilterOption[];
  min?: number;
  max?: number;
}

interface SortOption {
  id: string;
  label: string;
  field: string;
  direction: 'asc' | 'desc';
}

interface AdvancedSearchProps {
  data: Order[];
  onFilteredDataChange: (filteredData: Order[]) => void;
  onExport?: (data: Order[]) => void;
  className?: string;
  placeholder?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  data,
  onFilteredDataChange,
  onExport,
  className,
  placeholder = "Search orders by title, ID, client, or description..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption>({
    id: 'createdAt',
    label: 'Created Date',
    field: 'createdAt',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Define filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'multiselect',
      options: Object.values(OrderStatus).map(status => ({
        id: status,
        label: status.replace('_', ' '),
        value: status,
        count: data.filter(order => order.status === status).length
      }))
    },
    {
      id: 'category',
      label: 'Category',
      type: 'multiselect',
      options: Object.values(CapabilityCategory).map(category => ({
        id: category,
        label: category.replace('_', ' '),
        value: category,
        count: data.filter(order => order.category === category).length
      }))
    },
    {
      id: 'urgency',
      label: 'Urgency',
      type: 'multiselect',
      options: Object.values(UrgencyLevel).map(urgency => ({
        id: urgency,
        label: urgency,
        value: urgency,
        count: data.filter(order => order.urgency === urgency).length
      }))
    },
    {
      id: 'totalAmount',
      label: 'Order Value',
      type: 'range',
      min: 0,
      max: Math.max(...data.map(order => order.totalAmount || 0))
    },
    {
      id: 'quantity',
      label: 'Quantity',
      type: 'range',
      min: 1,
      max: Math.max(...data.map(order => order.quantity))
    },
    {
      id: 'deliveryDate',
      label: 'Delivery Date',
      type: 'date-range'
    },
    {
      id: 'createdAt',
      label: 'Created Date',
      type: 'date-range'
    },
    {
      id: 'hasManufacturer',
      label: 'Has Manufacturer',
      type: 'boolean'
    }
  ];

  // Sort options
  const sortOptions: SortOption[] = [
    { id: 'createdAt-desc', label: 'Newest First', field: 'createdAt', direction: 'desc' },
    { id: 'createdAt-asc', label: 'Oldest First', field: 'createdAt', direction: 'asc' },
    { id: 'deliveryDate-asc', label: 'Delivery Date (Earliest)', field: 'deliveryDate', direction: 'asc' },
    { id: 'deliveryDate-desc', label: 'Delivery Date (Latest)', field: 'deliveryDate', direction: 'desc' },
    { id: 'totalAmount-desc', label: 'Highest Value', field: 'totalAmount', direction: 'desc' },
    { id: 'totalAmount-asc', label: 'Lowest Value', field: 'totalAmount', direction: 'asc' },
    { id: 'quantity-desc', label: 'Highest Quantity', field: 'quantity', direction: 'desc' },
    { id: 'quantity-asc', label: 'Lowest Quantity', field: 'quantity', direction: 'asc' },
    { id: 'title-asc', label: 'Title (A-Z)', field: 'title', direction: 'asc' },
    { id: 'title-desc', label: 'Title (Z-A)', field: 'title', direction: 'desc' }
  ];

  // Quick filters
  const quickFilters = [
    {
      id: 'pending',
      label: 'Pending Orders',
      filters: { status: [OrderStatus.PENDING] }
    },
    {
      id: 'urgent',
      label: 'Urgent Orders',
      filters: { urgency: [UrgencyLevel.URGENT] }
    },
    {
      id: 'this-week',
      label: 'Due This Week',
      filters: {
        deliveryDate: {
          start: format(new Date(), 'yyyy-MM-dd'),
          end: format(subDays(new Date(), -7), 'yyyy-MM-dd')
        }
      }
    },
    {
      id: 'high-value',
      label: 'High Value (>$10k)',
      filters: {
        totalAmount: { min: 10000, max: Infinity }
      }
    }
  ];

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.title.toLowerCase().includes(searchLower) ||
        order.id.toLowerCase().includes(searchLower) ||
        order.description?.toLowerCase().includes(searchLower) ||
        order.client?.companyName?.toLowerCase().includes(searchLower) ||
        order.manufacturer?.companyName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([filterId, filterValue]) => {
      const filterGroup = filterGroups.find(g => g.id === filterId);
      if (!filterGroup || !filterValue) return;

      switch (filterGroup.type) {
        case 'multiselect':
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            filtered = filtered.filter(order =>
              filterValue.includes((order as any)[filterId])
            );
          }
          break;

        case 'range':
          if (filterValue.min !== undefined || filterValue.max !== undefined) {
            filtered = filtered.filter(order => {
              const value = (order as any)[filterId] || 0;
              const min = filterValue.min ?? 0;
              const max = filterValue.max ?? Infinity;
              return value >= min && value <= max;
            });
          }
          break;

        case 'date-range':
          if (filterValue.start || filterValue.end) {
            filtered = filtered.filter(order => {
              const orderDate = new Date((order as any)[filterId]);
              const startDate = filterValue.start ? new Date(filterValue.start) : new Date(0);
              const endDate = filterValue.end ? new Date(filterValue.end) : new Date();
              return orderDate >= startDate && orderDate <= endDate;
            });
          }
          break;

        case 'boolean':
          if (filterValue !== undefined) {
            filtered = filtered.filter(order => {
              if (filterId === 'hasManufacturer') {
                return filterValue ? !!order.manufacturer : !order.manufacturer;
              }
              return Boolean((order as any)[filterId]) === filterValue;
            });
          }
          break;
      }
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = (a as any)[sortBy.field];
      const bValue = (b as any)[sortBy.field];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = (aValue || 0) - (bValue || 0);
      }

      return sortBy.direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [data, searchTerm, activeFilters, sortBy, filterGroups]);

  // Update filtered data when it changes
  React.useEffect(() => {
    onFilteredDataChange(filteredAndSortedData);
  }, [filteredAndSortedData, onFilteredDataChange]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm('');
  }, []);

  const applyQuickFilter = useCallback((quickFilter: typeof quickFilters[0]) => {
    setActiveFilters(prev => ({
      ...prev,
      ...quickFilter.filters
    }));
  }, []);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(filteredAndSortedData);
    }
  }, [onExport, filteredAndSortedData]);

  const renderFilterGroup = (group: FilterGroup) => {
    const value = activeFilters[group.id];

    switch (group.type) {
      case 'multiselect':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {group.label}
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {group.options?.map(option => (
                <label key={option.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      const newValue = e.target.checked
                        ? [...currentValue, option.value]
                        : currentValue.filter(v => v !== option.value);
                      handleFilterChange(group.id, newValue.length > 0 ? newValue : undefined);
                    }}
                    className="form-checkbox"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {option.label} ({option.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {group.label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={value?.min || ''}
                onChange={(e) => {
                  const min = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleFilterChange(group.id, { ...value, min });
                }}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Max"
                value={value?.max || ''}
                onChange={(e) => {
                  const max = e.target.value ? parseFloat(e.target.value) : undefined;
                  handleFilterChange(group.id, { ...value, max });
                }}
                className="text-sm"
              />
            </div>
          </div>
        );

      case 'date-range':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {group.label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={value?.start || ''}
                onChange={(e) => {
                  handleFilterChange(group.id, { ...value, start: e.target.value });
                }}
                className="text-sm"
              />
              <Input
                type="date"
                value={value?.end || ''}
                onChange={(e) => {
                  handleFilterChange(group.id, { ...value, end: e.target.value });
                }}
                className="text-sm"
              />
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {group.label}
            </label>
            <div className="space-y-1">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={group.id}
                  checked={value === true}
                  onChange={() => handleFilterChange(group.id, true)}
                  className="form-radio"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={group.id}
                  checked={value === false}
                  onChange={() => handleFilterChange(group.id, false)}
                  className="form-radio"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">No</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={group.id}
                  checked={value === undefined}
                  onChange={() => handleFilterChange(group.id, undefined)}
                  className="form-radio"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">All</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )
            }
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
          
          <Select
            value={sortBy.id}
            onChange={(e) => {
              const option = sortOptions.find(opt => opt.id === e.target.value);
              if (option) setSortBy(option);
            }}
            options={sortOptions.map(option => ({
              value: option.id,
              label: option.label
            }))}
            leftIcon={sortBy.direction === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
          />
          
          {onExport && (
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export ({filteredAndSortedData.length})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map(quickFilter => (
          <Button
            key={quickFilter.id}
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter(quickFilter)}
          >
            {quickFilter.label}
          </Button>
        ))}
        
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            leftIcon={<X className="w-4 h-4" />}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([filterId, filterValue]) => {
            const group = filterGroups.find(g => g.id === filterId);
            if (!group || !filterValue) return null;

            let displayValue = '';
            if (Array.isArray(filterValue)) {
              displayValue = filterValue.join(', ');
            } else if (typeof filterValue === 'object') {
              if (filterValue.start && filterValue.end) {
                displayValue = `${filterValue.start} to ${filterValue.end}`;
              } else if (filterValue.min !== undefined || filterValue.max !== undefined) {
                displayValue = `${filterValue.min || 0} - ${filterValue.max || '∞'}`;
              }
            } else {
              displayValue = String(filterValue);
            }

            return (
              <motion.div
                key={filterId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
              >
                <span className="font-medium">{group.label}:</span>
                <span className="ml-1">{displayValue}</span>
                <button
                  onClick={() => removeFilter(filterId)}
                  className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Advanced Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                rightIcon={<ChevronDown className={cn(
                  'w-4 h-4 transition-transform',
                  showAdvanced && 'rotate-180'
                )} />}
              >
                {showAdvanced ? 'Show Less' : 'Show More'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterGroups.slice(0, showAdvanced ? undefined : 4).map(group => (
                <div key={group.id}>
                  {renderFilterGroup(group)}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredAndSortedData.length} of {data.length} orders
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div>
          {filteredAndSortedData.length === data.length ? (
            `Showing all ${data.length} orders`
          ) : (
            `Showing ${filteredAndSortedData.length} of ${data.length} orders`
          )}
        </div>
        <div className="flex items-center space-x-4">
          <span>
            Total Value: {formatCurrency(
              filteredAndSortedData.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-3 h-3" />}
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch; 