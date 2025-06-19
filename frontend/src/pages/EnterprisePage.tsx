import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  GitBranch,
  Users,
  Building2,
  Zap,
  BarChart3,
  Settings,
  Bell,
  Lock,
  Database,
  Cloud,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import SecurityDashboard from '../components/enterprise/SecurityDashboard';
import WorkflowBuilder from '../components/enterprise/WorkflowBuilder';

interface EnterpriseMetrics {
  totalUsers: number;
  activeWorkflows: number;
  securityScore: number;
  systemUptime: number;
  apiCalls: number;
  dataProcessed: string;
  complianceStatus: string;
  lastBackup: string;
}

interface SystemHealth {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  database: 'healthy' | 'warning' | 'critical';
  api: 'healthy' | 'warning' | 'critical';
  cache: 'healthy' | 'warning' | 'critical';
}

const EnterprisePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'workflows' | 'tenants' | 'performance'>('overview');

  // Mock data
  const [metrics] = useState<EnterpriseMetrics>({
    totalUsers: 1247,
    activeWorkflows: 23,
    securityScore: 94.2,
    systemUptime: 99.8,
    apiCalls: 2847293,
    dataProcessed: '847.2 GB',
    complianceStatus: 'Compliant',
    lastBackup: '2 hours ago'
  });

  const [systemHealth] = useState<SystemHealth>({
    cpu: 45,
    memory: 67,
    storage: 23,
    network: 89,
    database: 'healthy',
    api: 'healthy',
    cache: 'warning'
  });

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
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
      {/* Enterprise Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Enterprise Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            'Total Users',
            metrics.totalUsers,
            <Users className="w-6 h-6 text-blue-600" />,
            '',
            { value: 12.5, isPositive: true }
          )}
          {renderMetricCard(
            'Active Workflows',
            metrics.activeWorkflows,
            <GitBranch className="w-6 h-6 text-green-600" />,
            '',
            { value: 8.3, isPositive: true }
          )}
          {renderMetricCard(
            'Security Score',
            metrics.securityScore,
            <Shield className="w-6 h-6 text-purple-600" />,
            '%',
            { value: 2.1, isPositive: true }
          )}
          {renderMetricCard(
            'System Uptime',
            metrics.systemUptime,
            <Activity className="w-6 h-6 text-orange-600" />,
            '%'
          )}
        </div>
      </div>

      {/* System Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Cpu className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-sm text-gray-900">CPU Usage</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${systemHealth.cpu}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{systemHealth.cpu}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm text-gray-900">Memory</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${systemHealth.memory}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{systemHealth.memory}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HardDrive className="w-5 h-5 text-purple-600 mr-3" />
                <span className="text-sm text-gray-900">Storage</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${systemHealth.storage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{systemHealth.storage}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wifi className="w-5 h-5 text-orange-600 mr-3" />
                <span className="text-sm text-gray-900">Network I/O</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${systemHealth.network}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{systemHealth.network}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-5 h-5 text-gray-600 mr-3" />
                <span className="text-sm text-gray-900">Database</span>
              </div>
              <div className="flex items-center">
                {getHealthIcon(systemHealth.database)}
                <span className={`ml-2 text-sm font-medium ${getHealthColor(systemHealth.database)}`}>
                  {systemHealth.database}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Server className="w-5 h-5 text-gray-600 mr-3" />
                <span className="text-sm text-gray-900">API Services</span>
              </div>
              <div className="flex items-center">
                {getHealthIcon(systemHealth.api)}
                <span className={`ml-2 text-sm font-medium ${getHealthColor(systemHealth.api)}`}>
                  {systemHealth.api}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-5 h-5 text-gray-600 mr-3" />
                <span className="text-sm text-gray-900">Cache Layer</span>
              </div>
              <div className="flex items-center">
                {getHealthIcon(systemHealth.cache)}
                <span className={`ml-2 text-sm font-medium ${getHealthColor(systemHealth.cache)}`}>
                  {systemHealth.cache}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('security')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Shield className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Security Center</h4>
            <p className="text-sm text-gray-600">Monitor security and compliance</p>
          </button>
          
          <button
            onClick={() => setActiveTab('workflows')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <GitBranch className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Workflow Builder</h4>
            <p className="text-sm text-gray-600">Create automated processes</p>
          </button>
          
          <button
            onClick={() => setActiveTab('tenants')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Building2 className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Multi-Tenant</h4>
            <p className="text-sm text-gray-600">Manage organizations</p>
          </button>
          
          <button
            onClick={() => setActiveTab('performance')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
            <h4 className="font-medium text-gray-900">Performance</h4>
            <p className="text-sm text-gray-600">System optimization</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Enterprise Activity</h3>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Security scan completed</p>
              <p className="text-sm text-gray-500">All systems passed compliance check</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">5 min ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitBranch className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">New workflow deployed</p>
              <p className="text-sm text-gray-500">Order Approval Process v2.1 is now active</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">12 min ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">New tenant onboarded</p>
              <p className="text-sm text-gray-500">Acme Manufacturing joined the platform</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">1 hour ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cloud className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Backup completed</p>
              <p className="text-sm text-gray-500">Daily backup finished successfully - 847.2 GB</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">2 hours ago</div>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Enterprise Dashboard</h1>
            <p className="text-gray-600 mt-2">Advanced enterprise features and system management</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
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
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'workflows', label: 'Workflows', icon: GitBranch },
            { id: 'tenants', label: 'Multi-Tenant', icon: Building2 },
            { id: 'performance', label: 'Performance', icon: TrendingUp }
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
        {activeTab === 'security' && <SecurityDashboard />}
        {activeTab === 'workflows' && <WorkflowBuilder />}
        {activeTab === 'tenants' && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Multi-Tenant Management</h3>
            <p className="text-gray-600">Organization management and tenant isolation features</p>
          </div>
        )}
        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Optimization</h3>
            <p className="text-gray-600">System performance monitoring and optimization tools</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterprisePage; 