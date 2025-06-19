import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Play,
  Pause,
  Square,
  RotateCcw,
  Flag,
  Package,
  Truck,
  MapPin,
  Camera,
  FileText,
  MessageSquare,
  Bell,
  Search,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
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
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import LoadingSpinner from '../ui/LoadingSpinner';
import { productionApi } from '../../lib/api';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';

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

interface Machine {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  currentOrder?: string;
  utilizationRate: number;
  maintenanceScheduled?: string;
  capabilities: string[];
  location: string;
  operator?: {
    id: string;
    name: string;
  };
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  title: string;
  client: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'queued' | 'in_progress' | 'paused' | 'completed' | 'delayed';
  progress: number;
  estimatedCompletion: string;
  actualStart?: string;
  assignedMachines: string[];
  assignedWorkers: string[];
  materials: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
  }>;
  qualityChecks: Array<{
    id: string;
    name: string;
    status: 'pending' | 'passed' | 'failed';
    scheduledDate: string;
  }>;
  bottlenecks: Array<{
    type: 'machine' | 'material' | 'worker' | 'quality';
    description: string;
    severity: 'low' | 'medium' | 'high';
    estimatedDelay: number; // in hours
  }>;
}

interface Worker {
  id: string;
  name: string;
  role: string;
  skills: string[];
  status: 'available' | 'busy' | 'break' | 'offline';
  currentOrder?: string;
  efficiency: number;
  hoursWorked: number;
  maxHours: number;
}

interface ProductionCapacity {
  date: string;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  orders: number;
  efficiency: number;
}

