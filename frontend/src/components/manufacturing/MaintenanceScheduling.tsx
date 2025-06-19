import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Calendar,
  Settings,
  TrendingUp,
  BarChart3,
  Plus,
  Timer,
  FileText,
  DollarSign,
  Gauge
} from 'lucide-react';

interface Equipment {
  id: number;
  equipmentCode: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: 'Operational' | 'Maintenance' | 'Down' | 'Scheduled';
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  installDate: string;
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceInterval: number; // days
  totalDowntime: number; // hours
  mtbf: number; // Mean Time Between Failures (hours)
  mttr: number; // Mean Time To Repair (hours)
  availability: number; // percentage
  maintenanceCost: number;
  spareParts: string[];
  technician: string;
  workOrders: number;
  completedMaintenance: number;
}

interface WorkOrder {
  id: number;
  workOrderNumber: string;
  equipmentId: number;
  equipmentName: string;
  type: 'Preventive' | 'Corrective' | 'Emergency' | 'Inspection';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  description: string;
  scheduledDate: string;
  startDate: string | null;
  completionDate: string | null;
  estimatedDuration: number; // hours
  actualDuration: number | null; // hours
  assignedTechnician: string;
  cost: number;
  spareParts: string[];
  notes: string;
  createdBy: string;
  createdDate: string;
}

interface MaintenanceMetrics {
  totalEquipment: number;
  operationalEquipment: number;
  equipmentInMaintenance: number;
  equipmentDown: number;
  averageAvailability: number;
  averageMTBF: number;
  averageMTTR: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  maintenanceCost: number;
  preventiveRatio: number;
}

