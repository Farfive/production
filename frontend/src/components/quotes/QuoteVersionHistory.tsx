import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  GitBranch,
  Eye,
  Download,
  RotateCcw,
  Calendar,
  User,
  FileText,
  DollarSign,
  Clock,
  Package,
  ChevronDown,
  ChevronRight,
  Diff,
  Plus,
  Minus,
  Edit,
  GitCompare,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

interface QuoteVersion {
  id: number;
  version: string;
  quote_id: number;
  created_at: string;
  created_by: {
    id: number;
    name: string;
    role: string;
  };
  changes: {
    field: string;
    old_value: any;
    new_value: any;
    change_type: 'added' | 'modified' | 'removed';
  }[];
  data: {
    price: number;
    currency: string;
    delivery_days: number;
    description: string;
    breakdown: {
      materials: number;
      labor: number;
      overhead: number;
      shipping: number;
      taxes: number;
    };
    notes: string;
  };
  is_current: boolean;
  change_summary: string;
}

interface QuoteVersionHistoryProps {
  quoteId: number;
  className?: string;
}

const QuoteVersionHistory: React.FC<QuoteVersionHistoryProps> = ({
  quoteId,
  className
}) => {
  const queryClient = useQueryClient();
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch version history
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['quote-versions', quoteId],
    queryFn: () => quotesApi.getVersionHistory(quoteId),
  });

  // Revert to version mutation
  const revertMutation = useMutation({
    mutationFn: (versionId: number) => quotesApi.revertToVersion(quoteId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-versions', quoteId] });
      toast.success('Quote reverted successfully');
    },
    onError: () => {
      toast.error('Failed to revert quote');
    }
  });

  const handleVersionSelect = (versionId: number) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    } else {
      setSelectedVersions([selectedVersions[1], versionId]);
    }
  };

  const handleRevert = (versionId: number) => {
    if (window.confirm('Are you sure you want to revert to this version? This will create a new version with the reverted data.')) {
      revertMutation.mutate(versionId);
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-blue-600" />;
      default:
        return <Edit className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'added':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'removed':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'modified':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  const formatValue = (field: string, value: any) => {
    if (field.includes('price') || field.includes('cost') || field.includes('amount')) {
      return formatCurrency(value, 'USD');
    }
    if (field.includes('days') || field.includes('time')) {
      return `${value} days`;
    }
    return String(value);
  };

  const renderVersionComparison = () => {
    if (selectedVersions.length !== 2) return null;

    const [version1, version2] = selectedVersions.map(id => 
      versions.find(v => v.id === id)
    ).filter(Boolean) as QuoteVersion[];

    if (!version1 || !version2) return null;

    const fields = [
      { key: 'price', label: 'Price', format: (v: any) => formatCurrency(v, 'USD') },
      { key: 'delivery_days', label: 'Delivery Days', format: (v: any) => `${v} days` },
      { key: 'description', label: 'Description', format: (v: any) => v },
      { key: 'breakdown.materials', label: 'Materials Cost', format: (v: any) => formatCurrency(v, 'USD') },
      { key: 'breakdown.labor', label: 'Labor Cost', format: (v: any) => formatCurrency(v, 'USD') },
      { key: 'breakdown.overhead', label: 'Overhead Cost', format: (v: any) => formatCurrency(v, 'USD') },
      { key: 'notes', label: 'Notes', format: (v: any) => v || 'None' }
    ];

    const getValue = (obj: any, path: string) => {
      return path.split('.').reduce((o, p) => o?.[p], obj);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Version Comparison
          </h4>
          <Button
            variant="outline"
            onClick={() => setShowComparison(false)}
          >
            Close
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium text-gray-900 dark:text-white">Field</div>
          <div className="text-center">
            <div className="font-medium text-gray-900 dark:text-white">
              Version {version1.version}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(version1.created_at), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900 dark:text-white">
              Version {version2.version}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(version2.created_at), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>

          {fields.map(field => {
            const value1 = getValue(version1.data, field.key);
            const value2 = getValue(version2.data, field.key);
            const isDifferent = value1 !== value2;

            return (
              <React.Fragment key={field.key}>
                <div className="py-3 font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                </div>
                <div className={`py-3 px-3 rounded ${isDifferent ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                  {field.format(value1 as any)}
                </div>
                <div className={`py-3 px-3 rounded ${isDifferent ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  {field.format(value2 as any)}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <History className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Version History ({versions.length})
          </h3>
        </div>

        {selectedVersions.length === 2 && (
          <Button
            onClick={() => setShowComparison(true)}
            className="flex items-center space-x-2"
          >
            <GitCompare className="h-4 w-4" />
            <span>Compare Versions</span>
          </Button>
        )}
      </div>

      {/* Comparison View */}
      <AnimatePresence>
        {showComparison && renderVersionComparison()}
      </AnimatePresence>

      {/* Version List */}
      <div className="space-y-4">
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No version history available
            </p>
          </div>
        ) : (
          versions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-colors ${
                selectedVersions.includes(version.id)
                  ? 'border-primary-500'
                  : 'border-gray-200 dark:border-gray-700'
              } ${version.is_current ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version.id)}
                      onChange={() => handleVersionSelect(version.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />

                    {/* Version Info */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Version {version.version}
                        </span>
                        {version.is_current && (
                          <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Author and Date */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{version.created_by.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeTime(version.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedVersion(
                        expandedVersion === version.id ? null : version.id
                      )}
                    >
                      {expandedVersion === version.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    {!version.is_current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevert(version.id)}
                        loading={revertMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Revert
                      </Button>
                    )}

                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {version.change_summary}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="mt-3 flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span>{formatCurrency(version.data.price, version.data.currency)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{version.data.delivery_days} days</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Diff className="h-4 w-4 text-gray-400" />
                    <span>{version.changes.length} changes</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedVersion === version.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      {/* Changes */}
                      {version.changes.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                            Changes in this version:
                          </h5>
                          <div className="space-y-2">
                            {version.changes.map((change: any, changeIndex: number) => (
                              <div
                                key={changeIndex}
                                className={`flex items-center space-x-3 p-3 rounded-lg border ${getChangeColor(change.change_type)}`}
                              >
                                {getChangeIcon(change.change_type)}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {change.field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </div>
                                  <div className="text-sm">
                                    {change.change_type === 'added' && (
                                      <span>Added: {formatValue(change.field, change.new_value)}</span>
                                    )}
                                    {change.change_type === 'removed' && (
                                      <span>Removed: {formatValue(change.field, change.old_value)}</span>
                                    )}
                                    {change.change_type === 'modified' && (
                                      <span>
                                        Changed from {formatValue(change.field, change.old_value)} to {formatValue(change.field, change.new_value)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full Data Preview */}
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                          Version Data:
                        </h5>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Price:</span> {formatCurrency(version.data.price, version.data.currency)}
                            </div>
                            <div>
                              <span className="font-medium">Delivery:</span> {version.data.delivery_days} days
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium">Description:</span>
                              <p className="mt-1 text-gray-600 dark:text-gray-400">{version.data.description}</p>
                            </div>
                            {version.data.notes && (
                              <div className="col-span-2">
                                <span className="font-medium">Notes:</span>
                                <p className="mt-1 text-gray-600 dark:text-gray-400">{version.data.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuoteVersionHistory; 