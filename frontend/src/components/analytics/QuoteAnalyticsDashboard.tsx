import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Award,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Users,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Radar } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

import Button from '../ui/Button';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import EmptyState from '../ui/EmptyState';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  total_quotes: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  sent: number;
  win_rate: number;
  average_value: number;
  total_value: number;
  response_time_avg: number;
  recent_activity: any[];
}

interface QuoteAnalyticsDashboardProps {
  className?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const QuoteAnalyticsDashboard: React.FC<QuoteAnalyticsDashboardProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['quote-analytics', timeRange],
    queryFn: () => quotesApi.getAnalyticsOverview(),
  });

  // Real analytics data from API
  const { data: trendData, isLoading: trendLoading, error: trendError } = useQuery({
    queryKey: ['quote-trends', timeRange],
    queryFn: () => quotesApi.getQuoteTrends(timeRange),
    refetchInterval: 30000
  });

  const { data: competitorData, isLoading: competitorLoading } = useQuery({
    queryKey: ['competitor-analysis', timeRange],
    queryFn: () => quotesApi.getCompetitorAnalysis(timeRange)
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  if (isLoading) {
    return <LoadingSpinner center text="Loading analytics..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load analytics data</p>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const data = analyticsData || {
    total_quotes: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    sent: 0,
    win_rate: 0,
    average_value: 0,
    total_value: 0,
    response_time_avg: 0,
    recent_activity: []
  };

  const quoteStatusData = {
    labels: ['Accepted', 'Sent', 'Rejected', 'Withdrawn'],
    datasets: [{
      data: [data.accepted, data.sent, data.rejected, data.withdrawn],
      backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#6B7280'],
      borderWidth: 0
    }]
  };

  const trendChartData = {
    labels: [],
    datasets: []
  };

  const winRateChartData = {
    labels: [],
    datasets: []
  };

  const competitorRadarData = {
    labels: [],
    datasets: []
  };

  const performanceMetrics = [
    {
      title: 'Total Quotes',
      value: data.total_quotes,
      change: '+12%',
      trend: 'up',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Win Rate',
      value: `${data.win_rate}%`,
      change: '+5.2%',
      trend: 'up',
      icon: Target,
      color: 'text-green-600'
    },
    {
      title: 'Average Value',
      value: formatCurrency(data.average_value, 'USD'),
      change: '+8.1%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Response Time',
      value: `${data.response_time_avg}h`,
      change: '-15%',
      trend: 'down',
      icon: Clock,
      color: 'text-orange-600'
    }
  ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quote Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your quoting performance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={timeRangeOptions}
            className="w-40"
          />
          <Button
            variant="outline"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metric.value}
                </p>
                <div className="flex items-center mt-2">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-700 ${metric.color}`}>
                <metric.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quote Trends
            </h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div style={{ height: '300px' }}>
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>

        {/* Quote Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quote Status Distribution
            </h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div style={{ height: '300px' }}>
            <Pie data={quoteStatusData} options={pieOptions} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win Rate Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Win Rate Trend
            </h3>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <div style={{ height: '200px' }}>
            <Line data={winRateChartData} options={chartOptions} />
          </div>
        </div>

        {/* Performance vs Industry */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              vs Industry Average
            </h3>
            <Award className="h-5 w-5 text-gray-400" />
          </div>
          <div style={{ height: '200px' }}>
            <Radar data={competitorRadarData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Accepted</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.accepted}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Rejected</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.rejected}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.sent}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Withdrawn</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.withdrawn}
              </span>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Total Value
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.total_value, 'USD')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Quote Activity
          </h3>
        </div>
        <div className="p-6">
          {data.recent_activity && data.recent_activity.length > 0 ? (
            <div className="space-y-4">
              {data.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Quote #{activity.id} {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatCurrency(activity.value || 0, 'USD')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteAnalyticsDashboard; 