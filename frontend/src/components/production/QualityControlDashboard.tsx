import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  FileText,
  Eye,
  Edit,
  Download,
  Upload,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Calendar,
  User,
  Flag,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { qualityApi } from '../../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface QualityCheck {
  id: string;
  orderId: string;
  orderNumber: string;
  checkName: string;
  description: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'requires_review';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  completedDate?: string;
  assignedTo: {
    id: string;
    name: string;
    role: string;
  };
  checkedBy?: {
    id: string;
    name: string;
    role: string;
  };
  criteria: Array<{
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'passed' | 'failed';
    notes?: string;
    photos: Array<{
      id: string;
      url: string;
      caption: string;
      timestamp: string;
    }>;
  }>;
  overallScore: number;
  notes: string;
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    timestamp: string;
    uploadedBy: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;
}

interface QualityMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  pendingChecks: number;
  averageScore: number;
  trendsData: Array<{
    date: string;
    passed: number;
    failed: number;
    score: number;
  }>;
}

interface QualityControlDashboardProps {
  manufacturerId?: string;
  className?: string;
}

const QualityControlDashboard: React.FC<QualityControlDashboardProps> = ({
  manufacturerId,
  className
}) => {
  const queryClient = useQueryClient();
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [trendDateFilter, setTrendDateFilter] = useState<string | null>(null);
  const [scoreRangeFilter, setScoreRangeFilter] = useState<string | null>(null);
  const [checkForm, setCheckForm] = useState({
    status: 'pending',
    notes: '',
    photos: [] as File[],
    criteriaResults: {} as Record<string, { status: string; notes: string }>
  });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  // Dropzone for photo uploads
  const {
    getRootProps: getDropzoneRootProps,
    getInputProps: getDropzoneInputProps
  } = useDropzone({
    onDrop: files => setNewPhotos(prev => [...prev, ...files])
  });

  // Fetch quality data
  const { data: qualityData, isLoading, refetch } = useQuery({
    queryKey: ['quality-dashboard', manufacturerId],
    queryFn: () => qualityApi.getDashboardData(manufacturerId),
    refetchInterval: 30000,
  });

  // Update quality check mutation
  const updateCheckMutation = useMutation({
    mutationFn: (data: { checkId: string; updates: any }) =>
      qualityApi.updateQualityCheck(data.checkId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-dashboard'] });
      toast.success('Quality check updated successfully');
      setShowCheckModal(false);
    },
    onError: () => {
      toast.error('Failed to update quality check');
    }
  });

  const uploadPhotosMutation = useMutation({
    mutationFn: (payload: { checkId: string; files: File[] }) => qualityApi.uploadCheckPhotos(payload.checkId, payload.files),
    onSuccess: () => {
      setNewPhotos([]);
      queryClient.invalidateQueries({ queryKey: ['quality-dashboard'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'requires_review':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredChecks = qualityData?.checks?.filter((check: QualityCheck) => {
    const matchesStatus = filterStatus === 'all' || check.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || check.priority === filterPriority;
    const matchesSearch = check.checkName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         check.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !trendDateFilter || format(parseISO(check.scheduledDate), 'MMM dd') === trendDateFilter;
    const matchesScore = !scoreRangeFilter || (() => {
      const score = check.overallScore;
      switch (scoreRangeFilter) {
        case '90-100': return score >= 90;
        case '80-89':  return score >= 80 && score < 90;
        case '70-79':  return score >= 70 && score < 80;
        case '60-69':  return score >= 60 && score < 70;
        case 'Below 60': return score < 60;
        default: return true;
      }
    })();
    return matchesStatus && matchesPriority && matchesSearch && matchesDate && matchesScore;
  }) || [];

  // Refs for charts (defined at component scope to satisfy React Hooks rules)
  const trendsChartRef = React.useRef<any>(null);
  const scoreChartRef = React.useRef<any>(null);

  const renderQualityTrends = () => {
    if (!qualityData?.metrics?.trendsData) return null;

    const chartData = {
      labels: qualityData.metrics.trendsData.map((item: any) => 
        format(parseISO(item.date), 'MMM dd')
      ),
      datasets: [
        {
          label: 'Passed',
          data: qualityData.metrics.trendsData.map((item: any) => item.passed),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
        },
        {
          label: 'Failed',
          data: qualityData.metrics.trendsData.map((item: any) => item.failed),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Quality Check Trends (click a point to filter)',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    };

    return (
      <div className="h-64">
        <Line
          ref={trendsChartRef}
          data={chartData}
          options={options}
          onClick={(evt) => {
            if (!trendsChartRef.current) return;
            const points = trendsChartRef.current.getElementsAtEventForMode((evt as any).native, 'nearest', { intersect: true }, true);
            if (points.length) {
              const idx = points[0].index;
              const label = chartData.labels[idx] as string;
              setTrendDateFilter(label === trendDateFilter ? null : label);
            }
          }}
        />
        {trendDateFilter && (
          <div className="text-sm text-gray-500 mt-2">Filtered by date: {trendDateFilter} <button className="underline" onClick={() => setTrendDateFilter(null)}>Clear</button></div>
        )}
      </div>
    );
  };

  const renderScoreDistribution = () => {
    if (!qualityData?.checks) return null;

    const scoreRanges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'Below 60': 0
    };

    qualityData.checks.forEach((check: QualityCheck) => {
      if (check.overallScore >= 90) scoreRanges['90-100']++;
      else if (check.overallScore >= 80) scoreRanges['80-89']++;
      else if (check.overallScore >= 70) scoreRanges['70-79']++;
      else if (check.overallScore >= 60) scoreRanges['60-69']++;
      else scoreRanges['Below 60']++;
    });

    const chartData = {
      labels: Object.keys(scoreRanges),
      datasets: [
        {
          data: Object.values(scoreRanges),
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        title: {
          display: true,
          text: 'Quality Score Distribution (click a bar to filter)',
        },
      },
    };

    return (
      <div className="h-64">
        <Bar
          ref={scoreChartRef}
          data={chartData}
          options={options}
          onClick={(evt) => {
            if (!scoreChartRef.current) return;
            const points = scoreChartRef.current.getElementsAtEventForMode((evt as any).native, 'nearest', { intersect: true }, true);
            if (points.length) {
              const idx = points[0].index;
              const label = chartData.labels[idx] as string;
              setScoreRangeFilter(label === scoreRangeFilter ? null : label);
            }
          }}
        />
        {scoreRangeFilter && (
          <div className="text-sm text-gray-500 mt-2">Filtered by score range: {scoreRangeFilter} <button className="underline" onClick={() => setScoreRangeFilter(null)}>Clear</button></div>
        )}
      </div>
    );
  };

  const handleCheckUpdate = async () => {
    if (!selectedCheck) return;
    const updates: any = {
      status: checkForm.status,
      notes: checkForm.notes,
      criteria_results: checkForm.criteriaResults,
    };

    try {
      await updateCheckMutation.mutateAsync({
        checkId: selectedCheck.id,
        updates,
      });

      if (newPhotos.length) {
        await uploadPhotosMutation.mutateAsync({ checkId: selectedCheck.id, files: newPhotos });
      }

      setShowCheckModal(false);
      toast.success('Quality check updated.');
    } catch {
      // Error handling via mutation onError
    }
  };

  const renderCheckModal = () => {
    if (!selectedCheck) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowCheckModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCheck.checkName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Order #{selectedCheck.orderNumber}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedCheck.priority)}`}>
                  {selectedCheck.priority}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCheck.status)}`}>
                  {selectedCheck.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Check Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <Select
                    value={checkForm.status}
                    onChange={(e) => setCheckForm({ ...checkForm, status: e.target.value })}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'passed', label: 'Passed' },
                      { value: 'failed', label: 'Failed' },
                      { value: 'requires_review', label: 'Requires Review' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <TextArea
                    value={checkForm.notes}
                    onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })}
                    placeholder="Add notes about this quality check..."
                    rows={4}
                  />
                </div>

                {/* Quality Criteria */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Quality Criteria ({selectedCheck.criteria.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedCheck.criteria.map(criterion => (
                      <div key={criterion.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                            {criterion.name}
                          </h5>
                          <Select
                            value={checkForm.criteriaResults[criterion.id]?.status || 'pending'}
                            onChange={(e) => setCheckForm({
                              ...checkForm,
                              criteriaResults: {
                                ...checkForm.criteriaResults,
                                [criterion.id]: {
                                  ...checkForm.criteriaResults[criterion.id],
                                  status: e.target.value,
                                  notes: checkForm.criteriaResults[criterion.id]?.notes || ''
                                }
                              }
                            })}
                            options={[
                              { value: 'pending', label: 'Pending' },
                              { value: 'passed', label: 'Passed' },
                              { value: 'failed', label: 'Failed' }
                            ]}
                            className="w-24"
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {criterion.description}
                        </p>
                        <Input
                          placeholder="Add notes for this criterion..."
                          value={checkForm.criteriaResults[criterion.id]?.notes || ''}
                          onChange={(e) => setCheckForm({
                            ...checkForm,
                            criteriaResults: {
                              ...checkForm.criteriaResults,
                              [criterion.id]: {
                                ...checkForm.criteriaResults[criterion.id],
                                status: checkForm.criteriaResults[criterion.id]?.status || 'pending',
                                notes: e.target.value
                              }
                            }
                          })}
                          className="text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photos and Documents */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Photos ({selectedCheck.photos.length})
                  </h4>
                  {selectedCheck.photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCheck.photos.map(photo => (
                        <div key={photo.id} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No photos uploaded yet</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Photos
                  </label>
                  <div {...getDropzoneRootProps({ className:'border-2 border-dashed p-4 text-center cursor-pointer' })}>
                    <input {...getDropzoneInputProps()} />
                    {newPhotos.length ? `${newPhotos.length} files selected` : 'Drag & drop or click to select'}
                  </div>
                </div>

                {selectedCheck.documents.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Documents ({selectedCheck.documents.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedCheck.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowCheckModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckUpdate}
              loading={updateCheckMutation.isPending}
            >
              Update Check
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  const metrics = qualityData?.metrics as QualityMetrics;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quality Control Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage quality checks with photo documentation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Checks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.totalChecks || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Passed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.passedChecks || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">
              {metrics ? Math.round((metrics.passedChecks / metrics.totalChecks) * 100) : 0}%
            </span>
            <span className="text-gray-500 ml-1">pass rate</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.failedChecks || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600">
              {metrics ? Math.round((metrics.failedChecks / metrics.totalChecks) * 100) : 0}%
            </span>
            <span className="text-gray-500 ml-1">failure rate</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.averageScore || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <Zap className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-purple-600">Quality target: 95%</span>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quality Trends
          </h3>
          {renderQualityTrends()}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Score Distribution
          </h3>
          {renderScoreDistribution()}
        </div>
      </div>

      {/* Quality Checks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quality Checks
            </h3>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search checks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'passed', label: 'Passed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'requires_review', label: 'Requires Review' }
                ]}
                className="w-36"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {filteredChecks.map((check: QualityCheck) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCheck(check);
                  setCheckForm({
                    status: check.status,
                    notes: check.notes,
                    photos: [],
                    criteriaResults: {}
                  });
                  setShowCheckModal(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {check.checkName}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(check.priority)}`}>
                        {check.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(check.status)}`}>
                        {check.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Order #{check.orderNumber} • Score: {check.overallScore}%
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        Scheduled: {format(parseISO(check.scheduledDate), 'MMM dd, yyyy')}
                      </span>
                      <span>
                        Assigned to: {check.assignedTo.name}
                      </span>
                      {check.photos.length > 0 && (
                        <span className="flex items-center">
                          <Camera className="h-3 w-3 mr-1" />
                          {check.photos.length} photos
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Check Modal */}
      {showCheckModal && renderCheckModal()}
    </div>
  );
};

export default QualityControlDashboard; 