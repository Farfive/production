import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Settings,
  BarChart3,
  Shield,
  Database,
  Zap,
} from 'lucide-react';
import PerformanceDashboard from '../../components/performance/PerformanceDashboard';
import AuthTestPanel from '../../components/debug/AuthTestPanel';
import { useComponentPerformance } from '../../hooks/usePerformanceMonitoring';

type TabType = 'performance' | 'auth' | 'cache';

const DebugPage: React.FC = () => {
  useComponentPerformance('DebugPage');
  const [activeTab, setActiveTab] = useState<TabType>('performance');

  const tabs = [
    {
      id: 'performance' as TabType,
      label: 'Performance',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Monitor app performance and metrics',
    },
    {
      id: 'auth' as TabType,
      label: 'Authentication',
      icon: <Shield className="h-5 w-5" />,
      description: 'Test backend integration and auth',
    },
    {
      id: 'cache' as TabType,
      label: 'Cache & API',
      icon: <Database className="h-5 w-5" />,
      description: 'Monitor cache performance and API calls',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performance':
        return <PerformanceDashboard />;
      case 'auth':
        return <AuthTestPanel />;
      case 'cache':
        return <CacheDebugPanel />;
      default:
        return <PerformanceDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Debug Dashboard</h1>
                <p className="text-sm text-gray-600">Performance monitoring and system diagnostics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Live Monitoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};

// Cache Debug Panel Component
const CacheDebugPanel: React.FC = () => {
  const [cacheStats, setCacheStats] = useState<any>(null);

  const refreshCacheStats = () => {
    // This would be connected to your cache manager
    setCacheStats({
      totalQueries: 15,
      hitRate: 85.5,
      cacheSize: '2.3MB',
      lastCleanup: new Date().toISOString(),
    });
  };

  React.useEffect(() => {
    refreshCacheStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Statistics</h3>
          <button
            onClick={refreshCacheStats}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        
        {cacheStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{cacheStats.totalQueries}</div>
              <div className="text-sm text-gray-600">Total Queries</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{cacheStats.hitRate}%</div>
              <div className="text-sm text-gray-600">Hit Rate</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{cacheStats.cacheSize}</div>
              <div className="text-sm text-gray-600">Cache Size</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-900">
                {new Date(cacheStats.lastCleanup).toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-600">Last Cleanup</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Call History</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">/api/v1/orders</span>
            <span className="text-sm text-green-600">245ms</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">/api/v1/quotes</span>
            <span className="text-sm text-green-600">183ms</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="text-sm font-medium">/api/v1/auth/profile</span>
            <span className="text-sm text-yellow-600">567ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage; 