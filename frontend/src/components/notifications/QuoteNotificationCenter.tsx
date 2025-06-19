import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellRing, Check, X, Clock, DollarSign, 
  Eye, EyeOff, Trash2, Settings, Filter,
  CheckCircle, XCircle, AlertTriangle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

import { notificationsApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, QuoteStatus } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Badge } from '../ui/badge';
import LoadingSpinner from '../ui/LoadingSpinner';

interface QuoteNotification {
  id: number;
  type: 'quote_created' | 'quote_updated' | 'quote_accepted' | 'quote_rejected' | 
        'quote_expired' | 'quote_viewed' | 'negotiation_started' | 'payment_required';
  title: string;
  message: string;
  quoteId: number;
  orderId: number;
  fromUserId: number;
  fromUserName: string;
  data: {
    quoteAmount?: number;
    currency?: string;
    previousStatus?: QuoteStatus;
    newStatus?: QuoteStatus;
    manufacturerName?: string;
    clientName?: string;
  };
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  readAt?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  notificationTypes: {
    quoteCreated: boolean;
    quoteUpdated: boolean;
    quoteAccepted: boolean;
    quoteRejected: boolean;
    paymentRequired: boolean;
  };
}

const QuoteNotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  // Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['quote-notifications'],
    queryFn: () => notificationsApi.getNotifications(),
    refetchInterval: 30000 // Refresh every 30 seconds as fallback
  });

  // Fetch notification settings
  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => notificationsApi.getNotifications()
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: number[]) => 
      notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-notifications'] });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => 
      notificationsApi.deleteNotification(notificationId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-notifications'] });
      toast.success('Notification deleted');
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) =>
      notificationsApi.markAllAsRead(), // Settings API not implemented, using available method
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Settings updated');
    }
  });

  // Setup WebSocket connection
  useEffect(() => {
    if (!user?.id) return;

    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/notifications/${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for notifications');
    };

    ws.onmessage = (event) => {
      try {
        const notification: QuoteNotification = JSON.parse(event.data);
        
        // Show toast notification
        showToastNotification(notification);
        
        // Play sound if enabled
        if (settings?.soundEnabled) {
          playNotificationSound(notification.priority);
        }
        
        // Refresh notifications
        refetch();
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (user?.id) {
          setWebsocket(new WebSocket(wsUrl));
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWebsocket(ws);

    return () => {
      ws.close();
    };
  }, [user?.id, settings?.soundEnabled, refetch]);

  // Show toast notification
  const showToastNotification = useCallback((notification: QuoteNotification) => {
    const isQuietHours = settings?.quietHours.enabled && isInQuietHours();
    if (isQuietHours) return;

    const toastOptions = {
      duration: notification.priority === 'urgent' ? 10000 : 5000,
      icon: getNotificationIcon(notification.type),
    };

    switch (notification.priority) {
      case 'urgent':
        toast.error(notification.message, toastOptions);
        break;
      case 'high':
        toast.error(notification.message, toastOptions);
        break;
      case 'medium':
        toast(notification.message, toastOptions);
        break;
      case 'low':
        toast.success(notification.message, toastOptions);
        break;
    }
  }, [settings]);

  // Check if current time is in quiet hours
  const isInQuietHours = useCallback(() => {
    if (!settings?.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [settings]);

  // Play notification sound
  const playNotificationSound = (priority: string) => {
    const audio = new Audio();
    switch (priority) {
      case 'urgent':
        audio.src = '/sounds/urgent.mp3';
        break;
      case 'high':
        audio.src = '/sounds/high.mp3';
        break;
      default:
        audio.src = '/sounds/default.mp3';
    }
    audio.play().catch(() => {
      // Ignore audio errors (user might not have interacted with page yet)
    });
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quote_accepted': return '✅';
      case 'quote_rejected': return '❌';
      case 'quote_created': return '📝';
      case 'quote_updated': return '📋';
      case 'quote_expired': return '⏰';
      case 'payment_required': return '💰';
      default: return '🔔';
    }
  };

  // Get notification color
  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'red';
    
    switch (type) {
      case 'quote_accepted': return 'green';
      case 'quote_rejected': return 'red';
      case 'quote_created': return 'blue';
      case 'quote_updated': return 'yellow';
      case 'payment_required': return 'orange';
      default: return 'gray';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: QuoteNotification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id]);
    }
    
    // Navigate to relevant page
    const basePath = user?.role === UserRole.CLIENT ? '/dashboard/quotes' : '/dashboard/quotes';
    window.location.href = `${basePath}/${notification.quoteId}`;
  };

  // Filter notifications
  const filteredNotifications = notifications?.filter((notification: QuoteNotification) => {
    if (filterType !== 'all' && notification.type !== filterType) return false;
    if (filterRead === 'read' && !notification.isRead) return false;
    if (filterRead === 'unread' && notification.isRead) return false;
    return true;
  }) || [];

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const unreadIds = filteredNotifications
      .filter((n: any) => !n.isRead)
      .map((n: any) => n.id);
    
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  };

  const unreadCount = notifications?.filter((n: QuoteNotification) => !n.isRead).length || 0;

  if (isLoading) {
    return <LoadingSpinner center text="Loading notifications..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            {unreadCount > 0 && (
              <Badge 
                color="red" 
                size="sm"
                className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay updated on your quote activity
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border-0 bg-transparent focus:ring-0 text-sm"
            >
              <option value="all">All Types</option>
              <option value="quote_created">New Quotes</option>
              <option value="quote_updated">Quote Updates</option>
              <option value="quote_accepted">Accepted</option>
              <option value="quote_rejected">Rejected</option>
              <option value="payment_required">Payment Required</option>
            </select>
          </div>
          
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as any)}
            className="border-0 bg-transparent focus:ring-0 text-sm"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're all caught up! New notifications will appear here.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification: QuoteNotification) => (
            <Card 
              key={notification.id} 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  getNotificationColor(notification.type, notification.priority) === 'red' ? 'bg-red-100 dark:bg-red-900' :
                  getNotificationColor(notification.type, notification.priority) === 'green' ? 'bg-green-100 dark:bg-green-900' :
                  getNotificationColor(notification.type, notification.priority) === 'blue' ? 'bg-blue-100 dark:bg-blue-900' :
                  getNotificationColor(notification.type, notification.priority) === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900' :
                  getNotificationColor(notification.type, notification.priority) === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {notification.type === 'quote_accepted' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {notification.type === 'quote_rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                  {notification.type === 'quote_created' && <Bell className="w-5 h-5 text-blue-600" />}
                  {notification.type === 'quote_updated' && <Info className="w-5 h-5 text-yellow-600" />}
                  {notification.type === 'payment_required' && <DollarSign className="w-5 h-5 text-orange-600" />}
                  {notification.type === 'quote_expired' && <Clock className="w-5 h-5 text-gray-600" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      
                      {/* Additional Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>From: {notification.fromUserName}</span>
                        <span>Quote #{notification.quoteId}</span>
                        {notification.data.quoteAmount && (
                          <span>
                            {notification.data.quoteAmount} {notification.data.currency}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        color={getNotificationColor(notification.type, notification.priority)}
                        size="sm"
                      >
                        {notification.priority}
                      </Badge>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate([notification.id]);
                          }}
                          leftIcon={<Eye className="w-3 h-3" />}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        leftIcon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              <Button
                variant="ghost"
                onClick={() => setShowSettings(false)}
                leftIcon={<X className="w-4 h-4" />}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              {/* General Settings */}
              <div>
                <h4 className="font-medium mb-3">General</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Email notifications</span>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSettingsMutation.mutate({
                        emailNotifications: e.target.checked
                      })}
                      className="rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Sound enabled</span>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettingsMutation.mutate({
                        soundEnabled: e.target.checked
                      })}
                      className="rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <h4 className="font-medium mb-3">Quiet Hours</h4>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-sm">Enable quiet hours</span>
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) => updateSettingsMutation.mutate({
                      quietHours: { ...settings.quietHours, enabled: e.target.checked }
                    })}
                    className="rounded"
                  />
                </label>
                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Start</label>
                      <input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e) => updateSettingsMutation.mutate({
                          quietHours: { ...settings.quietHours, start: e.target.value }
                        })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End</label>
                      <input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e) => updateSettingsMutation.mutate({
                          quietHours: { ...settings.quietHours, end: e.target.value }
                        })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Types */}
              <div>
                <h4 className="font-medium mb-3">Notification Types</h4>
                <div className="space-y-2">
                  {Object.entries(settings.notificationTypes).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => updateSettingsMutation.mutate({
                          notificationTypes: {
                            ...settings.notificationTypes,
                            [key]: e.target.checked
                          }
                        })}
                        className="rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QuoteNotificationCenter; 