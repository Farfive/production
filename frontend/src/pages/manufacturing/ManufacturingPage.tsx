import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Factory, Cog, TrendingUp, Clock, AlertTriangle, CheckCircle,
  Play, Pause, Square, Settings, BarChart3, Calendar,
  Wrench, Package, Users, Zap, ThermometerSun, Activity,
  PieChart, Target, Timer, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { manufacturingApi } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Machine {
  id: number;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'maintenance' | 'offline';
  utilization: number;
  efficiency: number;
  temperature: number;
  vibration: number;
  speed: number;
  output: number;
  uptime: number;
  lastMaintenance: string;
  nextMaintenance: string;
  currentJob?: ProductionJob;
  location: string;
  operator?: string;
  alerts: Alert[];
}

interface ProductionJob {
  id: number;
  orderId: number;
  partNumber: string;
  description: string;
  quantity: number;
  completed: number;
  startTime: string;
  estimatedCompletion: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  materials: Material[];
  operations: Operation[];
}

interface Operation {
  id: number;
  name: string;
  machineId: number;
  duration: number;
  completed: boolean;
  startTime?: string;
  endTime?: string;
  operator: string;
  qualityChecks: QualityCheck[];
}

interface QualityCheck {
  id: number;
  type: string;
  result: 'pass' | 'fail' | 'pending';
  timestamp: string;
  operator: string;
  notes?: string;
}

interface Material {
  id: number;
  name: string;
  required: number;
  available: number;
  unit: string;
  supplier: string;
  cost: number;
}

