import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  FunnelIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';

interface Notification {
  id: string;
  type: 'order_status_update' | 'new_quote' | 'quote_update' | 'payment_update' | 'system_maintenance' | 'user_mention' | 'deadline_approaching';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  metadata?: {
    order_id?: string;
    quote_id?: string;
    payment_id?: string;
    user_id?: string;
    [key: string]: any;
  };
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'order_status_update',
        title: 'Order Status Updated',
        message: 'Your order #ORD-2024-001 has been moved to "In Production"',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        read: false,
        priority: 'medium',
        actionUrl: '/orders/1',
        metadata: { order_id: '1' }
      },
      {
        id: '2',
        type: 'new_quote',
        title: 'New Quote Received',
        message: 'You have received a new quote from TechManufacturing Inc.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        priority: 'high',
        actionUrl: '/quotes/2',
        metadata: { quote_id: '2' }
      },
      {
        id: '3',
        type: 'payment_update',
        title: 'Payment Successful',
        message: 'Payment of $15,000 has been processed successfully',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        priority: 'medium',
        actionUrl: '/payments',
        metadata: { payment_id: '3' }
      },
      {
        id: '4',
        type: 'deadline_approaching',
        title: 'Deadline Approaching',
        message: 'Order #ORD-2024-002 deadline is in 24 hours',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        read: false,
        priority: 'critical',
        actionUrl: '/orders/2',
        metadata: { order_id: '2' }
      },
      {
        id: '5',
        type: 'system_maintenance',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2:00 AM',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: true,
        priority: 'low',
        metadata: {}
      }
    ];

    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (filter === 'read' && !notification.read) return false;
      if (filter === 'unread' && notification.read) return false;
      if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, filter, typeFilter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationIds: string[]) => {
    setNotifications(prev => 
      prev.map(notification => 
        notificationIds.includes(notification.id) 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotifications = (notificationIds: string[]) => {
    setNotifications(prev => 
      prev.filter(notification => !notificationIds.includes(notification.id))
    );
    setSelectedNotifications(new Set());
  };

  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const selectAllFiltered = () => {
    const filteredIds = new Set(filteredNotifications.map(n => n.id));
    setSelectedNotifications(filteredIds);
  };

  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
    const baseClasses = "h-6 w-6";
    const priorityClasses = {
      low: "text-gray-400",
      medium: "text-blue-500",
      high: "text-orange-500",
      critical: "text-red-500"
    };

    switch (type) {
      case 'order_status_update':
        return <ClockIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
      case 'new_quote':
      case 'quote_update':
        return <InformationCircleIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
      case 'payment_update':
        return <CheckCircleIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
      case 'deadline_approaching':
        return <ExclamationTriangleIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
      case 'system_maintenance':
        return <InformationCircleIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
      default:
        return <BellIcon className={`${baseClasses} ${priorityClasses[priority]}`} />;
    }
  };

  const getPriorityBadge = (priority: Notification['priority']) => {
    const classes = {
      low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[priority]}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <BellIconSolid className="h-8 w-8 text-primary-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {unreadCount} unread notifications
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex space-x-3">
          {selectedNotifications.size > 0 && (
            <>
              <button
                onClick={() => markAsRead(Array.from(selectedNotifications))}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                Mark as Read
              </button>
              <button
                onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="order_status_update">Order Updates</option>
              <option value="new_quote">New Quotes</option>
              <option value="quote_update">Quote Updates</option>
              <option value="payment_update">Payments</option>
              <option value="deadline_approaching">Deadlines</option>
              <option value="system_maintenance">System</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {selectedNotifications.size > 0 ? (
              <button
                onClick={clearSelection}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear selection ({selectedNotifications.size})
              </button>
            ) : (
              <button
                onClick={selectAllFiltered}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Select all ({filteredNotifications.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No notifications
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "No notifications match your current filters."
                }
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  notification.read 
                    ? 'border-l-gray-300' 
                    : 'border-l-primary-500 bg-primary-50 dark:bg-primary-900/20'
                } ${
                  selectedNotifications.has(notification.id) 
                    ? 'ring-2 ring-primary-500' 
                    : ''
                }`}
                onClick={() => toggleNotificationSelection(notification.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => {}}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        notification.read 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-900 dark:text-white font-semibold'
                      }`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(notification.priority)}
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </p>
                      
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View Details →
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notification.read) {
                          // Mark as unread
                          setNotifications(prev => 
                            prev.map(n => 
                              n.id === notification.id ? { ...n, read: false } : n
                            )
                          );
                        } else {
                          markAsRead([notification.id]);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title={notification.read ? "Mark as unread" : "Mark as read"}
                    >
                      {notification.read ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationsPage; 