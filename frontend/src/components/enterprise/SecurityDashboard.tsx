import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Settings,
  Download,
  Search,
  RefreshCw
} from 'lucide-react';

interface SecurityMetrics {
  activeUsers: number;
  failedLogins: number;
  mfaEnabled: number;
  securityAlerts: number;
  complianceScore: number;
  lastSecurityScan: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'warning';
}

const SecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'alerts' | 'compliance'>('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data
  const [metrics] = useState<SecurityMetrics>({
    activeUsers: 1247,
    failedLogins: 23,
    mfaEnabled: 89,
    securityAlerts: 3,
    complianceScore: 94.2,
    lastSecurityScan: '2 hours ago',
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 8,
      low: 15
    }
  });

  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2024-01-15 14:30:25',
      user: 'john.doe@company.com',
      action: 'LOGIN_SUCCESS',
      resource: 'Manufacturing Dashboard',
      ipAddress: '192.168.1.100',
      status: 'success'
    },
    {
      id: '2',
      timestamp: '2024-01-15 14:28:15',
      user: 'jane.smith@company.com',
      action: 'ORDER_CREATED',
      resource: 'Order #ORD-2024-001',
      ipAddress: '192.168.1.105',
      status: 'success'
    },
    {
      id: '3',
      timestamp: '2024-01-15 14:25:10',
      user: 'unknown@suspicious.com',
      action: 'LOGIN_FAILED',
      resource: 'Login Page',
      ipAddress: '203.0.113.42',
      status: 'failed'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    suffix: string = '',
    trend?: { value: number; isPositive: boolean }
  ) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-lg shadow-sm border"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        </div>
        <div className="p-3 bg-blue-100 rounded-full">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className="ml-2 text-sm text-gray-600">vs last period</span>
        </div>
      )}
    </motion.div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Security Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            'Active Users',
            metrics.activeUsers,
            <Users className="w-6 h-6 text-blue-600" />,
            '',
            { value: 5.2, isPositive: true }
          )}
          {renderMetricCard(
            'Failed Logins',
            metrics.failedLogins,
            <XCircle className="w-6 h-6 text-red-600" />,
            '',
            { value: -12.3, isPositive: true }
          )}
          {renderMetricCard(
            'MFA Enabled',
            metrics.mfaEnabled,
            <Shield className="w-6 h-6 text-green-600" />,
            '%',
            { value: 8.7, isPositive: true }
          )}
          {renderMetricCard(
            'Security Alerts',
            metrics.securityAlerts,
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          )}
        </div>
      </div>

      {/* Compliance Score */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Compliance Score</h3>
          <span className="text-2xl font-bold text-green-600">{metrics.complianceScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${metrics.complianceScore}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Last security scan: {metrics.lastSecurityScan}
        </p>
      </div>

      {/* Vulnerability Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vulnerability Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.vulnerabilities.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.vulnerabilities.high}</div>
            <div className="text-sm text-gray-600">High</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{metrics.vulnerabilities.medium}</div>
            <div className="text-sm text-gray-600">Medium</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.vulnerabilities.low}</div>
            <div className="text-sm text-gray-600">Low</div>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center">
                {getStatusIcon(log.status)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{log.action.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{log.user} • {log.ipAddress}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">{log.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor security, compliance, and audit activities</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle },
            { id: 'compliance', label: 'Compliance', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'users' && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600">Advanced RBAC and user management features</p>
          </div>
        )}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.timestamp}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.resource}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(log.status)}
                          <span className={`ml-2 text-sm ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'alerts' && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Security Alerts</h3>
            <p className="text-gray-600">Real-time security monitoring and alerting</p>
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Management</h3>
            <p className="text-gray-600">Compliance reporting and management features</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard; 