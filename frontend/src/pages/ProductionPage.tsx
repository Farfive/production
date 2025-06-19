import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Factory,
  BarChart3,
  Target,
  Settings,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
  Filter,
  Search,
  Wrench,
  Zap,
  Thermometer,
  Gauge,
  Brain,
  Shield,
  Play,
  Pause,
  Square,
  Bell,
  Eye,
  MapPin,
  Package,
  Cpu,
  Wifi
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProductionDashboard from '../components/production/ProductionDashboard';
import QualityControlDashboard from '../components/production/QualityControlDashboard';
import MachineScheduling from '../components/manufacturing/MachineScheduling';
import { productionApi, qualityApi, manufacturingApi } from '../lib/api';

// Register Chart.js components (once)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ProductionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quality' | 'capacity' | 'analytics' | 'machines'>('dashboard');
  const [manufacturerId, setManufacturerId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('week');

  // Fetch production overview data
  const { data: productionOverview, isLoading: loadingProduction, refetch: refetchProduction } = useQuery({
    queryKey: ['production-overview', manufacturerId, dateRange],
    queryFn: () => productionApi.getDashboardData({
      manufacturerId: manufacturerId || undefined,
      date: new Date(),
      viewMode: dateRange
    }),
    refetchInterval: 30000,
  });

  // Fetch quality overview data
  const { data: qualityOverview, isLoading: loadingQuality, refetch: refetchQuality } = useQuery({
    queryKey: ['quality-overview', manufacturerId],
    queryFn: () => qualityApi.getDashboardData(manufacturerId || undefined),
    refetchInterval: 30000,
  });

  const tabs = [
    {
      id: 'dashboard',
      label: 'Production Dashboard',
      icon: Factory,
      description: 'Monitor production operations and resource allocation'
    },
    {
      id: 'quality',
      label: 'Quality Control',
      icon: Target,
      description: 'Manage quality checks and photo documentation'
    },
    {
      id: 'capacity',
      label: 'Capacity Planning',
      icon: BarChart3,
      description: 'Plan and optimize production capacity'
    },
    {
      id: 'machines',
      label: 'Machine Scheduling',
      icon: Wrench,
      description: 'Schedule jobs and monitor machine utilization'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      description: 'View production performance analytics'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProductionDashboard manufacturerId={manufacturerId || undefined} />;
      case 'quality':
        return <QualityControlDashboard manufacturerId={manufacturerId || undefined} />;
      case 'capacity':
        return renderCapacityPlanning();
      case 'machines':
        return <MachineScheduling manufacturerId={manufacturerId || undefined} />;
      case 'analytics':
        return renderAnalytics();
      default:
        return <ProductionDashboard manufacturerId={manufacturerId || undefined} />;
    }
  };

  const renderCapacityPlanning = () => {
    const capacityHistory = productionOverview?.capacity ?? [
      { date: '2025-06-12', used: 65, available: 35 },
      { date: '2025-06-13', used: 68, available: 32 },
      { date: '2025-06-14', used: 72, available: 28 },
      { date: '2025-06-15', used: 70, available: 30 },
      { date: '2025-06-16', used: 75, available: 25 },
      { date: '2025-06-17', used: 78, available: 22 },
      { date: '2025-06-18', used: 74, available: 26 },
    ] as Array<{ date: string; used: number; available: number }>;

    const barData = {
      labels: capacityHistory.map((row: { date: string }) => row.date.slice(5)),
      datasets: [
        {
          label: 'Used %',
          data: capacityHistory.map((row: { used: number }) => row.used),
          backgroundColor: '#6366F1',
          borderRadius: 4,
        },
        {
          label: 'Available %',
          data: capacityHistory.map((row: { available: number }) => row.available),
          backgroundColor: '#E5E7EB',
          borderRadius: 4,
        },
      ],
    };

    const barOptions = {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: false },
      },
      scales: {
        y: { stacked: true, max: 100 },
        x: { stacked: true },
      },
    };

    return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Weekly Capacity Utilization
        </h3>
          <Bar data={barData} options={barOptions} height={120} />
      </div>
    </div>
  );
  };

  const renderAnalytics = () => {
    const throughput = productionOverview?.throughput ?? [
      { date: '2025-06-12', orders: 8 },
      { date: '2025-06-13', orders: 10 },
      { date: '2025-06-14', orders: 9 },
      { date: '2025-06-15', orders: 11 },
      { date: '2025-06-16', orders: 14 },
      { date: '2025-06-17', orders: 13 },
      { date: '2025-06-18', orders: 15 },
    ] as Array<{ date: string; orders: number }>;

    const lineData = {
      labels: throughput.map((item: { date: string }) => item.date.slice(5)),
      datasets: [
        {
          label: 'Orders Completed',
          data: throughput.map((item: { orders: number }) => item.orders),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    const lineOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    };

    return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Completed Orders (Last 7 Days)
        </h3>
          <Line data={lineData} options={lineOptions} height={120} />
      </div>
    </div>
  );
  };

  const isLoading = loadingProduction || loadingQuality;

  if (isLoading) {
    return <LoadingSpinner center />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Production Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor production operations, quality control, and resource allocation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' }
            ]}
            className="w-36"
          />
          <Button variant="outline" onClick={() => {
            refetchProduction();
            refetchQuality();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {productionOverview?.metrics?.activeOrders || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Factory className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 ml-1">vs last period</span>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Capacity Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {productionOverview?.metrics?.capacityUsed || 0}%
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <Activity className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-blue-600">Optimal range</span>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {qualityOverview?.metrics?.averageScore || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">Above target</span>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On-Time Delivery</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {productionOverview?.metrics?.onTimeDelivery || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
            <span className="text-orange-600">2 delayed orders</span>
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
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
  );
};

export default ProductionPage; 