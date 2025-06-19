import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Building2,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  Zap,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

import Button from '../ui/Button';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { quotesApi } from '../../lib/api';
import { formatCurrency, formatPercentage } from '../../lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  overview: {
    total_quotes: number;
    total_value: number;
    win_rate: number;
    avg_response_time: number;
    avg_quote_value: number;
    conversion_rate: number;
  };
  trends: {
    quotes_over_time: Array<{ date: string; count: number; value: number }>;
    win_rate_trend: Array<{ date: string; rate: number }>;
    response_time_trend: Array<{ date: string; hours: number }>;
  };
  distributions: {
    status_distribution: Array<{ status: string; count: number; percentage: number }>;
    price_ranges: Array<{ range: string; count: number; percentage: number }>;
    manufacturer_performance: Array<{ name: string; quotes: number; win_rate: number; avg_value: number }>;
    industry_breakdown: Array<{ industry: string; count: number; value: number }>;
  };
  comparisons: {
    current_vs_previous: {
      quotes: { current: number; previous: number; change: number };
      value: { current: number; previous: number; change: number };
      win_rate: { current: number; previous: number; change: number };
    };
    benchmarks: {
      industry_avg_win_rate: number;
      industry_avg_response_time: number;
      industry_avg_value: number;
    };
  };
  forecasts: {
    projected_quotes: Array<{ date: string; projected: number; confidence: number }>;
    projected_revenue: Array<{ date: string; projected: number; confidence: number }>;
  };
}

interface ComprehensiveQuoteAnalyticsProps {
  className?: string;
}

