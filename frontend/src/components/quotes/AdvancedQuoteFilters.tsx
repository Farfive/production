import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Search,
  X,
  Plus,
  Save,
  Bookmark,
  Calendar,
  DollarSign,
  Clock,
  User,
  Building2,
  Tag,
  SlidersHorizontal,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { quotesApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface FilterCriteria {
  search?: string;
  status?: string[];
  price_min?: number;
  price_max?: number;
  date_from?: string;
  date_to?: string;
  manufacturer_ids?: number[];
  materials?: string[];
  processes?: string[];
  delivery_min?: number;
  delivery_max?: number;
  urgency?: string[];
  tags?: string[];
  created_by?: number[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface SavedFilter {
  id: number;
  name: string;
  criteria: FilterCriteria;
  is_public: boolean;
  created_at: string;
  usage_count: number;
}

interface AdvancedQuoteFiltersProps {
  onFiltersChange: (criteria: FilterCriteria) => void;
  initialFilters?: FilterCriteria;
  className?: string;
}

const AdvancedQuoteFilters: React.FC<AdvancedQuoteFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  className
}) => {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(initialFilters);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Fetch saved filters
  const { data: savedFilters = [] } = useQuery({
    queryKey: ['saved-quote-filters'],
    queryFn: () => quotesApi.getSavedFilters(),
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['quote-filter-options'],
    queryFn: () => quotesApi.getFilterOptions(),
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: (data: { name: string; criteria: FilterCriteria; is_public: boolean }) =>
      quotesApi.saveFilter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-quote-filters'] });
      setShowSaveDialog(false);
      setFilterName('');
    }
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: (filterId: number) => quotesApi.deleteFilter(filterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-quote-filters'] });
    }
  });

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addArrayFilter = (key: keyof FilterCriteria, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: [...(prev[key] as any[] || []), value]
    }));
  };

  const removeArrayFilter = (key: keyof FilterCriteria, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as any[] || []).filter(item => item !== value)
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.criteria);
    setIsExpanded(true);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    
    saveFilterMutation.mutate({
      name: filterName,
      criteria: filters,
      is_public: isPublic
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '';
    }).length;
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'price', label: 'Price' },
    { value: 'delivery_days', label: 'Delivery Time' },
    { value: 'status', label: 'Status' }
  ];

  const quickDateFilters = [
    { label: 'Today', value: () => ({ date_from: format(new Date(), 'yyyy-MM-dd'), date_to: format(new Date(), 'yyyy-MM-dd') }) },
    { label: 'Last 7 days', value: () => ({ date_from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), date_to: format(new Date(), 'yyyy-MM-dd') }) },
    { label: 'Last 30 days', value: () => ({ date_from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), date_to: format(new Date(), 'yyyy-MM-dd') }) },
    { label: 'This month', value: () => ({ date_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), date_to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filters
            </h3>
            {getActiveFilterCount() > 0 && (
              <span className="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 text-xs px-2 py-1 rounded-full">
                {getActiveFilterCount()} active
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={getActiveFilterCount() === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quotes..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Bookmark className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Saved Filters
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((savedFilter: SavedFilter) => (
                <button
                  key={savedFilter.id}
                  onClick={() => loadSavedFilter(savedFilter)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {savedFilter.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFilterMutation.mutate(savedFilter.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-6">
              {/* Status and Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(filters.status || []).includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              addArrayFilter('status', option.value);
                            } else {
                              removeArrayFilter('status', option.value);
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Urgency
                  </label>
                  <div className="space-y-2">
                    {urgencyOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(filters.urgency || []).includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              addArrayFilter('urgency', option.value);
                            } else {
                              removeArrayFilter('urgency', option.value);
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Min price"
                    value={filters.price_min || ''}
                    onChange={(e) => updateFilter('price_min', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Max price"
                    value={filters.price_max || ''}
                    onChange={(e) => updateFilter('price_max', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {quickDateFilters.map(quickFilter => (
                      <button
                        key={quickFilter.label}
                        onClick={() => {
                          const dateRange = quickFilter.value();
                          updateFilter('date_from', dateRange.date_from);
                          updateFilter('date_to', dateRange.date_to);
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        {quickFilter.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      placeholder="From date"
                      value={filters.date_from || ''}
                      onChange={(e) => updateFilter('date_from', e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="To date"
                      value={filters.date_to || ''}
                      onChange={(e) => updateFilter('date_to', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Time (days)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Min days"
                    value={filters.delivery_min || ''}
                    onChange={(e) => updateFilter('delivery_min', e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Max days"
                    value={filters.delivery_max || ''}
                    onChange={(e) => updateFilter('delivery_max', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Materials and Processes */}
              {filterOptions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Materials
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {filterOptions.materials?.map((material: string) => (
                        <label key={material} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={(filters.materials || []).includes(material)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addArrayFilter('materials', material);
                              } else {
                                removeArrayFilter('materials', material);
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {material}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Processes
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {filterOptions.processes?.map((process: string) => (
                        <label key={process} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={(filters.processes || []).includes(process)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addArrayFilter('processes', process);
                              } else {
                                removeArrayFilter('processes', process);
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {process}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sorting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={filters.sort_by || 'created_at'}
                    onChange={(value) => updateFilter('sort_by', value)}
                    options={sortOptions}
                  />
                  <Select
                    value={filters.sort_order || 'desc'}
                    onChange={(value) => updateFilter('sort_order', value)}
                    options={[
                      { value: 'asc', label: 'Ascending' },
                      { value: 'desc', label: 'Descending' }
                    ]}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={getActiveFilterCount() === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Filter
                </Button>

                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Filter Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Save Filter
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Filter Name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Enter filter name..."
                />
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Make this filter public (visible to all users)
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFilter}
                  disabled={!filterName.trim() || saveFilterMutation.isPending}
                  loading={saveFilterMutation.isPending}
                >
                  Save Filter
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedQuoteFilters; 