import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Calendar,
  User,
  UserCheck,
  UserX,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Star,
  CheckCircle,
  AlertTriangle,
  Timer,
  Target,
  Activity,
  GraduationCap,
  Shield,
  Zap
} from 'lucide-react';

interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  shift: 'Day' | 'Evening' | 'Night' | 'Rotating';
  status: 'Active' | 'On Leave' | 'Training' | 'Inactive';
  hireDate: string;
  supervisor: string;
  skills: string[];
  certifications: string[];
  performanceRating: number;
  attendanceRate: number;
  productivityScore: number;
  safetyScore: number;
  hourlyRate: number;
  overtimeHours: number;
  totalHours: number;
  lastTraining: string;
  nextReview: string;
}

interface Shift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  date: string;
  department: string;
  requiredStaff: number;
  assignedStaff: number;
  supervisor: string;
  status: 'Planned' | 'Active' | 'Completed' | 'Understaffed';
  employees: string[];
  notes: string;
}

interface WorkforceMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  newHires: number;
  averagePerformance: number;
  attendanceRate: number;
  trainingCompliance: number;
  safetyScore: number;
  overtimeHours: number;
  turnoverRate: number;
}

const WorkforceManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [metrics, setMetrics] = useState<WorkforceMetrics>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    newHires: 0,
    averagePerformance: 0,
    attendanceRate: 0,
    trainingCompliance: 0,
    safetyScore: 0,
    overtimeHours: 0,
    turnoverRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterShift, setFilterShift] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  useEffect(() => {
    loadWorkforceData();
  }, []);

  const loadWorkforceData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockEmployees: Employee[] = [
        {
          id: 1,
          employeeId: 'EMP001',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@company.com',
          phone: '+1-555-0123',
          department: 'Production',
          position: 'Machine Operator',
          shift: 'Day',
          status: 'Active',
          hireDate: '2022-03-15',
          supervisor: 'Mike Johnson',
          skills: ['CNC Operation', 'Quality Control', 'Safety Protocols'],
          certifications: ['OSHA 30', 'Forklift Operator', 'First Aid'],
          performanceRating: 4.5,
          attendanceRate: 96.5,
          productivityScore: 92.3,
          safetyScore: 98.1,
          hourlyRate: 28.50,
          overtimeHours: 12.5,
          totalHours: 172.5,
          lastTraining: '2024-01-10',
          nextReview: '2024-03-15'
        },
        {
          id: 2,
          employeeId: 'EMP002',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@company.com',
          phone: '+1-555-0456',
          department: 'Quality Control',
          position: 'Quality Inspector',
          shift: 'Day',
          status: 'Active',
          hireDate: '2021-08-20',
          supervisor: 'Lisa Chen',
          skills: ['Quality Inspection', 'Statistical Analysis', 'Documentation'],
          certifications: ['ISO 9001', 'Six Sigma Green Belt', 'Measurement Systems'],
          performanceRating: 4.8,
          attendanceRate: 98.2,
          productivityScore: 95.7,
          safetyScore: 99.5,
          hourlyRate: 32.00,
          overtimeHours: 8.0,
          totalHours: 168.0,
          lastTraining: '2024-01-05',
          nextReview: '2024-08-20'
        },
        {
          id: 3,
          employeeId: 'EMP003',
          firstName: 'Mike',
          lastName: 'Wilson',
          email: 'mike.wilson@company.com',
          phone: '+1-555-0789',
          department: 'Maintenance',
          position: 'Maintenance Technician',
          shift: 'Evening',
          status: 'Active',
          hireDate: '2020-11-10',
          supervisor: 'Tom Rodriguez',
          skills: ['Electrical Systems', 'Hydraulics', 'Preventive Maintenance'],
          certifications: ['Electrical License', 'Hydraulic Systems', 'Lockout/Tagout'],
          performanceRating: 4.3,
          attendanceRate: 94.8,
          productivityScore: 88.9,
          safetyScore: 96.7,
          hourlyRate: 35.75,
          overtimeHours: 16.0,
          totalHours: 176.0,
          lastTraining: '2023-12-15',
          nextReview: '2024-11-10'
        }
      ];

      const mockShifts: Shift[] = [
        {
          id: 1,
          shiftName: 'Day Shift - Production',
          startTime: '07:00',
          endTime: '15:00',
          date: '2024-01-15',
          department: 'Production',
          requiredStaff: 12,
          assignedStaff: 11,
          supervisor: 'Mike Johnson',
          status: 'Understaffed',
          employees: ['John Smith', 'Sarah Johnson', 'David Brown'],
          notes: 'Need one additional operator for Line 2'
        },
        {
          id: 2,
          shiftName: 'Evening Shift - Production',
          startTime: '15:00',
          endTime: '23:00',
          date: '2024-01-15',
          department: 'Production',
          requiredStaff: 10,
          assignedStaff: 10,
          supervisor: 'Lisa Chen',
          status: 'Planned',
          employees: ['Mike Wilson', 'Jennifer Davis', 'Robert Taylor'],
          notes: 'Full staffing for evening production'
        },
        {
          id: 3,
          shiftName: 'Night Shift - Maintenance',
          startTime: '23:00',
          endTime: '07:00',
          date: '2024-01-15',
          department: 'Maintenance',
          requiredStaff: 4,
          assignedStaff: 4,
          supervisor: 'Tom Rodriguez',
          status: 'Active',
          employees: ['Carlos Martinez', 'Kevin Lee'],
          notes: 'Scheduled maintenance on CNC machines'
        }
      ];

      setEmployees(mockEmployees);
      setShifts(mockShifts);
      setMetrics({
        totalEmployees: mockEmployees.length,
        activeEmployees: mockEmployees.filter(e => e.status === 'Active').length,
        onLeave: mockEmployees.filter(e => e.status === 'On Leave').length,
        newHires: 0,
        averagePerformance: mockEmployees.reduce((acc, e) => acc + e.performanceRating, 0) / mockEmployees.length,
        attendanceRate: mockEmployees.reduce((acc, e) => acc + e.attendanceRate, 0) / mockEmployees.length,
        trainingCompliance: 87.5,
        safetyScore: 2,
        overtimeHours: mockEmployees.reduce((acc, e) => acc + e.overtimeHours, 0),
        turnoverRate: 0
      });
    } catch (error) {
      console.error('Error loading workforce data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'On Leave': return 'bg-yellow-100 text-yellow-800';
      case 'Training': return 'bg-blue-100 text-blue-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-blue-100 text-blue-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Understaffed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'Day': return 'bg-yellow-100 text-yellow-800';
      case 'Evening': return 'bg-orange-100 text-orange-800';
      case 'Night': return 'bg-purple-100 text-purple-800';
      case 'Rotating': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    const matchesShift = filterShift === 'all' || employee.shift === filterShift;
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesShift && matchesStatus;
  });

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
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEmployees}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.activeEmployees} active
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
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.attendanceRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Above target (95%)
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
              <p className="text-sm font-medium text-gray-600">Performance Rating</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averagePerformance.toFixed(1)}/5.0</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderStarRating(Math.round(metrics.averagePerformance))}
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
              <p className="text-sm font-medium text-gray-600">Safety Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.safetyScore}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-red-600">
              incidents this month
            </div>
          </div>
        </motion.div>
      </div>

      {/* Current Shifts */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Shift Status</h3>
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getShiftStatusColor(shift.status)}`}>
                    {shift.status}
                  </span>
                  <h4 className="font-medium text-gray-900">{shift.shiftName}</h4>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {shift.startTime} - {shift.endTime} • Supervisor: {shift.supervisor}
                </p>
                <p className="text-sm text-gray-500">
                  Staffing: {shift.assignedStaff}/{shift.requiredStaff} employees
                </p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  shift.assignedStaff >= shift.requiredStaff ? 'text-green-600' : 'text-red-600'
                }`}>
                  {((shift.assignedStaff / shift.requiredStaff) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-500">staffed</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-4">
            {employees
              .sort((a, b) => b.performanceRating - a.performanceRating)
              .slice(0, 3)
              .map((employee, index) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
                      <p className="text-sm text-gray-500">{employee.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      {renderStarRating(Math.round(employee.performanceRating))}
                      <span className="text-sm font-medium">{employee.performanceRating}</span>
                    </div>
                    <p className="text-sm text-gray-500">Attendance: {employee.attendanceRate}%</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Training & Compliance</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <GraduationCap className="w-5 h-5 text-blue-600 mr-2" />
                <h5 className="text-sm font-medium text-blue-900">Training Compliance</h5>
              </div>
              <p className="text-2xl font-bold text-blue-600">{metrics.trainingCompliance}%</p>
              <p className="text-sm text-blue-800">
                3 employees need refresher training
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <h5 className="text-sm font-medium text-green-900">Certifications</h5>
              </div>
              <p className="text-sm text-green-800">
                All safety certifications up to date
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <h5 className="text-sm font-medium text-yellow-900">Upcoming Reviews</h5>
              </div>
              <p className="text-sm text-yellow-800">
                5 performance reviews scheduled this month
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmployeesTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Production">Production</option>
            <option value="Quality Control">Quality Control</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Warehouse">Warehouse</option>
          </select>
          
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Shifts</option>
            <option value="Day">Day</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
            <option value="Rotating">Rotating</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Training">Training</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowEmployeeModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department/Shift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <motion.tr
                  key={employee.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getShiftColor(employee.shift)}`}>
                      {employee.shift}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {renderStarRating(Math.round(employee.performanceRating))}
                      <span className="text-sm text-gray-600">{employee.performanceRating}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Productivity: {employee.productivityScore}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{employee.attendanceRate}%</div>
                    <div className="text-sm text-gray-500">
                      {employee.totalHours}h total
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-purple-600 hover:text-purple-900">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
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
        <h1 className="text-3xl font-bold text-gray-900">Workforce Management</h1>
        <p className="text-gray-600 mt-2">
          Employee scheduling, performance tracking, and workforce optimization
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'employees', name: 'Employees', icon: Users },
            { id: 'shifts', name: 'Shift Planning', icon: Calendar },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'training', name: 'Training & Skills', icon: GraduationCap }
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
        {activeTab === 'employees' && renderEmployeesTab()}
        {activeTab === 'shifts' && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Shift Planning</h3>
            <p className="text-gray-600">Advanced shift scheduling and workforce planning coming soon.</p>
          </div>
        )}
        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">Comprehensive performance tracking and analytics coming soon.</p>
          </div>
        )}
        {activeTab === 'training' && (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Training & Skills</h3>
            <p className="text-gray-600">Skills tracking and training management coming soon.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkforceManagement; 