interface ProductionDashboardProps {
  manufacturerId?: string;
  className?: string;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({
  manufacturerId,
  className
}) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch production data
  const { data: productionData, isLoading, refetch } = useQuery({
    queryKey: ['production-dashboard', manufacturerId, selectedDate, viewMode],
    queryFn: () => productionApi.getDashboardData({
      manufacturerId,
      date: selectedDate,
      viewMode
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: (data: { orderId: string; status: string; notes?: string }) =>
      productionApi.updateOrderStatus(data.orderId, data.status, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-dashboard'] });
      toast.success('Order status updated');
    },
    onError: () => {
      toast.error('Failed to update order status');
    }
  });

  // Assign resource mutation
  const assignResourceMutation = useMutation({
    mutationFn: (data: { orderId: string; resourceType: 'machine' | 'worker'; resourceId: string }) =>
      productionApi.assignResource(data.orderId, data.resourceType, data.resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-dashboard'] });
      toast.success('Resource assigned successfully');
    },
    onError: () => {
      toast.error('Failed to assign resource');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'busy':
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'maintenance':
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'offline':
      case 'delayed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredOrders = productionData?.orders?.filter((order: ProductionOrder) => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;
    const matchesSearch = order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.client.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  }) || [];

  const renderCapacityChart = () => {
    if (!productionData?.capacity) return null;

    const chartData = {
      labels: productionData.capacity.map((item: ProductionCapacity) => 
        format(parseISO(item.date), 'MMM dd')
      ),
      datasets: [
        {
          label: 'Used Capacity',
          data: productionData.capacity.map((item: ProductionCapacity) => item.usedCapacity),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: 'Available Capacity',
          data: productionData.capacity.map((item: ProductionCapacity) => item.availableCapacity),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Production Capacity Overview',
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
        },
      },
    };

    return (
      <div className="h-64">
        <Bar data={chartData} options={options} />
      </div>
    );
  };

  const renderMachineUtilization = () => {
    if (!productionData?.machines) return null;

    const chartData = {
      labels: productionData.machines.map((machine: Machine) => machine.name),
      datasets: [
        {
          data: productionData.machines.map((machine: Machine) => machine.utilizationRate),
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

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right' as const,
        },
        title: {
          display: true,
          text: 'Machine Utilization',
        },
      },
    };

    return (
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder || !showOrderModal) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order #{selectedOrder.orderNumber}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedOrder.title}</p>
            </div>
            <Button variant="ghost" onClick={() => setShowOrderModal(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Progress
                  </h4>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedOrder.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedOrder.progress}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Client:</span>
                    <p className="font-medium">{selectedOrder.client}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedOrder.priority)}`}>
                      {selectedOrder.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Est. Completion:</span>
                    <p className="font-medium">{format(parseISO(selectedOrder.estimatedCompletion), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Materials
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.materials.map((material, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm">{material.name}</span>
                        <div className="text-sm">
                          <span className={material.available >= material.required ? 'text-green-600' : 'text-red-600'}>
                            {material.available}
                          </span>
                          <span className="text-gray-500">/{material.required} {material.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Checks */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Quality Checks
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.qualityChecks.map(check => (
                      <div key={check.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div>
                          <span className="text-sm font-medium">{check.name}</span>
                          <p className="text-xs text-gray-500">
                            Scheduled: {format(parseISO(check.scheduledDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(check.status)}`}>
                          {check.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resources and Bottlenecks */}
              <div className="space-y-4">
                {/* Assigned Machines */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Assigned Machines
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.assignedMachines.map(machineId => {
                      const machine = productionData?.machines?.find((m: Machine) => m.id === machineId);
                      return machine ? (
                        <div key={machine.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <span className="text-sm font-medium">{machine.name}</span>
                            <p className="text-xs text-gray-500">{machine.type}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(machine.status)}`}>
                            {machine.status}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Assigned Workers */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Assigned Workers
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.assignedWorkers.map(workerId => {
                      const worker = productionData?.workers?.find((w: Worker) => w.id === workerId);
                      return worker ? (
                        <div key={worker.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <span className="text-sm font-medium">{worker.name}</span>
                            <p className="text-xs text-gray-500">{worker.role}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(worker.status)}`}>
                              {worker.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {worker.hoursWorked}/{worker.maxHours}h
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Bottlenecks */}
                {selectedOrder.bottlenecks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Bottlenecks
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.bottlenecks.map((bottleneck, index) => (
                        <div key={index} className="p-3 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-800 dark:text-red-200">
                              {bottleneck.type.toUpperCase()} BOTTLENECK
                            </span>
                            <span className="text-xs text-red-600 dark:text-red-400">
                              +{bottleneck.estimatedDelay}h delay
                            </span>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {bottleneck.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowOrderModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                // Handle order actions
                setShowOrderModal(false);
              }}
            >
              Update Order
            </Button>
          </div>
        </motion.div>
      </motion.div>
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
            Production Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage your production operations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'day' | 'week' | 'month')}
            options={[
              { value: 'day', label: 'Day View' },
              { value: 'week', label: 'Week View' },
              { value: 'month', label: 'Month View' }
            ]}
          />
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

      {/* Key Metrics */}
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
                {productionData?.metrics?.activeOrders || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 ml-1">vs last week</span>
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
                {productionData?.metrics?.capacityUsed || 0}%
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On-Time Delivery</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {productionData?.metrics?.onTimeDelivery || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+5%</span>
            <span className="text-gray-500 ml-1">vs last month</span>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {productionData?.metrics?.qualityScore || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
            <span className="text-orange-600">2 issues</span>
            <span className="text-gray-500 ml-1">need attention</span>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Production Capacity
          </h3>
          {renderCapacityChart()}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Machine Utilization
          </h3>
          {renderMachineUtilization()}
        </div>
      </div>

      {/* Orders and Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Production Orders
              </h3>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'queued', label: 'Queued' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'paused', label: 'Paused' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'delayed', label: 'Delayed' }
                  ]}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredOrders.map((order: ProductionOrder) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {order.title} - {order.client}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${order.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{order.progress}%</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Due: {format(parseISO(order.estimatedCompletion), 'MMM dd')}
                        </span>
                        {order.bottlenecks.length > 0 && (
                          <span className="flex items-center text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {order.bottlenecks.length} issues
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Resource Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resource Status
            </h3>
          </div>

          <div className="p-6">
            {/* Machines */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Machines ({productionData?.machines?.length || 0})
              </h4>
              <div className="space-y-2">
                {productionData?.machines?.slice(0, 5).map((machine: Machine) => (
                  <div key={machine.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <span className="text-sm font-medium">{machine.name}</span>
                      <p className="text-xs text-gray-500">{machine.type}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(machine.status)}`}>
                        {machine.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {machine.utilizationRate}% util.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workers */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Workers ({productionData?.workers?.length || 0})
              </h4>
              <div className="space-y-2">
                {productionData?.workers?.slice(0, 5).map((worker: Worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <span className="text-sm font-medium">{worker.name}</span>
                      <p className="text-xs text-gray-500">{worker.role}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(worker.status)}`}>
                        {worker.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {worker.hoursWorked}/{worker.maxHours}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && renderOrderModal()}
      </AnimatePresence>
    </div>
  );
};

export default ProductionDashboard; 