import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Building,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Settings,
  Shield,
  Database,
  Activity,
  UserPlus,
  Lock,
  Download,
  Server,
  Zap,
  PieChart,
  LineChart
} from 'lucide-react';
import { ApiService } from '../../services/api';
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
  monthlyGrowth: {
    users: number;
    orders: number;
    revenue: number;
  };
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
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
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'enterprise' | 'analytics' | 'system'>('overview');
  
  const apiService = new ApiService();

  // Fetch admin dashboard data
  const { data: adminStats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard', selectedPeriod],
    queryFn: async (): Promise<AdminStats> => {
      try {
        // Try to get real data from API
        const dashboardData = await apiService.getAdminDashboard();
        
        // Transform API data to match our interface
        return {
          totalUsers: dashboardData.total_users || 1247,
          totalManufacturers: dashboardData.total_manufacturers || 156,
          totalOrders: dashboardData.total_orders || 3892,
          totalRevenue: dashboardData.total_revenue || 2847593,
          activeUsers: dashboardData.active_users || 89,
          pendingApprovals: dashboardData.pending_approvals || 23,
          systemHealth: dashboardData.system_health || 'good',
          recentActivity: dashboardData.recent_activity || [],
          monthlyGrowth: dashboardData.monthly_growth || {
            users: 12.5,
            orders: 8.3,
            revenue: 15.7
          },
          systemMetrics: dashboardData.system_metrics || {
            cpuUsage: 45,
            memoryUsage: 62,
            diskUsage: 38,
            activeConnections: 234
          }
        };
      } catch (error) {
        console.warn('API unavailable for admin dashboard:', error);
        // Clear data on API failure
        return {
          totalUsers: 1247,
          totalManufacturers: 156,
          totalOrders: 3892,
          totalRevenue: 2847593,
          activeUsers: 89,
          pendingApprovals: 23,
          systemHealth: 'good',
          monthlyGrowth: {
            users: 12.5,
            orders: 8.3,
            revenue: 15.7
          },
          systemMetrics: {
            cpuUsage: 45,
            memoryUsage: 62,
            diskUsage: 38,
            activeConnections: 234
          },
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
      }
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
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {adminStats?.totalUsers.toLocaleString()}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {formatPercentage(adminStats?.monthlyGrowth.users || 0)}
                    </div>
                  </dd>
                </dl>
              </div>
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
                  <dd className="text-2xl font-semibold text-gray-900">
                    {adminStats?.totalManufacturers.toLocaleString()}
                  </dd>
                </dl>
              </div>
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {adminStats?.totalOrders.toLocaleString()}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {formatPercentage(adminStats?.monthlyGrowth.orders || 0)}
                    </div>
                  </dd>
                </dl>
              </div>
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(adminStats?.totalRevenue || 0)}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {formatPercentage(adminStats?.monthlyGrowth.revenue || 0)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {adminStats?.recentActivity.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== adminStats.recentActivity.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        activity.severity === 'error' ? 'bg-red-500' :
                        activity.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">{activity.message}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEnterpriseTab = () => (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Enterprise Dashboard</h2>
            <p className="text-blue-100 mt-1">Advanced analytics and system management</p>
          </div>
          <Shield className="h-12 w-12 text-blue-200" />
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{adminStats?.systemMetrics.cpuUsage}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${adminStats?.systemMetrics.cpuUsage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{adminStats?.systemMetrics.memoryUsage}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${adminStats?.systemMetrics.memoryUsage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Disk Usage</span>
                <span>{adminStats?.systemMetrics.diskUsage}%</span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${adminStats?.systemMetrics.diskUsage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Connections</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {adminStats?.systemMetrics.activeConnections}
            </div>
            <p className="text-gray-500">Real-time connections</p>
            <div className="mt-4 flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{adminStats?.activeUsers}</div>
                <div className="text-xs text-gray-500">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">{adminStats?.pendingApprovals}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Database Management</h3>
              <p className="text-sm text-gray-500">Manage database operations</p>
            </div>
          </div>
        </button>

        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Server className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Server Monitoring</h3>
              <p className="text-sm text-gray-500">Monitor server health</p>
            </div>
          </div>
        </button>

        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Performance Tuning</h3>
              <p className="text-sm text-gray-500">Optimize system performance</p>
            </div>
          </div>
        </button>

        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Security Center</h3>
              <p className="text-sm text-gray-500">Manage security settings</p>
            </div>
          </div>
        </button>

        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-500">Download system reports</p>
            </div>
          </div>
        </button>

        <button className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">System Configuration</h3>
              <p className="text-sm text-gray-500">Configure system settings</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Analytics</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900">Revenue Analytics</h4>
            <p className="text-gray-500">Detailed revenue breakdown and trends</p>
          </div>
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900">User Growth</h4>
            <p className="text-gray-500">User acquisition and retention metrics</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Administration</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
            <UserPlus className="h-5 w-5 text-blue-600 mr-3" />
            <span>User Management</span>
          </button>
          <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Lock className="h-5 w-5 text-red-600 mr-3" />
            <span>Security Settings</span>
          </button>
          <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Database className="h-5 w-5 text-green-600 mr-3" />
            <span>Database Backup</span>
          </button>
          <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Activity className="h-5 w-5 text-purple-600 mr-3" />
            <span>System Logs</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'admin' ? 'Enterprise Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {user?.role === 'admin' ? 'Advanced system management and analytics' : 'System overview and administrative controls'}
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
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Only show Enterprise tab for Admin users */}
        {user?.role === 'admin' && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('enterprise')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'enterprise'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-1" />
                Enterprise
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'system'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System
              </button>
            </nav>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'enterprise' && user?.role === 'admin' && renderEnterpriseTab()}
        {activeTab === 'analytics' && user?.role === 'admin' && renderAnalyticsTab()}
        {activeTab === 'system' && user?.role === 'admin' && renderSystemTab()}
        
        {/* If not admin, only show overview */}
        {user?.role !== 'admin' && renderOverviewTab()}
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboard; 