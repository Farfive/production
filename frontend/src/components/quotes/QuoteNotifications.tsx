import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Filter,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Calendar,
  User,
  Building2,
  DollarSign,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import { Switch } from '../ui/Switch';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../lib/utils';

interface Notification {
  id: number;
  type: 'quote_received' | 'quote_accepted' | 'quote_rejected' | 'quote_expired' | 'quote_updated' | 'payment_due' | 'delivery_reminder';
  title: string;
  message: string;
  quote_id: number;
  quote_title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  data: {
    manufacturer?: string;
    price?: number;
    currency?: string;
    delivery_date?: string;
    [key: string]: any;
  };
}

interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  sound_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  types: {
    [key: string]: {
      enabled: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

interface QuoteNotificationsProps {
  className?: string;
}

const QuoteNotifications: React.FC<QuoteNotificationsProps> = ({ className }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high_priority'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['quote-notifications'],
    queryFn: () => quotesApi.getNotifications(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch notification settings
  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => quotesApi.getNotificationSettings(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: number[]) => quotesApi.markNotificationsAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-notifications'] });
    }
  });

  // Delete notifications mutation
  const deleteNotificationsMutation = useMutation({
    mutationFn: (notificationIds: number[]) => quotesApi.deleteNotifications(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-notifications'] });
      setSelectedNotifications([]);
      toast.success('Notifications deleted');
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) => 
      quotesApi.updateNotificationSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Settings updated');
    }
  });

  // Real-time notifications using WebSocket (simplified)
  useEffect(() => {
    // In a real app, this would connect to WebSocket
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['quote-notifications'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `h-5 w-5 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-yellow-500' :
      'text-blue-500'
    }`;

    switch (type) {
      case 'quote_received':
        return <Mail className={iconClass} />;
      case 'quote_accepted':
        return <CheckCircle className={iconClass} />;
      case 'quote_rejected':
        return <X className={iconClass} />;
      case 'quote_expired':
        return <Clock className={iconClass} />;
      case 'quote_updated':
        return <Info className={iconClass} />;
      case 'payment_due':
        return <DollarSign className={iconClass} />;
      case 'delivery_reminder':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read;
      case 'high_priority':
        return notification.priority === 'high' || notification.priority === 'urgent';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate([notification.id]);
    }
    // Navigate to quote details
    window.location.href = `/quotes/${notification.quote_id}`;
  };

  const handleSelectNotification = (notificationId: number) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNotifications.length > 0) {
      deleteNotificationsMutation.mutate(selectedNotifications);
    }
  };

  const renderNotificationSettings = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Settings
          </h3>
          <Button variant="ghost" onClick={() => setShowSettings(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Delivery Methods
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Email</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.email_enabled || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ email_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Push Notifications</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Browser push notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.push_enabled || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ push_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">SMS</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Text message notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.sms_enabled || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ sms_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Sound</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Play sound for notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.sound_enabled || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ sound_enabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Quiet Hours
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">
                  Enable Quiet Hours
                </span>
                <Switch
                  checked={settings?.quiet_hours_enabled || false}
                  onCheckedChange={(checked) => 
                    updateSettingsMutation.mutate({ quiet_hours_enabled: checked })
                  }
                />
              </div>

              {settings?.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={settings.quiet_hours_start || '22:00'}
                      onChange={(e) => 
                        updateSettingsMutation.mutate({ quiet_hours_start: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={settings.quiet_hours_end || '08:00'}
                      onChange={(e) => 
                        updateSettingsMutation.mutate({ quiet_hours_end: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Notification Types
            </h4>
            <div className="space-y-4">
              {[
                { key: 'quote_received', label: 'New Quote Received', description: 'When you receive a new quote' },
                { key: 'quote_accepted', label: 'Quote Accepted', description: 'When your quote is accepted' },
                { key: 'quote_rejected', label: 'Quote Rejected', description: 'When your quote is rejected' },
                { key: 'quote_expired', label: 'Quote Expired', description: 'When a quote expires' },
                { key: 'quote_updated', label: 'Quote Updated', description: 'When a quote is modified' },
                { key: 'payment_due', label: 'Payment Due', description: 'Payment reminders' },
                { key: 'delivery_reminder', label: 'Delivery Reminder', description: 'Delivery date reminders' }
              ].map(type => (
                <div key={type.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                    <Switch
                      checked={settings?.types?.[type.key]?.enabled || false}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({
                          types: {
                            ...settings?.types,
                            [type.key]: {
                              ...settings?.types?.[type.key],
                              enabled: checked
                            }
                          }
                        })
                      }
                    />
                  </div>

                  {settings?.types?.[type.key]?.enabled && (
                    <div className="flex space-x-4 text-sm">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.types[type.key]?.email || false}
                          onChange={(e) => 
                            updateSettingsMutation.mutate({
                              types: {
                                ...settings.types,
                                [type.key]: {
                                  ...settings.types[type.key],
                                  email: e.target.checked
                                }
                              }
                            })
                          }
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-1 text-gray-700 dark:text-gray-300">Email</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.types[type.key]?.push || false}
                          onChange={(e) => 
                            updateSettingsMutation.mutate({
                              types: {
                                ...settings.types,
                                [type.key]: {
                                  ...settings.types[type.key],
                                  push: e.target.checked
                                }
                              }
                            })
                          }
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-1 text-gray-700 dark:text-gray-300">Push</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.types[type.key]?.sms || false}
                          onChange={(e) => 
                            updateSettingsMutation.mutate({
                              types: {
                                ...settings.types,
                                [type.key]: {
                                  ...settings.types[type.key],
                                  sms: e.target.checked
                                }
                              }
                            })
                          }
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-1 text-gray-700 dark:text-gray-300">SMS</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={() => setShowSettings(false)}>
            Close
          </Button>
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'high_priority', label: 'High Priority' }
            ]}
            className="w-32"
          />
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      {(unreadCount > 0 || selectedNotifications.length > 0) && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            {selectedNotifications.length > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNotifications.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                loading={markAsReadMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
            {selectedNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                loading={deleteNotificationsMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'high_priority' ? 'No high priority notifications' :
               'No notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-l-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  getPriorityColor(notification.priority)
                } ${!notification.is_read ? 'font-medium' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(notification.id);
                    }}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />

                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white truncate`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatRelativeTime(notification.created_at)}</span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        Quote #{notification.quote_id}
                      </span>
                      {notification.data.manufacturer && (
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {notification.data.manufacturer}
                        </span>
                      )}
                      {notification.data.price && (
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {notification.data.price} {notification.data.currency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && renderNotificationSettings()}
      </AnimatePresence>
    </div>
  );
};

export default QuoteNotifications; 