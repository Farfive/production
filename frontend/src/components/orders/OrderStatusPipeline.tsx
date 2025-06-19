import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  MapPin,
  Calendar,
  Camera,
  FileText,
  User,
  MessageSquare,
  Edit,
  Eye,
  Download,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Target,
  Zap,
  Activity,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ordersApi } from '../../lib/api';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

interface OrderStatus {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  order: number;
  estimatedDuration: number; // in days
}

interface OrderMilestone {
  id: string;
  orderId: string;
  statusId: string;
  title: string;
  description: string;
  completedAt?: string;
  completedBy?: {
    id: string;
    name: string;
    role: string;
  };
  estimatedDate: string;
  actualDate?: string;
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;
  notes: string;
  qualityChecks: Array<{
    id: string;
    checkName: string;
    status: 'pending' | 'passed' | 'failed';
    notes: string;
    checkedBy?: string;
    checkedAt?: string;
  }>;
  progressPercentage: number;
}

interface Order {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  currentStatus: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  manufacturer: {
    id: string;
    name: string;
    email: string;
  };
  totalAmount: number;
  currency: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  createdAt: string;
  updatedAt: string;
  milestones: OrderMilestone[];
  overallProgress: number;
  isDelayed: boolean;
  delayReason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface OrderStatusPipelineProps {
  orderId: string;
  className?: string;
  onStatusUpdate?: (newStatus: string) => void;
}

const OrderStatusPipeline: React.FC<OrderStatusPipelineProps> = ({
  orderId,
  className,
  onStatusUpdate
}) => {
  const queryClient = useQueryClient();
  const [selectedMilestone, setSelectedMilestone] = useState<OrderMilestone | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    notes: '',
    progressPercentage: 0,
    photos: [] as File[],
    documents: [] as File[]
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const orderStatuses: OrderStatus[] = [
    {
      id: 'confirmed',
      name: 'Order Confirmed',
      description: 'Order has been confirmed and payment received',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      order: 1,
      estimatedDuration: 1
    },
    {
      id: 'in_production',
      name: 'In Production',
      description: 'Manufacturing process has started',
      icon: Play,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      order: 2,
      estimatedDuration: 14
    },
    {
      id: 'quality_check',
      name: 'Quality Control',
      description: 'Product undergoing quality inspection',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      order: 3,
      estimatedDuration: 2
    },
    {
      id: 'packaging',
      name: 'Packaging',
      description: 'Product being prepared for shipment',
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      order: 4,
      estimatedDuration: 1
    },
    {
      id: 'shipped',
      name: 'Shipped',
      description: 'Product has been shipped to customer',
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      order: 5,
      estimatedDuration: 3
    },
    {
      id: 'delivered',
      name: 'Delivered',
      description: 'Product successfully delivered to customer',
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      order: 6,
      estimatedDuration: 0
    }
  ];

  // Fetch order details
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrderDetails(orderId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: (data: { milestoneId: string; updates: any }) =>
      ordersApi.updateMilestone(data.milestoneId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Milestone updated successfully');
      setShowUpdateModal(false);
      setSelectedMilestone(null);
      if (onStatusUpdate) {
        onStatusUpdate(order?.currentStatus || '');
      }
    },
    onError: () => {
      toast.error('Failed to update milestone');
    }
  });

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: (data: { milestoneId: string; files: File[]; type: 'photos' | 'documents' }) =>
      ordersApi.uploadMilestoneFiles(data.milestoneId, data.files, data.type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Files uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload files');
    }
  });

  const getCurrentStatusIndex = () => {
    if (!order) return 0;
    return orderStatuses.findIndex(status => status.id === order.currentStatus);
  };

  const getStatusProgress = (statusIndex: number, currentIndex: number) => {
    if (statusIndex < currentIndex) return 100;
    if (statusIndex === currentIndex) return order?.overallProgress || 0;
    return 0;
  };

  const handleMilestoneUpdate = () => {
    if (!selectedMilestone) return;

    const updates = {
      notes: updateForm.notes,
      progressPercentage: updateForm.progressPercentage,
    };

    updateMilestoneMutation.mutate({
      milestoneId: selectedMilestone.id,
      updates
    });

    // Upload files if any
    if (updateForm.photos.length > 0) {
      uploadFilesMutation.mutate({
        milestoneId: selectedMilestone.id,
        files: updateForm.photos,
        type: 'photos'
      });
    }

    if (updateForm.documents.length > 0) {
      uploadFilesMutation.mutate({
        milestoneId: selectedMilestone.id,
        files: updateForm.documents,
        type: 'documents'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderMilestoneModal = () => {
    if (!selectedMilestone) return null;

    return (
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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedMilestone.title}
            </h3>
            <Button variant="ghost" onClick={() => setSelectedMilestone(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Milestone Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Progress
                  </h4>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedMilestone.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedMilestone.progressPercentage}%
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Estimated:</span>
                      <span>{format(parseISO(selectedMilestone.estimatedDate), 'MMM dd, yyyy')}</span>
                    </div>
                    {selectedMilestone.actualDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Actual:</span>
                        <span>{format(parseISO(selectedMilestone.actualDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedMilestone.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMilestone.notes}
                    </p>
                  </div>
                )}

                {/* Quality Checks */}
                {selectedMilestone.qualityChecks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Quality Checks
                    </h4>
                    <div className="space-y-2">
                      {selectedMilestone.qualityChecks.map(check => (
                        <div key={check.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm">{check.checkName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            check.status === 'passed' ? 'bg-green-100 text-green-800' :
                            check.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {check.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Photos and Documents */}
              <div className="space-y-4">
                {/* Photos */}
                {selectedMilestone.photos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Photos ({selectedMilestone.photos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedMilestone.photos.slice(0, 6).map(photo => (
                        <div
                          key={photo.id}
                          className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedPhotos([photo.url]);
                            setShowPhotoModal(true);
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {selectedMilestone.photos.length > 6 && (
                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            +{selectedMilestone.photos.length - 6} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedMilestone.documents.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Documents ({selectedMilestone.documents.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedMilestone.documents.map(doc => (
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
        </motion.div>
      </motion.div>
    );
  };

  const renderUpdateModal = () => {
    if (!showUpdateModal || !selectedMilestone) return null;

    return (
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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Update Milestone
            </h3>
            <Button variant="ghost" onClick={() => setShowUpdateModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress Percentage
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={updateForm.progressPercentage}
                onChange={(e) => setUpdateForm({
                  ...updateForm,
                  progressPercentage: Number(e.target.value)
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="font-medium">{updateForm.progressPercentage}%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <TextArea
                label="Notes"
                value={updateForm.notes}
                onChange={(e) => setUpdateForm({
                  ...updateForm,
                  notes: e.target.value
                })}
                placeholder="Add notes about the progress..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Photos
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUpdateForm({
                  ...updateForm,
                  photos: Array.from(e.target.files || [])
                })}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Documents
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUpdateForm({
                  ...updateForm,
                  documents: Array.from(e.target.files || [])
                })}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMilestoneUpdate}
              loading={updateMilestoneMutation.isPending}
            >
              Update Milestone
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Order #{order.orderNumber}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {order.title}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
              {order.priority.toUpperCase()}
            </span>
            {order.isDelayed && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                DELAYED
              </span>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {order.overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${order.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Client:</span>
            <p className="font-medium">{order.client.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
            <p className="font-medium">{order.manufacturer.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
            <p className="font-medium">{formatCurrency(order.totalAmount, order.currency)}</p>
          </div>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="p-6">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-primary-600 transition-all duration-500"
              style={{ width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%` }}
            />
          </div>

          {/* Status Steps */}
          <div className="relative flex justify-between">
            {orderStatuses.map((status, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const progress = getStatusProgress(index, currentStatusIndex);
              const StatusIcon = status.icon;

              return (
                <div key={status.id} className="flex flex-col items-center">
                  {/* Status Icon */}
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-primary-600 border-primary-600' 
                      : isCurrent 
                      ? 'bg-white border-primary-600' 
                      : 'bg-gray-100 border-gray-300'
                  }`}>
                    <StatusIcon className={`h-6 w-6 ${
                      isCompleted 
                        ? 'text-white' 
                        : isCurrent 
                        ? 'text-primary-600' 
                        : 'text-gray-400'
                    }`} />
                    
                    {/* Progress Ring for Current Status */}
                    {isCurrent && progress > 0 && (
                      <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-primary-200"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                          className="text-primary-600 transition-all duration-300"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Status Info */}
                  <div className="mt-3 text-center max-w-32">
                    <h3 className={`text-sm font-medium ${
                      isCompleted || isCurrent 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {status.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {status.description}
                    </p>
                    {isCurrent && progress > 0 && (
                      <p className="text-xs font-medium text-primary-600 mt-1">
                        {progress}% Complete
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestones */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Production Milestones
          </h3>
          <div className="space-y-4">
            {order.milestones.map((milestone: any) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {milestone.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${milestone.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {milestone.progressPercentage}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {milestone.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        Est: {format(parseISO(milestone.estimatedDate), 'MMM dd')}
                      </span>
                      {milestone.photos.length > 0 && (
                        <span className="flex items-center">
                          <Camera className="h-3 w-3 mr-1" />
                          {milestone.photos.length} photos
                        </span>
                      )}
                      {milestone.documents.length > 0 && (
                        <span className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          {milestone.documents.length} docs
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMilestone(milestone)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedMilestone(milestone);
                        setUpdateForm({
                          notes: milestone.notes,
                          progressPercentage: milestone.progressPercentage,
                          photos: [],
                          documents: []
                        });
                        setShowUpdateModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedMilestone && !showUpdateModal && renderMilestoneModal()}
        {showUpdateModal && renderUpdateModal()}
      </AnimatePresence>
    </div>
  );
};

export default OrderStatusPipeline; 