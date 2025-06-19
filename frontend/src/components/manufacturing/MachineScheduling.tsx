import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Users,
  Wrench,
  Zap,
  Activity,
  Target,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  RefreshCw,
  Factory,
  Gauge,
  Timer,
  Cpu,
  HardDrive,
  Thermometer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productionApi } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface Machine {
  id: number;
  machineCode: string;
  name: string;
  type: string;
  location: string;
  status: 'Running' | 'Idle' | 'Maintenance' | 'Down' | 'Setup';
  currentJob: string | null;
  operator: string | null;
  efficiency: number;
  utilization: number;
  temperature: number;
  vibration: number;
  speed: number;
  maxSpeed: number;
  lastMaintenance: string;
  nextMaintenance: string;
  totalRuntime: number;
  cycleTime: number;
  targetCycleTime: number;
  partsProduced: number;
  targetProduction: number;
  qualityRate: number;
  oeeScore: number;
}

interface ProductionJob {
  id: number;
  jobNumber: string;
  partNumber: string;
  partName: string;
  quantity: number;
  producedQuantity: number;
  machineId: number;
  machineName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  startTime: string;
  endTime: string;
  estimatedDuration: number;
  actualDuration: number | null;
  setupTime: number;
  cycleTime: number;
  operator: string;
  notes: string;
}

interface CapacityMetrics {
  totalMachines: number;
  activeMachines: number;
  averageUtilization: number;
  averageOEE: number;
  totalCapacity: number;
  usedCapacity: number;
  plannedJobs: number;
  completedJobs: number;
  onTimeDelivery: number;
  qualityRate: number;
}

interface MachineSchedulingProps { manufacturerId?: string }

