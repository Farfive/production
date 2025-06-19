import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  Download,
  Upload,
  Settings,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowDown,
  GitBranch,
  Zap,
  FileText,
  Mail,
  Bell,
  Database,
  Code,
  Filter,
  Search
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'start' | 'action' | 'decision' | 'approval' | 'notification' | 'end';
  title: string;
  description: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
  currentStep: string;
  progress: number;
  initiatedBy: string;
}

const WorkflowBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'templates' | 'executions' | 'analytics'>('builder');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Mock data
  const [workflowTemplates] = useState<WorkflowTemplate[]>([
    {
      id: '1',
      name: 'Order Approval Process',
      description: 'Multi-stage approval workflow for manufacturing orders',
      category: 'Orders',
      status: 'active',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-15',
      usageCount: 247,
      nodes: []
    },
    {
      id: '2',
      name: 'Quality Control Inspection',
      description: 'Automated quality control workflow with inspection checkpoints',
      category: 'Quality',
      status: 'active',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-14',
      usageCount: 189,
      nodes: []
    },
    {
      id: '3',
      name: 'Supplier Onboarding',
      description: 'Complete supplier verification and onboarding process',
      category: 'Suppliers',
      status: 'draft',
      createdAt: '2024-01-12',
      updatedAt: '2024-01-15',
      usageCount: 23,
      nodes: []
    }
  ]);

  const [workflowExecutions] = useState<WorkflowExecution[]>([
    {
      id: '1',
      workflowId: '1',
      workflowName: 'Order Approval Process',
      status: 'running',
      startedAt: '2024-01-15 14:30:00',
      currentStep: 'Manager Approval',
      progress: 60,
      initiatedBy: 'john.doe@company.com'
    },
    {
      id: '2',
      workflowId: '2',
      workflowName: 'Quality Control Inspection',
      status: 'completed',
      startedAt: '2024-01-15 13:15:00',
      completedAt: '2024-01-15 14:20:00',
      currentStep: 'Completed',
      progress: 100,
      initiatedBy: 'jane.smith@company.com'
    },
    {
      id: '3',
      workflowId: '1',
      workflowName: 'Order Approval Process',
      status: 'failed',
      startedAt: '2024-01-15 12:00:00',
      currentStep: 'Document Validation',
      progress: 25,
      initiatedBy: 'mike.wilson@company.com'
    }
  ]);

  const nodeTypes = [
    { type: 'start', icon: Play, label: 'Start', color: 'bg-green-100 text-green-600' },
    { type: 'action', icon: Zap, label: 'Action', color: 'bg-blue-100 text-blue-600' },
    { type: 'decision', icon: GitBranch, label: 'Decision', color: 'bg-yellow-100 text-yellow-600' },
    { type: 'approval', icon: Users, label: 'Approval', color: 'bg-purple-100 text-purple-600' },
    { type: 'notification', icon: Bell, label: 'Notification', color: 'bg-orange-100 text-orange-600' },
    { type: 'end', icon: Square, label: 'End', color: 'bg-red-100 text-red-600' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const renderBuilderTab = () => (
    <div className="space-y-6">
      {!isBuilderMode ? (
        <div className="text-center py-12">
          <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Workflow Builder</h3>
          <p className="text-gray-600 mb-6">Create and customize automated workflows with drag-and-drop interface</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setIsBuilderMode(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Workflow
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Import Template
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Builder Toolbar */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsBuilderMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ← Back
                </button>
                <input
                  type="text"
                  placeholder="Workflow Name"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  defaultValue="New Workflow"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-96">
            {/* Node Palette */}
            <div className="w-64 border-r border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-4">Workflow Elements</h4>
              <div className="space-y-2">
                {nodeTypes.map((nodeType) => {
                  const Icon = nodeType.icon;
                  return (
                    <div
                      key={nodeType.type}
                      className={`p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors ${nodeType.color}`}
                      draggable
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 mr-2" />
                        <span className="text-sm font-medium">{nodeType.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-gray-50 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              <div className="relative h-full p-8">
                <div className="text-center text-gray-500 mt-20">
                  <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Drag elements from the left panel to build your workflow</p>
                </div>
              </div>
            </div>

            {/* Properties Panel */}
            <div className="w-80 border-l border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-4">Properties</h4>
              <div className="text-sm text-gray-500">
                Select a workflow element to configure its properties
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="Orders">Orders</option>
            <option value="Quality">Quality</option>
            <option value="Suppliers">Suppliers</option>
            <option value="Production">Production</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflowTemplates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                <span className="text-xs text-gray-500">{template.category}</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(template.status)}`}>
                {template.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Used {template.usageCount} times</span>
              <span>Updated {template.updatedAt}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Edit
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                <Copy className="w-4 h-4" />
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderExecutionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Workflow Executions</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search executions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workflow</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Step</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initiated By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflowExecutions.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{execution.workflowName}</div>
                    <div className="text-sm text-gray-500">ID: {execution.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(execution.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{execution.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {execution.currentStep}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {execution.startedAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {execution.initiatedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                      {execution.status === 'running' && (
                        <button className="text-yellow-600 hover:text-yellow-900">Pause</button>
                      )}
                      {execution.status === 'failed' && (
                        <button className="text-green-600 hover:text-green-900">Retry</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
            <p className="text-gray-600 mt-2">Design, deploy, and monitor automated business workflows</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'builder', label: 'Workflow Builder', icon: GitBranch },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'executions', label: 'Executions', icon: Play },
            { id: 'analytics', label: 'Analytics', icon: ArrowRight }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'builder' && renderBuilderTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'executions' && renderExecutionsTab()}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <ArrowRight className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Analytics</h3>
            <p className="text-gray-600">Performance metrics and insights for your workflows</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder; 