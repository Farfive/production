import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Users,
  Wrench,
  Award,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import analyticsApi from '../../services/analyticsApi';
import EmptyState from '../ui/EmptyState';

interface AnalyticsMetrics {
  production: {
    totalOutput: number;
    outputChange: number;
    efficiency: number;
    efficiencyChange: number;
    oeeScore: number;
    oeeChange: number;
    defectRate: number;
    defectChange: number;
  };
  workforce: {
    productivity: number;
    productivityChange: number;
    attendance: number;
    attendanceChange: number;
    utilization: number;
    utilizationChange: number;
    trainingCompliance: number;
    trainingChange: number;
  };
  maintenance: {
    uptime: number;
    uptimeChange: number;
    mtbf: number;
    mtbfChange: number;
    mttr: number;
    mttrChange: number;
    preventiveRatio: number;
    preventiveChange: number;
  };
  quality: {
    firstPassYield: number;
    yieldChange: number;
    customerSatisfaction: number;
    satisfactionChange: number;
    certificationCompliance: number;
    complianceChange: number;
    auditScore: number;
    auditChange: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

interface TimeSeriesData {
  timestamp: string;
  production: number;
  efficiency: number;
  quality: number;
  maintenance: number;
}

const ManufacturingAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    production: {
      totalOutput: 0,
      outputChange: 0,
      efficiency: 0,
      efficiencyChange: 0,
      oeeScore: 0,
      oeeChange: 0,
      defectRate: 0,
      defectChange: 0,
    },
    workforce: {
      productivity: 0,
      productivityChange: 0,
      attendance: 0,
      attendanceChange: 0,
      utilization: 0,
      utilizationChange: 0,
      trainingCompliance: 0,
      trainingChange: 0,
    },
    maintenance: {
      uptime: 0,
      uptimeChange: 0,
      mtbf: 0,
      mtbfChange: 0,
      mttr: 0,
      mttrChange: 0,
      preventiveRatio: 0,
      preventiveChange: 0,
    },
    quality: {
      firstPassYield: 0,
      yieldChange: 0,
      customerSatisfaction: 0,
      satisfactionChange: 0,
      certificationCompliance: 0,
      complianceChange: 0,
      auditScore: 0,
      auditChange: 0,
    },
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch real analytics data
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['manufacturing-analytics', timeRange],
    queryFn: () => analyticsApi.getManufacturingAnalytics(timeRange),
    refetchInterval: 30000
  });

  // Real time series data from API
  const { data: timeSeriesDataData = [] } = useQuery({
    queryKey: ['time-series-data', timeRange],
    queryFn: () => analyticsApi.getTimeSeriesData(timeRange)
  });

  useEffect(() => {
    if (analyticsData) {
      setMetrics(analyticsData);
    }
    if (timeSeriesDataData) {
      setTimeSeriesData(timeSeriesDataData);
    }
  }, [analyticsData, timeSeriesDataData]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    change: number,
    icon: React.ReactNode,
    suffix: string = '',
    isInverted: boolean = false
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
      <div className="mt-4 flex items-center">
        {getChangeIcon(isInverted ? -change : change)}
        <span className={`ml-1 text-sm font-medium ${getChangeColor(isInverted ? -change : change)}`}>
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="ml-2 text-sm text-gray-600">vs last period</span>
      </div>
    </motion.div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Performance Indicators */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard(
            'Total Output',
            metrics.production.totalOutput,
            metrics.production.outputChange,
            <Target className="w-6 h-6 text-blue-600" />,
            ' units'
          )}
          {renderMetricCard(
            'Overall Efficiency',
            metrics.production.efficiency,
            metrics.production.efficiencyChange,
            <TrendingUp className="w-6 h-6 text-green-600" />,
            '%'
          )}
          {renderMetricCard(
            'Equipment Uptime',
            metrics.maintenance.uptime,
            metrics.maintenance.uptimeChange,
            <Activity className="w-6 h-6 text-purple-600" />,
            '%'
          )}
          {renderMetricCard(
            'Quality Score',
            metrics.quality.firstPassYield,
            metrics.quality.yieldChange,
            <Award className="w-6 h-6 text-yellow-600" />,
            '%'
          )}
        </div>
      </div>

      {/* Real-time Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Real-time Performance Trends</h3>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={() => {}}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Chart placeholder - would integrate with actual charting library */}
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Performance trends chart would be rendered here</p>
            <p className="text-sm text-gray-500">Integration with Chart.js or similar library</p>
          </div>
        </div>
      </div>

      {/* Department Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Production Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">OEE Score</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.production.oeeScore}%</span>
                {getChangeIcon(metrics.production.oeeChange)}
                <span className={`ml-1 text-sm ${getChangeColor(metrics.production.oeeChange)}`}>
                  {metrics.production.oeeChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Defect Rate</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.production.defectRate}%</span>
                {getChangeIcon(-metrics.production.defectChange)}
                <span className={`ml-1 text-sm ${getChangeColor(-metrics.production.defectChange)}`}>
                  {Math.abs(metrics.production.defectChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Workforce Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Productivity</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.workforce.productivity}%</span>
                {getChangeIcon(metrics.workforce.productivityChange)}
                <span className={`ml-1 text-sm ${getChangeColor(metrics.workforce.productivityChange)}`}>
                  {metrics.workforce.productivityChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Training Compliance</span>
              <div className="flex items-center">
                <span className="font-medium">{metrics.workforce.trainingCompliance}%</span>
                {getChangeIcon(metrics.workforce.trainingChange)}
                <span className={`ml-1 text-sm ${getChangeColor(metrics.workforce.trainingChange)}`}>
                  {metrics.workforce.trainingChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductionTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Output',
          metrics.production.totalOutput,
          metrics.production.outputChange,
          <Target className="w-6 h-6 text-blue-600" />,
          ' units'
        )}
        {renderMetricCard(
          'Efficiency',
          metrics.production.efficiency,
          metrics.production.efficiencyChange,
          <TrendingUp className="w-6 h-6 text-green-600" />,
          '%'
        )}
        {renderMetricCard(
          'OEE Score',
          metrics.production.oeeScore,
          metrics.production.oeeChange,
          <Zap className="w-6 h-6 text-yellow-600" />,
          '%'
        )}
        {renderMetricCard(
          'Defect Rate',
          metrics.production.defectRate,
          metrics.production.defectChange,
          <AlertTriangle className="w-6 h-6 text-red-600" />,
          '%',
          true
        )}
      </div>

      {/* Production Analysis Charts */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Production Analysis</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Production analytics charts</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQualityTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'First Pass Yield',
          metrics.quality.firstPassYield,
          metrics.quality.yieldChange,
          <CheckCircle className="w-6 h-6 text-green-600" />,
          '%'
        )}
        {renderMetricCard(
          'Customer Satisfaction',
          metrics.quality.customerSatisfaction,
          metrics.quality.satisfactionChange,
          <Award className="w-6 h-6 text-blue-600" />,
          '/5'
        )}
        {renderMetricCard(
          'Certification Compliance',
          metrics.quality.certificationCompliance,
          metrics.quality.complianceChange,
          <Settings className="w-6 h-6 text-purple-600" />,
          '%'
        )}
        {renderMetricCard(
          'Audit Score',
          metrics.quality.auditScore,
          metrics.quality.auditChange,
          <Eye className="w-6 h-6 text-yellow-600" />,
          '%'
        )}
      </div>

      {/* Quality Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Trends</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Quality metrics charts</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturing Analytics</h1>
          <p className="text-gray-600">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'production', name: 'Production', icon: Target },
            { id: 'quality', name: 'Quality', icon: Award },
            { id: 'maintenance', name: 'Maintenance', icon: Wrench },
            { id: 'workforce', name: 'Workforce', icon: Users },
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
        {activeTab === 'production' && renderProductionTab()}
        {activeTab === 'quality' && renderQualityTab()}
        {activeTab === 'maintenance' && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Maintenance analytics coming soon</p>
          </div>
        )}
        {activeTab === 'workforce' && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Workforce analytics coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManufacturingAnalytics; 