const MaintenanceScheduling: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [metrics, setMetrics] = useState<MaintenanceMetrics>({
    totalEquipment: 0,
    operationalEquipment: 0,
    equipmentInMaintenance: 0,
    equipmentDown: 0,
    averageAvailability: 0,
    averageMTBF: 0,
    averageMTTR: 0,
    totalWorkOrders: 0,
    completedWorkOrders: 0,
    overdueWorkOrders: 0,
    maintenanceCost: 0,
    preventiveRatio: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State variables for functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockEquipment: Equipment[] = [
        {
          id: 1,
          equipmentCode: 'CNC-001',
          name: 'CNC Milling Machine #1',
          type: 'CNC Mill',
          manufacturer: 'Haas Automation',
          model: 'VF-2SS',
          serialNumber: 'HAS-2024-001',
          location: 'Production Floor A',
          status: 'Operational',
          criticality: 'High',
          installDate: '2022-01-15',
          lastMaintenance: '2024-01-10',
          nextMaintenance: '2024-02-10',
          maintenanceInterval: 30,
          totalDowntime: 24.5,
          mtbf: 720,
          mttr: 4.2,
          availability: 96.8,
          maintenanceCost: 15000,
          spareParts: ['Spindle Bearings', 'Coolant Pump', 'Tool Holders'],
          technician: 'Mike Wilson',
          workOrders: 12,
          completedMaintenance: 11
        },
        {
          id: 2,
          equipmentCode: 'LATHE-002',
          name: 'CNC Lathe #2',
          type: 'CNC Lathe',
          manufacturer: 'Mazak',
          model: 'INTEGREX i-200',
          serialNumber: 'MAZ-2023-002',
          location: 'Production Floor A',
          status: 'Maintenance',
          criticality: 'Critical',
          installDate: '2023-03-20',
          lastMaintenance: '2024-01-15',
          nextMaintenance: '2024-01-16',
          maintenanceInterval: 21,
          totalDowntime: 18.2,
          mtbf: 650,
          mttr: 3.8,
          availability: 94.2,
          maintenanceCost: 22000,
          spareParts: ['Chuck Jaws', 'Turret Tools', 'Hydraulic Filters'],
          technician: 'Carlos Martinez',
          workOrders: 8,
          completedMaintenance: 7
        },
        {
          id: 3,
          equipmentCode: 'PRESS-003',
          name: 'Hydraulic Press #3',
          type: 'Press',
          manufacturer: 'Schuler',
          model: 'MSP 630',
          serialNumber: 'SCH-2021-003',
          location: 'Production Floor B',
          status: 'Scheduled',
          criticality: 'Medium',
          installDate: '2021-08-10',
          lastMaintenance: '2024-01-05',
          nextMaintenance: '2024-02-05',
          maintenanceInterval: 45,
          totalDowntime: 32.1,
          mtbf: 480,
          mttr: 6.5,
          availability: 92.5,
          maintenanceCost: 8500,
          spareParts: ['Hydraulic Seals', 'Pressure Sensors', 'Safety Valves'],
          technician: 'Jennifer Davis',
          workOrders: 15,
          completedMaintenance: 14
        }
      ];

      // TODO: Load real work orders from maintenance management API
      // For production, this should connect to real maintenance scheduling system
      const realWorkOrders: WorkOrder[] = [];

      setEquipment(mockEquipment);
      setWorkOrders(realWorkOrders);
      setMetrics({
        totalEquipment: mockEquipment.length,
        operationalEquipment: mockEquipment.filter(e => e.status === 'Operational').length,
        equipmentInMaintenance: mockEquipment.filter(e => e.status === 'Maintenance').length,
        equipmentDown: mockEquipment.filter(e => e.status === 'Down').length,
        averageAvailability: mockEquipment.length > 0 ? mockEquipment.reduce((acc, e) => acc + e.availability, 0) / mockEquipment.length : 0,
        averageMTBF: mockEquipment.length > 0 ? mockEquipment.reduce((acc, e) => acc + e.mtbf, 0) / mockEquipment.length : 0,
        averageMTTR: mockEquipment.length > 0 ? mockEquipment.reduce((acc, e) => acc + e.mttr, 0) / mockEquipment.length : 0,
        totalWorkOrders: realWorkOrders.length,
        completedWorkOrders: realWorkOrders.filter(wo => wo.status === 'Completed').length,
        overdueWorkOrders: 0,
        maintenanceCost: mockEquipment.reduce((acc, e) => acc + e.maintenanceCost, 0),
        preventiveRatio: 0
      });
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-blue-100 text-blue-800';
      case 'Down': return 'bg-red-100 text-red-800';
      case 'Scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getWorkOrderStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Preventive': return 'bg-blue-100 text-blue-800';
      case 'Corrective': return 'bg-yellow-100 text-yellow-800';
      case 'Emergency': return 'bg-red-100 text-red-800';
      case 'Inspection': return 'bg-purple-100 text-purple-800';
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
              <p className="text-sm font-medium text-gray-600">Equipment Availability</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageAvailability.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Gauge className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.operationalEquipment}/{metrics.totalEquipment} operational
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
              <p className="text-sm font-medium text-gray-600">MTBF</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageMTBF.toFixed(0)}h</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Timer className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-blue-600">
              Mean Time Between Failures
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
              <p className="text-sm font-medium text-gray-600">MTTR</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageMTTR.toFixed(1)}h</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Wrench className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-yellow-600">
              Mean Time To Repair
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
              <p className="text-sm font-medium text-gray-600">Maintenance Cost</p>
              <p className="text-2xl font-bold text-gray-900">${(metrics.maintenanceCost / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-purple-600">
              YTD maintenance spend
            </div>
          </div>
        </motion.div>
      </div>

      {/* Equipment Status Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Equipment Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEquipment(item)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">{item.equipmentCode}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCriticalityColor(item.criticality)}`}>
                    {item.criticality}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Availability:</span>
                  <span className="font-medium">{item.availability.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">MTBF:</span>
                  <span className="font-medium">{item.mtbf}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Next Maintenance:</span>
                  <span className="font-medium">{new Date(item.nextMaintenance).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Technician:</span>
                  <span className="font-medium">{item.technician}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Work Orders */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Active Work Orders</h3>
          <button
            onClick={() => setShowWorkOrderModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Work Order
          </button>
        </div>
        
        <div className="space-y-3">
          {workOrders.filter(wo => wo.status !== 'Completed' && wo.status !== 'Cancelled').map((workOrder) => (
            <div key={workOrder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(workOrder.type)}`}>
                    {workOrder.type}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(workOrder.priority)}`}>
                    {workOrder.priority}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getWorkOrderStatusColor(workOrder.status)}`}>
                    {workOrder.status}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mt-1">{workOrder.description}</h4>
                <p className="text-sm text-gray-500">{workOrder.workOrderNumber} • {workOrder.equipmentName}</p>
                <p className="text-sm text-gray-500">Assigned to: {workOrder.assignedTechnician}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${workOrder.cost.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {workOrder.estimatedDuration}h estimated
                </p>
                <p className="text-xs text-gray-500">
                  Due: {new Date(workOrder.scheduledDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Type Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                <span className="text-sm font-medium">Preventive</span>
              </div>
              <span className="text-sm font-bold text-blue-600">{metrics.preventiveRatio.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                <span className="text-sm font-medium">Corrective</span>
              </div>
              <span className="text-sm font-bold text-yellow-600">{(100 - metrics.preventiveRatio).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Work Order Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Work Orders</span>
              <span className="text-sm font-medium">{metrics.totalWorkOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-medium text-green-600">{metrics.completedWorkOrders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">In Progress</span>
              <span className="text-sm font-medium text-yellow-600">
                {workOrders.filter(wo => wo.status === 'In Progress').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overdue</span>
              <span className="text-sm font-medium text-red-600">{metrics.overdueWorkOrders}</span>
            </div>
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Scheduling & Equipment Tracking</h1>
        <p className="text-gray-600 mt-2">
          Preventive maintenance planning, equipment monitoring, and maintenance analytics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'equipment', name: 'Equipment', icon: Settings },
            { id: 'workorders', name: 'Work Orders', icon: FileText },
            { id: 'schedule', name: 'Maintenance Schedule', icon: Calendar },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
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
        {activeTab === 'equipment' && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment Management</h3>
            <p className="text-gray-600">Detailed equipment tracking and management coming soon.</p>
          </div>
        )}
        {activeTab === 'workorders' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Work Order Management</h3>
            <p className="text-gray-600">Comprehensive work order management system coming soon.</p>
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance Schedule</h3>
            <p className="text-gray-600">Advanced maintenance scheduling and planning coming soon.</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance Analytics</h3>
            <p className="text-gray-600">Comprehensive maintenance analytics and reporting coming soon.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaintenanceScheduling;