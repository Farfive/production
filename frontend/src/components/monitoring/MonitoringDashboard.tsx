import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, Activity, Server, Database, Zap, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface HealthStatus {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      response_time: number;
      message: string;
      timestamp: string;
      details?: any;
    };
  };
  timestamp: string;
}

interface SystemMetrics {
  timestamp: string;
  system_performance: {
    cpu_percent: number;
    memory_percent: number;
    load_average: number[];
  };
  application_performance: {
    total_requests: string;
    average_response_time: string;
    error_rate: string;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Mock historical data for charts
  const [performanceData] = useState([
    { time: '00:00', cpu: 45, memory: 60, requests: 120 },
    { time: '04:00', cpu: 35, memory: 55, requests: 80 },
    { time: '08:00', cpu: 65, memory: 70, requests: 200 },
    { time: '12:00', cpu: 80, memory: 75, requests: 350 },
    { time: '16:00', cpu: 75, memory: 72, requests: 280 },
    { time: '20:00', cpu: 55, memory: 65, requests: 180 },
  ]);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      
      // Fetch health status
      const healthResponse = await fetch('/api/monitoring/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);
      }

      // Fetch system metrics
      const metricsResponse = await fetch('/api/monitoring/performance');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setSystemMetrics(metricsData);
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'database':
        return <Database className="w-6 h-6" />;
      case 'system':
        return <Server className="w-6 h-6" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  if (loading && !healthStatus) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600 mt-1">Production Outsourcing Platform</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <span className="text-red-700">{error}</span>
            <button
              onClick={fetchMonitoringData}
              className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Overall Status */}
      {healthStatus && (
        <div className={`mb-8 p-6 rounded-lg border-2 ${getStatusColor(healthStatus.overall_status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getStatusIcon(healthStatus.overall_status)}</span>
              <div>
                <h2 className="text-xl font-semibold capitalize">
                  System Status: {healthStatus.overall_status}
                </h2>
                <p className="text-gray-600">
                  {healthStatus.overall_status === 'healthy' && 'All systems operational'}
                  {healthStatus.overall_status === 'degraded' && 'Some systems experiencing issues'}
                  {healthStatus.overall_status === 'unhealthy' && 'Critical issues detected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Services</p>
              <p className="text-2xl font-bold">
                {Object.keys(healthStatus.services).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Status Cards */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(healthStatus.services).map(([serviceName, service]) => (
            <div
              key={serviceName}
              className={`p-6 rounded-lg border-2 ${getStatusColor(service.status)}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">
                    {serviceName === 'database' ? '🗄️' : 
                     serviceName === 'system' ? '🖥️' : '⚙️'}
                  </span>
                  <h3 className="font-semibold capitalize">{serviceName}</h3>
                </div>
                <span className="text-xl">{getStatusIcon(service.status)}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium capitalize">
                    {service.status}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Response Time:</span>
                  <span className="text-sm font-medium">
                    {service.response_time?.toFixed(2) || '0.00'}ms
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mt-2">{service.message}</p>
                
                {service.details && (
                  <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
                    {Object.entries(service.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace('_', ' ')}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? value.toFixed(1) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CPU Usage</p>
                <p className="text-2xl font-bold text-blue-600">
                  {systemMetrics.system_performance.cpu_percent.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                systemMetrics.system_performance.cpu_percent > 80 ? 'bg-red-100' :
                systemMetrics.system_performance.cpu_percent > 60 ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <Zap className={`w-6 h-6 ${
                  systemMetrics.system_performance.cpu_percent > 80 ? 'text-red-600' :
                  systemMetrics.system_performance.cpu_percent > 60 ? 'text-yellow-600' : 'text-green-600'
                }`} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-purple-600">
                  {systemMetrics.system_performance.memory_percent.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                systemMetrics.system_performance.memory_percent > 80 ? 'bg-red-100' :
                systemMetrics.system_performance.memory_percent > 60 ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <Server className={`w-6 h-6 ${
                  systemMetrics.system_performance.memory_percent > 80 ? 'text-red-600' :
                  systemMetrics.system_performance.memory_percent > 60 ? 'text-yellow-600' : 'text-green-600'
                }`} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Load Average</p>
                <p className="text-2xl font-bold text-orange-600">
                  {systemMetrics.system_performance.load_average[0]?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-green-600">99.9%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CPU & Memory Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">System Resources (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="CPU %"
              />
              <Line 
                type="monotone" 
                dataKey="memory" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Memory %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Request Volume Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Request Volume (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="requests" 
                stroke="#F59E0B" 
                fill="#FEF3C7"
                name="Requests/hour"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={fetchMonitoringData}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
        
        <a
          href="/api/monitoring/metrics"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          📊 View Metrics
        </a>

        <a
          href="/api/monitoring/status"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📈 System Status
        </a>
      </div>
    </div>
  );
};

export default MonitoringDashboard; 