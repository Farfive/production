import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Navigation,
  Calendar,
  User,
  FileText,
  Camera,
  RefreshCw,
  Eye,
  MessageSquare,
  Bell,
  Route,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { deliveryApi } from '../../lib/api';

interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: string;
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  vehicleType: string;
  vehicleNumber: string;
  photo?: string;
}

interface DeliveryUpdate {
  id: string;
  timestamp: string;
  status: string;
  location: DeliveryLocation;
  notes: string;
  photos: Array<{
    id: string;
    url: string;
    caption: string;
  }>;
  updatedBy: string;
}

interface DeliveryTracking {
  id: string;
  orderId: string;
  orderNumber: string;
  trackingNumber: string;
  status: 'preparing' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  priority: 'standard' | 'express' | 'urgent';
  estimatedDelivery: string;
  actualDelivery?: string;
  pickupLocation: DeliveryLocation;
  deliveryLocation: DeliveryLocation;
  currentLocation?: DeliveryLocation;
  driver: DeliveryDriver;
  carrier: {
    id: string;
    name: string;
    logo?: string;
    trackingUrl?: string;
  };
  updates: DeliveryUpdate[];
  recipient: {
    name: string;
    phone: string;
    email: string;
    instructions?: string;
  };
  package: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    value: number;
    description: string;
    requiresSignature: boolean;
  };
  estimatedDistance: number;
  estimatedDuration: number; // in minutes
  isDelayed: boolean;
  delayReason?: string;
}

interface DeliveryTrackerProps {
  orderId?: string;
  trackingNumber?: string;
  className?: string;
}

const DeliveryTracker: React.FC<DeliveryTrackerProps> = ({
  orderId,
  trackingNumber,
  className
}) => {
  const queryClient = useQueryClient();
  const [selectedUpdate, setSelectedUpdate] = useState<DeliveryUpdate | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Fetch delivery tracking data
  const { data: tracking, isLoading, refetch } = useQuery({
    queryKey: ['delivery-tracking', orderId, trackingNumber],
    queryFn: () => deliveryApi.getTrackingInfo({ orderId, trackingNumber }),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    enabled: !!(orderId || trackingNumber),
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (data: { type: 'sms' | 'email'; message: string }) =>
      deliveryApi.sendNotification(tracking?.id, data.type, data.message),
    onSuccess: () => {
      toast.success('Notification sent successfully');
    },
    onError: () => {
      toast.error('Failed to send notification');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-100';
      case 'in_transit':
        return 'text-purple-600 bg-purple-100';
      case 'picked_up':
        return 'text-orange-600 bg-orange-100';
      case 'failed':
      case 'returned':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'express':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircle;
      case 'out_for_delivery':
        return Truck;
      case 'in_transit':
        return Route;
      case 'picked_up':
        return Package;
      case 'failed':
      case 'returned':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const calculateProgress = () => {
    if (!tracking) return 0;
    
    const statusOrder = ['preparing', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(tracking.status);
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const getEstimatedArrival = () => {
    if (!tracking?.currentLocation || !tracking?.estimatedDuration) return null;
    
    const now = new Date();
    const estimatedArrival = new Date(now.getTime() + tracking.estimatedDuration * 60000);
    return estimatedArrival;
  };

  const renderDeliveryTimeline = () => {
    if (!tracking?.updates) return null;

    const sortedUpdates = [...tracking.updates].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
      <div className="space-y-4">
        {sortedUpdates.map((update, index) => {
          const StatusIcon = getStatusIcon(update.status);
          const isLatest = index === 0;

          return (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-4"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isLatest ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <StatusIcon className={`h-5 w-5 ${
                  isLatest ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    isLatest ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {update.status.replace('_', ' ').toUpperCase()}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {format(parseISO(update.timestamp), 'MMM dd, HH:mm')}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {update.location.address}
                </p>
                
                {update.notes && (
                  <p className="text-sm text-gray-500 mt-1">
                    {update.notes}
                  </p>
                )}
                
                {update.photos.length > 0 && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Camera className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {update.photos.length} photo{update.photos.length > 1 ? 's' : ''}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedUpdate(update)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderDriverInfo = () => {
    if (!tracking?.driver) return null;

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Driver Information
        </h4>
        
        <div className="flex items-center space-x-3">
          {tracking.driver.photo ? (
            <img
              src={tracking.driver.photo}
              alt={tracking.driver.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
          )}
          
          <div className="flex-1">
            <h5 className="font-medium text-gray-900 dark:text-white">
              {tracking.driver.name}
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tracking.driver.vehicleType} • {tracking.driver.vehicleNumber}
            </p>
            <div className="flex items-center space-x-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < Math.floor(tracking.driver.rating)
                      ? 'bg-yellow-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {tracking.driver.rating.toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPackageInfo = () => {
    if (!tracking?.package) return null;

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Package Details
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Weight:</span>
            <p className="font-medium">{tracking.package.weight} kg</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Value:</span>
            <p className="font-medium">${tracking.package.value.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
            <p className="font-medium">
              {tracking.package.dimensions.length} × {tracking.package.dimensions.width} × {tracking.package.dimensions.height} cm
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Signature:</span>
            <p className="font-medium">
              {tracking.package.requiresSignature ? 'Required' : 'Not required'}
            </p>
          </div>
        </div>
        
        <div className="mt-3">
          <span className="text-gray-600 dark:text-gray-400">Description:</span>
          <p className="font-medium">{tracking.package.description}</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  if (!tracking) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No tracking information found</p>
      </div>
    );
  }

  const progress = calculateProgress();
  const estimatedArrival = getEstimatedArrival();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Delivery Tracking
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Order #{tracking.orderNumber} • {tracking.trackingNumber}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(tracking.priority)}`}>
              {tracking.priority.toUpperCase()}
            </span>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(tracking.status)}`}>
              {tracking.status.replace('_', ' ').toUpperCase()}
            </span>
            {tracking.isDelayed && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                DELAYED
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Delivery Progress
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Estimated Delivery:</span>
            <p className="font-medium">
              {format(parseISO(tracking.estimatedDelivery), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Carrier:</span>
            <p className="font-medium">{tracking.carrier.name}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Distance:</span>
            <p className="font-medium">{tracking.estimatedDistance} km</p>
          </div>
        </div>

        {/* Real-time Updates */}
        {estimatedArrival && tracking.status === 'out_for_delivery' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Estimated arrival: {format(estimatedArrival, 'HH:mm')} 
                ({differenceInMinutes(estimatedArrival, new Date())} minutes)
              </span>
            </div>
          </div>
        )}

        {tracking.isDelayed && tracking.delayReason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Delay: {tracking.delayReason}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delivery Timeline
            </h3>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {renderDeliveryTimeline()}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Driver Information */}
          {renderDriverInfo()}

          {/* Package Information */}
          {renderPackageInfo()}

          {/* Recipient Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Recipient
            </h4>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <p className="font-medium">{tracking.recipient.name}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                <p className="font-medium">{tracking.recipient.phone}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <p className="font-medium">{tracking.recipient.email}</p>
              </div>
              {tracking.recipient.instructions && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Instructions:</span>
                  <p className="font-medium">{tracking.recipient.instructions}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => sendNotificationMutation.mutate({ type: 'sms', message: 'Your package is on the way!' })}
                loading={sendNotificationMutation.isPending}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                SMS
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => sendNotificationMutation.mutate({ type: 'email', message: 'Your package is on the way!' })}
                loading={sendNotificationMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Actions
            </h4>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Set Notifications
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTracker; 