const ComprehensiveQuoteAnalytics: React.FC<ComprehensiveQuoteAnalyticsProps> = ({ className }) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['quotes', 'value', 'win_rate']);
  const [showForecasts, setShowForecasts] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distributions' | 'comparisons'>('overview');

  // Fetch analytics data
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['quote-analytics', dateRange],
    queryFn: () => quotesApi.getAnalytics({ period: dateRange }),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = ((value / context.dataset.data.reduce((a: number, b: number) => a + b, 0)) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const renderOverviewTab = () => {
    if (!analyticsData) return null;

    const { overview, comparisons } = analyticsData;

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Quotes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.total_quotes.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              {getChangeIcon(comparisons.current_vs_previous.quotes.change)}
              <span className={`ml-1 ${getChangeColor(comparisons.current_vs_previous.quotes.change)}`}>
                {formatPercentage(Math.abs(comparisons.current_vs_previous.quotes.change))}
                {comparisons.current_vs_previous.quotes.change >= 0 ? ' increase' : ' decrease'}
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(overview.total_value, 'USD')}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              {getChangeIcon(comparisons.current_vs_previous.value.change)}
              <span className={`ml-1 ${getChangeColor(comparisons.current_vs_previous.value.change)}`}>
                {formatPercentage(Math.abs(comparisons.current_vs_previous.value.change))}
                {comparisons.current_vs_previous.value.change >= 0 ? ' increase' : ' decrease'}
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(overview.win_rate)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              {getChangeIcon(comparisons.current_vs_previous.win_rate.change)}
              <span className={`ml-1 ${getChangeColor(comparisons.current_vs_previous.win_rate.change)}`}>
                {formatPercentage(Math.abs(comparisons.current_vs_previous.win_rate.change))}
                {comparisons.current_vs_previous.win_rate.change >= 0 ? ' increase' : ' decrease'}
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.avg_response_time}h
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <Info className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 ml-1">
                Industry avg: {comparisons.benchmarks.industry_avg_response_time}h
              </span>
            </div>
          </motion.div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance vs Industry
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(overview.win_rate / comparisons.benchmarks.industry_avg_win_rate) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {formatPercentage(overview.win_rate)} vs {formatPercentage(comparisons.benchmarks.industry_avg_win_rate)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Response Time</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((comparisons.benchmarks.industry_avg_response_time / overview.avg_response_time) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {overview.avg_response_time}h vs {comparisons.benchmarks.industry_avg_response_time}h
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Quote Value</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(overview.avg_quote_value / comparisons.benchmarks.industry_avg_value) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(overview.avg_quote_value, 'USD')} vs {formatCurrency(comparisons.benchmarks.industry_avg_value, 'USD')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Insights
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Strong Performance
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Your win rate is {formatPercentage((overview.win_rate - comparisons.benchmarks.industry_avg_win_rate) / comparisons.benchmarks.industry_avg_win_rate * 100)} above industry average
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Response Time Opportunity
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Consider reducing response time by {overview.avg_response_time - comparisons.benchmarks.industry_avg_response_time}h to match industry standards
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Award className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Value Leadership
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Your average quote value exceeds industry benchmark by {formatPercentage((overview.avg_quote_value - comparisons.benchmarks.industry_avg_value) / comparisons.benchmarks.industry_avg_value * 100)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrendsTab = () => {
    if (!analyticsData) return null;

    const { trends, forecasts } = analyticsData;

    const trendsChartData = {
      labels: trends.quotes_over_time.map((item: any) => format(new Date(item.date), 'MMM dd')),
      datasets: [
        {
          label: 'Quote Count',
          data: trends.quotes_over_time.map((item: any) => item.count),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          fill: true,
        },
        {
          label: 'Quote Value',
          data: trends.quotes_over_time.map((item: any) => item.value),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y1',
          fill: true,
        },
      ],
    };

    const winRateChartData = {
      labels: trends.win_rate_trend.map((item: any) => format(new Date(item.date), 'MMM dd')),
      datasets: [
        {
          label: 'Win Rate (%)',
          data: trends.win_rate_trend.map((item: any) => item.rate * 100),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          fill: true,
        },
      ],
    };

    const responseTimeChartData = {
      labels: trends.response_time_trend.map((item: any) => format(new Date(item.date), 'MMM dd')),
      datasets: [
        {
          label: 'Response Time (hours)',
          data: trends.response_time_trend.map((item: any) => item.hours),
          borderColor: 'rgb(245, 101, 101)',
          backgroundColor: 'rgba(245, 101, 101, 0.1)',
          fill: true,
        },
      ],
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quotes & Value Trends
            </h3>
            <div className="h-64">
              <Line data={trendsChartData} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
              }} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Win Rate Trend
            </h3>
            <div className="h-64">
              <Line data={winRateChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Response Time Trend
            </h3>
            <div className="h-64">
              <Line data={responseTimeChartData} options={chartOptions} />
            </div>
          </div>

          {showForecasts && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Forecast
              </h3>
              <div className="h-64">
                <Line 
                  data={{
                    labels: forecasts.projected_revenue.map((item: any) => format(new Date(item.date), 'MMM dd')),
                    datasets: [
                      {
                        label: 'Projected Revenue',
                        data: forecasts.projected_revenue.map((item: any) => item.projected),
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderDash: [5, 5],
                        fill: true,
                      },
                    ],
                  }} 
                  options={chartOptions} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDistributionsTab = () => {
    if (!analyticsData) return null;

    const { distributions } = analyticsData;

    const statusChartData = {
      labels: distributions.status_distribution.map((item: any) => item.status),
      datasets: [
        {
          data: distributions.status_distribution.map((item: any) => item.count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 101, 101, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(139, 92, 246, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    const priceRangeChartData = {
      labels: distributions.price_ranges.map((item: any) => item.range),
      datasets: [
        {
          label: 'Quote Count',
          data: distributions.price_ranges.map((item: any) => item.count),
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Status Distribution
            </h3>
            <div className="h-64">
              <Doughnut data={statusChartData} options={pieChartOptions} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Price Range Distribution
            </h3>
            <div className="h-64">
              <Bar data={priceRangeChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Manufacturers
            </h3>
            <div className="space-y-3">
              {distributions.manufacturer_performance.slice(0, 5).map((manufacturer: any, index: number) => (
                <div key={manufacturer.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{manufacturer.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {manufacturer.quotes} quotes • {formatPercentage(manufacturer.win_rate)} win rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(manufacturer.avg_value, 'USD')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">avg value</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Industry Breakdown
            </h3>
            <div className="h-64">
              <Pie 
                data={{
                  labels: distributions.industry_breakdown.map((item: any) => item.industry),
                  datasets: [
                    {
                      data: distributions.industry_breakdown.map((item: any) => item.value),
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 101, 101, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                      ],
                      borderWidth: 2,
                      borderColor: '#fff',
                    },
                  ],
                }} 
                options={pieChartOptions} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComparisonsTab = () => {
    if (!analyticsData) return null;

    const { comparisons } = analyticsData;

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Period Comparison
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Quotes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {comparisons.current_vs_previous.quotes.current}
                </p>
                <div className="flex items-center justify-center mt-2">
                  {getChangeIcon(comparisons.current_vs_previous.quotes.change)}
                  <span className={`ml-1 text-sm ${getChangeColor(comparisons.current_vs_previous.quotes.change)}`}>
                    {formatPercentage(Math.abs(comparisons.current_vs_previous.quotes.change))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Previous: {comparisons.current_vs_previous.quotes.previous}
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(comparisons.current_vs_previous.value.current, 'USD')}
                </p>
                <div className="flex items-center justify-center mt-2">
                  {getChangeIcon(comparisons.current_vs_previous.value.change)}
                  <span className={`ml-1 text-sm ${getChangeColor(comparisons.current_vs_previous.value.change)}`}>
                    {formatPercentage(Math.abs(comparisons.current_vs_previous.value.change))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Previous: {formatCurrency(comparisons.current_vs_previous.value.previous, 'USD')}
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(comparisons.current_vs_previous.win_rate.current)}
                </p>
                <div className="flex items-center justify-center mt-2">
                  {getChangeIcon(comparisons.current_vs_previous.win_rate.change)}
                  <span className={`ml-1 text-sm ${getChangeColor(comparisons.current_vs_previous.win_rate.change)}`}>
                    {formatPercentage(Math.abs(comparisons.current_vs_previous.win_rate.change))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Previous: {formatPercentage(comparisons.current_vs_previous.win_rate.previous)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Industry Benchmarks
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Win Rate Benchmark</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your performance vs industry average
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPercentage(analyticsData.overview.win_rate)} vs {formatPercentage(comparisons.benchmarks.industry_avg_win_rate)}
                </p>
                <p className={`text-sm ${analyticsData.overview.win_rate > comparisons.benchmarks.industry_avg_win_rate ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.overview.win_rate > comparisons.benchmarks.industry_avg_win_rate ? 'Above' : 'Below'} average
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Response Time Benchmark</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your response time vs industry average
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {analyticsData.overview.avg_response_time}h vs {comparisons.benchmarks.industry_avg_response_time}h
                </p>
                <p className={`text-sm ${analyticsData.overview.avg_response_time < comparisons.benchmarks.industry_avg_response_time ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.overview.avg_response_time < comparisons.benchmarks.industry_avg_response_time ? 'Faster' : 'Slower'} than average
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Quote Value Benchmark</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your average quote value vs industry
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(analyticsData.overview.avg_quote_value, 'USD')} vs {formatCurrency(comparisons.benchmarks.industry_avg_value, 'USD')}
                </p>
                <p className={`text-sm ${analyticsData.overview.avg_quote_value > comparisons.benchmarks.industry_avg_value ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsData.overview.avg_quote_value > comparisons.benchmarks.industry_avg_value ? 'Above' : 'Below'} average
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Quote Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive insights into your quote performance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
              { value: '1y', label: 'Last Year' }
            ]}
          />
          <Button variant="outline" onClick={() => setShowForecasts(!showForecasts)}>
            {showForecasts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showForecasts ? 'Hide' : 'Show'} Forecasts
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'distributions', label: 'Distributions', icon: PieChart },
            { id: 'comparisons', label: 'Comparisons', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'distributions' && renderDistributionsTab()}
          {activeTab === 'comparisons' && renderComparisonsTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ComprehensiveQuoteAnalytics; 