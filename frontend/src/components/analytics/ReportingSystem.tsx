import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReportCreationWizard from './ReportCreationWizard';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Share,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Target,
  Wrench,
  Award,
  DollarSign,
  Mail,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'production' | 'quality' | 'maintenance' | 'workforce' | 'financial' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  status: 'active' | 'inactive' | 'scheduled' | 'generating';
  lastGenerated: string;
  nextScheduled?: string;
  recipients: string[];
  parameters: Record<string, any>;
  createdBy: string;
  createdAt: string;
  size?: string;
  downloadUrl?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: React.ReactNode;
  fields: string[];
  defaultParameters: Record<string, any>;
}

const ReportingSystem: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock report templates
      const mockTemplates: ReportTemplate[] = [
        {
          id: 'prod-summary',
          name: 'Production Summary',
          description: 'Comprehensive production metrics and KPIs',
          type: 'production',
          icon: <Target className="w-5 h-5" />,
          fields: ['output', 'efficiency', 'oee', 'downtime', 'quality'],
          defaultParameters: { period: '30d', includeCharts: true }
        },
        {
          id: 'quality-report',
          name: 'Quality Analysis',
          description: 'Quality metrics, defect rates, and compliance status',
          type: 'quality',
          icon: <Award className="w-5 h-5" />,
          fields: ['firstPassYield', 'defectRate', 'customerComplaints', 'certifications'],
          defaultParameters: { period: '7d', includeAudits: true }
        },
        {
          id: 'maintenance-report',
          name: 'Maintenance Overview',
          description: 'Equipment status, maintenance schedules, and costs',
          type: 'maintenance',
          icon: <Wrench className="w-5 h-5" />,
          fields: ['uptime', 'mtbf', 'mttr', 'workOrders', 'costs'],
          defaultParameters: { period: '30d', includeSchedule: true }
        },
        {
          id: 'workforce-report',
          name: 'Workforce Analytics',
          description: 'Employee performance, attendance, and training metrics',
          type: 'workforce',
          icon: <Users className="w-5 h-5" />,
          fields: ['productivity', 'attendance', 'training', 'safety'],
          defaultParameters: { period: '30d', includeSkills: true }
        },
        {
          id: 'financial-report',
          name: 'Financial Summary',
          description: 'Cost analysis, revenue, and profitability metrics',
          type: 'financial',
          icon: <DollarSign className="w-5 h-5" />,
          fields: ['revenue', 'costs', 'profit', 'roi', 'budget'],
          defaultParameters: { period: '30d', includeForecasts: true }
        }
      ];

      // Mock reports
      const mockReports: Report[] = [
        {
          id: 'rpt-001',
          name: 'Monthly Production Report',
          description: 'Comprehensive monthly production analysis',
          type: 'production',
          format: 'pdf',
          frequency: 'monthly',
          status: 'active',
          lastGenerated: '2024-06-01T10:00:00Z',
          nextScheduled: '2024-07-01T10:00:00Z',
          recipients: ['manager@company.com', 'supervisor@company.com'],
          parameters: { period: '30d', includeCharts: true },
          createdBy: 'John Smith',
          createdAt: '2024-05-01T09:00:00Z',
          size: '2.4 MB',
          downloadUrl: '/reports/monthly-production-june-2024.pdf'
        },
        {
          id: 'rpt-002',
          name: 'Weekly Quality Dashboard',
          description: 'Weekly quality metrics and trends',
          type: 'quality',
          format: 'excel',
          frequency: 'weekly',
          status: 'active',
          lastGenerated: '2024-06-10T08:00:00Z',
          nextScheduled: '2024-06-17T08:00:00Z',
          recipients: ['quality@company.com'],
          parameters: { period: '7d', includeAudits: true },
          createdBy: 'Sarah Johnson',
          createdAt: '2024-04-15T14:30:00Z',
          size: '1.8 MB',
          downloadUrl: '/reports/weekly-quality-june-10-2024.xlsx'
        },
        {
          id: 'rpt-003',
          name: 'Equipment Maintenance Log',
          description: 'Daily maintenance activities and equipment status',
          type: 'maintenance',
          format: 'csv',
          frequency: 'daily',
          status: 'generating',
          lastGenerated: '2024-06-13T06:00:00Z',
          nextScheduled: '2024-06-14T06:00:00Z',
          recipients: ['maintenance@company.com', 'operations@company.com'],
          parameters: { period: '1d', includeSchedule: true },
          createdBy: 'Mike Wilson',
          createdAt: '2024-03-20T11:15:00Z'
        },
        {
          id: 'rpt-004',
          name: 'Workforce Performance Review',
          description: 'Quarterly workforce analytics and performance metrics',
          type: 'workforce',
          format: 'pdf',
          frequency: 'quarterly',
          status: 'scheduled',
          lastGenerated: '2024-03-31T16:00:00Z',
          nextScheduled: '2024-06-30T16:00:00Z',
          recipients: ['hr@company.com', 'management@company.com'],
          parameters: { period: '90d', includeSkills: true },
          createdBy: 'Lisa Chen',
          createdAt: '2024-01-10T13:45:00Z',
          size: '3.1 MB',
          downloadUrl: '/reports/workforce-q1-2024.pdf'
        },
        {
          id: 'rpt-005',
          name: 'Custom Analytics Report',
          description: 'Custom report with specific KPIs and metrics',
          type: 'custom',
          format: 'json',
          frequency: 'manual',
          status: 'inactive',
          lastGenerated: '2024-05-28T12:30:00Z',
          recipients: ['analyst@company.com'],
          parameters: { customFields: ['oee', 'efficiency', 'quality'], period: '14d' },
          createdBy: 'David Brown',
          createdAt: '2024-05-15T10:20:00Z',
          size: '856 KB',
          downloadUrl: '/reports/custom-analytics-may-2024.json'
        }
      ];

      setTemplates(mockTemplates);
      setReports(mockReports);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'generating':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'production':
        return <Target className="w-4 h-4" />;
      case 'quality':
        return <Award className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'workforce':
        return <Users className="w-4 h-4" />;
      case 'financial':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleGenerateReport = async (reportId: string) => {
    const updatedReports = reports.map(report => 
      report.id === reportId 
        ? { ...report, status: 'generating' as const }
        : report
    );
    setReports(updatedReports);

    // Simulate report generation
    setTimeout(() => {
      const finalReports = reports.map(report => 
        report.id === reportId 
          ? { 
              ...report, 
              status: 'active' as const,
              lastGenerated: new Date().toISOString(),
              size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
              downloadUrl: `/reports/${report.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${report.format}`
            }
          : report
      );
      setReports(finalReports);
    }, 3000);
  };

  const handleCreateReport = (reportConfig: any) => {
    // Create new report from wizard config
    const newReport: Report = {
      id: `rpt-${Date.now()}`,
      name: reportConfig.name,
      description: reportConfig.description,
      type: reportConfig.template.includes('production') ? 'production' :
            reportConfig.template.includes('quality') ? 'quality' :
            reportConfig.template.includes('maintenance') ? 'maintenance' :
            reportConfig.template.includes('workforce') ? 'workforce' :
            reportConfig.template.includes('financial') ? 'financial' : 'custom',
      format: reportConfig.format,
      frequency: reportConfig.schedule.frequency,
      status: 'generating',
      lastGenerated: new Date().toISOString(),
      nextScheduled: reportConfig.schedule.frequency !== 'manual' ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      recipients: reportConfig.recipients,
      parameters: reportConfig.parameters,
      createdBy: 'Current User', // Replace with actual user
      createdAt: new Date().toISOString()
    };

    // Add to reports list
    setReports(prev => [newReport, ...prev]);

    // Simulate generation completion
    setTimeout(() => {
      setReports(prev => prev.map(report => 
        report.id === newReport.id 
          ? {
              ...report,
              status: 'active' as const,
              size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
              downloadUrl: `/reports/${report.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${report.format}`
            }
          : report
      ));
    }, 3000);
  };

  const renderReportsTab = () => (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="production">Production</option>
            <option value="quality">Quality</option>
            <option value="maintenance">Maintenance</option>
            <option value="workforce">Workforce</option>
            <option value="financial">Financial</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="generating">Generating</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => setShowCreateWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(report.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        <div className="text-sm text-gray-500">{report.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="ml-1 capitalize">{report.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {report.frequency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.lastGenerated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowPreviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.downloadUrl && (
                        <button className="text-green-600 hover:text-green-900">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateReport(report.id)}
                        disabled={report.status === 'generating'}
                        className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
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

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                {template.icon}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{template.type}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{template.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {template.fields.slice(0, 3).map((field) => (
                <span
                  key={field}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {field}
                </span>
              ))}
              {template.fields.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{template.fields.length - 3} more
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Use Template
            </button>
          </motion.div>
        ))}
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
          <h1 className="text-2xl font-bold text-gray-900">Reporting System</h1>
          <p className="text-gray-600">Generate and manage manufacturing reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'reports', name: 'Reports', icon: FileText },
            { id: 'templates', name: 'Templates', icon: BarChart3 },
            { id: 'scheduled', name: 'Scheduled', icon: Calendar },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp },
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
        {activeTab === 'reports' && renderReportsTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'scheduled' && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Scheduled reports management coming soon</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Report analytics coming soon</p>
          </div>
        )}
      </div>

      {/* Report Creation Wizard */}
      <ReportCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onComplete={handleCreateReport}
      />

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedReport.name}</h3>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-gray-600">{selectedReport.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-600 capitalize">{selectedReport.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Format</label>
                    <p className="text-gray-600 uppercase">{selectedReport.format}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipients</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedReport.recipients.map((email, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedReport.downloadUrl && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                      <Download className="w-4 h-4 mr-2" />
                      Download ({selectedReport.size})
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportingSystem; 