import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  FileText,
  Zap,
  TrendingUp,
  Activity,
  Clock,
  Users,
  Target,
  Award,
  Wrench,
  Settings,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  Database,
  Globe,
  Monitor
} from 'lucide-react';

// Import Phase 3 components
import ManufacturingAnalytics from '../components/analytics/ManufacturingAnalytics';
import ReportingSystem from '../components/analytics/ReportingSystem';
import APIIntegration from '../components/integration/APIIntegration';

interface DashboardMetrics {
  totalProduction: number;
  productionChange: number;
  efficiency: number;
  efficiencyChange: number;
  qualityScore: number;
  qualityChange: number;
  uptime: number;
  uptimeChange: number;
  activeIntegrations: number;
  apiCalls: number;
  reportsGenerated: number;
  dataProcessed: string;
}

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics] = useState<DashboardMetrics>({
    totalProduction: 12847,
    productionChange: 8.3,
    efficiency: 94.2,
    efficiencyChange: 2.1,
    qualityScore: 96.8,
    qualityChange: 1.4,
    uptime: 98.2,
    uptimeChange: 1.2,
    activeIntegrations: 12,
    apiCalls: 45230,
    reportsGenerated: 156,
    dataProcessed: '2.4TB'
  });

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    suffix: string = '',
    change?: number
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
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          {getChangeIcon(change)}
          <span className={`ml-1 text-sm font-medium ${getChangeColor(change)}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="ml-2 text-sm text-gray-600">vs last period</span>
        </div>
      )}
    </motion.div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Performance Indicators */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            'Total Production',
            metrics.totalProduction,
            <Target className="w-6 h-6 text-blue-600" />,
            ' units',
            metrics.productionChange
          )}
          {renderMetricCard(
            'Overall Efficiency',
            metrics.efficiency,
            <TrendingUp className="w-6 h-6 text-green-600" />,
            '%',
            metrics.efficiencyChange
          )}
          {renderMetricCard(
            'Quality Score',
            metrics.qualityScore,
            <Award className="w-6 h-6 text-yellow-600" />,
            '%',
            metrics.qualityChange
          )}
          {renderMetricCard(
            'Equipment Uptime',
            metrics.uptime,
            <Activity className="w-6 h-6 text-purple-600" />,
            '%',
            metrics.uptimeChange
          )}
        </div>
      </div>

      {/* System Overview */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            'Active Integrations',
            metrics.activeIntegrations,
            <Zap className="w-6 h-6 text-blue-600" />
          )}
          {renderMetricCard(
            'API Calls Today',
            metrics.apiCalls,
            <Globe className="w-6 h-6 text-green-600" />
          )}
          {renderMetricCard(
            'Reports Generated',
            metrics.reportsGenerated,
            <FileText className="w-6 h-6 text-purple-600" />
          )}
          {renderMetricCard(
            'Data Processed',
            metrics.dataProcessed,
            <Database className="w-6 h-6 text-orange-600" />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('analytics')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Analytics</h4>
            <p className="text-sm text-gray-600">Real-time performance insights</p>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <FileText className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Generate Report</h4>
            <p className="text-sm text-gray-600">Create custom reports</p>
          </button>
          
          <button
            onClick={() => setActiveTab('integrations')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Zap className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage APIs</h4>
            <p className="text-sm text-gray-600">Configure integrations</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Settings className="w-8 h-8 text-gray-600 mb-2" />
            <h4 className="font-medium text-gray-900">Settings</h4>
            <p className="text-sm text-gray-600">System configuration</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
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
              <p className="text-sm font-medium text-gray-900">Production report generated</p>
              <p className="text-sm text-gray-500">Monthly summary completed - 2.4MB</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">2 min ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">API integration synced</p>
              <p className="text-sm text-gray-500">SAP ERP - 1,247 records processed</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">5 min ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Quality alert triggered</p>
              <p className="text-sm text-gray-500">Defect rate exceeded threshold on Line 2</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">12 min ago</div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Wrench className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Maintenance completed</p>
              <p className="text-sm text-gray-500">CNC Mill #1 - Preventive maintenance</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">1 hour ago</div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">Database</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">API Services</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">External Integrations</span>
              </div>
              <span className="text-sm text-yellow-600 font-medium">Warning</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">Reporting Engine</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">CPU Usage</span>
                <span className="text-gray-900">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Memory Usage</span>
                <span className="text-gray-900">67%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Storage Usage</span>
                <span className="text-gray-900">23%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '23%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Network I/O</span>
                <span className="text-gray-900">89%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '89%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Integration</h1>
          <p className="text-gray-600">Advanced analytics, reporting, and system integration</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Monitor },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 },
            { id: 'reports', name: 'Reports', icon: FileText },
            { id: 'integrations', name: 'Integrations', icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && <ManufacturingAnalytics />}
        {activeTab === 'reports' && <ReportingSystem />}
        {activeTab === 'integrations' && <APIIntegration />}
      </div>
    </div>
  );
};

export default AnalyticsPage; 