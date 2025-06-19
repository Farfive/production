import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  Wrench,
  Award,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Import the manufacturing components
import MachineScheduling from '../components/manufacturing/MachineScheduling';
import WorkforceManagement from '../components/manufacturing/WorkforceManagement';
import MaintenanceScheduling from '../components/manufacturing/MaintenanceScheduling';
import QualityCertifications from '../components/manufacturing/QualityCertifications';

const ManufacturingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Advanced Manufacturing Management</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Comprehensive manufacturing operations management with machine scheduling, workforce planning, 
          maintenance tracking, and quality certifications
        </p>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Machine Utilization</p>
              <p className="text-2xl font-bold text-gray-900">87.3%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              ↑ 5.2% from last month
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
              <p className="text-sm font-medium text-gray-600">Workforce Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">94.2%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              ↑ 2.1% from last month
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
              <p className="text-sm font-medium text-gray-600">Equipment Uptime</p>
              <p className="text-2xl font-bold text-gray-900">96.8%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              ↑ 1.5% from last month
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
              <p className="text-sm font-medium text-gray-600">Quality Score</p>
              <p className="text-2xl font-bold text-gray-900">98.5%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              ↑ 0.8% from last month
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveTab('machines')}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full mr-4">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Machine Scheduling</h3>
              <p className="text-gray-600">Real-time machine monitoring and capacity planning</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Machines:</span>
              <span className="font-medium">12/15</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Average OEE:</span>
              <span className="font-medium">85.4%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Scheduled Jobs:</span>
              <span className="font-medium">24</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveTab('workforce')}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Workforce Management</h3>
              <p className="text-gray-600">Employee scheduling and performance tracking</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Employees:</span>
              <span className="font-medium">156</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Attendance Rate:</span>
              <span className="font-medium">96.5%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Performance Rating:</span>
              <span className="font-medium">4.5/5.0</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveTab('maintenance')}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full mr-4">
              <Wrench className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Maintenance Scheduling</h3>
              <p className="text-gray-600">Preventive maintenance and equipment tracking</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Equipment Availability:</span>
              <span className="font-medium">94.5%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">MTBF:</span>
              <span className="font-medium">617h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Work Orders:</span>
              <span className="font-medium">8</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white p-8 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveTab('quality')}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Quality Certifications</h3>
              <p className="text-gray-600">Certification management and compliance tracking</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Certifications:</span>
              <span className="font-medium">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Compliance Score:</span>
              <span className="font-medium">91.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Upcoming Audits:</span>
              <span className="font-medium">3</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Manufacturing Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Production target achieved</p>
              <p className="text-xs text-gray-500">CNC Line 1 completed 160/160 units - 2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Maintenance completed</p>
              <p className="text-xs text-gray-500">CNC Lathe #2 preventive maintenance finished - 4 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Shift understaffed</p>
              <p className="text-xs text-gray-500">Evening shift needs 1 additional operator - 6 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-purple-50 rounded-lg">
            <Award className="w-5 h-5 text-purple-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Quality audit scheduled</p>
              <p className="text-xs text-gray-500">ISO 9001 surveillance audit confirmed for June 15 - 1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'machines', name: 'Machine Scheduling', icon: Settings },
              { id: 'workforce', name: 'Workforce Management', icon: Users },
              { id: 'maintenance', name: 'Maintenance', icon: Wrench },
              { id: 'quality', name: 'Quality & Compliance', icon: Award }
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'machines' && <MachineScheduling />}
            {activeTab === 'workforce' && <WorkforceManagement />}
            {activeTab === 'maintenance' && <MaintenanceScheduling />}
            {activeTab === 'quality' && <QualityCertifications />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManufacturingPage;