import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Settings,
  FileText,
  BarChart3,
  Shield,
  Database,
  Activity,
  Bell,
  Search
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

interface AdminStats {
  totalUsers: number;
  totalManufacturers: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: 'good' | 'warning' | 'critical';
  recentActivity: AdminActivity[];
}

interface AdminActivity {
  id: string;
  type: 'user_registration' | 'order_created' | 'manufacturer_approved' | 'payment_processed' | 'system_alert';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  userId?: string;
  userName?: string;
}

const AdminDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock admin stats query - replace with real API call
  const { data: adminStats, isLoading, error } = useQuery({
    queryKey: ['admin-stats', selectedPeriod],
    queryFn: async (): Promise<AdminStats> => {
      // Mock data - replace with actual API call
      return {
        totalUsers: 1247,
        totalManufacturers: 156,
        totalOrders: 3892,
        totalRevenue: 2847593,
        activeUsers: 89,
        pendingApprovals: 23,
        systemHealth: 'good',
        recentActivity: [
          {
            id: '1',
            type: 'user_registration',
            message: 'New user registered: John Doe',
            timestamp: new Date().toISOString(),
            severity: 'info',
            userId: '123',
            userName: 'John Doe'
          },
          {
            id: '2',
            type: 'manufacturer_approved',
            message: 'Manufacturer approved: TechParts Inc.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            severity: 'info'
          },
          {
            id: '3',
            type: 'system_alert',
            message: 'High CPU usage detected on server-2',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            severity: 'warning'
          }
        ]
      };
    },
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Failed to load admin dashboard</h3>
          <p className="text-sm text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <Users className="h-4 w-4" />;
      case 'order_created': return <ShoppingCart className="h-4 w-4" />;
      case 'manufacturer_approved': return <Building className="h-4 w-4" />;
      case 'payment_processed': return <DollarSign className="h-4 w-4" />;
      case 'system_alert': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              System overview and administrative controls
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </button>
          </div>
        </div>

        {/* System Health Alert */}
        {adminStats?.systemHealth !== 'good' && (
          <div className={`rounded-lg p-4 ${getHealthColor(adminStats?.systemHealth || 'good')}`}>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <h3 className="text-sm font-medium">
                System Health: {adminStats?.systemHealth?.toUpperCase()}
              </h3>
            </div>
            <p className="mt-1 text-sm">
              {adminStats?.systemHealth === 'warning' 
                ? 'Some systems are experiencing minor issues. Monitoring in progress.'
                : 'Critical systems require immediate attention.'
              }
            </p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {adminStats?.totalUsers.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">+12%</span>
                <span className="text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Manufacturers</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {adminStats?.totalManufacturers.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-500">
                  {adminStats?.pendingApprovals} pending approval
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {adminStats?.totalOrders.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-blue-600 font-medium">
                  {adminStats?.activeUsers} active today
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(adminStats?.totalRevenue || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">+8.2%</span>
                <span className="text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Manage Users</div>
                  <div className="text-xs text-gray-500">View and edit user accounts</div>
                </div>
              </button>
              
              <button className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <Building className="h-8 w-8 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Approve Manufacturers</div>
                  <div className="text-xs text-gray-500">{adminStats?.pendingApprovals} pending</div>
                </div>
              </button>
              
              <button className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Analytics</div>
                  <div className="text-xs text-gray-500">View detailed reports</div>
                </div>
              </button>
              
              <button className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <Shield className="h-8 w-8 text-red-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Security</div>
                  <div className="text-xs text-gray-500">Security settings & logs</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {adminStats?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.severity === 'error' ? 'bg-red-100 text-red-600' :
                    activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all activity
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">System Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <span className="text-sm font-medium text-green-600">142ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Performance</span>
                  <span className="text-sm font-medium text-green-600">Good</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Server Uptime</span>
                  <span className="text-sm font-medium text-green-600">99.9%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <span className="text-sm font-medium text-blue-600">1,247</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Storage & Usage</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">File Storage</span>
                    <span className="font-medium">2.4GB / 10GB</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Database Size</span>
                    <span className="font-medium">847MB / 5GB</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '17%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Bandwidth</span>
                    <span className="font-medium">156GB / 1TB</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboard; 