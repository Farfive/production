import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  Zap,
  Database,
  Wifi,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gauge,
} from 'lucide-react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

interface PerformanceMetric {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}

interface PerformanceChartData {
  timestamp: string;
  value: number;
  type: string;
}

const PerformanceDashboard: React.FC = () => {
  const { metrics, getPerformanceData, isEnabled } = usePerformanceMonitoring();
  const [showDetails, setShowDetails] = useState(false);
  const [chartData, setChartData] = useState<PerformanceChartData[]>([]);

  useEffect(() => {
    if (!isEnabled || !metrics) return;

    const newDataPoint: PerformanceChartData = {
      timestamp: new Date().toLocaleTimeString(),
      value: metrics.memoryUsage / 1024 / 1024,
      type: 'memory',
    };

    setChartData(prev => [...prev.slice(-9), newDataPoint]);
  }, [metrics, isEnabled]);

  if (!isEnabled) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Performance Monitoring Disabled</h3>
          <p>Enable performance monitoring in environment settings to view metrics.</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  const performanceData = getPerformanceData();
  const score = performanceData?.score || 0;

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const performanceMetrics: PerformanceMetric[] = [
    {
      label: 'Page Load Time',
      value: `${metrics.pageLoadTime}ms`,
      status: metrics.pageLoadTime < 2000 ? 'good' : metrics.pageLoadTime < 4000 ? 'warning' : 'critical',
      icon: <Clock className="h-5 w-5" />,
      trend: 'stable',
    },
    {
      label: 'Memory Usage',
      value: `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
      status: metrics.memoryUsage < 50 * 1024 * 1024 ? 'good' : metrics.memoryUsage < 100 * 1024 * 1024 ? 'warning' : 'critical',
      icon: <HardDrive className="h-5 w-5" />,
      trend: 'up',
    },
    {
      label: 'Network Quality',
      value: metrics.networkQuality.toUpperCase(),
      status: metrics.networkQuality === 'fast' ? 'good' : metrics.networkQuality === 'slow' ? 'warning' : 'critical',
      icon: <Wifi className="h-5 w-5" />,
      trend: 'stable',
    },
    {
      label: 'Bundle Size',
      value: `${(metrics.bundleSize / 1024).toFixed(1)}KB`,
      status: metrics.bundleSize < 1024 * 1024 ? 'good' : metrics.bundleSize < 2 * 1024 * 1024 ? 'warning' : 'critical',
      icon: <Database className="h-5 w-5" />,
      trend: 'down',
    },
  ];

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Score</h3>
            <div className="flex items-center space-x-4">
              <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {score}/100
              </div>
              <div className="flex items-center space-x-2">
                {score >= 80 ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : score >= 60 ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
                <span className="text-sm text-gray-600">
                  {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Gauge className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-gray-600">Live Monitoring</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gray-100 ${getStatusColor(metric.status)}`}>
                  {metric.icon}
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
                <div className={`text-xs font-medium ${getStatusColor(metric.status)}`}>
                  {metric.status.toUpperCase()}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Memory Usage Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Memory Usage Over Time</h3>
          <BarChart3 className="h-5 w-5 text-gray-600" />
        </div>
        <div className="h-64 flex items-end space-x-2 overflow-hidden">
          {chartData.map((point, index) => (
            <motion.div
              key={index}
              className="bg-blue-500 rounded-t-sm min-w-[20px] flex-1"
              style={{ height: `${Math.max((point.value / 100) * 100, 5)}%` }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((point.value / 100) * 100, 5)}%` }}
              transition={{ duration: 0.5 }}
              title={`${point.timestamp}: ${point.value.toFixed(1)}MB`}
            />
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Real-time memory usage (MB)
        </div>
      </div>

      {/* API Response Times */}
      {Object.keys(metrics.apiResponseTimes).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Response Times</h3>
          <div className="space-y-3">
            {Object.entries(metrics.apiResponseTimes).map(([endpoint, times]) => {
              const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
              const status = avgTime < 200 ? 'good' : avgTime < 500 ? 'warning' : 'critical';
              
              return (
                <div key={endpoint} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {endpoint.replace('/api/v1', '')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {times.length} calls
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getStatusColor(status)}`}>
                      {avgTime.toFixed(0)}ms
                    </div>
                    <div className="text-xs text-gray-500">avg</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Report</h3>
          <button
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showDetails && performanceData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-auto">
              {performanceData.report}
            </pre>
            
            {performanceData.entries.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {performanceData.entries.slice(-10).map((entry, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-gray-600">{entry.duration.toFixed(2)}ms</span>
                      </div>
                      <div className="text-gray-500">{entry.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Performance Tips */}
      <div className="bg-blue-50 rounded-lg shadow p-6">
        <div className="flex items-start space-x-3">
          <Zap className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Keep bundle size under 2MB for optimal loading</li>
              <li>• Monitor memory usage to prevent performance degradation</li>
              <li>• API calls should typically respond within 500ms</li>
              <li>• Use caching strategies for frequently accessed data</li>
              <li>• Optimize images and use lazy loading for better UX</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard; 