interface Alert {
  id: number;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface ProductionMetrics {
  overallEfficiency: number;
  throughput: number;
  qualityRate: number;
  uptimePercentage: number;
  energyConsumption: number;
  defectRate: number;
  onTimeDelivery: number;
  costPerUnit: number;
}

// Helper functions for mock data generation
const generateMockMachineData = (): Machine[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Machine ${String.fromCharCode(65 + i)}`,
    type: ['CNC Mill', 'Lathe', '3D Printer', 'Injection Molding', 'Assembly Line', 'Welding', 'Cutting', 'Grinding'][i],
    status: ['running', 'idle', 'maintenance', 'offline'][Math.floor(Math.random() * 4)] as any,
    utilization: Math.floor(Math.random() * 100),
    efficiency: 75 + Math.floor(Math.random() * 25),
    temperature: 20 + Math.floor(Math.random() * 60),
    vibration: Math.floor(Math.random() * 10),
    speed: 800 + Math.floor(Math.random() * 1200),
    output: Math.floor(Math.random() * 100),
    uptime: 85 + Math.floor(Math.random() * 15),
    lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    nextMaintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: `Floor ${Math.floor(i / 4) + 1}, Bay ${(i % 4) + 1}`,
    operator: `Operator ${i + 1}`,
    alerts: []
  }));
};

const generateMockMetrics = (): ProductionMetrics => ({
  overallEfficiency: 82,
  throughput: 156,
  qualityRate: 94.5,
  uptimePercentage: 87.3,
  energyConsumption: 245.8,
  defectRate: 5.5,
  onTimeDelivery: 91.2,
  costPerUnit: 12.45
});

const generateRealTimeSensorData = (machines: Machine[]) => {
  return machines.map(machine => ({
    machineId: machine.id,
    timestamp: new Date().toISOString(),
    temperature: machine.temperature + (Math.random() - 0.5) * 5,
    vibration: machine.vibration + (Math.random() - 0.5) * 2,
    speed: machine.speed + (Math.random() - 0.5) * 100,
    powerConsumption: 50 + Math.random() * 150,
    outputRate: machine.output + (Math.random() - 0.5) * 10
  }));
};

const ManufacturingPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'machines' | 'jobs' | 'quality' | 'analytics'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '8h' | '24h' | '7d' | '30d'>('24h');

  // Fetch production data with enhanced real-time integration
  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ['machines', timeRange],
    queryFn: async () => {
      const response = await manufacturingApi.getMachines(timeRange);
      return response.data || [];
    },
    refetchInterval: 15000 // More frequent updates for real-time monitoring
  });

  const { data: productionJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['production-jobs', timeRange],
    queryFn: async () => {
      const response = await manufacturingApi.getProductionJobs(timeRange);
      return response.data || [];
    },
    refetchInterval: 30000
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['production-metrics', timeRange],
    queryFn: async () => {
      const response = await manufacturingApi.getProductionMetrics(timeRange);
      return response.data || {};
    },
    refetchInterval: 60000
  });

  const { data: performanceHistory } = useQuery({
    queryKey: ['performance-history', timeRange],
    queryFn: async () => {
      const response = await manufacturingApi.getPerformanceHistory(timeRange);
      return response.data || [];
    },
    refetchInterval: 300000
  });

  // Real-time IoT sensor data simulation
  const { data: sensorData } = useQuery({
    queryKey: ['sensor-data'],
    queryFn: () => generateRealTimeSensorData(machines || []),
    refetchInterval: 5000 // Very frequent updates for sensor data
  });

  // Production planning optimization
  const { data: productionPlan } = useQuery({
    queryKey: ['production-plan', timeRange],
    queryFn: async () => {
      const response = await manufacturingApi.getOptimizedProductionPlan();
      return response.data || {};
    },
    refetchInterval: 300000
  });

  // Machine control mutations
  const startMachineMutation = useMutation({
    mutationFn: (machineId: number) => manufacturingApi.startMachine(machineId),
    onSuccess: () => {
      toast.success('Machine started successfully');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start machine');
    }
  });

  const stopMachineMutation = useMutation({
    mutationFn: (machineId: number) => manufacturingApi.stopMachine(machineId),
    onSuccess: () => {
      toast.success('Machine stopped successfully');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to stop machine');
    }
  });

  const scheduleMaintenance = useMutation({
    mutationFn: ({ machineId, date }: { machineId: number; date: string }) => 
      manufacturingApi.scheduleMaintenance(machineId, date),
    onSuccess: () => {
      toast.success('Maintenance scheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to schedule maintenance');
    }
  });

  // Job control mutations
  const startJobMutation = useMutation({
    mutationFn: (jobId: number) => manufacturingApi.startJob(jobId),
    onSuccess: () => {
      toast.success('Production job started');
      queryClient.invalidateQueries({ queryKey: ['production-jobs'] });
    }
  });

  const pauseJobMutation = useMutation({
    mutationFn: (jobId: number) => manufacturingApi.pauseJob(jobId),
    onSuccess: () => {
      toast.success('Production job paused');
      queryClient.invalidateQueries({ queryKey: ['production-jobs'] });
    }
  });

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': case 'in_progress': return 'green';
      case 'idle': case 'pending': return 'yellow';
      case 'maintenance': case 'paused': return 'orange';
      case 'offline': case 'cancelled': return 'red';
      case 'completed': return 'blue';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  // Calculate real-time statistics
  const runningMachines = machines?.filter(m => m.status === 'running').length || 0;
  const totalMachines = machines?.length || 0;
  const activeJobs = productionJobs?.filter(j => j.status === 'in_progress').length || 0;
  const avgEfficiency = machines?.reduce((sum, m) => sum + m.efficiency, 0) / (machines?.length || 1) || 0;

  if (machinesLoading || jobsLoading || metricsLoading) {
    return <LoadingSpinner center text="Loading manufacturing data..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Factory className="w-8 h-8" />
            Manufacturing Operations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time production monitoring and control
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="8h">Last 8 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className="flex border border-gray-300 rounded-md">
            {['overview', 'machines', 'jobs', 'quality'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-4 py-2 capitalize ${
                  viewMode === mode 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{runningMachines}/{totalMachines}</div>
              <div className="text-sm text-gray-500">Machines Running</div>
            </div>
            <Cog className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-500">
              {((runningMachines / totalMachines) * 100).toFixed(1)}% Operational
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{activeJobs}</div>
              <div className="text-sm text-gray-500">Active Jobs</div>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-500">
              {productionJobs?.filter(j => j.status === 'pending').length || 0} Pending
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{avgEfficiency.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Avg Efficiency</div>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-500">
              Target: 85%
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{metrics?.qualityRate?.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Quality Rate</div>
            </div>
            <CheckCircle className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-500">
              {metrics?.defectRate?.toFixed(2)}% Defect Rate
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="space-y-8">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Production Efficiency Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="throughput" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Machine Utilization</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={machines?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Critical Alerts */}
          {machines?.some(m => m.alerts.length > 0) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Critical Alerts
              </h3>
              <div className="space-y-3">
                {machines?.flatMap(m => 
                  m.alerts.filter(a => !a.acknowledged).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="font-medium">{alert.message}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {viewMode === 'machines' && (
        <div className="space-y-6">
          {/* Machine Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines?.map((machine) => (
              <Card key={machine.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{machine.name}</h3>
                    <p className="text-sm text-gray-500">{machine.type}</p>
                  </div>
                  <Badge color={getStatusColor(machine.status)}>
                    {machine.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Machine Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Utilization</div>
                    <div className="text-lg font-bold">{machine.utilization}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Efficiency</div>
                    <div className="text-lg font-bold">{machine.efficiency}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Temperature</div>
                    <div className="text-lg font-bold">{machine.temperature}°C</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Speed</div>
                    <div className="text-lg font-bold">{machine.speed} RPM</div>
                  </div>
                </div>

                {/* Current Job */}
                {machine.currentJob && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium">Current Job</div>
                    <div className="text-sm">{machine.currentJob.partNumber}</div>
                    <div className="text-xs text-gray-500">
                      {machine.currentJob.completed}/{machine.currentJob.quantity} completed
                    </div>
                  </div>
                )}

                {/* Machine Controls */}
                <div className="flex items-center gap-2">
                  {machine.status === 'idle' && (
                    <Button
                      size="sm"
                      onClick={() => startMachineMutation.mutate(machine.id)}
                      leftIcon={<Play className="w-4 h-4" />}
                      disabled={startMachineMutation.isPending}
                    >
                      Start
                    </Button>
                  )}
                  {machine.status === 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stopMachineMutation.mutate(machine.id)}
                      leftIcon={<Pause className="w-4 h-4" />}
                      disabled={stopMachineMutation.isPending}
                    >
                      Stop
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedMachine(machine.id)}
                    leftIcon={<Settings className="w-4 h-4" />}
                  >
                    Details
                  </Button>
                </div>

                {/* Maintenance Info */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Last: {new Date(machine.lastMaintenance).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Next: {new Date(machine.nextMaintenance).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'jobs' && (
        <div className="space-y-6">
          {/* Production Jobs Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Production Jobs</h3>
              <Button leftIcon={<Calendar className="w-4 h-4" />}>
                Schedule New Job
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Job ID</th>
                    <th className="text-left p-3">Part Number</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Progress</th>
                    <th className="text-left p-3">Priority</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Est. Completion</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productionJobs?.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">#{job.id}</td>
                      <td className="p-3">{job.partNumber}</td>
                      <td className="p-3">{job.quantity}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${(job.completed / job.quantity) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{Math.round((job.completed / job.quantity) * 100)}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge color={getPriorityColor(job.priority)}>
                          {job.priority.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge color={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {new Date(job.estimatedCompletion).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {job.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => startJobMutation.mutate(job.id)}
                              leftIcon={<Play className="w-3 h-3" />}
                            >
                              Start
                            </Button>
                          )}
                          {job.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseJobMutation.mutate(job.id)}
                              leftIcon={<Pause className="w-3 h-3" />}
                            >
                              Pause
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'quality' && (
        <div className="space-y-6">
          {/* Quality Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quality Rate</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {metrics?.qualityRate?.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                Target: 95%
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Defect Rate</h3>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {metrics?.defectRate?.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">
                Target: &lt;2%
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="font-semibold mb-4">First Pass Yield</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {((metrics?.qualityRate || 0) * 0.95).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                Industry Avg: 89%
              </div>
            </Card>
          </div>

          {/* Quality Control Checks */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Quality Checks</h3>
            <div className="space-y-3">
              {productionJobs?.flatMap(job => 
                job.operations.flatMap(op => op.qualityChecks)
              ).slice(0, 10).map((check) => (
                <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{check.type}</div>
                    <div className="text-sm text-gray-500">
                      {check.operator} • {new Date(check.timestamp).toLocaleString()}
                    </div>
                    {check.notes && (
                      <div className="text-sm text-gray-600 mt-1">{check.notes}</div>
                    )}
                  </div>
                  <Badge color={check.result === 'pass' ? 'green' : check.result === 'fail' ? 'red' : 'yellow'}>
                    {check.result.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManufacturingPage; 