const MachineScheduling: React.FC<MachineSchedulingProps> = ({ manufacturerId }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [metrics, setMetrics] = useState<CapacityMetrics>({
    totalMachines: 0,
    activeMachines: 0,
    averageUtilization: 0,
    averageOEE: 0,
    totalCapacity: 0,
    usedCapacity: 0,
    plannedJobs: 0,
    completedJobs: 0,
    onTimeDelivery: 0,
    qualityRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State variables for functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMachine, setFilterMachine] = useState('all');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // Create Job modal form state
  const [jobForm, setJobForm] = useState({
    orderId: '',
    machineId: '',
    quantity: 1,
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  });

  // Assign resource mutation (creates job)
  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: (payload: { orderId: string; machineId: string }) =>
      productionApi.assignResource(payload.orderId, 'machine', payload.machineId),
    onSuccess: () => {
      toast.success('Job scheduled');
      setShowJobModal(false);
      queryClient.invalidateQueries({ queryKey: ['machine-utilization'] });
    },
    onError: () => toast.error('Failed to schedule job'),
  });

  // Drag-and-drop handler
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const updated = Array.from(jobs);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setJobs(updated);
    // Here we could call backend to persist ordering – TBD
  };

  const { data: machineUtilData, isLoading: machineLoading } = useQuery({
    queryKey: ['machine-utilization', manufacturerId],
    queryFn: () => productionApi.getMachineUtilization(manufacturerId),
    staleTime: 30000,
  });

  useEffect(() => {
    if (machineUtilData) {
      setMachines(machineUtilData.machines || []);
      setJobs(machineUtilData.jobs || []);
      setMetrics(machineUtilData.metrics || metrics);
    }
  }, [machineUtilData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'bg-green-100 text-green-800';
      case 'Idle': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-blue-100 text-blue-800';
      case 'Down': return 'bg-red-100 text-red-800';
      case 'Setup': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running': return <Play className="w-4 h-4" />;
      case 'Idle': return <Pause className="w-4 h-4" />;
      case 'Maintenance': return <Wrench className="w-4 h-4" />;
      case 'Down': return <Square className="w-4 h-4" />;
      case 'Setup': return <Settings className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Machine Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageUtilization.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Gauge className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.activeMachines}/{metrics.totalMachines} machines active
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall OEE</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageOEE.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Above target (80%)
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Capacity Usage</p>
              <p className="text-2xl font-bold text-gray-900">{((metrics.usedCapacity / metrics.totalCapacity) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              {metrics.usedCapacity}/{metrics.totalCapacity} units
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quality Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.qualityRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Excellent performance
            </div>
          </div>
        </motion.div>
      </div>

      {/* Machine Status Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Real-Time Machine Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((machine) => (
            <motion.div
              key={machine.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => console.log('Machine selected:', machine)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{machine.name}</h4>
                  <p className="text-sm text-gray-500">{machine.machineCode}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(machine.status)}`}>
                  {getStatusIcon(machine.status)}
                  <span className="ml-1">{machine.status}</span>
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Utilization:</span>
                  <span className="font-medium">{machine.utilization.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">OEE Score:</span>
                  <span className="font-medium">{machine.oeeScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Job:</span>
                  <span className="font-medium">{machine.currentJob || 'None'}</span>
                </div>
                {machine.operator && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Operator:</span>
                    <span className="font-medium">{machine.operator}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Production Schedule */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Today's Production Schedule</h3>
          <button
            onClick={() => setShowJobModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Job
          </button>
        </div>
        
        <div className="space-y-3">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(job.priority)}`}>
                    {job.priority}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mt-1">{job.partName}</h4>
                <p className="text-sm text-gray-500">{job.jobNumber} • {job.machineName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {job.producedQuantity}/{job.quantity} units
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(job.startTime).toLocaleTimeString()} - {new Date(job.endTime).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMachinesTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Running">Running</option>
            <option value="Idle">Idle</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Down">Down</option>
            <option value="Setup">Setup</option>
          </select>
        </div>
        
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {machines.map((machine) => (
          <motion.div
            key={machine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{machine.name}</h3>
                <p className="text-sm text-gray-500">{machine.machineCode} • {machine.type}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(machine.status)}`}>
                {getStatusIcon(machine.status)}
                <span className="ml-2">{machine.status}</span>
              </span>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{machine.utilization.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Utilization</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{machine.oeeScore.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">OEE Score</div>
              </div>
            </div>

            {/* Real-time Data */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Thermometer className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm text-gray-600">Temperature</span>
                </div>
                <span className="text-sm font-medium">{machine.temperature}°C</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-4 h-4 text-purple-500 mr-2" />
                  <span className="text-sm text-gray-600">Vibration</span>
                </div>
                <span className="text-sm font-medium">{machine.vibration} mm/s</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-600">Speed</span>
                </div>
                <span className="text-sm font-medium">{machine.speed}/{machine.maxSpeed} RPM</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Timer className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Cycle Time</span>
                </div>
                <span className="text-sm font-medium">{machine.cycleTime}s (Target: {machine.targetCycleTime}s)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setSelectedMachine(machine)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-1" />
                Details
              </button>
              <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  if (machineLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Machine Scheduling & Capacity Planning</h1>
        <p className="text-gray-600 mt-2">
          Real-time machine monitoring, production scheduling, and capacity optimization
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'machines', name: 'Machines', icon: Factory },
            { id: 'schedule', name: 'Production Schedule', icon: Calendar },
            { id: 'capacity', name: 'Capacity Planning', icon: Target },
            { id: 'analytics', name: 'Performance Analytics', icon: TrendingUp }
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
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'machines' && renderMachinesTab()}
        {activeTab === 'schedule' && (
          <div>
            {/* Header + Add Job button reuse */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Production Schedule</h3>
              <button
                onClick={() => setShowJobModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Job
              </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="job-list">
                {(provided: import('react-beautiful-dnd').DroppableProvided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {jobs.map((job, index) => (
                      <Draggable key={job.id.toString()} draggableId={job.id.toString()} index={index}>
                        {(dragProvided: import('react-beautiful-dnd').DraggableProvided, snapshot: import('react-beautiful-dnd').DraggableStateSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(job.priority)}`}>{job.priority}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>{job.status}</span>
                              </div>
                              <h4 className="font-medium text-gray-900 mt-1">{job.partName}</h4>
                              <p className="text-sm text-gray-500">{job.jobNumber} • {job.machineName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{job.producedQuantity}/{job.quantity} units</p>
                              <p className="text-xs text-gray-500">{new Date(job.startTime).toLocaleTimeString()} - {new Date(job.endTime).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
        {activeTab === 'capacity' && (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Capacity Planning</h3>
            <p className="text-gray-600">Intelligent capacity planning and optimization tools coming soon.</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">Comprehensive performance analytics and reporting coming soon.</p>
          </div>
        )}
      </AnimatePresence>

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule New Job</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                <input
                  type="text"
                  value={jobForm.orderId}
                  onChange={(e) => setJobForm({ ...jobForm, orderId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine ID</label>
                <input
                  type="text"
                  value={jobForm.machineId}
                  onChange={(e) => setJobForm({ ...jobForm, machineId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={jobForm.quantity}
                  onChange={(e) => setJobForm({ ...jobForm, quantity: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={jobForm.priority}
                  onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setShowJobModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >Cancel</button>
              <button
                onClick={() => assignMutation.mutate({ orderId: jobForm.orderId, machineId: jobForm.machineId })}
                disabled={assignMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineScheduling; 